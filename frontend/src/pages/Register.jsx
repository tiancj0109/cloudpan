import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

const Register = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const res = await api.post('/auth/register', values);
            if (res.code === 200) {
                message.success('注册成功，请登录');
                navigate('/login');
            }
        } catch (error) {
            // Error handled by interceptor
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'url(/cloudpan/background.jpg) center/cover no-repeat fixed' }}>
            <style>{`
                @keyframes cardEnter {
                    from { opacity: 0; transform: translateY(30px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes bgFade {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .glass-card {
                    background: rgba(255, 255, 255, 0.72);
                    backdrop-filter: blur(24px) saturate(180%);
                    -webkit-backdrop-filter: blur(24px) saturate(180%);
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.45);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
                    animation: cardEnter 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
                    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease;
                }
                .glass-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.16), 0 4px 12px rgba(0, 0, 0, 0.08);
                }
                .glass-card .ant-card-head {
                    border-bottom: none;
                    padding: 28px 24px 4px;
                }
                .glass-card .ant-card-head-title {
                    font-size: 24px;
                    font-weight: 600;
                    letter-spacing: -0.5px;
                    color: #1d1d1f;
                }
                .glass-card .ant-card-body {
                    padding: 12px 24px 28px;
                }
                .glass-card .ant-input-affix-wrapper,
                .glass-card .ant-input {
                    border-radius: 12px;
                    height: 44px;
                    border: 1px solid rgba(0, 0, 0, 0.08);
                    background: rgba(255, 255, 255, 0.6);
                    transition: all 0.3s ease;
                }
                .glass-card .ant-input-affix-wrapper:focus,
                .glass-card .ant-input-affix-wrapper-focused {
                    border-color: #0071e3;
                    box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.15);
                    background: #fff;
                }
                .glass-card .ant-btn-primary {
                    border-radius: 12px;
                    height: 44px;
                    font-size: 16px;
                    font-weight: 500;
                    background: #0071e3;
                    border: none;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .glass-card .ant-btn-primary:hover {
                    background: #0077ed;
                    transform: scale(1.02);
                    box-shadow: 0 4px 16px rgba(0, 113, 227, 0.35);
                }
                .glass-card .ant-btn-primary:active {
                    transform: scale(0.98);
                }
            `}</style>
            <Card title="云盘注册" className="glass-card" style={{ width: '100%', maxWidth: 400, margin: '0 20px' }}>
                <Form
                    name="register"
                    onFinish={onFinish}
                >
                    <Form.Item
                        name="username"
                        rules={[{ required: true, message: '请输入用户名！' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="用户名" />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: '请输入密码！' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        rules={[{ required: true, message: '请输入邮箱！' }, { type: 'email', message: '邮箱格式不正确！' }]}
                    >
                        <Input prefix={<MailOutlined />} placeholder="邮箱" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block>
                            注册
                        </Button>
                        <div style={{ marginTop: 10, textAlign: 'center' }}>
                            已有账号？ <Link to="/login">立即登录！</Link>
                        </div>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default Register;
