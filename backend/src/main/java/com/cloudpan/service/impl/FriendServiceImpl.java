package com.cloudpan.service.impl;

import com.cloudpan.entity.Friend;
import com.cloudpan.mapper.FriendMapper;
import com.cloudpan.service.ChatService;
import com.cloudpan.service.FriendService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class FriendServiceImpl implements FriendService {

    @Autowired
    private FriendMapper friendMapper;

    @Autowired
    private ChatService chatService;

    @Override
    public void sendRequest(Long userId, Long friendId) {
        if (userId.equals(friendId)) throw new RuntimeException("不能添加自己");
        
        Friend existing = friendMapper.findByUsers(userId, friendId);
        if (existing != null) {
            if (existing.getStatus() == 1) throw new RuntimeException("已经是好友");
            if (existing.getStatus() == 0) throw new RuntimeException("请求已发送");
            // If status is 2 (Delete Requested), reset to 0? Or handle differently. 
            // For simplicity, if record exists, update it.
            existing.setStatus(0);
            existing.setActionUserId(userId);
            friendMapper.update(existing);
        } else {
            Friend friend = new Friend();
            friend.setUserId(userId);
            friend.setFriendId(friendId);
            friend.setStatus(0);
            friend.setActionUserId(userId);
            friendMapper.insert(friend);
        }
    }

    @Override
    public void handleRequest(Long userId, Long friendId, Integer status) {
        Friend friend = friendMapper.findByUsers(userId, friendId);
        if (friend == null) throw new RuntimeException("好友请求不存在");
        
        // status: 1=Accept Add, 3=Reject Add (Delete record), 4=Reject Delete (Reset to 1)
        if (status == 1) {
            friend.setStatus(1);
            friend.setActionUserId(userId);
            friendMapper.update(friend);
        } else if (status == 3) {
            friendMapper.delete(userId, friendId);
        } else if (status == 4) {
            friend.setStatus(1); // Reset to accepted
            friend.setActionUserId(userId);
            friendMapper.update(friend);
        }
    }

    @Override
    public void requestDelete(Long userId, Long friendId) {
        Friend friend = friendMapper.findByUsers(userId, friendId);
        if (friend == null || friend.getStatus() != 1) throw new RuntimeException("不是好友");
        
        friend.setStatus(2);
        friend.setActionUserId(userId);
        friendMapper.update(friend);
    }

    @Override
    @Transactional
    public void confirmDelete(Long userId, Long friendId) {
        Friend friend = friendMapper.findByUsers(userId, friendId);
        if (friend == null) throw new RuntimeException("好友记录不存在");
        
        // 1. Delete chat history and files
        chatService.deleteHistory(userId, friendId);
        
        // 2. Delete friend record
        friendMapper.delete(userId, friendId);
    }

    @Override
    public List<Friend> getFriendList(Long userId) {
        return friendMapper.findListByUserId(userId);
    }

    @Override
    public List<Friend> getRequests(Long userId) {
        return friendMapper.findRequestsByUserId(userId);
    }
    
    @Override
    public List<Friend> getDeleteRequests(Long userId) {
        return friendMapper.findDeleteRequestsByUserId(userId);
    }

    @Override
    public void toggleTop(Long userId, Long friendId, Boolean isTop) {
        Friend friend = friendMapper.findByUsers(userId, friendId);
        if (friend == null) throw new RuntimeException("好友记录不存在");
        friend.setIsTop(isTop);
        friendMapper.update(friend);
    }
}
