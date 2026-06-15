package com.cloudpan.entity;

import lombok.Data;
import java.util.Date;

@Data
public class UserStorage {
    private Long userId;
    private Long totalQuota;
    private Long usedSpace;
    private Date updatedAt;

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getTotalQuota() { return totalQuota; }
    public void setTotalQuota(Long totalQuota) { this.totalQuota = totalQuota; }
    public Long getUsedSpace() { return usedSpace; }
    public void setUsedSpace(Long usedSpace) { this.usedSpace = usedSpace; }
    public Date getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Date updatedAt) { this.updatedAt = updatedAt; }
}
