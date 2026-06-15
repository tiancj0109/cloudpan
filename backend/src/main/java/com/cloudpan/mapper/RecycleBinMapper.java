package com.cloudpan.mapper;

import com.cloudpan.entity.RecycleBin;
import org.apache.ibatis.annotations.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecycleBinMapper {
    int insert(RecycleBin recycleBin);
    List<RecycleBin> findByUserId(@Param("userId") Long userId);
    RecycleBin findById(@Param("id") Long id);
    int deleteById(@Param("id") Long id);
    RecycleBin findByFileId(@Param("fileId") Long fileId);
}
