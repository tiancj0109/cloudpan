import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';

/* ── Auth Input ── */
const AuthInput = ({ label, icon, type, ...rest }) => {
    const InputComponent = type === 'password' ? Input.Password : Input;
    return (
        <div className="auth-input">
            <span className="auth-input-icon">{icon}</span>
            <InputComponent prefix={null} placeholder={label} {...rest} />
        </div>
    );
};

/* ─── Ripple Button ─── */
const RippleButton = ({ children, loading, ...rest }) => {
    const btnRef = useRef(null);

    const handleClick = (e) => {
        const btn = btnRef.current;
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        const size = Math.max(rect.width, rect.height) * 2;
        ripple.style.cssText = `
            position:absolute; border-radius:50%; pointer-events:none;
            width:${size}px; height:${size}px;
            left:${e.clientX - rect.left - size / 2}px;
            top:${e.clientY - rect.top - size / 2}px;
            background:rgba(255,255,255,0.4);
            transform:scale(0); animation:rippleAnim 0.6s ease-out forwards;
        `;
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
        rest.onClick?.(e);
    };

    return (
        <button
            {...rest}
            ref={btnRef}
            className="ripple-btn"
            onClick={handleClick}
            disabled={loading}
        >
            {loading && <span className="btn-spinner" />}
            <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
        </button>
    );
};

/* ─── Auth Page with 3D Flip ─── */
const AuthPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [flipped, setFlipped] = useState(location.pathname === '/register');
    const [loginLoading, setLoginLoading] = useState(false);
    const [registerLoading, setRegisterLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) navigate('/');
    }, [navigate]);

    const onLogin = async (values) => {
        setLoginLoading(true);
        try {
            const res = await api.post('/auth/login', values);
            if (res.code === 200) {
                localStorage.setItem('token', res.token);
                localStorage.setItem('username', res.username);
                message.success('登录成功');
                const params = new URLSearchParams(window.location.search);
                let redirect = params.get('redirect') || '/files';
                if (process.env.PUBLIC_URL && redirect.startsWith(process.env.PUBLIC_URL)) {
                    redirect = redirect.replace(process.env.PUBLIC_URL, '');
                }
                if (!redirect) redirect = '/files';
                navigate(redirect);
            }
        } catch (error) { /* handled by interceptor */ } finally { setLoginLoading(false); }
    };

    const onRegister = async (values) => {
        setRegisterLoading(true);
        try {
            const res = await api.post('/auth/register', values);
            if (res.code === 200) {
                message.success('注册成功，请登录');
                setFlipped(false);
            }
        } catch (error) { /* handled by interceptor */ } finally { setRegisterLoading(false); }
    };

    return (
        <div className="auth-scene">
            <style>{`
                /* ── Background breathing ── */
                @keyframes bgBreathe {
                    0%   { transform: scale(1)    translate(0, 0); }
                    25%  { transform: scale(1.08) translate(-1%, -1%); }
                    50%  { transform: scale(1.12) translate(1%, 0.5%); }
                    75%  { transform: scale(1.06) translate(-0.5%, 1%); }
                    100% { transform: scale(1)    translate(0, 0); }
                }
                .auth-scene {
                    position: relative;
                    display: flex; justify-content: center; align-items: center;
                    height: 100vh; overflow: hidden;
                }
                .auth-scene::before {
                    content: '';
                    position: absolute; inset: -10%;
                    background: url(/cloudpan/background.jpg) center/cover no-repeat;
                    animation: bgBreathe 20s ease-in-out infinite;
                    z-index: 0;
                }
                .auth-scene::after {
                    content: '';
                    position: absolute; inset: 0;
                    background: rgba(0,0,0,0.08);
                    z-index: 1;
                }

                /* ── 3D Flip Container ── */
                .flip-container {
                    position: relative; z-index: 2;
                    width: 420px; max-width: calc(100vw - 40px);
                    perspective: 1200px;
                    animation: cardIn 0.7s cubic-bezier(0.16,1,0.3,1) both;
                }
                .flip-inner {
                    position: relative;
                    width: 100%;
                    transition: transform 0.8s cubic-bezier(0.4, 0.0, 0.2, 1);
                    transform-style: preserve-3d;
                }
                .flip-inner.flipped { transform: rotateY(180deg); }

                .flip-face {
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                    border-radius: 24px;
                    background: rgba(255,255,255,0.68);
                    backdrop-filter: blur(28px) saturate(180%);
                    -webkit-backdrop-filter: blur(28px) saturate(180%);
                    border: 1px solid rgba(255,255,255,0.5);
                    box-shadow: 0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
                    display: flex; flex-direction: column;
                    padding: 40px 36px 32px;
                }
                .flip-back {
                    position: absolute; top: 0; left: 0; right: 0;
                    transform: rotateY(180deg);
                }

                @keyframes cardIn {
                    from { opacity: 0; transform: translateY(40px) scale(0.92); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }

                .auth-title {
                    font-size: 28px; font-weight: 700; letter-spacing: -0.5px;
                    color: #1d1d1f; margin-bottom: 28px; text-align: center;
                }

                /* ── Auth Input ── */
                .auth-input {
                    position: relative;
                    display: flex;
                    align-items: center;
                    height: 52px;
                    border: 1.5px solid rgba(0,0,0,0.1);
                    border-radius: 14px;
                    padding: 0 14px 0 40px;
                    background: rgba(255,255,255,0.35);
                    transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
                    overflow: hidden;
                    margin-bottom: 20px;
                }
                .auth-input:hover {
                    border-color: rgba(0,113,227,0.35);
                    background: rgba(255,255,255,0.45);
                }
                .auth-input:focus-within {
                    border-color: #0071e3;
                    background: rgba(255,255,255,0.55);
                    box-shadow: 0 0 0 4px rgba(0,113,227,0.12);
                }
                .auth-input-icon {
                    position: absolute;
                    left: 14px;
                    color: #86868b;
                    font-size: 16px;
                    z-index: 2;
                    transition: color 0.3s ease;
                }
                .auth-input:focus-within .auth-input-icon { color: #0071e3; }
                .auth-input .ant-input,
                .auth-input .ant-input-affix-wrapper {
                    width: 100% !important;
                    border: none !important;
                    background: transparent !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    height: auto !important;
                    line-height: 1.4 !important;
                    color: #1d1d1f;
                    font-size: 15px;
                    outline: none !important;
                }
                .auth-input .ant-input-affix-wrapper {
                    min-height: auto !important;
                }
                .auth-input .ant-input-affix-wrapper input {
                    padding: 0 !important;
                }

                /* ─ Ripple Button ── */
                @keyframes rippleAnim {
                    to { transform: scale(1); opacity: 0; }
                }
                @keyframes spinAnim {
                    to { transform: rotate(360deg); }
                }
                .ripple-btn {
                    position: relative; overflow: hidden;
                    width: 100%; height: 50px; border: none; border-radius: 14px;
                    background: #0071e3; color: #fff;
                    font-size: 17px; font-weight: 600; letter-spacing: 0.3px;
                    cursor: pointer; margin-top: 4px;
                    transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
                }
                .ripple-btn:hover {
                    background: #0077ed;
                    transform: scale(1.02);
                    box-shadow: 0 6px 20px rgba(0,113,227,0.35);
                }
                .ripple-btn:active { transform: scale(0.97); }
                .ripple-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
                .btn-spinner {
                    position: absolute; top: 50%; left: 50%;
                    width: 20px; height: 20px; margin: -10px 0 0 -10px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: #fff; border-radius: 50%;
                    animation: spinAnim 0.6s linear infinite;
                }

                .auth-switch {
                    text-align: center; margin-top: 20px; font-size: 14px; color: #86868b;
                }
                .auth-switch a {
                    color: #0071e3; font-weight: 500; text-decoration: none;
                    cursor: pointer; transition: color 0.2s;
                }
                .auth-switch a:hover { color: #0077ed; text-decoration: underline; }

                .flip-face .ant-form-item { margin-bottom: 0; }
                .flip-face .ant-form-item-explain-error {
                    font-size: 12px; padding: 0 4px 4px; margin-top: -2px;
                }
            `}</style>

            <div className="flip-container">
                <div className={`flip-inner ${flipped ? 'flipped' : ''}`}>
                    {/* ── Front: Login ─ */}
                    <div className="flip-face flip-front">
                        <div className="auth-title">云盘登录</div>
                        <Form name="login" onFinish={onLogin} autoComplete="off">
                            <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                                <AuthInput label="用户名" icon={<UserOutlined />} />
                            </Form.Item>
                            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                                <AuthInput label="密码" icon={<LockOutlined />} type="password" />
                            </Form.Item>
                            <Form.Item style={{ marginTop: 8 }}>
                                <RippleButton loading={loginLoading} type="submit">登录</RippleButton>
                            </Form.Item>
                        </Form>
                        <div className="auth-switch">
                            还没有账号？ <a onClick={() => setFlipped(true)}>立即注册</a>
                        </div>
                    </div>

                    {/* ── Back: Register ── */}
                    <div className="flip-face flip-back">
                        <div className="auth-title">云盘注册</div>
                        <Form name="register" onFinish={onRegister} autoComplete="off">
                            <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                                <AuthInput label="用户名" icon={<UserOutlined />} />
                            </Form.Item>
                            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                                <AuthInput label="密码" icon={<LockOutlined />} type="password" />
                            </Form.Item>
                            <Form.Item name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}>
                                <AuthInput label="邮箱" icon={<MailOutlined />} />
                            </Form.Item>
                            <Form.Item style={{ marginTop: 8 }}>
                                <RippleButton loading={registerLoading} type="submit">注册</RippleButton>
                            </Form.Item>
                        </Form>
                        <div className="auth-switch">
                            已有账号？ <a onClick={() => setFlipped(false)}>立即登录</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
