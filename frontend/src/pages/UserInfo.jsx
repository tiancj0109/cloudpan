import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Upload, message, Avatar, Divider, Modal } from 'antd';
import { UserOutlined, UploadOutlined, LockOutlined, MailOutlined, QrcodeOutlined, ScanOutlined } from '@ant-design/icons';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../utils/api';
import ImgCrop from 'antd-img-crop';

const UserInfo = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [showQrCode, setShowQrCode] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

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
            </Card>
        </div>
    );
};

export default UserInfo;
