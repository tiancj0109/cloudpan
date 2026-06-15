package com.cloudpan.controller;

import com.cloudpan.entity.Moments;
import com.cloudpan.service.MomentsService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/moments")
@CrossOrigin
public class MomentsController {

    @Autowired
    private MomentsService momentsService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping("/list")
    public Map<String, Object> list(@RequestAttribute("userId") Long userId,
                                    @RequestParam(value = "page", defaultValue = "1") int page,
                                    @RequestParam(value = "pageSize", defaultValue = "10") int pageSize,
                                    @RequestParam(value = "userId", required = false) Long targetUserId,
                                    @RequestParam(value = "momentId", required = false) Long momentId) {
        List<Moments> moments = momentsService.getMoments(userId, page, pageSize, targetUserId, momentId);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("data", moments);
        return result;
    }

    @PostMapping("/publish")
    public Map<String, Object> publish(@RequestAttribute("userId") Long userId,
                                       @RequestParam(value = "content", required = false) String content,
                                       @RequestParam(value = "files", required = false) List<MultipartFile> files,
                                       @RequestParam("visibility") String visibility,
                                       @RequestParam(value = "visibleUserIds", required = false) String visibleUserIdsJson) {
        
        List<Long> visibleUserIds = new ArrayList<>();
        if (visibleUserIdsJson != null && !visibleUserIdsJson.isEmpty()) {
            try {
                visibleUserIds = objectMapper.readValue(visibleUserIdsJson, new TypeReference<List<Long>>() {});
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        momentsService.publishMoment(userId, content, files, visibility, visibleUserIds);

        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "发布成功");
        return result;
    }

    @PostMapping("/like")
    public Map<String, Object> like(@RequestAttribute("userId") Long userId,
                                    @RequestBody Map<String, Long> params) {
        Long momentId = params.get("momentId");
        momentsService.likeMoment(userId, momentId);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "点赞成功");
        return result;
    }

    @PostMapping("/unlike")
    public Map<String, Object> unlike(@RequestAttribute("userId") Long userId,
                                      @RequestBody Map<String, Long> params) {
        Long momentId = params.get("momentId");
        momentsService.unlikeMoment(userId, momentId);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "取消点赞成功");
        return result;
    }

    @PostMapping("/comment")
    public Map<String, Object> comment(@RequestAttribute("userId") Long userId,
                                       @RequestBody Map<String, Object> params) {
        Long momentId = Long.valueOf(params.get("momentId").toString());
        String content = (String) params.get("content");
        Long replyToUserId = params.get("replyToUserId") != null ? Long.valueOf(params.get("replyToUserId").toString()) : null;

        momentsService.commentMoment(userId, momentId, content, replyToUserId);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "评论成功");
        return result;
    }

    @PostMapping("/comment/delete")
    public Map<String, Object> deleteComment(@RequestAttribute("userId") Long userId,
                                             @RequestBody Map<String, Long> params) {
        Long commentId = params.get("commentId");
        momentsService.deleteComment(userId, commentId);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "删除评论成功");
        return result;
    }

    @PostMapping("/comment/update")
    public Map<String, Object> updateComment(@RequestAttribute("userId") Long userId,
                                             @RequestBody Map<String, Object> params) {
        Long commentId = Long.valueOf(params.get("commentId").toString());
        String content = (String) params.get("content");
        momentsService.updateComment(userId, commentId, content);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "修改评论成功");
        return result;
    }

    @PostMapping("/updateVisibility")
    public Map<String, Object> updateVisibility(@RequestAttribute("userId") Long userId,
                                                @RequestBody Map<String, Object> params) {
        Long momentId = Long.valueOf(params.get("momentId").toString());
        String visibility = (String) params.get("visibility");
        String visibleUserIdsJson = (String) params.get("visibleUserIds");
        
        List<Long> visibleUserIds = new ArrayList<>();
        if (visibleUserIdsJson != null && !visibleUserIdsJson.isEmpty()) {
            try {
                visibleUserIds = objectMapper.readValue(visibleUserIdsJson, new TypeReference<List<Long>>() {});
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        momentsService.updateMomentVisibility(userId, momentId, visibility, visibleUserIds);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "修改权限成功");
        return result;
    }

    @PostMapping("/delete")
    public Map<String, Object> delete(@RequestAttribute("userId") Long userId,
                                      @RequestBody Map<String, Long> params) {
        Long momentId = params.get("momentId");
        momentsService.deleteMoment(userId, momentId);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "删除成功");
        return result;
    }

    @GetMapping("/file/{fileName}")
    public ResponseEntity<Resource> getFile(@PathVariable String fileName) {
        File file = momentsService.getMomentFile(fileName);
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }
        
        // Determine content type (simplified)
        String contentType = "application/octet-stream";
        if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) contentType = "image/jpeg";
        else if (fileName.endsWith(".png")) contentType = "image/png";
        else if (fileName.endsWith(".mp4")) contentType = "video/mp4";

        try {
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(file.toURI());
            if (resource.exists() || resource.isReadable()) {
                return ResponseEntity.ok()
                        .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/notifications")
    public Map<String, Object> getNotifications(@RequestAttribute("userId") Long userId) {
        List<com.cloudpan.entity.MomentNotification> notifications = momentsService.getNotifications(userId);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("data", notifications);
        return result;
    }

    @GetMapping("/notifications/unreadCount")
    public Map<String, Object> getUnreadNotificationCount(@RequestAttribute("userId") Long userId) {
        Map<String, Object> data = momentsService.getUnreadNotificationCount(userId);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("data", data);
        return result;
    }

    @PostMapping("/read")
    public Map<String, Object> markMomentsAsRead(@RequestAttribute("userId") Long userId) {
        momentsService.markMomentsAsRead(userId);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("msg", "Marked moments as read");
        return result;
    }

    @PostMapping("/notifications/read")
    public Map<String, Object> markNotificationsRead(@RequestAttribute("userId") Long userId) {
        momentsService.markNotificationsAsRead(userId);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "已标记为已读");
        return result;
    }
}
