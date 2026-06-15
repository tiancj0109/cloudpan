package com.cloudpan.service;

import com.cloudpan.entity.ChatMessage;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

public interface ChatService {
    ChatMessage sendMessage(Long senderId, Long receiverId, Long groupId, String content, String type, MultipartFile file, Integer duration, Long replyToMessageId);
    List<ChatMessage> getHistory(Long userId, Long friendId, Long groupId, int page, int pageSize);
    List<ChatMessage> pollMessages(Long userId, Long friendId, Long groupId, Long lastMessageId, java.util.Date lastSyncTime);

    void deleteHistory(Long userId, Long friendId);
    java.io.File getFile(Long messageId);
    java.io.File getThumbFile(Long messageId);
    List<ChatMessage> getMediaFiles(Long userId, Long friendId, Long groupId);
    void recallMessage(Long userId, Long messageId);
    
    // Group Chat
    com.cloudpan.entity.ChatGroup createGroup(Long ownerId, String name, List<Long> memberIds);
    com.cloudpan.entity.ChatGroup updateGroup(Long userId, Long groupId, String name, String notice, org.springframework.web.multipart.MultipartFile avatarFile);
    List<com.cloudpan.entity.ChatGroup> getGroupList(Long userId);
    com.cloudpan.entity.ChatGroup getGroupDetail(Long groupId);
    java.io.File getGroupAvatar(Long groupId);
    List<com.cloudpan.entity.GroupMember> getGroupMembers(Long groupId);
    void inviteToGroup(Long groupId, List<Long> userIds);
    void quitGroup(Long userId, Long groupId);
    void kickMember(Long currentUserId, Long groupId, Long memberId);
    void dissolveGroup(Long userId, Long groupId);
    void toggleTopGroup(Long userId, Long groupId, Boolean isTop);
    void markAsRead(Long userId, Long friendId);
    
    
    void markGroupAsRead(Long userId, Long groupId);
    
    int getTotalUnreadCount(Long userId);
    
    java.util.Map<String, Object> getUnreadCounts(Long userId);
}
