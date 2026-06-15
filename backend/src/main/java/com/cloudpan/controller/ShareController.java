package com.cloudpan.controller;

import com.cloudpan.entity.ShareLink;
import com.cloudpan.entity.FileInfo;
import com.cloudpan.mapper.FileInfoMapper;
import com.cloudpan.service.ShareService;
import com.cloudpan.service.StorageService;
import org.apache.commons.io.IOUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletResponse;
import java.io.InputStream;
import java.net.URLEncoder;

import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin
public class ShareController {

    @Autowired
    private ShareService shareService;

    @Autowired
    private FileInfoMapper fileInfoMapper;

    @Autowired
    @Qualifier("localStorage")
    private StorageService localStorage;

    @Autowired
    @Qualifier("ossStorage")
    private StorageService ossStorage;

    @Autowired
    private com.cloudpan.mapper.TeamSpaceMapper teamSpaceMapper;

    @PostMapping("/share/create")
    public Map<String, Object> createShare(@RequestAttribute("userId") Long userId,
                                           @RequestBody Map<String, Object> params) {
        Long fileId = Long.parseLong(params.get("fileId").toString());
        
        // Check permission
        FileInfo fileInfo = fileInfoMapper.findById(fileId);
        if (fileInfo == null) {
            throw new RuntimeException("File not found");
        }
        
        boolean canShare = fileInfo.getUserId().equals(userId);
        if (!canShare && fileInfo.getTeamId() != null) {
            // Check if user is team owner
            com.cloudpan.entity.TeamSpace team = teamSpaceMapper.findById(fileInfo.getTeamId());
            if (team != null && team.getOwnerId().equals(userId)) {
                canShare = true;
            }
        }
        
        if (!canShare) {
            throw new RuntimeException("Permission denied");
        }
        
        Integer permission = Integer.parseInt(params.getOrDefault("permission", 1).toString());
        String accessCode = (String) params.get("accessCode");
        // Simple expire time handling, e.g., days
        Integer days = Integer.parseInt(params.getOrDefault("days", 7).toString());
        Date expireTime = days == -1 ? null : new Date(System.currentTimeMillis() + days * 24 * 3600 * 1000L);
        
        ShareLink shareLink = shareService.createShare(userId, fileId, permission, expireTime, accessCode);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("data", shareLink);
        return result;
    }

    @GetMapping("/public/share/{shareCode}")
    public Map<String, Object> getShareInfo(@PathVariable String shareCode) {
        ShareLink shareLink = shareService.getShareInfo(shareCode);
        Map<String, Object> result = new HashMap<>();
        if (shareLink == null) {
            result.put("code", 404);
            result.put("message", "Share not found");
        } else {
            // Mask access code for public view
            shareLink.setNeedAccessCode(shareLink.getAccessCode() != null && !shareLink.getAccessCode().isEmpty());
            shareLink.setAccessCode(null);
            result.put("code", 200);
            result.put("data", shareLink);
        }
        return result;
    }
    
    @PostMapping("/public/share/{shareCode}/verify")
    public Map<String, Object> verifyAccessCode(@PathVariable String shareCode,
                                                @RequestBody Map<String, String> params) {
        String accessCode = params.get("accessCode");
        boolean valid = shareService.verifyAccessCode(shareCode, accessCode);
        Map<String, Object> result = new HashMap<>();
        result.put("code", valid ? 200 : 403);
        result.put("message", valid ? "Verified" : "Invalid access code");
        return result;
    }
    
    @GetMapping("/share/list")
    public Map<String, Object> listMyShares(@RequestAttribute("userId") Long userId) {
        List<ShareLink> shares = shareService.listMyShares(userId);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("data", shares);
        return result;
    }
    
    @DeleteMapping("/share/{shareId}")
    public Map<String, Object> cancelShare(@RequestAttribute("userId") Long userId,
                                           @PathVariable Long shareId) {
        shareService.cancelShare(userId, shareId);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "Cancelled successfully");
        return result;
    }

    @GetMapping("/share/{shareId}")
    public Map<String, Object> getShareDetail(@RequestAttribute("userId") Long userId,
                                            @PathVariable Long shareId) {
        ShareLink share = shareService.getShareById(shareId);
        Map<String, Object> result = new HashMap<>();
        if (share == null) {
            result.put("code", 404);
            result.put("message", "Share not found");
        } else {
            // Optional: Check if user is owner
            if (!share.getUserId().equals(userId)) {
                result.put("code", 403);
                result.put("message", "Permission denied");
                return result;
            }
            result.put("code", 200);
            result.put("data", share);
        }
        return result;
    }

    @GetMapping("/public/share/download/{shareCode}")
    public org.springframework.http.ResponseEntity<Object> downloadSharedFile(@PathVariable String shareCode,
                                   @RequestParam(required = false) String accessCode,
                                   @RequestParam(required = false, defaultValue = "false") boolean preview,
                                   @RequestHeader(value = "Range", required = false) String rangeHeader) throws Exception {
        // 1. Validate share
        ShareLink share = shareService.getShareInfo(shareCode);
        if (share == null || (share.getExpireTime() != null && share.getExpireTime().before(new Date()))) {
            throw new RuntimeException("Share not found or expired");
        }
        // 2. Validate access code
        if (share.getAccessCode() != null && !share.getAccessCode().isEmpty()) {
            if (!share.getAccessCode().equals(accessCode)) {
                throw new RuntimeException("Invalid access code");
            }
        }

        // 3. Get File Info
        FileInfo fileInfo = fileInfoMapper.findById(share.getFileId());
        if (fileInfo == null) {
            throw new RuntimeException("File not found");
        }

        // 4. Update download count
        if (!preview) {
            shareService.increaseDownloadCount(share.getId());
        }

        // 5. Download logic (Unified)
        String filename = fileInfo.getFilename();
        String contentType = determineContentType(filename);
        String disposition = preview ? "inline" : "attachment";
        long fileSize = fileInfo.getFileSize();

        long start = 0;
        long end = fileSize - 1;
        boolean isPartial = false;

        if (rangeHeader != null) {
            List<org.springframework.http.HttpRange> ranges = org.springframework.http.HttpRange.parseRanges(rangeHeader);
            if (!ranges.isEmpty()) {
                org.springframework.http.HttpRange range = ranges.get(0);
                start = range.getRangeStart(fileSize);
                end = range.getRangeEnd(fileSize);
                isPartial = true;
            }
        }

        StorageService fileStorage = fileInfo.getStorageType() == 1 ? ossStorage : localStorage;
        
        InputStream is;
        long contentLength;

        if (isPartial) {
            is = fileStorage.download(fileInfo.getFilePath(), start, end);
            contentLength = end - start + 1;
        } else {
            is = fileStorage.download(fileInfo.getFilePath());
            contentLength = fileSize;

            if ("application/octet-stream".equals(contentType) && preview) {
                if (!is.markSupported()) {
                    is = new java.io.BufferedInputStream(is);
                }
                is.mark(16);
                try {
                    String detected = detectTypeFromStream(is);
                    if (detected != null) contentType = detected;
                } catch (Exception e) {
                    // Ignore
                }
                is.reset();
            }
        }

        org.springframework.core.io.InputStreamResource resource = new org.springframework.core.io.InputStreamResource(is);

        org.springframework.http.ResponseEntity.BodyBuilder builder = isPartial ? org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.PARTIAL_CONTENT) : org.springframework.http.ResponseEntity.ok();

        builder.header(org.springframework.http.HttpHeaders.CONTENT_TYPE, contentType)
               .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename=\"" + URLEncoder.encode(filename, "UTF-8") + "\"")
               .header(org.springframework.http.HttpHeaders.ACCEPT_RANGES, "bytes")
               .header(org.springframework.http.HttpHeaders.CONTENT_LENGTH, String.valueOf(contentLength));

        if (isPartial) {
            builder.header(org.springframework.http.HttpHeaders.CONTENT_RANGE, "bytes " + start + "-" + end + "/" + fileSize);
        }

        return builder.body(resource);
    }

    private String determineContentType(String filename) {
        String ext = "";
        int dotIndex = filename.lastIndexOf(".");
        if (dotIndex >= 0) {
            ext = filename.substring(dotIndex + 1).toLowerCase();
        }
        
        switch (ext) {
            case "jpg":
            case "jpeg": return "image/jpeg";
            case "png": return "image/png";
            case "gif": return "image/gif";
            case "mp4": return "video/mp4";
            case "webm": return "video/webm";
            case "mp3": return "audio/mpeg";
            case "wav": return "audio/wav";
            case "ogg": return "audio/ogg";
            case "m4a": return "audio/mp4";
            case "flac": return "audio/flac";
            case "aac": return "audio/aac";
            case "pdf": return "application/pdf";
            case "txt": 
            case "java":
            case "js":
            case "css":
            case "html":
            case "xml":
            case "json":
            case "md":
                return "text/plain";
            default: return "application/octet-stream";
        }
    }

    private String detectTypeFromStream(InputStream is) throws java.io.IOException {
        byte[] header = new byte[8];
        int bytesRead = 0;
        while (bytesRead < 8) {
            int count = is.read(header, bytesRead, 8 - bytesRead);
            if (count == -1) break;
            bytesRead += count;
        }
        if (bytesRead < 8) return null;
        
        if (header[0] == (byte)0xFF && header[1] == (byte)0xD8 && header[2] == (byte)0xFF) return "image/jpeg";
        if (header[0] == (byte)0x89 && header[1] == (byte)0x50 && header[2] == (byte)0x4E && header[3] == (byte)0x47) return "image/png";
        if (header[0] == (byte)0x47 && header[1] == (byte)0x49 && header[2] == (byte)0x46) return "image/gif";
        if (header[0] == (byte)0x42 && header[1] == (byte)0x4D) return "image/bmp";
        
        return null;
    }
}
