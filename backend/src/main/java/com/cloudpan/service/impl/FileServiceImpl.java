package com.cloudpan.service.impl;

import com.cloudpan.entity.FileInfo;
import com.cloudpan.entity.OssConfig;
import com.cloudpan.entity.TeamSpace;
import com.cloudpan.mapper.FileInfoMapper;
import com.cloudpan.mapper.OssConfigMapper;
import com.cloudpan.mapper.TeamMemberMapper;
import com.cloudpan.mapper.TeamSpaceMapper;
import com.cloudpan.service.FileService;
import com.cloudpan.service.StorageService;
import com.cloudpan.service.RecycleBinService;
import com.cloudpan.service.QuotaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.List;

@Service
public class FileServiceImpl implements FileService {

    @Autowired
    private FileInfoMapper fileInfoMapper;

    @Autowired
    private OssConfigMapper ossConfigMapper;

    @Autowired
    private TeamSpaceMapper teamSpaceMapper;

    @Autowired
    private TeamMemberMapper teamMemberMapper;

    @Autowired
    private RecycleBinService recycleBinService;

    @Autowired
    private QuotaService quotaService;

    @Autowired
    @Qualifier("localStorage")
    private StorageService localStorage;

    @Autowired
    @Qualifier("ossStorage")
    private StorageService ossStorage;

    private StorageService getStorageService() {
        OssConfig config = ossConfigMapper.findFirst();
        if (config != null && config.getIsEnable() == 1) {
            return ossStorage;
        }
        return localStorage;
    }
    
    private int getStorageType() {
        OssConfig config = ossConfigMapper.findFirst();
        return (config != null && config.getIsEnable() == 1) ? 1 : 0;
    }

    @Override
    @Transactional
    public FileInfo upload(Long userId, Long parentId, MultipartFile file) {
        if (!quotaService.checkQuota(userId, file.getSize())) {
            throw new RuntimeException("Storage quota exceeded");
        }
        
        StorageService storage = getStorageService();
        int storageType = getStorageType();
        
        String path = storage.upload(file, "");
        
        FileInfo fileInfo = new FileInfo();
        fileInfo.setUserId(userId);
        fileInfo.setParentId(parentId);
        fileInfo.setFilename(file.getOriginalFilename());
        fileInfo.setFilePath(path);
        fileInfo.setFileSize(file.getSize());
        fileInfo.setFileType(getFileExtension(file.getOriginalFilename()));
        fileInfo.setIsFolder(0);
        fileInfo.setStorageType(storageType);
        
        // Inherit teamId from parent folder if exists
        if (parentId != 0) {
            FileInfo parent = fileInfoMapper.findById(parentId);
            if (parent != null && parent.getTeamId() != null) {
                fileInfo.setTeamId(parent.getTeamId());
            }
        }
        
        fileInfoMapper.insert(fileInfo);
        
        quotaService.recalculateQuota(userId);
        
        return fileInfo;
    }

    @Override
    public InputStream download(Long userId, Long fileId) {
        FileInfo fileInfo = fileInfoMapper.findById(fileId);
        if (fileInfo == null) {
            throw new RuntimeException("File not found");
        }
        
        // Check permission: Owner or Team Member
        boolean hasAccess = fileInfo.getUserId().equals(userId);
        if (!hasAccess) {
            Long teamId = findTeamIdForFile(fileInfo);
            if (teamId != null) {
                hasAccess = teamMemberMapper.findByTeamIdAndUserId(teamId, userId) != null;
            }
        }
        
        if (!hasAccess) {
            throw new RuntimeException("Access denied");
        }
        
        StorageService storage = fileInfo.getStorageType() == 1 ? ossStorage : localStorage;
        return storage.download(fileInfo.getFilePath());
    }

    @Override
    public FileInfo createFolder(Long userId, Long parentId, String folderName) {
        FileInfo folder = new FileInfo();
        folder.setUserId(userId);
        folder.setParentId(parentId);
        folder.setFilename(folderName);
        folder.setIsFolder(1);
        folder.setFileSize(0L);
        folder.setStorageType(0); // Folder doesn't need storage
        
        // Inherit teamId
        if (parentId != 0) {
            FileInfo parent = fileInfoMapper.findById(parentId);
            if (parent != null) {
                Long teamId = findTeamIdForFile(parent);
                if (teamId != null) {
                    folder.setTeamId(teamId);
                }
            }
        }
        
        fileInfoMapper.insert(folder);
        return folder;
    }

    @Override
    public List<FileInfo> listFiles(Long userId, Long parentId) {
        if (parentId == 0) {
            // Personal files
            List<FileInfo> files = fileInfoMapper.findByUserIdAndParentId(userId, 0L);
            
            // Filter out team root folders from personal list to avoid duplication
            // Team root folders have teamId set
            files.removeIf(f -> f.getTeamId() != null);
            
            // Joined teams (as virtual folders)
            List<TeamSpace> teams = teamSpaceMapper.findJoinedTeams(userId);
            for (TeamSpace team : teams) {
                FileInfo teamFolder = new FileInfo();
                teamFolder.setId(team.getRootFolderId());
                teamFolder.setFilename(team.getName() + " (Team)");
                teamFolder.setIsFolder(1);
                teamFolder.setUserId(team.getOwnerId());
                teamFolder.setUpdatedAt(team.getCreatedAt());
                teamFolder.setTeamId(team.getId());
                files.add(0, teamFolder); // Add to top
            }
            return files;
        } else {
            // Check access
            FileInfo folder = fileInfoMapper.findById(parentId);
            if (folder == null) return null;
            
            boolean hasAccess = false;
            if (folder.getUserId().equals(userId)) {
                hasAccess = true;
            } else {
                Long teamId = findTeamIdForFile(folder);
                if (teamId != null) {
                    // Check if user is member of this team
                    if (teamMemberMapper.findByTeamIdAndUserId(teamId, userId) != null) {
                        hasAccess = true;
                    }
                }
            }
            
            if (hasAccess) {
                // If it's a team folder (or my folder), list all files in it (no user filter if team)
                Long teamId = findTeamIdForFile(folder);
                if (teamId != null) {
                    return fileInfoMapper.findByParentId(parentId);
                } else {
                    return fileInfoMapper.findByUserIdAndParentId(userId, parentId);
                }
            }
            return null; // No access
        }
    }

    @Override
    @Transactional
    public void deleteFile(Long userId, Long fileId) {
        FileInfo fileInfo = fileInfoMapper.findById(fileId);
        if (fileInfo == null) return;
        
        boolean canDelete = fileInfo.getUserId().equals(userId);
        if (!canDelete) {
            Long teamId = findTeamIdForFile(fileInfo);
            if (teamId != null) {
                // Check if user is team owner
                TeamSpace team = teamSpaceMapper.findById(teamId);
                if (team != null && team.getOwnerId().equals(userId)) {
                    canDelete = true;
                }
            }
        }
        
        if (canDelete) {
            // Check if folder is empty
            if (fileInfo.getIsFolder() == 1) {
                List<FileInfo> children = fileInfoMapper.findByParentId(fileId);
                if (children != null && !children.isEmpty()) {
                    throw new RuntimeException("请先删除文件夹下所有内容");
                }
            }
            recycleBinService.moveToRecycleBin(userId, fileId);
        } else {
            throw new RuntimeException("没有权限删除");
        }
    }

    @Override
    public void renameFile(Long userId, Long fileId, String newName) {
        FileInfo fileInfo = fileInfoMapper.findById(fileId);
        if (fileInfo == null) return;

        boolean canRename = fileInfo.getUserId().equals(userId);
        if (!canRename) {
            Long teamId = findTeamIdForFile(fileInfo);
            if (teamId != null) {
                // Check if user is team owner
                TeamSpace team = teamSpaceMapper.findById(teamId);
                if (team != null && team.getOwnerId().equals(userId)) {
                    canRename = true;
                }
            }
        }

        if (canRename) {
            fileInfo.setFilename(newName);
            fileInfoMapper.update(fileInfo);
        } else {
            throw new RuntimeException("没有权限修改");
        }
    }
    
    @Override
    public List<FileInfo> searchFiles(Long userId, String keyword) {
        return fileInfoMapper.searchByUserIdAndName(userId, keyword);
    }

    @Override
    public FileInfo getFileInfo(Long userId, Long fileId) {
        FileInfo fileInfo = fileInfoMapper.findById(fileId);
        if (fileInfo != null) {
            if (fileInfo.getUserId().equals(userId)) {
                return fileInfo;
            }
            Long teamId = findTeamIdForFile(fileInfo);
            if (teamId != null && teamMemberMapper.findByTeamIdAndUserId(teamId, userId) != null) {
                return fileInfo;
            }
        }
        return null;
    }

    private Long findTeamIdForFile(FileInfo fileInfo) {
        if (fileInfo.getTeamId() != null) {
            return fileInfo.getTeamId();
        }
        Long currentParentId = fileInfo.getParentId();
        int depth = 0;
        while (currentParentId != 0 && depth < 20) { // Limit depth to avoid infinite loops
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

    private String getFileExtension(String filename) {
        if (filename == null) return null;
        int dotIndex = filename.lastIndexOf(".");
        return dotIndex >= 0 ? filename.substring(dotIndex + 1) : null;
    }

    @Override
    public void batchDownload(Long userId, List<Long> fileIds, java.io.OutputStream outputStream) {
        try (java.util.zip.ZipOutputStream zos = new java.util.zip.ZipOutputStream(outputStream)) {
            for (Long fileId : fileIds) {
                FileInfo fileInfo = fileInfoMapper.findById(fileId);
                // Check permission: Owner or Team Member
                boolean hasAccess = false;
                if (fileInfo != null) {
                    if (fileInfo.getUserId().equals(userId)) {
                        hasAccess = true;
                    } else {
                        Long teamId = findTeamIdForFile(fileInfo);
                        if (teamId != null) {
                            hasAccess = teamMemberMapper.findByTeamIdAndUserId(teamId, userId) != null;
                        }
                    }
                }

                if (hasAccess) {
                    addToZip(userId, fileInfo, "", zos);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("批量下载失败", e);
        }
    }

    private void addToZip(Long userId, FileInfo fileInfo, String path, java.util.zip.ZipOutputStream zos) throws java.io.IOException {
        String entryName = path + fileInfo.getFilename();
        
        if (fileInfo.getIsFolder() == 1) {
            // Folder
            entryName += "/";
            zos.putNextEntry(new java.util.zip.ZipEntry(entryName));
            zos.closeEntry();
            
            List<FileInfo> children = fileInfoMapper.findByParentId(fileInfo.getId());
            for (FileInfo child : children) {
                addToZip(userId, child, entryName, zos);
            }
        } else {
            // File
            zos.putNextEntry(new java.util.zip.ZipEntry(entryName));
            StorageService storage = fileInfo.getStorageType() == 1 ? ossStorage : localStorage;
            try (InputStream is = storage.download(fileInfo.getFilePath())) {
                byte[] buffer = new byte[1024];
                int len;
                while ((len = is.read(buffer)) > 0) {
                    zos.write(buffer, 0, len);
                }
            }
            zos.closeEntry();
        }
    }

    @Override
    @Transactional
    public void batchMove(Long userId, List<Long> fileIds, Long targetParentId) {
        // Validate target folder
        Long targetTeamId = null;
        if (targetParentId != 0) {
            FileInfo targetFolder = fileInfoMapper.findById(targetParentId);
            if (targetFolder == null || targetFolder.getIsFolder() == 0) {
                throw new RuntimeException("目标文件夹不存在");
            }
            
            // Always calculate targetTeamId
            targetTeamId = findTeamIdForFile(targetFolder);

            // Check write permission on target
            boolean canWrite = targetFolder.getUserId().equals(userId);
            if (!canWrite) {
                if (targetTeamId != null) {
                    // Check if member
                    if (teamMemberMapper.findByTeamIdAndUserId(targetTeamId, userId) != null) {
                        canWrite = true;
                    }
                }
            }
            if (!canWrite) {
                throw new RuntimeException("没有权限移动到目标文件夹");
            }
        }

        for (Long fileId : fileIds) {
            FileInfo fileInfo = fileInfoMapper.findById(fileId);
            if (fileInfo == null) continue;
            
            // Check move permission (same as delete/rename)
            boolean canMove = fileInfo.getUserId().equals(userId);
            if (!canMove) {
                Long teamId = findTeamIdForFile(fileInfo);
                if (teamId != null) {
                    TeamSpace team = teamSpaceMapper.findById(teamId);
                    if (team != null && team.getOwnerId().equals(userId)) {
                        canMove = true;
                    }
                }
            }
            
            if (canMove) {
                // Prevent moving folder into itself
                if (fileInfo.getIsFolder() == 1 && targetParentId != 0) {
                    if (fileId.equals(targetParentId)) {
                         throw new RuntimeException("不能将文件夹移动到自身");
                    }
                    // Check if target is a subfolder of source
                    if (isSubfolder(fileId, targetParentId)) {
                        throw new RuntimeException("不能将文件夹移动到其子文件夹");
                    }
                }

                // Check team file restriction
                Long sourceTeamId = findTeamIdForFile(fileInfo);
                if (sourceTeamId != null) {
                    if (targetTeamId == null || !targetTeamId.equals(sourceTeamId)) {
                        throw new RuntimeException("团队文件无法移至团队文件夹之外");
                    }
                }

                // Check personal to team restriction
                if (sourceTeamId == null && targetTeamId != null) {
                    throw new RuntimeException("个人文件无法移至团队文件夹");
                }

                fileInfo.setParentId(targetParentId);
                // Update teamId based on target
                if (targetParentId == 0) {
                    fileInfo.setTeamId(null); // Move to personal root
                } else {
                    if (targetTeamId != null) {
                        fileInfo.setTeamId(targetTeamId);
                    } else {
                        // If target is personal folder, clear teamId
                        FileInfo target = fileInfoMapper.findById(targetParentId);
                         if (target.getTeamId() == null) {
                             fileInfo.setTeamId(null);
                         } else {
                             fileInfo.setTeamId(target.getTeamId());
                         }
                    }
                }
                fileInfoMapper.update(fileInfo);
            }
        }
    }

    private boolean isSubfolder(Long parentId, Long childId) {
        Long currentId = childId;
        while (currentId != 0) {
            if (currentId.equals(parentId)) return true;
            FileInfo file = fileInfoMapper.findById(currentId);
            if (file == null) break;
            currentId = file.getParentId();
        }
        return false;
    }

    @Override
    public org.springframework.core.io.Resource getResource(Long userId, Long fileId) {
        FileInfo fileInfo = fileInfoMapper.findById(fileId);
        if (fileInfo == null) {
            throw new RuntimeException("文件不存在");
        }

        // Check permission: Owner or Team Member
        boolean hasAccess = fileInfo.getUserId().equals(userId);
        if (!hasAccess) {
            Long teamId = findTeamIdForFile(fileInfo);
            if (teamId != null) {
                hasAccess = teamMemberMapper.findByTeamIdAndUserId(teamId, userId) != null;
            }
        }

        if (!hasAccess) {
            throw new RuntimeException("没有权限访问");
        }

        if (fileInfo.getStorageType() == 0) {
            // Local storage: Return FileSystemResource for Range support
            // LocalStorageImpl saves absolute path, so we can use it directly.
            java.io.File file = new java.io.File(fileInfo.getFilePath());
            if (!file.exists()) {
                // Fallback: try with storagePath if for some reason it's relative
                file = new java.io.File(storagePath, fileInfo.getFilePath());
            }
            return new org.springframework.core.io.FileSystemResource(file);
        } else {
            // OSS: Fallback to InputStreamResource
            return new org.springframework.core.io.InputStreamResource(ossStorage.download(fileInfo.getFilePath()));
        }
    }

    @Override
    public String getPreviewUrl(Long userId, Long fileId) {
        FileInfo fileInfo = fileInfoMapper.findById(fileId);
        if (fileInfo == null) {
            return null;
        }
        
        // Check permission
        boolean hasAccess = fileInfo.getUserId().equals(userId);
        if (!hasAccess) {
            Long teamId = findTeamIdForFile(fileInfo);
            if (teamId != null) {
                hasAccess = teamMemberMapper.findByTeamIdAndUserId(teamId, userId) != null;
            }
        }
        if (!hasAccess) {
            return null;
        }

        if (fileInfo.getStorageType() == 1) {
            // OSS: Generate signed URL for 1 hour
            return ossStorage.getSignedUrl(fileInfo.getFilePath(), 3600);
        }
        return null;
    }

    @Value("${file.storage.path:uploads}")
    private String storagePath;

    private String getLocalStoragePath() {
        return storagePath;
    }
}
