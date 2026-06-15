import React, { useState } from 'react';
import { Input, Table, Card, Avatar, Button, message, Modal, Grid, List } from 'antd';
import { SearchOutlined, UserOutlined } from '@ant-design/icons';
import api from '../utils/api';
import moment from 'moment';

const UserSearch = () => {
    const [currentUserRole, setCurrentUserRole] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [targetUserId, setTargetUserId] = useState(null);
    const [newQuota, setNewQuota] = useState(1); // Default 1GB

    const [keyword, setKeyword] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const payload = JSON.parse(jsonPayload);
                setCurrentUserRole(payload.role);
            } catch (e) {
                console.error("解析token失败", e);
            }
        }
    }, []);

    const handleSearch = async () => {
        if (!keyword.trim()) {
            message.warning('请输入搜索关键字');
            return;
        }
        setLoading(true);
        try {
            const res = await api.get('/auth/search', { params: { keyword } });
            if (res.code === 200) {
                setUsers(res.data);
                if (res.data.length === 0) {
                    message.info('未找到匹配的用户');
                }
            }
        } catch (error) {
            console.error(error);
            message.error('搜索失败');
        } finally {
            setLoading(false);
        }
    };

    const openQuotaModal = (userId) => {
        setTargetUserId(userId);
        setNewQuota(1);
        setIsModalVisible(true);
    };

    const handleUpdateQuota = async () => {
        if (!targetUserId) return;
        try {
            const quotaBytes = newQuota * 1024 * 1024 * 1024;
            await api.post('/admin/quota/update', { userId: targetUserId, quota: quotaBytes });
            message.success('配额更新成功');
            setIsModalVisible(false);
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddFriend = async (friendId) => {
        try {
            const res = await api.post('/friend/add', { friendId });
            if (res.code === 200) {
                message.success('好友请求已发送');
            } else {
                message.info(res.message);
            }
        } catch (err) {
            message.error('发送好友请求失败');
        }
    };

    const columns = [
        {
            title: '头像',
            dataIndex: 'avatar',
            key: 'avatar',
            render: (avatar, record) => (
                <Avatar
                    src={avatar ? `/cloudpan-api/auth/avatar/${record.id}` : null}
                    icon={<UserOutlined />}
                />
            ),
        },
        {
            title: '用户ID',
            dataIndex: 'id',
            key: 'id',
        },
        {
            title: '用户名',
            dataIndex: 'username',
            key: 'username',
        },
        {
            title: '邮箱',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: '注册时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => moment(date).format('YYYY-MM-DD HH:mm'),
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status) => status === 1 ? <span style={{ color: 'green' }}>正常</span> : <span style={{ color: 'red' }}>禁用</span>,
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    {currentUserRole === 'ADMIN' && (
                        <Button type="link" onClick={() => openQuotaModal(record.id)}>修改配额</Button>
                    )}
                    <Button type="primary" size="small" onClick={() => handleAddFriend(record.id)}>加好友</Button>
                </div>
            ),
        },
    ];

    const screens = Grid.useBreakpoint();

    return (
        <div>
            <h2>用户搜索</h2>
            <Card style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                    <Input
                        placeholder="输入ID、用户名或邮箱搜索"
                        value={keyword}
                        onChange={e => setKeyword(e.target.value)}
                        onPressEnter={handleSearch}
                        style={{ width: screens.md ? 300 : '100%' }}
                        prefix={<SearchOutlined />}
                    />
                    <Button type="primary" onClick={handleSearch} loading={loading}>搜索</Button>
                </div>
            </Card>

            {!screens.md ? (
                <List
                    dataSource={users}
                    loading={loading}
                    renderItem={item => (
                        <List.Item
                            actions={[
                                currentUserRole === 'ADMIN' && <Button type="link" onClick={() => openQuotaModal(item.id)}>修改配额</Button>,
                                <Button type="primary" size="small" onClick={() => handleAddFriend(item.id)}>加好友</Button>
                            ].filter(Boolean)}
                        >
                            <List.Item.Meta
                                avatar={<Avatar src={item.avatar ? `/cloudpan-api/auth/avatar/${item.id}` : null} icon={<UserOutlined />} />}
                                title={item.username}
                                description={
                                    <div style={{ fontSize: '12px' }}>
                                        <div>ID: {item.id}</div>
                                        <div>邮箱: {item.email}</div>
                                        <div>注册: {moment(item.createdAt).format('YYYY-MM-DD')}</div>
                                        <div>状态: {item.status === 1 ? <span style={{ color: 'green' }}>正常</span> : <span style={{ color: 'red' }}>禁用</span>}</div>
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            ) : (
                <Table
                    columns={columns}
                    dataSource={users}
                    rowKey="id"
                    loading={loading}
                />
            )}

            <Modal
                title="修改用户存储配额"
                open={isModalVisible}
                onOk={handleUpdateQuota}
                onCancel={() => setIsModalVisible(false)}
            >
                <p>请输入新的配额大小 (GB):</p>
                <Input
                    type="number"
                    value={newQuota}
                    onChange={e => setNewQuota(e.target.value)}
                    addonAfter="GB"
                />
            </Modal>
        </div>
    );
};

export default UserSearch;
