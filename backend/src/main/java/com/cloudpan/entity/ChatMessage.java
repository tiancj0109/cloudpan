package com.cloudpan.entity;

import lombok.Data;
import java.util.Date;

@Data
public class ChatMessage {
    private Long id;
    private Long senderId;
    private Long receiverId;
    private Long groupId; // Null for private chat
    private String content;
    private String type; // TEXT, IMAGE, VIDEO, AUDIO
    private Long fileSize;
    private String filePath;
    private String thumbPath;
    private Integer duration;
    private Integer status; // 0: Unread, 1: Read
    private Date createdAt;
    private Date updatedAt;
    private Long replyToMessageId;
    
    // Transient fields
    private String senderUsername;
    private String senderAvatar;
    
    // Transient fields for reply
    private String replyContent;
    private String replyType;
    private String replySenderUsername;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSenderId() { return senderId; }
    public void setSenderId(Long senderId) { this.senderId = senderId; }
    public Long getReceiverId() { return receiverId; }
    public void setReceiverId(Long receiverId) { this.receiverId = receiverId; }
    public Long getGroupId() { return groupId; }
    public void setGroupId(Long groupId) { this.groupId = groupId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }
    public String getThumbPath() { return thumbPath; }
    public void setThumbPath(String thumbPath) { this.thumbPath = thumbPath; }
    public Integer getDuration() { return duration; }
    public void setDuration(Integer duration) { this.duration = duration; }
    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
    public Date getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Date updatedAt) { this.updatedAt = updatedAt; }
    public Long getReplyToMessageId() { return replyToMessageId; }
    public void setReplyToMessageId(Long replyToMessageId) { this.replyToMessageId = replyToMessageId; }
    public String getSenderUsername() { return senderUsername; }
    public void setSenderUsername(String senderUsername) { this.senderUsername = senderUsername; }
    public String getSenderAvatar() { return senderAvatar; }
    public void setSenderAvatar(String senderAvatar) { this.senderAvatar = senderAvatar; }
    public String getReplyContent() { return replyContent; }
    public void setReplyContent(String replyContent) { this.replyContent = replyContent; }
    public String getReplyType() { return replyType; }
    public void setReplyType(String replyType) { this.replyType = replyType; }
    public String getReplySenderUsername() { return replySenderUsername; }
    public void setReplySenderUsername(String replySenderUsername) { this.replySenderUsername = replySenderUsername; }
}
