package com.cloudpan.entity;

import lombok.Data;
import java.util.Date;

@Data
public class ShareLink {
    private Long id;
    private Long userId;
    private Long fileId;
    private String shareCode;
    private String accessCode;
    private Integer permission; // 1: Read/Download, 2: Edit
    private Date expireTime;
    private Integer visitCount;
    private Integer downloadCount;
    private Date createdAt;
    
    // Transient field for display
    // Transient field for display
    private String filename;
    private String username;
    private Boolean needAccessCode;
}
