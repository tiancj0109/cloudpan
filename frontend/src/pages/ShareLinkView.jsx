import React, { useState, useEffect } from 'react';
import { Card, Input, Button, message, Spin, Result } from 'antd';
import { useParams } from 'react-router-dom';
import { FileOutlined, DownloadOutlined, LockOutlined } from '@ant-design/icons';
import api from '../utils/api';
import moment from 'moment';

import FilePreview from '../components/FilePreview';

const ShareLinkView = () => {
    const { shareCode } = useParams();
    const [loading, setLoading] = useState(true);
    const [shareInfo, setShareInfo] = useState(null);
    const [error, setError] = useState(null);
    const [accessCode, setAccessCode] = useState('');
    const [verified, setVerified] = useState(false);
    const [previewVisible, setPreviewVisible] = useState(false);

    const fetchShareInfo = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/public/share/${shareCode}`);
            if (res.code === 200) {
                setShareInfo(res.data);
                if (!res.data.needAccessCode) {
                    setVerified(true);
                }
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError('加载分享信息失败');
        } finally {
            setLoading(false);
        }
    }, [shareCode]);

    useEffect(() => {
        fetchShareInfo();
    }, [fetchShareInfo]);

    const handleVerify = async () => {
        try {
            const res = await api.post(`/public/share/${shareCode}/verify`, { accessCode });
            if (res.code === 200) {
                setVerified(true);
                message.success('验证成功');
            } else {
                message.error('提取码无效');
            }
        } catch (err) {
            message.error('验证失败');
        }
    };

    const handleDownload = () => {
        const downloadUrl = `/cloudpan-api/public/share/download/${shareCode}?accessCode=${encodeURIComponent(accessCode || '')}`;
        window.location.href = downloadUrl;
    };

    const handlePreview = () => {
        setPreviewVisible(true);
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: 50 }}><Spin size="large" /></div>;

    if (error) return <Result status="404" title="404" subTitle={error} />;

    if (!verified) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 100, padding: '0 20px' }}>
                <Card title="请输入提取码" style={{ width: '100%', maxWidth: 400 }}>
                    <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="提取码"
                        value={accessCode}
                        onChange={e => setAccessCode(e.target.value)}
                        style={{ marginBottom: 20 }}
                    />
                    <Button type="primary" block onClick={handleVerify}>验证</Button>
                </Card>
            </div>
        );
    }

    // Construct preview URL
    const previewUrl = `/cloudpan-api/public/share/download/${shareCode}?accessCode=${encodeURIComponent(accessCode || '')}&preview=true`;

    // Determine file type from filename
    const getFileType = (filename) => {
        if (!filename) return '';
        const parts = filename.split('.');
        return parts.length > 1 ? parts.pop() : '';
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 50, padding: '0 20px' }}>
            <Card title="分享文件" style={{ width: '100%', maxWidth: 600 }}>
                <div style={{ textAlign: 'center', marginBottom: 30 }}>
                    <FileOutlined style={{ fontSize: 64, color: '#1890ff' }} />
                    <h2 style={{ marginTop: 20 }}>{shareInfo.filename || `文件ID: ${shareInfo.fileId}`}</h2>
                    <p>分享者: {shareInfo.username || `用户ID: ${shareInfo.userId}`}</p>
                    <p>过期时间: {shareInfo.expireTime ? moment(shareInfo.expireTime).format('YYYY-MM-DD HH:mm') : '永久'}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Button icon={<FileOutlined />} block size="large" onClick={handlePreview}>
                        预览
                    </Button>
                    <Button type="primary" icon={<DownloadOutlined />} block size="large" onClick={handleDownload}>
                        下载
                    </Button>
                </div>
            </Card>

            <FilePreview
                visible={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                file={{
                    filename: shareInfo.filename,
                    fileType: getFileType(shareInfo.filename),
                    previewUrl: previewUrl
                }}
            />
        </div>
    );
};

export default ShareLinkView;
