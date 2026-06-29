package com.cloudpan.controller;

import com.cloudpan.entity.ChatMessage;
import com.cloudpan.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin
public class ChatController {

    @Autowired
    private ChatService chatService;
    
    @Value("${cloudpan.storage.chat-path}")
    private String storagePath;

    @PostMapping("/send")
    public Map<String, Object> sendMessage(@RequestAttribute("userId") Long userId,
                                           @RequestParam(value = "receiverId", required = false) Long receiverId,
                                           @RequestParam(value = "groupId", required = false) Long groupId,
                                           @RequestParam("type") String type,
                                           @RequestParam(value = "content", required = false) String content,
                                           @RequestParam(value = "file", required = false) MultipartFile file,
                                           @RequestParam(value = "duration", required = false) Integer duration,
                                           @RequestParam(value = "replyToMessageId", required = false) Long replyToMessageId) {
        
        if (receiverId == null && groupId == null) {
            return error("接收者或群组不能为空");
        }
        
        // Validation
        if ("TEXT".equals(type)) {
            if (content != null && content.length() > 20000) {
                return error("消息内容不能超过20000字");
            }
        } else if (file != null) {
            long size = file.getSize();
            if ("IMAGE".equals(type) && size > 10 * 1024 * 1024) {
                return error("图片大小不能超过10MB");
            } else if ("VIDEO".equals(type) && size > 1024 * 1024 * 1024) {
                return error("视频大小不能超过1GB");
            } else if ("AUDIO".equals(type) && size > 10 * 1024 * 1024) {
                return error("语音大小不能超过10MB");
            } else if ("FILE".equals(type) && size > 1024 * 1024 * 1024) {
                return error("文件大小不能超过1GB");
            }
        }

        ChatMessage message = chatService.sendMessage(userId, receiverId, groupId, content, type, file, duration, replyToMessageId);

        return success(message);
    }

    @PostMapping("/recall")
    public Map<String, Object> recallMessage(@RequestAttribute("userId") Long userId,
                                             @RequestBody Map<String, Long> payload) {
        Long messageId = payload.get("messageId");
        if (messageId == null) return error("缺少消息ID");
        
        try {
            chatService.recallMessage(userId, messageId);
            return success("撤回成功");
        } catch (RuntimeException e) {
            return error(e.getMessage());
        }
    }

    @PostMapping("/markRead")
    public Map<String, Object> markAsRead(@RequestAttribute("userId") Long userId,
                                          @RequestBody Map<String, Long> payload) {
        Long friendId = payload.get("friendId");
        if (friendId == null) return error("缺少好友ID");
        
        chatService.markAsRead(userId, friendId);
        return success("已标记为已读");
    }
    
    private Map<String, Object> error(String message) {
        Map<String, Object> result = new HashMap<>();
        result.put("code", 400);
        result.put("message", message);
        return result;
    }

    @GetMapping("/history")
    public Map<String, Object> getHistory(@RequestAttribute("userId") Long userId,
                                          @RequestParam(value = "friendId", required = false) Long friendId,
                                          @RequestParam(value = "groupId", required = false) Long groupId,
                                          @RequestParam(value = "page", defaultValue = "1") int page,
                                          @RequestParam(value = "pageSize", defaultValue = "20") int pageSize) {
        List<ChatMessage> list = chatService.getHistory(userId, friendId, groupId, page, pageSize);
        return success(list);
    }

    @GetMapping("/poll")
    public Map<String, Object> pollMessages(@RequestAttribute("userId") Long userId,
                                            @RequestParam(value = "friendId", required = false) Long friendId,
                                            @RequestParam(value = "groupId", required = false) Long groupId,
                                            @RequestParam("lastMessageId") Long lastMessageId,
                                            @RequestParam(value = "lastSyncTime", required = false) Long lastSyncTimeMillis) {
        java.util.Date lastSyncTime = lastSyncTimeMillis != null ? new java.util.Date(lastSyncTimeMillis) : null;
        List<ChatMessage> list = chatService.pollMessages(userId, friendId, groupId, lastMessageId, lastSyncTime);
        return success(list);
    }
    
    @GetMapping("/media")
    public Map<String, Object> getMediaFiles(@RequestAttribute("userId") Long userId,
                                             @RequestParam(value = "friendId", required = false) Long friendId,
                                             @RequestParam(value = "groupId", required = false) Long groupId) {
        List<ChatMessage> list = chatService.getMediaFiles(userId, friendId, groupId);
        return success(list);
    }

    @GetMapping("/files")
    public Map<String, Object> getFiles(@RequestAttribute("userId") Long userId,
                                        @RequestParam(value = "friendId", required = false) Long friendId,
                                        @RequestParam(value = "groupId", required = false) Long groupId) {
        List<ChatMessage> list = chatService.getAllFiles(userId, friendId, groupId);
        return success(list);
    }

    @GetMapping("/search")
    public Map<String, Object> searchHistory(@RequestAttribute("userId") Long userId,
                                             @RequestParam(value = "friendId", required = false) Long friendId,
                                             @RequestParam(value = "groupId", required = false) Long groupId,
                                             @RequestParam("keyword") String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return success(new java.util.ArrayList<>());
        }
        List<ChatMessage> list = chatService.searchHistory(userId, friendId, groupId, keyword);
        return success(list);
    }

    @GetMapping("/searchAll")
    public Map<String, Object> searchAll(@RequestAttribute("userId") Long userId,
                                         @RequestParam("keyword") String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return success(new java.util.ArrayList<>());
        }
        List<ChatMessage> list = chatService.searchAll(userId, keyword);
        return success(list);
    }

    @GetMapping("/unreadCount")
    public Map<String, Object> getTotalUnreadCount(@RequestAttribute("userId") Long userId) {
        int count = chatService.getTotalUnreadCount(userId);
        return success(count);
    }
    
    @GetMapping("/unreadCounts")
    public Map<String, Object> getUnreadCounts(@RequestAttribute("userId") Long userId) {
        Map<String, Object> counts = chatService.getUnreadCounts(userId);
        return success(counts);
    }

    @PostMapping("/markGroupRead")
    public Map<String, Object> markGroupAsRead(@RequestAttribute("userId") Long userId,
                                               @RequestBody Map<String, Long> payload) {
        Long groupId = payload.get("groupId");
        if (groupId == null) return error("缺少群组ID");
        
        chatService.markGroupAsRead(userId, groupId);
        return success("已标记为已读");
    }

    @GetMapping("/file/{messageId}")
    public ResponseEntity<Resource> getFile(@PathVariable Long messageId, @RequestHeader HttpHeaders headers) throws IOException {
        File file = chatService.getFile(messageId);
        if (file == null || !file.exists()) {
            return ResponseEntity.notFound().build();
        }
        
        Resource resource = new FileSystemResource(file);
        String mediaType = "application/octet-stream";
        String filename = file.getName().toLowerCase();
        if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) mediaType = "image/jpeg";
        else if (filename.endsWith(".png")) mediaType = "image/png";
        else if (filename.endsWith(".gif")) mediaType = "image/gif";
        else if (filename.endsWith(".mp4")) mediaType = "video/mp4";
        else if (filename.endsWith(".mp3")) mediaType = "audio/mpeg";
        else if (filename.endsWith(".wav")) mediaType = "audio/wav";
        
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(mediaType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getName() + "\"")
                .body(resource);
    }

    @GetMapping("/thumb/{messageId}")
    public ResponseEntity<Resource> getThumbnail(@PathVariable Long messageId) throws IOException {
        File file = chatService.getThumbFile(messageId);
        if (file == null || !file.exists()) {
            // Fallback to original file if thumb doesn't exist (e.g. old images)
            // Or return 404. Let's return 404 so frontend can handle fallback or show default icon.
            // Actually for user experience, if it's an image, maybe return original? 
            // But user wants "thumbnails only" for list. 
            // Let's return 404, frontend will handle fallback.
            return ResponseEntity.notFound().build();
        }
        
        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG) // Thumbnails are always JPG/PNG
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getName() + "\"")
                .body(resource);
    }
    
    // Helper for success response
    private Map<String, Object> success(Object data) {
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("data", data);
        return result;
    }
}
