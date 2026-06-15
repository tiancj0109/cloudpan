package com.cloudpan.mapper;

import com.cloudpan.entity.GroupMember;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface GroupMemberMapper {
    int insert(GroupMember groupMember);
    int update(GroupMember groupMember);
    
    int deleteByGroupIdAndUserId(@Param("groupId") Long groupId, @Param("userId") Long userId);
    
    int deleteByGroupId(Long groupId);
    
    List<GroupMember> findByGroupId(Long groupId);
    
    GroupMember findByGroupIdAndUserId(@Param("groupId") Long groupId, @Param("userId") Long userId);
    
    int countByGroupId(Long groupId);

    void updateLastReadMessageId(@Param("groupId") Long groupId, @Param("userId") Long userId, @Param("lastReadMessageId") Long lastReadMessageId);
}
