package com.cloudpan.service.impl;

import com.cloudpan.entity.ChatGroup;
import com.cloudpan.entity.ChatMessage;
import com.cloudpan.entity.FileInfo;
import com.cloudpan.entity.Moments;
import com.cloudpan.entity.User;
import com.cloudpan.mapper.ChatGroupMapper;
import com.cloudpan.mapper.ChatMessageMapper;
import com.cloudpan.mapper.FileInfoMapper;
import com.cloudpan.mapper.MomentsMapper;
import com.cloudpan.mapper.MomentNotificationMapper;
import com.cloudpan.mapper.UserMapper;
import com.cloudpan.service.PreviewService;
import com.cloudpan.service.StorageService;
import com.cloudpan.service.UserService;
import com.cloudpan.util.JwtUtil;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.DigestUtils;

import java.io.File;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private FileInfoMapper fileInfoMapper;

    @Autowired
    private ChatMessageMapper chatMessageMapper;

    @Autowired
    private ChatGroupMapper chatGroupMapper;

    @Autowired
    private com.cloudpan.mapper.GroupMemberMapper groupMemberMapper;

    @Autowired
    private MomentsMapper momentsMapper;

    @Autowired
    private MomentNotificationMapper momentNotificationMapper;

    @Autowired
    private com.cloudpan.mapper.FriendMapper friendMapper;

    @Autowired
    private com.cloudpan.mapper.ShareLinkMapper shareLinkMapper;

    @Autowired
    private com.cloudpan.mapper.RecycleBinMapper recycleBinMapper;

    @Autowired
    private com.cloudpan.mapper.TeamSpaceMapper teamSpaceMapper;

    @Autowired
    @Qualifier("localStorage")
    private StorageService localStorage;

    @Autowired
    @Qualifier("ossStorage")
    private StorageService ossStorage;

    @Autowired
    private PreviewService previewService;

    @org.springframework.beans.factory.annotation.Value("${cloudpan.storage.chat-path}")
    private String chatStoragePath;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public User register(String username, String password, String email) {
        if (userMapper.findByUsername(username) != null) {
            throw new RuntimeException("用户名已存在");
        }
        User user = new User();
        user.setUsername(username);
        // Simple MD5 for demo, production should use BCrypt
        user.setPassword(DigestUtils.md5DigestAsHex(password.getBytes()));
        user.setEmail(email);
        user.setRole("USER");
        user.setStatus(1);
        userMapper.insert(user);
        return user;
    }

    @Override
    public String login(String username, String password) {
        User user = userMapper.findByUsername(username);
        if (user == null || !user.getPassword().equals(DigestUtils.md5DigestAsHex(password.getBytes()))) {
            throw new RuntimeException("用户名或密码错误");
        }
        return jwtUtil.generateToken(user.getId(), user.getUsername(), user.getRole());
    }

    @Override
    public User getUserById(Long id) {
        return userMapper.findById(id);
    }

    @org.springframework.beans.factory.annotation.Value("${file.storage.path:uploads}")
    private String storagePath;

    @Override
    public String updateAvatar(Long userId, org.springframework.web.multipart.MultipartFile file) {
        User user = userMapper.findById(userId);
        if (user == null) throw new RuntimeException("未找到用户");

        // Delete old avatar if exists
        if (user.getAvatar() != null && !user.getAvatar().isEmpty()) {
            java.io.File oldFile = new java.io.File(storagePath, user.getAvatar());
            if (oldFile.exists()) {
                oldFile.delete();
            }
        }

        // Save new avatar
        String filename = java.util.UUID.randomUUID().toString() + getFileExtension(file.getOriginalFilename());
        String relativePath = "avatars/" + filename;
        java.io.File dest = new java.io.File(storagePath, relativePath);
        if (!dest.getParentFile().exists()) {
            dest.getParentFile().mkdirs();
        }
        try {
            // Resize and save
            net.coobird.thumbnailator.Thumbnails.of(file.getInputStream())
                    .size(200, 200)
                    .toFile(dest);
        } catch (java.io.IOException e) {
            throw new RuntimeException("上传头像失败", e);
        }

        user.setAvatar(relativePath);
        userMapper.update(user);
        return relativePath;
    }

    @Override
    public void updatePassword(Long userId, String oldPassword, String newPassword) {
        User user = userMapper.findById(userId);
        if (user == null) throw new RuntimeException("未找到用户");

        if (!user.getPassword().equals(DigestUtils.md5DigestAsHex(oldPassword.getBytes()))) {
            throw new RuntimeException("旧密码不正确");
        }

        user.setPassword(DigestUtils.md5DigestAsHex(newPassword.getBytes()));
        userMapper.update(user);
    }

    @Override
    public void updateProfile(Long userId, String email, String signature) {
        User user = userMapper.findById(userId);
        if (user == null) throw new RuntimeException("未找到用户");

        user.setEmail(email);
        user.setSignature(signature);
        userMapper.update(user);
    }

    @Override
    public Map<String, Object> getAccountSummary(Long userId) {
        Map<String, Object> summary = new HashMap<>();

        // Cloud files
        List<FileInfo> allFiles = fileInfoMapper.findAllFilesByUserId(userId);
        long totalFileSize = 0;
        int fileCount = 0;
        int folderCount = 0;
        for (FileInfo fi : allFiles) {
            totalFileSize += (fi.getFileSize() != null ? fi.getFileSize() : 0);
            fileCount++;
        }
        // Count folders separately (status = 0, is_folder = 1)
        // find allFile/folder for user — use the existing list method for root
        folderCount = countFolders(userId, 0L);

        summary.put("fileCount", fileCount);
        summary.put("folderCount", folderCount);
        summary.put("totalFileSize", totalFileSize);
        summary.put("totalFileSizeDisplay", formatFileSize(totalFileSize));

        // Chat messages (private + group where user is sender)
        int privateMsgCount = chatMessageMapper.countByUserId(userId);
        summary.put("chatMessages", privateMsgCount);

        // Moments
        List<Moments> userMoments = momentsMapper.selectByUserId(userId);
        int momentCount = userMoments.size();
        int momentMediaCount = 0;
        for (Moments m : userMoments) {
            if (m.getMedia() != null && !"[]".equals(m.getMedia()) && !"NONE".equals(m.getMediaType())) {
                try {
                    List<String> files = objectMapper.readValue(m.getMedia(), new TypeReference<List<String>>() {});
                    momentMediaCount += files.size();
                } catch (Exception ignored) {}
            }
        }
        summary.put("moments", momentCount);
        summary.put("momentMedia", momentMediaCount);

        // Friends
        int friendCount = friendMapper.countByUserId(userId);
        summary.put("friends", friendCount);

        // Groups
        List<ChatGroup> ownedGroups = chatGroupMapper.findByOwnerId(userId);
        List<ChatGroup> joinedGroups = chatGroupMapper.findByUserId(userId);
        summary.put("ownedGroups", ownedGroups.size());
        summary.put("joinedGroups", joinedGroups.size());

        // Team spaces
        int teamCount = teamSpaceMapper.countByUserId(userId);
        summary.put("teams", teamCount);

        // Share links
        int shareCount = shareLinkMapper.countByUserId(userId);
        summary.put("shares", shareCount);

        // Recycle bin
        int recycleCount = recycleBinMapper.countByUserId(userId);
        summary.put("recycleBinItems", recycleCount);

        return summary;
    }

    private int countFolders(Long userId, Long parentId) {
        int count = 0;
        List<FileInfo> files = fileInfoMapper.findByUserIdAndParentId(userId, parentId);
        for (FileInfo f : files) {
            if (f.getIsFolder() == 1) {
                count++;
                count += countFolders(userId, f.getId());
            }
        }
        return count;
    }

    private String formatFileSize(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        if (bytes < 1024 * 1024 * 1024) return String.format("%.1f MB", bytes / (1024.0 * 1024));
        return String.format("%.2f GB", bytes / (1024.0 * 1024 * 1024));
    }

    @Override
    @Transactional
    public Map<String, Object> deleteAccount(Long userId, String password) {
        User user = userMapper.findById(userId);
        if (user == null) {
            throw new RuntimeException("用户不存在");
        }

        // Verify password before proceeding
        if (password == null || password.isEmpty()) {
            throw new RuntimeException("请输入密码以确认注销");
        }
        String hashedPassword = DigestUtils.md5DigestAsHex(password.getBytes());
        if (!user.getPassword().equals(hashedPassword)) {
            throw new RuntimeException("密码错误");
        }

        Map<String, Object> result = new HashMap<>();
        int deletedFiles = 0;
        int deletedMessages = 0;
        int deletedMoments = 0;

        // =====================================================================
        // PHASE 1: Collect and delete ALL physical files from disk/OSS
        // Must happen BEFORE any DB deletion, so we still have the DB records
        // to look up file paths.
        // =====================================================================

        // 1a. Delete user's avatar
        if (user.getAvatar() != null && !user.getAvatar().isEmpty()) {
            File avatarFile = new File(storagePath, user.getAvatar());
            if (avatarFile.exists()) {
                avatarFile.delete();
                deletedFiles++;
            }
        }

        // 1b. Delete chat message files (private messages involving the user)
        List<ChatMessage> userChatFiles = chatMessageMapper.findAllFilesByUserId(userId);
        for (ChatMessage msg : userChatFiles) {
            if (msg.getFilePath() != null) {
                deleteChatFile(msg.getFilePath());
                deletedFiles++;
            }
            if (msg.getThumbPath() != null) {
                deleteChatFile(msg.getThumbPath());
                deletedFiles++;
            }
        }

        // 1c. Delete chat message files from groups owned by the user
        List<ChatMessage> groupChatFiles = chatMessageMapper.findGroupFilesByOwnerId(userId);
        for (ChatMessage msg : groupChatFiles) {
            if (msg.getFilePath() != null) {
                deleteChatFile(msg.getFilePath());
                deletedFiles++;
            }
            if (msg.getThumbPath() != null) {
                deleteChatFile(msg.getThumbPath());
                deletedFiles++;
            }
        }

        // 1d. Delete group avatars for groups owned by user
        List<ChatGroup> ownedGroups = chatGroupMapper.findByOwnerId(userId);
        for (ChatGroup group : ownedGroups) {
            if (group.getAvatar() != null && !group.getAvatar().isEmpty()) {
                deleteChatFile("avatar/" + group.getAvatar());
                deletedFiles++;
            }
        }

        // 1e. Delete moment media files
        List<Moments> userMoments = momentsMapper.selectByUserId(userId);
        for (Moments m : userMoments) {
            deletedMoments++;
            if (m.getMedia() != null && !"[]".equals(m.getMedia()) && !"NONE".equals(m.getMediaType())) {
                try {
                    List<String> files = objectMapper.readValue(m.getMedia(), new TypeReference<List<String>>() {});
                    File momentsDir = new File(storagePath, "moments");
                    for (String filename : files) {
                        // Original file
                        File mediaFile = new File(momentsDir, filename);
                        if (mediaFile.exists()) { mediaFile.delete(); deletedFiles++; }
                        // Image thumbnail
                        File thumbFile = new File(momentsDir, "thumb_" + filename);
                        if (thumbFile.exists()) { thumbFile.delete(); deletedFiles++; }
                        // Video thumbnail (has .jpg appended)
                        File videoThumbFile = new File(momentsDir, "thumb_" + filename + ".jpg");
                        if (videoThumbFile.exists()) { videoThumbFile.delete(); deletedFiles++; }
                    }
                } catch (Exception e) {
                    System.err.println("Failed to parse moment media for user " + userId + ": " + e.getMessage());
                }
            }
        }

        // 1f. Delete user's uploaded files from file_info (local + OSS)
        List<FileInfo> userFiles = fileInfoMapper.findAllFilesByUserId(userId);
        for (FileInfo fi : userFiles) {
            if (fi.getFilePath() != null) {
                StorageService storage = fi.getStorageType() == 1 ? ossStorage : localStorage;
                try {
                    storage.delete(fi.getFilePath());
                } catch (Exception e) {
                    System.err.println("Failed to delete file " + fi.getFilePath() + ": " + e.getMessage());
                }
                // Also try local fallback
                if (fi.getStorageType() == 0) {
                    File localFile = new File(fi.getFilePath());
                    if (!localFile.exists()) {
                        localFile = new File(storagePath, fi.getFilePath());
                    }
                    if (localFile.exists()) {
                        localFile.delete();
                    }
                }
                deletedFiles++;
            }
            // Delete preview thumbnail
            try {
                previewService.deleteThumbnail(fi.getId());
            } catch (Exception ignored) {}
        }

        // =====================================================================
        // PHASE 2: Manual DB cleanup for tables WITHOUT foreign key CASCADE
        // These tables have no FK to user, so CASCADE won't clean them.
        // =====================================================================

        // 2a. Handle groups owned by the user:
        //     - Transfer ownership to another member if available
        //     - If no other member, dissolve the group entirely
        for (ChatGroup group : ownedGroups) {
            List<com.cloudpan.entity.GroupMember> members =
                groupMemberMapper.findByGroupId(group.getId());
            // Find a successor who is not the leaving user
            com.cloudpan.entity.GroupMember successor = null;
            for (com.cloudpan.entity.GroupMember m : members) {
                if (!m.getUserId().equals(userId)) {
                    successor = m;
                    break;
                }
            }
            if (successor != null) {
                // Transfer ownership to the successor
                group.setOwnerId(successor.getUserId());
                chatGroupMapper.update(group);
                successor.setRole("OWNER");
                groupMemberMapper.update(successor);
            } else {
                // No other members — dissolve the group, delete all its messages
                // First delete chat files from disk for these group messages
                List<ChatMessage> groupMsgs = chatMessageMapper.findGroupFilesByOwnerId(userId);
                for (ChatMessage msg : groupMsgs) {
                    deleteChatFile(msg.getFilePath());
                    deleteChatFile(msg.getThumbPath());
                }
                // Delete all messages, members, and the group itself
                // (chat_message.group_id has no FK, so manual deletion required)
                deletedMessages += chatMessageMapper.deleteByGroupId(group.getId());
                groupMemberMapper.deleteByGroupId(group.getId());
                chatGroupMapper.deleteById(group.getId());
            }
        }

        // 2b. Delete user's OWN messages in all contexts:
        //     - Private chats: both sides (sender_id OR receiver_id = userId)
        //       → entire private conversation is wiped
        //     - Group chats: only messages SENT by this user (sender_id = userId)
        //       → other members' messages are preserved
        deletedMessages += chatMessageMapper.deleteByUserId(userId);

        // 2c. Delete moments-related data (no FK constraints exist)
        momentsMapper.deleteLikesByUserId(userId);
        momentsMapper.deleteCommentsByUserId(userId);
        momentNotificationMapper.deleteByUserId(userId);
        momentNotificationMapper.deleteBySenderId(userId);
        momentsMapper.deleteVisibilityByUserId(userId);
        momentsMapper.deleteByUserId(userId);

        // =====================================================================
        // PHASE 3: Delete the user — MySQL ON DELETE CASCADE handles:
        //   user_storage, file_info, recycle_bin, share_link,
        //   chat_message (FK), chat_group (FK), group_member (FK),
        //   friend (FK), team_space (FK), team_member (FK)
        // =====================================================================
        userMapper.deleteById(userId);

        result.put("deletedFiles", deletedFiles);
        result.put("deletedMessages", deletedMessages);
        result.put("deletedMoments", deletedMoments);
        return result;
    }

    private void deleteChatFile(String relativePath) {
        if (relativePath == null || relativePath.isEmpty()) return;
        File file = new File(chatStoragePath, relativePath);
        if (file.exists()) {
            file.delete();
        }
    }

    private String getFileExtension(String filename) {
        if (filename == null) return "";
        int dotIndex = filename.lastIndexOf(".");
        return dotIndex >= 0 ? filename.substring(dotIndex) : "";
    }
}
