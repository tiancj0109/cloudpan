package com.cloudpan.entity;

import lombok.Data;
import java.util.Date;

@Data
public class MomentNotification {
    private Long id;
    private Long userId;
    private Long senderId;
    private Long momentId;
    private String type; // LIKE, COMMENT, REPLY
    private String content;
    private Boolean isRead;
    private Date createdAt;

    // Additional fields for display
    private String senderName;
    private String senderAvatar;
    private String momentImage; // Thumbnail of the moment
    private String momentContent; // Text preview of the moment
}
