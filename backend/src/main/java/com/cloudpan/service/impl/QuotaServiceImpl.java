package com.cloudpan.service.impl;

import com.cloudpan.entity.UserStorage;
import com.cloudpan.mapper.UserStorageMapper;
import com.cloudpan.service.QuotaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class QuotaServiceImpl implements QuotaService {

    @Autowired
    private UserStorageMapper userStorageMapper;

    @Override
    public UserStorage getStorageInfo(Long userId) {
        UserStorage storage = userStorageMapper.findByUserId(userId);
        if (storage == null) {
            initQuota(userId);
            storage = userStorageMapper.findByUserId(userId);
        }
        return storage;
    }

    @Override
    @Transactional
    public void initQuota(Long userId) {
        UserStorage storage = new UserStorage();
        storage.setUserId(userId);
        storage.setTotalQuota(1024L * 1024 * 1024); // 1GB default
        storage.setUsedSpace(0L);
        userStorageMapper.insert(storage);
    }

    @Override
    public boolean checkQuota(Long userId, Long fileSize) {
        UserStorage storage = getStorageInfo(userId);
        return (storage.getUsedSpace() + fileSize) <= storage.getTotalQuota();
    }

    @Override
    public void updateUsedSpace(Long userId, Long delta) {
        userStorageMapper.updateUsedSpace(userId, delta);
    }

    @Override
    public void updateTotalQuota(Long userId, Long newQuota) {
        userStorageMapper.updateTotalQuota(userId, newQuota);
    }

    @Autowired
    private com.cloudpan.mapper.FileInfoMapper fileInfoMapper;

    @Override
    @Transactional
    public void recalculateQuota(Long userId) {
        Long totalSize = fileInfoMapper.sumFileSizeByUserId(userId);
        if (totalSize == null) {
            totalSize = 0L;
        }
        userStorageMapper.setUsedSpace(userId, totalSize);
    }
}
