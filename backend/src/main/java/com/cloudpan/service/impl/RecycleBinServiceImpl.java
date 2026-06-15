package com.cloudpan.service.impl;

import com.cloudpan.entity.FileInfo;
import com.cloudpan.entity.RecycleBin;
import com.cloudpan.mapper.FileInfoMapper;
import com.cloudpan.mapper.RecycleBinMapper;
import com.cloudpan.service.RecycleBinService;
import com.cloudpan.service.StorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;

@Service
public class RecycleBinServiceImpl implements RecycleBinService {

    @Autowired
    private RecycleBinMapper recycleBinMapper;

    @Autowired
    private FileInfoMapper fileInfoMapper;
    
    @Autowired
    @Qualifier("localStorage")
    private StorageService localStorage;

    @Autowired
    @Qualifier("ossStorage")
    private StorageService ossStorage;

    @Autowired
    private com.cloudpan.service.QuotaService quotaService;

    @Autowired
    private com.cloudpan.mapper.TeamSpaceMapper teamSpaceMapper;

    @Override
    @Transactional
    public void moveToRecycleBin(Long userId, Long fileId) {
        FileInfo fileInfo = fileInfoMapper.findById(fileId);
        if (fileInfo == null) return;
        
        boolean canDelete = fileInfo.getUserId().equals(userId);
        if (!canDelete) {
            Long teamId = findTeamIdForFile(fileInfo);
            if (teamId != null) {
                // Check if user is team owner
                com.cloudpan.entity.TeamSpace team = teamSpaceMapper.findById(teamId);
                if (team != null && team.getOwnerId().equals(userId)) {
                    canDelete = true;
                }
            }
        }

        if (canDelete) {
            // Update status to deleted
            fileInfo.setStatus(1);
            fileInfoMapper.update(fileInfo);
            
            // Add to recycle bin
            RecycleBin recycleBin = new RecycleBin();
            recycleBin.setUserId(userId);
            recycleBin.setFileId(fileId);
            recycleBin.setOriginalParentId(fileInfo.getParentId());
            // Expire in 30 days
            recycleBin.setExpireAt(new Date(System.currentTimeMillis() + 30L * 24 * 3600 * 1000));
            recycleBinMapper.insert(recycleBin);
        }
    }

    private Long findTeamIdForFile(FileInfo fileInfo) {
        if (fileInfo.getTeamId() != null) {
            return fileInfo.getTeamId();
        }
        Long currentParentId = fileInfo.getParentId();
        int depth = 0;
        while (currentParentId != 0 && depth < 20) {
            FileInfo parent = fileInfoMapper.findById(currentParentId);
            if (parent == null) break;
            if (parent.getTeamId() != null) {
                return parent.getTeamId();
            }
            currentParentId = parent.getParentId();
            depth++;
        }
        return null;
    }

    @Override
    @Transactional
    public void restore(Long userId, Long recycleId) {
        RecycleBin recycleBin = recycleBinMapper.findById(recycleId);
        if (recycleBin != null && recycleBin.getUserId().equals(userId)) {
            FileInfo fileInfo = fileInfoMapper.findById(recycleBin.getFileId());
            if (fileInfo != null) {
                fileInfo.setStatus(0);
                fileInfoMapper.update(fileInfo);
            }
            recycleBinMapper.deleteById(recycleId);
        }
    }

    @Autowired
    private com.cloudpan.service.PreviewService previewService;

    @Override
    @Transactional
    public void deletePermanently(Long userId, Long recycleId) {
        RecycleBin recycleBin = recycleBinMapper.findById(recycleId);
        if (recycleBin != null && recycleBin.getUserId().equals(userId)) {
            FileInfo fileInfo = fileInfoMapper.findById(recycleBin.getFileId());
            if (fileInfo != null) {
                // Hard delete from storage
                if (fileInfo.getIsFolder() == 0) {
                    StorageService storage = fileInfo.getStorageType() == 1 ? ossStorage : localStorage;
                    storage.delete(fileInfo.getFilePath());
                    
                    // Delete thumbnail
                    previewService.deleteThumbnail(fileInfo.getId());
                    
                    // Recalculate used space
                    quotaService.recalculateQuota(userId);
                }
                // Hard delete from DB
                fileInfoMapper.deleteById(fileInfo.getId());
            }
            recycleBinMapper.deleteById(recycleId);
        }
    }

    @Override
    public List<RecycleBin> listRecycleBin(Long userId) {
        return recycleBinMapper.findByUserId(userId);
    }
}
