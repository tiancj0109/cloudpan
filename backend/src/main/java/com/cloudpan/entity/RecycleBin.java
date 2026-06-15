package com.cloudpan.entity;

import lombok.Data;
import java.util.Date;

@Data
public class RecycleBin {
    private Long id;
    private Long userId;
    private Long fileId;
    private Long originalParentId;
    private Date deletedAt;
    private Date expireAt;
    
    // Transient field for display
    private String filename;
}
