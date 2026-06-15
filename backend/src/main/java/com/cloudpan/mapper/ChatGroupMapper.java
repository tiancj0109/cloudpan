package com.cloudpan.mapper;

import com.cloudpan.entity.ChatGroup;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface ChatGroupMapper {
    int insert(ChatGroup chatGroup);
    
    ChatGroup findById(Long id);
    
    List<ChatGroup> findByUserId(Long userId);
    
    int update(ChatGroup chatGroup);
    
    int deleteById(Long id);
}
