package com.cloudpan.service.impl;

import com.cloudpan.entity.Friend;
import com.cloudpan.entity.MomentComment;
import com.cloudpan.entity.MomentLike;
import com.cloudpan.entity.Moments;
import com.cloudpan.mapper.FriendMapper;
import com.cloudpan.mapper.MomentsMapper;
import com.cloudpan.service.MomentsService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class MomentsServiceImpl implements MomentsService {

    @Autowired
    private MomentsMapper momentsMapper;

    @Autowired
    private FriendMapper friendMapper;

    @Autowired
    private com.cloudpan.mapper.MomentNotificationMapper momentNotificationMapper;

    @Autowired
    private com.cloudpan.mapper.UserMapper userMapper;

    @Value("${file.storage.path:uploads}")
    private String storagePath;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public List<Moments> getMoments(Long currentUserId, int page, int pageSize, Long targetUserId, Long momentId) {
        int offset = (page - 1) * pageSize;
        
        // Get friend IDs for feed filtering
        List<Long> friendIds = new ArrayList<>();
        if (targetUserId == null && momentId == null) { // Only needed for feed, not for specific user profile or specific moment
            List<Friend> friends = friendMapper.findListByUserId(currentUserId);
            friendIds = friends.stream().map(Friend::getFriendId).collect(Collectors.toList());
            if (friendIds.isEmpty()) {
                friendIds.add(currentUserId);
            }
        }

        List<Moments> moments = momentsMapper.selectMoments(currentUserId, friendIds, targetUserId, momentId, offset, pageSize);

        if (moments.isEmpty()) {
            return moments;
        }

        List<Long> momentIds = moments.stream().map(Moments::getId).collect(Collectors.toList());

        // Fetch likes and comments
        List<MomentLike> likes = momentsMapper.selectLikesByMomentIds(momentIds);
        List<MomentComment> comments = momentsMapper.selectCommentsByMomentIds(momentIds);

        // Map to moments
        for (Moments m : moments) {
            m.setLikes(likes.stream().filter(l -> l.getMomentId().equals(m.getId())).collect(Collectors.toList()));
            m.setComments(comments.stream().filter(c -> c.getMomentId().equals(m.getId())).collect(Collectors.toList()));
        }

        return moments;
    }

    @Override
    @Transactional
    public void publishMoment(Long userId, String content, List<MultipartFile> files, String visibility, List<Long> visibleUserIds) {
        Moments moment = new Moments();
        moment.setUserId(userId);
        moment.setContent(content);
        moment.setVisibility(visibility);

        // Handle files
        List<String> fileNames = new ArrayList<>();
        String mediaType = "NONE";

        if (files != null && !files.isEmpty()) {
            File momentsDir = new File(storagePath, "moments");
            if (!momentsDir.exists()) {
                momentsDir.mkdirs();
            }

            // Determine media type based on first file
            String firstFileContentType = files.get(0).getContentType();
            if (firstFileContentType != null && firstFileContentType.startsWith("video")) {
                mediaType = "VIDEO";
            } else {
                mediaType = "IMAGE";
            }

            for (MultipartFile file : files) {
                String originalFilename = file.getOriginalFilename();
                String ext = originalFilename.substring(originalFilename.lastIndexOf("."));
                String newName = UUID.randomUUID().toString() + ext;
                try {
                    File dest = new File(momentsDir, newName);
                    file.transferTo(dest.getAbsoluteFile());
                    fileNames.add(newName);

                    // Generate thumbnail
                    if ("IMAGE".equals(mediaType)) {
                        try {
                            String thumbName = "thumb_" + newName;
                            File thumbDest = new File(momentsDir, thumbName);
                            Thumbnails.of(dest.getAbsoluteFile()).size(200, 200).toFile(thumbDest.getAbsoluteFile());
                        } catch (Exception e) {
                            System.err.println("图像缩略图生成失败: " + e.getMessage());
                            e.printStackTrace();
                        }
                    } else if ("VIDEO".equals(mediaType)) {
                        try {
                            String thumbName = "thumb_" + newName + ".jpg";
                            File thumbDest = new File(momentsDir, thumbName);
                            
                            // Use FFmpeg to generate thumbnail
                            // Command: ffmpeg -y -i input.mp4 -ss 00:00:01 -frames:v 1 output.jpg
                            List<String> commands = new ArrayList<>();
                            commands.add("ffmpeg");
                            commands.add("-y");
                            commands.add("-i");
                            commands.add(dest.getAbsolutePath());
                            commands.add("-ss");
                            commands.add("1"); // Capture at 1st second
                            commands.add("-frames:v");
                            commands.add("1");
                            commands.add(thumbDest.getAbsolutePath());

                            ProcessBuilder pb = new ProcessBuilder(commands);
                            pb.redirectErrorStream(true); // Merge stdout and stderr
                            
                            Process process = pb.start();
                            
                            // Read output to prevent blocking (optional but good practice)
                            try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(process.getInputStream()))) {
                                String line;
                                while ((line = reader.readLine()) != null) {
                                    // System.out.println(line); // Logging if needed
                                }
                            }
                            
                            int exitCode = process.waitFor();
                            if (exitCode != 0) {
                                System.err.println("FFmpeg execution failed with exit code: " + exitCode);
                            }

                        } catch (Exception e) {
                            System.err.println("视频缩略图生成失败 (FFmpeg): " + e.getMessage());
                            e.printStackTrace();
                        }
                    }

                } catch (IOException e) {
                    throw new RuntimeException("文件上传失败: " + e.getMessage(), e);
                }
            }
        }

        try {
            moment.setMedia(objectMapper.writeValueAsString(fileNames));
        } catch (Exception e) {
            moment.setMedia("[]");
        }
        moment.setMediaType(mediaType);

        momentsMapper.insert(moment);

        // Handle visibility list
        if (("PARTIAL".equals(visibility) || "EXCLUDE".equals(visibility)) && visibleUserIds != null && !visibleUserIds.isEmpty()) {
            momentsMapper.insertVisibility(moment.getId(), visibleUserIds);
        }
    }

    @Override
    public void likeMoment(Long userId, Long momentId) {
        MomentLike like = new MomentLike();
        like.setMomentId(momentId);
        like.setUserId(userId);
        momentsMapper.insertLike(like);

        // Trigger notification
        Moments moment = momentsMapper.selectById(momentId);
        if (moment != null && !moment.getUserId().equals(userId)) {
            com.cloudpan.entity.MomentNotification notification = new com.cloudpan.entity.MomentNotification();
            notification.setUserId(moment.getUserId());
            notification.setSenderId(userId);
            notification.setMomentId(momentId);
            notification.setType("LIKE");
            momentNotificationMapper.insert(notification);
        }
    }

    @Override
    public void unlikeMoment(Long userId, Long momentId) {
        momentsMapper.deleteLike(momentId, userId);
    }

    @Override
    public void commentMoment(Long userId, Long momentId, String content, Long replyToUserId) {
        MomentComment comment = new MomentComment();
        comment.setMomentId(momentId);
        comment.setUserId(userId);
        comment.setContent(content);
        comment.setReplyToUserId(replyToUserId);
        momentsMapper.insertComment(comment);

        // Trigger notification
        Moments moment = momentsMapper.selectById(momentId);
        if (moment != null) {
            // If replying to a specific user
            if (replyToUserId != null && !replyToUserId.equals(userId)) {
                com.cloudpan.entity.MomentNotification notification = new com.cloudpan.entity.MomentNotification();
                notification.setUserId(replyToUserId);
                notification.setSenderId(userId);
                notification.setMomentId(momentId);
                notification.setType("REPLY");
                notification.setContent(content);
                momentNotificationMapper.insert(notification);
            } 
            // If commenting on the moment (and not replying to self, and not author commenting on own post unless replying to someone else)
            else if (!moment.getUserId().equals(userId)) {
                com.cloudpan.entity.MomentNotification notification = new com.cloudpan.entity.MomentNotification();
                notification.setUserId(moment.getUserId());
                notification.setSenderId(userId);
                notification.setMomentId(momentId);
                notification.setType("COMMENT");
                notification.setContent(content);
                momentNotificationMapper.insert(notification);
            }
        }
    }

    @Override
    public File getMomentFile(String fileName) {
        return new File(storagePath + File.separator + "moments", fileName);
    }

    @Override
    @Transactional
    public void deleteMoment(Long userId, Long momentId) {
        Moments moment = momentsMapper.selectById(momentId);
        if (moment == null) {
            throw new RuntimeException("Moment not found");
        }
        if (!moment.getUserId().equals(userId)) {
            throw new RuntimeException("Permission denied");
        }

        // Delete files
        if (moment.getMedia() != null && !"[]".equals(moment.getMedia())) {
            try {
                List<String> files = objectMapper.readValue(moment.getMedia(), new TypeReference<List<String>>() {});
                File momentsDir = new File(storagePath, "moments");
                for (String fileName : files) {
                    File file = new File(momentsDir, fileName);
                    if (file.exists()) {
                        file.delete();
                    }
                    
                    // Delete thumbnail
                    File thumbFile = new File(momentsDir, "thumb_" + fileName);
                    if (thumbFile.exists()) {
                        thumbFile.delete();
                    }
                    // For video thumbnails which have .jpg appended
                    File videoThumbFile = new File(momentsDir, "thumb_" + fileName + ".jpg");
                    if (videoThumbFile.exists()) {
                        videoThumbFile.delete();
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        // Delete related data
        momentsMapper.deleteLikesByMomentId(momentId);
        momentsMapper.deleteCommentsByMomentId(momentId);
        momentsMapper.deleteVisibilityByMomentId(momentId);
        momentNotificationMapper.deleteByMomentId(momentId);

        // Delete from DB
        momentsMapper.deleteById(momentId);
    }

    @Override
    public void deleteComment(Long userId, Long commentId) {
        MomentComment comment = momentsMapper.selectCommentById(commentId);
        if (comment == null) {
            throw new RuntimeException("评论不存在");
        }
        if (!comment.getUserId().equals(userId)) {
            throw new RuntimeException("没有权限删除");
        }
        
        // Delete notification
        // Determine type: if replyToUserId was set, it's REPLY, else COMMENT
        // But we don't have replyToUserId in comment object here directly unless we fetch it or check logic.
        // Actually MomentComment has replyToUserId.
        String type = comment.getReplyToUserId() != null ? "REPLY" : "COMMENT";
        momentNotificationMapper.deleteByAttributes(comment.getMomentId(), userId, type, comment.getContent());

        momentsMapper.deleteCommentById(commentId);
    }

    @Override
    public void updateComment(Long userId, Long commentId, String content) {
        MomentComment comment = momentsMapper.selectCommentById(commentId);
        if (comment == null) {
            throw new RuntimeException("评论不存在");
        }
        if (!comment.getUserId().equals(userId)) {
            throw new RuntimeException("没有权限修改");
        }
        
        String oldContent = comment.getContent();
        momentsMapper.updateComment(commentId, content);
        
        // Update notification
        String type = comment.getReplyToUserId() != null ? "REPLY" : "COMMENT";
        momentNotificationMapper.updateContentByAttributes(comment.getMomentId(), userId, type, oldContent, content);
    }

    @Override
    @Transactional
    public void updateMomentVisibility(Long userId, Long momentId, String visibility, List<Long> visibleUserIds) {
        Moments moment = momentsMapper.selectById(momentId);
        if (moment == null) {
            throw new RuntimeException("动态不存在");
        }
        if (!moment.getUserId().equals(userId)) {
            throw new RuntimeException("没有权限修改");
        }

        // Update visibility in moments table
        momentsMapper.updateVisibility(momentId, visibility);

        // Reset moment_visibility table
        momentsMapper.deleteVisibilityByMomentId(momentId);

        // Insert new visibility records if needed
        if (("PARTIAL".equals(visibility) || "EXCLUDE".equals(visibility)) && visibleUserIds != null && !visibleUserIds.isEmpty()) {
            momentsMapper.insertVisibility(momentId, visibleUserIds);
        }
    }
    @Override
    public List<com.cloudpan.entity.MomentNotification> getNotifications(Long userId) {
        return momentNotificationMapper.selectByUserId(userId);
    }

    @Override
    public Map<String, Object> getUnreadNotificationCount(Long userId) {
        int count = momentNotificationMapper.countUnread(userId);
        Map<String, Object> result = new HashMap<>();
        result.put("count", count);
        if (count > 0) {
            String avatar = momentNotificationMapper.selectLatestUnreadSenderAvatar(userId);
            result.put("latestAvatar", avatar);
        }

        // Count new moments from friends
        com.cloudpan.entity.User user = userMapper.findById(userId);
        java.util.Date lastReadAt = user.getLastMomentsReadAt();
        // If never read, assume all are new? Or none? Let's assume none if null to avoid noise, or maybe a default date.
        // Better: if null, treat as long ago (or just 0 if we want to show all).
        // Let's default to 0 if null for now, or maybe we should set a default when creating user.
        // For existing users, it will be null. Let's use a very old date if null.
        if (lastReadAt == null) {
            // Default to 1970
            lastReadAt = new java.util.Date(0);
        }

        // Get friend IDs
        List<Friend> friends = friendMapper.findListByUserId(userId);
        List<Long> friendIds = friends.stream().map(Friend::getFriendId).collect(Collectors.toList());

        int newMomentsCount = 0;
        if (!friendIds.isEmpty()) {
            newMomentsCount = momentsMapper.countNewMoments(friendIds, userId, lastReadAt);
        }
        result.put("newMomentsCount", newMomentsCount);

        return result;
    }

    @Override
    public void markNotificationsAsRead(Long userId) {
        momentNotificationMapper.markAllAsRead(userId);
    }

    @Override
    public void markMomentsAsRead(Long userId) {
        userMapper.updateLastMomentsReadAt(userId);
    }
}
