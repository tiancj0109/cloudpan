package com.cloudpan.service;

import com.cloudpan.entity.Friend;
import java.util.List;

public interface FriendService {
    void sendRequest(Long userId, Long friendId);
    void handleRequest(Long userId, Long friendId, Integer status); // status: 1=Accept, 3=Reject Add, 4=Reject Delete
    void requestDelete(Long userId, Long friendId);
    void confirmDelete(Long userId, Long friendId);
    List<Friend> getFriendList(Long userId);
    List<Friend> getRequests(Long userId);
    List<Friend> getDeleteRequests(Long userId);
    void toggleTop(Long userId, Long friendId, Boolean isTop);
}
