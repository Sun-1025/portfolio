'use strict';

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const SITE_FILE = path.join(DATA_DIR, 'site.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

function ensureDirs() {
  for (const dir of [DATA_DIR, BACKUP_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJSON(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return fallback;
  }
}

function writeAtomic(file, obj) {
  const tmp = `${file}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function backupSite() {
  if (!fs.existsSync(SITE_FILE)) return;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(BACKUP_DIR, `site-${stamp}.json`);
  try {
    fs.copyFileSync(SITE_FILE, target);
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith('site-')).sort();
    while (files.length > 30) {
      fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
    }
  } catch (err) {
    console.warn('[store] backup failed:', err.message);
  }
}

const listeners = new Set();

function onContentChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emitContentChange(meta = {}) {
  for (const fn of listeners) {
    try {
      fn(meta);
    } catch (err) {
      /* ignore broken subscriber */
    }
  }
}

function getContent() {
  const data = readJSON(SITE_FILE);
  if (!data) throw new Error('data/site.json is missing or invalid JSON');
  return data;
}

function saveContent(next, meta = null) {
  if (!next || typeof next !== 'object' || Array.isArray(next)) {
    throw new Error('content must be a JSON object');
  }
  const json = JSON.stringify(next);
  if (json.length > 8 * 1024 * 1024) {
    throw new Error('content is too large (limit 8MB)');
  }
  ensureDirs();
  backupSite();
  writeAtomic(SITE_FILE, next);
  emitContentChange(meta || { at: Date.now(), bytes: json.length });
  return { bytes: json.length };
}

function createUserFile() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const users = {
    version: 1,
    users: [
      {
        username,
        passwordHash: bcrypt.hashSync(password, 10),
        createdAt: new Date().toISOString(),
      },
    ],
  };
  writeAtomic(USERS_FILE, users);
  console.log(`\n[init] 已创建管理员账号：${username} / ${password}`);
  console.log('[init] 请登录后台后立即修改密码，或在 .env 中设置 ADMIN_USERNAME / ADMIN_PASSWORD 后删除 data/users.json 重新生成。\n');
  return users;
}

function getUsers() {
  ensureDirs();
  let users = readJSON(USERS_FILE);
  if (!users || !Array.isArray(users.users) || !users.users.length) {
    users = createUserFile();
  }
  return users;
}

function saveUsers(users) {
  writeAtomic(USERS_FILE, users);
}

function findUser(username) {
  return getUsers().users.find((u) => u.username === username) || null;
}

function updatePassword(username, newHash) {
  const store = getUsers();
  const user = store.users.find((u) => u.username === username);
  if (!user) throw new Error('user not found');
  user.passwordHash = newHash;
  user.updatedAt = new Date().toISOString();
  saveUsers(store);
}

module.exports = {
  ROOT,
  DATA_DIR,
  SITE_FILE,
  BACKUP_DIR,
  ensureDirs,
  readJSON,
  writeAtomic,
  backupSite,
  getContent,
  saveContent,
  onContentChange,
  emitContentChange,
  getUsers,
  findUser,
  updatePassword,
};
