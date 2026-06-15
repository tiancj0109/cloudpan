package com.cloudpan.controller;

import com.cloudpan.entity.Friend;
import com.cloudpan.service.FriendService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/friend")
@CrossOrigin
public class FriendController {

    @Autowired
    private FriendService friendService;

    @PostMapping("/add")
    public Map<String, Object> sendRequest(@RequestAttribute("userId") Long userId, @RequestBody Map<String, Long> params) {
        Long friendId = params.get("friendId");
        friendService.sendRequest(userId, friendId);
        return success("请求已发送");
    }

    @PostMapping("/verify")
    public Map<String, Object> handleRequest(@RequestAttribute("userId") Long userId, @RequestBody Map<String, Object> params) {
        Long friendId = Long.valueOf(params.get("friendId").toString());
        Integer status = Integer.valueOf(params.get("status").toString());
        friendService.handleRequest(userId, friendId, status);
        return success("已处理");
    }

    @PostMapping("/delete")
    public Map<String, Object> requestDelete(@RequestAttribute("userId") Long userId, @RequestBody Map<String, Long> params) {
        Long friendId = params.get("friendId");
        friendService.requestDelete(userId, friendId);
        return success("已申请删除");
    }
    
    @PostMapping("/delete/confirm")
    public Map<String, Object> confirmDelete(@RequestAttribute("userId") Long userId, @RequestBody Map<String, Long> params) {
        Long friendId = params.get("friendId");
        friendService.confirmDelete(userId, friendId);
        return success("已删除");
    }

    @GetMapping("/list")
    public Map<String, Object> getList(@RequestAttribute("userId") Long userId) {
        List<Friend> list = friendService.getFriendList(userId);
        return success(list);
    }

    @GetMapping("/requests")
    public Map<String, Object> getRequests(@RequestAttribute("userId") Long userId) {
        List<Friend> list = friendService.getRequests(userId);
        return success(list);
    }
    
    @GetMapping("/delete/requests")
    public Map<String, Object> getDeleteRequests(@RequestAttribute("userId") Long userId) {
        List<Friend> list = friendService.getDeleteRequests(userId);
        return success(list);
    }

    @PostMapping("/top")
    public Map<String, Object> toggleTop(@RequestAttribute("userId") Long userId, @RequestBody Map<String, Object> params) {
        Long friendId = Long.valueOf(params.get("friendId").toString());
        Boolean isTop = Boolean.valueOf(params.get("isTop").toString());
        friendService.toggleTop(userId, friendId, isTop);
        return success(isTop ? "已置顶" : "已取消置顶");
    }

    private Map<String, Object> success(Object data) {
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        if (data instanceof String) {
            result.put("message", data);
        } else {
            result.put("data", data);
        }
        return result;
    }
}
