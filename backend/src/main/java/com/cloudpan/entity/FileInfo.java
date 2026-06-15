
package com.cloudpan.entity;

import lombok.Data;
import java.util.Date;

@Data
public class FileInfo {
    private Long id;
    private Long userId;
    private Long parentId;
    private String filename;
    private String filePath;
    private Long fileSize;
    private String fileType;
    private Integer isFolder;
    private Integer storageType; // 0: Local, 1: OSS
    private Integer status; // 0: Normal, 1: Deleted
    private String identifier;
    private Long teamId; // New field for team collaboration
    private Date createdAt;
    private Date updatedAt;
}
