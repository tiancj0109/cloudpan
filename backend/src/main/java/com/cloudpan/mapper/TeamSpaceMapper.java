package com.cloudpan.mapper;

import com.cloudpan.entity.TeamSpace;
import org.apache.ibatis.annotations.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamSpaceMapper {
    int insert(TeamSpace teamSpace);
    TeamSpace findById(@Param("id") Long id);
    List<TeamSpace> findByOwnerId(@Param("ownerId") Long ownerId);
    List<TeamSpace> findJoinedTeams(@Param("userId") Long userId);
    int update(TeamSpace teamSpace);
    int deleteById(@Param("id") Long id);
    int countByUserId(@Param("userId") Long userId);
}
