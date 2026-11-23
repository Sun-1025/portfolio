'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const store = require('../store');

const router = express.Router();
const GUEST_FILE = path.join(store.DATA_DIR, 'guestbook.json');
const MAX_NICKNAME = 20;
const MAX_TEXT = 500;
const MAX_MESSAGES = 500;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

// 单进程内存限流；部署多实例时替换为 Redis / Upstash。
const buckets = new Map();

function clientKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? String(forwarded).split(',')[0].trim() : (req.ip || req.socket.remoteAddress || 'unknown');
  return ip;
}

function allow(key) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_PER_WINDOW) return false;
  entry.count += 1;
  return true;
}

function cleanText(value, max) {
  return String(value == null ? '' : value)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max);
}

function loadBook() {
  const data = store.readJSON(GUEST_FILE, { version: 1, messages: [] });
  if (!data || !Array.isArray(data.messages)) return { version: 1, messages: [] };
  return data;
}

function saveBook(data) {
  store.ensureDirs();
  store.writeAtomic(GUEST_FILE, data);
}

function publicMessage(item) {
  return {
    id: item.id,
    nickname: item.nickname,
    text: item.text,
    at: item.at,
  };
}

router.get('/guestbook', (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const items = loadBook().messages.slice(-30).reverse().map(publicMessage);
    res.json({ ok: true, items });
  } catch (err) {
    res.status(500).json({ ok: false, error: '留言读取失败' });
  }
});

router.post('/guestbook', (req, res) => {
  try {
    if (!allow(clientKey(req))) {
      return res.status(429).json({ ok: false, error: '留言有点频繁，十分钟后再试。' });
    }
    // 隐藏蜜罐字段：正常用户看不到，也不会填写。
    if (String((req.body && req.body.website) || '').trim()) {
      return res.status(400).json({ ok: false, error: '提交无效。' });
    }

    const nickname = cleanText(req.body && req.body.nickname, MAX_NICKNAME);
    const text = cleanText(req.body && req.body.text, MAX_TEXT);
    if (!nickname) return res.status(400).json({ ok: false, error: '请留一个昵称。' });
    if (!text) return res.status(400).json({ ok: false, error: '留言内容不能为空。' });

    const book = loadBook();
    const item = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      nickname,
      text,
      at: new Date().toISOString(),
    };
    book.messages.push(item);
    if (book.messages.length > MAX_MESSAGES) book.messages = book.messages.slice(-MAX_MESSAGES);
    saveBook(book);

    res.status(201).json({ ok: true, item: publicMessage(item) });
  } catch (err) {
    res.status(500).json({ ok: false, error: '留言保存失败' });
  }
});

module.exports = router;
