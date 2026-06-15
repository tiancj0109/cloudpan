# 个人高级网盘系统 (CloudPan)

## 项目简介
基于Java 1.8 + Spring Boot + React开发的企业级网盘系统，支持文件分享、团队协作、回收站、存储统计等功能。

## 功能特性
- **文件管理**：上传、下载、创建文件夹、重命名、删除
- **存储策略**：支持本地存储和阿里云OSS自动切换（优先使用OSS配置）
- **分享协作**：生成分享链接（支持密码和有效期）、团队共享空间
- **回收站**：文件逻辑删除，支持恢复和永久删除
- **存储统计**：用户配额管理、存储空间可视化

## 技术栈
- **后端**：Java 1.8, Spring Boot 2.1.18, MyBatis, JWT, Aliyun OSS SDK
- **前端**：React 18, Ant Design 5, Axios, React Router 6
- **数据库**：MySQL 5.7+

## 快速开始
请参考 `docs` 目录下的部署文档：
- [Windows部署文档](docs/deploy-windows.md)
- [Linux部署文档](docs/deploy-linux.md)

## 目录结构
- `backend`: 后端源代码
- `frontend`: 前端源代码
- `database`: 数据库初始化脚本
- `docs`: 部署文档
