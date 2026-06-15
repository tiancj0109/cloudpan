package com.cloudpan.mapper;

import com.cloudpan.entity.UserStorage;
import org.apache.ibatis.annotations.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserStorageMapper {
    UserStorage findByUserId(@Param("userId") Long userId);
    int insert(UserStorage userStorage);
    int updateUsedSpace(@Param("userId") Long userId, @Param("delta") Long delta);
    int updateTotalQuota(@Param("userId") Long userId, @Param("newQuota") Long newQuota);
    int setUsedSpace(@Param("userId") Long userId, @Param("usedSpace") Long usedSpace);
}
