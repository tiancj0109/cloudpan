# 文件预览功能技术指南

本文档详细说明了 CloudPan 系统中文件预览功能的实现原理、支持格式及技术细节。

## 1. 功能概述

CloudPan 支持多种格式文件的在线预览，包括图片、视频、音频、PDF 以及代码/文本文件。预览功能在"我的网盘"和"分享链接"中均已支持。

## 2. 支持格式

| 类型 | 支持格式 | 实现方式 |
| :--- | :--- | :--- |
| **图片** | `jpg`, `jpeg`, `png`, `gif`, `bmp`, `webp` | `<img>` 标签直接加载 |
| **视频** | `mp4`, `webm` | `<video>` 标签播放，支持拖动进度条 (Range Requests) |
| **音频** | `mp3`, `wav`, `ogg`, `m4a`, `flac`, `aac` | `<audio>` 标签播放 |
| **PDF** | `pdf` | `<iframe>` 嵌入预览 |
| **文本/代码** | `txt`, `md`, `json`, `xml`, `html`, `css`, `js`, `java`, `py`, `c`, `cpp`, `h`, `sql` | `<iframe>` 或 `<pre>` 标签显示文本内容 |

## 3. 技术实现

### 3.1 后端实现

后端采用了统一的下载/预览逻辑，位于 `FileController.java` 和 `ShareController.java` 中。

*   **接口参数**:
    *   `preview=true`: 告诉后端设置 `Content-Disposition: inline`，以便浏览器直接显示而不是下载。
    *   `Range` 请求头: 支持断点续传和视频/音频的拖动播放。

*   **流处理**:
    *   **本地存储**: 使用 `RandomAccessFile` 实现高效的随机读取，支持 `seek` 操作，确保视频拖动流畅。
    *   **OSS 存储**: 直接对接阿里云 OSS 的流式下载接口。

*   **MIME 类型**:
    *   后端根据文件后缀名自动判断 `Content-Type`（如 `video/mp4`, `audio/mpeg`, `application/pdf`），确保浏览器能正确识别并渲染。

### 3.2 前端实现

前端 (`FileList.jsx` 和 `ShareLinkView.jsx`) 根据文件后缀名选择不同的渲染组件。

*   **URL 构造**:
    *   预览 URL 必须包含 `preview=true` 参数。
    *   必须包含认证 Token (对于 `FileList`) 或 AccessCode (对于 `ShareLink`)。
    *   示例: `/cloudpan-api/file/download/{fileId}?preview=true&token={token}`

*   **组件选择**:
    *   **MediaPreview**: 用于渲染 `<img />`, `<video />`, `<audio />`。
    *   **Iframe**: 用于渲染 PDF 和部分文本文件，利用浏览器内置的 PDF 阅读器。
    *   **TextPreview**: 对于纯文本，也可以通过 API 获取文本内容后直接渲染在 `<pre>` 标签中。

## 4. 注意事项

1.  **Nginx 配置**: 确保 Nginx 允许大文件传输和长连接，以免视频播放中断。
2.  **浏览器兼容性**: 预览功能依赖于浏览器对各格式的原生支持。例如，某些浏览器可能不支持 `tiff` 图片或特殊编码的视频。
3.  **安全性**: 预览 URL 包含 Token，请勿在不安全的环境下泄露。
