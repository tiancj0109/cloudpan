package com.cloudpan.entity;

import lombok.Data;
import java.util.Date;

@Data
public class MomentLike {
    private Long momentId;
    private Long userId;
    private Date createdAt;

    // Transient fields for display
    private String username;
}
