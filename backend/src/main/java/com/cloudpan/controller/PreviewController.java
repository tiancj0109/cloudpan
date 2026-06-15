package com.cloudpan.controller;

import com.cloudpan.service.PreviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;

@RestController
@RequestMapping("/api/file")
@CrossOrigin
public class PreviewController {

    @Autowired
    private PreviewService previewService;

    @GetMapping("/preview/thumbnail/{fileId}")
    public ResponseEntity<InputStreamResource> getThumbnail(@RequestAttribute("userId") Long userId,
                                                            @PathVariable Long fileId) {
        try {
            InputStream inputStream = previewService.getThumbnail(userId, fileId);
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_JPEG)
                    .body(new InputStreamResource(inputStream));
        } catch (Exception e) {
            // If thumbnail generation fails or not supported, maybe return 404 or a default image?
            // For now 404
            return ResponseEntity.notFound().build();
        }
    }
}
