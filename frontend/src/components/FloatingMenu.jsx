import React, { useState, useEffect, useRef } from 'react';
import { Button, Dropdown, Menu, Badge } from 'antd';
import { MenuOutlined, MessageOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const FloatingMenu = ({ items, unreadCount }) => {
    const navigate = useNavigate();
    const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 150 });
    const [dragging, setDragging] = useState(false);
    const [rel, setRel] = useState({ x: 0, y: 0 });
    const [hasMoved, setHasMoved] = useState(false);
    const [visible, setVisible] = useState(true);

    // Handle window resize to keep button on screen
    useEffect(() => {
        const handleResize = () => {
            setPosition(prev => ({
                x: Math.min(prev.x, window.innerWidth - 60),
                y: Math.min(prev.y, window.innerHeight - 60)
            }));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const draggingRef = useRef(false);
    const relRef = useRef({ x: 0, y: 0 });

    const onMouseDown = (e) => {
        if (e.button !== 0) return;
        setDragging(true);
        setHasMoved(false);
        setRel({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
        e.stopPropagation();
        e.preventDefault();
    };

    const onMouseMove = (e) => {
        if (!dragging) return;
        setHasMoved(true);
        setPosition({
            x: e.clientX - rel.x,
            y: e.clientY - rel.y
        });
        e.stopPropagation();
        e.preventDefault();
    };

    const onMouseUp = (e) => {
        setDragging(false);
        e.stopPropagation();
        e.preventDefault();
    };

    // Touch support for mobile using Refs to avoid closure delay
    const onTouchStart = (e) => {
        draggingRef.current = true;
        setHasMoved(false);
        const touch = e.touches[0];
        relRef.current = {
            x: touch.clientX - position.x,
            y: touch.clientY - position.y
        };
        e.stopPropagation();
    };

    useEffect(() => {
        const handleTouchMove = (e) => {
            if (!draggingRef.current) return;
            setHasMoved(true);
            const touch = e.touches[0];
            setPosition({
                x: touch.clientX - relRef.current.x,
                y: touch.clientY - relRef.current.y
            });
            if (e.cancelable) {
                e.preventDefault();
            }
            e.stopPropagation();
        };

        const handleTouchEnd = (e) => {
            draggingRef.current = false;
            // e.stopPropagation(); // Optional
        };

        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);

    // Mouse event listeners
    useEffect(() => {
        if (dragging) {
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        } else {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [dragging]);

    const handleMenuClick = ({ key }) => {
        if (key === 'close_floating_menu') {
            setVisible(false);
        } else {
            navigate(key);
        }
    };

    const menuItemsWithClose = [
        ...items,
        { type: 'divider' },
        {
            key: 'close_floating_menu',
            icon: <CloseOutlined />,
            label: '本次关闭',
            danger: true
        }
    ];

    const menu = (
        <Menu
            items={menuItemsWithClose}
            onClick={handleMenuClick}
        />
    );

    const handleChatClick = (e) => {
        e.stopPropagation();
        if (!hasMoved) {
            navigate('/friend/chat');
        }
    };

    if (!visible) return null;

    return (
        <div
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                zIndex: 1000,
                cursor: 'move',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
        >
            <Dropdown overlay={menu} trigger={['click']}>
                <Button
                    type="primary"
                    shape="default"
                    icon={<MenuOutlined style={{ fontSize: '20px' }} />}
                    style={{
                        width: '41px',
                        height: '41px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                        borderRadius: '4px 4px 0 0',
                        marginBottom: 0,
                        borderBottom: '1px solid rgba(255,255,255,0.3)'
                    }}
                />
            </Dropdown>
            <Button
                type="primary"
                icon={
                    <Badge count={unreadCount} size="small" offset={[5, -5]}>
                        <MessageOutlined style={{ fontSize: '12px', color: '#fff' }} />
                    </Badge>
                }
                onClick={handleChatClick}
                style={{
                    width: '41px',
                    height: '24px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                    borderRadius: '0 0 4px 4px',
                    padding: 0,
                    borderTop: 'none'
                }}
            />
        </div>
    );
};

export default FloatingMenu;
