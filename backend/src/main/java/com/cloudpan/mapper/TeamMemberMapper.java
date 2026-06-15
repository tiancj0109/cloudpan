package com.cloudpan.mapper;

import com.cloudpan.entity.TeamMember;
import org.apache.ibatis.annotations.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamMemberMapper {
    int insert(TeamMember teamMember);
    List<TeamMember> findByTeamId(@Param("teamId") Long teamId);
    List<TeamMember> findByUserId(@Param("userId") Long userId);
    TeamMember findByTeamIdAndUserId(@Param("teamId") Long teamId, @Param("userId") Long userId);
    int deleteByTeamIdAndUserId(@Param("teamId") Long teamId, @Param("userId") Long userId);
}
