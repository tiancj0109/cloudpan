package com.cloudpan.controller;

import com.cloudpan.entity.FileInfo;
import com.cloudpan.service.FileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.HttpRange;
import org.springframework.http.HttpStatus;
import javax.servlet.http.HttpServletResponse;
import org.springframework.core.io.InputStreamResource;

import java.io.InputStream;
import java.net.URLEncoder;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/file")
@CrossOrigin
public class FileController {

    @Autowired
    private FileService fileService;

    @Autowired
    @org.springframework.beans.factory.annotation.Qualifier("ossStorage")
    private com.cloudpan.service.StorageService ossStorage;

    @Autowired
    @org.springframework.beans.factory.annotation.Qualifier("localStorage")
    private com.cloudpan.service.StorageService localStorage;

    @PostMapping("/upload")
    public Map<String, Object> upload(@RequestAttribute("userId") Long userId,
                                      @RequestParam(value = "parentId", defaultValue = "0") Long parentId,
                                      @RequestParam("file") MultipartFile file) {
        FileInfo fileInfo = fileService.upload(userId, parentId, file);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("data", fileInfo);
        return result;
    }

    @GetMapping("/list")
    public Map<String, Object> list(@RequestAttribute("userId") Long userId,
                                    @RequestParam(value = "parentId", defaultValue = "0") Long parentId) {
        List<FileInfo> files = fileService.listFiles(userId, parentId);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("data", files);
        return result;
    }

    @PostMapping("/folder")
    public Map<String, Object> createFolder(@RequestAttribute("userId") Long userId,
                                            @RequestBody Map<String, Object> params) {
        Long parentId = Long.parseLong(params.getOrDefault("parentId", "0").toString());
        String name = (String) params.get("name");
        
        FileInfo folder = fileService.createFolder(userId, parentId, name);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("data", folder);
        return result;
    }





    @GetMapping("/download/{fileId}")
    public ResponseEntity<Object> download(@RequestAttribute("userId") Long userId,
                                           @PathVariable Long fileId,
                                           @RequestParam(required = false, defaultValue = "false") boolean preview,
                                           @RequestHeader(value = "Range", required = false) String rangeHeader,
                                           javax.servlet.http.HttpServletResponse response) throws Exception {
        
        FileInfo fileInfo = fileService.getFileInfo(userId, fileId);
        if (fileInfo == null) {
            return ResponseEntity.notFound().build();
        }

        String filename = fileInfo.getFilename();
        String contentType = determineContentType(filename);
        String disposition = preview ? "inline" : "attachment";
        long fileSize = fileInfo.getFileSize();

        // Unified handling for both Local and OSS storage
        long start = 0;
        long end = fileSize - 1;
        boolean isPartial = false;

        if (rangeHeader != null) {
            List<HttpRange> ranges = HttpRange.parseRanges(rangeHeader);
            if (!ranges.isEmpty()) {
                HttpRange range = ranges.get(0);
                start = range.getRangeStart(fileSize);
                end = range.getRangeEnd(fileSize);
                isPartial = true;
            }
        }

        // Get stream from storage (Local or OSS)
        // For local storage, we need to access the service directly or via fileService if it exposed it generically
        // But here we have direct access to ossStorage and can inject localStorage
        
        InputStream is;
        long contentLength;
        
        com.cloudpan.service.StorageService storageService;
        if (fileInfo.getStorageType() == 0) {
             storageService = localStorage;
        } else {
             storageService = ossStorage;
        }

        if (isPartial) {
            is = storageService.download(fileInfo.getFilePath(), start, end);
            contentLength = end - start + 1;
        } else {
            is = storageService.download(fileInfo.getFilePath());
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

        ResponseEntity.BodyBuilder builder = isPartial ? ResponseEntity.status(HttpStatus.PARTIAL_CONTENT) : ResponseEntity.ok();
        
        builder.header(HttpHeaders.CONTENT_TYPE, contentType)
               .header(HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename=\"" + URLEncoder.encode(filename, "UTF-8") + "\"")
               .header(HttpHeaders.ACCEPT_RANGES, "bytes")
               .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(contentLength));

        if (isPartial) {
            builder.header(HttpHeaders.CONTENT_RANGE, "bytes " + start + "-" + end + "/" + fileSize);
        }

        return builder.body(resource);
    }

    @GetMapping("/batch-download")
    public void batchDownload(@RequestAttribute("userId") Long userId,
                              @RequestParam("fileIds") String fileIdsStr,
                              javax.servlet.http.HttpServletResponse response) throws java.io.IOException {
        List<Long> fileIds = java.util.Arrays.stream(fileIdsStr.split(","))
                .map(Long::parseLong)
                .collect(java.util.stream.Collectors.toList());

        response.setContentType("application/zip");
        response.setHeader("Content-Disposition", "attachment; filename=\"batch_download.zip\"");

        fileService.batchDownload(userId, fileIds, response.getOutputStream());
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
                return "text/plain"; // For code/text preview
            default: return "application/octet-stream";
        }
    }
    
    @DeleteMapping("/{fileId}")
    public Map<String, Object> delete(@RequestAttribute("userId") Long userId,
                                      @PathVariable Long fileId) {
        fileService.deleteFile(userId, fileId);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "Deleted successfully");
        return result;
    }
    
    @PutMapping("/{fileId}/rename")
    public Map<String, Object> rename(@RequestAttribute("userId") Long userId,
                                      @PathVariable Long fileId,
                                      @RequestBody Map<String, String> params) {
        String newName = params.get("name");
        fileService.renameFile(userId, fileId, newName);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "Renamed successfully");
        return result;
    }

    @PostMapping("/batch-move")
    public Map<String, Object> batchMove(@RequestAttribute("userId") Long userId,
                                         @RequestBody Map<String, Object> params) {
        String fileIdsStr = (String) params.get("fileIds");
        Long targetParentId = Long.parseLong(params.get("targetParentId").toString());
        
        List<Long> fileIds = java.util.Arrays.stream(fileIdsStr.split(","))
                .map(Long::parseLong)
                .collect(java.util.stream.Collectors.toList());
        
        fileService.batchMove(userId, fileIds, targetParentId);
        
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "Moved successfully");
        return result;
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
        
        // Check magic bytes
        if (header[0] == (byte)0xFF && header[1] == (byte)0xD8 && header[2] == (byte)0xFF) return "image/jpeg";
        if (header[0] == (byte)0x89 && header[1] == (byte)0x50 && header[2] == (byte)0x4E && header[3] == (byte)0x47) return "image/png";
        if (header[0] == (byte)0x47 && header[1] == (byte)0x49 && header[2] == (byte)0x46) return "image/gif";
        if (header[0] == (byte)0x42 && header[1] == (byte)0x4D) return "image/bmp";
        
        return null;
    }
}
