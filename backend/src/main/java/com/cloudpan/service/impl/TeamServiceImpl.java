package com.cloudpan.service.impl;

import com.cloudpan.entity.FileInfo;
import com.cloudpan.entity.TeamMember;
import com.cloudpan.entity.TeamSpace;
import com.cloudpan.mapper.FileInfoMapper;
import com.cloudpan.mapper.TeamMemberMapper;
import com.cloudpan.mapper.TeamSpaceMapper;
import com.cloudpan.mapper.UserMapper;
import com.cloudpan.service.TeamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TeamServiceImpl implements TeamService {

    @Autowired
    private TeamSpaceMapper teamSpaceMapper;

    @Autowired
    private TeamMemberMapper teamMemberMapper;
    
    @Autowired
    private FileInfoMapper fileInfoMapper;

    @Autowired
    private UserMapper userMapper;

    @Override
    @Transactional
    public TeamSpace createTeam(Long userId, String name) {
        TeamSpace teamSpace = new TeamSpace();
        teamSpace.setName(name);
        teamSpace.setOwnerId(userId);
        // Insert teamSpace first to get ID
        teamSpaceMapper.insert(teamSpace);
        
        // Create root folder for team
        FileInfo rootFolder = new FileInfo();
        rootFolder.setUserId(userId); // Owner
        rootFolder.setParentId(0L);
        rootFolder.setFilename(name + "_Root");
        rootFolder.setIsFolder(1);
        rootFolder.setStorageType(0);
        rootFolder.setStatus(0);
        rootFolder.setTeamId(teamSpace.getId()); // Set Team ID
        fileInfoMapper.insert(rootFolder);
        
        // Update teamSpace with rootFolderId
        teamSpace.setRootFolderId(rootFolder.getId());
        teamSpaceMapper.update(teamSpace);
        
        // Add owner as member
        TeamMember member = new TeamMember();
        member.setTeamId(teamSpace.getId());
        member.setUserId(userId);
        member.setRole("OWNER");
        member.setPermission("READ_WRITE");
        teamMemberMapper.insert(member);
        
        return teamSpace;
    }

    @Override
    public void addMember(Long teamId, Long userId, String role, String permission) {
        if (userMapper.findById(userId) == null) {
            throw new RuntimeException("用户没找到");
        }
        TeamMember member = new TeamMember();
        member.setTeamId(teamId);
        member.setUserId(userId);
        member.setRole(role);
        member.setPermission(permission);
        teamMemberMapper.insert(member);
    }

    @Override
    public void removeMember(Long teamId, Long userId) {
        teamMemberMapper.deleteByTeamIdAndUserId(teamId, userId);
    }

    @Override
    public List<TeamSpace> listMyTeams(Long userId) {
        return teamSpaceMapper.findJoinedTeams(userId);
    }

    @Override
    public List<TeamMember> listTeamMembers(Long teamId) {
        return teamMemberMapper.findByTeamId(teamId);
    }

    @Override
    @Transactional
    public void deleteTeam(Long teamId, Long userId) {
        TeamSpace team = teamSpaceMapper.findById(teamId);
        if (team == null) {
            throw new RuntimeException("团队不存在");
        }
        if (!team.getOwnerId().equals(userId)) {
            throw new RuntimeException("只有团队所有者可以删除团队");
        }
        // Delete team space (cascade delete should handle members, but we might need to handle files)
        // For now, assuming DB cascade handles members. Files might need explicit deletion if not cascaded.
        // Let's assume simple delete for now.
        teamSpaceMapper.deleteById(teamId);
        
        // Also delete the root folder associated with the team
        if (team.getRootFolderId() != null) {
            // This might need a recursive delete if we want to clean up all files
            // For simplicity, we just delete the root folder record. 
            // Real implementation should probably move to recycle bin or delete recursively.
             fileInfoMapper.deleteById(team.getRootFolderId());
        }
    }

    @Override
    public void quitTeam(Long teamId, Long userId) {
        TeamSpace team = teamSpaceMapper.findById(teamId);
        if (team == null) {
            throw new RuntimeException("团队不存在");
        }
        if (team.getOwnerId().equals(userId)) {
            throw new RuntimeException("团队所有者不能退出团队，请先转让所有权或删除团队");
        }
        teamMemberMapper.deleteByTeamIdAndUserId(teamId, userId);
    }
}
