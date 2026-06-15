package com.cloudpan.controller;

import com.cloudpan.entity.User;
import com.cloudpan.mapper.UserMapper;
import com.cloudpan.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private UserMapper userMapper;

    @PostMapping("/register")
    public Map<String, Object> register(@RequestBody Map<String, String> params) {
        String username = params.get("username");
        String password = params.get("password");
        String email = params.get("email");
        
        User user = userService.register(username, password, email);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "注册成功");
        result.put("data", user);
        return result;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> params) {
        String username = params.get("username");
        String password = params.get("password");
        
        String token = userService.login(username, password);
        User user = userMapper.findByUsername(username);
        
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "登录成功");
        result.put("token", token);
        result.put("username", user.getUsername());
        return result;
    }
    
    @GetMapping("/info")
    public Map<String, Object> getUserInfo(@RequestAttribute("userId") Long userId) {
        User user = userService.getUserById(userId);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("data", user);
        return result;
    }

    @GetMapping("/search")
    public Map<String, Object> searchUsers(@RequestParam("keyword") String keyword) {
        List<User> users = userMapper.searchUsers(keyword);
        // Desensitize data (hide password)
        users.forEach(u -> u.setPassword(null));
        
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("data", users);
        return result;
    }
    @org.springframework.beans.factory.annotation.Value("${file.storage.path:uploads}")
    private String storagePath;

    @PostMapping("/avatar")
    public Map<String, Object> updateAvatar(@RequestAttribute("userId") Long userId,
                                            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        String path = userService.updateAvatar(userId, file);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "头像已更新");
        result.put("data", path);
        return result;
    }

    @PostMapping("/password")
    public Map<String, Object> updatePassword(@RequestAttribute("userId") Long userId,
                                              @RequestBody Map<String, String> params) {
        String oldPassword = params.get("oldPassword");
        String newPassword = params.get("newPassword");
        userService.updatePassword(userId, oldPassword, newPassword);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "密码已更新");
        return result;
    }

    @PostMapping("/profile")
    public Map<String, Object> updateProfile(@RequestAttribute("userId") Long userId,
                                             @RequestBody Map<String, String> params) {
        String email = params.get("email");
        String signature = params.get("signature");
        userService.updateProfile(userId, email, signature);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "个人信息已更新");
        return result;
    }

    @GetMapping("/avatar/{userId}")
    public org.springframework.http.ResponseEntity<org.springframework.core.io.Resource> getAvatar(@PathVariable Long userId) {
        User user = userService.getUserById(userId);
        if (user == null || user.getAvatar() == null) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }

        java.io.File file = new java.io.File(storagePath, user.getAvatar());
        if (!file.exists()) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }

        org.springframework.core.io.Resource resource = new org.springframework.core.io.FileSystemResource(file);
        return org.springframework.http.ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.IMAGE_JPEG) // Simple assumption, or detect type
                .body(resource);
    }
}
