package com.cloudpan.mapper;

import com.cloudpan.entity.Friend;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface FriendMapper {
    int insert(Friend friend);
    int update(Friend friend);
    int delete(@Param("userId") Long userId, @Param("friendId") Long friendId);
    Friend findByUsers(@Param("userId") Long userId, @Param("friendId") Long friendId);
    List<Friend> findListByUserId(@Param("userId") Long userId);
    List<Friend> findRequestsByUserId(@Param("userId") Long userId); // Pending requests received by user
    List<Friend> findDeleteRequestsByUserId(@Param("userId") Long userId); // Delete requests received by user
    int countByUserId(@Param("userId") Long userId);
}
