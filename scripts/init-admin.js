'use strict';

/**
 * 重置或新增管理员账号
 *
 * 用法：
 *   npm run init -- admin 新密码至少8位
 *   node scripts/init-admin.js admin NewPass@123
 *
 * 注意：修改后需要重启服务，或等待当前会话到期后重新登录。
 */

const path = require('path');
const bcrypt = require('bcryptjs');
const store = require('../src/store');

const username = String(process.argv[2] || '').trim();
const password = String(process.argv[3] || '');

if (!username || !password) {
  console.log('用法：node scripts/init-admin.js <用户名> <密码（至少8位）>');
  process.exit(1);
}
if (password.length < 8) {
  console.error('密码至少 8 位');
  process.exit(1);
}

store.ensureDirs();
const users = store.getUsers();
const hash = bcrypt.hashSync(password, 10);
const existing = users.users.find((u) => u.username === username);

if (existing) {
  existing.passwordHash = hash;
  existing.updatedAt = new Date().toISOString();
  console.log(`已重置账号：${username}`);
} else {
  users.users.push({ username, passwordHash: hash, createdAt: new Date().toISOString() });
  console.log(`已新增账号：${username}`);
}

store.writeAtomic(path.join(store.DATA_DIR, 'users.json'), users);
console.log('请重启服务或重新登录后台使新密码生效。');
