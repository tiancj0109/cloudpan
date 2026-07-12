package com.cloudpan.mapper;

import com.cloudpan.entity.User;
import org.apache.ibatis.annotations.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserMapper {
    int insert(User user);
    User findByUsername(@Param("username") String username);
    User findById(@Param("id") Long id);
    List<User> searchUsers(@Param("keyword") String keyword);
    int update(User user);
    void updateLastMomentsReadAt(@Param("id") Long id);
    int deleteById(@Param("id") Long id);
}
