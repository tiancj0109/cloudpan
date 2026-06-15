package com.cloudpan.service;

import com.cloudpan.entity.Moments;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

import java.util.Map;

public interface MomentsService {
    List<Moments> getMoments(Long currentUserId, int page, int pageSize, Long targetUserId, Long momentId);
    
    void publishMoment(Long userId, String content, List<MultipartFile> files, String visibility, List<Long> visibleUserIds);
    
    void likeMoment(Long userId, Long momentId);
    
    void unlikeMoment(Long userId, Long momentId);
    
    void commentMoment(Long userId, Long momentId, String content, Long replyToUserId);
    
    java.io.File getMomentFile(String fileName);

    void deleteMoment(Long userId, Long momentId);

    void deleteComment(Long userId, Long commentId);

    void updateComment(Long userId, Long commentId, String content);

    void updateMomentVisibility(Long userId, Long momentId, String visibility, List<Long> visibleUserIds);

    List<com.cloudpan.entity.MomentNotification> getNotifications(Long userId);
    
    Map<String, Object> getUnreadNotificationCount(Long userId);
    
    void markNotificationsAsRead(Long userId);

    void markMomentsAsRead(Long userId);
}
