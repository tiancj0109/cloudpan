package com.cloudpan.service.impl;

import com.cloudpan.entity.ChatMessage;
import com.cloudpan.mapper.ChatMessageMapper;
import com.cloudpan.service.ChatService;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Service
public class ChatServiceImpl implements ChatService {

    @Autowired
    private ChatMessageMapper chatMessageMapper;

    @Autowired
    private com.cloudpan.mapper.UserMapper userMapper;
    
    @Autowired
    private com.cloudpan.mapper.ChatGroupMapper chatGroupMapper;
    
    @Autowired
    private com.cloudpan.mapper.GroupMemberMapper groupMemberMapper;

    @Value("${cloudpan.storage.chat-path}")
    private String storagePath;
    
    private final String CHAT_DIR = "chat_files";

    @Override
    public ChatMessage sendMessage(Long senderId, Long receiverId, Long groupId, String content, String type, MultipartFile file, Integer duration, Long replyToMessageId) {
        ChatMessage message = new ChatMessage();
        message.setSenderId(senderId);
        message.setReceiverId(receiverId); // Can be null for group chat
        message.setGroupId(groupId);
        message.setType(type);
        message.setStatus(0);
        message.setCreatedAt(new java.util.Date());
        message.setReplyToMessageId(replyToMessageId);
        
        if ("TEXT".equals(type) || "EMOJI".equals(type)) {
            message.setContent(content);
        } else if (file != null) {
            // For file uploads, store the original filename in content
            message.setContent(file.getOriginalFilename());
            String filename = UUID.randomUUID().toString() + getFileExtension(file.getOriginalFilename());
            String relativePath = CHAT_DIR + "/" + filename;
            File dest = new File(storagePath, relativePath);
            if (!dest.getParentFile().exists()) dest.getParentFile().mkdirs();
            
            try {
                // Use absolute path to avoid issues with relative paths in transferTo
                file.transferTo(dest.getAbsoluteFile());
                message.setFilePath(relativePath);
                message.setFileSize(file.getSize());
                message.setDuration(duration);
                
                // Generate thumbnail for IMAGE
                if ("IMAGE".equals(type)) {
                    try {
                        String thumbName = "thumb_" + filename;
                        String thumbPath = CHAT_DIR + "/" + thumbName;
                        File thumbDest = new File(storagePath, thumbPath);
                        Thumbnails.of(dest.getAbsoluteFile()).size(200, 200).toFile(thumbDest.getAbsoluteFile());
                        message.setThumbPath(thumbPath);
                    } catch (Exception e) {
                        System.err.println("缩略图生成失败: " + e.getMessage());
                        e.printStackTrace();
                        // Continue without thumbnail
                    }
                } else if ("VIDEO".equals(type)) {
                    try {
                        String thumbName = "thumb_" + filename + ".jpg"; // Ensure jpg extension
                        String thumbPath = CHAT_DIR + "/" + thumbName;
                        File thumbDest = new File(storagePath, thumbPath);
                        
                        // Get first frame
                        org.jcodec.api.FrameGrab grab = org.jcodec.api.FrameGrab.createFrameGrab(org.jcodec.common.io.NIOUtils.readableChannel(dest.getAbsoluteFile()));
                        org.jcodec.common.model.Picture picture = grab.getNativeFrame();
                        java.awt.image.BufferedImage bufferedImage = org.jcodec.scale.AWTUtil.toBufferedImage(picture);
                        
                        // Resize and save
                        Thumbnails.of(bufferedImage).size(200, 200).outputFormat("jpg").toFile(thumbDest.getAbsoluteFile());
                        message.setThumbPath(thumbPath);
                    } catch (Exception e) {
                        System.err.println("视频缩略图生成失败: " + e.getMessage());
                        e.printStackTrace();
                    }
                }
            } catch (IOException e) {
                System.err.println("文件上传失败: " + e.getMessage());
                e.printStackTrace();
                throw new RuntimeException("文件上传失败", e);
            }
        }
        
        chatMessageMapper.insert(message);
        
        // Populate transient fields for immediate display
        if (replyToMessageId != null) {
            ChatMessage replyMsg = chatMessageMapper.findById(replyToMessageId);
            if (replyMsg != null) {
                message.setReplyContent(replyMsg.getContent());
                message.setReplyType(replyMsg.getType());
                com.cloudpan.entity.User replyUser = userMapper.findById(replyMsg.getSenderId());
                if (replyUser != null) {
                    message.setReplySenderUsername(replyUser.getUsername());
                }
            }
        }
        
        return message;
    }

    @Override
    public List<ChatMessage> getHistory(Long userId, Long friendId, Long groupId, int page, int pageSize) {
        int offset = (page - 1) * pageSize;
        return chatMessageMapper.findHistory(userId, friendId, groupId, offset, pageSize);
    }

    @Override
    public List<ChatMessage> pollMessages(Long userId, Long friendId, Long groupId, Long lastMessageId, java.util.Date lastSyncTime) {
        if (lastSyncTime == null) {
            lastSyncTime = new java.util.Date(0); // Default to epoch if null
        }
        return chatMessageMapper.findNewMessages(userId, friendId, groupId, lastMessageId, lastSyncTime);
    }

    @Override
    public void deleteHistory(Long userId, Long friendId) {
        // ... (keep existing implementation)
        // 1. Find all files to delete
        List<ChatMessage> messagesWithFiles = chatMessageMapper.findAllFiles(userId, friendId, null);
        
        // 2. Delete files from disk
        for (ChatMessage msg : messagesWithFiles) {
            if (msg.getFilePath() != null) {
                File file = new File(storagePath, msg.getFilePath());
                if (file.exists()) {
                    file.delete();
                }
            }
            if (msg.getThumbPath() != null) {
                File thumb = new File(storagePath, msg.getThumbPath());
                if (thumb.exists()) {
                    thumb.delete();
                }
            }
        }

        // 3. Delete DB records
        chatMessageMapper.deleteByUsers(userId, friendId);
    }

    @Override
    public File getFile(Long messageId) {
        ChatMessage message = chatMessageMapper.findById(messageId);
        if (message == null || message.getFilePath() == null) return null;
        return new File(storagePath, message.getFilePath());
    }

    @Override
    public File getThumbFile(Long messageId) {
        ChatMessage message = chatMessageMapper.findById(messageId);
        if (message == null || message.getThumbPath() == null) return null;
        return new File(storagePath, message.getThumbPath());
    }
    
    @Override
    public List<ChatMessage> getMediaFiles(Long userId, Long friendId, Long groupId) {
        return chatMessageMapper.findMediaFiles(userId, friendId, groupId);
    }

    @Override
    public com.cloudpan.entity.ChatGroup createGroup(Long ownerId, String name, List<Long> memberIds) {
        com.cloudpan.entity.ChatGroup group = new com.cloudpan.entity.ChatGroup();
        group.setName(name);
        group.setOwnerId(ownerId);
        group.setCreatedAt(new java.util.Date());
        group.setUpdatedAt(new java.util.Date());
        chatGroupMapper.insert(group);
        
        // Add owner
        com.cloudpan.entity.GroupMember owner = new com.cloudpan.entity.GroupMember();
        owner.setGroupId(group.getId());
        owner.setUserId(ownerId);
        owner.setRole("OWNER");
        owner.setJoinedAt(new java.util.Date());
        groupMemberMapper.insert(owner);
        
        // Add members
        if (memberIds != null) {
            for (Long memberId : memberIds) {
                if (memberId.equals(ownerId)) continue;
                com.cloudpan.entity.GroupMember member = new com.cloudpan.entity.GroupMember();
                member.setGroupId(group.getId());
                member.setUserId(memberId);
                member.setRole("MEMBER");
                member.setJoinedAt(new java.util.Date());
                groupMemberMapper.insert(member);
            }
        }
        
        return group;
    }

    @Override
    public com.cloudpan.entity.ChatGroup updateGroup(Long userId, Long groupId, String name, String notice, MultipartFile avatarFile) {
        com.cloudpan.entity.ChatGroup group = chatGroupMapper.findById(groupId);
        if (group == null) throw new RuntimeException("群组不存在");
        if (!group.getOwnerId().equals(userId)) {
            throw new RuntimeException("只有群主可以修改群组信息");
        }
        
        if (name != null) group.setName(name);
        if (notice != null) group.setNotice(notice);
        
        if (avatarFile != null && !avatarFile.isEmpty()) {
            // 1. Delete old avatar if exists
            if (group.getAvatar() != null) {
                File oldAvatar = new File(storagePath + "/avatar/" + group.getAvatar());
                if (oldAvatar.exists()) {
                    oldAvatar.delete();
                }
            }
            
            // 2. Save new avatar
            String filename = UUID.randomUUID().toString() + getFileExtension(avatarFile.getOriginalFilename());
            File avatarDir = new File(storagePath + "/avatar/");
            if (!avatarDir.exists()) avatarDir.mkdirs();
            
            try {
                avatarFile.transferTo(new File(avatarDir, filename).getAbsoluteFile());
                group.setAvatar(filename);
            } catch (IOException e) {
                throw new RuntimeException("头像上传失败", e);
            }
        }
        
        group.setUpdatedAt(new java.util.Date());
        chatGroupMapper.update(group);
        
        return group;
    }

    private String getFileExtension(String filename) {
        if (filename == null) return "";
        int dotIndex = filename.lastIndexOf(".");
        if (dotIndex > 0) {
            return filename.substring(dotIndex);
        }
        return "";
    }

    @Override
    public List<com.cloudpan.entity.ChatGroup> getGroupList(Long userId) {
        return chatGroupMapper.findByUserId(userId);
    }

    @Override
    public com.cloudpan.entity.ChatGroup getGroupDetail(Long groupId) {
        return chatGroupMapper.findById(groupId);
    }

    @Override
    public File getGroupAvatar(Long groupId) {
        com.cloudpan.entity.ChatGroup group = chatGroupMapper.findById(groupId);
        if (group == null || group.getAvatar() == null) {
            return null;
        }
        return new File(storagePath + "/avatar/" + group.getAvatar());
    }

    @Override
    public List<com.cloudpan.entity.GroupMember> getGroupMembers(Long groupId) {
        return groupMemberMapper.findByGroupId(groupId);
    }

    @Override
    public void inviteToGroup(Long groupId, List<Long> userIds) {
        for (Long userId : userIds) {
            // Check if already member
            if (groupMemberMapper.findByGroupIdAndUserId(groupId, userId) != null) continue;
            
            com.cloudpan.entity.GroupMember member = new com.cloudpan.entity.GroupMember();
            member.setGroupId(groupId);
            member.setUserId(userId);
            member.setRole("MEMBER");
            member.setJoinedAt(new java.util.Date());
            groupMemberMapper.insert(member);
        }
    }

    @Override
    public void quitGroup(Long userId, Long groupId) {
        com.cloudpan.entity.ChatGroup group = chatGroupMapper.findById(groupId);
        if (group == null) return;
        if (group.getOwnerId().equals(userId)) {
            throw new RuntimeException("群主不能退出群组");
        }
        groupMemberMapper.deleteByGroupIdAndUserId(groupId, userId);
    }

    @Override
    public void kickMember(Long currentUserId, Long groupId, Long memberId) {
        com.cloudpan.entity.ChatGroup group = chatGroupMapper.findById(groupId);
        if (group == null) return;
        if (!group.getOwnerId().equals(currentUserId)) {
            throw new RuntimeException("只有群主可以踢出群组");
        }
        groupMemberMapper.deleteByGroupIdAndUserId(groupId, memberId);
    }

    @Override
    public void toggleTopGroup(Long userId, Long groupId, Boolean isTop) {
        com.cloudpan.entity.GroupMember member = groupMemberMapper.findByGroupIdAndUserId(groupId, userId);
        if (member == null) throw new RuntimeException("你不在该群组内");
        member.setIsTop(isTop);
        groupMemberMapper.update(member);
    }

    @Override
    public void dissolveGroup(Long userId, Long groupId) {
        com.cloudpan.entity.ChatGroup group = chatGroupMapper.findById(groupId);
        if (group == null) return;
        if (!group.getOwnerId().equals(userId)) {
            throw new RuntimeException("只有群主可以解散群组");
        }
        
        // 1. Find all group files to delete
        List<ChatMessage> messagesWithFiles = chatMessageMapper.findAllFiles(null, null, groupId);
        
        // 2. Delete files from disk
        for (ChatMessage msg : messagesWithFiles) {
            if (msg.getFilePath() != null) {
                File file = new File(storagePath, msg.getFilePath());
                if (file.exists()) {
                    file.delete();
                }
            }
            if (msg.getThumbPath() != null) {
                File thumb = new File(storagePath, msg.getThumbPath());
                if (thumb.exists()) {
                    thumb.delete();
                }
            }
        }
        
        // 3. Delete all messages
        chatMessageMapper.deleteByGroupId(groupId);

        // 4. Delete members and group
        groupMemberMapper.deleteByGroupId(groupId);
        chatGroupMapper.deleteById(groupId);
    }

    @Override
    public void recallMessage(Long userId, Long messageId) {
        ChatMessage message = chatMessageMapper.findById(messageId);
        if (message == null) throw new RuntimeException("消息不存在");
        if (!message.getSenderId().equals(userId)) throw new RuntimeException("不是你的消息");
        
        // Delete physical files
        if (message.getFilePath() != null) {
            new File(storagePath, message.getFilePath()).delete();
        }
        if (message.getThumbPath() != null) {
            new File(storagePath, message.getThumbPath()).delete();
        }
        
        // Soft delete record (update status and content)
        chatMessageMapper.updateRecall(messageId);
    }

    @Override
    public void markAsRead(Long userId, Long friendId) {
        chatMessageMapper.markAsRead(userId, friendId);
    }

    @Override
    public int getTotalUnreadCount(Long userId) {
        return chatMessageMapper.countTotalUnread(userId);
    }

    @Override
    public void markGroupAsRead(Long userId, Long groupId) {
        // Get the latest message ID in the group
        List<ChatMessage> latest = chatMessageMapper.findHistory(null, null, groupId, 0, 1);
        if (latest != null && !latest.isEmpty()) {
            Long lastMsgId = latest.get(0).getId();
            groupMemberMapper.updateLastReadMessageId(groupId, userId, lastMsgId);
        }
    }

    @Override
    public java.util.Map<String, Object> getUnreadCounts(Long userId) {
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        
        // 1. Friend unread count (total)
        int friendUnread = chatMessageMapper.countTotalUnread(userId);
        
        // 2. Group unread count
        int groupUnread = 0;
        List<com.cloudpan.entity.ChatGroup> groups = chatGroupMapper.findByUserId(userId);
        java.util.Map<Long, Integer> groupCounts = new java.util.HashMap<>();
        
        for (com.cloudpan.entity.ChatGroup group : groups) {
            com.cloudpan.entity.GroupMember member = groupMemberMapper.findByGroupIdAndUserId(group.getId(), userId);
            if (member != null) {
                Long lastReadId = member.getLastReadMessageId() != null ? member.getLastReadMessageId() : 0L;
                int count = chatMessageMapper.countGroupUnread(group.getId(), lastReadId, userId);
                if (count > 0) {
                    groupUnread += count;
                    groupCounts.put(group.getId(), count);
                }
            }
        }
        
        result.put("friendUnread", friendUnread);
        result.put("groupUnread", groupUnread);
        result.put("total", friendUnread + groupUnread);
        result.put("groupCounts", groupCounts);
        
        return result;
    }


}
