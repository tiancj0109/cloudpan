# CentOS 7+ 自启动配置指南 (Systemd)

本文档介绍如何将 CloudPan 后端服务配置为 Systemd 服务，实现开机自启动和进程守护。

## 1. 后端服务自启动

### 1.1 准备工作
假设您的后端 JAR 包位于 `/opt/cloudpan` 目录（请根据实际情况修改路径）。

```bash
mkdir -p /opt/cloudpan
# 将 cloudpan-backend-0.0.1-SNAPSHOT.jar 上传到该目录
```

### 1.2 创建服务文件
使用编辑器创建 `/etc/systemd/system/cloudpan.service` 文件：

```bash
vi /etc/systemd/system/cloudpan.service
```

写入以下内容：

```ini
[Unit]
Description=CloudPan Backend Service
After=syslog.target network.target mysql.service

[Service]
Type=simple
# 运行用户，建议使用 root 或专门的非登录用户
User=root
# JAR 包所在目录
WorkingDirectory=/var/www/cloudpan/backend
# 启动命令 (请修改 JAR 包实际名称和路径)
# -Xms256m -Xmx512m 可根据服务器内存调整
ExecStart=/usr/bin/java -Xms256m -Xmx512m -jar /var/www/cloudpan/backend/cloudpan-backend-0.0.1-SNAPSHOT.jar
ExecStop=/bin/kill -15 $MAINPID
SuccessExitStatus=143

# 自动重启配置
Restart=always
RestartSec=10s

# 日志输出 (CentOS 7 会自动记录到 journalctl，也可以重定向)
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=cloudpan

[Install]
WantedBy=multi-user.target
```

### 1.3 启用并启动服务

```bash
# 重新加载配置
systemctl daemon-reload

# 设置开机自启
systemctl enable cloudpan

# 启动服务
systemctl start cloudpan

# 查看状态
systemctl status cloudpan
```

### 1.4 查看日志

```bash
# 查看实时日志
journalctl -u cloudpan -f
```

---

## 2. Nginx 自启动

如果您还没有设置 Nginx 开机自启，请执行：

```bash
# 设置开机自启
systemctl enable nginx

# 启动 Nginx
systemctl start nginx

# 查看状态
systemctl status nginx
```

## 3. 常见问题

1. **Java 路径问题**：
   如果 `ExecStart` 报错找不到 java，请使用 `which java` 查看 java 的绝对路径，并替换 `/usr/bin/java`。

2. **权限问题**：
   确保 `WorkingDirectory` 和 JAR 文件对 `User` 指定的用户有读取和执行权限。

3. **端口冲突**：
   确保在启动前没有其他进程占用 8080 端口（或者您在 application.yml 中配置的端口）。
