'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const store = require('../store');
const { requireAuth, verifyPreview, signPreview } = require('../auth');
const C = require('../content-filter');

const router = express.Router();

/* ---------------- 白名单字段（按类型，不通用透传） ---------------- */

const FIELDS = {
  site:     ['title', 'brand', 'tagline', 'description', 'avatar', 'accent', 'themeColor', 'footer', 'bio'],
  hero:     ['eyebrow', 'title', 'intro', 'tags', 'primary', 'secondary', 'profile'],
  about:    ['title', 'lead', 'lines', 'facts', 'abilities', 'skills', 'belief'],
  ai:       ['enabled', 'endpoint', 'quick'],
  settings: ['sessionHours', 'idleMinutes', 'classicLabel', 'showClassic'],
  nav:      ['label', 'type', 'target', 'visible', 'order'],
  branch:   ['label', 'type', 'description', 'visible', 'order'],
  timeline: ['no', 'label', 'meta', 'text', 'visible', 'order'],
  contact:  ['label', 'value', 'url', 'visible', 'order'],
  campus:   ['title', 'text', 'image', 'alt', 'caption', 'visible', 'order'],
  case:     ['title', 'kind', 'category', 'number', 'org', 'period', 'role', 'summary', 'tags', 'images', 'links', 'sections', 'result', 'cover', 'visible', 'order'],
  interest: ['title', 'lead', 'ratio', 'cover', 'images', 'visible', 'order'],
  tool:     ['name', 'desc', 'category', 'module', 'icon', 'enabled', 'featured', 'problem', 'prereq', 'visible', 'order'],
  notice:   ['title', 'text', 'time', 'visible', 'order'],
};

const SINGLETONS = new Set(['site', 'hero', 'about', 'ai', 'settings']);

const MAX_LEN = {
  title: 80, label: 80, name: 80, no: 8,
  lead: 160, desc: 160, summary: 160, intro: 160, tagline: 160, alt: 160, caption: 200, period: 80, role: 80, org: 120,
  text: 20000, result: 20000, problem: 20000, description: 20000, paragraph: 20000,
  url: 300, href: 300, value: 200,
};

const URL_KEYS = new Set(['url', 'href', 'endpoint']);
const COLOR_KEYS = new Set(['accent', 'themeColor']);

/* ---------------- 审计日志 ---------------- */

const AUDIT_FILE = path.join(store.DATA_DIR, 'audit.json');
const AUDIT_MAX = 100;

function readAudit() {
  try {
    const list = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
    return Array.isArray(list) ? list : [];
  } catch (err) { return []; }
}

function audit(who, type, id, action, detail = '') {
  try {
    const list = readAudit();
    list.push({ at: new Date().toISOString(), who, type, id, action, detail: String(detail).slice(0, 200) });
    while (list.length > AUDIT_MAX) list.shift();
    store.ensureDirs();
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(list, null, 2) + '\n', 'utf8');
  } catch (err) { /* 审计失败不阻断主流程 */ }
}

/* ---------------- 写限速：单 IP 每分钟 60 次 ---------------- */

const buckets = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now - b.first > 60000) {
    buckets.set(ip, { count: 1, first: now });
    return false;
  }
  b.count += 1;
  return b.count > 60;
}

function writeGuard(req, res, next) {
  if (String(req.headers['x-requested-with'] || '') !== 'fetch') {
    return res.status(403).json({ ok: false, error: '写操作需要同源页面发起（X-Requested-With: fetch）' });
  }
  if (rateLimited(req.ip)) {
    return res.status(429).json({ ok: false, error: '操作太频繁，请一分钟后再试' });
  }
  next();
}

/* ---------------- 工具 ---------------- */

function slugify(s) {
  const base = String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || 'item';
}

function pickFields(body, type) {
  const allow = FIELDS[type];
  if (!allow) return null;
  const out = {};
  for (const key of allow) {
    if (key in body) out[key] = body[key];
  }
  return out;
}

function fieldErrors(type, fields) {
  const errors = [];
  const bad = (msg) => errors.push(msg);
  const allow = new Set(FIELDS[type]);
  for (const [key, value] of Object.entries(fields)) {
    if (!allow.has(key)) { bad(`字段 ${key} 不允许修改`); continue; }
    if (key === 'order' && !Number.isInteger(value)) { bad('order 必须是整数'); continue; }
    if (value === null || value === undefined) continue;
    if (typeof value === 'string') {
      const cap = MAX_LEN[key];
      if (cap && value.length > cap) bad(`${key} 超过 ${cap} 字`);
      if (URL_KEYS.has(key) && value !== '' && !/^(https?:\/\/|mailto:|#|\/)/.test(value)) bad(`${key} 必须以 http(s):// 开头（或 mailto:/#//）`);
      if (COLOR_KEYS.has(key) && value !== '' && !/^#[0-9a-fA-F]{6}$/.test(value)) bad(`${key} 必须是 #RRGGBB 颜色`);
    }
    if (key === 'visible' && typeof value !== 'boolean') bad('visible 必须是 true/false');
    if (key === 'enabled' && typeof value !== 'boolean') bad('enabled 必须是 true/false');
    if (key === 'featured' && typeof value !== 'boolean') bad('featured 必须是 true/false');
    if (key === 'sessionHours' && (!Number.isInteger(value) || value < 1 || value > 168)) bad('sessionHours 必须是 1-168 的整数');
    if (key === 'idleMinutes' && (!Number.isInteger(value) || value < 1 || value > 1440)) bad('idleMinutes 必须是 1-1440 的整数');
  }
  return errors;
}

function persist(content, meta, req) {
  const result = store.saveContent(content, meta);
  audit(req.admin.username, meta.type, meta.id, meta.action, meta.detail || '');
  return result;
}

/* ---------------- 公开接口（过滤私密） ---------------- */

router.get('/content', (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    let preview = null;
    const token = String(req.query.token || '');
    const spec = String(req.query.preview || '');
    if (token && spec) {
      const p = verifyPreview(token);
      const m = /^(\w+):(.+)$/.exec(spec);
      if (p && m && p.type === m[1]) preview = { type: p.type, id: p.id };
    }
    res.json(C.filterPublic(store.getContent(), preview));
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ---------------- 整包兜底（导入 / 导出用） ---------------- */

router.put('/content', requireAuth, writeGuard, (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ ok: false, error: '内容必须是 JSON 对象' });
    }
    for (const key of ['site', 'nav', 'home', 'work', 'tools']) {
      if (!(key in body)) return res.status(400).json({ ok: false, error: `缺少必要字段：${key}` });
    }
    const result = store.saveContent(body, { type: 'all', id: '-', action: 'import' });
    audit(req.admin.username, 'all', '-', 'import');
    return res.json({ ok: true, bytes: result.bytes });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/* ---------------- 备份 ---------------- */

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

router.post('/backups/:name/restore', requireAuth, writeGuard, (req, res) => {
  const name = String(req.params.name || '');
  if (!/^site-[A-Za-z0-9._-]+\.json$/.test(name)) {
    return res.status(400).json({ ok: false, error: '备份文件名不合法' });
  }
  const file = path.join(store.BACKUP_DIR, name);
  if (!fs.existsSync(file)) return res.status(404).json({ ok: false, error: '备份不存在' });
  try {
    const data = store.readJSON(file);
    const result = store.saveContent(data, { type: 'all', id: '-', action: 'restore' });
    audit(req.admin.username, 'all', '-', 'restore', name);
    res.json({ ok: true, bytes: result.bytes, restored: name });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ---------------- 管理接口（全量 / 增量） ---------------- */

router.get('/admin/content', requireAuth, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(store.getContent());
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/admin/audit', requireAuth, (req, res) => {
  res.json({ ok: true, items: readAudit().slice().reverse() });
});

function checkType(req, res) {
  const type = String(req.params.type || '');
  if (!C.TYPE_TARGETS[type]) {
    res.status(400).json({ ok: false, error: '不支持的内容类型' });
    return null;
  }
  return type;
}

router.post('/admin/content/:type', requireAuth, writeGuard, (req, res) => {
  const type = checkType(req, res);
  if (!type) return;
  if (SINGLETONS.has(type)) return res.status(400).json({ ok: false, error: `${type} 是单条内容，不能新建` });
  try {
    const content = store.getContent();
    const target = C.TYPE_TARGETS[type];
    const list = C.getAt(content, target);
    if (!Array.isArray(list)) return res.status(500).json({ ok: false, error: '内容路径异常' });

    const fields = pickFields(req.body || {}, type);
    if (!fields) return res.status(400).json({ ok: false, error: '没有可写入的字段' });
    const errs = fieldErrors(type, fields);
    if (errs.length) return res.status(400).json({ ok: false, errors: errs });

    const baseName = fields.title || fields.label || fields.name || '未命名条目';
    const id = type + '-' + slugify(baseName) + '-' + Math.random().toString(36).slice(2, 6);
    const item = Object.assign({}, fields, {
      id,
      status: 'draft',
      visible: true,
      order: list.length,
      updatedAt: new Date().toISOString(),
    });
    if (type === 'tool' && item.name && !item.title) item.title = item.name;
    list.push(item);
    persist(content, { type, id, action: 'create' }, req);
    res.json({ ok: true, id, item });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

function findItem(content, type, id) {
  const target = C.TYPE_TARGETS[type];
  const node = C.getAt(content, target);
  if (SINGLETONS.has(type)) return node || null;
  if (!Array.isArray(node)) return null;
  return node.find((x) => String(x.id) === String(id)) || null;
}

/* 首页精选：home.selectedIds 是 id 字符串数组 */
router.put('/admin/selected', requireAuth, writeGuard, (req, res) => {
  try {
    const content = store.getContent();
    const cases = C.getAt(content, C.TYPE_TARGETS.case) || [];
    const ids = (req.body && Array.isArray(req.body.ids)) ? req.body.ids.map(String) : null;
    if (!ids) return res.status(400).json({ ok: false, error: 'ids 必须是数组' });
    if (ids.length > 6) return res.status(400).json({ ok: false, error: '最多 6 个' });
    const known = new Set(cases.map((c) => String(c.id)));
    if (ids.some((i) => !known.has(i))) return res.status(400).json({ ok: false, error: 'ids 里有不存在的项目' });
    content.home = content.home || {};
    content.home.selectedIds = ids;
    persist(content, { type: 'home', id: 'selected', action: 'update' }, req);
    res.json({ ok: true, ids });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.patch('/admin/content/:type/:id', requireAuth, writeGuard, (req, res) => {
  const type = checkType(req, res);
  if (!type) return;
  const id = String(req.params.id || '');
  try {
    const content = store.getContent();
    const item = findItem(content, type, id);
    if (!item) return res.status(404).json({ ok: false, error: '条目不存在' });

    const fields = pickFields(req.body || {}, type);
    if (!fields) return res.status(400).json({ ok: false, error: '没有可写入的字段' });
    const errs = fieldErrors(type, fields);
    if (errs.length) return res.status(400).json({ ok: false, errors: errs });

    Object.assign(item, fields, { updatedAt: new Date().toISOString() });
    if (type === 'tool' && fields.name) item.title = fields.name;
    persist(content, { type, id, action: 'update' }, req);
    res.json({ ok: true, item });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/admin/content/:type/:id', requireAuth, writeGuard, (req, res) => {
  const type = checkType(req, res);
  if (!type) return;
  if (SINGLETONS.has(type)) return res.status(400).json({ ok: false, error: '单条内容不能删除' });
  const id = String(req.params.id || '');
  try {
    const content = store.getContent();
    const list = C.getAt(content, C.TYPE_TARGETS[type]);
    const item = findItem(content, type, id);
    if (!item) return res.status(404).json({ ok: false, error: '条目不存在' });
    if (String(req.query.purge || '') === '1') {
      store.backupSite();
      const index = list.findIndex((x) => String(x.id) === String(id));
      list.splice(index, 1);
      persist(content, { type, id, action: 'purge' }, req);
      return res.json({ ok: true, purged: id });
    }
    if (item.deletedAt) return res.status(400).json({ ok: false, error: '已在回收站' });
    store.backupSite();
    item.deletedAt = new Date().toISOString();
    item.updatedAt = item.deletedAt;
    persist(content, { type, id, action: 'trash' }, req);
    res.json({ ok: true, deletedAt: item.deletedAt });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/admin/content/:type/:id/restore', requireAuth, writeGuard, (req, res) => {
  const type = checkType(req, res);
  if (!type) return;
  const id = String(req.params.id || '');
  try {
    const content = store.getContent();
    const item = findItem(content, type, id);
    if (!item) return res.status(404).json({ ok: false, error: '条目不存在' });
    if (!item.deletedAt) return res.status(400).json({ ok: false, error: '不在回收站' });
    delete item.deletedAt;
    item.updatedAt = new Date().toISOString();
    persist(content, { type, id, action: 'restore' }, req);
    res.json({ ok: true, item });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.patch('/admin/content/:type/:id/visibility', requireAuth, writeGuard, (req, res) => {
  const type = checkType(req, res);
  if (!type) return;
  const id = String(req.params.id || '');
  try {
    const content = store.getContent();
    const item = findItem(content, type, id);
    if (!item) return res.status(404).json({ ok: false, error: '条目不存在' });
    const body = req.body || {};
    const status = body.status;
    if (status !== undefined && !['published', 'draft'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'status 只能是 published 或 draft' });
    }
    if (body.visible !== undefined && typeof body.visible !== 'boolean') {
      return res.status(400).json({ ok: false, error: 'visible 必须是 true/false' });
    }
    if (status === 'draft') {
      item.status = 'draft';
    } else if (status === 'published') {
      item.status = 'published';
      if (body.visible !== undefined) item.visible = body.visible;
    } else if (body.visible !== undefined) {
      item.visible = body.visible;
    }
    item.updatedAt = new Date().toISOString();
    persist(content, { type, id, action: 'visibility', detail: `status=${item.status} visible=${item.visible}` }, req);
    res.json({ ok: true, item });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/admin/content/:type/reorder', requireAuth, writeGuard, (req, res) => {
  const type = checkType(req, res);
  if (!type) return;
  try {
    const content = store.getContent();
    const list = C.getAt(content, C.TYPE_TARGETS[type]);
    if (!Array.isArray(list)) return res.status(500).json({ ok: false, error: '内容路径异常' });
    const ids = (req.body && Array.isArray(req.body.ids)) ? req.body.ids.map(String) : null;
    if (!ids || ids.length !== list.length) {
      return res.status(400).json({ ok: false, error: 'ids 必须与列表长度一致' });
    }
    const byId = new Map(list.map((x) => [String(x.id), x]));
    if (ids.some((i) => !byId.has(i))) return res.status(400).json({ ok: false, error: 'ids 里有不存在的条目' });
    const next = ids.map((i, index) => {
      const it = byId.get(i);
      it.order = index;
      it.updatedAt = it.updatedAt || new Date().toISOString();
      return it;
    });
    const parent = C.getAt(content, C.TYPE_TARGETS[type].slice(0, -1));
    parent[C.TYPE_TARGETS[type][C.TYPE_TARGETS[type].length - 1]] = next;
    persist(content, { type, id: '-', action: 'reorder' }, req);
    res.json({ ok: true, ids });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/admin/content/:type/:id/preview-token', requireAuth, (req, res) => {
  const type = checkType(req, res);
  if (!type) return;
  const id = String(req.params.id || '');
  try {
    const content = store.getContent();
    if (!findItem(content, type, id)) return res.status(404).json({ ok: false, error: '条目不存在' });
    const token = signPreview({ type, id });
    res.json({ ok: true, token, expiresInMinutes: 10 });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;

