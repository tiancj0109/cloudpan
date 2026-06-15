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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
            <Card title="云盘注册" style={{ width: '100%', maxWidth: 400, margin: '0 20px' }}>
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
