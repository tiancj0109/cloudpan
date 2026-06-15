import React, { useState } from 'react';
import { Modal, Image } from 'antd';

const FilePreview = ({ file, visible, onCancel }) => {
    if (!file) return null;

    const fileType = file.fileType ? file.fileType.toLowerCase() : '';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileType);
    const isVideo = ['mp4', 'webm', 'ogg'].includes(fileType);
    const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(fileType);
    const isPdf = ['pdf'].includes(fileType);
    const isText = ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'java', 'py', 'c', 'cpp', 'h'].includes(fileType);

    // Construct preview URL
    // If it's a share link preview, we might need a special URL or token
    // For now, assume we use the download URL or a specific preview URL
    // Since ShareLinkView uses a special download URL with accessCode, we need to handle that.
    // However, FilePreview is generic. Let's pass the previewUrl as a prop or construct it based on context.
    // But here we only have 'file' object. 
    // Let's assume the parent component passes the full previewUrl.

    const previewUrl = file.previewUrl;

    const renderContent = () => {
        if (isImage) {
            return <Image src={previewUrl} style={{ width: '100%' }} />;
        }
        if (isVideo) {
            // For ShareLink, we might not have a direct thumbnail endpoint if it's public.
            // But if we are logged in or if we expose a public thumbnail endpoint...
            // The current FilePreview is used by ShareLinkView.
            // ShareLinkView uses public API. We haven't added public thumbnail API yet.
            // So for now, let's just use preload="metadata" or "none" without poster for public share,
            // OR we can try to use the same logic if we add public endpoint.
            // But wait, FilePreview is also used by FileList? No, FileList has its own MediaPreview.
            // Ah, FileList uses FilePreview? No, FileList has `renderPreviewContent` inline.
            // Wait, I see `import FilePreview from '../components/FilePreview';` in ShareLinkView.
            // Does FileList use it?
            // Let's check FileList imports. It doesn't seem to import FilePreview.
            // So FilePreview is mainly for ShareLinkView?
            // If so, we need to update ShareLinkView to support thumbnails too if we want consistency.
            // But the user asked generally.

            // Let's just add preload="none" for now to stop auto-loading.
            return <video src={previewUrl} controls preload="none" style={{ width: '100%', maxHeight: '80vh' }} />;
        }
        if (isAudio) {
            return <audio src={previewUrl} controls style={{ width: '100%' }} />;
        }
        if (isPdf) {
            return <iframe src={previewUrl} style={{ width: '100%', height: '80vh', border: 'none' }} title="PDF Preview" />;
        }
        if (isText) {
            return <iframe src={previewUrl} style={{ width: '100%', height: '80vh', border: 'none', background: '#fff' }} title="Text Preview" />;
        }
        return <div style={{ textAlign: 'center', padding: 20 }}>该文件类型暂不支持预览，请下载查看</div>;
    };

    return (
        <Modal
            title={file.filename}
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={800}
            centered
            destroyOnClose
        >
            {renderContent()}
        </Modal>
    );
};

export default FilePreview;
