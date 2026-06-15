import React from 'react';
import {
    FolderOpenOutlined,
    ShareAltOutlined,
    DeleteOutlined,
    TeamOutlined,
    PieChartOutlined,
    UserOutlined,
    LogoutOutlined,
    SearchOutlined,
    MenuOutlined,
    IdcardOutlined,
    MessageOutlined,
    TeamOutlined as FriendOutlined, // Alias TeamOutlined for Friend Manage if needed, or reuse
    CameraOutlined
} from '@ant-design/icons';
import { Layout, Menu, Avatar, Dropdown, Drawer, Button, Grid, Badge } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import api from '../utils/api';
import FloatingMenu from './FloatingMenu';
import usePageNotification from '../hooks/usePageNotification';

const { Header, Content, Sider } = Layout;
const { useBreakpoint } = Grid;

const MainLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const screens = useBreakpoint();
    const [drawerVisible, setDrawerVisible] = React.useState(false);
    const [username, setUsername] = React.useState(localStorage.getItem('username') || 'User');
    const [unreadCount, setUnreadCount] = React.useState(0);
    const [momentsNotificationData, setMomentsNotificationData] = React.useState({ count: 0, latestAvatar: null, newMomentsCount: 0 });

    React.useEffect(() => {
        const token = localStorage.getItem('token');
        if (token && !localStorage.getItem('username')) {
            api.get('/auth/info').then(res => {
                if (res.code === 200) {
                    setUsername(res.data.username);
                    localStorage.setItem('username', res.data.username);
                }
            });
        } else if (localStorage.getItem('username')) {
            setUsername(localStorage.getItem('username'));
        }
    }, []);

    const fetchUnread = async () => {
        try {
            // Use the new endpoint that returns detailed counts
            const res = await api.get('/chat/unreadCounts');
            if (res.code === 200) {
                // res.data.total includes both friend and group unread messages
                setUnreadCount(res.data.total);
            }

            // Fetch moments unread count
            const momentsRes = await api.get('/moments/notifications/unreadCount');
            if (momentsRes.code === 200) {
                setMomentsNotificationData(momentsRes.data);
            }
        } catch (e) { }
    };

    React.useEffect(() => {
        // Initial fetch
        fetchUnread();

        const interval = setInterval(fetchUnread, 5000);
        return () => clearInterval(interval);
    }, [location.pathname]);

    // Global Browser Tab Notification (Title & Favicon)
    // If we are in the chat page, we pass 0 here so MainLayout doesn't override FriendChat's logic.
    // Or we can just rely on FriendChat to handle it when active.
    // Ideally, we should have a single source of truth.
    // But for now, let's stick to the existing pattern: MainLayout handles it unless in Chat.
    const shouldHandleNotification = location.pathname !== '/friend/chat';
    usePageNotification(shouldHandleNotification ? unreadCount : 0);

    const isMobile = !screens.md;

    const menuItems = [
        { key: '/friend/chat', icon: <MessageOutlined />, label: <Badge count={unreadCount} offset={[10, 0]} size="small">好友聊天</Badge> },
        { key: '/files', icon: <FolderOpenOutlined />, label: '我的文件' },
        { key: '/share', icon: <ShareAltOutlined />, label: '分享管理' },
        { key: '/team', icon: <TeamOutlined />, label: '团队协作' },
        { key: '/recycle', icon: <DeleteOutlined />, label: '回收站' },
        { key: '/storage', icon: <PieChartOutlined />, label: '存储统计' },
        { key: '/user-search', icon: <SearchOutlined />, label: '用户搜索' },
        { key: '/friend/manage', icon: <FriendOutlined />, label: '好友管理' },
        { key: '/user/info', icon: <IdcardOutlined />, label: '个人信息' },
        { key: '/moments', icon: <CameraOutlined />, label: <Badge count={momentsNotificationData.count} dot={momentsNotificationData.count === 0 && momentsNotificationData.newMomentsCount > 0} offset={[10, 0]} size="small">{(momentsNotificationData.newMomentsCount > 0) ? '朋友圈（新动态）' : '朋友圈'}</Badge> },
    ];

    const handleMenuClick = (key) => {
        navigate(key);
        if (key === '/moments') {
            api.post('/moments/read');
            // Optimistically clear new moments count
            setMomentsNotificationData(prev => ({ ...prev, newMomentsCount: 0 }));
        }
        if (isMobile) {
            setDrawerVisible(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        navigate('/login');
    };

    const userMenuItems = [
        { key: '/user/info', icon: <IdcardOutlined />, label: '个人信息', onClick: () => navigate('/user/info') },
        { key: '/moments', icon: <CameraOutlined />, label: <Badge count={momentsNotificationData.count} dot={momentsNotificationData.count === 0 && momentsNotificationData.newMomentsCount > 0} offset={[10, 0]} size="small">{(momentsNotificationData.newMomentsCount > 0) ? '朋友圈（新动态）' : '朋友圈'}</Badge>, onClick: () => handleMenuClick('/moments') },
        { type: 'divider' },
        { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout }
    ];

    const renderMenu = () => (
        <Menu
            key={`${momentsNotificationData.count}-${momentsNotificationData.newMomentsCount}`}
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
            onClick={({ key }) => handleMenuClick(key)}
        />
    );

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {isMobile && (
                        <Button
                            type="text"
                            icon={<MenuOutlined style={{ color: 'white', fontSize: '18px' }} />}
                            onClick={() => setDrawerVisible(true)}
                            style={{ marginRight: 16 }}
                        />
                    )}
                    <div className="logo" style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>CloudPan</div>
                </div>
                <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                    <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <Avatar icon={<UserOutlined />} />
                        <span style={{ color: 'white', marginLeft: 8 }}>{username}</span>
                    </div>
                </Dropdown>
            </Header>
            <Layout>
                {!isMobile ? (
                    <Sider width={200} className="site-layout-background">
                        {renderMenu()}
                    </Sider>
                ) : (
                    <Drawer
                        title="CloudPan"
                        placement="left"
                        onClose={() => setDrawerVisible(false)}
                        open={drawerVisible}
                        bodyStyle={{ padding: 0 }}
                        width={240}
                    >
                        {renderMenu()}
                    </Drawer>
                )}
                <Layout style={{ padding: isMobile ? '12px' : '0 24px 24px' }}>
                    <Content
                        className="site-layout-background"
                        style={{
                            padding: isMobile ? 12 : 24,
                            margin: 0,
                            minHeight: 280,
                            marginTop: isMobile ? 12 : 24,
                            background: '#fff'
                        }}
                    >
                        <Outlet context={{ momentsNotificationData, refreshMomentsNotifications: fetchUnread }} />
                    </Content>
                </Layout>
                <FloatingMenu items={menuItems} unreadCount={unreadCount} />
            </Layout>
        </Layout >
    );
};

export default MainLayout;
