import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Input, message, Card, List, Avatar, Grid } from 'antd';
import { TeamOutlined, UserAddOutlined } from '@ant-design/icons';
import api from '../utils/api';

import { useNavigate } from 'react-router-dom';

const TeamCollaboration = () => {
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');

    const [selectedTeam, setSelectedTeam] = useState(null);
    const [members, setMembers] = useState([]);
    const [isMemberModalVisible, setIsMemberModalVisible] = useState(false);
    const [newMemberId, setNewMemberId] = useState('');

    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                // Manual JWT parsing
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const payload = JSON.parse(jsonPayload);
                // JwtUtil uses 'id' for userId
                setCurrentUserId(payload.id);
            } catch (e) {
                console.error("解析token失败", e);
            }
        }
        fetchTeams();
    }, []);

    const fetchTeams = async () => {
        setLoading(true);
        try {
            const res = await api.get('/team/list');
            if (res.code === 200) {
                setTeams(res.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTeam = async () => {
        if (!newTeamName) return;
        try {
            await api.post('/team/create', { name: newTeamName });
            message.success('团队创建成功');
            setIsModalVisible(false);
            setNewTeamName('');
            fetchTeams();
        } catch (error) {
            // Error handled
        }
    };

    const handleDeleteTeam = async (teamId) => {
        Modal.confirm({
            title: '确认删除团队?',
            content: '删除后无法恢复，且所有文件将被删除。',
            onOk: async () => {
                try {
                    await api.post(`/team/${teamId}/delete`);
                    message.success('团队已删除');
                    fetchTeams();
                    if (selectedTeam && selectedTeam.id === teamId) {
                        setSelectedTeam(null);
                        setMembers([]);
                    }
                } catch (error) {
                    // Error handled
                }
            }
        });
    };

    const handleQuitTeam = async (teamId) => {
        Modal.confirm({
            title: '确认退出团队?',
            onOk: async () => {
                try {
                    await api.post(`/team/${teamId}/quit`);
                    message.success('已退出团队');
                    fetchTeams();
                    if (selectedTeam && selectedTeam.id === teamId) {
                        setSelectedTeam(null);
                        setMembers([]);
                    }
                } catch (error) {
                    // Error handled
                }
            }
        });
    };

    const handleViewMembers = async (team) => {
        setSelectedTeam(team);
        try {
            const res = await api.get(`/team/${team.id}/members`);
            if (res.code === 200) {
                setMembers(res.data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddMember = async () => {
        if (!newMemberId) return;
        try {
            await api.post(`/team/${selectedTeam.id}/member/add`, { userId: newMemberId });
            message.success('成员添加成功');
            setIsMemberModalVisible(false);
            setNewMemberId('');
            handleViewMembers(selectedTeam);
        } catch (error) {
            // Error handled
        }
    };

    const handleRemoveMember = async (memberId) => {
        Modal.confirm({
            title: '确认移除该成员?',
            onOk: async () => {
                try {
                    await api.post(`/team/${selectedTeam.id}/member/${memberId}/remove`);
                    message.success('成员已移除');
                    handleViewMembers(selectedTeam);
                } catch (error) {
                    // Error handled
                }
            }
        });
    };

    const getRoleName = (role) => {
        switch (role) {
            case 'OWNER': return '所有者';
            case 'ADMIN': return '管理员';
            case 'MEMBER': return '成员';
            default: return role;
        }
    };

    const columns = [
        {
            title: '团队名称',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: '角色',
            key: 'role',
            render: (_, record) => {
                // Assuming record.ownerId is available. 
                // Since currentUserId might be string/number mismatch, use loose equality or convert.
                return String(record.ownerId) === String(currentUserId) ? '所有者' : '成员';
            },
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => {
                const isOwner = String(record.ownerId) === String(currentUserId);
                return (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button type="link" onClick={() => handleViewMembers(record)}>管理成员</Button>
                        <Button type="link" onClick={() => {
                            navigate(`/files?parentId=${record.rootFolderId}`);
                        }}>查看文件</Button>
                        {isOwner ? (
                            <Button type="link" danger onClick={() => handleDeleteTeam(record.id)}>删除团队</Button>
                        ) : (
                            <Button type="link" danger onClick={() => handleQuitTeam(record.id)}>退出团队</Button>
                        )}
                    </div>
                );
            },
        },
    ];

    const screens = Grid.useBreakpoint();

    return (
        <div style={{ display: 'flex', flexDirection: screens.md ? 'row' : 'column', gap: 20 }}>
            <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 16 }}>
                    <Button type="primary" icon={<TeamOutlined />} onClick={() => setIsModalVisible(true)}>创建团队</Button>
                </div>
                {!screens.md ? (
                    <List
                        dataSource={teams}
                        loading={loading}
                        renderItem={item => {
                            const isOwner = String(item.ownerId) === String(currentUserId);
                            return (
                                <List.Item
                                    actions={[
                                        <Button type="link" size="small" onClick={() => handleViewMembers(item)}>成员</Button>,
                                        <Button type="link" size="small" onClick={() => navigate(`/files?parentId=${item.rootFolderId}`)}>文件</Button>,
                                        isOwner ? (
                                            <Button type="link" size="small" danger onClick={() => handleDeleteTeam(item.id)}>删除</Button>
                                        ) : (
                                            <Button type="link" size="small" danger onClick={() => handleQuitTeam(item.id)}>退出</Button>
                                        )
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={item.name}
                                        description={isOwner ? '角色: 所有者' : '角色: 成员'}
                                    />
                                </List.Item>
                            );
                        }}
                    />
                ) : (
                    <Table
                        columns={columns}
                        dataSource={teams}
                        rowKey="id"
                        loading={loading}
                    />
                )}
            </div>

            {selectedTeam && (
                <Card title={`${selectedTeam.name} 的成员`} style={{ flex: 1 }} extra={<Button icon={<UserAddOutlined />} onClick={() => setIsMemberModalVisible(true)}>添加成员</Button>}>
                    <List
                        itemLayout="horizontal"
                        dataSource={members}
                        renderItem={item => {
                            const isOwner = String(selectedTeam.ownerId) === String(currentUserId);
                            const isSelf = String(item.userId) === String(currentUserId);
                            return (
                                <List.Item
                                    actions={isOwner && !isSelf ? [<Button type="link" danger onClick={() => handleRemoveMember(item.userId)}>移除</Button>] : []}
                                >
                                    <List.Item.Meta
                                        avatar={<Avatar icon={<TeamOutlined />} />}
                                        title={`用户ID: ${item.userId}`}
                                        description={`角色: ${getRoleName(item.role)} | 权限: ${item.permission}`}
                                    />
                                </List.Item>
                            );
                        }}
                    />
                </Card>
            )}

            <Modal title="创建团队" open={isModalVisible} onOk={handleCreateTeam} onCancel={() => setIsModalVisible(false)}>
                <Input placeholder="团队名称" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
            </Modal>

            <Modal title="添加成员" open={isMemberModalVisible} onOk={handleAddMember} onCancel={() => setIsMemberModalVisible(false)}>
                <Input placeholder="用户ID" value={newMemberId} onChange={(e) => setNewMemberId(e.target.value)} />
            </Modal>
        </div>
    );
};

export default TeamCollaboration;
