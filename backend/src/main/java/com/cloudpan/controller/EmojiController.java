package com.cloudpan.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/emoji")
public class EmojiController {

    @Value("${cloudpan.storage.chat-path}")
    private String storagePath;

    @GetMapping("/list")
    public Map<String, Object> listEmojis() {
        Map<String, Object> result = new HashMap<>();
        Map<String, List<String>> data = new HashMap<>();

        String emojiRootPath = storagePath + File.separator + "emoji";
        File emojiRoot = new File(emojiRootPath);

        if (emojiRoot.exists() && emojiRoot.isDirectory()) {
            File[] categoryDirs = emojiRoot.listFiles(File::isDirectory);
            if (categoryDirs != null) {
                for (File categoryDir : categoryDirs) {
                    String category = categoryDir.getName();
                    List<String> emojis = new ArrayList<>();
                    File[] files = categoryDir.listFiles();
                    if (files != null) {
                        for (File file : files) {
                            if (file.isFile() && isImage(file.getName())) {
                                emojis.add(file.getName());
                            }
                        }
                    }
                    data.put(category, emojis);
                }
            }
        }

        result.put("code", 200);
        result.put("message", "success");
        result.put("data", data);
        return result;
    }

    private boolean isImage(String filename) {
        if (filename.startsWith("._") || filename.startsWith(".")) return false;
        String lower = filename.toLowerCase();
        return lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".gif") || lower.endsWith(".webp");
    }
}
