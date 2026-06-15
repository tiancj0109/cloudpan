package com.cloudpan.service;

import com.cloudpan.entity.User;

public interface UserService {
    User register(String username, String password, String email);
    String login(String username, String password);
    User getUserById(Long id);
    String updateAvatar(Long userId, org.springframework.web.multipart.MultipartFile file);
    void updatePassword(Long userId, String oldPassword, String newPassword);
    void updateProfile(Long userId, String email, String signature);
}
