# 文件夹上传功能说明

## 功能概述

云盘系统现已支持文件夹上传功能，包括：
- ✅ 点击选择文件夹上传
- ✅ 拖拽文件夹上传
- ✅ 保留文件夹层级结构

## 使用方法

### 1. 点击上传文件夹

1. 在文件列表页面，点击 **"上传文件夹"** 按钮
2. 在弹出的文件选择器中，选择整个文件夹
3. 系统会自动：
   - 创建文件夹层级结构
   - 上传文件夹内的所有文件
   - 保留原有的文件夹结构

### 2. 拖拽上传文件夹

1. 从本地文件系统拖拽一个文件夹
2. 拖拽到云盘页面的任意位置
3. 松开鼠标，系统会自动处理文件夹上传

**注意：** 拖拽文件夹功能依赖于浏览器支持。如果浏览器不支持，建议使用点击上传方式。

## 技术实现

### 前端实现

#### 关键组件

- **Upload组件配置：**
  ```jsx
  <Upload
      customRequest={handleFolderUpload}
      showUploadList={true}
      multiple={true}
      directory
      webkitdirectory
  >
      <Button icon={<FolderAddOutlined />}>上传文件夹</Button>
  </Upload>
  ```

#### 核心函数

1. **handleFolderUpload** - 处理文件夹上传
   - 检测文件的相对路径（webkitRelativePath）
   - 解析文件夹层级
   - 递归创建文件夹
   - 上传文件到对应位置

2. **readDirectory** - 递归读取拖拽的文件夹
   - 使用 webkitGetAsEntry() API
   - 异步读取文件夹内容
   - 构建文件相对路径

3. **uploadFile** - 上传单个文件
   - 支持相对路径参数
   - 自动创建文件夹层级
   - 缓存文件夹ID避免重复查询

### 后端接口

使用现有的两个接口：
1. `/api/file/folder` - 创建文件夹
2. `/api/file/upload` - 上传文件

## 文件夹处理逻辑

```
用户上传文件夹: MyFolder/
├── SubFolder1/
│   ├── file1.txt
│   └── file2.jpg
└── SubFolder2/
    └── file3.pdf

系统处理流程:
1. 创建 MyFolder 文件夹 (parentId=当前目录)
2. 创建 SubFolder1 (parentId=MyFolder.id)
3. 上传 file1.txt 到 SubFolder1
4. 上传 file2.jpg 到 SubFolder1
5. 创建 SubFolder2 (parentId=MyFolder.id)
6. 上传 file3.pdf 到 SubFolder2
```

## 性能优化

- **文件夹缓存：** 使用 Map 缓存已创建的文件夹ID，避免重复查询
- **异步处理：** 使用 async/await 确保文件夹创建顺序正确
- **批量处理：** 支持同时上传多个文件夹

## 浏览器兼容性

| 功能 | Chrome | Firefox | Edge | Safari |
|------|--------|---------|------|--------|
| 点击上传文件夹 | ✅ | ✅ | ✅ | ✅ |
| 拖拽文件夹 | ✅ | ✅ | ✅ | ⚠️ |

**注意：** Safari 对拖拽文件夹的支持有限，建议使用点击上传。

## 使用示例

### 示例 1：上传项目代码

```
选择文件夹: my-project/
系统会完整保留项目结构:
my-project/
  src/
    components/
      Header.js
      Footer.js
    App.js
  public/
    index.html
  package.json
```

### 示例 2：上传照片集

```
拖拽文件夹: Photos/
自动创建文件夹层级:
Photos/
  2024-01/
    photo1.jpg
    photo2.jpg
  2024-02/
    photo3.jpg
```

## 错误处理

- 文件夹名称冲突：自动使用已存在的文件夹
- 文件上传失败：显示错误提示，不影响其他文件
- 权限不足：提示用户检查权限设置

## 未来优化方向

1. **批量上传优化：** 添加批量上传接口，减少API调用次数
2. **进度显示：** 显示整体文件夹上传进度
3. **断点续传：** 支持大文件夹的断点续传
4. **压缩上传：** 压缩文件夹后上传，减少传输时间