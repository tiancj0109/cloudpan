import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import './FriendChat.css';
import { Layout, List, Avatar, Input, Button, Upload, message, Dropdown, Menu, Modal, Image, Tabs, Badge, Drawer, Progress, Popover, Spin } from 'antd';
import { UserOutlined, SendOutlined, PictureOutlined, VideoCameraOutlined, AudioOutlined, MoreOutlined, FileImageOutlined, PaperClipOutlined, FileOutlined, ArrowLeftOutlined, TeamOutlined, PlusOutlined, DeleteOutlined, SettingOutlined, UploadOutlined, LoadingOutlined, EyeOutlined, DownloadOutlined, PhoneOutlined, SearchOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import api from '../utils/api';
import usePageNotification from '../hooks/usePageNotification';
import UserProfileModal from '../components/UserProfileModal';
const { Sider, Content } = Layout;
const { TextArea } = Input;

const RequestSpinner = () => <LoadingOutlined style={{ fontSize: 24 }} spin />;

const FriendChat = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { momentsNotificationData } = useOutletContext();
    const [friends, setFriends] = useState([]);
    const [groups, setGroups] = useState([]);
    const [activeFriend, setActiveFriend] = useState(null);
    const [activeGroup, setActiveGroup] = useState(null);
    const [activeTab, setActiveTab] = useState('friend'); // 'friend' for friend, 'group' for group
    const [createGroupVisible, setCreateGroupVisible] = useState(false);
    const [groupName, setGroupName] = useState('');

    // State for Chat Search
    const [chatSearchVisible, setChatSearchVisible] = useState(false);
    const [chatSearchKeyword, setChatSearchKeyword] = useState('');
    const [chatSearchResults, setChatSearchResults] = useState([]);
    const [chatSearchLoading, setChatSearchLoading] = useState(false);

    // State for File Management
    const [fileManageVisible, setFileManageVisible] = useState(false);
    const [fileManageList, setFileManageList] = useState([]);
    const [fileManageLoading, setFileManageLoading] = useState(false);

    // State for Global Search
    const [globalSearchVisible, setGlobalSearchVisible] = useState(false);
    const [globalSearchKeyword, setGlobalSearchKeyword] = useState('');
    const [globalSearchResults, setGlobalSearchResults] = useState([]);
    const [globalSearchLoading, setGlobalSearchLoading] = useState(false);

    // console.log('FriendChat Render, Location:', location);

    // Inject styles for HTML content
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            .html-content img, .html-content video {
                max-width: 100% !important;
                height: auto !important;
                border-radius: 4px;
            }
            .html-content iframe {
                max-width: 100% !important;
                border: none;
                border-radius: 4px;
            }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    const [selectedFriends, setSelectedFriends] = useState([]);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [polling, setPolling] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const messagesEndRef = useRef(null);
    const lastMessageIdRef = useRef(0);
    const lastSyncTimeRef = useRef(0);
    const pollingIntervalRef = useRef(null);

    const [recording, setRecording] = useState(false);
    const [isSending, setIsSending] = useState(false); // New sending state
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [emojiVisible, setEmojiVisible] = useState(false);
    const [replyMessage, setReplyMessage] = useState(null);
    const [uploadingMessages, setUploadingMessages] = useState({});
    const [membersVisible, setMembersVisible] = useState(false);
    const [groupMembers, setGroupMembers] = useState([]);
    const [inviteVisible, setInviteVisible] = useState(false);
    const [inviteSelected, setInviteSelected] = useState([]);
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [settingsName, setSettingsName] = useState('');
    const [settingsNotice, setSettingsNotice] = useState('');
    const [settingsAvatar, setSettingsAvatar] = useState(null);

    const [profileModalVisible, setProfileModalVisible] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [quoteModalVisible, setQuoteModalVisible] = useState(false);
    const [quoteContent, setQuoteContent] = useState(null);

    const [unreadCounts, setUnreadCounts] = useState({ friendUnread: 0, groupUnread: 0, groupCounts: {} });
    const [callProvider, setCallProvider] = useState(localStorage.getItem('callProvider') || 'jitsi');
    const [callTrayVisible, setCallTrayVisible] = useState(false);
    const CALL_INVITE_PREFIX = '[CALL_INVITE]';

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const payload = JSON.parse(jsonPayload);
                setCurrentUserId(payload.id);
            } catch (e) {
                console.error("Failed to parse token", e);
            }
        }

        // Initial fetch
        fetchFriends();
        fetchGroups();

        // Poll lists and unread counts
        // We continue polling even if activeFriend/activeGroup is set, so sidebar updates
        const interval = setInterval(() => {
            fetchFriends();
            fetchGroups();
        }, 5000);

        return () => {
            stopPolling();
            clearInterval(interval);
        };
    }, [activeFriend, activeGroup]); // Re-run if active chat changes? Actually we want the interval to persist or be recreated. 
    // If we include activeFriend/activeGroup in dependency, it resets interval on chat switch. That's fine.
    // But wait, if we are typing, we don't want to re-render everything.
    // Actually, fetchFriends/Groups updates state only if changed? No, it sets state.
    // React batching should handle it, but frequent updates might cause flickers if not careful.
    // But for now, let's stick to this.

    // Note: The previous logic had `if (activeFriend || activeGroup) return;` which stopped list updates.
    // We removed it to allow sidebar updates (unread counts, new messages).

    // Sync Hash to Active Chat
    useEffect(() => {
        if (activeFriend) {
            const hash = `#${encodeURIComponent(activeFriend.friendUsername)}`;
            const url = `?${hash}`;
            // If current hash is different, push new state (so back button works)
            if (window.location.hash !== hash) {
                navigate(url);
            }
        } else if (activeGroup) {
            const hash = `#${encodeURIComponent(activeGroup.name)}`;
            const url = `?${hash}`;
            if (window.location.hash !== hash) {
                navigate(url);
            }
        }
    }, [activeFriend, activeGroup, navigate]);

    // Calculate unread counts from friends and groups lists
    useEffect(() => {
        let friendUnread = 0;
        let groupUnread = 0;
        const groupCounts = {};

        friends.forEach(f => {
            friendUnread += (f.unreadCount || 0);
        });

        groups.forEach(g => {
            const count = g.unreadCount || 0;
            if (count > 0) {
                groupUnread += count;
                groupCounts[g.id] = count;
            }
        });

        setUnreadCounts({
            friendUnread,
            groupUnread,
            groupCounts,
            total: friendUnread + groupUnread
        });

        // Handle Hash Navigation
        try {
            const rawHash = location.hash;
            if (rawHash && rawHash.length > 1) {
                const hash = decodeURIComponent(rawHash.substring(1)).trim(); // Remove # and trim
                // console.log('Hash Navigation Debug:', { rawHash, hash, friendsCount: friends.length, groupsCount: groups.length });

                if (hash) {
                    // Try to find in friends (match username or remark/nickname if exists)
                    const targetFriend = friends.find(f => f.friendUsername === hash || (f.remark && f.remark === hash));
                    if (targetFriend) {
                        // console.log('Found target friend:', targetFriend);
                        if (!activeFriend || activeFriend.id !== targetFriend.id) {
                            setActiveTab('friend');
                            setActiveFriend(targetFriend);
                            setActiveGroup(null);
                        }
                        return;
                    }

                    // Try to find in groups
                    const targetGroup = groups.find(g => g.name === hash);
                    if (targetGroup) {
                        // console.log('Found target group:', targetGroup);
                        if (!activeGroup || activeGroup.id !== targetGroup.id) {
                            setActiveTab('group');
                            setActiveGroup(targetGroup);
                            setActiveFriend(null);
                        }
                        return;
                    }
                    // console.log('No matching friend or group found for hash:', hash);
                }
            } else {
                // Empty hash means back to list (if currently in chat)
                if (activeFriend || activeGroup) {
                    setActiveFriend(null);
                    setActiveGroup(null);
                }
            }
        } catch (e) {
            // console.error('Hash navigation error:', e);
        }
    }, [friends, groups, location.hash]);



    // Update Browser Tab (Title & Favicon)
    usePageNotification(unreadCounts.total);



    const getFriendId = (friend) => {
        if (!friend || !currentUserId) return null;
        return friend.userId === currentUserId ? friend.friendId : friend.userId;
    };
    useEffect(() => {
        if ((activeFriend || activeGroup) && currentUserId) {
            setMessages([]);
            setPage(1);
            setHasMore(true);
            lastMessageIdRef.current = 0;
            lastSyncTimeRef.current = 0;

            if (activeFriend) {
                const friendId = getFriendId(activeFriend);
                if (friendId) {
                    fetchHistory(friendId, null, 1);
                    startPolling();
                    markAsRead(friendId);
                }
            } else if (activeGroup) {
                fetchHistory(null, activeGroup.id, 1);
                startPolling();
                markGroupAsRead(activeGroup.id);
            }
        } else {
            stopPolling();
        }
        return () => stopPolling();
    }, [activeFriend, activeGroup, currentUserId]);

    const markAsRead = async (friendId) => {
        try {
            await api.post('/chat/markRead', { friendId });
            // Update local friend list to clear badge
            setFriends(prev => prev.map(f => {
                if (getFriendId(f) === friendId) {
                    return { ...f, unreadCount: 0 };
                }
                return f;
            }));
        } catch (e) { }
    };

    const markGroupAsRead = async (groupId) => {
        try {
            await api.post('/chat/markGroupRead', { groupId });
            setGroups(prev => prev.map(g => {
                if (g.id === groupId) {
                    return { ...g, unreadCount: 0 };
                }
                return g;
            }));
        } catch (e) { }
    };

    const fetchFriends = async () => {
        try {
            const res = await api.get('/friend/list');
            if (res.code === 200) setFriends(res.data);
        } catch (err) { }
    };

    const fetchGroups = async () => {
        try {
            const res = await api.get('/group/list');
            if (res.code === 200) setGroups(res.data);
        } catch (err) { }
    };

    const handleSearchChat = async (keyword) => {
        if (!keyword || !keyword.trim()) return;
        setChatSearchLoading(true);
        try {
            let url = `/chat/search?keyword=${encodeURIComponent(keyword.trim())}`;
            if (activeFriend) url += `&friendId=${getFriendId(activeFriend)}`;
            if (activeGroup) url += `&groupId=${activeGroup.id}`;
            const res = await api.get(url);
            if (res.code === 200) {
                setChatSearchResults(res.data);
            }
        } catch (e) {
            message.error('搜索失败');
        } finally {
            setChatSearchLoading(false);
        }
    };

    const handleLoadFiles = async () => {
        setFileManageLoading(true);
        try {
            let url = '/chat/files?';
            if (activeFriend) url += `friendId=${getFriendId(activeFriend)}`;
            if (activeGroup) url += `groupId=${activeGroup.id}`;
            const res = await api.get(url);
            if (res.code === 200) {
                setFileManageList(res.data);
            }
        } catch (e) {
            message.error('加载文件失败');
        } finally {
            setFileManageLoading(false);
        }
    };

    const handleGlobalSearch = async (keyword) => {
        if (!keyword || !keyword.trim()) {
            setGlobalSearchResults([]);
            return;
        }
        setGlobalSearchLoading(true);
        try {
            const res = await api.get(`/chat/searchAll?keyword=${encodeURIComponent(keyword.trim())}`);
            if (res.code === 200) {
                setGlobalSearchResults(res.data);
            }
        } catch (e) {
            message.error('全局搜索失败');
        } finally {
            setGlobalSearchLoading(false);
        }
    };

    const fetchHistory = async (friendId, groupId, pageNum = 1) => {
        try {
            setLoadingHistory(true);
            let url = `/chat/history?page=${pageNum}&pageSize=10`;
            if (friendId) url += `&friendId=${friendId}`;
            if (groupId) url += `&groupId=${groupId}`;
            const res = await api.get(url);
            if (res.code === 200) {
                const sorted = res.data.reverse();
                if (pageNum === 1) {
                    setMessages(sorted);
                    if (sorted.length > 0) {
                        lastMessageIdRef.current = sorted[sorted.length - 1].id;
                    }
                    lastSyncTimeRef.current = Date.now(); // Initialize sync time
                    setTimeout(scrollToBottom, 100);
                } else {
                    setMessages(prev => [...sorted, ...prev]);
                }
                setHasMore(sorted.length === 10);
            }
        } catch (err) { } finally {
            setLoadingHistory(false);
        }
    };

    const chatContentRef = useRef(null);
    const [prevScrollHeight, setPrevScrollHeight] = useState(0);

    // Save scroll height before loading history to restore position
    useEffect(() => {
        if (loadingHistory && chatContentRef.current) {
            setPrevScrollHeight(chatContentRef.current.scrollHeight);
        }
    }, [loadingHistory]);

    // Restore scroll position after history loaded
    useLayoutEffect(() => {
        if (!loadingHistory && prevScrollHeight > 0 && chatContentRef.current) {
            const currentScrollHeight = chatContentRef.current.scrollHeight;
            const scrollDiff = currentScrollHeight - prevScrollHeight;

            // Temporarily disable smooth scrolling to instantly jump to position
            chatContentRef.current.style.scrollBehavior = 'auto';
            chatContentRef.current.scrollTop = scrollDiff;

            // Restore smooth scrolling after a small delay to ensure render apply
            setTimeout(() => {
                if (chatContentRef.current) {
                    chatContentRef.current.style.scrollBehavior = 'smooth';
                }
            }, 50);

            setPrevScrollHeight(0);
        }
    }, [loadingHistory, messages]); // Depend on messages update

    const handleScroll = (e) => {
        const { scrollTop } = e.target;
        if (scrollTop === 0 && hasMore && !loadingHistory) {
            const nextPage = page + 1;
            setPage(nextPage);
            if (activeFriend) {
                fetchHistory(getFriendId(activeFriend), null, nextPage);
            } else if (activeGroup) {
                fetchHistory(null, activeGroup.id, nextPage);
            }
        }
    };

    // Keep handleLoadMore for manual trigger if needed, or remove usage
    const handleLoadMore = () => {
        if (!hasMore || loadingHistory) return;
        const nextPage = page + 1;
        setPage(nextPage);
        if (activeFriend) {
            fetchHistory(getFriendId(activeFriend), null, nextPage);
        } else if (activeGroup) {
            fetchHistory(null, activeGroup.id, nextPage);
        }
    };

    const startPolling = () => {
        stopPolling();
        setPolling(true);
        pollingIntervalRef.current = setInterval(async () => {
            if (!activeFriend && !activeGroup || !currentUserId) return;
            try {
                let url = `/chat/poll?lastMessageId=${lastMessageIdRef.current}&lastSyncTime=${lastSyncTimeRef.current || 0}`;
                if (activeFriend) url += `&friendId=${getFriendId(activeFriend)}`;
                if (activeGroup) url += `&groupId=${activeGroup.id}`;

                const res = await api.get(url);
                if (res.code === 200 && res.data.length > 0) {
                    setMessages(prev => {
                        let newMessages = [...prev];
                        let hasChanges = false;

                        res.data.forEach(msg => {
                            const index = newMessages.findIndex(m => m.id === msg.id);
                            if (index !== -1) {
                                // Update existing message (e.g. recall)
                                if (newMessages[index].status !== msg.status || newMessages[index].content !== msg.content) {
                                    newMessages[index] = { ...newMessages[index], ...msg };
                                    hasChanges = true;
                                }
                            } else {
                                // Append new message
                                newMessages.push(msg);
                                hasChanges = true;
                            }
                        });

                        return hasChanges ? newMessages : prev;
                    });

                    // Update lastMessageId only for new messages at the end
                    const lastMsg = res.data[res.data.length - 1];
                    if (lastMsg.id > lastMessageIdRef.current) {
                        lastMessageIdRef.current = lastMsg.id;
                        // Only auto-scroll if user is near bottom
                        if (chatContentRef.current) {
                            const { scrollHeight, scrollTop, clientHeight } = chatContentRef.current;
                            const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
                            if (isNearBottom) {
                                setTimeout(scrollToBottom, 100);
                            }
                        }
                    }

                    lastSyncTimeRef.current = Date.now();

                    // If we received new messages, mark them as read immediately since we are in the chat
                    if (res.data.length > 0) {
                        if (activeFriend) {
                            markAsRead(getFriendId(activeFriend));
                        } else if (activeGroup) {
                            markGroupAsRead(activeGroup.id);
                        }
                    }
                } else if (res.code === 200) {
                    lastSyncTimeRef.current = Date.now();
                }
            } catch (err) { }
        }, 2000);
    };

    const stopPolling = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        setPolling(false);
    };

    const handleSend = async () => {
        if (!inputText.trim() || (!activeFriend && !activeGroup) || !currentUserId) return;

        if (inputText.length > 20000) {
            message.error('消息内容不能超过20000字');
            return;
        }

        setIsSending(true); // Start loading immediately

        let contentToSend = inputText;

        // Douyin Video Parsing
        if (contentToSend.includes('v.douyin.com')) {
            try {
                const res = await fetch('http://39.106.4.251/api_douyin_video_id', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ share_text: contentToSend })
                });

                // Use text() instead of json() to avoid precision loss for large integers (19 digits)
                const textData = await res.text();

                // Extract vid using regex from the JSON string
                // Matches "vid": 12345... or "video_id": 12345... or just the number if it's a raw number response
                let vid = null;
                const vidMatch = textData.match(/"(?:vid|video_id)"\s*:\s*"?(\d+)"?/);
                if (vidMatch) {
                    vid = vidMatch[1];
                } else if (/^\d+$/.test(textData.trim())) {
                    // If the response is just a raw number
                    vid = textData.trim();
                } else {
                    // Fallback to JSON parse if regex fails (though unlikely if it's valid JSON)
                    try {
                        const data = JSON.parse(textData);
                        vid = data.vid || data.video_id || (typeof data === 'string' || typeof data === 'number' ? String(data) : null);
                    } catch (e) { }
                }

                if (vid) {
                    contentToSend = `<iframe width="324" height="720" frameborder="0" src="https://open.douyin.com/player/video?vid=${vid}&autoplay=0" referrerpolicy="unsafe-url" allowfullscreen></iframe>`;
                }
            } catch (e) {
                console.error("Douyin parsing failed", e);
                message.warning('抖音链接解析失败，将发送原始文本');
            }
        }

        try {
            // setIsSending(true); // Moved to top
            const formData = new FormData();
            if (activeFriend) formData.append('receiverId', getFriendId(activeFriend));
            if (activeGroup) formData.append('groupId', activeGroup.id);

            formData.append('type', 'TEXT');
            formData.append('content', contentToSend);

            if (replyMessage) {
                formData.append('replyToMessageId', replyMessage.id);
            }

            const res = await api.post('/chat/send', formData);
            if (res.code === 200) {
                setMessages(prev => {
                    if (prev.some(msg => msg.id === res.data.id)) return prev;
                    return [...prev, res.data];
                });
                lastMessageIdRef.current = res.data.id;
                setInputText('');
                setReplyMessage(null);
                setTimeout(scrollToBottom, 100);
            }
        } catch (err) {
            message.error('Failed to send');
        } finally {
            setIsSending(false);
        }
    };

    const handleFileUpload = async (file, type) => {
        if ((!activeFriend && !activeGroup) || !currentUserId) return;

        // Size limits
        const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
        const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1GB
        const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB
        const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

        if (type === 'IMAGE' && file.size > MAX_IMAGE_SIZE) {
            message.error('图片大小不能超过10MB');
            return Upload.LIST_IGNORE;
        }
        if (type === 'VIDEO' && file.size > MAX_VIDEO_SIZE) {
            message.error('视频大小不能超过1GB');
            return Upload.LIST_IGNORE;
        }
        if (type === 'AUDIO' && file.size > MAX_AUDIO_SIZE) {
            message.error('语音大小不能超过10MB');
            return Upload.LIST_IGNORE;
        }
        if (type === 'FILE' && file.size > MAX_FILE_SIZE) {
            message.error('文件大小不能超过1GB');
            return Upload.LIST_IGNORE;
        }

        const tempId = Date.now();
        const tempMsg = {
            id: tempId,
            senderId: currentUserId,
            receiverId: activeFriend ? getFriendId(activeFriend) : null,
            groupId: activeGroup ? activeGroup.id : null,
            type: type,
            content: type === 'TEXT' ? '' : file.name, // For file/image/video, content might be name or blob url
            createdAt: new Date().toISOString(),
            status: 'uploading',
            progress: 0,
            file: file // Store file to create preview url if needed
        };

        // Create preview for image/video
        if (type === 'IMAGE' || type === 'VIDEO') {
            tempMsg.previewUrl = URL.createObjectURL(file);
        }

        setUploadingMessages(prev => ({ ...prev, [tempId]: tempMsg }));
        setTimeout(scrollToBottom, 100);

        const formData = new FormData();
        formData.append('file', file);
        if (activeFriend) formData.append('receiverId', getFriendId(activeFriend));
        if (activeGroup) formData.append('groupId', activeGroup.id);
        formData.append('type', type);
        if (replyMessage) {
            formData.append('replyToMessageId', replyMessage.id);
        }

        try {
            const res = await api.post('/chat/send', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadingMessages(prev => ({
                        ...prev,
                        [tempId]: { ...prev[tempId], progress: percentCompleted }
                    }));
                }
            });
            if (res.code === 200) {
                setMessages(prev => {
                    if (prev.some(msg => msg.id === res.data.id)) return prev;
                    return [...prev, res.data];
                });
                lastMessageIdRef.current = res.data.id;
                setReplyMessage(null);
                // Remove from uploadingMessages
                setUploadingMessages(prev => {
                    const newState = { ...prev };
                    delete newState[tempId];
                    return newState;
                });
                setTimeout(scrollToBottom, 100);
            }
        } catch (err) {
            message.error('Failed to send file');
            setUploadingMessages(prev => {
                const newState = { ...prev };
                delete newState[tempId];
                return newState;
            });
        }
    };

    const startRecording = async (e) => {
        e.preventDefault();

        // Check for secure context
        if (window.isSecureContext) {
            // HTTPS/Localhost: Use native recorder
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    if (audioBlob.size > 10 * 1024 * 1024) {
                        message.error('语音大小不能超过10MB');
                        return;
                    }
                    const file = new File([audioBlob], "voice_message.webm", { type: 'audio/webm' });
                    handleFileUpload(file, 'AUDIO');
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                setRecording(true);
                message.info('开始录音...', 0);
            } catch (err) {
                message.error('无法访问麦克风: ' + err.message);
            }
        } else {
            // HTTP: Use external bridge
            // TODO: User needs to deploy recorder.html to an HTTPS URL and replace this
            const RECORDER_URL = '/recorder.html'; // Default to local for now, but user must change this if on HTTP LAN

            // If we are on HTTP LAN, we need an external HTTPS URL.
            // Since we can't know the user's external URL, we'll prompt them or use a popup.
            // For now, let's open the local recorder.html (which won't work on HTTP LAN unless configured).
            // BUT, the user asked for an "online website".

            message.info('正在打开安全录音窗口...', 2);
            const width = 400;
            const height = 300;
            const left = (window.screen.width - width) / 2;
            const top = (window.screen.height - height) / 2;

            // IMPORTANT: Replace this URL with your deployed HTTPS URL
            // Example: 'https://your-username.github.io/recorder.html'
            const targetUrl = 'https://tiancj0109.github.io/SafeRecordingTransfer/';

            window.open(targetUrl, 'Recorder', `width=${width},height=${height},left=${left},top=${top}`);
        }
    };

    const stopRecording = (e) => {
        if (e) e.preventDefault();
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            setRecording(false);
            message.destroy();
        }
    };

    const [emojiList, setEmojiList] = useState({});

    useEffect(() => {
        fetchEmojiList();
    }, []);

    const fetchEmojiList = async () => {
        try {
            const res = await api.get('/emoji/list');
            if (res.code === 200) {
                setEmojiList(res.data);
            }
        } catch (e) { }
    };

    const handleSendEmoji = async (category, filename) => {
        if ((!activeFriend && !activeGroup) || !currentUserId) return;
        try {
            const formData = new FormData();
            if (activeFriend) formData.append('receiverId', getFriendId(activeFriend));
            if (activeGroup) formData.append('groupId', activeGroup.id);
            formData.append('type', 'EMOJI');
            formData.append('content', `${category}/${filename}`);

            if (replyMessage) {
                formData.append('replyToMessageId', replyMessage.id);
            }

            const res = await api.post('/chat/send', formData);
            if (res.code === 200) {
                setMessages(prev => {
                    if (prev.some(msg => msg.id === res.data.id)) return prev;
                    return [...prev, res.data];
                });
                lastMessageIdRef.current = res.data.id;
                setReplyMessage(null);
                setTimeout(scrollToBottom, 100);
            }
        } catch (err) { message.error('Failed to send emoji'); }
    };

    const fetchGroupMembers = async (groupId) => {
        try {
            const res = await api.get(`/group/members?groupId=${groupId}`);
            if (res.code === 200) {
                setGroupMembers(res.data);
            }
        } catch (e) { }
    };

    const handleKick = async (memberId) => {
        try {
            await api.post('/group/kick', { groupId: activeGroup.id, memberId });
            message.success('已移除');
            fetchGroupMembers(activeGroup.id);
        } catch (e) { message.error(e.message); }
    };

    const handleInvite = async () => {
        try {
            await api.post('/group/invite', { groupId: activeGroup.id, userIds: inviteSelected });
            message.success('邀请成功');
            setInviteVisible(false);
            setInviteSelected([]);
            fetchGroupMembers(activeGroup.id);
        } catch (e) { message.error(e.message); }
    };

    const handleDissolve = async () => {
        try {
            await api.post('/group/dissolve', { groupId: activeGroup.id });
            message.success('群组已解散');
            setActiveGroup(null);
            fetchGroups();
        } catch (e) { message.error(e.message); }
    };

    const handleUpdateGroup = async () => {
        if (!settingsName.trim()) {
            message.error('群名称不能为空');
            return;
        }
        try {
            const formData = new FormData();
            formData.append('groupId', activeGroup.id);
            formData.append('name', settingsName);
            formData.append('notice', settingsNotice);
            if (settingsAvatar) {
                formData.append('avatar', settingsAvatar);
            }

            const res = await api.post('/group/update', formData);
            if (res.code === 200) {
                message.success('更新成功');
                setSettingsVisible(false);
                setSettingsAvatar(null);
                setActiveGroup(prev => ({ ...prev, ...res.data }));
                fetchGroups();
            }
        } catch (e) { message.error(e.message); }
    };

    // Listen for messages from the recorder popup
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data && event.data.type === 'AUDIO_DATA_RECORDER') {
                const { data, size } = event.data;

                if (size > 10 * 1024 * 1024) {
                    message.error('语音大小不能超过10MB');
                    return;
                }

                // Convert Base64 to File
                fetch(data)
                    .then(res => res.blob())
                    .then(blob => {
                        const file = new File([blob], "voice_message.webm", { type: 'audio/webm' });
                        handleFileUpload(file, 'AUDIO');
                        message.success('语音发送成功');
                    });
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [activeFriend, activeGroup, currentUserId]);

    const handleToggleFriendTop = async (item) => {
        try {
            await api.post('/friend/top', { friendId: getFriendId(item), isTop: !item.isTop });
            fetchFriends();
        } catch (error) { }
    };

    const handleToggleGroupTop = async (item) => {
        try {
            await api.post('/group/top', { groupId: item.id, isTop: !item.isTop });
            fetchGroups();
        } catch (error) { }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [previewVideo, setPreviewVideo] = useState('');

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const date = new Date(timeStr);
        return date.toLocaleString('zh-CN', { hour12: false });
    };

    const handleCopy = (content) => {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(content).then(() => {
                message.success('已复制');
            }).catch(() => {
                message.error('复制失败');
            });
        } else {
            // Fallback for HTTP
            const textArea = document.createElement("textarea");
            textArea.value = content;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                message.success('已复制');
            } catch (err) {
                message.error('复制失败');
            }
            document.body.removeChild(textArea);
        }
    };

    const handleRecall = async (msgId) => {
        try {
            const res = await api.post('/chat/recall', { messageId: msgId });
            if (res.code === 200) {
                message.success('已撤回');
                setMessages(prev => prev.filter(m => m.id !== msgId));
            } else {
                message.error(res.message || '撤回失败');
            }
        } catch (err) {
            message.error('撤回失败');
        }
    };

    const MessageMenu = ({ msg, isMe }) => (
        <Menu>
            <Menu.Item key="reply" onClick={() => setReplyMessage(msg)}>
                引用
            </Menu.Item>
            {msg.type === 'TEXT' && (
                <Menu.Item key="copy" onClick={() => handleCopy(msg.content)}>
                    复制
                </Menu.Item>
            )}
            {isMe && (
                <Menu.Item key="recall" danger onClick={() => handleRecall(msg.id)}>
                    撤回
                </Menu.Item>
            )}
        </Menu>
    );

    const renderMessage = (msg) => {
        if (msg.type === 'SYSTEM' || msg.status === 2) {
            return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', marginBottom: 15 }}>
                    <span style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: 4, fontSize: 12, color: '#999' }}>
                        {msg.senderId === currentUserId ? '你' : msg.senderUsername} 撤回了一条消息
                    </span>
                </div>
            );
        }

        const isMe = msg.senderId === currentUserId;
        const callInvite = msg.type === 'TEXT' ? parseCallInvite(msg.content) : null;
        const isHtml = msg.type === 'TEXT' && /<iframe|<video/i.test(msg.content);

        // Long press logic for mobile
        let pressTimer = null;
        const handleTouchStart = (e) => {
            e.persist();
            pressTimer = setTimeout(() => {
                const event = new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: e.touches[0].clientX,
                    clientY: e.touches[0].clientY
                });
                e.target.dispatchEvent(event);
            }, 800);
        };
        const handleTouchEnd = () => {
            if (pressTimer) clearTimeout(pressTimer);
        };

        return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 15 }}>
                <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', width: '100%' }}>
                    {!isMe && (
                        <div style={{ marginRight: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Avatar
                                src={msg.senderAvatar ? `/cloudpan-api/auth/avatar/${msg.senderId}` : null}
                                icon={<UserOutlined />}
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleOpenUserProfile(msg.senderId)}
                            />
                            {activeGroup && <span style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{msg.senderUsername}</span>}
                        </div>
                    )}

                    <Dropdown overlay={<MessageMenu msg={msg} isMe={isMe} />} trigger={['contextMenu']}>
                        <div
                            style={{
                                maxWidth: isHtml ? '100%' : '70%',
                                width: isHtml ? 'fit-content' : 'auto',
                                background: isMe ? '#1890ff' : '#f0f0f0',
                                color: isMe ? '#fff' : '#000',
                                padding: isHtml ? 1 : 10,
                                borderRadius: 8,
                                wordBreak: 'break-word',
                                cursor: 'context-menu',
                                userSelect: 'text' // Allow selection for native copy too
                            }}
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                        >
                            {msg.replyToMessageId && (
                                <div
                                    className="quote-bubble"
                                    style={{ background: 'rgba(0,0,0,0.05)', padding: '4px 8px', borderRadius: 4, marginBottom: 5, fontSize: 12, color: '#666', cursor: 'pointer' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setQuoteContent({
                                            id: msg.replyToMessageId,
                                            username: msg.replySenderUsername,
                                            content: msg.replyContent, // Assuming we have full content here? If not, we might need to fetch it or use what we have. 
                                            // Ideally backend returns full content for reply.
                                            // Based on code: `msg.replyContent` seems to be the content.
                                            type: msg.replyType
                                        });
                                        setQuoteModalVisible(true);
                                    }}
                                >
                                    <div>{msg.replySenderUsername}:</div>
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                                        {(() => {
                                            const content = msg.replyType === 'TEXT' ? msg.replyContent :
                                                msg.replyType === 'IMAGE' ? '[图片]' :
                                                    msg.replyType === 'VIDEO' ? '[视频]' :
                                                        msg.replyType === 'AUDIO' ? '[语音]' :
                                                            msg.replyType === 'FILE' ? '[文件]' :
                                                                msg.replyType === 'EMOJI' ? '[表情]' : '';
                                            return content && content.length > 10 ? content.slice(0, 10) + '...' : content;
                                        })()}
                                    </div>
                                </div>
                            )}
                            {callInvite && (
                                <div style={{ minWidth: 220 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                                        {callInvite.callType === 'video' ? '📹 视频通话邀请' : '📞 语音通话邀请'}
                                    </div>
                                    <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 8 }}>
                                        {callInvite.groupId ? '群组通话' : '好友通话'} · {callInvite.senderName || msg.senderUsername || '未知用户'}
                                    </div>
                                    <Button
                                        type="primary"
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openCallRoom(callInvite.joinUrl);
                                        }}
                                    >
                                        {isMe ? '继续通话' : '加入通话'}
                                    </Button>
                                </div>
                            )}
                            {!callInvite && msg.type === 'TEXT' && renderText(msg.content, isMe)}
                            {msg.type === 'EMOJI' && msg.content && (
                                <img
                                    src={`/cloudpan-api/emoji/${msg.content}`}
                                    alt="emoji"
                                    style={{ width: 66, height: 66, objectFit: 'contain' }}
                                />
                            )}
                            {msg.type === 'IMAGE' && (
                                <div style={{ position: 'relative' }}>
                                    <Image
                                        width={150}
                                        src={msg.status === 'uploading' ? msg.previewUrl : `/cloudpan-api/chat/thumb/${msg.id}`}
                                        preview={msg.status === 'uploading' ? false : {
                                            src: `/cloudpan-api/chat/file/${msg.id}`,
                                            mask: (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
                                                        <EyeOutlined /> 预览
                                                    </span>
                                                    <span
                                                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, cursor: 'pointer' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const link = document.createElement('a');
                                                            link.href = `/cloudpan-api/chat/file/${msg.id}`;
                                                            link.download = '';
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                        }}
                                                    >
                                                        <DownloadOutlined /> 下载原图
                                                    </span>
                                                </div>
                                            ),
                                        }}
                                        fallback="https://via.placeholder.com/150?text=Error"
                                    />
                                    {msg.status === 'uploading' && (
                                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>
                                            <Progress type="circle" percent={msg.progress} width={40} format={percent => `${percent}%`} status="active" strokeColor="#1890ff" />
                                        </div>
                                    )}
                                </div>
                            )}
                            {msg.type === 'VIDEO' && (
                                <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => !msg.status && setPreviewVideo(`/cloudpan-api/chat/file/${msg.id}`)}>
                                    {msg.status === 'uploading' ? (
                                        <video src={msg.previewUrl} style={{ width: 150, borderRadius: 4 }} />
                                    ) : (
                                        <img
                                            src={`/cloudpan-api/chat/thumb/${msg.id}`}
                                            alt="Video Thumbnail"
                                            style={{ width: 150, borderRadius: 4 }}
                                            onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/150?text=Video"; }}
                                        />
                                    )}
                                    {!msg.status && (
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#fff', fontSize: 24 }}>
                                            <VideoCameraOutlined />
                                        </div>
                                    )}
                                    {msg.status === 'uploading' && (
                                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>
                                            <Progress type="circle" percent={msg.progress} width={40} format={percent => `${percent}%`} status="active" strokeColor="#1890ff" />
                                        </div>
                                    )}
                                </div>
                            )}
                            {msg.type === 'AUDIO' && (
                                <div>
                                    <audio controls src={msg.status === 'uploading' ? null : `/cloudpan-api/chat/file/${msg.id}`} style={{ height: 30, width: 280, maxWidth: '100%' }} />
                                    {msg.status === 'uploading' && <Progress percent={msg.progress} size="small" status="active" />}
                                </div>
                            )}
                            {msg.type === 'FILE' && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <FileOutlined style={{ fontSize: 24, marginRight: 10 }} />
                                        <div>
                                            <div title={msg.content}>
                                                {(() => {
                                                    const fileName = msg.content || 'File';
                                                    const lastDotIndex = fileName.lastIndexOf('.');
                                                    if (lastDotIndex === -1) {
                                                        return fileName.length > 10 ? fileName.slice(0, 10) + '...' : fileName;
                                                    }
                                                    const name = fileName.substring(0, lastDotIndex);
                                                    const ext = fileName.substring(lastDotIndex);
                                                    return name.length > 10 ? name.slice(0, 10) + '...' + ext : fileName;
                                                })()}
                                            </div>
                                            {msg.status !== 2 && msg.status !== 'uploading' && (
                                                <a href={`/cloudpan-api/chat/file/${msg.id}`} target="_blank" rel="noopener noreferrer" style={{ color: isMe ? '#fff' : '#1890ff', textDecoration: 'underline' }}>
                                                    下载文件
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    {msg.status === 'uploading' && <Progress percent={msg.progress} size="small" status="active" style={{ width: 150 }} />}
                                </div>
                            )}
                        </div>
                    </Dropdown>

                    {isMe && (
                        <Avatar
                            src={`/cloudpan-api/auth/avatar/${msg.senderId}`}
                            icon={<UserOutlined />}
                            style={{ marginLeft: 8, cursor: 'pointer' }}
                            onClick={() => handleOpenUserProfile(msg.senderId)}
                        />
                    )}
                </div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4, marginRight: isMe ? 48 : 0, marginLeft: isMe ? 0 : 48 }}>
                    {formatTime(msg.createdAt)}
                </div>
            </div>
        );
    };

    const renderText = (text, isMe) => {
        // 1. Protect HTML tags
        const tags = [];
        const textWithPlaceholders = text.replace(/<[^>]+>/g, (match) => {
            tags.push(match);
            return `###HTML_TAG_${tags.length - 1}###`;
        });

        // 2. Linkify URLs
        const linkColor = isMe ? '#fff' : '#1890ff';
        const linkifiedText = textWithPlaceholders.replace(
            /(https?:\/\/[^\s]+)/g,
            `<a href="$1" target="_blank" rel="noopener noreferrer" style="color: ${linkColor}; text-decoration: underline;">$1</a>`
        );

        // 3. Restore HTML tags
        const finalText = linkifiedText.replace(/###HTML_TAG_(\d+)###/g, (match, index) => {
            let tag = tags[parseInt(index, 10)] || match;
            // Check if it is an iframe and has width/height
            if (tag.startsWith('<iframe')) {
                const widthMatch = tag.match(/width="(\d+)"/);
                const heightMatch = tag.match(/height="(\d+)"/);
                if (widthMatch && heightMatch) {
                    const w = widthMatch[1];
                    const h = heightMatch[1];

                    // Inject aspect-ratio and height: auto
                    let style = `aspect-ratio: ${w} / ${h}; height: auto; border: none;`;

                    if (tag.includes('style="')) {
                        tag = tag.replace('style="', `style="${style} `);
                    } else {
                        // Insert style before the closing > or />
                        // Also ensure scrolling="no" and frameborder="0"
                        tag = tag.replace('<iframe', `<iframe style="${style}"`);
                    }

                    // Force scrolling="no" and frameborder="0" if not present
                    if (!tag.includes('scrolling=')) tag = tag.replace('<iframe', '<iframe scrolling="no"');
                    if (!tag.includes('frameborder=')) tag = tag.replace('<iframe', '<iframe frameborder="0"');
                }
            }
            return tag;
        });

        return (
            <div className="html-content" dangerouslySetInnerHTML={{ __html: finalText }} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} />
        );
    };

    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
                const file = items[i].getAsFile();
                handleFileUpload(file, 'IMAGE');
                e.preventDefault(); // Prevent pasting the image binary string into text area
                return;
            }
        }
    };

    const menu = (
        <Menu>
            {activeFriend && (
                <>
                    <Menu.Item key="1" icon={<UserOutlined />} onClick={() => Modal.info({
                        title: '好友信息',
                        content: (
                            <div>
                                <div style={{ marginBottom: 8 }}>
                                    <span style={{ fontWeight: 'bold' }}>{activeFriend?.friendUsername}</span>
                                    <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>(ID: {getFriendId(activeFriend)})</span>
                                </div>
                                <div style={{ marginBottom: 4 }}>
                                    <span style={{ color: '#666' }}>签名：</span>
                                    <span>{activeFriend?.friendSignature || '骚话吧'}</span>
                                </div>
                                <div style={{ marginBottom: 4 }}>
                                    <span style={{ color: '#666' }}>角色：</span>
                                    <span style={{ padding: '0 6px', borderRadius: 4, background: activeFriend?.friendRole === 'ADMIN' ? '#f50' : '#87d068', color: '#fff', fontSize: 12 }}>
                                        {activeFriend?.friendRole === 'ADMIN' ? '管理员' : '普通用户'}
                                    </span>
                                </div>
                                <div style={{ marginBottom: 4 }}>
                                    <span style={{ color: '#666' }}>邮箱：</span>
                                    <span>{activeFriend?.friendEmail || '未设置'}</span>
                                </div>
                                <div>
                                    <span style={{ color: '#666' }}>注册时间：</span>
                                    <span>{activeFriend?.friendCreatedAt ? new Date(activeFriend.friendCreatedAt).toLocaleString() : '未知'}</span>
                                </div>
                            </div>
                        ),
                        okText: '知道了'
                    })}>
                        好友信息
                    </Menu.Item>
                    <Menu.Item key="search_chat" icon={<SearchOutlined />} onClick={() => setChatSearchVisible(true)}>
                        查找聊天记录
                    </Menu.Item>
                    <Menu.Item key="moments" icon={<PictureOutlined />} onClick={() => {
                        api.post('/moments/read').catch(e => console.error(e));
                        navigate(`/moments?userId=${getFriendId(activeFriend)}`);
                    }}>
                        朋友圈
                    </Menu.Item>
                    <Menu.Item key="2" icon={<FolderOpenOutlined />} onClick={() => {
                        setFileManageVisible(true);
                        handleLoadFiles();
                    }}>
                        文件管理
                    </Menu.Item>
                    <Menu.Item key="3" danger icon={<MoreOutlined />} onClick={() => {
                        const friendId = getFriendId(activeFriend);
                        Modal.confirm({
                            title: '删除好友',
                            content: '确定要申请删除该好友吗？',
                            okText: '确认',
                            cancelText: '取消',
                            onOk: async () => {
                                try {
                                    await api.post('/friend/delete', { friendId });
                                    message.success('申请已发送');
                                } catch (e) { }
                            }
                        });
                    }}>
                        删除好友
                    </Menu.Item>
                </>
            )}
            {activeGroup && (
                <>
                    <Menu.Item key="search_chat_group" icon={<SearchOutlined />} onClick={() => setChatSearchVisible(true)}>
                        查找聊天记录
                    </Menu.Item>
                    <Menu.Item key="g1" icon={<TeamOutlined />} onClick={() => {
                        fetchGroupMembers(activeGroup.id);
                        setMembersVisible(true);
                    }}>
                        群组成员
                    </Menu.Item>
                    <Menu.Item key="g_media" icon={<FolderOpenOutlined />} onClick={() => {
                        setFileManageVisible(true);
                        handleLoadFiles();
                    }}>
                        文件管理
                    </Menu.Item>
                    <Menu.Item key="g2" icon={<PlusOutlined />} onClick={() => {
                        setInviteVisible(true);
                        setInviteSelected([]);
                    }}>
                        邀请好友
                    </Menu.Item>
                    {activeGroup.ownerId !== currentUserId && (
                        <Menu.Item key="g3" danger icon={<ArrowLeftOutlined />} onClick={() => {
                            Modal.confirm({
                                title: '退出群组',
                                content: '确定要退出该群组吗？',
                                onOk: async () => {
                                    try {
                                        await api.post('/group/quit', { groupId: activeGroup.id });
                                        message.success('已退出');
                                        setActiveGroup(null);
                                        fetchGroups();
                                    } catch (e) { message.error(e.message); }
                                }
                            });
                        }}>
                            退出群组
                        </Menu.Item>
                    )}
                    {activeGroup.ownerId === currentUserId && (
                        <>
                            <Menu.Item key="g5" icon={<SettingOutlined />} onClick={() => {
                                setSettingsName(activeGroup.name);
                                setSettingsNotice(activeGroup.notice || '');
                                setSettingsAvatar(null);
                                setSettingsVisible(true);
                            }}>
                                群组设置
                            </Menu.Item>
                            <Menu.Item key="g4" danger icon={<DeleteOutlined />} onClick={() => {
                                Modal.confirm({
                                    title: '解散群组',
                                    content: '确定要解散该群组吗？此操作不可恢复。',
                                    onOk: handleDissolve
                                });
                            }}>
                                解散群组
                            </Menu.Item>
                        </>
                    )}
                </>
            )}
        </Menu>
    );

    const emojiContent = (
        <div style={{ background: '#fff', boxShadow: isMobile ? 'none' : '0 2px 8px rgba(0,0,0,0.15)', borderRadius: 4, width: isMobile ? '100%' : 300, height: isMobile ? '100%' : 250, display: 'flex', flexDirection: 'column' }}>
            <Tabs defaultActiveKey="weixin" tabPosition="top" style={{ flex: 1, paddingLeft: 5 }} size="small" tabBarGutter={10}>
                {Object.keys(emojiList).map(category => (
                    <Tabs.TabPane tab={category} key={category}>
                        <div style={{ height: isMobile ? 'calc(100% - 10px)' : 160, overflowY: 'auto', padding: 10, display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start' }}>
                            {emojiList[category]?.map(filename => (
                                <div
                                    key={filename}
                                    style={{ padding: 5, cursor: 'pointer', borderRadius: 4, border: '1px solid transparent' }}
                                    onClick={() => {
                                        handleSendEmoji(category, filename);
                                        if (isMobile) setEmojiVisible(false);
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = '#1890ff'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                                >
                                    <img
                                        src={`/cloudpan-api/emoji/${category}/${encodeURIComponent(filename)}`}
                                        alt={filename}
                                        style={{ width: 28, height: 28, objectFit: 'contain' }}
                                    />
                                </div>
                            ))}
                        </div>
                    </Tabs.TabPane>
                ))}
            </Tabs>
        </div>
    );

    const handleOpenUserProfile = (userId) => {
        setSelectedUserId(userId);
        setProfileModalVisible(true);
    };

    const parseCallInvite = (content) => {
        if (!content || typeof content !== 'string' || !content.startsWith(CALL_INVITE_PREFIX)) {
            return null;
        }
        try {
            const data = JSON.parse(content.slice(CALL_INVITE_PREFIX.length));
            if (!data?.roomId || !data?.joinUrl || !data?.callType) {
                return null;
            }
            return data;
        } catch (e) {
            return null;
        }
    };

    const openCallRoom = (joinUrl) => {
        window.open(joinUrl, '_blank', 'noopener,noreferrer');
    };

    const getCallJoinUrl = (provider, roomId, callType) => {
        const encodedRoomId = encodeURIComponent(roomId);
        if (provider === 'mixlink') {
            return `https://www.mixlink.com/ezvizmeeting/#/home`;
        }
        return callType === 'video'
            ? `https://meet.jit.si/${encodedRoomId}#config.startWithVideoMuted=false`
            : `https://meet.jit.si/${encodedRoomId}#config.startWithVideoMuted=true`;
    };

    const handleStartCall = async (callType) => {
        if ((!activeFriend && !activeGroup) || !currentUserId) return;
        const now = Date.now();
        const targetFriendId = activeFriend ? getFriendId(activeFriend) : null;
        const roomId = activeGroup
            ? `cloudpan-g-${activeGroup.id}-${now}`
            : `cloudpan-f-${[currentUserId, targetFriendId].sort((a, b) => a - b).join('-')}-${now}`;
        const joinUrl = getCallJoinUrl(callProvider, roomId, callType);
        const senderName = localStorage.getItem('username') || `用户${currentUserId}`;

        if (!window.isSecureContext) {
            message.info('当前是HTTP环境，已通过HTTPS会议室发起通话');
        }

        openCallRoom(joinUrl);

        try {
            const formData = new FormData();
            if (activeFriend) formData.append('receiverId', targetFriendId);
            if (activeGroup) formData.append('groupId', activeGroup.id);
            formData.append('type', 'TEXT');
            formData.append('content', `${CALL_INVITE_PREFIX}${JSON.stringify({
                roomId,
                joinUrl,
                callType,
                provider: callProvider,
                senderId: currentUserId,
                senderName,
                groupId: activeGroup?.id || null,
                friendId: targetFriendId
            })}`);
            const res = await api.post('/chat/send', formData);
            if (res.code === 200) {
                setMessages(prev => {
                    if (prev.some(msg => msg.id === res.data.id)) return prev;
                    return [...prev, res.data];
                });
                lastMessageIdRef.current = res.data.id;
                setTimeout(scrollToBottom, 100);
                message.success(callType === 'video' ? '视频通话邀请已发送' : '语音通话邀请已发送');
            }
        } catch (err) {
            message.error('发送通话邀请失败');
        }
    };

    // Swipe Navigation Logic
    const touchStartRef = useRef(null);
    const touchEndRef = useRef(null);
    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        touchEndRef.current = null;
        touchStartRef.current = {
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        };
    };

    const onTouchMove = (e) => {
        touchEndRef.current = {
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        };
    };

    const onTouchEnd = () => {
        if (!touchStartRef.current || !touchEndRef.current) return;
        const distanceX = touchStartRef.current.x - touchEndRef.current.x;
        const distanceY = touchStartRef.current.y - touchEndRef.current.y;
        const isHorizontal = Math.abs(distanceX) > Math.abs(distanceY);

        if (isHorizontal) {
            if (distanceX > minSwipeDistance && activeTab === 'friend') {
                // Swipe Left -> Go to Group
                setActiveTab('group');
            }
            if (distanceX < -minSwipeDistance && activeTab === 'group') {
                // Swipe Right -> Go to Friend
                setActiveTab('friend');
            }
        }
    };

    const callTrayContent = (
        <div style={{ width: 280 }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>通话设置</div>
            <div style={{ marginBottom: 8, fontSize: 12, color: '#666' }}>
                推荐优先使用 Jitsi，开箱即用且兼容 HTTP 页面发起。
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <Button
                    type={callProvider === 'jitsi' ? 'primary' : 'default'}
                    size="small"
                    onClick={() => {
                        setCallProvider('jitsi');
                        localStorage.setItem('callProvider', 'jitsi');
                        message.success('已切换会议服务：Jitsi（推荐）');
                    }}
                >
                    Jitsi（推荐）
                </Button>
                <Button
                    type={callProvider === 'mixlink' ? 'primary' : 'default'}
                    size="small"
                    onClick={() => {
                        setCallProvider('mixlink');
                        localStorage.setItem('callProvider', 'mixlink');
                        message.success('已切换会议服务：觅讯');
                    }}
                >
                    觅讯
                </Button>
            </div>
            <div style={{ marginBottom: 10, fontSize: 12, color: '#999' }}>
                当前服务：{callProvider === 'jitsi' ? 'Jitsi' : '觅讯'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <Button
                    icon={<PhoneOutlined />}
                    type="primary"
                    size="small"
                    onClick={() => {
                        setCallTrayVisible(false);
                        handleStartCall('audio');
                    }}
                >
                    发起语音
                </Button>
                <Button
                    icon={<VideoCameraOutlined />}
                    size="small"
                    onClick={() => {
                        setCallTrayVisible(false);
                        handleStartCall('video');
                    }}
                >
                    发起视频
                </Button>
            </div>
        </div>
    );

    return (
        <Layout style={{ height: 'calc(100vh - 100px)', background: '#fff' }}>
            <Sider
                width={isMobile ? '100%' : 270}
                theme="light"
                style={{ borderRight: '1px solid #f0f0f0', display: (isMobile && (activeFriend || activeGroup)) ? 'none' : 'block' }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0' }}>
                        <Input.Search 
                            placeholder="全局搜索聊天记录" 
                            onSearch={(val) => {
                                setGlobalSearchKeyword(val);
                                if(val) {
                                    setGlobalSearchVisible(true);
                                    handleGlobalSearch(val);
                                }
                            }} 
                            allowClear
                        />
                    </div>
                    <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
                        <div
                            style={{ flex: 1, textAlign: 'center', padding: '16px', cursor: 'pointer', borderBottom: activeTab === 'friend' ? '2px solid #1890ff' : 'none', color: activeTab === 'friend' ? '#1890ff' : '#000' }}
                            onClick={() => setActiveTab('friend')}
                        >
                            <Badge count={unreadCounts.friendUnread} offset={[10, 0]} size="small">
                                好友
                            </Badge>
                        </div>
                        <div
                            style={{ flex: 1, textAlign: 'center', padding: '16px', cursor: 'pointer', borderBottom: activeTab === 'group' ? '2px solid #1890ff' : 'none', color: activeTab === 'group' ? '#1890ff' : '#000' }}
                            onClick={() => setActiveTab('group')}
                        >
                            <Badge count={unreadCounts.groupUnread} offset={[10, 0]} size="small">
                                群组
                            </Badge>
                        </div>
                        <div
                            style={{ flex: 1, textAlign: 'center', padding: '16px', cursor: 'pointer', color: '#000' }}
                            onClick={() => {
                                api.post('/moments/read').catch(e => console.error(e));
                                navigate('/moments');
                            }}
                        >
                            <Badge count={momentsNotificationData?.count} dot={momentsNotificationData?.count === 0 && momentsNotificationData?.newMomentsCount > 0} offset={[10, 0]} size="small">
                                {(momentsNotificationData?.newMomentsCount > 0) ? '朋友圈（新动态）' : '朋友圈'}
                            </Badge>
                        </div>
                        <div style={{ padding: '16px', cursor: 'pointer' }} onClick={() => setCreateGroupVisible(true)}>
                            <PlusOutlined />
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {activeTab === 'friend' ? (
                            <List
                                itemLayout="horizontal"
                                dataSource={friends}
                                renderItem={item => (
                                    <Dropdown
                                        trigger={['contextMenu']}
                                        overlay={
                                            <Menu>
                                        <Menu.Item key="top" onClick={() => handleToggleFriendTop(item)}>
                                            {item.isTop ? '取消置顶' : '置顶'}
                                        </Menu.Item>
                                    </Menu>
                                }
                            >
                                <List.Item
                                    style={{ padding: 12, cursor: 'pointer', background: activeFriend?.id === item.id ? '#e6f7ff' : 'transparent' }}
                                    onClick={() => { setActiveFriend(item); setActiveGroup(null); }}
                                >
                                    <List.Item.Meta
                                        avatar={
                                            <Badge count={item.unreadCount} offset={[0, 0]}>
                                                <Avatar src={`/cloudpan-api/auth/avatar/${getFriendId(item)}`} icon={<UserOutlined />} />
                                            </Badge>
                                        }
                                        title={<div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{item.friendUsername}</span>
                                            {item.isTop && <span style={{ color: '#1890ff', fontSize: 12 }}>[置顶]</span>}
                                        </div>}
                                        description={
                                            <div>
                                                <div style={{ fontSize: 12, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    签名：{item.friendSignature || '说点骚话吧🤪'}
                                                </div>
                                            </div>
                                        }
                                    />
                                </List.Item>
                            </Dropdown>
                        )}
                    />
                ) : (
                    <List
                        itemLayout="horizontal"
                        dataSource={groups}
                        renderItem={item => (
                            <Dropdown
                                trigger={['contextMenu']}
                                overlay={
                                    <Menu>
                                        <Menu.Item key="top" onClick={() => handleToggleGroupTop(item)}>
                                            {item.isTop ? '取消置顶' : '置顶'}
                                        </Menu.Item>
                                    </Menu>
                                }
                            >
                                <List.Item
                                    style={{ padding: 12, cursor: 'pointer', background: activeGroup?.id === item.id ? '#e6f7ff' : 'transparent' }}
                                    onClick={() => { setActiveGroup(item); setActiveFriend(null); }}
                                >
                                    <List.Item.Meta
                                        avatar={
                                            <Badge count={unreadCounts.groupCounts[item.id] || 0}>
                                                <Avatar
                                                    src={item.avatar ? `/cloudpan-api/group/avatar/${item.id}?t=${new Date(item.updatedAt).getTime()}` : null}
                                                    icon={<TeamOutlined />}
                                                />
                                            </Badge>
                                        }
                                        title={<div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{item.name}</span>
                                            {item.isTop && <span style={{ color: '#1890ff', fontSize: 12 }}>[置顶]</span>}
                                        </div>}
                                        description={item.notice || '暂无公告'}
                                    />
                                </List.Item>
                            </Dropdown>
                        )}
                    />
                )}
                    </div>
                </div>
            </Sider>
            <Content style={{ display: (isMobile && !activeFriend && !activeGroup) ? 'none' : 'flex', flexDirection: 'column' }}>
                {activeFriend || activeGroup ? (
                    <>
                        <div style={{ padding: '10px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                {isMobile && <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginRight: 10 }} />}
                                {activeFriend ? (
                                    <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleOpenUserProfile(getFriendId(activeFriend))}>
                                        <Avatar src={`/cloudpan-api/auth/avatar/${getFriendId(activeFriend)}`} icon={<UserOutlined />} size="small" style={{ marginRight: 8 }} />
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>{activeFriend.friendUsername}</div>
                                            <div style={{ fontSize: 10, color: '#999', display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <span>ID: {getFriendId(activeFriend)}</span>
                                                <span style={{ padding: '0 4px', borderRadius: 2, background: activeFriend.friendRole === 'ADMIN' ? '#f50' : '#87d068', color: '#fff', fontSize: 10 }}>
                                                    {activeFriend.friendRole === 'ADMIN' ? '管理员' : '普通用户'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Avatar
                                            src={activeGroup.avatar ? `/cloudpan-api/group/avatar/${activeGroup.id}?t=${new Date(activeGroup.updatedAt).getTime()}` : null}
                                            icon={<TeamOutlined />}
                                            size="small"
                                            style={{ marginRight: 8 }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>{activeGroup.name}</div>
                                            <div style={{ fontSize: 10, color: '#999' }}>
                                                {activeGroup.notice || '暂无公告'}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <Dropdown overlay={menu} placement="bottomRight">
                                <Button icon={<MoreOutlined />} type="text" />
                            </Dropdown>
                        </div>
                        <div
                            ref={chatContentRef}
                            className={`chat-content ${loadingHistory ? 'loading-history' : ''}`}
                            style={{ flex: 1, overflowY: 'auto', padding: 20 }}
                            onScroll={handleScroll}
                        >
                            {loadingHistory && <div style={{ textAlign: 'center', padding: 10 }}><RequestSpinner /></div>}
                            {/* {hasMore && (
                                <div style={{ textAlign: 'center', marginBottom: 10 }}>
                                    <Button type="link" onClick={handleLoadMore} loading={loadingHistory}>
                                        加载更多历史记录
                                    </Button>
                                </div>
                            )} */}
                            {messages.concat(Object.values(uploadingMessages)).map(renderMessage)}
                            <div ref={messagesEndRef} />
                        </div>
                        <div style={{ padding: 20, borderTop: '1px solid #f0f0f0' }}>
                            <div style={{ marginBottom: 10 }}>
                                <Upload showUploadList={false} beforeUpload={f => { handleFileUpload(f, 'IMAGE'); return false; }} accept="image/*" customRequest={() => { }}>
                                    <Button icon={<PictureOutlined />} type="text" title="发送图片" />
                                </Upload>
                                <Upload showUploadList={false} beforeUpload={f => { handleFileUpload(f, 'VIDEO'); return false; }} accept="video/*" customRequest={() => { }}>
                                    <Button icon={<VideoCameraOutlined />} type="text" title="发送视频" />
                                </Upload>
                                <Popover
                                    trigger="click"
                                    placement="topLeft"
                                    content={callTrayContent}
                                    open={callTrayVisible}
                                    onOpenChange={setCallTrayVisible}
                                >
                                    <Button
                                        icon={<PhoneOutlined />}
                                        type="text"
                                        title="通话"
                                    >
                                        通话
                                    </Button>
                                </Popover>
                                <Button
                                    icon={<AudioOutlined />}
                                    type={recording ? 'primary' : 'text'}
                                    danger={recording}
                                    onMouseDown={startRecording}
                                    onMouseUp={stopRecording}
                                    onMouseLeave={stopRecording}
                                    onTouchStart={startRecording}
                                    onTouchEnd={stopRecording}
                                    title="按住录音"
                                />
                                <Upload showUploadList={false} beforeUpload={f => { handleFileUpload(f, 'FILE'); return false; }} customRequest={() => { }}>
                                    <Button icon={<PaperClipOutlined />} type="text" title="发送文件" />
                                </Upload>
                                {isMobile ? (
                                    <>
                                        <Button
                                            icon={<span role="img" aria-label="emoji" style={{ fontSize: 16 }}>😊</span>}
                                            type="text"
                                            title="表情"
                                            onClick={() => setEmojiVisible(true)}
                                        />
                                        <Drawer
                                            title="选择表情"
                                            placement="bottom"
                                            closable={true}
                                            onClose={() => setEmojiVisible(false)}
                                            visible={emojiVisible}
                                            height="40vh"
                                            bodyStyle={{ padding: 0 }}
                                        >
                                            {emojiContent}
                                        </Drawer>
                                    </>
                                ) : (
                                    <Dropdown
                                        overlay={emojiContent}
                                        trigger={['click']}
                                        placement="topLeft"
                                    >
                                        <Button icon={<span role="img" aria-label="emoji" style={{ fontSize: 16 }}>😊</span>} type="text" title="表情" />
                                    </Dropdown>
                                )}
                            </div >
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {replyMessage && (
                                    <div style={{ background: '#f5f5f5', padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #1890ff', marginBottom: 5 }}>
                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%', fontSize: 12, color: '#666' }}>
                                            回复 {replyMessage.senderUsername || '...'} : {
                                                (() => {
                                                    const content = replyMessage.type === 'TEXT' ? replyMessage.content :
                                                        replyMessage.type === 'IMAGE' ? '[图片]' :
                                                            replyMessage.type === 'VIDEO' ? '[视频]' :
                                                                replyMessage.type === 'AUDIO' ? '[语音]' :
                                                                    replyMessage.type === 'FILE' ? '[文件]' :
                                                                        replyMessage.type === 'EMOJI' ? '[表情]' : '';
                                                    return content.length > 10 ? content.slice(0, 10) + '...' : content;
                                                })()
                                            }
                                        </div>
                                        <Button type="text" size="small" icon={<span style={{ fontWeight: 'bold' }}>×</span>} onClick={() => setReplyMessage(null)} />
                                    </div>
                                )}
                                <div style={{ display: 'flex' }}>
                                    <TextArea
                                        rows={3}
                                        value={inputText}
                                        showCount
                                        maxLength={20000}
                                        placeholder="支持直接粘贴发送图片，支持长按或右键消息撤回"
                                        onChange={e => setInputText(e.target.value)}
                                        onPaste={handlePaste}
                                        onPressEnter={e => {
                                            if (!e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                    />
                                    <Button
                                        type="primary"
                                        icon={isSending ? <LoadingOutlined /> : <SendOutlined />}
                                        style={{ height: 'auto', marginLeft: 10 }}
                                        onClick={handleSend}
                                        disabled={isSending}
                                    >
                                        发送
                                    </Button>
                                </div>
                            </div >
                        </div>
                    </>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#999' }}>
                        选择一个好友开始聊天
                    </div>
                )}
            </Content >

            <Modal
                visible={!!previewVideo}
                onCancel={() => setPreviewVideo('')}
                footer={null}
                width={800}
                destroyOnClose
            >
                <video controls style={{ width: '100%' }} src={previewVideo} />
            </Modal>

            <Modal
                title="引用内容"
                visible={quoteModalVisible}
                onCancel={() => setQuoteModalVisible(false)}
                footer={null}
            >
                {quoteContent && (
                    <div>
                        <div style={{ fontWeight: 'bold', marginBottom: 10 }}>{quoteContent.username}:</div>
                        {quoteContent.type === 'TEXT' && (
                            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {quoteContent.content}
                            </div>
                        )}
                        {quoteContent.type !== 'TEXT' && (
                            <div style={{ color: '#666', display: 'flex', alignItems: 'center' }}>
                                {quoteContent.type === 'IMAGE' ? '[图片]' :
                                    quoteContent.type === 'VIDEO' ? '[视频]' :
                                        quoteContent.type === 'AUDIO' ? '[语音]' :
                                            quoteContent.type === 'FILE' ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <FileOutlined style={{ fontSize: 24 }} />
                                                    <span>{quoteContent.content}</span>
                                                    <a href={`/cloudpan-api/chat/file/${quoteContent.id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1890ff', textDecoration: 'underline' }}>
                                                        下载文件
                                                    </a>
                                                </div>
                                            ) :
                                                quoteContent.type === 'EMOJI' ? '[表情]' : '未知类型'}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
            <Modal
                title="创建群组"
                visible={createGroupVisible}
                onCancel={() => setCreateGroupVisible(false)}
                onOk={async () => {
                    if (!groupName.trim()) return message.error('请输入群名称');
                    try {
                        await api.post('/group/create', { name: groupName, memberIds: selectedFriends });
                        message.success('创建成功');
                        setCreateGroupVisible(false);
                        setGroupName('');
                        setSelectedFriends([]);
                        fetchGroups();
                    } catch (e) { message.error(e.message); }
                }}
            >
                <div style={{ marginBottom: 16 }}>
                    <div style={{ marginBottom: 8 }}>群名称:</div>
                    <Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="请输入群名称" />
                </div>
                <div>
                    <div style={{ marginBottom: 8 }}>选择好友:</div>
                    <List
                        dataSource={friends}
                        renderItem={item => (
                            <List.Item>
                                <List.Item.Meta
                                    avatar={<Avatar src={`/cloudpan-api/auth/avatar/${getFriendId(item)}`} />}
                                    title={item.friendUsername}
                                />
                                <input
                                    type="checkbox"
                                    checked={selectedFriends.includes(getFriendId(item))}
                                    onChange={e => {
                                        const fid = getFriendId(item);
                                        if (e.target.checked) {
                                            setSelectedFriends([...selectedFriends, fid]);
                                        } else {
                                            setSelectedFriends(selectedFriends.filter(id => id !== fid));
                                        }
                                    }}
                                />
                            </List.Item>
                        )}
                        style={{ maxHeight: 300, overflowY: 'auto' }}
                    />
                </div>
            </Modal>

            <Modal
                title={`群组成员 (${groupMembers.length})`}
                visible={membersVisible}
                onCancel={() => setMembersVisible(false)}
                footer={null}
            >
                <List
                    dataSource={groupMembers}
                    renderItem={item => (
                        <List.Item
                            actions={[
                                activeGroup?.ownerId === currentUserId && item.userId !== currentUserId && (
                                    <Button type="link" danger onClick={() => handleKick(item.userId)}>移除</Button>
                                )
                            ]}
                        >
                            <List.Item.Meta
                                avatar={<Avatar src={`/cloudpan-api/auth/avatar/${item.userId}`} style={{ cursor: 'pointer' }} onClick={() => handleOpenUserProfile(item.userId)} />}
                                title={
                                    <span>
                                        {item.username || 'User'}
                                        {item.role === 'OWNER' && <span style={{ fontSize: 10, background: '#f50', color: '#fff', padding: '0 4px', borderRadius: 2, marginLeft: 5 }}>群主</span>}
                                    </span>
                                }
                                description={`加入时间: ${new Date(item.joinedAt).toLocaleDateString()}`}
                            />
                        </List.Item>
                    )}
                    style={{ maxHeight: 400, overflowY: 'auto' }}
                />
            </Modal>

            <Modal
                title="邀请好友"
                visible={inviteVisible}
                onCancel={() => setInviteVisible(false)}
                onOk={handleInvite}
            >
                <List
                    dataSource={friends.filter(f => !groupMembers.some(m => m.userId === getFriendId(f)))}
                    renderItem={item => (
                        <List.Item>
                            <List.Item.Meta
                                avatar={<Avatar src={`/cloudpan-api/auth/avatar/${getFriendId(item)}`} />}
                                title={item.friendUsername}
                            />
                            <input
                                type="checkbox"
                                checked={inviteSelected.includes(getFriendId(item))}
                                onChange={e => {
                                    const fid = getFriendId(item);
                                    if (e.target.checked) {
                                        setInviteSelected([...inviteSelected, fid]);
                                    } else {
                                        setInviteSelected(inviteSelected.filter(id => id !== fid));
                                    }
                                }}
                            />
                        </List.Item>
                    )}
                    style={{ maxHeight: 300, overflowY: 'auto' }}
                />
            </Modal>

            <Modal
                title="群组设置"
                visible={settingsVisible}
                onCancel={() => setSettingsVisible(false)}
                onOk={handleUpdateGroup}
            >
                <div style={{ marginBottom: 16, textAlign: 'center' }}>
                    <Upload
                        beforeUpload={file => { setSettingsAvatar(file); return false; }}
                        showUploadList={false}
                    >
                        <div style={{ cursor: 'pointer' }}>
                            {settingsAvatar ? (
                                <Avatar src={URL.createObjectURL(settingsAvatar)} size={64} />
                            ) : (
                                <Avatar
                                    src={activeGroup?.avatar ? `/cloudpan-api/group/avatar/${activeGroup.id}?t=${new Date().getTime()}` : null}
                                    size={64}
                                    icon={<TeamOutlined />}
                                />
                            )}
                            <div style={{ marginTop: 8, color: '#1890ff' }}>
                                <UploadOutlined /> 更换头像
                            </div>
                        </div>
                    </Upload>
                </div>
                <div style={{ marginBottom: 16 }}>
                    <div style={{ marginBottom: 8 }}>群名称:</div>
                    <Input
                        value={settingsName}
                        onChange={e => setSettingsName(e.target.value)}
                        placeholder="请输入群名称"
                        maxLength={50}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 8 }}>群公告:</div>
                    <TextArea
                        value={settingsNotice}
                        onChange={e => setSettingsNotice(e.target.value)}
                        placeholder="请输入群公告"
                        rows={4}
                        maxLength={500}
                    />
                </div>
            </Modal>

            <UserProfileModal
                visible={profileModalVisible}
                onClose={() => setProfileModalVisible(false)}
                userId={selectedUserId}
                currentUserId={currentUserId}
                friends={friends}
            />

            <Drawer title="查找聊天记录" placement="right" onClose={() => setChatSearchVisible(false)} visible={chatSearchVisible} width={350}>
                <Input.Search placeholder="搜索关键字" onSearch={handleSearchChat} style={{ marginBottom: 16 }} allowClear />
                <Spin spinning={chatSearchLoading}>
                    <List
                        dataSource={chatSearchResults}
                        renderItem={item => (
                            <List.Item>
                                <List.Item.Meta
                                    avatar={<Avatar src={`/cloudpan-api/auth/avatar/${item.senderId}`} />}
                                    title={<div>{item.senderUsername} <span style={{fontSize: 12, color: '#999', float: 'right'}}>{formatTime(item.createdAt)}</span></div>}
                                    description={<div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#333' }}>{item.content}</div>}
                                />
                            </List.Item>
                        )}
                        locale={{ emptyText: '没有找到匹配的消息' }}
                    />
                </Spin>
            </Drawer>

            <Drawer title="文件管理" placement="right" onClose={() => setFileManageVisible(false)} visible={fileManageVisible} width={400}>
                <Spin spinning={fileManageLoading}>
                    <List
                        dataSource={fileManageList}
                        renderItem={item => (
                            <List.Item
                                actions={[
                                    <a href={`/cloudpan-api/chat/file/${item.id}`} target="_blank" rel="noopener noreferrer">下载</a>
                                ]}
                            >
                                <List.Item.Meta
                                    avatar={<FileOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                                    title={item.content || '文件'}
                                    description={<>{item.senderUsername} · {formatTime(item.createdAt)}</>}
                                />
                            </List.Item>
                        )}
                        locale={{ emptyText: '暂无文件' }}
                    />
                </Spin>
            </Drawer>

            <Drawer title="全局搜索结果" placement="left" onClose={() => setGlobalSearchVisible(false)} visible={globalSearchVisible} width={400}>
                <Input.Search 
                    placeholder="全局搜索聊天记录" 
                    defaultValue={globalSearchKeyword}
                    onSearch={handleGlobalSearch} 
                    style={{ marginBottom: 16 }} 
                    allowClear 
                />
                <Spin spinning={globalSearchLoading}>
                    <List
                        dataSource={globalSearchResults}
                        renderItem={item => (
                            <List.Item style={{ cursor: 'pointer' }} onClick={() => {
                                setGlobalSearchVisible(false);
                                if (item.chatType === 'group') {
                                    const targetGroup = groups.find(g => g.id === item.chatId);
                                    if (targetGroup) {
                                        setActiveGroup(targetGroup);
                                        setActiveFriend(null);
                                        setActiveTab('group');
                                    }
                                } else {
                                    const targetFriend = friends.find(f => getFriendId(f) === item.chatId);
                                    if (targetFriend) {
                                        setActiveFriend(targetFriend);
                                        setActiveGroup(null);
                                        setActiveTab('friend');
                                    }
                                }
                            }}>
                                <List.Item.Meta
                                    avatar={<Avatar src={`/cloudpan-api/auth/avatar/${item.senderId}`} />}
                                    title={<div>{item.senderUsername} <span style={{fontSize: 12, color: '#999'}}>在 {item.chatName}</span> <span style={{fontSize: 12, color: '#999', float: 'right'}}>{formatTime(item.createdAt)}</span></div>}
                                    description={<div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#333' }}>{item.content}</div>}
                                />
                            </List.Item>
                        )}
                        locale={{ emptyText: '没有找到匹配的消息' }}
                    />
                </Spin>
            </Drawer>
        </Layout >
    );
};

export default FriendChat;
