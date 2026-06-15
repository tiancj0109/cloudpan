import React, { useState, useEffect } from 'react';
import { Modal, Input, Upload, Button, Select, message, Radio, List, Avatar, Checkbox } from 'antd';
import { PlusOutlined, VideoCameraOutlined, UserOutlined } from '@ant-design/icons';
import api from '../utils/api';

const { TextArea } = Input;
const { Option } = Select;

const PublishMoment = ({ visible, onCancel, onSuccess, friends }) => {
    const [content, setContent] = useState('');
    const [fileList, setFileList] = useState([]);
    const [visibility, setVisibility] = useState('PUBLIC');
    const [selectedFriends, setSelectedFriends] = useState([]);
    const [selectFriendVisible, setSelectFriendVisible] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [mediaType, setMediaType] = useState('NONE'); // 'IMAGE', 'VIDEO', 'NONE'

    useEffect(() => {
        if (!visible) {
            setContent('');
            setFileList([]);
            setVisibility('PUBLIC');
            setSelectedFriends([]);
            setMediaType('NONE');
        }
    }, [visible]);

    const handleUploadChange = ({ fileList: newFileList }) => {
        // Determine media type based on first file
        if (newFileList.length === 0) {
            setMediaType('NONE');
            setFileList([]);
            return;
        }

        const firstFile = newFileList[0];
        const isVideo = firstFile.type?.startsWith('video/') || firstFile.name?.match(/\.(mp4|mov|avi|webm)$/i);
        const currentType = isVideo ? 'VIDEO' : 'IMAGE';

        // If trying to mix types or exceed limits
        if (mediaType !== 'NONE' && mediaType !== currentType) {
            message.error('不能同时上传图片和视频');
            return;
        }

        if (currentType === 'VIDEO' && newFileList.length > 1) {
            message.error('只能上传一个视频');
            // Keep only the first one
            setFileList([newFileList[0]]);
            return;
        }

        if (currentType === 'IMAGE' && newFileList.length > 9) {
            message.error('最多上传9张图片');
            setFileList(newFileList.slice(0, 9));
            return;
        }

        setMediaType(currentType);
        setFileList(newFileList);
    };

    const beforeUpload = (file) => {
        const isVideo = file.type?.startsWith('video/') || file.name?.match(/\.(mp4|mov|avi|webm)$/i);
        const isImage = file.type?.startsWith('image/');

        if (!isVideo && !isImage) {
            message.error('只能上传图片或视频');
            return Upload.LIST_IGNORE;
        }

        const limit = isVideo ? 1024 : 100;
        const isLtLimit = file.size / 1024 / 1024 < limit;
        if (!isLtLimit) {
            message.error(`${isVideo ? '视频' : '图片'}大小不能超过${limit}MB`);
            return Upload.LIST_IGNORE;
        }

        return false; // Manual upload
    };

    const handlePublish = async () => {
        if (!content.trim() && fileList.length === 0) {
            message.error('请输入内容或上传文件');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('content', content);
            formData.append('visibility', visibility);
            formData.append('mediaType', mediaType);

            if (visibility === 'PARTIAL' || visibility === 'EXCLUDE') {
                formData.append('visibleUserIds', JSON.stringify(selectedFriends));
            }

            fileList.forEach(file => {
                formData.append('files', file.originFileObj);
            });

            // Add a flag to tell backend to store in moments folder
            formData.append('source', 'moments');

            const res = await api.post('/moments/publish', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.code === 200) {
                message.success('发布成功');
                onSuccess();
            } else {
                message.error(res.message || '发布失败');
            }
        } catch (err) {
            message.error('发布失败');
        } finally {
            setUploading(false);
        }
    };

    const renderFriendSelector = () => (
        <Modal
            title={visibility === 'PARTIAL' ? '选择可见好友' : '选择不可见好友'}
            open={selectFriendVisible}
            onOk={() => setSelectFriendVisible(false)}
            onCancel={() => setSelectFriendVisible(false)}
        >
            <List
                dataSource={friends}
                renderItem={item => (
                    <List.Item>
                        <List.Item.Meta
                            avatar={<Avatar src={`/cloudpan-api/auth/avatar/${item.friendId}`} icon={<UserOutlined />} />}
                            title={item.friendUsername}
                        />
                        <Checkbox
                            checked={selectedFriends.includes(item.friendId)}
                            onChange={e => {
                                if (e.target.checked) {
                                    setSelectedFriends([...selectedFriends, item.friendId]);
                                } else {
                                    setSelectedFriends(selectedFriends.filter(id => id !== item.friendId));
                                }
                            }}
                        />
                    </List.Item>
                )}
                style={{ maxHeight: 400, overflowY: 'auto' }}
            />
        </Modal>
    );

    return (
        <Modal
            title="发布朋友圈"
            open={visible}
            onCancel={onCancel}
            onOk={handlePublish}
            confirmLoading={uploading}
            okText="发布"
            cancelText="取消"
        >
            <TextArea
                rows={4}
                placeholder="这一刻的想法..."
                value={content}
                onChange={e => setContent(e.target.value)}
                style={{ marginBottom: 16, border: 'none', boxShadow: 'none', resize: 'none' }}
            />

            <Upload
                listType="picture-card"
                fileList={fileList}
                onPreview={() => { }}
                onChange={handleUploadChange}
                beforeUpload={beforeUpload}
                multiple
                accept="image/*,video/*"
            >
                {fileList.length >= 9 || (mediaType === 'VIDEO' && fileList.length >= 1) ? null : (
                    <div>
                        <PlusOutlined />
                        <div style={{ marginTop: 8 }}>上传</div>
                    </div>
                )}
            </Upload>

            <div style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => { }}>
                    <span>谁可以看</span>
                    <Select
                        value={visibility}
                        style={{ width: 120 }}
                        onChange={val => {
                            setVisibility(val);
                            if (val === 'PARTIAL' || val === 'EXCLUDE') {
                                setSelectFriendVisible(true);
                            }
                        }}
                        bordered={false}
                    >
                        <Option value="PUBLIC">公开</Option>
                        <Option value="PRIVATE">仅自己可见</Option>
                        <Option value="FRIENDS">仅好友可见</Option>
                        <Option value="PARTIAL">部分可见</Option>
                        <Option value="EXCLUDE">不给谁看</Option>
                    </Select>
                </div>
            </div>

            {renderFriendSelector()}
        </Modal>
    );
};

export default PublishMoment;
