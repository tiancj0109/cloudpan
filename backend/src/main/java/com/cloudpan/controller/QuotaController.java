package com.cloudpan.controller;

import com.cloudpan.entity.UserStorage;
import com.cloudpan.service.QuotaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/quota")
@CrossOrigin
public class QuotaController {

    @Autowired
    private QuotaService quotaService;

    @GetMapping("/info")
    public Map<String, Object> getStorageInfo(@RequestAttribute("userId") Long userId) {
        UserStorage storage = quotaService.getStorageInfo(userId);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("data", storage);
        return result;
    }
}
