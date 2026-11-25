'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const store = require('../store');
const auth = require('../auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (auth.tooManyAttempts(ip)) {
    return res.status(429).json({ ok: false, error: '尝试次数过多，请 15 分钟后再试' });
  }

  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: '请输入账号和密码' });
  }

  const user = store.findUser(username);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    auth.recordFailure(ip);
    return res.status(401).json({ ok: false, error: '账号或密码不正确' });
  }

  auth.clearAttempts(ip);
  const token = auth.signSession(username);
  auth.setSessionCookie(req, res, token);
  return res.json({
    ok: true,
    user: { username },
    expiresInHours: auth.HOURS,
    expiresAt: auth.sessionExpiryMs(token),
  });
});

router.post('/logout', (req, res) => {
  auth.clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const token = auth.readToken(req);
  const payload = token ? auth.verifySession(token) : null;
  if (!payload) return res.json({ ok: true, user: null });
  res.json({
    ok: true,
    user: { username: payload.username },
    expiresInHours: auth.HOURS,
    expiresAt: auth.sessionExpiryMs(token),
  });
});

router.post('/password', auth.requireAuth, (req, res) => {
  const current = String(req.body.currentPassword || '');
  const next = String(req.body.newPassword || '');
  if (next.length < 8) {
    return res.status(400).json({ ok: false, error: '新密码至少 8 位' });
  }
  const user = store.findUser(req.admin.username);
  if (!user || !bcrypt.compareSync(current, user.passwordHash)) {
    return res.status(401).json({ ok: false, error: '当前密码不正确' });
  }
  store.updatePassword(req.admin.username, bcrypt.hashSync(next, 10));
  const token = auth.signSession(req.admin.username);
  auth.setSessionCookie(req, res, token);
  res.json({ ok: true, expiresInHours: auth.HOURS, expiresAt: auth.sessionExpiryMs(token) });
});

module.exports = router;
