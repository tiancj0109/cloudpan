package com.cloudpan.mapper;

import com.cloudpan.entity.ChatMessage;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface ChatMessageMapper {
    int insert(ChatMessage message);
    int updateStatus(@Param("id") Long id, @Param("status") Integer status);
    int updateStatusBatch(@Param("ids") List<Long> ids, @Param("status") Integer status);
    void updateRecall(Long id);
    
    List<ChatMessage> findHistory(@Param("userId") Long userId, @Param("friendId") Long friendId, @Param("groupId") Long groupId, @Param("offset") int offset, @Param("limit") int limit);
    List<ChatMessage> findNewMessages(@Param("userId") Long userId, @Param("friendId") Long friendId, @Param("groupId") Long groupId, @Param("lastMessageId") Long lastMessageId, @Param("lastSyncTime") java.util.Date lastSyncTime);
    
    int deleteByUsers(@Param("userId") Long userId, @Param("friendId") Long friendId);
    int deleteByGroupId(@Param("groupId") Long groupId);
    void deleteById(Long id);
    void markAsRead(@Param("userId") Long userId, @Param("friendId") Long friendId);
    ChatMessage findById(@Param("id") Long id);
    List<ChatMessage> findMediaFiles(@Param("userId") Long userId, @Param("friendId") Long friendId, @Param("groupId") Long groupId);
    List<ChatMessage> findAllFiles(@Param("userId") Long userId, @Param("friendId") Long friendId, @Param("groupId") Long groupId);
    
    List<ChatMessage> searchHistory(@Param("userId") Long userId, @Param("friendId") Long friendId, @Param("groupId") Long groupId, @Param("keyword") String keyword);
    List<ChatMessage> searchAll(@Param("userId") Long userId, @Param("keyword") String keyword);
    
    int countTotalUnread(@Param("userId") Long userId);
    int countGroupUnread(@Param("groupId") Long groupId, @Param("lastReadMessageId") Long lastReadMessageId, @Param("userId") Long userId);
}
