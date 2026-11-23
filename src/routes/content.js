'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const store = require('../store');
const { requireAuth } = require('../auth');

const router = express.Router();

router.get('/content', (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(store.getContent());
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/content', requireAuth, (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ ok: false, error: '内容必须是 JSON 对象' });
    }
    for (const key of ['site', 'nav', 'home', 'work', 'tools']) {
      if (!(key in body)) {
        return res.status(400).json({ ok: false, error: `缺少必要字段：${key}` });
      }
    }
    const result = store.saveContent(body);
    return res.json({ ok: true, bytes: result.bytes });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// 备份列表
router.get('/backups', requireAuth, (req, res) => {
  try {
    const files = fs.readdirSync(store.BACKUP_DIR)
      .filter((f) => f.startsWith('site-') && f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, 30)
      .map((name) => {
        const stat = fs.statSync(path.join(store.BACKUP_DIR, name));
        return { name, size: stat.size, time: stat.mtime.toISOString() };
      });
    res.json({ ok: true, items: files });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 从备份恢复
router.post('/backups/:name/restore', requireAuth, (req, res) => {
  const name = String(req.params.name || '');
  if (!/^site-[A-Za-z0-9._-]+\.json$/.test(name)) {
    return res.status(400).json({ ok: false, error: '备份文件名不合法' });
  }
  const file = path.join(store.BACKUP_DIR, name);
  if (!fs.existsSync(file)) {
    return res.status(404).json({ ok: false, error: '备份不存在' });
  }
  try {
    const data = store.readJSON(file);
    const result = store.saveContent(data);
    res.json({ ok: true, bytes: result.bytes, restored: name });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
