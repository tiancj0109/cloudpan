package com.cloudpan.service.impl;

import com.cloudpan.entity.User;
import com.cloudpan.mapper.UserMapper;
import com.cloudpan.service.UserService;
import com.cloudpan.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.DigestUtils;

@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private JwtUtil jwtUtil;

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

    private String getFileExtension(String filename) {
        if (filename == null) return "";
        int dotIndex = filename.lastIndexOf(".");
        return dotIndex >= 0 ? filename.substring(dotIndex) : "";
    }
}
