const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    console.log('Setup proxy is loaded!');
    app.use(
        createProxyMiddleware('/cloudpan-api', {
            target: 'http://127.0.0.1:8080',
            changeOrigin: true,
            pathRewrite: function (path, req) {
                const newPath = path.replace('/cloudpan-api', '/api');
                console.log('Rewriting path:', path, '->', newPath);
                return newPath;
            },
            logLevel: 'debug',
            onProxyReq: function (proxyReq, req, res) {
                console.log('Proxying:', req.url, '->', proxyReq.path);
            },
            onError: function (err, req, res) {
                console.error('Proxy error:', err);
            }
        })
    );
    app.use(
        createProxyMiddleware('/security-api', {
            target: 'http://127.0.0.1',
            changeOrigin: true,
            logLevel: 'debug',
            onProxyReq: function (proxyReq, req, res) {
                console.log('Proxying security-api:', req.url, '->', proxyReq.path);
            },
            onError: function (err, req, res) {
                console.error('Proxy error security-api:', err);
            }
        })
    );
};
