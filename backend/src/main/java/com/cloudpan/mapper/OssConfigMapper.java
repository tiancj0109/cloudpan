package com.cloudpan.mapper;

import com.cloudpan.entity.OssConfig;
import org.springframework.stereotype.Repository;

@Repository
public interface OssConfigMapper {
    OssConfig findFirst();
    int insert(OssConfig config);
    int update(OssConfig config);
}
