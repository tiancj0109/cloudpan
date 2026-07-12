package com.cloudpan.mapper;

import com.cloudpan.entity.MomentComment;
import com.cloudpan.entity.MomentLike;
import com.cloudpan.entity.Moments;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Date;
import java.util.List;

@Mapper
public interface MomentsMapper {
    void insert(Moments moments);
    
    void insertVisibility(@Param("momentId") Long momentId, @Param("userIds") List<Long> userIds);
    
    List<Moments> selectMoments(@Param("currentUserId") Long currentUserId, 
                                @Param("friendIds") List<Long> friendIds, 
                                @Param("targetUserId") Long targetUserId,
                                @Param("momentId") Long momentId,
                                @Param("offset") int offset, 
                                @Param("limit") int limit);
                                
    void insertLike(MomentLike like);
    
    void deleteLike(@Param("momentId") Long momentId, @Param("userId") Long userId);
    
    void insertComment(MomentComment comment);
    
    List<MomentLike> selectLikesByMomentIds(@Param("momentIds") List<Long> momentIds);
    
    List<MomentComment> selectCommentsByMomentIds(@Param("momentIds") List<Long> momentIds);
    
    Moments selectById(@Param("id") Long id);

    void deleteById(@Param("id") Long id);

    void deleteLikesByMomentId(@Param("momentId") Long momentId);

    void deleteCommentsByMomentId(@Param("momentId") Long momentId);

    void deleteVisibilityByMomentId(@Param("momentId") Long momentId);

    MomentComment selectCommentById(@Param("id") Long id);

    void deleteCommentById(@Param("id") Long id);

    void updateComment(@Param("id") Long id, @Param("content") String content);

    void updateVisibility(@Param("id") Long id, @Param("visibility") String visibility);
    int countNewMoments(@Param("friendIds") List<Long> friendIds, @Param("userId") Long userId, @Param("lastReadAt") Date lastReadAt);

    // Account deletion support
    List<Moments> selectByUserId(@Param("userId") Long userId);
    int deleteByUserId(@Param("userId") Long userId);
    int deleteLikesByUserId(@Param("userId") Long userId);
    int deleteCommentsByUserId(@Param("userId") Long userId);
    int deleteVisibilityByUserId(@Param("userId") Long userId);
}
