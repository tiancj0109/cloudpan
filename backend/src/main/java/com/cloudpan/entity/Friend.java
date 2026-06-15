package com.cloudpan.entity;

import lombok.Data;
import java.util.Date;

@Data
public class Friend {
    private Long id;
    private Long userId;
    private Long friendId;
    private Integer status; // 0: Pending, 1: Accepted, 2: DeleteRequested
    private Long actionUserId;
    private Date createdAt;
    private Date updatedAt;
    
    // Transient fields for display
    private String friendUsername;
    private String friendAvatar;
    private String friendEmail;
    private String friendRole;
    private String friendSignature;
    private Date friendCreatedAt;
    
    // Unread message count
    private Integer unreadCount;
    
    private Boolean isTop;
}
