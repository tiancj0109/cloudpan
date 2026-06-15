package com.cloudpan.controller;

import com.cloudpan.entity.RecycleBin;
import com.cloudpan.service.RecycleBinService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recycle")
@CrossOrigin
public class RecycleBinController {

    @Autowired
    private RecycleBinService recycleBinService;

    @GetMapping("/list")
    public Map<String, Object> list(@RequestAttribute("userId") Long userId) {
        List<RecycleBin> list = recycleBinService.listRecycleBin(userId);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("data", list);
        return result;
    }

    @PostMapping("/{recycleId}/restore")
    public Map<String, Object> restore(@RequestAttribute("userId") Long userId,
                                       @PathVariable Long recycleId) {
        recycleBinService.restore(userId, recycleId);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "Restored successfully");
        return result;
    }

    @DeleteMapping("/{recycleId}")
    public Map<String, Object> deletePermanently(@RequestAttribute("userId") Long userId,
                                                 @PathVariable Long recycleId) {
        recycleBinService.deletePermanently(userId, recycleId);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "Deleted permanently");
        return result;
    }
}
