package com.cloudpan.service;

import com.cloudpan.entity.TeamMember;
import com.cloudpan.entity.TeamSpace;
import java.util.List;

public interface TeamService {
    TeamSpace createTeam(Long userId, String name);
    void addMember(Long teamId, Long userId, String role, String permission);
    void removeMember(Long teamId, Long userId);
    List<TeamSpace> listMyTeams(Long userId);
    List<TeamMember> listTeamMembers(Long teamId);
    void deleteTeam(Long teamId, Long userId);
    void quitTeam(Long teamId, Long userId);
}
