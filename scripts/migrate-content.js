'use strict';

/**
 * 一次性迁移：给 site.json 里可管理的条目补信封字段
 *   { id, title, status:'published', visible:true, order:数组下标, updatedAt }
 * 先备份，再补字段；非法数据不写、报错退出。
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'data', 'site.json');
const BACKUP_DIR = path.join(ROOT, 'data', 'backups');

const TARGETS = {
  nav: ['nav'],
  branch: ['branches'],
  timeline: ['home', 'timeline'],
  contact: ['home', 'contacts'],
  campus: ['home', 'campus'],
  case: ['work', 'cases'],
  interest: ['interests'],
  tool: ['tools', 'items'],
  notice: ['notices'],
};

function getAt(root, keys) {
  let cur = root;
  for (const k of keys) { if (cur == null) return undefined; cur = cur[k]; }
  return cur;
}

function slug(s) {
  const base = String(s || '').trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '');
  return base || 'item';
}

function main() {
  if (!fs.existsSync(SITE)) { console.error('找不到 data/site.json'); process.exit(1); }
  const raw = fs.readFileSync(SITE, 'utf8');
  let data;
  try { data = JSON.parse(raw); } catch (err) { console.error('site.json 不是合法 JSON：' + err.message); process.exit(1); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) { console.error('site.json 顶层必须是对象'); process.exit(1); }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(BACKUP_DIR, `site-migrate-${stamp}.json`), raw, 'utf8');
  console.log('已备份：data/backups/site-migrate-' + stamp + '.json');

  const now = new Date().toISOString();
  let changed = 0;
  for (const [type, keys] of Object.entries(TARGETS)) {
    const list = getAt(data, keys);
    if (!Array.isArray(list)) { console.error(`路径 ${keys.join('.')} 不是数组，中止`); process.exit(1); }
    list.forEach((item, index) => {
      if (!item || typeof item !== 'object') { console.error(`${type}[${index}] 不是对象，中止`); process.exit(1); }
      if (!item.id) item.id = type + '-' + slug(item.title || item.label || item.name || ('item-' + index));
      if (item.name && (!item.title || item.title === '未命名条目')) item.title = item.name;
      if (!item.title && !item.label && !item.name) item.title = '未命名条目';
      if (!item.status) item.status = 'published';
      if (typeof item.visible !== 'boolean') item.visible = true;
      if (!Number.isInteger(item.order)) item.order = index;
      if (!item.updatedAt) item.updatedAt = now;
      changed++;
    });
  }
  // 单体型也给 updatedAt（不改结构）
  for (const key of ['site', 'ai', 'settings']) {
    if (data[key] && typeof data[key] === 'object' && !data[key].updatedAt) data[key].updatedAt = now;
  }

  const out = JSON.stringify(data, null, 2) + '\n';
  const tmp = SITE + '.tmp';
  fs.writeFileSync(tmp, out, 'utf8');
  fs.renameSync(tmp, SITE);
  console.log(`迁移完成：补字段 ${changed} 条 → ${SITE}`);
}

main();
