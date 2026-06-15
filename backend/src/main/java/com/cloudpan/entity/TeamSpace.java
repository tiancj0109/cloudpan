package com.cloudpan.entity;

import lombok.Data;
import java.util.Date;

@Data
public class TeamSpace {
    private Long id;
    private String name;
    private Long ownerId;
    private Long rootFolderId;
    private Date createdAt;
}
