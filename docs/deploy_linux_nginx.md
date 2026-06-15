# CloudPan Linux Nginx 部署指南

由于您的服务器 5000 端口服务已占用 `/api` 路径，为了避免冲突，我们将 CloudPan 部署在独立路径下：
- **前端访问路径**: `http://39.106.4.251/cloudpan`
- **后端API路径**: `http://39.106.4.251/cloudpan-api`

## 1. 前端构建
我们已经修改了前端配置以支持子路径部署。请在本地执行以下命令构建前端资源：

```bash
cd frontend
npm run build
```

构建完成后，将 `frontend/build` 目录下的所有文件上传到服务器的 `/var/www/cloudpan` 目录（如果目录不存在请先创建）。

## 2. 后端部署
确保后端服务运行在 8080 端口（默认配置）。

```bash
# 在服务器上运行后端
nohup java -jar cloudpan-backend-0.0.1-SNAPSHOT.jar > cloudpan.log 2>&1 &
```

## 3. Nginx 配置
请将以下配置添加到您的 `nginx.conf` 的 `server` 块中（在 `location /` 之前）：

```nginx
    # CloudPan 前端静态资源
    location /cloudpan {
        alias /var/www/cloudpan;
        index index.html;
        try_files $uri $uri/ /cloudpan/index.html;
    }

    # CloudPan 后端接口代理
    location /cloudpan-api/ {
        # 将 /cloudpan-api/xxx 重写为 /api/xxx 转发给后端
        proxy_pass http://127.0.0.1:8080/api/;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 增加超时时间，防止大文件上传下载中断
        proxy_connect_timeout 60s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
        
        # 允许大文件上传
        client_max_body_size 1024M;
    }
```

## 4. 重启 Nginx
保存配置文件后，测试并重启 Nginx：

```bash
nginx -t
nginx -s reload
```

现在您可以通过 `http://39.106.4.251/cloudpan` 访问网盘系统了。
