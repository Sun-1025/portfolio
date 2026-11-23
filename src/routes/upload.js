'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { requireAuth } = require('../auth');

const router = express.Router();
const ROOT = path.resolve(__dirname, '..', '..');
const UPLOAD_DIR = path.join(ROOT, 'public', 'uploads');
const ASSET_DIR = path.join(ROOT, 'public', 'assets');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(req, file, cb) {
    let ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED.has(ext)) ext = '.png';
    const base = path.basename(file.originalname || 'image', ext)
      .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
      .slice(0, 24) || 'image';
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED.has(ext)) return cb(new Error('只允许上传 png / jpg / webp / gif / avif'));
    return cb(null, true);
  },
});

router.post('/upload', requireAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ ok: false, error: err.message });
    if (!req.file) return res.status(400).json({ ok: false, error: '没有收到文件' });
    res.json({ ok: true, url: `/uploads/${req.file.filename}`, name: req.file.filename });
  });
});

router.get('/media', requireAuth, (req, res) => {
  const list = [];
  for (const [dir, prefix] of [[UPLOAD_DIR, '/uploads/'], [ASSET_DIR, '/assets/']]) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (!stat.isFile()) continue;
      const ext = path.extname(name).toLowerCase();
      if (!ALLOWED.has(ext)) continue;
      list.push({ name, url: prefix + name, size: stat.size, time: stat.mtime.toISOString(), dir: prefix });
    }
  }
  list.sort((a, b) => (a.time < b.time ? 1 : -1));
  res.json({ ok: true, items: list });
});

router.delete('/media/:name', requireAuth, (req, res) => {
  const name = String(req.params.name || '');
  if (!/^[A-Za-z0-9\u4e00-\u9fa5._-]+$/.test(name)) {
    return res.status(400).json({ ok: false, error: '文件名不合法' });
  }
  const file = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(file)) return res.status(404).json({ ok: false, error: '文件不存在' });
  fs.unlinkSync(file);
  res.json({ ok: true });
});

module.exports = router;
