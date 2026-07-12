
package com.cloudpan.mapper;

import com.cloudpan.entity.FileInfo;
import org.apache.ibatis.annotations.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FileInfoMapper {
    int insert(FileInfo fileInfo);
    FileInfo findById(@Param("id") Long id);
    List<FileInfo> findByUserIdAndParentId(@Param("userId") Long userId, @Param("parentId") Long parentId);
    int update(FileInfo fileInfo);
    List<FileInfo> findByParentId(@Param("parentId") Long parentId);
    int deleteById(@Param("id") Long id);
    FileInfo findByUserIdAndParentIdAndName(@Param("userId") Long userId, @Param("parentId") Long parentId, @Param("filename") String filename);
    List<FileInfo> searchByUserIdAndName(@Param("userId") Long userId, @Param("keyword") String keyword);
    Long sumFileSizeByUserId(@Param("userId") Long userId);
    List<FileInfo> findAllFilesByUserId(@Param("userId") Long userId);
}
