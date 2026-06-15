package com.cloudpan.entity;

import lombok.Data;
import java.util.Date;

@Data
public class MomentComment {
    private Long id;
    private Long momentId;
    private Long userId;
    private Long replyToUserId;
    private String content;
    private Date createdAt;

    // Transient fields for display
    private String username;
    private String replyToUsername;
}
