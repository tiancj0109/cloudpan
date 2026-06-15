import React, { useState, useEffect } from 'react';
import { Modal, Avatar, Button, message, Descriptions, Spin } from 'antd';
import { UserOutlined, UserAddOutlined, CheckOutlined } from '@ant-design/icons';
import api from '../utils/api';

const UserProfileModal = ({ visible, onClose, userId, currentUserId, friends }) => {
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        if (visible && userId) {
            fetchUserInfo();
        } else {
            setUserInfo(null);
        }
    }, [visible, userId]);

    const fetchUserInfo = async () => {
        setLoading(true);
        try {
            // 1. Check if it's current user
            if (userId === currentUserId) {
                const res = await api.get('/auth/info');
                if (res.code === 200) {
                    setUserInfo({ ...res.data, isSelf: true });
                }
                setLoading(false);
                return;
            }

            // 2. Check if it's a friend
            // friends list structure: { friendId, userId, friendUsername, ... }
            // We need to check if the target userId matches friendId (or userId if we are the friendId)
            // The getFriendId helper in FriendChat handles this, but here we have the raw list.
            // Let's assume the friends prop passed from FriendChat is the processed list or we need to match carefully.
            // In FriendChat, friends are fetched from /friend/list.
            // Let's look at FriendChat's getFriendId: return friend.userId === currentUserId ? friend.friendId : friend.userId;

            const friend = friends.find(f => {
                const fid = f.userId === currentUserId ? f.friendId : f.userId;
                return fid === userId;
            });

            if (friend) {
                setUserInfo({
                    id: userId,
                    username: friend.friendUsername,
                    email: friend.friendEmail,
                    role: friend.friendRole,
                    signature: friend.friendSignature,
                    createdAt: friend.friendCreatedAt,
                    isFriend: true
                });
                setLoading(false);
                return;
            }

            // 3. Fetch from search API for non-friends
            const res = await api.get('/auth/search', { params: { keyword: userId.toString() } });
            if (res.code === 200 && res.data.length > 0) {
                const target = res.data.find(u => u.id === userId);
                if (target) {
                    setUserInfo({ ...target, isFriend: false });
                } else {
                    message.error('未找到用户');
                    onClose();
                }
            } else {
                message.error('未找到用户');
                onClose();
            }
        } catch (err) {
            console.error(err);
            message.error('获取用户信息失败');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleAddFriend = async () => {
        setAdding(true);
        try {
            const res = await api.post('/friend/add', { friendId: userId });
            if (res.code === 200) {
                message.success('好友请求已发送');
                onClose();
            } else {
                message.info(res.message);
            }
        } catch (err) {
            message.error('发送请求失败');
        } finally {
            setAdding(false);
        }
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '未知';
        return new Date(timeStr).toLocaleString('zh-CN', { hour12: false });
    };

    const roleMap = {
        'ADMIN': '管理员',
        'USER': '普通用户',
        'VIP': 'VIP会员'
    };

    if (!visible) return null;

    return (
        <Modal
            title="用户信息"
            open={visible}
            onCancel={onClose}
            footer={null}
            centered
            width={400}
            destroyOnClose
        >
            <Spin spinning={loading}>
                {userInfo && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Avatar
                            size={100}
                            src={userInfo.id ? `/cloudpan-api/auth/avatar/${userInfo.id}` : null}
                            icon={<UserOutlined />}
                            style={{ marginBottom: 20, border: '2px solid #f0f0f0', cursor: 'pointer' }}
                            onClick={() => {
                                Modal.info({
                                    title: '头像',
                                    width: 500,
                                    icon: null,
                                    maskClosable: true,
                                    content: (
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <img
                                                src={`/cloudpan-api/auth/avatar/${userInfo.id}`}
                                                alt="Avatar"
                                                style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                                                onError={(e) => { e.target.src = "https://via.placeholder.com/400?text=No+Avatar"; }}
                                            />
                                        </div>
                                    ),
                                    okText: '关闭'
                                });
                            }}
                        />

                        <Descriptions column={1} style={{ width: '100%' }} bordered size="small">
                            <Descriptions.Item label="用户名">{userInfo.username}</Descriptions.Item>
                            <Descriptions.Item label="用户ID">{userInfo.id}</Descriptions.Item>
                            <Descriptions.Item label="个性签名">{userInfo.signature || '骚话吧'}</Descriptions.Item>
                            <Descriptions.Item label="角色">
                                <span style={{
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    background: userInfo.role === 'ADMIN' ? '#ff4d4f' : '#52c41a',
                                    color: 'white',
                                    fontSize: 12
                                }}>
                                    {roleMap[userInfo.role] || userInfo.role}
                                </span>
                            </Descriptions.Item>
                            <Descriptions.Item label="邮箱">{userInfo.email || '未设置'}</Descriptions.Item>
                            <Descriptions.Item label="注册时间">
                                {formatTime(userInfo.createdAt)}
                            </Descriptions.Item>
                        </Descriptions>

                        <div style={{ marginTop: 24, width: '100%' }}>
                            <Button
                                block
                                style={{ marginBottom: 10 }}
                                onClick={() => {
                                    // Navigate to user's moments (we might need a route for specific user moments, e.g. /moments?userId=xxx)
                                    // For now, let's just go to main moments, ideally filtering by user
                                    // But the requirement says "Click avatar to enter THEIR moments"
                                    // So we should probably pass a state or query param
                                    // Let's assume /moments supports ?userId=xxx
                                    window.location.href = `${process.env.PUBLIC_URL}/moments?userId=${userInfo.id}`;
                                }}
                            >
                                查看朋友圈
                            </Button>

                            {userInfo.isSelf ? (
                                <Button block disabled>你自己</Button>
                            ) : userInfo.isFriend ? (
                                <Button block disabled icon={<CheckOutlined />}>已是好友</Button>
                            ) : (
                                <Button
                                    type="primary"
                                    block
                                    icon={<UserAddOutlined />}
                                    onClick={handleAddFriend}
                                    loading={adding}
                                >
                                    添加好友
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Spin>
        </Modal>
    );
};

export default UserProfileModal;
