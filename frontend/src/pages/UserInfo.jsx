import React, { useState, useEffect, useCallback } from 'react';
import { Card, Form, Input, Button, Upload, message, Avatar, Divider, Modal, Progress, Result, Spin } from 'antd';
import { UserOutlined, UploadOutlined, LockOutlined, MailOutlined, QrcodeOutlined, ScanOutlined, ExclamationCircleOutlined, DeleteOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../utils/api';
import ImgCrop from 'antd-img-crop';
import { useNavigate } from 'react-router-dom';

const UserInfo = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [showQrCode, setShowQrCode] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    // Account deletion state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteStep, setDeleteStep] = useState(-1); // -1 = show summary, 0..N = progress
    const [deleteComplete, setDeleteComplete] = useState(false);

    const deletionSteps = [
        { title: '删除聊天记录及文件', desc: '正在清除所有私聊消息和聊天文件...' },
        { title: '删除朋友圈及媒体', desc: '正在清除所有动态、图片和视频...' },
        { title: '删除云盘文件', desc: '正在清除所有上传的文件和文件夹...' },
        { title: '清除好友关系', desc: '正在解除所有好友关系...' },
        { title: '清除团队与群组', desc: '正在退出所有团队空间和群组...' },
        { title: '注销账户', desc: '正在清除账户信息...' },
    ];

    const fetchSummary = useCallback(async () => {
        setSummaryLoading(true);
        try {
            const res = await api.get('/auth/account-summary');
            if (res.code === 200) {
                setSummary(res.data);
            }
        } catch (err) {
            message.error('获取账户信息失败');
        } finally {
            setSummaryLoading(false);
        }
    }, []);

    const handleDeleteAccount = useCallback(async () => {
        if (!deletePassword) {
            message.warning('请输入密码');
            return;
        }

        setDeleteStep(0);

        // Animate through each step
        for (let i = 0; i < deletionSteps.length; i++) {
            setDeleteStep(i);
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        // Call backend
        try {
            const res = await api.delete('/auth/account', { data: { password: deletePassword } });
            if (res.code === 200) {
                setDeleteStep(deletionSteps.length);
                setDeleteComplete(true);
                setTimeout(() => {
                    localStorage.removeItem('token');
                    navigate('/login');
                }, 2500);
            } else {
                throw new Error(res.message || '注销失败');
            }
        } catch (err) {
            setDeleteStep(-1); // Back to summary view
            const errMsg = err.response?.data?.message || err.message || '未知错误';
            message.error('注销失败：' + errMsg);
        }
    }, [deletePassword, navigate]);

    const fetchUserInfo = async () => {
        try {
            const res = await api.get('/auth/info');
            if (res.code === 200) {
                setUser(res.data);
                if (res.data.avatar) {
                    // Add timestamp to prevent caching
                    setAvatarUrl(`/cloudpan-api/auth/avatar/${res.data.id}?t=${new Date().getTime()}`);
                }
            }
        } catch (err) {
            message.error('加载用户信息失败');
        }
    };

    useEffect(() => {
        fetchUserInfo();
    }, []);

    useEffect(() => {
        let scanner = null;
        if (isScanning && showQrCode) {
            // Wait for modal animation
            setTimeout(() => {
                scanner = new Html5QrcodeScanner(
                    "reader",
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    /* verbose= */ false
                );
                scanner.render(onScanSuccess, onScanFailure);
            }, 100);
        }

        return () => {
            if (scanner) {
                scanner.clear().catch(error => console.error("清空扫描器失败", error));
            }
        };
    }, [isScanning, showQrCode]);

    const onScanSuccess = async (decodedText, decodedResult) => {
        if (decodedText) {
            setIsScanning(false); // Stop scanning immediately
            try {
                // Assuming decodedText is the userId
                const res = await api.post('/friend/add', { friendId: decodedText });
                if (res.code === 200) {
                    message.success('好友请求已发送');
                    setShowQrCode(false);
                } else {
                    message.info(res.message || '请求发送失败');
                }
            } catch (err) {
                message.error('请求发送出错');
            }
        }
    };

    const onScanFailure = (error) => {
        // handle scan failure, usually better to ignore and keep scanning.
        // console.warn(`Code scan error = ${error}`);
    };

    const handleAvatarUpload = async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/auth/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.code === 200) {
                message.success('头像更新成功');
                fetchUserInfo(); // Refresh info
            } else {
                message.error(res.message || '头像更新失败');
            }
        } catch (err) {
            message.error('上传失败');
        }
        return false; // Prevent default upload behavior
    };

    const handleProfileUpdate = async (values) => {
        try {
            const res = await api.post('/auth/profile', { email: values.email, signature: values.signature });
            if (res.code === 200) {
                message.success('个人信息更新成功');
                fetchUserInfo();
            } else {
                message.error(res.message);
            }
        } catch (err) {
            message.error('更新失败');
        }
    };

    const handlePasswordUpdate = async (values) => {
        if (values.newPassword !== values.confirmPassword) {
            message.error('密码不匹配');
            return;
        }
        try {
            const res = await api.post('/auth/password', {
                oldPassword: values.oldPassword,
                newPassword: values.newPassword
            });
            if (res.code === 200) {
                message.success('密码更新成功');
                // Optional: clear form or hide it
                setShowPasswordForm(false);
            } else {
                message.error(res.message);
            }
        } catch (err) {
            message.error('密码更新失败');
        }
    };

    if (!user) return null;

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <Card title="个人信息" bordered={false}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ marginRight: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Avatar
                            size={100}
                            src={avatarUrl}
                            icon={<UserOutlined />}
                            style={{ marginBottom: '12px' }}
                        />
                        <ImgCrop rotation slider aspect={1} modalTitle="编辑头像" modalOk="确定" modalCancel="取消">
                            <Upload
                                showUploadList={false}
                                beforeUpload={handleAvatarUpload}
                                accept="image/*"
                            >
                                <Button icon={<UploadOutlined />} size="small">更换头像</Button>
                            </Upload>
                        </ImgCrop>
                    </div>
                    <div style={{ flex: 1 }}>
                        <p><strong>用户ID:</strong> {user.id}</p>
                        <p><strong>用户名:</strong> {user.username}</p>
                        <p><strong>个性签名:</strong> {user.signature || '骚话吧'}</p>
                        <p><strong>角色:</strong> {user.role}</p>
                        <p><strong>注册时间:</strong> {new Date(user.createdAt).toLocaleString()}</p>
                        <Button icon={<QrcodeOutlined />} onClick={() => setShowQrCode(true)} style={{ marginTop: 10 }}>
                            我的二维码
                        </Button>
                    </div>
                </div>

                <Modal
                    title={isScanning ? "扫一扫加好友" : "我的二维码"}
                    visible={showQrCode}
                    onCancel={() => { setShowQrCode(false); setIsScanning(false); }}
                    footer={null}
                    width={isScanning ? 400 : 300}
                    bodyStyle={{ textAlign: 'center', padding: isScanning ? 0 : 24 }}
                    destroyOnClose
                >
                    {!isScanning ? (
                        <>
                            <div style={{ marginBottom: 20 }}>
                                <img
                                    src={`https://api.2dcode.biz/v1/create-qr-code?data=${user.id}&size=200x200`}
                                    alt="QR Code"
                                    style={{ width: 200, height: 200 }}
                                />
                                <div style={{ marginTop: 10, color: '#999' }}>扫一扫上面的二维码图案，加我好友</div>
                            </div>
                            <Button type="primary" icon={<ScanOutlined />} block size="large" onClick={() => setIsScanning(true)}>
                                扫一扫
                            </Button>
                        </>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            <div id="reader" style={{ width: '100%' }}></div>
                            <Button type="link" onClick={() => setIsScanning(false)} style={{ marginTop: 10 }}>
                                返回我的二维码
                            </Button>
                        </div>
                    )}
                </Modal>

                <Divider orientation="left">修改资料</Divider>
                <Form
                    layout="vertical"
                    initialValues={{ email: user.email, signature: user.signature }}
                    onFinish={handleProfileUpdate}
                    style={{ maxWidth: '400px' }}
                >
                    <Form.Item
                        label="邮箱"
                        name="email"
                        rules={[{ type: 'email', message: '请输入有效的邮箱' }]}
                    >
                        <Input prefix={<MailOutlined />} />
                    </Form.Item>
                    <Form.Item
                        label="个性签名"
                        name="signature"
                    >
                        <Input.TextArea rows={2} placeholder="设置个性的签名吧" maxLength={50} showCount />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">保存修改</Button>
                    </Form.Item>
                </Form>

                <Divider orientation="left">安全设置</Divider>
                <Button
                    type="primary"
                    danger
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    style={{ marginBottom: '20px' }}
                >
                    {showPasswordForm ? '收起修改密码' : '修改密码'}
                </Button>

                {showPasswordForm && (
                    <Form
                        layout="vertical"
                        onFinish={handlePasswordUpdate}
                        style={{ maxWidth: '400px', background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}
                    >
                        <Form.Item
                            label="原密码"
                            name="oldPassword"
                            rules={[{ required: true, message: '请输入原密码' }]}
                        >
                            <Input.Password prefix={<LockOutlined />} />
                        </Form.Item>
                        <Form.Item
                            label="新密码"
                            name="newPassword"
                            rules={[{ required: true, message: '请输入新密码' }]}
                        >
                            <Input.Password prefix={<LockOutlined />} />
                        </Form.Item>
                        <Form.Item
                            label="确认新密码"
                            name="confirmPassword"
                            rules={[{ required: true, message: '请确认新密码' }]}
                        >
                            <Input.Password prefix={<LockOutlined />} />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" block>确认修改</Button>
                        </Form.Item>
                    </Form>
                )}

                <Divider orientation="left" style={{ borderColor: '#ff4d4f' }}>危险操作</Divider>
                <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '8px', padding: '16px', maxWidth: '500px' }}>
                    <p style={{ color: '#ff4d4f', fontWeight: 600, fontSize: '15px', marginBottom: '8px' }}>
                        <ExclamationCircleOutlined style={{ marginRight: '8px' }} />
                        注销账户
                    </p>
                    <p style={{ color: '#666', fontSize: '13px', marginBottom: '16px', lineHeight: '1.8' }}>
                        注销后，您的所有数据将被<strong>永久删除</strong>且无法恢复：<br />
                        · 所有聊天记录及文件（包括好友收到的文件也将被删除）<br />
                        · 所有云盘文件及文件夹<br />
                        · 所有朋友圈动态及媒体文件<br />
                        · 所有好友关系<br />
                        · 所有团队空间及群组数据
                    </p>
                    <Button
                        type="primary"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => { setShowDeleteModal(true); setDeleteStep(-1); setDeletePassword(''); setDeleteComplete(false); }}
                    >
                        注销账户
                    </Button>
                </div>
            </Card>

            {/* ============ 注销账户弹窗 ============ */}
            <Modal
                title={
                    <span style={{ color: '#ff4d4f' }}>
                        <ExclamationCircleOutlined style={{ marginRight: 8 }} />
                        注销账户
                    </span>
                }
                open={showDeleteModal}
                onCancel={() => { if (deleteStep === -1) { setShowDeleteModal(false); } }}
                footer={null}
                destroyOnClose
                closable={deleteStep === -1}
                maskClosable={deleteStep === -1}
                width={520}
                afterOpenChange={(open) => { if (open) fetchSummary(); }}
            >
                {/* Step -1: Show asset summary + password input */}
                {deleteStep === -1 && !deleteComplete && (
                    <div>
                        {summaryLoading ? (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <Spin size="large" />
                                <p style={{ marginTop: 16, color: '#999' }}>正在统计账户数据...</p>
                            </div>
                        ) : summary ? (
                            <>
                                <div style={{
                                    background: '#fff2f0', border: '1px solid #ffccc7',
                                    borderRadius: 8, padding: '16px', marginBottom: 20
                                }}>
                                    <p style={{ color: '#ff4d4f', fontWeight: 600, marginBottom: 12, fontSize: 14 }}>
                                        ⚠️ 以下数据将被<strong>永久删除</strong>且无法恢复：
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 13 }}>
                                        <div>📁 文件：<strong>{summary.fileCount}</strong> 个</div>
                                        <div>📂 文件夹：<strong>{summary.folderCount}</strong> 个</div>
                                        <div>💾 总大小：<strong>{summary.totalFileSizeDisplay}</strong></div>
                                        <div>💬 聊天记录：<strong>{summary.chatMessages}</strong> 条</div>
                                        <div>📷 朋友圈：<strong>{summary.moments}</strong> 条（{summary.momentMedia} 个媒体）</div>
                                        <div>👥 好友：<strong>{summary.friends}</strong> 人</div>
                                        <div>👥 群组：<strong>{summary.ownedGroups}</strong> 个创建 + <strong>{summary.joinedGroups}</strong> 个加入</div>
                                        <div>🏢 团队：<strong>{summary.teams}</strong> 个</div>
                                        <div>🔗 分享链接：<strong>{summary.shares}</strong> 个</div>
                                        <div>🗑️ 回收站：<strong>{summary.recycleBinItems}</strong> 项</div>
                                    </div>
                                </div>

                                <p style={{ color: '#666', marginBottom: 8 }}>
                                    请输入<strong>登录密码</strong>以确认注销：
                                </p>
                                <Input.Password
                                    placeholder="请输入登录密码"
                                    value={deletePassword}
                                    onChange={e => setDeletePassword(e.target.value)}
                                    style={{ marginBottom: 20 }}
                                    prefix={<LockOutlined />}
                                    onPressEnter={handleDeleteAccount}
                                />
                                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                    <Button onClick={() => { setShowDeleteModal(false); setDeletePassword(''); }}>
                                        取消
                                    </Button>
                                    <Button
                                        type="primary"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={handleDeleteAccount}
                                        disabled={!deletePassword}
                                    >
                                        确认注销
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <p style={{ color: '#999' }}>无法获取账户信息</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 0..N: Deletion progress animation */}
                {deleteStep >= 0 && !deleteComplete && (
                    <div style={{ padding: '24px 0' }}>
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />
                            <p style={{ marginTop: '16px', fontSize: '16px', fontWeight: 500 }}>
                                正在注销账户...
                            </p>
                        </div>
                        <Progress
                            percent={Math.round((deleteStep / deletionSteps.length) * 100)}
                            status="active"
                            strokeColor={{ '0%': '#1890ff', '100%': '#ff4d4f' }}
                        />
                        <div style={{ marginTop: '24px' }}>
                            {deletionSteps.map((step, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '10px 0',
                                        opacity: index <= deleteStep ? 1 : 0.3,
                                        transition: 'opacity 0.5s ease',
                                    }}
                                >
                                    <div style={{
                                        width: 32, height: 32, borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: index < deleteStep ? '#52c41a' : index === deleteStep ? '#1890ff' : '#d9d9d9',
                                        color: '#fff', fontSize: '14px', transition: 'all 0.5s ease',
                                    }}>
                                        {index < deleteStep ? <CheckCircleOutlined /> : index === deleteStep ? <LoadingOutlined spin /> : (index + 1)}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 500, fontSize: '14px' }}>{step.title}</div>
                                        {index === deleteStep && (
                                            <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>{step.desc}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {deleteComplete && (
                    <Result
                        status="success"
                        title="账户注销成功"
                        subTitle="您的所有数据已永久删除。即将跳转到登录页面..."
                    />
                )}
            </Modal>
        </div>
    );
};

export default UserInfo;
