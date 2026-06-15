package com.cloudpan.service;

import com.cloudpan.entity.RecycleBin;
import java.util.List;

public interface RecycleBinService {
    void moveToRecycleBin(Long userId, Long fileId);
    void restore(Long userId, Long recycleId);
    void deletePermanently(Long userId, Long recycleId);
    List<RecycleBin> listRecycleBin(Long userId);
}
