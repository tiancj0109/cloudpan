package com.cloudpan.mapper;

import com.cloudpan.entity.MomentNotification;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface MomentNotificationMapper {
    void insert(MomentNotification notification);
    
    List<MomentNotification> selectByUserId(@Param("userId") Long userId);
    
    int countUnread(@Param("userId") Long userId);
    
    void markAllAsRead(@Param("userId") Long userId);

    void deleteByMomentId(@Param("momentId") Long momentId);

    void deleteByAttributes(@Param("momentId") Long momentId, 
                            @Param("senderId") Long senderId, 
                            @Param("type") String type, 
                            @Param("content") String content);

    String selectLatestUnreadSenderAvatar(@Param("userId") Long userId);

    void updateContentByAttributes(@Param("momentId") Long momentId,
                                   @Param("senderId") Long senderId,
                                   @Param("type") String type,
                                   @Param("oldContent") String oldContent,
                                   @Param("newContent") String newContent);

    // Account deletion support
    int deleteByUserId(@Param("userId") Long userId);
    int deleteBySenderId(@Param("senderId") Long senderId);
}
