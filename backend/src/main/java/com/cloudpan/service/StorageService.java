package com.cloudpan.service;

import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;

public interface StorageService {
    String upload(MultipartFile file, String path);
    InputStream download(String path);
    InputStream download(String path, long start, long end);
    void delete(String path);
    boolean exists(String path);
    
    /**
     * Get signed URL for temporary access (mainly for OSS)
     * @param path file path/key
     * @param expirationSeconds expiration in seconds
     * @return signed URL string, or null if not supported
     */
    String getSignedUrl(String path, int expirationSeconds);
}
