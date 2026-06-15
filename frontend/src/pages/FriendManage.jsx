import React, { useState, useEffect } from 'react';
import { Tabs, List, Avatar, Button, Card, Badge, message, Modal, Image, Grid } from 'antd';
import { UserOutlined, CheckOutlined, CloseOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';

const { TabPane } = Tabs;

const FriendManage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const screens = Grid.useBreakpoint();
    const [friends, setFriends] = useState([]);
    const [groups, setGroups] = useState([]);
    const [requests, setRequests] = useState([]);
    const [deleteRequests, setDeleteRequests] = useState([]);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [activeTab, setActiveTab] = useState('1');
    const [selectedFriendId, setSelectedFriendId] = useState(null);
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const payload = JSON.parse(jsonPayload);
                setCurrentUserId(payload.id);
            } catch (e) {
                console.error("Failed to parse token", e);
            }
        }
        fetchFriends();
        fetchGroups();
        fetchRequests();
        fetchDeleteRequests();
    }, []);

    useEffect(() => {
        if (location.state?.activeTab) setActiveTab(location.state.activeTab);
        if (location.state?.groupId) {
            setSelectedGroupId(location.state.groupId);
            setSelectedFriendId(null);
        }
    }, [location]);

    const getFriendId = (item) => {
        if (!currentUserId) return null;
        return item.userId === currentUserId ? item.friendId : item.userId;
    };

    useEffect(() => {
        if (activeTab === '3' && friends.length > 0 && !selectedFriendId && !selectedGroupId && currentUserId) {
            setSelectedFriendId(getFriendId(friends[0]));
        }
    }, [activeTab, friends, currentUserId]);

    useEffect(() => {
        if (activeTab === '3') {
            if (selectedFriendId) fetchMediaFiles(selectedFriendId, 'friend');
            else if (selectedGroupId) fetchMediaFiles(selectedGroupId, 'group');
        }
    }, [selectedFriendId, selectedGroupId, activeTab]);

    const fetchFriends = async () => {
        try {
            const res = await api.get('/friend/list');
            if (res.code === 200) setFriends(res.data);
        } catch (err) { message.error('Failed to load friends'); }
    };

    const fetchGroups = async () => {
        try {
            const res = await api.get('/group/list');
            if (res.code === 200) setGroups(res.data);
        } catch (err) { message.error('Failed to load groups'); }
    };

    const fetchRequests = async () => {
        try {
            const res = await api.get('/friend/requests');
            if (res.code === 200) setRequests(res.data);
        } catch (err) { message.error('Failed to load requests'); }
    };

    const fetchDeleteRequests = async () => {
        try {
            const res = await api.get('/friend/delete/requests');
            if (res.code === 200) setDeleteRequests(res.data);
        } catch (err) { message.error('Failed to load delete requests'); }
    };

    const fetchMediaFiles = async (targetId, type) => {
        try {
            let url = `/chat/media?`;
            if (type === 'friend') url += `friendId=${targetId}`;
            else url += `groupId=${targetId}`;
            const res = await api.get(url);
            if (res.code === 200) setMediaFiles(res.data);
        } catch (err) { message.error('Failed to load media files'); }
    };

    const handleVerify = async (friendId, status) => {
        try {
            const res = await api.post('/friend/verify', { friendId, status });
            if (res.code === 200) {
                message.success('Processed');
                fetchRequests();
                fetchDeleteRequests();
                fetchFriends();
            }
        } catch (err) { message.error('Operation failed'); }
    };

    const handleDeleteRequest = async (friendId) => {
        Modal.confirm({
            title: '申请删除好友',
            content: '确定要申请删除该好友吗？需要对方确认。',
            onOk: async () => {
                try {
                    const res = await api.post('/friend/delete', { friendId });
                    if (res.code === 200) message.success('申请已发送');
                } catch (err) { message.error('发送申请失败'); }
            }
        });
    };

    const handleConfirmDelete = async (friendId) => {
        Modal.confirm({
            title: '确认删除好友',
            content: '这将永久删除所有聊天记录和媒体文件。继续吗？',
            okType: 'danger',
            onOk: async () => {
                try {
                    const res = await api.post('/friend/delete/confirm', { friendId });
                    if (res.code === 200) {
                        message.success('好友已删除');
                        fetchDeleteRequests();
                        fetchFriends();
                    }
                } catch (err) { message.error('Failed to delete'); }
            }
        });
    };

    const getAvatarUrl = (userId) => userId ? `/cloudpan-api/auth/avatar/${userId}` : null;

    return (
        <div style={{ padding: screens.md ? '24px' : '10px' }}>
            <Card title="好友管理" bordered={false} extra={<Button type="primary" onClick={() => navigate('/user-search')}>添加好友</Button>}>
                <Tabs activeKey={activeTab} onChange={setActiveTab}>
                    <TabPane tab="好友列表" key="1">
                        <List
                            itemLayout={screens.xs ? 'vertical' : 'horizontal'}
                            dataSource={friends}
                            renderItem={item => {
                                const friendId = getFriendId(item);
                                return (
                                    <List.Item actions={[
                                        <Button type="link" onClick={() => navigate(`/moments?userId=${friendId}`)}>朋友圈</Button>,
                                        <Button type="link" danger onClick={() => handleDeleteRequest(friendId)}>删除好友</Button>
                                    ]}>
                                        <List.Item.Meta
                                            avatar={<Avatar src={getAvatarUrl(friendId)} icon={<UserOutlined />} />}
                                            title={
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: 'bold' }}>{item.friendUsername}</span>
                                                    <span style={{ fontSize: 12, color: '#999' }}>(ID: {friendId})</span>
                                                    <span style={{ fontSize: 12, padding: '0 6px', borderRadius: 4, background: item.friendRole === 'ADMIN' ? '#f50' : '#87d068', color: '#fff' }}>
                                                        {item.friendRole === 'ADMIN' ? '管理员' : '普通用户'}
                                                    </span>
                                                </div>
                                            }
                                            description={
                                                <div style={{ fontSize: 12, marginTop: 4 }}>
                                                    <div style={{ wordBreak: 'break-all' }}>邮箱: {item.friendEmail || '未设置'}</div>
                                                    <div style={{ wordBreak: 'break-all', color: '#666' }}>签名: {item.friendSignature || '骚话吧'}</div>
                                                    <div>注册时间: {item.friendCreatedAt ? new Date(item.friendCreatedAt).toLocaleString() : '未知'}</div>
                                                </div>
                                            }
                                        />
                                    </List.Item>
                                );
                            }}
                        />
                    </TabPane>
                    <TabPane tab={<Badge count={requests.length + deleteRequests.length} offset={[10, 0]}>好友验证</Badge>} key="2">
                        <h3>加好友申请</h3>
                        <List
                            itemLayout={screens.xs ? 'vertical' : 'horizontal'}
                            dataSource={requests}
                            renderItem={item => {
                                const friendId = getFriendId(item);
                                return (
                                    <List.Item actions={[
                                        <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => handleVerify(friendId, 1)}>同意</Button>,
                                        <Button danger size="small" icon={<CloseOutlined />} onClick={() => handleVerify(friendId, 3)}>拒绝</Button>
                                    ]}>
                                        <List.Item.Meta
                                            avatar={<Avatar src={getAvatarUrl(friendId)} icon={<UserOutlined />} />}
                                            title={`用户 ${item.friendUsername} 请求添加您为好友`}
                                            description={new Date(item.createdAt).toLocaleString()}
                                        />
                                    </List.Item>
                                );
                            }}
                        />
                        <h3 style={{ marginTop: 20 }}>删好友申请</h3>
                        <List
                            itemLayout={screens.xs ? 'vertical' : 'horizontal'}
                            dataSource={deleteRequests}
                            renderItem={item => {
                                const friendId = getFriendId(item);
                                return (
                                    <List.Item actions={[
                                        <Button type="primary" danger size="small" onClick={() => handleConfirmDelete(friendId)}>同意删除</Button>,
                                        <Button size="small" onClick={() => handleVerify(friendId, 4)}>拒绝</Button>
                                    ]}>
                                        <List.Item.Meta
                                            avatar={<Avatar src={getAvatarUrl(friendId)} icon={<UserOutlined />} />}
                                            title={`用户 ${item.friendUsername} 请求删除好友关系`}
                                            description="同意后将删除所有聊天记录和媒体文件"
                                        />
                                    </List.Item>
                                );
                            }}
                        />
                    </TabPane>
                    <TabPane tab="媒体文件" key="3">
                        <div style={{ display: 'flex', marginBottom: 16, flexWrap: 'wrap', gap: '8px' }}>
                            {friends.map(f => {
                                const fId = getFriendId(f);
                                return (
                                    <Button
                                        key={f.id}
                                        type={selectedFriendId === fId ? 'primary' : 'default'}
                                        onClick={() => { setSelectedFriendId(fId); setSelectedGroupId(null); }}
                                    >
                                        {f.friendUsername}
                                    </Button>
                                );
                            })}
                            {groups.map(g => (
                                <Button
                                    key={'g_' + g.id}
                                    type={selectedGroupId === g.id ? 'primary' : 'default'}
                                    onClick={() => { setSelectedGroupId(g.id); setSelectedFriendId(null); }}
                                >
                                    {g.name}
                                </Button>
                            ))}
                        </div>
                        <List
                            grid={screens.xs ? undefined : { gutter: 8, xs: 3, sm: 3, md: 4, lg: 4, xl: 6, xxl: 8 }}
                            dataSource={mediaFiles}
                            renderItem={item => (
                                <List.Item>
                                    {screens.xs ? (
                                        <div style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                                            <div style={{ marginRight: 12, flexShrink: 0 }}>
                                                {item.type === 'IMAGE' ? (
                                                    <Image
                                                        src={`/cloudpan-api/chat/thumb/${item.id}`}
                                                        preview={{ src: `/cloudpan-api/chat/file/${item.id}` }}
                                                        width={80}
                                                        height={80}
                                                        style={{ objectFit: 'cover', borderRadius: 4 }}
                                                    />
                                                ) : (
                                                    <div
                                                        style={{ width: 80, height: 80, background: '#000', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
                                                        onClick={() => {
                                                            Modal.info({
                                                                title: 'Video Preview',
                                                                width: '100%',
                                                                content: <video controls style={{ width: '100%' }} src={`/cloudpan-api/chat/file/${item.id}`} />,
                                                                icon: null,
                                                                maskClosable: true,
                                                                okText: 'Close'
                                                            });
                                                        }}
                                                    >
                                                        <div style={{ fontSize: 20 }}>▶</div>
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{item.senderUsername}</div>
                                                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>{new Date(item.createdAt).toLocaleString()}</div>
                                                <div style={{ fontSize: 12, color: '#999' }}>{(item.fileSize / 1024 / 1024).toFixed(2)} MB</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <Card
                                            hoverable
                                            bodyStyle={{ padding: 0 }}
                                            cover={
                                                item.type === 'IMAGE' ?
                                                    <Image
                                                        alt="example"
                                                        src={`/cloudpan-api/chat/thumb/${item.id}`}
                                                        preview={{
                                                            src: `/cloudpan-api/chat/file/${item.id}`,
                                                        }}
                                                        fallback="https://via.placeholder.com/200?text=Error"
                                                        height={150}
                                                        style={{ objectFit: 'cover', width: '100%' }}
                                                    /> :
                                                    <div
                                                        style={{ height: 150, background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
                                                        onClick={() => {
                                                            Modal.info({
                                                                title: 'Video Preview',
                                                                width: 800,
                                                                content: (
                                                                    <video controls style={{ width: '100%' }} src={`/cloudpan-api/chat/file/${item.id}`} />
                                                                ),
                                                                icon: null,
                                                                maskClosable: true,
                                                                okText: 'Close'
                                                            });
                                                        }}
                                                    >
                                                        <img
                                                            src={`/cloudpan-api/chat/thumb/${item.id}`}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, opacity: 0.6 }}
                                                            onError={(e) => { e.target.style.display = 'none'; }}
                                                        />
                                                        <div style={{ zIndex: 1, textAlign: 'center' }}>
                                                            <div style={{ fontSize: 24 }}>▶</div>
                                                            <div>VIDEO</div>
                                                        </div>
                                                    </div>
                                            }
                                        >
                                            <Card.Meta
                                                title={<div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.senderUsername}</div>}
                                                description={
                                                    <div style={{ fontSize: 10 }}>
                                                        <div>{new Date(item.createdAt).toLocaleDateString()}</div>
                                                    </div>
                                                }
                                                style={{ padding: 8 }}
                                            />
                                        </Card>
                                    )}
                                </List.Item>
                            )}
                        />
                    </TabPane>
                </Tabs>
            </Card>
        </div>
    );
};

export default FriendManage;
