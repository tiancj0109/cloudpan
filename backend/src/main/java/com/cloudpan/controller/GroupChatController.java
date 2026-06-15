package com.cloudpan.controller;

import com.cloudpan.entity.ChatGroup;
import com.cloudpan.entity.ChatMessage;
import com.cloudpan.entity.GroupMember;
import com.cloudpan.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/group")
@CrossOrigin
public class GroupChatController {

    @Autowired
    private ChatService chatService;

    @PostMapping("/create")
    public Map<String, Object> createGroup(@RequestAttribute("userId") Long userId,
                                           @RequestBody Map<String, Object> payload) {
        String name = (String) payload.get("name");
        List<Integer> memberIdsInt = (List<Integer>) payload.get("memberIds");
        
        if (name == null || name.trim().isEmpty()) return error("群名称不能为空");
        
        List<Long> memberIds = null;
        if (memberIdsInt != null) {
            memberIds = memberIdsInt.stream().map(Integer::longValue).collect(java.util.stream.Collectors.toList());
        }
        
        ChatGroup group = chatService.createGroup(userId, name, memberIds);
        return success(group);
    }

    @PostMapping("/update")
    public Map<String, Object> updateGroup(@RequestAttribute("userId") Long userId,
                                           @RequestParam("groupId") Long groupId,
                                           @RequestParam(value = "name", required = false) String name,
                                           @RequestParam(value = "notice", required = false) String notice,
                                           @RequestParam(value = "avatar", required = false) MultipartFile avatar) {
        
        if (name != null && name.trim().isEmpty()) return error("群名称不能为空");
        
        try {
            ChatGroup group = chatService.updateGroup(userId, groupId, name, notice, avatar);
            return success(group);
        } catch (RuntimeException e) {
            return error(e.getMessage());
        }
    }

    @GetMapping("/avatar/{groupId}")
    public ResponseEntity<Resource> getGroupAvatar(@PathVariable Long groupId) throws IOException {
        java.io.File file = chatService.getGroupAvatar(groupId);
        if (file == null || !file.exists()) {
            return ResponseEntity.notFound().build();
        }
        
        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getName() + "\"")
                .body(resource);
    }

    @GetMapping("/list")
    public Map<String, Object> getGroupList(@RequestAttribute("userId") Long userId) {
        List<ChatGroup> list = chatService.getGroupList(userId);
        return success(list);
    }

    @GetMapping("/detail")
    public Map<String, Object> getGroupDetail(@RequestParam("groupId") Long groupId) {
        ChatGroup group = chatService.getGroupDetail(groupId);
        return success(group);
    }

    @GetMapping("/members")
    public Map<String, Object> getGroupMembers(@RequestParam("groupId") Long groupId) {
        List<GroupMember> list = chatService.getGroupMembers(groupId);
        return success(list);
    }

    @PostMapping("/invite")
    public Map<String, Object> inviteToGroup(@RequestBody Map<String, Object> payload) {
        Long groupId = ((Number) payload.get("groupId")).longValue();
        List<Integer> userIdsInt = (List<Integer>) payload.get("userIds");
        
        if (userIdsInt == null || userIdsInt.isEmpty()) return error("请选择用户");
        
        List<Long> userIds = userIdsInt.stream().map(Integer::longValue).collect(java.util.stream.Collectors.toList());
        chatService.inviteToGroup(groupId, userIds);
        return success("邀请成功");
    }

    @PostMapping("/quit")
    public Map<String, Object> quitGroup(@RequestAttribute("userId") Long userId,
                                         @RequestBody Map<String, Long> payload) {
        Long groupId = payload.get("groupId");
        try {
            chatService.quitGroup(userId, groupId);
            return success("已退出群组");
        } catch (RuntimeException e) {
            return error(e.getMessage());
        }
    }

    @PostMapping("/kick")
    public Map<String, Object> kickMember(@RequestAttribute("userId") Long userId,
                                          @RequestBody Map<String, Long> payload) {
        Long groupId = payload.get("groupId");
        Long memberId = payload.get("memberId");
        try {
            chatService.kickMember(userId, groupId, memberId);
            return success("已移除成员");
        } catch (RuntimeException e) {
            return error(e.getMessage());
        }
    }

    @PostMapping("/dissolve")
    public Map<String, Object> dissolveGroup(@RequestAttribute("userId") Long userId,
                                             @RequestBody Map<String, Long> payload) {
        Long groupId = payload.get("groupId");
        try {
            chatService.dissolveGroup(userId, groupId);
            return success("群组已解散");
        } catch (RuntimeException e) {
            return error(e.getMessage());
        }
    }

    @PostMapping("/top")
    public Map<String, Object> toggleTop(@RequestAttribute("userId") Long userId, @RequestBody Map<String, Object> params) {
        Long groupId = Long.valueOf(params.get("groupId").toString());
        Boolean isTop = Boolean.valueOf(params.get("isTop").toString());
        chatService.toggleTopGroup(userId, groupId, isTop);
        return success(isTop ? "已置顶群组" : "已取消群组置顶");
    }

    // Helper for success response
    private Map<String, Object> success(Object data) {
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("data", data);
        return result;
    }

    private Map<String, Object> error(String message) {
        Map<String, Object> result = new HashMap<>();
        result.put("code", 400);
        result.put("message", message);
        return result;
    }
}
