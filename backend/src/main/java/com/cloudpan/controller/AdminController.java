package com.cloudpan.controller;

import com.cloudpan.service.QuotaService;
import com.cloudpan.service.UserService;
import com.cloudpan.entity.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private QuotaService quotaService;

    @Autowired
    private UserService userService;

    @PostMapping("/quota/update")
    public Map<String, Object> updateQuota(@RequestBody Map<String, Object> payload, 
                                         @RequestAttribute("userId") Long currentUserId) {
        // Check admin permission
        User currentUser = userService.getUserById(currentUserId);
        if (currentUser == null || !"ADMIN".equals(currentUser.getRole())) {
            throw new RuntimeException("Permission denied: Admin only");
        }

        Long targetUserId = Long.valueOf(payload.get("userId").toString());
        Long newQuota = Long.valueOf(payload.get("quota").toString());

        quotaService.updateTotalQuota(targetUserId, newQuota);

        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "Quota updated successfully");
        return result;
    }
}
