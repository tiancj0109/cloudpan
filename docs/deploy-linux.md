# CloudPan Linux部署文档

## 环境要求
- JDK 1.8+
- MySQL 5.7+
- Node.js 14+ (仅用于前端构建)
- Nginx (推荐)

## 数据库准备
1. 登录MySQL：
   ```bash
   mysql -u root -p
   ```
2. 创建数据库并导入数据：
   ```sql
   CREATE DATABASE cloudpan DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
   USE cloudpan;
   SOURCE /path/to/cloudpan/database/init.sql;
   ```

## 后端部署
1. 编译打包（可在本地完成后上传Jar包）：
   ```bash
   cd backend
   mvn clean package
   ```
2. 启动服务（后台运行）：
   ```bash
   nohup java -jar target/cloudpan-backend-0.0.1-SNAPSHOT.jar > app.log 2>&1 &
   ```

## 前端部署
1. 编译构建：
   ```bash
   cd frontend
   npm install
   npm run build
   ```
2. 配置Nginx：
   ```nginx
   server {
       listen 80;
       server_name your_domain.com;

       location / {
           root /path/to/cloudpan/frontend/build;
           index index.html;
           try_files $uri $uri/ /index.html;
       }

       location /api {
           proxy_pass http://localhost:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```
3. 重启Nginx：
   ```bash
   sudo systemctl restart nginx
   ```

## 验证
访问 `http://your_domain.com`，注册账号并登录使用。
