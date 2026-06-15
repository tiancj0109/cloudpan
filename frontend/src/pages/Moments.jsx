import React, { useState, useEffect, useRef } from 'react';
import './Moments.css';
import { Layout, Avatar, Button, List, Image, Input, message, Dropdown, Menu, Popover, Modal, Radio, Select } from 'antd';
import { CameraOutlined, LikeOutlined, LikeFilled, CommentOutlined, UserOutlined, MoreOutlined, ArrowLeftOutlined, DeleteOutlined, ToolOutlined, BellOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import api from '../utils/api';
import PublishMoment from '../components/PublishMoment';
import UserProfileModal from '../components/UserProfileModal';
import { Badge, Drawer } from 'antd';

const { Header, Content } = Layout;
const ExpandableText = ({ content }) => {
    const [expanded, setExpanded] = useState(false);
    const [showToggle, setShowToggle] = useState(false);
    const contentRef = useRef(null);

    useEffect(() => {
        if (contentRef.current) {
            if (contentRef.current.scrollHeight > contentRef.current.clientHeight) {
                setShowToggle(true);
            }
        }
    }, [content]);

    return (
        <div style={{ marginBottom: 5 }}>
            <div
                ref={contentRef}
                style={{
                    fontSize: 15,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: expanded ? 'unset' : 6,
                    overflow: expanded ? 'visible' : 'hidden',
                }}
            >
                {content}
            </div>
            {showToggle && (
                <div
                    style={{ color: '#576b95', cursor: 'pointer', marginTop: 2, fontSize: 15 }}
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? '收起' : '全文'}
                </div>
            )}
        </div>
    );
};

const Moments = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const targetUserId = searchParams.get('userId');
    const targetMomentId = searchParams.get('momentId');

    const [moments, setMoments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [publishVisible, setPublishVisible] = useState(false);
    const [friends, setFriends] = useState([]);
    const [commentInputVisible, setCommentInputVisible] = useState(null); // momentId
    const [commentContent, setCommentContent] = useState('');
    const [replyTo, setReplyTo] = useState(null); // { userId, username }

    const [notificationsVisible, setNotificationsVisible] = useState(false);
    const [notifications, setNotifications] = useState([]);

    const { momentsNotificationData = { count: 0, latestAvatar: null }, refreshMomentsNotifications } = useOutletContext() || {};

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/moments/notifications');
            if (res.code === 200) setNotifications(res.data);
        } catch (e) { }
    };

    const handleOpenNotifications = async () => {
        setNotificationsVisible(true);
        fetchNotifications();
        if (momentsNotificationData.count > 0) {
            try {
                await api.post('/moments/notifications/read');
                if (refreshMomentsNotifications) refreshMomentsNotifications();
            } catch (e) { }
        }
    };

    const getDisplayUser = () => {
        if (!targetUserId) return currentUser;
        if (currentUser && String(currentUser.id) === String(targetUserId)) return currentUser;
        const friend = friends.find(f => {
            const fId = f.userId === currentUser?.id ? f.friendId : f.userId;
            return String(fId) === String(targetUserId);
        });
        if (friend) {
            return {
                id: targetUserId,
                username: friend.friendUsername,
                signature: friend.friendSignature
            };
        }
        return currentUser;
    };

    const displayUser = getDisplayUser();

    const scrollRef = useRef(null);

    useEffect(() => {
        fetchCurrentUser();
        fetchFriends();
    }, []);
    useEffect(() => {
        setMoments([]);
        setPage(1);
        setHasMore(true);
        fetchMoments(1);
    }, [targetUserId, targetMomentId]);

    const fetchCurrentUser = async () => {
        try {
            const res = await api.get('/auth/info');
            if (res.code === 200) setCurrentUser(res.data);
        } catch (e) { }
    };

    const fetchFriends = async () => {
        try {
            const res = await api.get('/friend/list');
            if (res.code === 200) setFriends(res.data);
        } catch (e) { }
    };

    const fetchMoments = async (pageNum) => {
        if (loading) return;
        setLoading(true);
        try {
            let url = `/moments/list?page=${pageNum}&pageSize=10`;
            if (targetUserId) {
                url += `&userId=${targetUserId}`;
            }
            if (targetMomentId) {
                url += `&momentId=${targetMomentId}`;
            }
            const res = await api.get(url);
            if (res.code === 200) {
                if (pageNum === 1) {
                    setMoments(res.data);
                } else {
                    setMoments(prev => [...prev, ...res.data]);
                }
                setHasMore(res.data.length === 10);
                setPage(pageNum);
            }
        } catch (e) {
            // Mock data for testing if API fails
            // console.error(e);
            // if (pageNum === 1) setMoments(mockMoments);
        } finally {
            setLoading(false);
        }
    };

    // const handleScroll = (e) => {
    //     const { scrollTop, clientHeight, scrollHeight } = e.target;
    //     if (scrollHeight - scrollTop === clientHeight && hasMore && !loading) {
    //         fetchMoments(page + 1);
    //     }
    // };

    const handleLike = async (moment) => {
        try {
            const isLiked = moment.likes.some(l => l.userId === currentUser.id);
            const url = isLiked ? '/moments/unlike' : '/moments/like';
            await api.post(url, { momentId: moment.id });

            // Optimistic update
            setMoments(prev => prev.map(m => {
                if (m.id === moment.id) {
                    const newLikes = isLiked
                        ? m.likes.filter(l => l.userId !== currentUser.id)
                        : [...m.likes, { userId: currentUser.id, username: currentUser.username }];
                    return { ...m, likes: newLikes };
                }
                return m;
            }));
        } catch (e) { message.error('操作失败'); }
    };

    const [editCommentModalVisible, setEditCommentModalVisible] = useState(false);
    const [editingComment, setEditingComment] = useState(null);
    const [editCommentContent, setEditCommentContent] = useState('');
    const longPressTimer = useRef(null);

    const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);
    const [editingMoment, setEditingMoment] = useState(null);
    const [visibility, setVisibility] = useState('PUBLIC');
    const [selectedFriends, setSelectedFriends] = useState([]);

    const openVisibilityModal = (moment) => {
        setEditingMoment(moment);
        setVisibility(moment.visibility || 'PUBLIC');
        // Ideally we should fetch current visibility settings for this moment, 
        // but for now we'll just default to empty selected friends or need an API to fetch them.
        // Since the requirement is simple, we might just let them reset it.
        setSelectedFriends([]);
        setVisibilityModalVisible(true);
    };

    const handleUpdateVisibility = async () => {
        if (!editingMoment) return;
        try {
            const res = await api.post('/moments/updateVisibility', {
                momentId: editingMoment.id,
                visibility,
                visibleUserIds: JSON.stringify(selectedFriends)
            });
            if (res.code === 200) {
                message.success('修改权限成功');
                setVisibilityModalVisible(false);
                setEditingMoment(null);
                fetchMoments(1);
            }
        } catch (e) { message.error('修改权限失败'); }
    };

    const handleComment = async (momentId) => {
        if (!commentContent.trim()) return;
        try {
            await api.post('/moments/comment', {
                momentId,
                content: commentContent,
                replyToUserId: replyTo?.userId
            });
            message.success('评论成功');
            setCommentContent('');
            setCommentInputVisible(null);
            setReplyTo(null);
            // Refresh specific moment or optimistic update (complex for comments)
            fetchMoments(1); // Simple refresh for now
        } catch (e) { message.error('评论失败'); }
    };

    const startPress = (comment) => {
        longPressTimer.current = setTimeout(() => {
            showCommentActions(comment);
        }, 800);
    };

    const cancelPress = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const showCommentActions = (comment) => {
        const isMyComment = currentUser && comment.userId === currentUser.id;
        
        Modal.confirm({
            title: isMyComment ? '操作' : '评论详情',
            content: (
                <div>
                    <div style={{ marginBottom: 10 }}>
                        <span style={{ color: '#999' }}>回复时间:</span> {renderTime(comment.createdAt)}
                    </div>
                    {isMyComment && <div>请选择操作</div>}
                </div>
            ),
            closable: true,
            maskClosable: true,
            footer: isMyComment ? (
                <div style={{ textAlign: 'right', marginTop: 10 }}>
                    <Button onClick={() => { Modal.destroyAll(); handleDeleteComment(comment); }} danger style={{ marginRight: 8 }}>删除</Button>
                    <Button onClick={() => { Modal.destroyAll(); openEditComment(comment); }} type="primary">修改</Button>
                </div>
            ) : (
                <div style={{ textAlign: 'right', marginTop: 10 }}>
                    <Button onClick={() => Modal.destroyAll()}>知道了</Button>
                </div>
            )
        });
    };

    const handleDeleteComment = async (comment) => {
        try {
            const res = await api.post('/moments/comment/delete', { commentId: comment.id });
            if (res.code === 200) {
                message.success('删除成功');
                fetchMoments(1);
            }
        } catch (e) { message.error('删除失败'); }
    };

    const openEditComment = (comment) => {
        setEditingComment(comment);
        setEditCommentContent(comment.content);
        setEditCommentModalVisible(true);
    };

    const handleUpdateComment = async () => {
        if (!editCommentContent.trim()) return;
        try {
            const res = await api.post('/moments/comment/update', {
                commentId: editingComment.id,
                content: editCommentContent
            });
            if (res.code === 200) {
                message.success('修改成功');
                setEditCommentModalVisible(false);
                setEditingComment(null);
                fetchMoments(1);
            }
        } catch (e) { message.error('修改失败'); }
    };

    const renderMedia = (moment) => {
        if (moment.mediaType === 'NONE' || !moment.media || moment.media.length === 0) return null;

        if (moment.mediaType === 'VIDEO') {
            let videoFile = moment.media;
            if (typeof videoFile === 'string') {
                try {
                    const parsed = JSON.parse(videoFile);
                    if (Array.isArray(parsed) && parsed.length > 0) videoFile = parsed[0];
                } catch (e) { }
            } else if (Array.isArray(videoFile) && videoFile.length > 0) {
                videoFile = videoFile[0];
            }

            return (
                <div style={{ marginTop: 10, maxWidth: 300 }}>
                    <video
                        controls
                        style={{ width: '100%', borderRadius: 4, maxHeight: 400 }}
                        preload="none"
                        poster={`${api.defaults.baseURL}/moments/file/thumb_${videoFile}.jpg`}
                    >
                        <source src={`${api.defaults.baseURL}/moments/file/${videoFile}`} type="video/mp4" />
                    </video>
                </div>
            );
        }

        // Image Grid Logic
        let images = moment.media;
        if (typeof images === 'string') {
            try {
                images = JSON.parse(images);
            } catch (e) {
                images = [];
            }
        }
        if (!Array.isArray(images)) images = [];

        const count = images.length;

        let gridStyle = {
            display: 'grid',
            gap: 5,
            marginTop: 10,
            width: '100%'
        };

        if (count === 1) {
            return (
                <div style={{ marginTop: 10 }}>
                    <Image
                        src={`${api.defaults.baseURL}/moments/file/thumb_${images[0]}`}
                        preview={{
                            src: `${api.defaults.baseURL}/moments/file/${images[0]}`
                        }}
                        style={{ maxWidth: 200, maxHeight: 200, objectFit: 'contain', borderRadius: 4 }}
                        fallback="https://via.placeholder.com/150"
                    />
                </div>
            );
        } else if (count === 2 || count === 4) {
            gridStyle.gridTemplateColumns = `repeat(2, 1fr)`;
            gridStyle.maxWidth = 200;
        } else {
            gridStyle.gridTemplateColumns = `repeat(3, 1fr)`;
            gridStyle.maxWidth = 300;
        }

        return (
            <div style={gridStyle}>
                <Image.PreviewGroup>
                    {images.map((img, idx) => (
                        <div key={idx} style={{ width: '100%', aspectRatio: '1 / 1', overflow: 'hidden', background: '#f0f0f0' }}>
                            <Image
                                width="100%"
                                height="100%"
                                src={`${api.defaults.baseURL}/moments/file/thumb_${img}`}
                                preview={{
                                    src: `${api.defaults.baseURL}/moments/file/${img}`
                                }}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                fallback="https://via.placeholder.com/150"
                            />
                        </div>
                    ))}
                </Image.PreviewGroup>
            </div>
        );
    };

    const renderTime = (timeStr) => {
        if (!timeStr) return '';
        const date = new Date(timeStr);
        const now = new Date();
        const diff = now - date;

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const exactTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
        
        return exactTime;
    };

    const [userProfileVisible, setUserProfileVisible] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);

    const handleUserClick = (userId) => {
        setSelectedUserId(userId);
        setUserProfileVisible(true);
    };

    return (
        <Layout style={{ height: '100vh', background: '#fff' }}>
            <div
                style={{
                    height: '100%',
                    overflowY: 'auto',
                    position: 'relative'
                }}
                onScroll={null}
                ref={scrollRef}
            >
                {/* Cover Area */}
                <div style={{ position: 'relative', height: 300, marginBottom: 40 }}>
                    <div
                        style={{
                            height: '100%',
                            background: 'url("https://picsum.photos/800/600") center/cover no-repeat',
                            // Parallax could be added here
                        }}
                    />
                    <div style={{ position: 'absolute', bottom: -30, right: 20, display: 'flex', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: 10, marginBottom: 10, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>{displayUser?.username}</div>
                            <div style={{ color: '#eee', fontSize: 12, marginTop: 4 }}>{displayUser?.signature || '骚话吧'}</div>
                        </div>
                        <Avatar
                            src={displayUser?.id ? `/cloudpan-api/auth/avatar/${displayUser.id}` : null}
                            icon={<UserOutlined />}
                            size={70}
                            shape="square"
                            style={{ border: '2px solid #fff', cursor: 'pointer' }}
                            onClick={() => displayUser?.id && navigate(`/moments?userId=${displayUser.id}`)}
                        />
                    </div>
                    <div style={{ position: 'absolute', top: 20, left: 20 }}>
                        <Button
                            icon={<ArrowLeftOutlined style={{ color: '#fff', fontSize: 20 }} />}
                            type="text"
                            onClick={() => navigate(-1)}
                        />
                    </div>
                    <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 15 }}>
                        <Badge count={momentsNotificationData.count} size="small">
                            <Button
                                icon={<BellOutlined style={{ color: '#fff', fontSize: 24 }} />}
                                type="text"
                                onClick={handleOpenNotifications}
                            />
                        </Badge>
                        <Button
                            icon={<CameraOutlined style={{ color: '#fff', fontSize: 24 }} />}
                            type="text"
                            onClick={() => setPublishVisible(true)}
                        />
                    </div>
                </div>

                {/* Notification Bar (WeChat Style) */}
                {momentsNotificationData.count > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: -30, marginBottom: 20, position: 'relative', zIndex: 1 }}>
                        <div
                            onClick={handleOpenNotifications}
                            style={{
                                background: '#333',
                                borderRadius: 5,
                                padding: '5px 15px 5px 5px',
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                color: '#fff',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                            }}
                        >
                            <Avatar
                                src={momentsNotificationData.latestAvatar ? `/cloudpan-api/auth/avatar/${momentsNotificationData.latestAvatar}` : null}
                                icon={<UserOutlined />}
                                shape="square"
                                size={30}
                                style={{ marginRight: 10 }}
                            />
                            <span style={{ fontSize: 14 }}>{momentsNotificationData.count}条新消息</span>
                        </div>
                    </div>
                )}

                {/* Feed List */}
                <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 20px' }}>
                    {moments.map(moment => (
                        <div key={moment.id} className="moment-item" style={{ marginBottom: 30, borderBottom: '1px solid #f0f0f0', paddingBottom: 20 }}>
                            <div style={{ display: 'flex' }}>
                                <Avatar
                                    src={`/cloudpan-api/auth/avatar/${moment.userId}`}
                                    icon={<UserOutlined />}
                                    shape="square"
                                    size={40}
                                    style={{ marginRight: 15, cursor: 'pointer', flexShrink: 0 }}
                                    onClick={() => handleUserClick(moment.userId)}
                                />
                                <div style={{ flex: 1 }}>
                                    <div
                                        style={{ color: '#576b95', fontWeight: 'bold', marginBottom: 5, cursor: 'pointer' }}
                                        onClick={() => handleUserClick(moment.userId)}
                                    >
                                        {moment.username}
                                    </div>
                                    <ExpandableText content={moment.content} />

                                    {renderMedia(moment)}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <span style={{ fontSize: 12, color: '#999' }}>{renderTime(moment.createdAt)}</span>
                                            {currentUser && moment.userId === currentUser.id && (
                                                <Button
                                                    type="text"
                                                    danger
                                                    size="small"
                                                    icon={<DeleteOutlined />}
                                                    style={{ marginLeft: 10, padding: 0, height: 'auto', lineHeight: 1 }}
                                                    onClick={() => {
                                                        Modal.confirm({
                                                            title: '确认删除',
                                                            content: '确定要删除这条动态吗？删除后无法恢复。',
                                                            onOk: async () => {
                                                                try {
                                                                    const res = await api.post('/moments/delete', { momentId: moment.id });
                                                                    if (res.code === 200) {
                                                                        message.success('删除成功');
                                                                        setMoments(prev => prev.filter(m => m.id !== moment.id));
                                                                    }
                                                                } catch (e) {
                                                                    message.error('删除失败');
                                                                }
                                                            }
                                                        });
                                                    }}
                                                />
                                            )}
                                            {currentUser && moment.userId === currentUser.id && (
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<ToolOutlined />}
                                                    style={{ marginLeft: 10, padding: 0, height: 'auto', lineHeight: 1, color: '#576b95' }}
                                                    onClick={() => openVisibilityModal(moment)}
                                                />
                                            )}
                                        </div>

                                        <Popover
                                            content={
                                                <div style={{ display: 'flex', background: '#4c4c4c', borderRadius: 4 }}>
                                                    <Button
                                                        type="text"
                                                        icon={moment.likes.some(l => l.userId === currentUser?.id) ? <LikeFilled /> : <LikeOutlined />}
                                                        style={{ color: '#fff', width: 80 }}
                                                        onClick={() => handleLike(moment)}
                                                    >
                                                        {moment.likes.some(l => l.userId === currentUser?.id) ? '取消' : '赞'}
                                                    </Button>
                                                    <div style={{ width: 1, background: '#333' }} />
                                                    <Button
                                                        type="text"
                                                        icon={<CommentOutlined />}
                                                        style={{ color: '#fff', width: 80 }}
                                                        onClick={() => {
                                                            setCommentInputVisible(moment.id);
                                                            setReplyTo(null);
                                                        }}
                                                    >
                                                        评论
                                                    </Button>
                                                </div>
                                            }
                                            trigger="click"
                                            placement="left"
                                            overlayInnerStyle={{ padding: 0, background: 'transparent' }}
                                        >
                                            <div style={{ background: '#f7f7f7', padding: '0 8px', borderRadius: 4, cursor: 'pointer' }}>
                                                <MoreOutlined style={{ color: '#576b95', fontSize: 18 }} />
                                            </div>
                                        </Popover>
                                    </div>
                                </div>
                            </div>

                            {/* Likes & Comments Area */}
                            {(moment.likes.length > 0 || moment.comments.length > 0) && (
                                <div style={{ background: '#f7f7f7', marginTop: 10, borderRadius: 4, padding: '5px 10px' }}>
                                    {moment.likes.length > 0 && (
                                        <div style={{ borderBottom: moment.comments.length > 0 ? '1px solid #eee' : 'none', paddingBottom: 5, marginBottom: 5 }}>
                                            <LikeOutlined style={{ color: '#576b95', marginRight: 5 }} />
                                            {moment.likes.map((like, idx) => (
                                                <span
                                                    key={like.userId}
                                                    style={{ color: '#576b95', fontWeight: 'bold', cursor: 'pointer' }}
                                                    onClick={() => handleUserClick(like.userId)}
                                                >
                                                    {like.username}
                                                    {idx < moment.likes.length - 1 ? ', ' : ''}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {moment.comments.map(comment => (
                                        <div
                                            key={comment.id}
                                            style={{ marginBottom: 4, userSelect: 'none', wordBreak: 'break-all', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
                                            onTouchStart={() => startPress(comment)}
                                            onTouchEnd={cancelPress}
                                            onMouseDown={() => startPress(comment)}
                                            onMouseUp={cancelPress}
                                            onMouseLeave={cancelPress}
                                            onClick={() => {
                                                if (comment.userId !== currentUser?.id) {
                                                    setCommentInputVisible(moment.id);
                                                    setReplyTo({ userId: comment.userId, username: comment.username });
                                                }
                                            }}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <span
                                                    style={{ color: '#576b95', fontWeight: 'bold', cursor: 'pointer' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUserClick(comment.userId);
                                                    }}
                                                >
                                                    {comment.username}
                                                </span>
                                                {comment.replyToUsername && (
                                                    <>
                                                        <span style={{ color: '#333' }}> 回复 </span>
                                                        <span
                                                            style={{ color: '#576b95', fontWeight: 'bold', cursor: 'pointer' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUserClick(comment.replyToUserId);
                                                            }}
                                                        >
                                                            {comment.replyToUsername}
                                                        </span>
                                                    </>
                                                )}
                                                <span style={{ color: '#333' }}>: {comment.content}</span>
                                            </div>
                                            {comment.createdAt && (
                                                <div 
                                                    style={{ color: '#999', fontSize: 13, marginLeft: 8, flexShrink: 0, marginTop: 2, padding: '0 5px', cursor: 'pointer' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        showCommentActions(comment);
                                                    }}
                                                >
                                                    <ClockCircleOutlined />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {commentInputVisible === moment.id && (
                                <div style={{ marginTop: 10, display: 'flex' }}>
                                    <Input
                                        placeholder={replyTo ? `回复 ${replyTo.username}:` : '评论...'}
                                        value={commentContent}
                                        onChange={e => setCommentContent(e.target.value)}
                                        onPressEnter={() => handleComment(moment.id)}
                                    />
                                    <Button type="primary" style={{ marginLeft: 8 }} onClick={() => handleComment(moment.id)}>发送</Button>
                                </div>
                            )}
                        </div>
                    ))}
                    {hasMore ? (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <Button
                                className="load-more-btn"
                                onClick={() => fetchMoments(page + 1)}
                                loading={loading}
                                type="default"
                                shape="round"
                            >
                                加载更多动态
                            </Button>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>没有更多了</div>
                    )}
                </div>
            </div>

            <PublishMoment
                visible={publishVisible}
                onCancel={() => setPublishVisible(false)}
                onSuccess={() => {
                    setPublishVisible(false);
                    fetchMoments(1);
                }}
                friends={friends}
            />

            <Modal
                title="修改评论"
                visible={editCommentModalVisible}
                onOk={handleUpdateComment}
                onCancel={() => {
                    setEditCommentModalVisible(false);
                    setEditingComment(null);
                }}
            >
                <Input.TextArea
                    rows={4}
                    value={editCommentContent}
                    onChange={e => setEditCommentContent(e.target.value)}
                />
            </Modal>

            <Modal
                title="修改查看权限"
                visible={visibilityModalVisible}
                onOk={handleUpdateVisibility}
                onCancel={() => {
                    setVisibilityModalVisible(false);
                    setEditingMoment(null);
                }}
            >
                <div style={{ marginBottom: 15 }}>
                    <Radio.Group value={visibility} onChange={e => setVisibility(e.target.value)}>
                        <Radio value="PUBLIC">公开</Radio>
                        <Radio value="PRIVATE">仅自己可见</Radio>
                        <Radio value="FRIENDS">仅好友可见</Radio>
                        <Radio value="PARTIAL">部分好友可见</Radio>
                        <Radio value="EXCLUDE">不给谁看</Radio>
                    </Radio.Group>
                </div>
                {(visibility === 'PARTIAL' || visibility === 'EXCLUDE') && (
                    <Select
                        mode="multiple"
                        style={{ width: '100%' }}
                        placeholder="选择好友"
                        value={selectedFriends}
                        onChange={setSelectedFriends}
                        optionFilterProp="children"
                    >
                        {friends.map(friend => (
                            <Select.Option key={friend.friendId} value={friend.friendId}>
                                {friend.friendUsername}
                            </Select.Option>
                        ))}
                    </Select>
                )}
            </Modal>

            <UserProfileModal
                visible={userProfileVisible}
                onClose={() => setUserProfileVisible(false)}
                userId={selectedUserId}
                currentUserId={currentUser?.id}
                friends={friends}
            />

            <Drawer
                title="消息通知"
                placement="right"
                onClose={() => setNotificationsVisible(false)}
                open={notificationsVisible}
                width={320}
            >
                <List
                    itemLayout="horizontal"
                    dataSource={notifications}
                    renderItem={item => (
                        <List.Item
                            style={{ cursor: 'pointer', transition: 'background 0.3s' }}
                            className="notification-item"
                            onClick={() => {
                                setNotificationsVisible(false);
                                navigate(`/moments?momentId=${item.momentId}`);
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                        >
                            <List.Item.Meta
                                avatar={<Avatar src={`/cloudpan-api/auth/avatar/${item.senderId}`} icon={<UserOutlined />} />}
                                title={
                                    <span>
                                        <span style={{ fontWeight: 'bold' }}>{item.senderName}</span>
                                        <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>{renderTime(item.createdAt)}</span>
                                    </span>
                                }
                                description={
                                    <div>
                                        {item.type === 'LIKE' && <span>赞了你的动态</span>}
                                        {item.type === 'COMMENT' && <span>评论了你: {item.content}</span>}
                                        {item.type === 'REPLY' && <span>回复了你: {item.content}</span>}
                                        {item.momentContent ? (
                                            <div style={{ background: '#f5f5f5', padding: 5, marginTop: 5, fontSize: 12, color: '#666', borderRadius: 4 }}>
                                                {item.momentContent}
                                            </div>
                                        ) : (item.momentImage && (
                                            <div style={{ background: '#f5f5f5', padding: 5, marginTop: 5, fontSize: 12, color: '#666', borderRadius: 4 }}>
                                                [图片]
                                            </div>
                                        ))}
                                    </div>
                                }
                            />
                            {(() => {
                                let images = [];
                                try {
                                    images = JSON.parse(item.momentImage);
                                } catch (e) { }

                                if (Array.isArray(images) && images.length > 0) {
                                    const file = images[0];
                                    const isVideo = file.toLowerCase().match(/\.(mp4|mov|avi|wmv|flv|mkv)$/);
                                    const thumbUrl = `${api.defaults.baseURL}/moments/file/thumb_${file}${isVideo ? '.jpg' : ''}`;

                                    return (
                                        <div style={{ position: 'relative', width: 50, height: 50 }}>
                                            <Image
                                                src={thumbUrl}
                                                width={50}
                                                height={50}
                                                style={{ objectFit: 'cover', borderRadius: 4 }}
                                                preview={false}
                                                fallback="error_image_placeholder" // Optional: we have backend fallback now
                                            />
                                            {isVideo && (
                                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: 4 }}>
                                                    <span style={{ color: '#fff', fontSize: 20 }}>▶</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </List.Item>
                    )}
                />
            </Drawer>
        </Layout >
    );
};

export default Moments;
