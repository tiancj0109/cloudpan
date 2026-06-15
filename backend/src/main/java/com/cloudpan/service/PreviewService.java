package com.cloudpan.service;

import java.io.InputStream;

public interface PreviewService {
    InputStream getThumbnail(Long userId, Long fileId);
    
    void deleteThumbnail(Long fileId);
}
