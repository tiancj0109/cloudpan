package com.cloudpan.service.impl;

import com.cloudpan.entity.FileInfo;
import com.cloudpan.mapper.FileInfoMapper;
import com.cloudpan.mapper.TeamMemberMapper;
import com.cloudpan.mapper.TeamSpaceMapper;
import com.cloudpan.service.FileService;
import com.cloudpan.service.PreviewService;
import com.cloudpan.service.StorageService;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;

@Service
public class PreviewServiceImpl implements PreviewService {

    @Autowired
    private FileInfoMapper fileInfoMapper;

    @Autowired
    private TeamMemberMapper teamMemberMapper;
    
    @Autowired
    private TeamSpaceMapper teamSpaceMapper;

    @Autowired
    @Qualifier("localStorage")
    private StorageService localStorage;

    @Autowired
    @Qualifier("ossStorage")
    private StorageService ossStorage;

    @Value("${file.storage.path:uploads}")
    private String storagePath;

    private static final String THUMBNAIL_DIR = "thumbnails";

    @Override
    public InputStream getThumbnail(Long userId, Long fileId) {
        FileInfo fileInfo = fileInfoMapper.findById(fileId);
        if (fileInfo == null) {
            throw new RuntimeException("文件不存在");
        }

        // Permission check (simplified, similar to download)
        boolean hasAccess = fileInfo.getUserId().equals(userId);
        if (!hasAccess) {
            Long teamId = findTeamIdForFile(fileInfo);
            if (teamId != null) {
                hasAccess = teamMemberMapper.findByTeamIdAndUserId(teamId, userId) != null;
            }
        }
        if (!hasAccess) {
            throw new RuntimeException("没有权限");
        }

        // Ensure thumbnail directory exists
        File thumbDir = new File(storagePath, THUMBNAIL_DIR);
        if (!thumbDir.exists()) {
            thumbDir.mkdirs();
        }

        File thumbFile = new File(thumbDir, fileId + ".jpg");

        // Lazy generation
        if (!thumbFile.exists()) {
            generateThumbnail(fileInfo, thumbFile);
        }

        try {
            return new FileInputStream(thumbFile);
        } catch (FileNotFoundException e) {
            throw new RuntimeException("未找到缩略图", e);
        }
    }

    // Limit concurrent thumbnail generation to prevent server overload (CPU/Memory)
    private static final java.util.concurrent.Semaphore generationPermits = new java.util.concurrent.Semaphore(4);

    private void generateThumbnail(FileInfo fileInfo, File thumbFile) {
        try {
            // Acquire permit before generation
            generationPermits.acquire();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("等待缩略图生成许可时中断");
        }

        try {
            String ext = fileInfo.getFileType().toLowerCase();
            
            File sourceFile = null;
            boolean isTemp = false;

            try {
                if (fileInfo.getStorageType() == 0) { // Local storage
                    // First try as absolute path (default behavior of LocalStorageImpl)
                    sourceFile = new File(fileInfo.getFilePath());
                    if (!sourceFile.exists()) {
                        // Fallback: try relative to storagePath
                        sourceFile = new File(storagePath, fileInfo.getFilePath());
                    }
                    
                    if (!sourceFile.exists()) {
                        throw new FileNotFoundException("原始文件不存在: " + fileInfo.getFilePath());
                    }
                } else { // OSS or other
                    StorageService storage = fileInfo.getStorageType() == 1 ? ossStorage : localStorage;
                    sourceFile = File.createTempFile("original_", "." + ext);
                    isTemp = true;
                    try (InputStream is = storage.download(fileInfo.getFilePath());
                         FileOutputStream fos = new FileOutputStream(sourceFile)) {
                        byte[] buffer = new byte[8192];
                        int len;
                        while ((len = is.read(buffer)) > 0) {
                            fos.write(buffer, 0, len);
                        }
                    }
                }

                if (isImage(ext)) {
                    // Generate image thumbnail
                    Thumbnails.of(sourceFile)
                            .size(200, 200)
                            .outputFormat("jpg")
                            .toFile(thumbFile);
                } else if (isVideo(ext)) {
                    // Generate video cover using FFmpeg
                    generateVideoCover(sourceFile, thumbFile);
                } else {
                    throw new RuntimeException("不支持的文件类型");
                }

            } catch (Exception e) {
                e.printStackTrace();
                if (thumbFile.exists()) {
                    thumbFile.delete();
                }
                throw new RuntimeException("生成缩略图失败", e);
            } finally {
                if (isTemp && sourceFile != null && sourceFile.exists()) {
                    sourceFile.delete();
                }
            }
        } finally {
            // Always release permit
            generationPermits.release();
        }
    }

    private void generateVideoCover(File videoFile, File thumbFile) throws IOException, InterruptedException {
        // ffmpeg -i video.mp4 -ss 00:00:01 -vframes 1 out.jpg
        ProcessBuilder pb = new ProcessBuilder(
                "ffmpeg",
                "-i", videoFile.getAbsolutePath(),
                "-ss", "00:00:01",
                "-vframes", "1",
                thumbFile.getAbsolutePath()
        );
        pb.redirectErrorStream(true);
        Process process = pb.start();
        
        // Add timeout to prevent hanging
        boolean finished = process.waitFor(15, java.util.concurrent.TimeUnit.SECONDS);
        if (!finished) {
            process.destroy();
            throw new RuntimeException("FFmpeg超时");
        }
        
        int exitCode = process.exitValue();
        if (exitCode != 0) {
            // Read output
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    System.err.println(line);
                }
            }
            throw new RuntimeException("FFmpeg退出代码" + exitCode);
        }
    }

    private boolean isImage(String ext) {
        return Arrays.asList("jpg", "jpeg", "png", "gif", "bmp", "webp").contains(ext);
    }

    private boolean isVideo(String ext) {
        return Arrays.asList("mp4", "webm", "ogg", "mov", "avi", "mkv").contains(ext);
    }
    
    // Helper from FileServiceImpl (duplicated, should be in a shared utility or base class, but for now copy)
    private Long findTeamIdForFile(FileInfo fileInfo) {
        if (fileInfo.getTeamId() != null) {
            return fileInfo.getTeamId();
        }
        Long currentParentId = fileInfo.getParentId();
        int depth = 0;
        while (currentParentId != 0 && depth < 20) {
            FileInfo parent = fileInfoMapper.findById(currentParentId);
            if (parent == null) break;
            if (parent.getTeamId() != null) {
                return parent.getTeamId();
            }
            currentParentId = parent.getParentId();
            depth++;
        }
        return null;
    }

    @Override
    public void deleteThumbnail(Long fileId) {
        File thumbDir = new File(storagePath, THUMBNAIL_DIR);
        File thumbFile = new File(thumbDir, fileId + ".jpg");
        if (thumbFile.exists()) {
            thumbFile.delete();
        }
    }
}
