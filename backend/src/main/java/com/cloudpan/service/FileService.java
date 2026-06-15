package com.cloudpan.service;

import com.cloudpan.entity.FileInfo;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.List;

public interface FileService {
    FileInfo upload(Long userId, Long parentId, MultipartFile file);
    InputStream download(Long userId, Long fileId);
    FileInfo createFolder(Long userId, Long parentId, String folderName);
    List<FileInfo> listFiles(Long userId, Long parentId);
    void deleteFile(Long userId, Long fileId);
    void renameFile(Long userId, Long fileId, String newName);
    List<FileInfo> searchFiles(Long userId, String keyword);
    FileInfo getFileInfo(Long userId, Long fileId);
    void batchDownload(Long userId, List<Long> fileIds, java.io.OutputStream outputStream);
    void batchMove(Long userId, List<Long> fileIds, Long targetParentId);
    org.springframework.core.io.Resource getResource(Long userId, Long fileId);
    
    String getPreviewUrl(Long userId, Long fileId);
}
