import React, { useState, useEffect } from 'react';
import { Table, Button, message, Popconfirm, Space, Grid, List } from 'antd';
import api from '../utils/api';
import moment from 'moment';

const RecycleBin = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    useEffect(() => {
        fetchRecycleBin();
    }, []);

    const fetchRecycleBin = async () => {
        setLoading(true);
        try {
            const res = await api.get('/recycle/list');
            if (res.code === 200) {
                setItems(res.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleBatchRestore = async () => {
        if (selectedRowKeys.length === 0) return;
        try {
            for (const id of selectedRowKeys) {
                await api.post(`/recycle/${id}/restore`);
            }
            message.success('批量恢复成功');
            setSelectedRowKeys([]);
            fetchRecycleBin();
        } catch (error) {
            message.error('部分文件恢复失败');
        }
    };

    const handleBatchDelete = async () => {
        if (selectedRowKeys.length === 0) return;
        try {
            for (const id of selectedRowKeys) {
                await api.delete(`/recycle/${id}`);
            }
            message.success('批量永久删除成功');
            setSelectedRowKeys([]);
            fetchRecycleBin();
        } catch (error) {
            message.error('部分文件删除失败');
        }
    };

    const handleRestore = async (id) => {
        try {
            await api.post(`/recycle/${id}/restore`);
            message.success('恢复成功');
            fetchRecycleBin();
        } catch (error) {
            // Error handled
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/recycle/${id}`);
            message.success('永久删除成功');
            fetchRecycleBin();
        } catch (error) {
            // Error handled
        }
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys) => {
            setSelectedRowKeys(newSelectedRowKeys);
        },
    };

    const columns = [
        {
            title: '原文件',
            key: 'fileInfo',
            render: (_, record) => (
                <span>
                    {record.filename} <span style={{ color: '#999', fontSize: '12px' }}>(ID: {record.fileId})</span>
                </span>
            ),
        },
        {
            title: '删除时间',
            dataIndex: 'deletedAt',
            key: 'deletedAt',
            render: (date) => moment(date).format('YYYY-MM-DD HH:mm'),
        },
        {
            title: '过期时间',
            dataIndex: 'expireAt',
            key: 'expireAt',
            render: (date) => moment(date).format('YYYY-MM-DD HH:mm'),
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button type="link" onClick={() => handleRestore(record.id)}>恢复</Button>
                    <Popconfirm title="确定要永久删除吗？" onConfirm={() => handleDelete(record.id)}>
                        <Button type="link" danger>永久删除</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const screens = Grid.useBreakpoint();

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', flexDirection: screens.md ? 'row' : 'column', justifyContent: 'space-between', alignItems: screens.md ? 'center' : 'flex-start', gap: 10 }}>
                <h2>回收站</h2>
                <Space wrap>
                    <Button
                        type="primary"
                        onClick={handleBatchRestore}
                        disabled={selectedRowKeys.length === 0}
                    >
                        批量恢复
                    </Button>
                    <Popconfirm
                        title={`确定要永久删除选中的 ${selectedRowKeys.length} 个文件吗？`}
                        onConfirm={handleBatchDelete}
                        disabled={selectedRowKeys.length === 0}
                    >
                        <Button
                            danger
                            disabled={selectedRowKeys.length === 0}
                        >
                            批量永久删除
                        </Button>
                    </Popconfirm>
                </Space>
            </div>
            {!screens.md ? (
                <List
                    dataSource={items}
                    loading={loading}
                    renderItem={item => (
                        <List.Item
                            actions={[
                                <Button type="link" size="small" onClick={() => handleRestore(item.id)}>恢复</Button>,
                                <Popconfirm title="确定要永久删除吗？" onConfirm={() => handleDelete(item.id)}>
                                    <Button type="link" size="small" danger>删除</Button>
                                </Popconfirm>
                            ]}
                        >
                            <List.Item.Meta
                                title={
                                    <span>
                                        {item.filename} <span style={{ color: '#999', fontSize: '12px' }}>(ID: {item.fileId})</span>
                                    </span>
                                }
                                description={
                                    <div style={{ fontSize: '12px' }}>
                                        <div>删除时间: {moment(item.deletedAt).format('YYYY-MM-DD HH:mm')}</div>
                                        <div>过期时间: {moment(item.expireAt).format('YYYY-MM-DD HH:mm')}</div>
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            ) : (
                <Table
                    rowSelection={rowSelection}
                    columns={columns}
                    dataSource={items}
                    rowKey="id"
                    loading={loading}
                />
            )}
        </div>
    );
};

export default RecycleBin;
