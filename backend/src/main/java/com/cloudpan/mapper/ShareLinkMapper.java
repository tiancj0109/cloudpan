package com.cloudpan.mapper;

import com.cloudpan.entity.ShareLink;
import org.apache.ibatis.annotations.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShareLinkMapper {
    int insert(ShareLink shareLink);
    ShareLink findByShareCode(@Param("shareCode") String shareCode);
    List<ShareLink> findByUserId(@Param("userId") Long userId);
    int deleteById(@Param("id") Long id);
    int incrementVisitCount(@Param("id") Long id);
    int incrementDownloadCount(@Param("id") Long id);
    ShareLink findById(@Param("id") Long id);
}
