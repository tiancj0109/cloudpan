# CloudPan Windows部署文档

## 环境要求
- JDK 1.8+
- MySQL 5.7+
- Node.js 14+ (仅用于前端构建)

## 数据库准备
1. 安装MySQL并启动服务。
2. 创建数据库 `cloudpan`。
3. 执行 `database/init.sql` 脚本初始化表结构。
   ```sql
   source d:/AIproject/google/2/cloudpan/database/init.sql;
   ```

## 后端部署
1. 进入 `backend` 目录。
2. 修改 `src/main/resources/application.yml` 中的数据库配置：
   ```yaml
   spring:
     datasource:
       url: jdbc:mysql://localhost:3306/cloudpan?useUnicode=true&characterEncoding=utf-8&useSSL=false&serverTimezone=Asia/Shanghai
       username: root
       password: root
   ```
3. 编译打包：
   ```cmd
   mvn clean package
   ```
4. 运行Jar包：
   ```cmd
   java -jar target/cloudpan-backend-0.0.1-SNAPSHOT.jar
   ```

## 前端部署
1. 进入 `frontend` 目录。
2. 安装依赖：
   ```cmd
   npm install http-proxy-middleware@2.0.6 --save-dev 
   npm install
   ```
3. 启动开发服务器：
   ```cmd
   npm start
   ```
4. 或者构建生产环境代码：
   ```cmd
   npm run build
   ```
   构建完成后，将 `build` 目录下的文件部署到Nginx或Tomcat服务器。

## 访问系统
打开浏览器访问 `http://localhost:3000` (开发环境) 或部署的Web服务器地址。
默认无账号，请先注册。
