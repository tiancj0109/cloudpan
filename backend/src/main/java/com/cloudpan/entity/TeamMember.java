package com.cloudpan.entity;

import lombok.Data;
import java.util.Date;

@Data
public class TeamMember {
    private Long id;
    private Long teamId;
    private Long userId;
    private String role; // OWNER, ADMIN, MEMBER
    private String permission; // READ_ONLY, READ_WRITE
    private Date joinedAt;
}
