package com.cloudpan.service;

import com.cloudpan.entity.ShareLink;
import java.util.Date;
import java.util.List;

public interface ShareService {
    ShareLink createShare(Long userId, Long fileId, Integer permission, Date expireTime, String accessCode);
    ShareLink getShareInfo(String shareCode);
    boolean verifyAccessCode(String shareCode, String accessCode);
    List<ShareLink> listMyShares(Long userId);
    void cancelShare(Long userId, Long shareId);
    void increaseDownloadCount(Long shareId);
    ShareLink getShareById(Long shareId);
}
