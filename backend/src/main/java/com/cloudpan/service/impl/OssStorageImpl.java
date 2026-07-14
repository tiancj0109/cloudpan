package com.cloudpan.service.impl;

import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.aliyun.oss.model.OSSObject;
import com.cloudpan.entity.OssConfig;
import com.cloudpan.mapper.OssConfigMapper;
import com.cloudpan.service.StorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.UUID;
import com.aliyun.oss.model.GetObjectRequest;

@Service("ossStorage")
public class OssStorageImpl implements StorageService {

    @Autowired
    private OssConfigMapper ossConfigMapper;

    private OSS getOssClient(OssConfig config) {
        return new OSSClientBuilder().build(config.getEndpoint(), config.getAccessKey(), config.getSecretKey());
    }

    @Override
    public String upload(MultipartFile file, String path) {
        OssConfig config = ossConfigMapper.findFirst();
        if (config == null) {
            throw new RuntimeException("OSS配置不存在");
        }
        
        OSS ossClient = getOssClient(config);
        try {
            // Extract basename in case the filename contains a path (e.g. from folder uploads)
            String originalName = file.getOriginalFilename();
            if (originalName != null) {
                originalName = new File(originalName).getName();
            }
            String fileName = UUID.randomUUID().toString() + "_" + originalName;
            // path here is treated as directory prefix if needed, or just use fileName
            String key = fileName; 
            ossClient.putObject(config.getBucketName(), key, file.getInputStream());
            return key; // Return the OSS key
        } catch (IOException e) {
            throw new RuntimeException("OSS上传失败", e);
        } finally {
            ossClient.shutdown();
        }
    }

    @Override
    public InputStream download(String path) {
        return download(path, -1, -1);
    }

    @Override
    public InputStream download(String path, long start, long end) {
        OssConfig config = ossConfigMapper.findFirst();
        if (config == null) {
            throw new RuntimeException("OSS配置不存在");
        }
        
        OSS ossClient = getOssClient(config);
        try {
            GetObjectRequest getObjectRequest = new GetObjectRequest(config.getBucketName(), path);
            if (start >= 0 && end >= 0) {
                getObjectRequest.setRange(start, end);
            }
            OSSObject ossObject = ossClient.getObject(getObjectRequest);
            return ossObject.getObjectContent();
        } catch (Exception e) {
            ossClient.shutdown();
            throw new RuntimeException("OSS下载失败", e);
        }
    }

    @Override
    public void delete(String path) {
        OssConfig config = ossConfigMapper.findFirst();
        if (config != null) {
            OSS ossClient = getOssClient(config);
            try {
                ossClient.deleteObject(config.getBucketName(), path);
            } finally {
                ossClient.shutdown();
            }
        }
    }

    @Override
    public boolean exists(String path) {
        OssConfig config = ossConfigMapper.findFirst();
        if (config != null) {
            OSS ossClient = getOssClient(config);
            try {
                return ossClient.doesObjectExist(config.getBucketName(), path);
            } finally {
                ossClient.shutdown();
            }
        }
        return false;
    }

    @Override
    public String getSignedUrl(String path, int expirationSeconds) {
        OssConfig config = ossConfigMapper.findFirst();
        if (config == null) {
            return null;
        }
        OSS ossClient = getOssClient(config);
        try {
            java.util.Date expiration = new java.util.Date(System.currentTimeMillis() + expirationSeconds * 1000L);
            java.net.URL url = ossClient.generatePresignedUrl(config.getBucketName(), path, expiration);
            return url.toString();
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        } finally {
            ossClient.shutdown();
        }
    }
}
