package com.cloudpan.service;

import com.cloudpan.entity.UserStorage;

public interface QuotaService {
    UserStorage getStorageInfo(Long userId);
    void initQuota(Long userId);
    boolean checkQuota(Long userId, Long fileSize);
    void updateUsedSpace(Long userId, Long delta);
    void updateTotalQuota(Long userId, Long newQuota);
    void recalculateQuota(Long userId);
}
