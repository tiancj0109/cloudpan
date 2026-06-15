package com.cloudpan.entity;

import lombok.Data;
import java.util.Date;
import java.util.List;

@Data
public class Moments {
    private Long id;
    private Long userId;
    private String content;
    private String media; // JSON string
    private String mediaType; // IMAGE, VIDEO, NONE
    private String visibility; // PUBLIC, PRIVATE, FRIENDS, PARTIAL, EXCLUDE
    private Date createdAt;
    private Date updatedAt;

    // Transient fields for display
    private String username;
    private String userAvatar;
    private List<MomentLike> likes;
    private List<MomentComment> comments;
}
