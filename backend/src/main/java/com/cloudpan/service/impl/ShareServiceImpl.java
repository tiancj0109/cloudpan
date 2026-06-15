package com.cloudpan.service.impl;

import com.cloudpan.entity.ShareLink;
import com.cloudpan.mapper.ShareLinkMapper;
import com.cloudpan.service.ShareService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;
import java.util.UUID;

@Service
public class ShareServiceImpl implements ShareService {

    @Autowired
    private ShareLinkMapper shareLinkMapper;

    @Override
    public ShareLink createShare(Long userId, Long fileId, Integer permission, Date expireTime, String accessCode) {
        ShareLink shareLink = new ShareLink();
        shareLink.setUserId(userId);
        shareLink.setFileId(fileId);
        shareLink.setShareCode(UUID.randomUUID().toString().replace("-", "").substring(0, 10));
        shareLink.setAccessCode(accessCode);
        shareLink.setPermission(permission);
        shareLink.setExpireTime(expireTime);
        
        shareLinkMapper.insert(shareLink);
        return shareLink;
    }

    @Override
    public ShareLink getShareInfo(String shareCode) {
        ShareLink shareLink = shareLinkMapper.findByShareCode(shareCode);
        if (shareLink != null) {
            shareLinkMapper.incrementVisitCount(shareLink.getId());
        }
        return shareLink;
    }

    @Override
    public boolean verifyAccessCode(String shareCode, String accessCode) {
        ShareLink shareLink = shareLinkMapper.findByShareCode(shareCode);
        if (shareLink == null) return false;
        if (shareLink.getAccessCode() == null || shareLink.getAccessCode().isEmpty()) return true;
        return shareLink.getAccessCode().equals(accessCode);
    }

    @Override
    public List<ShareLink> listMyShares(Long userId) {
        return shareLinkMapper.findByUserId(userId);
    }

    @Override
    public void cancelShare(Long userId, Long shareId) {
        // Ideally check ownership
        shareLinkMapper.deleteById(shareId);
    }

    @Override
    public void increaseDownloadCount(Long shareId) {
        shareLinkMapper.incrementDownloadCount(shareId);
    }

    @Override
    public ShareLink getShareById(Long shareId) {
        return shareLinkMapper.findById(shareId);
    }
}
