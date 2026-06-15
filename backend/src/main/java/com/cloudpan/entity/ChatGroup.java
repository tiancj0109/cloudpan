package com.cloudpan.entity;

import lombok.Data;
import java.util.Date;

@Data
public class ChatGroup {
    private Long id;
    private String name;
    private Long ownerId;
    private String avatar;
    private String notice;
    private Date createdAt;
    private Date updatedAt;
    
    // Transient fields
    private Integer memberCount;
    private Boolean isMember; // Current user is member?
    private Integer unreadCount; // Transient field for unread messages
    private Boolean isTop;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Long getOwnerId() { return ownerId; }
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }
    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
    public String getNotice() { return notice; }
    public void setNotice(String notice) { this.notice = notice; }
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
    public Date getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Date updatedAt) { this.updatedAt = updatedAt; }
    public Integer getMemberCount() { return memberCount; }
    public void setMemberCount(Integer memberCount) { this.memberCount = memberCount; }
    public Boolean getIsMember() { return isMember; }
    public void setIsMember(Boolean isMember) { this.isMember = isMember; }
    public Boolean getIsTop() { return isTop; }
    public void setIsTop(Boolean isTop) { this.isTop = isTop; }
}
