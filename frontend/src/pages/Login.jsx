import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

const Login = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            navigate('/');
        }
    }, [navigate]);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const res = await api.post('/auth/login', values);
            if (res.code === 200) {
                localStorage.setItem('token', res.token);
                localStorage.setItem('username', res.username);
                message.success('登录成功');
                const params = new URLSearchParams(window.location.search);
                let redirect = params.get('redirect') || '/files';
                // If redirect path includes PUBLIC_URL (e.g. /cloudpan/files), strip it because navigate is relative to basename
                if (process.env.PUBLIC_URL && redirect.startsWith(process.env.PUBLIC_URL)) {
                    redirect = redirect.replace(process.env.PUBLIC_URL, '');
                }
                if (!redirect) redirect = '/files';
                navigate(redirect);
            }
        } catch (error) {
            // Error handled by interceptor
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
            <Card title="云盘登录" style={{ width: '100%', maxWidth: 400, margin: '0 20px' }}>
                <Form
                    name="login"
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
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block>
                            登录
                        </Button>
                        <div style={{ marginTop: 10, textAlign: 'center' }}>
                            或者 <Link to="/register">立即注册！</Link>
                        </div>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default Login;
