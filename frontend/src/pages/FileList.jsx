import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Breadcrumb, Upload, message, Modal, Input, Dropdown, Space, Grid, List, Select } from 'antd';
import {
    FolderFilled,
    FileOutlined,
    UploadOutlined,
    FolderAddOutlined,
    MoreOutlined,
    DownloadOutlined,
    DeleteOutlined,
    EditOutlined,
    ShareAltOutlined,
    AppstoreOutlined,
    BarsOutlined,
    PlayCircleOutlined
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import moment from 'moment';

const FileList = () => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [parentId, setParentId] = useState(0);
    const [breadcrumbs, setBreadcrumbs] = useState([{ id: 0, name: 'Home' }]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();
    const screens = Grid.useBreakpoint();
    const [viewMode, setViewMode] = useState(() => window.innerWidth < 768 ? 'grid' : 'list'); // 'list' or 'grid'
    const [searchKeyword, setSearchKeyword] = useState('');
    const [sortField, setSortField] = useState('updatedAt');
    const [sortOrder, setSortOrder] = useState('desc');

    // Helper to generate menu items (moved out of columns for reuse)
    const getMenuItems = (record) => [
        {
            key: 'download',
            icon: <DownloadOutlined />,
            label: '下载',
            onClick: () => handleDownload(record),
            disabled: record.isFolder
        },
        {
            key: 'share',
            icon: <ShareAltOutlined />,
            label: '分享',
            onClick: () => {
                setShareFileId(record.id);
                setShareResult(null);
                setIsShareModalVisible(true);
            },
            disabled: record.isFolder // Disable share for folders
        },
        {
            key: 'rename',
            icon: <EditOutlined />,
            label: '重命名',
            onClick: () => {
                setRenameFileId(record.id);
                setRenameValue(record.filename);
                setIsRenameModalVisible(true);
            }
        },
        {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: '删除',
            danger: true,
            onClick: () => handleDelete(record.id)
        }
    ];

    // Rename state
    const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
    const [renameFileId, setRenameFileId] = useState(null);
    const [renameValue, setRenameValue] = useState('');

    // Share state
    const [isShareModalVisible, setIsShareModalVisible] = useState(false);
    const [shareFileId, setShareFileId] = useState(null);
    const [shareDays, setShareDays] = useState(7);
    const [shareAccessCode, setShareAccessCode] = useState('');
    const [shareResult, setShareResult] = useState(null);

    useEffect(() => {
        const pid = parseInt(searchParams.get('parentId') || '0');
        setParentId(pid);

        // Sync breadcrumbs with URL changes (handling Back button)
        const index = breadcrumbs.findIndex(b => b.id === pid);
        if (index !== -1) {
            // If the current ID is in our breadcrumb history, truncate to it
            if (index < breadcrumbs.length - 1) {
                setBreadcrumbs(breadcrumbs.slice(0, index + 1));
            }
        } else if (pid === 0) {
            // Reset to Home if root
            setBreadcrumbs([{ id: 0, name: 'Home' }]);
        }
    }, [searchParams, breadcrumbs]);

    useEffect(() => {
        fetchFiles(parentId);
    }, [parentId]);

    const fetchFiles = async (pId) => {
        setLoading(true);
        try {
            const res = await api.get(`/file/list?parentId=${pId}`);
            if (res.code === 200) {
                setFiles(res.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleNavigate = (file) => {
        if (file.isFolder) {
            // Update URL params instead of just state to support browser back button
            setSearchParams({ parentId: file.id });
            setBreadcrumbs([...breadcrumbs, { id: file.id, name: file.filename }]);
        }
    };

    const handleBreadcrumbClick = (index) => {
        const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
        setBreadcrumbs(newBreadcrumbs);
        const newPid = newBreadcrumbs[newBreadcrumbs.length - 1].id;
        setSearchParams({ parentId: newPid });
    };

    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    // Global folder cache for batch folder upload
    const folderCache = React.useRef(new Map());
    const pendingFiles = React.useRef([]);
    const isProcessing = React.useRef(false);

    // Process batch folder upload
    const processBatchFolderUpload = async () => {
        if (isProcessing.current || pendingFiles.current.length === 0) return;

        isProcessing.current = true;
        const files = [...pendingFiles.current];
        pendingFiles.current = [];

        try {
            // Step 1: Analyze folder structure from all files
            const folderStructure = new Map(); // path -> folder name
            const fileMap = new Map(); // file -> full relative path

            for (const file of files) {
                const relativePath = file.webkitRelativePath || file.path;
                if (!relativePath) continue;

                fileMap.set(file, relativePath);

                // Extract folder paths
                const pathParts = relativePath.split('/');
                if (pathParts.length > 1) {
                    // Build folder path hierarchy
                    for (let i = 0; i < pathParts.length - 1; i++) {
                        const folderPath = pathParts.slice(0, i + 1).join('/');
                        const folderName = pathParts[i];
                        folderStructure.set(folderPath, folderName);
                    }
                }
            }

            // Step 2: Create folders in hierarchical order (sort by depth)
            const sortedFolderPaths = Array.from(folderStructure.keys()).sort((a, b) => {
                const depthA = a.split('/').length;
                const depthB = b.split('/').length;
                return depthA - depthB;
            });

            message.loading({ content: '正在创建文件夹结构...', key: 'folderUpload', duration: 0 });

            for (const folderPath of sortedFolderPaths) {
                const folderName = folderStructure.get(folderPath);
                const parentPath = folderPath.split('/').slice(0, -1).join('/');

                // Get parent folder ID
                let currentParentId = parentId;
                if (parentPath && folderCache.current.has(parentPath)) {
                    currentParentId = folderCache.current.get(parentPath);
                }

                const cacheKey = `${currentParentId}-${folderName}`;

                // Check cache
                if (folderCache.current.has(cacheKey)) {
                    folderCache.current.set(folderPath, folderCache.current.get(cacheKey));
                    continue;
                }

                // Check if folder exists
                try {
                    const listRes = await api.get(`/file/list?parentId=${currentParentId}`);
                    let existingFolder = null;
                    if (listRes.code === 200) {
                        existingFolder = listRes.data.find(f => f.filename === folderName && f.isFolder === 1);
                    }

                    if (existingFolder) {
                        folderCache.current.set(cacheKey, existingFolder.id);
                        folderCache.current.set(folderPath, existingFolder.id);
                    } else {
                        // Create new folder
                        const res = await api.post('/file/folder', {
                            name: folderName,
                            parentId: currentParentId
                        });

                        if (res.code === 200) {
                            folderCache.current.set(cacheKey, res.data.id);
                            folderCache.current.set(folderPath, res.data.id);
                        }
                    }
                } catch (error) {
                    console.error(`创建文件夹 ${folderName} 失败:`, error);
                }
            }

            message.destroy('folderUpload');

            // Step 3: Upload all files to their target folders
            message.loading({ content: `正在上传 ${files.length} 个文件...`, key: 'fileUpload', duration: 0 });

            let successCount = 0;
            let failCount = 0;

            for (const file of files) {
                const relativePath = fileMap.get(file);
                if (!relativePath) {
                    // Regular file without path
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('parentId', parentId);
                    try {
                        await api.post('/file/upload', formData);
                        successCount++;
                    } catch (error) {
                        failCount++;
                    }
                    continue;
                }

                const pathParts = relativePath.split('/');
                if (pathParts.length <= 1) {
                    // File in root
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('parentId', parentId);
                    try {
                        await api.post('/file/upload', formData);
                        successCount++;
                    } catch (error) {
                        failCount++;
                    }
                    continue;
                }

                // Get target folder ID
                const targetFolderPath = pathParts.slice(0, -1).join('/');
                const targetFolderId = folderCache.current.get(targetFolderPath) || parentId;

                const formData = new FormData();
                formData.append('file', file);
                formData.append('parentId', targetFolderId);

                try {
                    await api.post('/file/upload', formData);
                    successCount++;
                } catch (error) {
                    failCount++;
                }
            }

            message.destroy('fileUpload');

            if (successCount > 0) {
                message.success(`成功上传 ${successCount} 个文件`);
                fetchFiles(parentId);
            }
            if (failCount > 0) {
                message.error(`${failCount} 个文件上传失败`);
            }

        } catch (error) {
            message.error('文件夹上传失败');
            console.error(error);
        } finally {
            isProcessing.current = false;
            folderCache.current.clear();

            // Process remaining files if any
            if (pendingFiles.current.length > 0) {
                setTimeout(processBatchFolderUpload, 100);
            }
        }
    };

    // Handle regular file upload
    const handleUpload = async ({ file, onSuccess, onError, onProgress }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('parentId', parentId);

        try {
            await api.post('/file/upload', formData, {
                onUploadProgress: (progressEvent) => {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress({ percent });
                },
            });
            message.success(`${file.name} 上传成功`);
            fetchFiles(parentId);
            onSuccess("ok");
        } catch (error) {
            message.error(`${file.name} 上传失败`);
            onError(error);
        }
    };

    // Handle folder upload - collect files and batch process
    const handleFolderUpload = async ({ file, onSuccess, onError, onProgress }) => {
        const relativePath = file.webkitRelativePath || file.path;

        if (!relativePath) {
            // Regular file upload
            return handleUpload({ file, onSuccess, onError, onProgress });
        }

        // Add to pending queue
        pendingFiles.current.push(file);

        // Simulate progress for UI
        onProgress({ percent: 0 });

        // Trigger batch processing (will wait for all files to be collected)
        setTimeout(() => {
            processBatchFolderUpload();
            onSuccess("queued");
        }, 100);
    };

    const handleBatchDelete = async () => {
        if (selectedRowKeys.length === 0) return;
        Modal.confirm({
            title: '确认删除',
            content: `确定要删除选中的 ${selectedRowKeys.length} 个文件吗？`,
            onOk: async () => {
                try {
                    // Loop delete for now as backend doesn't support batch
                    for (const id of selectedRowKeys) {
                        await api.delete(`/file/${id}`);
                    }
                    message.success('批量删除成功');
                    setSelectedRowKeys([]);
                    fetchFiles(parentId);
                } catch (error) {
                    message.error('部分文件删除失败');
                }
            }
        });
    };

    const handleBatchDownload = () => {
        if (selectedRowKeys.length === 0) return;
        const token = localStorage.getItem('token');
        const fileIds = selectedRowKeys.join(',');
        const downloadUrl = `/cloudpan-api/file/batch-download?fileIds=${fileIds}&token=${token}`;

        const link = document.createElement('a');
        link.href = downloadUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.success('开始下载...');
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys) => {
            setSelectedRowKeys(newSelectedRowKeys);
        },
    };

    const handleCreateFolder = async () => {
        if (!newFolderName) return;
        try {
            await api.post('/file/folder', { name: newFolderName, parentId });
            message.success('文件夹创建成功');
            setIsModalVisible(false);
            setNewFolderName('');
            fetchFiles(parentId);
        } catch (error) {
            // Error handled
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/file/${id}`);
            message.success('删除成功');
            fetchFiles(parentId);
        } catch (error) {
            // Error handled
        }
    };

    const handleDownload = (file) => {
        if (file.isFolder) return;
        const token = localStorage.getItem('token');
        const downloadUrl = `/cloudpan-api/file/download/${file.id}?token=${token}`;

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', file.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRename = async () => {
        if (!renameValue) return;
        try {
            await api.put(`/file/${renameFileId}/rename`, { name: renameValue });
            message.success('重命名成功');
            setIsRenameModalVisible(false);
            fetchFiles(parentId);
        } catch (error) {
            // Error handled
        }
    };

    const handleShare = async () => {
        try {
            const res = await api.post('/share/create', {
                fileId: shareFileId,
                days: shareDays,
                accessCode: shareAccessCode
            });
            if (res.code === 200) {
                setShareResult(res.data);
            }
        } catch (error) {
            // Error handled
        }
    };

    // Preview state
    const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);
    const [previewContent, setPreviewContent] = useState(null);
    const [previewType, setPreviewType] = useState('unknown'); // image, video, text, unknown

    const handlePreview = async (file) => {
        if (file.isFolder) return;

        const ext = file.filename.split('.').pop().toLowerCase();
        setPreviewFile(file);
        setIsPreviewModalVisible(true);
        setPreviewContent(null);

        const previewUrl = `/file/download/${file.id}?preview=true`;

        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
            setPreviewType('image');
            setPreviewContent(previewUrl);
        } else if (['mp4', 'webm'].includes(ext)) {
            setPreviewType('video');
            setPreviewContent(previewUrl);
        } else if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) {
            setPreviewType('audio');
            setPreviewContent(previewUrl);
        } else if (ext === 'pdf') {
            setPreviewType('pdf');
            const token = localStorage.getItem('token');
            setPreviewContent(`/cloudpan-api/file/download/${file.id}?preview=true&token=${token}`);
        } else if (['txt', 'java', 'js', 'css', 'html', 'xml', 'json', 'md', 'sql', 'py', 'c', 'cpp', 'h', 'ts', 'tsx', 'jsx', 'vue'].includes(ext)) {
            setPreviewType('text');
            try {
                const res = await api.get(previewUrl, { responseType: 'text' });
                setPreviewContent(res);
            } catch (error) {
                setPreviewContent('无法加载文件内容');
            }
        } else {
            setPreviewType('unknown');
        }
    };

    // Sub-component for media preview to handle auth
    const MediaPreview = ({ file, type }) => {
        const token = localStorage.getItem('token');
        const src = `/cloudpan-api/file/download/${file.id}?preview=true&token=${token}`;

        if (type === 'image') {
            return (
                <img
                    src={src}
                    alt={file.filename}
                    style={{ maxWidth: '100%', maxHeight: '70vh' }}
                    onError={(e) => { message.error('加载图片失败'); }}
                />
            );
        } else if (type === 'video') {
            const posterUrl = `/cloudpan-api/file/preview/thumbnail/${file.id}?token=${token}`;
            return (
                <video
                    src={src}
                    controls
                    preload="none"
                    poster={posterUrl}
                    style={{ maxWidth: '100%', maxHeight: '70vh' }}
                    onError={(e) => { console.error('Video load error', e); }}
                />
            );
        } else if (type === 'audio') {
            return (
                <audio
                    src={src}
                    controls
                    style={{ width: '100%' }}
                    onError={(e) => { message.error('加载音频失败'); }}
                />
            );
        }
        return null;
    };

    const renderPreviewContent = () => {
        if (!previewFile) return null;

        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                {previewType === 'text' && (
                    <pre style={{ maxHeight: '60vh', overflow: 'auto', width: '100%', whiteSpace: 'pre-wrap' }}>
                        {previewContent}
                    </pre>
                )}
                {previewType === 'pdf' && (
                    <iframe src={previewContent} style={{ width: '100%', height: '60vh', border: 'none' }} title="PDF Preview" />
                )}
                {previewType === 'unknown' && (
                    <div>
                        <p>该文件类型不支持预览</p>
                        <Button type="primary" onClick={() => handleDownload(previewFile)}>下载文件</Button>
                    </div>
                )}
                {(previewType === 'image' || previewType === 'video' || previewType === 'audio') && (
                    <MediaPreview file={previewFile} type={previewType} />
                )}
            </div>
        );
    };

    const renderFileIcon = (item, size) => {
        if (item.isFolder) {
            return <FolderFilled style={{ color: '#1890ff', fontSize: `${size}px` }} />;
        }
        const fileType = item.fileType?.toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileType);
        const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(fileType);

        if (isImage || isVideo) {
            return (
                <div style={{ position: 'relative', width: size, height: size, display: 'inline-block', verticalAlign: 'middle' }}>
                    <img
                        src={`/cloudpan-api/file/preview/thumbnail/${item.id}?token=${localStorage.getItem('token')}`}
                        alt={item.filename}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: size > 40 ? 8 : 4 }}
                        onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                    />
                    {isVideo && (
                        <PlayCircleOutlined style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontSize: size * 0.4,
                            textShadow: '0 0 4px rgba(0,0,0,0.5)'
                        }} />
                    )}
                </div>
            );
        }
        return <FileOutlined style={{ fontSize: `${size}px`, color: '#555' }} />;
    };

    const displayedFiles = useMemo(() => {
        const keyword = searchKeyword.trim().toLowerCase();
        const filtered = files.filter(item => item.filename?.toLowerCase().includes(keyword));
        const sorted = [...filtered].sort((a, b) => {
            const aFolder = !!a.isFolder;
            const bFolder = !!b.isFolder;
            if (aFolder !== bFolder) return aFolder ? -1 : 1;

            if (sortField === 'filename') {
                const aName = a.filename || '';
                const bName = b.filename || '';
                const compare = aName.localeCompare(bName, 'zh-CN');
                return sortOrder === 'asc' ? compare : -compare;
            }
            if (sortField === 'fileSize') {
                const aSize = Number(a.fileSize || 0);
                const bSize = Number(b.fileSize || 0);
                return sortOrder === 'asc' ? aSize - bSize : bSize - aSize;
            }
            const aTime = new Date(a.updatedAt || 0).getTime();
            const bTime = new Date(b.updatedAt || 0).getTime();
            return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
        });
        return sorted;
    }, [files, searchKeyword, sortField, sortOrder]);

    const columns = [
        {
            title: '文件名',
            dataIndex: 'filename',
            key: 'filename',
            render: (text, record) => (
                <Space style={{ cursor: 'pointer' }} onClick={() => record.isFolder ? handleNavigate(record) : handlePreview(record)}>
                    {renderFileIcon(record, 20)}
                    {text}
                </Space>
            ),
        },
        {
            title: '大小',
            dataIndex: 'fileSize',
            key: 'fileSize',
            render: (size) => size ? (size / 1024 / 1024).toFixed(2) + ' MB' : '-',
        },
        {
            title: '修改日期',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            render: (date) => moment(date).format('YYYY-MM-DD HH:mm'),
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => {
                const menuItems = getMenuItems(record);
                return (
                    <Dropdown menu={{ items: menuItems }}>
                        <Button type="text" icon={<MoreOutlined />} />
                    </Dropdown>
                );
            },
        },
    ];

    const breadcrumbItems = breadcrumbs.map((item, index) => ({
        title: (
            <span
                key={item.id}
                onClick={() => handleBreadcrumbClick(index)}
                style={{ cursor: 'pointer' }}
            >
                {item.name === 'Home' ? '首页' : item.name}
            </span>
        )
    }));

    // Move state
    const [isMoveModalVisible, setIsMoveModalVisible] = useState(false);
    const [moveTargetId, setMoveTargetId] = useState(0);
    const [moveTargetName, setMoveTargetName] = useState('根目录');
    const [moveFolderList, setMoveFolderList] = useState([]);
    const [moveFolderBreadcrumbs, setMoveFolderBreadcrumbs] = useState([{ id: 0, name: '根目录' }]);
    const [filesToMove, setFilesToMove] = useState([]); // Array of IDs

    const fetchMoveFolders = async (pId) => {
        try {
            const res = await api.get(`/file/list?parentId=${pId}`);
            if (res.code === 200) {
                // Filter only folders
                const folders = res.data.filter(f => f.isFolder === 1);
                setMoveFolderList(folders);
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (isMoveModalVisible) {
            fetchMoveFolders(moveTargetId);
        }
    }, [isMoveModalVisible, moveTargetId]);

    const handleOpenMoveModal = (ids) => {
        setFilesToMove(ids);
        setMoveTargetId(0);
        setMoveFolderBreadcrumbs([{ id: 0, name: '根目录' }]);
        setIsMoveModalVisible(true);
    };

    const handleMoveNavigate = (folder) => {
        setMoveTargetId(folder.id);
        setMoveFolderBreadcrumbs([...moveFolderBreadcrumbs, { id: folder.id, name: folder.filename }]);
    };

    const handleMoveBreadcrumbClick = (index) => {
        const newBreadcrumbs = moveFolderBreadcrumbs.slice(0, index + 1);
        setMoveFolderBreadcrumbs(newBreadcrumbs);
        setMoveTargetId(newBreadcrumbs[newBreadcrumbs.length - 1].id);
    };

    const handleConfirmMove = async () => {
        try {
            await api.post('/file/batch-move', {
                fileIds: filesToMove.join(','),
                targetParentId: moveTargetId
            });
            message.success('移动成功');
            setIsMoveModalVisible(false);
            setSelectedRowKeys([]);
            fetchFiles(parentId);
        } catch (error) {
            // Error handled
        }
    };

    // Drag and Drop handlers
    const [isDragOver, setIsDragOver] = useState(false);
    const dragCounter = React.useRef(0);
    const isInternalDrag = React.useRef(false);

    const handleDragStart = (e, file) => {
        isInternalDrag.current = true;
        // If dragging a selected file, move all selected. Otherwise just the one.
        let ids = [];
        if (selectedRowKeys.includes(file.id)) {
            ids = selectedRowKeys;
        } else {
            ids = [file.id];
        }
        e.dataTransfer.setData('application/json', JSON.stringify(ids));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        isInternalDrag.current = false;
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    // Helper function to recursively read dragged folder contents
    const readDirectory = async (entry, path = '') => {
        const files = [];

        if (entry.isFile) {
            // Get the file
            const file = await new Promise((resolve) => {
                entry.file(resolve);
            });
            // Add relative path as a custom property
            file.customRelativePath = path + file.name;
            files.push(file);
        } else if (entry.isDirectory) {
            // Read directory contents
            const reader = entry.createReader();
            const entries = await new Promise((resolve) => {
                reader.readEntries(resolve);
            });

            // Recursively read subdirectories
            for (const childEntry of entries) {
                const childFiles = await readDirectory(childEntry, path + entry.name + '/');
                files.push(...childFiles);
            }
        }

        return files;
    };

    // Batch process dragged files/folders
    const batchUploadFiles = async (filesWithPaths, targetParentId) => {
        try {
            // Step 1: Analyze folder structure
            const folderStructure = new Map();
            const fileMap = new Map();

            for (const file of filesWithPaths) {
                const relativePath = file.customRelativePath || file.webkitRelativePath || file.path;
                if (!relativePath) {
                    fileMap.set(file, null); // No path, upload to targetParentId
                    continue;
                }

                fileMap.set(file, relativePath);

                // Extract folder paths
                const pathParts = relativePath.split('/');
                if (pathParts.length > 1) {
                    for (let i = 0; i < pathParts.length - 1; i++) {
                        const folderPath = pathParts.slice(0, i + 1).join('/');
                        const folderName = pathParts[i];
                        folderStructure.set(folderPath, folderName);
                    }
                }
            }

            // Step 2: Create folders in hierarchical order
            const sortedFolderPaths = Array.from(folderStructure.keys()).sort((a, b) => {
                const depthA = a.split('/').length;
                const depthB = b.split('/').length;
                return depthA - depthB;
            });

            if (sortedFolderPaths.length > 0) {
                message.loading({ content: '正在创建文件夹结构...', key: 'dragFolderUpload', duration: 0 });
            }

            const localFolderCache = new Map();

            for (const folderPath of sortedFolderPaths) {
                const folderName = folderStructure.get(folderPath);
                const parentPath = folderPath.split('/').slice(0, -1).join('/');

                let currentParentId = targetParentId;
                if (parentPath && localFolderCache.has(parentPath)) {
                    currentParentId = localFolderCache.get(parentPath);
                }

                const cacheKey = `${currentParentId}-${folderName}`;

                // Check cache
                if (localFolderCache.has(cacheKey)) {
                    localFolderCache.set(folderPath, localFolderCache.get(cacheKey));
                    continue;
                }

                // Check if folder exists
                try {
                    const listRes = await api.get(`/file/list?parentId=${currentParentId}`);
                    let existingFolder = null;
                    if (listRes.code === 200) {
                        existingFolder = listRes.data.find(f => f.filename === folderName && f.isFolder === 1);
                    }

                    if (existingFolder) {
                        localFolderCache.set(cacheKey, existingFolder.id);
                        localFolderCache.set(folderPath, existingFolder.id);
                    } else {
                        // Create new folder
                        const res = await api.post('/file/folder', {
                            name: folderName,
                            parentId: currentParentId
                        });

                        if (res.code === 200) {
                            localFolderCache.set(cacheKey, res.data.id);
                            localFolderCache.set(folderPath, res.data.id);
                        }
                    }
                } catch (error) {
                    console.error(`创建文件夹 ${folderName} 失败:`, error);
                }
            }

            if (sortedFolderPaths.length > 0) {
                message.destroy('dragFolderUpload');
            }

            // Step 3: Upload files
            if (filesWithPaths.length > 0) {
                message.loading({ content: `正在上传 ${filesWithPaths.length} 个文件...`, key: 'dragFileUpload', duration: 0 });
            }

            let successCount = 0;
            let failCount = 0;

            for (const file of filesWithPaths) {
                const relativePath = fileMap.get(file);

                let uploadParentId = targetParentId;

                if (relativePath) {
                    const pathParts = relativePath.split('/');
                    if (pathParts.length > 1) {
                        const targetFolderPath = pathParts.slice(0, -1).join('/');
                        uploadParentId = localFolderCache.get(targetFolderPath) || targetParentId;
                    }
                }

                const formData = new FormData();
                formData.append('file', file);
                formData.append('parentId', uploadParentId);

                try {
                    await api.post('/file/upload', formData);
                    successCount++;
                } catch (error) {
                    failCount++;
                }
            }

            if (filesWithPaths.length > 0) {
                message.destroy('dragFileUpload');
            }

            if (successCount > 0) {
                message.success(`成功上传 ${successCount} 个文件`);
                fetchFiles(parentId);
            }
            if (failCount > 0) {
                message.error(`${failCount} 个文件上传失败`);
            }

        } catch (error) {
            message.error('上传失败');
            console.error(error);
        }
    };

    const handleDrop = async (e, targetFolder) => {
        e.preventDefault();
        e.stopPropagation();

        dragCounter.current = 0;
        setIsDragOver(false);

        const filesWithPaths = [];

        // Check if it's a file/folder upload from OS
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            const items = Array.from(e.dataTransfer.items);

            for (const item of items) {
                if (item.kind === 'file') {
                    const entry = item.webkitGetAsEntry && item.webkitGetAsEntry();

                    if (entry) {
                        // Modern browser with webkitGetAsEntry support
                        const files = await readDirectory(entry);
                        filesWithPaths.push(...files);
                    } else {
                        // Fallback: just get the file
                        const file = item.getAsFile();
                        if (file) {
                            filesWithPaths.push(file);
                        }
                    }
                }
            }

            if (filesWithPaths.length > 0) {
                await batchUploadFiles(filesWithPaths, targetFolder.id);
            }
            return;
        }

        // Fallback: check dataTransfer.files
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            filesWithPaths.push(...files);
            await batchUploadFiles(filesWithPaths, targetFolder.id);
            return;
        }

        // Handle internal drag (move files)
        const data = e.dataTransfer.getData('application/json');
        if (!data) return;

        const ids = JSON.parse(data);
        if (ids.includes(targetFolder.id)) return;

        try {
            await api.post('/file/batch-move', {
                fileIds: ids.join(','),
                targetParentId: targetFolder.id
            });
            message.success('移动成功');
            setSelectedRowKeys([]);
            fetchFiles(parentId);
        } catch (error) {
            // Error handled
        }
    };

    const handleContainerDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only show overlay if it's NOT an internal drag
        if (isInternalDrag.current) return;

        dragCounter.current += 1;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragOver(true);
        }
    };

    const handleContainerDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isInternalDrag.current) return;

        dragCounter.current -= 1;
        if (dragCounter.current === 0) {
            setIsDragOver(false);
        }
    };

    const handleContainerDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isInternalDrag.current) return;
        e.dataTransfer.dropEffect = 'copy'; // Indicate copy for file uploads
    };

    const handleContainerDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        dragCounter.current = 0;
        setIsDragOver(false);

        if (isInternalDrag.current) {
            isInternalDrag.current = false;
            return;
        }

        const filesWithPaths = [];

        // Check if it's a file/folder upload from OS
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            const items = Array.from(e.dataTransfer.items);

            for (const item of items) {
                if (item.kind === 'file') {
                    const entry = item.webkitGetAsEntry && item.webkitGetAsEntry();

                    if (entry) {
                        // Modern browser with webkitGetAsEntry support
                        const files = await readDirectory(entry);
                        filesWithPaths.push(...files);
                    } else {
                        // Fallback: just get the file
                        const file = item.getAsFile();
                        if (file) {
                            filesWithPaths.push(file);
                        }
                    }
                }
            }

            if (filesWithPaths.length > 0) {
                await batchUploadFiles(filesWithPaths, parentId);
            }
            return;
        }

        // Fallback: check dataTransfer.files
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            filesWithPaths.push(...files);
            await batchUploadFiles(filesWithPaths, parentId);
        }
    };

    return (
        <div
            onDragEnter={handleContainerDragEnter}
            onDragLeave={handleContainerDragLeave}
            onDragOver={handleContainerDragOver}
            onDrop={handleContainerDrop}
            style={{ minHeight: '80vh', position: 'relative' }} // Ensure it covers enough space
        >
            <style>
                {`
                    @keyframes borderRotate {
                        100% {
                            transform: rotate(1turn);
                        }
                    }
                    .rainbow-border {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        z-index: 1000;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        background-color: rgba(0, 0, 0, 0.05);
                        border-radius: 8px;
                    }
                    .rainbow-border::before {
                        content: '';
                        position: absolute;
                        width: 200%;
                        height: 200%;
                        background: conic-gradient(
                            #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8f00ff, #ff0000
                        );
                        animation: borderRotate 4s linear infinite;
                        z-index: -2;
                    }
                    .rainbow-border::after {
                        content: '';
                        position: absolute;
                        inset: 4px;
                        background: rgba(255, 255, 255, 0.9);
                        border-radius: 6px;
                        z-index: -1;
                    }
                `}
            </style>
            {isDragOver && (
                <div className="rainbow-border">
                    <UploadOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16, zIndex: 1 }} />
                    <span style={{ fontSize: 20, color: '#1890ff', fontWeight: 500, zIndex: 1 }}>
                        松开鼠标上传文件/文件夹
                    </span>
                    <span style={{ fontSize: 14, color: '#666', marginTop: 8, zIndex: 1 }}>
                        （文件夹拖拽支持取决于浏览器）
                    </span>
                </div>
            )}
            <div style={{ marginBottom: 16, display: 'flex', flexDirection: screens.md ? 'row' : 'column', justifyContent: 'space-between', gap: 10 }}>
                <Space wrap>
                    <Upload customRequest={handleUpload} showUploadList={true} multiple={true}>
                        <Button type="primary" icon={<UploadOutlined />}>上传文件</Button>
                    </Upload>
                    <Upload
                        customRequest={handleFolderUpload}
                        showUploadList={true}
                        multiple={true}
                        directory
                        webkitdirectory
                    >
                        <Button icon={<FolderAddOutlined />}>上传文件夹</Button>
                    </Upload>
                    <Button icon={<FolderAddOutlined />} onClick={() => setIsModalVisible(true)}>新建文件夹</Button>
                    {selectedRowKeys.length > 0 && (
                        <>
                            <Button icon={<DownloadOutlined />} onClick={handleBatchDownload}>
                                批量下载
                            </Button>
                            <Button icon={<FolderFilled />} onClick={() => handleOpenMoveModal(selectedRowKeys)}>
                                批量移动
                            </Button>
                            <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
                                批量删除 ({selectedRowKeys.length})
                            </Button>
                        </>
                    )}
                </Space>
                <Space>
                    <Input
                        allowClear
                        placeholder="搜索当前文件夹"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        style={{ width: screens.md ? 220 : '100%' }}
                    />
                    <Select
                        value={sortField}
                        onChange={setSortField}
                        style={{ width: 120 }}
                        options={[
                            { label: '文件名', value: 'filename' },
                            { label: '大小', value: 'fileSize' },
                            { label: '修改时间', value: 'updatedAt' }
                        ]}
                    />
                    <Select
                        value={sortOrder}
                        onChange={setSortOrder}
                        style={{ width: 100 }}
                        options={[
                            { label: '升序', value: 'asc' },
                            { label: '降序', value: 'desc' }
                        ]}
                    />
                    <Button
                        icon={<BarsOutlined />}
                        type={viewMode === 'list' ? 'primary' : 'default'}
                        onClick={() => setViewMode('list')}
                    />
                    <Button
                        icon={<AppstoreOutlined />}
                        type={viewMode === 'grid' ? 'primary' : 'default'}
                        onClick={() => setViewMode('grid')}
                    />
                </Space>
            </div>
            <div style={{ marginBottom: 16 }}>
                <Breadcrumb items={breadcrumbItems} />
            </div>

            {viewMode === 'grid' ? (
                <List
                    grid={{ gutter: 16, xs: 2, sm: 3, md: 4, lg: 6, xl: 8, xxl: 10 }}
                    dataSource={displayedFiles}
                    loading={loading}
                    renderItem={item => (
                        <List.Item>
                            <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, item)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => item.isFolder ? handleDragOver(e) : null}
                                onDrop={(e) => item.isFolder ? handleDrop(e, item) : null}
                                style={{
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    padding: 10,
                                    borderRadius: 8,
                                    border: selectedRowKeys.includes(item.id) ? '1px solid #1890ff' : '1px solid transparent',
                                    background: selectedRowKeys.includes(item.id) ? '#e6f7ff' : 'transparent'
                                }}
                                onClick={() => item.isFolder ? handleNavigate(item) : handlePreview(item)}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    if (!selectedRowKeys.includes(item.id)) {
                                        setSelectedRowKeys([item.id]);
                                    }
                                }}
                            >
                                <Dropdown menu={{ items: getMenuItems(item) }} trigger={['contextMenu']}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                        {renderFileIcon(item, item.isFolder ? 64 : 80)}
                                        <div style={{
                                            wordBreak: 'break-all',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            fontSize: '12px'
                                        }}>
                                            {item.filename}
                                        </div>
                                    </div>
                                </Dropdown>
                            </div>
                        </List.Item>
                    )}
                />
            ) : (
                !screens.md ? (
                    <List
                        dataSource={displayedFiles}
                        loading={loading}
                        renderItem={item => (
                            <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, item)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => item.isFolder ? handleDragOver(e) : null}
                                onDrop={(e) => item.isFolder ? handleDrop(e, item) : null}
                            >
                                <List.Item
                                    actions={[
                                        <Dropdown menu={{ items: getMenuItems(item) }} trigger={['click']}>
                                            <Button type="text" icon={<MoreOutlined />} />
                                        </Dropdown>
                                    ]}
                                >
                                    <List.Item.Meta
                                        avatar={renderFileIcon(item, 24)}
                                        title={
                                            <span onClick={() => item.isFolder ? handleNavigate(item) : handlePreview(item)}>
                                                {item.filename}
                                            </span>
                                        }
                                        description={
                                            <Space direction="vertical" size={0}>
                                                <span>{item.fileSize ? (item.fileSize / 1024 / 1024).toFixed(2) + ' MB' : '-'}</span>
                                                <span>{moment(item.updatedAt).format('YYYY-MM-DD HH:mm')}</span>
                                            </Space>
                                        }
                                    />
                                </List.Item>
                            </div>
                        )}
                    />
                ) : (
                    <Table
                        rowSelection={rowSelection}
                        columns={columns}
                        dataSource={displayedFiles}
                        rowKey="id"
                        loading={loading}
                        pagination={false}
                        onRow={(record) => ({
                            draggable: true,
                            onDragStart: (e) => handleDragStart(e, record),
                            onDragEnd: handleDragEnd,
                            onDragOver: (e) => {
                                if (record.isFolder) {
                                    handleDragOver(e);
                                    e.currentTarget.style.background = '#e6f7ff';
                                }
                            },
                            onDragLeave: (e) => {
                                e.currentTarget.style.background = '';
                            },
                            onDrop: (e) => {
                                e.currentTarget.style.background = '';
                                if (record.isFolder) {
                                    handleDrop(e, record);
                                }
                            }
                        })}
                    />
                )
            )}

            <Modal title="新建文件夹" open={isModalVisible} onOk={handleCreateFolder} onCancel={() => setIsModalVisible(false)}>
                <Input placeholder="文件夹名称" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} />
            </Modal>

            <Modal title="重命名" open={isRenameModalVisible} onOk={handleRename} onCancel={() => setIsRenameModalVisible(false)}>
                <Input placeholder="新名称" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
            </Modal>

            <Modal title="移动到" open={isMoveModalVisible} onOk={handleConfirmMove} onCancel={() => setIsMoveModalVisible(false)}>
                <div style={{ marginBottom: 10 }}>
                    <Breadcrumb>
                        {moveFolderBreadcrumbs.map((item, index) => (
                            <Breadcrumb.Item key={item.id} onClick={() => handleMoveBreadcrumbClick(index)} style={{ cursor: 'pointer' }}>
                                {item.name}
                            </Breadcrumb.Item>
                        ))}
                    </Breadcrumb>
                </div>
                <List
                    dataSource={moveFolderList}
                    renderItem={item => (
                        <List.Item onClick={() => handleMoveNavigate(item)} style={{ cursor: 'pointer', background: '#fafafa', marginBottom: 5, padding: '10px' }}>
                            <Space>
                                <FolderFilled style={{ color: '#1890ff' }} />
                                {item.filename}
                            </Space>
                        </List.Item>
                    )}
                    locale={{ emptyText: '没有子文件夹' }}
                />
            </Modal>

            <Modal title="分享文件" open={isShareModalVisible} onOk={handleShare} onCancel={() => setIsShareModalVisible(false)} footer={null}>
                {!shareResult ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <Input placeholder="提取码 (选填)" value={shareAccessCode} onChange={e => setShareAccessCode(e.target.value)} />
                        <Input type="number" placeholder="有效期(天) 默认7天" value={shareDays} onChange={e => setShareDays(e.target.value)} />
                        <Button type="primary" onClick={handleShare}>生成链接</Button>
                    </div>
                ) : (
                    <div>
                        <p>分享码: <strong>{shareResult.shareCode}</strong></p>
                        <p>链接: {window.location.origin}{process.env.PUBLIC_URL}/share/{shareResult.shareCode}</p>
                        {shareResult.accessCode && <p>提取码: {shareResult.accessCode}</p>}
                    </div>
                )}
            </Modal>

            <Modal
                title={previewFile?.filename}
                open={isPreviewModalVisible}
                onCancel={() => setIsPreviewModalVisible(false)}
                footer={null}
                width={800}
                destroyOnClose
            >
                {renderPreviewContent()}
            </Modal>
        </div>
    );
};

export default FileList;
