import React, { useState, useEffect } from 'react';
import { Table, Button, message, Popconfirm, Grid, List, Tag } from 'antd';
import api from '../utils/api';
import moment from 'moment';

const ShareManage = () => {
    const [shares, setShares] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchShares();
    }, []);

    const fetchShares = async () => {
        setLoading(true);
        try {
            const res = await api.get('/share/list');
            if (res.code === 200) {
                setShares(res.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelShare = async (id) => {
        try {
            await api.delete(`/share/${id}`);
            message.success('取消成功');
            fetchShares();
        } catch (error) {
            // Error handled
        }
    };

    const isExpired = (expireTime) => {
        if (!expireTime) return false; // Permanent
        return new Date(expireTime) < new Date();
    };

    const columns = [
        {
            title: '文件名',
            dataIndex: 'filename',
            key: 'filename',
            render: (text, record) => (
                <span style={{ fontWeight: 500 }}>
                    {text}
                    {isExpired(record.expireTime) && <Tag color="red" style={{ marginLeft: 8 }}>已过期</Tag>}
                </span>
            )
        },
        {
            title: '分享码',
            dataIndex: 'shareCode',
            key: 'shareCode',
        },
        {
            title: '提取码',
            dataIndex: 'accessCode',
            key: 'accessCode',
            render: (code) => code || '公开',
        },
        {
            title: '过期时间',
            dataIndex: 'expireTime',
            key: 'expireTime',
            render: (date) => date ? moment(date).format('YYYY-MM-DD HH:mm') : '永久',
        },
        {
            title: '浏览次数',
            dataIndex: 'visitCount',
            key: 'visitCount',
        },
        {
            title: '下载次数',
            dataIndex: 'downloadCount',
            key: 'downloadCount',
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => (
                <span>
                    <Button
                        type="link"
                        onClick={() => {
                            const link = `${window.location.origin}${process.env.PUBLIC_URL}/share/${record.shareCode}`;
                            // Fallback for HTTP where navigator.clipboard is undefined
                            if (navigator.clipboard && window.isSecureContext) {
                                navigator.clipboard.writeText(link).then(() => {
                                    message.success('链接已复制到剪贴板');
                                });
                            } else {
                                // Fallback using textarea
                                const textArea = document.createElement("textarea");
                                textArea.value = link;
                                textArea.style.position = "fixed";
                                textArea.style.left = "-9999px";
                                document.body.appendChild(textArea);
                                textArea.focus();
                                textArea.select();
                                try {
                                    document.execCommand('copy');
                                    message.success('链接已复制到剪贴板');
                                } catch (err) {
                                    message.error('复制失败，请手动复制');
                                }
                                document.body.removeChild(textArea);
                            }
                        }}
                    >
                        复制链接
                    </Button>
                    <Popconfirm title="确定要取消分享吗？" onConfirm={() => handleCancelShare(record.id)}>
                        <Button type="link" danger>取消分享</Button>
                    </Popconfirm>
                </span>
            ),
        },
    ];

    const screens = Grid.useBreakpoint();

    return (
        <div>
            <h2>我的分享</h2>
            {!screens.md ? (
                <List
                    dataSource={shares}
                    loading={loading}
                    renderItem={item => (
                        <List.Item
                            actions={[
                                <Popconfirm title="确定要取消分享吗？" onConfirm={() => handleCancelShare(item.id)}>
                                    <Button type="link" danger>取消</Button>
                                </Popconfirm>
                            ]}
                        >
                            <List.Item.Meta
                                title={
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontWeight: 'bold', marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                                            {item.filename}
                                            {isExpired(item.expireTime) && <Tag color="red" style={{ marginLeft: 4, fontSize: '11px' }}>已过期</Tag>}
                                        </div>
                                        <span>{item.shareCode}</span>
                                        <Button
                                            type="link"
                                            size="small"
                                            onClick={() => {
                                                const link = `${window.location.origin}${process.env.PUBLIC_URL}/share/${item.shareCode}`;
                                                if (navigator.clipboard && window.isSecureContext) {
                                                    navigator.clipboard.writeText(link).then(() => message.success('已复制'));
                                                } else {
                                                    const textArea = document.createElement("textarea");
                                                    textArea.value = link;
                                                    textArea.style.position = "fixed";
                                                    textArea.style.left = "-9999px";
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
                                            }}
                                        >
                                            复制链接
                                        </Button>
                                    </div>
                                }
                                description={
                                    <div style={{ fontSize: '12px' }}>
                                        <div>提取码: {item.accessCode || '公开'}</div>
                                        <div>过期: {item.expireTime ? moment(item.expireTime).format('YYYY-MM-DD HH:mm') : '永久'}</div>
                                        <div>浏览: {item.visitCount} | 下载: {item.downloadCount}</div>
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            ) : (
                <Table
                    columns={columns}
                    dataSource={shares}
                    rowKey="id"
                    loading={loading}
                />
            )}
        </div>
    );
};

export default ShareManage;
