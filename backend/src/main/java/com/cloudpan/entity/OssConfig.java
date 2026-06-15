package com.cloudpan.entity;

import lombok.Data;
import java.util.Date;

@Data
public class OssConfig {
    private Integer id;
    private String provider;
    private String endpoint;
    private String accessKey;
    private String secretKey;
    private String bucketName;
    private Integer isEnable;
    private Date createdAt;
    private Date updatedAt;
}
