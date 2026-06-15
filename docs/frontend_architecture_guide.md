# 前端独立部署与路径重写技术方案

本文档详细解析了 CloudPan 系统如何在**不修改任何后端代码**的情况下，通过前端配置和网关层（Nginx/Proxy）实现子路径部署及接口隔离。这种方案特别适用于后端服务无法轻易变动或端口/路径受限的场景。

## 1. 核心原理

核心思想是**"对外隔离，对内透明"**：
- **对外（浏览器/用户）**：使用带有特定前缀的路径（如 `/cloudpan` 和 `/cloudpan-api`），避免与现有服务冲突。
- **对内（后端服务）**：通过网关层剥离前缀，还原为后端原本期望的标准路径（如 `/api`），使后端感知不到前缀的存在。

## 2. 实现细节

### 2.1 静态资源路径适配 (`package.json`)
为了让 HTML 中引用的 JS/CSS 资源（如 `<script src="/cloudpan/static/js/..." >`）能正确加载，我们需要修改构建时的根路径。

**文件**: `frontend/package.json`
```json
{
  "homepage": "/cloudpan"
}
```
*作用*：React 构建时会将所有静态资源引用加上 `/cloudpan` 前缀。

### 2.2 前端路由隔离 (`App.js`)
React Router 默认匹配根路径 `/`。为了让应用在 `/cloudpan` 下正常工作，需要设置路由的基础路径。

**文件**: `frontend/src/App.js`
```javascript
<Router basename={process.env.PUBLIC_URL}>
    {/* 路由定义 */}
</Router>
```
*作用*：告诉路由系统，所有 URL 变化都是基于 `/cloudpan` 的，例如访问 `/cloudpan/login` 会匹配到 `/login` 组件。

### 2.3 接口请求隔离 (`api.js`)
为了避免前端发出的 API 请求（如 `/api/login`）与服务器上其他服务的 `/api` 冲突，我们给所有请求加上特有前缀。

**文件**: `frontend/src/utils/api.js`
```javascript
const api = axios.create({
    baseURL: '/cloudpan-api', // 原本是 /api
    // ...
});
```
*作用*：前端发出的所有请求都会变成 `/cloudpan-api/auth/login` 这种形式，从而在网络层面上与其他服务区分开。

### 2.4 生产环境转发 (Nginx)
这是"不改后端"的关键。Nginx 负责接收带有 `/cloudpan-api` 前缀的请求，将其**重写**为后端认识的 `/api`，然后再转发。

**文件**: `nginx.conf`
```nginx
location /cloudpan-api/ {
    # 关键：将 /cloudpan-api/xxx 重写为 /api/xxx
    proxy_pass http://127.0.0.1:8080/api/; 
    # ...
}
```
*流程*：
1. 用户请求: `http://domain.com/cloudpan-api/file/list`
2. Nginx 接收: 匹配到 `/cloudpan-api/`
3. Nginx 转发: 剥离 `/cloudpan-api/`，转发给后端 `http://127.0.0.1:8080/api/file/list`
4. 后端接收: 收到标准的 `/api/file/list` 请求，正常处理。

### 2.5 开发环境转发 (`setupProxy.js`)
在本地开发时没有 Nginx，我们使用 `http-proxy-middleware` 模拟 Nginx 的行为。

**文件**: `frontend/src/setupProxy.js`
```javascript
app.use(
    createProxyMiddleware('/cloudpan-api', {
        target: 'http://127.0.0.1:8080',
        pathRewrite: {
            '^/cloudpan-api': '/api', // 模拟 Nginx 的重写行为
        },
        // ...
    })
);
```
*作用*：让本地开发服务器 (`localhost:3000`) 也能像 Nginx 一样处理路径重写，保证开发环境与生产环境逻辑一致。

## 3. 方案优势

1. **零侵入**：后端代码完全不需要知道自己被部署在哪里，也不需要知道前端加了什么前缀。
2. **灵活性**：如果将来想换成 `/my-drive`，只需改动前端配置和 Nginx 配置，后端无需重新编译。
3. **兼容性**：完美解决单域名下多应用共存（端口复用）的问题。
