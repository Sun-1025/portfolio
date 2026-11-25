'use strict';

require('dotenv').config();

const path = require('path');
const os = require('os');
const express = require('express');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const store = require('./src/store');
const authRoutes = require('./src/routes/auth');
const contentRoutes = require('./src/routes/content');
const guestbookRoutes = require('./src/routes/guestbook');
const uploadRoutes = require('./src/routes/upload');
const eventRoutes = require('./src/routes/events');
const publishRoutes = require('./src/routes/publish');

const ROOT = path.resolve(__dirname);
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';

store.ensureDirs();
store.getUsers(); // 首次启动自动创建管理员账号

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: false, limit: '8mb' }));

app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// 静态资源缓存策略
app.use('/assets', express.static(path.join(PUBLIC, 'assets'), { maxAge: '30d', immutable: true }));
// 私密图片：必须带后台会话或预览令牌，否则 404
app.use('/uploads/private', (req, res, next) => {
  try {
    const { readToken, verifySession, verifyPreview } = require('./src/auth');
    const token = readToken(req);
    if (token && verifySession(token)) return next();
    const pToken = String(req.query.token || '');
    if (pToken && verifyPreview(pToken)) return next();
  } catch (err) { /* fallthrough */ }
  return res.status(404).end();
});
app.use('/uploads', express.static(path.join(PUBLIC, 'uploads'), { maxAge: '7d' }));
app.use('/tools', express.static(path.join(PUBLIC, 'tools'), { maxAge: '1h' }));
// 经典版是独立静态页；后台关闭 classic 分支时，直达地址也要被拦住。
app.use('/classic', (req, res, next) => {
  try {
    const branch = (store.getContent().branches || []).find((b) => b.id === 'classic');
    if (branch && branch.visible === false) {
      return res.status(404).type('html').send(`<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>经典版暂时关闭</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f1eee4;color:#12110b;font-family:Georgia,"Songti SC",serif}main{max-width:520px;padding:40px}a{color:#12110b}</style>
<body><main><p style="font:11px/1.4 monospace;letter-spacing:.14em;color:#777">BRANCH CLOSED</p>
<h1 style="font-size:44px;font-weight:400;line-height:1.05;margin:12px 0 18px">经典版暂时关闭</h1>
<p style="font-family:system-ui,sans-serif;line-height:1.8;color:#4b4940">这个分支已在后台隐藏。需要恢复时，登录后台打开「导航与分支」里的 classic 开关。</p>
<p style="font-family:system-ui,sans-serif;margin-top:24px"><a href="/">← 返回新版主页</a></p></main></body></html>`);
    }
  } catch (err) {
    // 数据读取失败时不阻断经典版，交给下面的静态服务处理
  }
  next();
});
app.use('/classic', express.static(path.join(PUBLIC, 'classic'), { maxAge: '1h' }));

// API
app.get('/api/health', (req, res) => res.json({ ok: true, uptime: process.uptime(), version: '2.0.0' }));
app.use('/api/auth', authRoutes);
app.use('/api/admin', uploadRoutes);
app.use('/api', guestbookRoutes);
app.use('/api', contentRoutes);
app.use('/api', eventRoutes);
app.use('/api', publishRoutes);

// 动态站点数据：经典版页面与静态前台共用
app.get('/data/site.json', (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    res.json(store.getContent());
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

function sendFile(res, file) {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(file);
}

app.get('/', (req, res) => sendFile(res, path.join(PUBLIC, 'index.html')));
app.get('/admin', (req, res) => sendFile(res, path.join(PUBLIC, 'admin', 'index.html')));
app.get('/classic/', (req, res) => sendFile(res, path.join(PUBLIC, 'classic', 'index.html')));

app.use('/api', (req, res) => res.status(404).json({ ok: false, error: '接口不存在' }));

app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ ok: false, error: err.message || '服务器内部错误' });
});

function lanAddresses() {
  const nets = os.networkInterfaces();
  const out = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    }
  }
  return out;
}

app.listen(PORT, HOST, () => {
  console.log('\n=== 个人网站 2.0 已启动 ===');
  console.log(`本机访问：  http://localhost:${PORT}`);
  for (const ip of lanAddresses()) console.log(`局域网访问：http://${ip}:${PORT}`);
  console.log(`管理后台：  http://localhost:${PORT}/admin`);
  console.log(`经典版：    http://localhost:${PORT}/classic/`);
  console.log('==============================\n');
});
