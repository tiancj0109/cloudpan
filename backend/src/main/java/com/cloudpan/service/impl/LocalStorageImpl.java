package com.cloudpan.service.impl;

import com.cloudpan.service.StorageService;
import org.apache.commons.io.FileUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.UUID;

@Service("localStorage")
public class LocalStorageImpl implements StorageService {

    @Value("${cloudpan.storage.local-path}")
    private String rootPath;

    @Override
    public String upload(MultipartFile file, String path) {
        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        File dest = new File(rootPath + File.separator + fileName);
        try {
            if (!dest.getParentFile().exists()) {
                dest.getParentFile().mkdirs();
            }
            // transferTo requires absolute path to avoid using temp dir
            file.transferTo(dest.getAbsoluteFile());
            return dest.getAbsolutePath();
        } catch (IOException e) {
            throw new RuntimeException("上传失败", e);
        }
    }

    @Override
    public InputStream download(String path) {
        return download(path, -1, -1);
    }

    @Override
    public InputStream download(String path, long start, long end) {
        try {
            File file = new File(path);
            if (!file.exists()) {
                 // Fallback to relative path if absolute path not found
                 file = new File(rootPath, path);
            }
            
            // Use RandomAccessFile for reliable seeking
            java.io.RandomAccessFile raf = new java.io.RandomAccessFile(file, "r");
            if (start > 0) {
                raf.seek(start);
            }
            
            // Create an InputStream from the RandomAccessFile
            // We need to ensure raf is closed when the stream is closed.
            // A simple way is to wrap it.
            InputStream fis = new InputStream() {
                @Override
                public int read() throws IOException {
                    return raf.read();
                }

                @Override
                public int read(byte[] b, int off, int len) throws IOException {
                    return raf.read(b, off, len);
                }

                @Override
                public void close() throws IOException {
                    raf.close();
                }
            };

            if (end > -1) {
                // Use BoundedInputStream to limit the stream to the requested range
                // Length is end - start + 1
                return new org.apache.commons.io.input.BoundedInputStream(fis, end - start + 1);
            }
            return fis;
        } catch (IOException e) {
            throw new RuntimeException("文件不存在", e);
        }
    }

    @Override
    public void delete(String path) {
        FileUtils.deleteQuietly(new File(path));
    }

    @Override
    public boolean exists(String path) {
        return new File(path).exists();
    }

    @Override
    public String getSignedUrl(String path, int expirationSeconds) {
        return null;
    }
}
