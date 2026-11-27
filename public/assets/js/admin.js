/* ============================================================
   可视化内容后台（CMS）
   - 每条内容一张卡：新建 / 编辑 / 删除 / 排序 / 公开·私密·草稿
   - 抽屉式编辑器 + 实时预览 + 本地草稿 + 审计 / 备份 / 发布
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
  user: null,
  expiresAt: 0,
  content: null,
  tab: 'case',
  filter: 'all',
  q: '',
  selected: new Set(),
  drawer: null, // { type, id, isNew, draft, orig, dirty, savedAt }
  draftTimer: null,
  uploadPath: null,
  publish: { running: false, timer: null, step: '', log: [] },
  backups: null,
  audit: null,
  media: null,
  sessionTimer: null,
};

const STATUS_LABEL = {
  public: '公开',
  private: '私密',
  draft: '草稿',
  trash: '回收站',
};

/* ---------------- 字段 schema ---------------- */

const F = (key, label, kind = 'text', extra = {}) => Object.assign({ key, label, kind }, extra);

const TYPES = [
  {
    id: 'case', label: '项目', path: ['work', 'cases'], single: false, icon: '▣',
    desc: '项目与公益实践详情页',
    fields: [
      F('title', '标题'), F('number', '编号', 'half'), F('kind', '类型', 'text', { hint: '可留空' }),
      F('category', '分类', 'select', { options: [['project', '项目'], ['practice', '公益实践']] }),
      F('org', '归属'), F('period', '时间'), F('role', '角色'),
      F('summary', '摘要（首页卡片的一句话）', 'textarea'),
      F('cover', '封面图', 'image'),
      F('tags', '标签', 'tags'),
      F('sections', '正文分节（h 小标题 / p 段落，支持 Markdown）', 'sections', { markdown: true }),
      F('result', '结果 / 留下什么', 'markdown'),
      F('links', '外链', 'links'),
      F('images', '项目图集', 'images'),
    ],
    preview: (id) => `#/work/${id}`,
  },
  {
    id: 'interest', label: '兴趣相册', path: ['interests'], single: false, icon: '◧',
    fields: [
      F('title', '标题'), F('lead', '一句介绍', 'textarea', { md: true }),
      F('intro', '详细介绍（长文）', 'markdown', { hint: '空行分段；可用 ## 小标题、**加粗**' }),
      F('parent', '所属合集 ID', 'text', { hint: '例如 travel；填了就不会单独出现在兴趣首页' }),
      F('ratio', '首图比例', 'text', { hint: '例如 4/3，可留空' }),
      F('cover', '封面', 'image'),
      F('images', '相册图片', 'images'),
    ],
    preview: (id) => `#/interest/${id}`,
  },
  {
    id: 'tool', label: '工具', path: ['tools', 'items'], single: false, icon: '⚙',
    fields: [
      F('name', '名称'), F('category', '分类', 'select', { options: [['convert', '转换'], ['query', '查询']] }),
      F('module', '模块文件', 'text', { hint: '例如 converter.js' }),
      F('desc', '一句话说明', 'textarea'),
      F('problem', '解决什么问题', 'textarea'),
      F('prereq', '使用前提', 'text'),
      F('enabled', '在工具页显示', 'bool'),
      F('featured', '作为主工具', 'bool'),
    ],
    preview: (id) => `#/tools/${id}`,
  },
  {
    id: 'timeline', label: '时间线', path: ['home', 'timeline'], single: false, icon: '≡',
    fields: [
      F('no', '编号', 'half'), F('label', '标题'), F('meta', '时间 / 单位', 'half'),
      F('text', '说明', 'textarea'),
    ],
    preview: () => '#/experience',
  },
  {
    id: 'campus', label: '校园照片', path: ['home', 'campus'], single: false, icon: '▤',
    fields: [
      F('title', '标题'), F('text', '说明', 'textarea'),
      F('image', '照片', 'image'), F('alt', '图片替代文字'), F('caption', '图注'),
    ],
    preview: () => '#/experience',
  },
  {
    id: 'contact', label: '联系方式', path: ['home', 'contacts'], single: false, icon: '✉',
    fields: [
      F('label', '名称（如 邮箱 / 微信）'), F('value', '展示值'),
      F('url', '链接（mailto: 或 https://）', 'url'),
    ],
    preview: () => '',
  },
  {
    id: 'nav', label: '导航', path: ['nav'], single: false, icon: '◇',
    fields: [F('label', '名称'), F('type', '类型'), F('target', '目标', 'text', { hint: '路由或链接' })],
    preview: () => '',
  },
  {
    id: 'branch', label: '分支', path: ['branches'], single: false, icon: '⑂',
    fields: [F('label', '名称'), F('type', '类型'), F('description', '说明', 'textarea')],
    preview: () => '',
  },
  {
    id: 'notice', label: '公告', path: ['notices'], single: false, icon: '!',
    fields: [F('title', '标题'), F('text', '内容', 'textarea'), F('time', '时间')],
    preview: () => '',
  },
  {
    id: 'site', label: '站点信息', path: ['site'], single: true, icon: '◎',
    fields: [
      F('title', '站点标题'), F('brand', '品牌名'), F('tagline', '口号'), F('description', '描述', 'textarea'),
      F('avatar', '头像', 'image'), F('themeColor', '主题色', 'color'), F('accent', '强调色', 'color'),
      F('footer', '页脚文案', 'textarea'),
      F('bio', '一句话 / 简介', 'group', {
        sub: [F('oneLine', '一句话'), F('paragraph', '段落', 'textarea')],
      }),
    ],
    preview: () => '',
  },
  {
    id: 'hero', label: '首屏', path: ['home', 'hero'], single: true, icon: '▰',
    fields: [
      F('eyebrow', '眉标'), F('title', '大标题'), F('intro', '介绍', 'textarea'),
      F('tags', '标签', 'tags'),
      F('primary', '主按钮', 'group', { sub: [F('label', '文案'), F('href', '链接', 'url')] }),
      F('secondary', '次按钮', 'group', { sub: [F('label', '文案'), F('href', '链接', 'url')] }),
      F('profile', '档案行', 'kv'),
    ],
    preview: () => '',
  },
  {
    id: 'about', label: '关于', path: ['home', 'about'], single: true, icon: '◍',
    fields: [
      F('title', '标题'), F('lead', '引言', 'textarea'),
      F('lines', '简介行', 'strlist'),
      F('facts', '事实', 'kv'),
      F('abilities', '能力', 'obj2', { a: 't', b: 'd', al: '能力', bl: '说明', bKind: 'textarea' }),
      F('skills', '技能', 'obj2', { a: 'n', b: 'd', al: '名称', bl: '说明' }),
      F('belief', '信念', 'group', {
        sub: [F('lines', '行', 'strlist'), F('quote', '引用', 'textarea')],
      }),
    ],
    preview: () => '',
  },
  {
    id: 'ai', label: 'AI 助手', path: ['ai'], single: true, icon: '✦',
    fields: [
      F('enabled', '启用', 'bool'),
      F('endpoint', '接口地址', 'url'),
      F('quick', '快捷问题', 'strlist'),
    ],
    preview: () => '',
  },
  {
    id: 'settings', label: '设置', path: ['settings'], single: true, icon: '☰',
    fields: [
      F('sessionHours', '登录时长（小时）', 'number'), F('idleMinutes', '空闲退出（分钟）', 'number'),
      F('classicLabel', '经典版名称'), F('showClassic', '显示经典版入口', 'bool'),
    ],
    preview: () => '',
  },
];

const TYPE_MAP = Object.fromEntries(TYPES.map((t) => [t.id, t]));

/* ---------------- 工具 ---------------- */

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getPath(obj, path) {
  let cur = obj;
  for (const key of path) {
    if (cur == null) return undefined;
    cur = cur[key];
  }
  return cur;
}

function setPath(obj, path, value) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    if (cur[key] == null || typeof cur[key] !== 'object') cur[key] = /^\d+$/.test(path[i + 1]) ? [] : {};
    cur = cur[key];
  }
  cur[path[path.length - 1]] = value;
}

function clone(v) {
  return JSON.parse(JSON.stringify(v == null ? null : v));
}

async function api(path, opts = {}) {
  const init = { method: opts.method || 'GET', credentials: 'same-origin', headers: { 'X-Requested-With': 'fetch' } };
  if (opts.body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(opts.body);
  }
  const res = await fetch(path, init);
  let data = null;
  try { data = await res.json(); } catch (err) { data = null; }
  if (res.status === 401) {
    renderLogin();
    throw new Error('登录已过期，请重新登录');
  }
  if (!res.ok || (data && data.ok === false)) {
    const msg = (data && (data.error || (data.errors && data.errors.join('；'))) ) || `请求失败（${res.status}）`;
    throw new Error(msg);
  }
  return data;
}

function toast(msg, type = 'ok') {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'ad-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.dataset.type = type;
  el.classList.add('is-on');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('is-on'), 2600);
}

function statusOf(item) {
  if (!item) return 'draft';
  if (item.deletedAt) return 'trash';
  if (item.status === 'draft') return 'draft';
  if (item.visible === false) return 'private';
  return 'public';
}

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return '刚刚更新';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} 更新`;
}

function titleOf(type, item) {
  return item.title || item.label || item.name || item.text || '未命名';
}

function subOf(type, item) {
  if (type.id === 'case') return item.summary || '';
  if (type.id === 'interest') return item.lead || '';
  if (type.id === 'tool') return item.desc || item.problem || '';
  if (type.id === 'timeline') return item.text || item.meta || '';
  if (type.id === 'campus') return item.text || '';
  if (type.id === 'contact') return item.visible === false ? '' : (item.value || '');
  if (type.id === 'notice') return item.text || '';
  if (type.id === 'nav') return item.target || '';
  if (type.id === 'branch') return item.description || '';
  if (type.id === 'site') return item.tagline || '';
  if (type.id === 'hero') return item.intro || '';
  if (type.id === 'about') return item.lead || '';
  if (type.id === 'ai') return item.endpoint || '';
  if (type.id === 'settings') return '登录时长等运行参数';
  return '';
}

function thumbOf(type, item) {
  let src = '';
  if (type.id === 'case') src = item.cover || (item.images && item.images[0] && (item.images[0].src || item.images[0])) || '';
  else if (type.id === 'interest') src = item.cover || (item.images && item.images[0] && (item.images[0].src || item.images[0])) || '';
  else if (type.id === 'campus') src = item.image || '';
  else if (type.id === 'site') src = item.avatar || '';
  if (src && typeof src === 'string') {
    const suffix = src.startsWith('/uploads/private/') ? '' : '';
    return `<img src="${esc(src)}${suffix}" alt="" loading="lazy" decoding="async">`;
  }
  const ch = String(titleOf(type, item)).slice(0, 1) || '·';
  return `<div class="ad-card-ph"><span>${esc(ch)}</span></div>`;
}

/* ---------------- 登录 ---------------- */

function renderLogin(msg = '') {
  document.body.innerHTML = `
  <main class="ad-login">
    <div class="ad-login-card">
      <p class="ad-login-kicker">SZH / ADMIN</p>
      <h1>内容后台</h1>
      <p class="ad-login-sub">登录后可以看到网站的每一条内容，改完即时生效。</p>
      <form id="loginForm" autocomplete="on">
        <label><span>账号</span><input name="username" autocomplete="username" required></label>
        <label><span>密码</span><input name="password" type="password" autocomplete="current-password" required></label>
        <p class="ad-login-err" id="loginErr">${esc(msg)}</p>
        <button class="ad-btn ad-btn--primary ad-btn--block" type="submit">登录</button>
      </form>
      <p class="ad-login-note">后台只在本地 Node 服务里可用（<code>npm start</code> · localhost:8080/admin）。</p>
    </div>
  </main>`;
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = $('button', form);
    btn.disabled = true;
    btn.textContent = '登录中…';
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: { username: form.username.value.trim(), password: form.password.value },
      });
      state.user = data.user;
      state.expiresAt = data.expiresAt;
      await boot();
    } catch (err) {
      $('#loginErr').textContent = err.message;
      btn.disabled = false;
      btn.textContent = '登录';
    }
  });
}

/* ---------------- 启动 ---------------- */

async function boot() {
  if (!state.user) {
    try {
      const me = await api('/api/auth/me');
      if (!me.user) { renderLogin(); return; }
      state.user = me.user;
      state.expiresAt = me.expiresAt;
    } catch (err) {
      renderLogin();
      return;
    }
  }
  await loadContent();
  renderShell();
  startSessionClock();
}

async function loadContent() {
  state.content = await api('/api/admin/content');
}

function startSessionClock() {
  clearInterval(state.sessionTimer);
  const tick = () => {
    const left = state.expiresAt - Date.now();
    const el = $('#sessionLeft');
    if (!el) return;
    if (!state.expiresAt) { el.textContent = '—'; return; }
    if (left <= 0) {
      el.textContent = '登录已过期';
      clearInterval(state.sessionTimer);
      renderLogin('登录已过期，请重新登录');
      return;
    }
    const m = Math.floor(left / 60000);
    el.textContent = m >= 60 ? `${Math.floor(m / 60)} 小时 ${m % 60} 分` : `${m} 分钟后到期`;
  };
  tick();
  state.sessionTimer = setInterval(tick, 15000);
}

/* ---------------- 外壳 ---------------- */

function typeRows(type) {
  const raw = getPath(state.content, type.path);
  if (type.single) return raw ? [raw] : [];
  return Array.isArray(raw) ? raw.slice() : [];
}

function counts(type) {
  const list = typeRows(type);
  const c = { all: 0, public: 0, private: 0, draft: 0, trash: 0 };
  for (const item of list) {
    c.all += 1;
    c[statusOf(item)] += 1;
  }
  return c;
}

function renderShell() {
  const type = TYPE_MAP[state.tab];
  const c = counts(type);
  const side = `
  <aside class="ad-side">
    <div class="ad-side-head"><span>CONTENT</span><b>内容</b></div>
    <nav class="ad-tabs">
      ${TYPES.map((t) => {
        const ct = counts(t);
        return `<button class="ad-tab${t.id === state.tab ? ' is-on' : ''}" data-act="tab" data-tab="${t.id}">
          <span class="ad-tab-icon">${t.icon}</span><span class="ad-tab-label">${t.label}</span>
          <span class="ad-tab-count">${t.single ? '1' : ct.all}${ct.private ? `<i title="私密 ${ct.private} 条">${ct.private}</i>` : ''}</span>
        </button>`;
      }).join('')}
      <button class="ad-tab ad-tab--sys${state.tab === 'system' ? ' is-on' : ''}" data-act="tab" data-tab="system">
        <span class="ad-tab-icon">⌘</span><span class="ad-tab-label">系统</span><span class="ad-tab-count">…</span>
      </button>
    </nav>
    <div class="ad-side-foot">
      <p>发布 = 构建静态站并推 GitHub Pages</p>
      <a href="/" target="_blank" rel="noopener">打开网站 ↗</a>
    </div>
  </aside>`;

  document.body.innerHTML = `
  <header class="ad-top">
    <div class="ad-brand"><b>SZH</b><span>/ ADMIN</span></div>
    <div class="ad-top-mid"><span id="saveState" class="ad-save-state">已同步</span><span class="ad-session">会话 <b id="sessionLeft">—</b></span></div>
    <div class="ad-top-actions">
      <button class="ad-btn ad-btn--ghost" data-act="publish">发布上线</button>
      <a class="ad-btn ad-btn--ghost" href="/" target="_blank" rel="noopener">查看站点</a>
      <button class="ad-btn ad-btn--ghost" data-act="logout">退出</button>
    </div>
  </header>
  <div class="ad-body">
    ${side}
    <main class="ad-main" id="adMain">${state.tab === 'system' ? systemMain() : mainHtml(type, c)}</main>
  </div>
  <div class="ad-drawer-host" id="drawerHost"></div>
  <div class="ad-modal-host" id="modalHost"></div>
  <input type="file" id="filePick" accept="image/*" hidden>`;

  bindGlobal();
  startSessionClock();
  if (state.tab === 'system') loadSystem();
}

function mainHtml(type, c) {
  if (type.single) {
    const item = typeRows(type)[0] || {};
    return `
    <div class="ad-main-head">
      <div><span class="ad-kicker">SINGLE / ${type.id.toUpperCase()}</span><h1>${type.label}</h1><p class="ad-lead">单条内容，直接点开编辑；保存后前台立即生效。</p></div>
    </div>
    <div class="ad-cards ad-cards--single">${singleCard(type, item)}</div>`;
  }
  const filtered = filterRows(type, c);
  return `
  <div class="ad-main-head">
    <div class="ad-head-copy"><span class="ad-kicker">${type.id.toUpperCase()} / ${c.all}</span><h1>${type.label}</h1><p class="ad-lead">${type.desc || ''}</p></div>
    <div class="ad-head-tools">
      <input class="ad-search" id="adSearch" type="search" placeholder="搜索标题…" value="${esc(state.q)}">
      <button class="ad-btn ad-btn--primary" data-act="new">＋ 新建</button>
    </div>
  </div>
  <div class="ad-filters">
    ${[['all', '全部'], ['public', '公开'], ['private', '私密'], ['draft', '草稿'], ['trash', '回收站']].map(([k, label]) => (
      `<button class="ad-filter${state.filter === k ? ' is-on' : ''}" data-act="filter" data-filter="${k}">${label}<span>${c[k]}</span></button>`
    )).join('')}
    ${state.tab === 'case' ? `<button class="ad-filter ad-filter--sel" data-act="selected">首页精选<span>${(state.content.home && state.content.home.selectedIds || []).length}</span></button>` : ''}
  </div>
  ${state.selected.size ? `<div class="ad-batchbar">
    <span>已选 ${state.selected.size} 条</span>
    <button class="ad-btn ad-btn--mini" data-act="batch" data-do="public">设为公开</button>
    <button class="ad-btn ad-btn--mini" data-act="batch" data-do="private">设为私密</button>
    <button class="ad-btn ad-btn--mini" data-act="batch" data-do="draft">设为草稿</button>
    <button class="ad-btn ad-btn--mini ad-btn--danger" data-act="batch" data-do="trash">移入回收站</button>
    <button class="ad-btn ad-btn--mini" data-act="batch" data-do="clear">取消选择</button>
  </div>` : ''}
  <div class="ad-hint">拖动卡片排序；选中卡片后按 Alt + ↑ / ↓ 也能换位。圆点是访客看不到的私密内容。</div>
  <div class="ad-cards" id="cardGrid">${filtered.map((item, i) => cardHtml(type, item, i)).join('') || emptyHtml(type)}</div>`;
}

function filterRows(type, c) {
  let list = typeRows(type).slice();
  if (state.filter === 'trash') list = list.filter((x) => statusOf(x) === 'trash');
  else if (state.filter !== 'all') list = list.filter((x) => statusOf(x) === state.filter);
  if (state.q.trim()) {
    const q = state.q.trim().toLowerCase();
    list = list.filter((x) => String(titleOf(type, x)).toLowerCase().includes(q));
  }
  list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return list;
}

function emptyHtml(type) {
  return `<div class="ad-empty"><p>这里还没有${type.label}。</p><button class="ad-btn ad-btn--primary" data-act="new">新建第一条</button></div>`;
}

function singleCard(type, item) {
  return `<article class="ad-card ad-card--single" data-id="self" data-type="${type.id}" tabindex="0" role="button" data-act="edit">
    <div class="ad-card-media">${thumbOf(type, item)}</div>
    <div class="ad-card-body">
      <h3>${esc(titleOf(type, item))}</h3>
      <p>${esc(subOf(type, item))}</p>
      <div class="ad-card-meta">${esc(fmtTime(item.updatedAt))}</div>
    </div>
    <div class="ad-card-acts"><button class="ad-btn ad-btn--mini" data-act="edit">编辑</button></div>
  </article>`;
}

function cardHtml(type, item, index) {
  const st = statusOf(item);
  const selected = state.selected.has(item.id);
  return `<article class="ad-card ad-card--${st}${selected ? ' is-selected' : ''}" data-id="${esc(item.id)}" data-type="${type.id}" data-index="${index}" tabindex="0" role="button" draggable="${st !== 'trash'}">
    <label class="ad-check" data-act="check"><input type="checkbox" ${selected ? 'checked' : ''} tabindex="-1"></label>
    <div class="ad-card-media">${thumbOf(type, item)}<span class="ad-badge ad-badge--${st}">${STATUS_LABEL[st]}</span></div>
    <div class="ad-card-body">
      <h3>${esc(titleOf(type, item))}</h3>
      <p>${esc(subOf(type, item) || '—')}</p>
      <div class="ad-card-meta">${esc(fmtTime(item.updatedAt))}${item.id ? ` · ${esc(item.id)}` : ''}</div>
    </div>
    <div class="ad-card-acts">
      ${st === 'trash'
        ? `<button data-act="restore" title="恢复">恢复</button><button data-act="purge" class="is-danger" title="彻底删除">彻底删除</button>`
        : `<button data-act="vis" title="${st === 'private' ? '改为公开' : '设为私密'}">${st === 'private' ? '设为公开' : '设为私密'}</button>
           <button data-act="status-draft" title="设为草稿">${st === 'draft' ? '已是草稿' : '存草稿'}</button>
           <button data-act="edit">编辑</button>
           <button data-act="del" class="is-danger">删除</button>`}
    </div>
  </article>`;
}

/* ---------------- 系统页 ---------------- */

function systemMain() {
  return `
  <div class="ad-main-head">
    <div><span class="ad-kicker">SYSTEM</span><h1>系统</h1><p class="ad-lead">账号、备份、操作记录、媒体库与发布。</p></div>
  </div>
  <div class="ad-sys-grid">
    <section class="ad-panel">
      <h2>账号</h2>
      <p class="ad-panel-sub">当前登录：<b>${esc(state.user ? state.user.username : '')}</b></p>
      <form id="pwdForm" class="ad-form">
        <label><span>当前密码</span><input name="currentPassword" type="password" autocomplete="current-password" required></label>
        <label><span>新密码（至少 8 位）</span><input name="newPassword" type="password" autocomplete="new-password" minlength="8" required></label>
        <button class="ad-btn" type="submit">修改密码</button>
      </form>
    </section>
    <section class="ad-panel">
      <h2>发布</h2>
      <p class="ad-panel-sub">构建静态站（含私密过滤）并推送到 GitHub Pages。</p>
      <button class="ad-btn ad-btn--primary" data-act="publish">立即发布</button>
      <pre class="ad-pub-log" id="pubLog">${esc(state.publish.log.slice(-12).join('\n') || '还没有发布记录。')}</pre>
    </section>
    <section class="ad-panel">
      <h2>备份</h2>
      <p class="ad-panel-sub">删除条目、整包导入前会自动备份。恢复会覆盖当前内容。</p>
      <div class="ad-list" id="backupList"><p class="ad-muted">读取中…</p></div>
    </section>
    <section class="ad-panel">
      <h2>操作记录</h2>
      <p class="ad-panel-sub">最近 100 条：谁、何时、对哪条、做了什么。</p>
      <div class="ad-list" id="auditList"><p class="ad-muted">读取中…</p></div>
    </section>
    <section class="ad-panel ad-panel--wide">
      <h2>媒体库</h2>
      <p class="ad-panel-sub">/uploads 与 /assets 里的图片。删除前确认没有内容在引用。</p>
      <div class="ad-media" id="mediaGrid"><p class="ad-muted">读取中…</p></div>
    </section>
  </div>`;
}

async function loadSystem() {
  try {
    state.backups = await api('/api/backups');
    const host = $('#backupList');
    if (host) {
      host.innerHTML = state.backups.items.length
        ? state.backups.items.map((b) => `<div class="ad-row"><div><b>${esc(b.name)}</b><span>${(b.size / 1024).toFixed(0)} KB · ${esc(fmtTime(b.time))}</span></div><button class="ad-btn ad-btn--mini" data-act="restore-backup" data-name="${esc(b.name)}">恢复</button></div>`).join('')
        : '<p class="ad-muted">还没有备份。</p>';
    }
  } catch (err) { toast(err.message, 'err'); }

  try {
    state.audit = await api('/api/admin/audit');
    const host = $('#auditList');
    if (host) {
      host.innerHTML = state.audit.items.length
        ? state.audit.items.slice(0, 40).map((a) => `<div class="ad-row ad-row--audit"><div><b>${esc(a.username || a.who || '')}</b> ${esc(a.action)}${a.id && a.id !== '-' ? ` · ${esc(a.type)}/${esc(a.id)}` : ` · ${esc(a.type)}`}<span>${esc(fmtTime(a.at))}${a.detail ? ' · ' + esc(a.detail) : ''}</span></div></div>`).join('')
        : '<p class="ad-muted">还没有操作记录。</p>';
    }
  } catch (err) { /* ignore */ }

  try {
    state.media = await api('/api/admin/media');
    const host = $('#mediaGrid');
    if (host) {
      host.innerHTML = state.media.items.slice(0, 60).map((m) => `<figure class="ad-media-item">
        <img src="${esc(m.url)}" alt="" loading="lazy">
        <figcaption><span>${esc(m.name)}</span>
        <button data-act="copy-media" data-url="${esc(m.url)}">复制地址</button></figcaption>
      </figure>`).join('') || '<p class="ad-muted">媒体库为空。</p>';
    }
  } catch (err) { /* ignore */ }
}

/* ---------------- 事件 ---------------- */

function bindGlobal() {
  if (document.body.dataset.bound === '1') return;
  document.body.dataset.bound = '1';

  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  document.addEventListener('submit', onSubmitForm);
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('dragstart', onDragStart);
  document.addEventListener('dragover', onDragOver);
  document.addEventListener('drop', onDrop);
  document.addEventListener('dragend', clearDragMark);
}

async function onSubmitForm(e) {
  const form = e.target;
  if (!form || form.id !== 'pwdForm') return;
  e.preventDefault();
  try {
    const data = await api('/api/auth/password', {
      method: 'POST',
      body: { currentPassword: form.currentPassword.value, newPassword: form.newPassword.value },
    });
    state.expiresAt = data.expiresAt;
    startSessionClock();
    form.reset();
    toast('密码已修改，会话已续期');
  } catch (err) {
    toast(err.message, 'err');
  }
}

function closestAct(el) {
  return el && el.closest ? el.closest('[data-act]') : null;
}

async function onClick(e) {
  const actEl = closestAct(e.target);
  if (!actEl) {
    const card = e.target.closest('.ad-card');
    if (card && !e.target.closest('button') && !e.target.closest('input') && !e.target.closest('label')) {
      openDrawer(card.dataset.type, card.dataset.id);
    }
    return;
  }
  const act = actEl.dataset.act;
  if (act === 'check' || act === 'toggle-selected') return; // 交给 change
  if (act) e.preventDefault();

  try {
    if (act === 'tab') { switchTab(actEl.dataset.tab); return; }
    if (act === 'filter') { state.filter = actEl.dataset.filter; state.selected.clear(); renderShell(); return; }
    if (act === 'new') { openDrawer(state.tab, null, true); return; }
    if (act === 'md-insert') { mdInsert(actEl.dataset.md); return; }
    if (act === 'edit') { const card = actEl.closest('.ad-card'); openDrawer(card.dataset.type, card.dataset.id); return; }
    if (act === 'close') { closeDrawer(); return; }
    if (act === 'save') { await saveDrawer(); return; }
    if (act === 'preview') { await openPreview(); return; }
    if (act === 'del') { await trashItem(cardCtx(actEl)); return; }
    if (act === 'restore') { await restoreItem(cardCtx(actEl)); return; }
    if (act === 'purge') { await purgeItem(cardCtx(actEl)); return; }
    if (act === 'vis') { await setStatus(cardCtx(actEl), pickVis(cardCtx(actEl))); return; }
    if (act === 'status-draft') { await setStatus(cardCtx(actEl), 'draft'); return; }
    if (act === 'batch') { await batch(actEl.dataset.do); return; }
    if (act === 'selected') { openSelectedModal(); return; }
    if (act === 'close-selected') { $('#modalHost').innerHTML = ''; return; }
    if (act === 'save-selected') { await saveSelected(); return; }
    if (act === 'add-row') { addRow(actEl); return; }
    if (act === 'del-row') { delRow(actEl); return; }
    if (act === 'move-row') { moveRow(actEl); return; }
    if (act === 'upload') { pickFile(actEl.dataset.path); return; }
    if (act === 'logout') { await api('/api/auth/logout', { method: 'POST' }); renderLogin(); return; }
    if (act === 'publish') { await publish(); return; }
    if (act === 'close-publish') { $('#publishPanel') && $('#publishPanel').remove(); return; }
    if (act === 'copy-media') { copyText(actEl.dataset.url); return; }
    if (act === 'restore-backup') { await restoreBackup(actEl.dataset.name); return; }
    if (act === 'discard-draft') { discardLocalDraft(); return; }
    if (act === 'apply-draft') { applyLocalDraft(); return; }
  } catch (err) {
    toast(err.message, 'err');
  }
}

function cardCtx(el) {
  const card = el.closest('.ad-card');
  return { type: card.dataset.type, id: card.dataset.id };
}

function switchTab(tab) {
  state.tab = tab;
  state.filter = 'all';
  state.q = '';
  state.selected.clear();
  renderShell();
}

function onInput(e) {
  const search = e.target.closest('#adSearch');
  if (search) {
    state.q = search.value;
    const grid = $('#cardGrid');
    const type = TYPE_MAP[state.tab];
    if (grid && type) grid.innerHTML = filterRows(type, counts(type)).map((item, i) => cardHtml(type, item, i)).join('') || emptyHtml(type);
    return;
  }
  const input = e.target.closest('[data-path]');
  if (!input || !state.drawer) return;
  const path = input.dataset.path.split('.');
  let value;
  if (input.type === 'checkbox') value = input.checked;
  else if (input.dataset.kind === 'number') value = input.value === '' ? 0 : Number(input.value);
  else value = input.value;
  if (input.dataset.kind === 'taglist') value = input.value.split(/[，,]/).map((s) => s.trim()).filter(Boolean);
  setPath(state.drawer.draft, path, value);
  markDirty();
}

function onChange(e) {
  if (e.target.id === 'filePick') { onFilePicked(e); return; }
  const visRadio = e.target.closest('input[name="vis"]');
  if (visRadio && state.drawer) {
    $$('.ad-vis-opts label').forEach((l) => l.classList.toggle('is-on', $('input', l).checked));
    if (state.drawer.isNew) {
      const chip = $('.ad-drawer-head .ad-chip');
      if (chip) { chip.className = `ad-chip ad-chip--${visRadio.value}`; chip.textContent = STATUS_LABEL[visRadio.value]; }
      return;
    }
    applyVisibility(state.drawer.type, state.drawer.id, visRadio.value)
      .then(async () => {
        await loadContent();
        const item = typeRows(TYPE_MAP[state.drawer.type]).find((x) => String(x.id) === String(state.drawer.id));
        if (item) { state.drawer.draft.status = item.status; state.drawer.draft.visible = item.visible; }
        toast(visRadio.value === 'private' ? '已设为私密' : visRadio.value === 'draft' ? '已存为草稿' : '已公开');
      })
      .catch((err) => toast(err.message, 'err'));
    return;
  }
  const check = e.target.closest('[data-act="check"] input');
  if (check) {
    const card = e.target.closest('.ad-card');
    const id = card.dataset.id;
    if (check.checked) state.selected.add(id); else state.selected.delete(id);
    card.classList.toggle('is-selected', check.checked);
    refreshBatchBar();
    return;
  }
  const toggle = e.target.closest('[data-act="selected-toggle"]');
  if (toggle) { /* handled by click via label */ }
  const input = e.target.closest('[data-path]');
  if (input && state.drawer) {
    let value;
    if (input.type === 'checkbox') value = input.checked;
    else if (input.dataset.kind === 'number') value = input.value === '' ? 0 : Number(input.value);
    else if (input.dataset.kind === 'taglist') value = input.value.split(/[，,]/).map((s) => s.trim()).filter(Boolean);
    else value = input.value;
    setPath(state.drawer.draft, input.dataset.path.split('.'), value);
    markDirty();
  }
}

function refreshBatchBar() {
  const bar = $('.ad-batchbar');
  if (state.selected.size && !bar) renderShell();
  else if (!state.selected.size && bar) { bar.remove(); $$('.ad-card.is-selected').forEach((c) => c.classList.remove('is-selected')); }
  else if (bar) bar.querySelector('span').textContent = `已选 ${state.selected.size} 条`;
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    if ($('#publishPanel')) { $('#publishPanel').remove(); return; }
    if (state.drawer) { closeDrawer(); return; }
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    if (state.drawer) saveDrawer().catch((err) => toast(err.message, 'err'));
    else toast('没有正在编辑的内容');
    return;
  }
  const card = e.target.closest && e.target.closest('.ad-card');
  if (card && (e.key === 'Enter' || e.key === ' ')) {
    if (e.target === card) {
      e.preventDefault();
      openDrawer(card.dataset.type, card.dataset.id);
      return;
    }
  }
  if (card && e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault();
    moveCard(card, e.key === 'ArrowUp' ? -1 : 1);
  }
}

/* ---------------- 拖拽排序 ---------------- */

let dragId = null;

function onDragStart(e) {
  const card = e.target.closest('.ad-card');
  if (!card || card.dataset.id === 'self') return;
  dragId = card.dataset.id;
  card.classList.add('is-dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragId);
}

function onDragOver(e) {
  const card = e.target.closest('.ad-card');
  if (!card || !dragId || card.dataset.id === dragId) return;
  e.preventDefault();
  $$('.ad-card').forEach((c) => c.classList.remove('is-over'));
  card.classList.add('is-over');
}

function clearDragMark() {
  $$('.ad-card').forEach((c) => c.classList.remove('is-over', 'is-dragging'));
  dragId = null;
}

async function onDrop(e) {
  const card = e.target.closest('.ad-card');
  const id = dragId;
  clearDragMark();
  if (!card || !id || card.dataset.id === id) return;
  e.preventDefault();
  await reorderAround(id, card.dataset.id);
}

async function moveCard(card, delta) {
  const type = TYPE_MAP[card.dataset.type];
  if (!type || type.single) return;
  if (state.filter !== 'all' || state.q) { toast('先切到「全部」再排序', 'err'); return; }
  const ids = typeRows(type).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((x) => x.id);
  const from = ids.indexOf(card.dataset.id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= ids.length) return;
  ids.splice(to, 0, ids.splice(from, 1)[0]);
  await submitOrder(type, ids);
}

async function reorderAround(dragIdValue, targetId) {
  const type = TYPE_MAP[state.tab];
  if (!type || type.single) return;
  if (state.filter !== 'all' || state.q) { toast('先切到「全部」再排序', 'err'); return; }
  const list = typeRows(type).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const ids = list.map((x) => x.id);
  const from = ids.indexOf(dragIdValue);
  const to = ids.indexOf(targetId);
  if (from < 0 || to < 0) return;
  ids.splice(to, 0, ids.splice(from, 1)[0]);
  await submitOrder(type, ids);
}

async function submitOrder(type, ids) {
  await api(`/api/admin/content/${type.id}/reorder`, { method: 'POST', body: { ids } });
  await loadContent();
  renderShell();
  toast('排序已保存');
}

/* ---------------- 抽屉 ---------------- */

function openDrawer(typeId, id, isNew = false) {
  const type = TYPE_MAP[typeId];
  if (!type) return;
  if (state.drawer && state.drawer.dirty) {
    saveLocalDraft();
    if (!confirm('当前还有未保存的修改（已存本地草稿），要打开另一条吗？')) return;
  }
  let item;
  if (type.single) {
    item = clone(typeRows(type)[0] || {});
    id = 'self';
  } else if (isNew) {
    item = {};
  } else {
    item = clone(typeRows(type).find((x) => String(x.id) === String(id)) || null);
  }
  if (!item) { toast('内容不存在', 'err'); return; }
  if (item.deletedAt) { toast('这条在回收站里，先点「恢复」再编辑', 'err'); return; }
  if (type.id === 'tool') item.name = item.name || item.title || '';

  state.drawer = {
    type: type.id, id: isNew ? null : id, isNew,
    draft: item, orig: clone(item), dirty: false, savedAt: null,
  };
  renderDrawer();
  setTimeout(() => {
    const first = $('#drawerBody input, #drawerBody textarea');
    if (first) first.focus({ preventScroll: true });
  }, 60);
  checkLocalDraft();
}

function drawerFields(type, item) {
  return type.fields.map((f) => fieldHtml(f, item[f.key], f.key)).join('');
}

function fieldHtml(f, value, path) {
  const id = `fld-${path.replace(/\./g, '-')}`;
  const label = `<div class="ad-field${f.kind === 'bool' ? ' ad-field--bool' : ''}${f.half ? ' ad-field--half' : ''}">
    <span class="ad-field-label">${esc(f.label)}${f.hint ? `<i>${esc(f.hint)}</i>` : ''}</span>`;
  const body = controlHtml(f, value, path, id);
  return `${label}${body}</div>`;
}

function controlHtml(f, value, path, id) {
  const v = value == null ? '' : value;
  switch (f.kind) {
    case 'textarea':
      return `<textarea id="${id}" data-path="${path}" rows="3">${esc(v)}</textarea>`;
    case 'markdown':
      return `<div class="ad-md"><div class="ad-md-bar"><button type="button" data-act="md-insert" data-md="## ">H2</button><button type="button" data-act="md-insert" data-md="**粗体**">B</button><button type="button" data-act="md-insert" data-md="- ">列表</button><button type="button" data-act="md-insert" data-md="[链接](https://)">链接</button></div>
      <textarea id="${id}" data-path="${path}" rows="5">${esc(v)}</textarea></div>`;
    case 'url':
      return `<input id="${id}" data-path="${path}" type="text" value="${esc(v)}" placeholder="https:// 或 mailto:">`;
    case 'color':
      return `<div class="ad-color"><input type="color" value="${esc(v || '#12110b')}" data-path="${path}" data-kind="color"><code>${esc(v || '')}</code></div>`;
    case 'number':
      return `<input id="${id}" data-path="${path}" data-kind="number" type="number" value="${esc(v)}">`;
    case 'bool':
      return `<span class="ad-switch"><input id="${id}" type="checkbox" data-path="${path}" ${v ? 'checked' : ''}><i></i></span>`;
    case 'select':
      return `<select id="${id}" data-path="${path}">${f.options.map(([ov, ol]) => `<option value="${esc(ov)}" ${String(v) === String(ov) ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select>`;
    case 'tags':
      return `<textarea id="${id}" data-path="${path}" data-kind="taglist" rows="2" placeholder="用逗号分隔">${esc(Array.isArray(v) ? v.join('，') : v)}</textarea>`;
    case 'strlist':
      return rowListHtml(f, path, Array.isArray(v) ? v : [], 'str');
    case 'kv':
      return rowListHtml(f, path, Array.isArray(v) ? v : [], 'kv');
    case 'obj2':
      return rowListHtml(f, path, Array.isArray(v) ? v : [], 'obj2');
    case 'sections':
      return rowListHtml(f, path, Array.isArray(v) ? v : [], 'section');
    case 'links':
      return rowListHtml(f, path, Array.isArray(v) ? v : [], 'link');
    case 'images':
      return rowListHtml(f, path, Array.isArray(v) ? v : [], 'image');
    case 'group':
      return `<div class="ad-group">${(f.sub || []).map((sf) => fieldHtml(sf, (v && typeof v === 'object') ? v[sf.key] : '', `${path}.${sf.key}`)).join('')}</div>`;
    case 'image':
      return `<div class="ad-image"><div class="ad-image-preview">${v ? `<img src="${esc(v)}" alt="">` : '<span>无图</span>'}</div>
        <input id="${id}" data-path="${path}" type="text" value="${esc(v)}" placeholder="/assets/photos/… 或上传">
        <button type="button" class="ad-btn ad-btn--mini" data-act="upload" data-path="${path}">上传</button></div>`;
    default:
      return `<input id="${id}" data-path="${path}" type="text" value="${esc(v)}">`;
  }
}

function rowListHtml(f, path, list, kind) {
  const rows = list.map((row, i) => rowHtml(kind, f, `${path}.${i}`, row, i, list.length)).join('');
  return `<div class="ad-rows" data-list="${path}" data-kind="${kind}">
    ${rows || '<p class="ad-muted ad-rows-empty">暂无，点下面新增。</p>'}
    <button type="button" class="ad-btn ad-btn--mini ad-btn--dash" data-act="add-row" data-path="${path}" data-kind="${kind}">＋ 新增一行</button>
  </div>`;
}

function rowHtml(kind, f, path, row, index, total) {
  const ctrl = `data-act="del-row" data-path="${path}"`;
  const up = `<button type="button" class="ad-row-btn" data-act="move-row" data-dir="-1" data-path="${path}" ${index === 0 ? 'disabled' : ''}>↑</button>`;
  const down = `<button type="button" class="ad-row-btn" data-act="move-row" data-dir="1" data-path="${path}" ${index === total - 1 ? 'disabled' : ''}>↓</button>`;
  const del = `<button type="button" class="ad-row-btn is-danger" ${ctrl}>×</button>`;
  let inner = '';
  if (kind === 'str') {
    inner = `<input type="text" data-path="${path}" value="${esc(row)}">`;
  } else if (kind === 'kv') {
    inner = `<input type="text" data-path="${path}.k" value="${esc(row && row.k || '')}" placeholder="键">
             <input type="text" data-path="${path}.v" value="${esc(row && row.v || '')}" placeholder="值">`;
  } else if (kind === 'obj2') {
    inner = `<input type="text" data-path="${path}.${f.a}" value="${esc(row && row[f.a] || '')}" placeholder="${esc(f.al || '')}">
             <textarea rows="2" data-path="${path}.${f.b}" placeholder="${esc(f.bl || '')}">${esc(row && row[f.b] || '')}</textarea>`;
  } else if (kind === 'section') {
    inner = `<input type="text" data-path="${path}.h" value="${esc(row && row.h || '')}" placeholder="小标题">
             <textarea rows="3" data-path="${path}.p" placeholder="段落（支持 Markdown）">${esc(row && row.p || '')}</textarea>`;
  } else if (kind === 'link') {
    inner = `<input type="text" data-path="${path}.text" value="${esc(row && row.text || '')}" placeholder="文字">
             <input type="text" data-path="${path}.url" value="${esc(row && row.url || '')}" placeholder="https://">`;
  } else if (kind === 'image') {
    const src = row && row.src || '';
    inner = `<div class="ad-img-row">
      <div class="ad-img-thumb">${src ? `<img src="${esc(src)}" alt="">` : '<span>—</span>'}</div>
      <div class="ad-img-fields">
        <input type="text" data-path="${path}.src" value="${esc(src)}" placeholder="图片地址">
        <input type="text" data-path="${path}.alt" value="${esc(row && row.alt || '')}" placeholder="替代文字">
        <input type="text" data-path="${path}.caption" value="${esc(row && row.caption || '')}" placeholder="图注">
      </div>
      <button type="button" class="ad-btn ad-btn--mini" data-act="upload" data-path="${path}.src">上传</button>
    </div>`;
  }
  return `<div class="ad-row${kind === 'image' ? ' ad-row--image' : ''}">${inner}<div class="ad-row-moves">${up}${down}${del}</div></div>`;
}

function renderDrawer() {
  const d = state.drawer;
  if (!d) { $('#drawerHost').innerHTML = ''; return; }
  const type = TYPE_MAP[d.type];
  const st = d.isNew ? 'public' : statusOf(draftSource(d));
  const title = d.isNew ? `新建${type.label}` : titleOf(type, d.draft);
  $('#drawerHost').innerHTML = `
  <div class="ad-drawer-backdrop" data-act="close"></div>
  <aside class="ad-drawer" role="dialog" aria-modal="true" aria-label="${esc(type.label)}编辑器">
    <header class="ad-drawer-head">
      <div>
        <span class="ad-kicker">${type.id.toUpperCase()} / ${d.isNew ? 'NEW' : esc(d.id)}</span>
        <h2>${esc(title)}</h2>
      </div>
      <div class="ad-drawer-head-actions">
        <span class="ad-chip ad-chip--${st}">${STATUS_LABEL[st]}</span>
        <button class="ad-icon-btn" data-act="close" title="关闭（Esc）">×</button>
      </div>
    </header>
    <div class="ad-drawer-note" id="draftNote"></div>
    <div class="ad-drawer-body" id="drawerBody">
      ${!type.single ? visibilityHtml(st) : ''}
      <div class="ad-fields">${drawerFields(type, d.draft)}</div>
    </div>
    <footer class="ad-drawer-foot">
      <button class="ad-btn" data-act="close">关闭</button>
      <button class="ad-btn" data-act="preview">前台预览</button>
      <button class="ad-btn ad-btn--primary" data-act="save">保存${d.dirty ? '（有修改）' : ''}</button>
    </footer>
  </aside>`;
  document.body.classList.add('ad-lock');
  updateSaveState();
}

function draftSource(d) {
  if (d.isNew) return { status: 'draft', visible: true };
  return typeRows(TYPE_MAP[d.type]).find((x) => String(x.id) === String(d.id)) || d.draft;
}

function visibilityHtml(st) {
  return `<div class="ad-vis">
    <span class="ad-vis-label">访客可见性</span>
    <div class="ad-vis-opts">
      <label class="${st === 'public' ? 'is-on' : ''}"><input type="radio" name="vis" value="public" ${st === 'public' ? 'checked' : ''}><b>公开</b><span>访客能看到完整内容</span></label>
      <label class="${st === 'private' ? 'is-on' : ''}"><input type="radio" name="vis" value="private" ${st === 'private' ? 'checked' : ''}><b>私密</b><span>访客只看到标题和「暂未公开」</span></label>
      <label class="${st === 'draft' ? 'is-on' : ''}"><input type="radio" name="vis" value="draft" ${st === 'draft' ? 'checked' : ''}><b>草稿</b><span>访客完全看不到这一条</span></label>
    </div>
  </div>`;
}

function markDirty() {
  if (!state.drawer) return;
  state.drawer.dirty = true;
  const btn = $('.ad-drawer-foot [data-act="save"]');
  if (btn) btn.textContent = '保存（有修改）';
  updateSaveState();
  clearTimeout(state.draftTimer);
  state.draftTimer = setTimeout(saveLocalDraft, 5000);
}

function updateSaveState() {
  const el = $('#saveState');
  if (!el) return;
  if (state.drawer && state.drawer.dirty) el.textContent = '未保存的修改';
  else if (state.drawer && state.drawer.savedAt) el.textContent = `已保存 · ${new Date(state.drawer.savedAt).toLocaleTimeString('zh-CN', { hour12: false })}`;
  else el.textContent = '已同步';
}

function localKey() {
  const d = state.drawer;
  return `szh-admin-draft:${d.type}:${d.isNew ? 'new' : d.id}`;
}

function saveLocalDraft() {
  const d = state.drawer;
  if (!d || !d.dirty) return;
  try {
    localStorage.setItem(localKey(), JSON.stringify({ fields: d.draft, at: Date.now() }));
    const note = $('#draftNote');
    if (note) note.innerHTML = `<span>本地草稿已存于本机 · ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}</span>`;
  } catch (err) { /* 容量满则跳过 */ }
}

function checkLocalDraft() {
  const d = state.drawer;
  const note = $('#draftNote');
  if (!d || !note) return;
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(localKey()) || 'null'); } catch (err) { saved = null; }
  if (!saved || !saved.fields) return;
  note.innerHTML = `<div class="ad-draft-banner"><span>发现 ${new Date(saved.at).toLocaleString('zh-CN', { hour12: false })} 的本地草稿</span>
    <button class="ad-btn ad-btn--mini" data-act="apply-draft">恢复</button>
    <button class="ad-btn ad-btn--mini" data-act="discard-draft">丢弃</button></div>`;
}

function applyLocalDraft() {
  const d = state.drawer;
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(localKey()) || 'null'); } catch (err) { saved = null; }
  if (!d || !saved) return;
  d.draft = saved.fields;
  d.dirty = true;
  renderDrawer();
  toast('已恢复本地草稿，记得保存');
}

function discardLocalDraft() {
  try { localStorage.removeItem(localKey()); } catch (err) { /* ignore */ }
  const note = $('#draftNote');
  if (note) note.innerHTML = '';
  toast('已丢弃本地草稿');
}

function closeDrawer() {
  const d = state.drawer;
  if (!d) return;
  if (d.dirty) {
    saveLocalDraft();
    if (!confirm('有未保存的修改，已留成本地草稿。确定关闭？')) return;
  }
  clearTimeout(state.draftTimer);
  state.drawer = null;
  $('#drawerHost').innerHTML = '';
  document.body.classList.remove('ad-lock');
  updateSaveState();
}

/* ---------------- 保存 ---------------- */

async function saveDrawer() {
  const d = state.drawer;
  if (!d) return;
  const type = TYPE_MAP[d.type];
  const body = {};
  for (const f of type.fields) {
    if (d.draft[f.key] !== undefined) body[f.key] = d.draft[f.key];
  }
  if (!type.single && !d.isNew) {
    const st = statusOf(draftSource(d));
    if (!body.title && body.name) body.title = body.name;
    if (st !== 'trash') {
      // 可见性由单选框决定，先写回
    }
  }
  const btn = $('.ad-drawer-foot [data-act="save"]');
  if (btn) { btn.disabled = true; btn.textContent = '保存中…'; }
  try {
    let data;
    if (d.isNew) {
      data = await api(`/api/admin/content/${type.id}`, { method: 'POST', body });
      d.id = data.id;
      d.isNew = false;
      d.orig = clone(data.item);
    } else {
      const target = type.single ? 'self' : d.id;
      data = await api(`/api/admin/content/${type.id}/${encodeURIComponent(target)}`, { method: 'PATCH', body });
    }
    d.draft = clone(data.item);
    d.orig = clone(data.item);
    d.dirty = false;
    d.savedAt = Date.now();
    try { localStorage.removeItem(localKey()); } catch (err) { /* ignore */ }
    await loadContent();
    const visRadio = $('input[name="vis"]:checked');
    if (!type.single && visRadio) {
      await applyVisibility(type.id, d.id, visRadio.value);
      d.draft = clone(typeRows(type).find((x) => String(x.id) === String(d.id)) || d.draft);
      d.orig = clone(d.draft);
    }
    renderShell();
    state.drawer = { type: d.type, id: d.id, isNew: false, draft: clone(d.draft), orig: clone(d.draft), dirty: false, savedAt: d.savedAt };
    renderDrawer();
    toast('已保存，前台立即生效');
  } catch (err) {
    toast(err.message, 'err');
  } finally {
    const b = $('.ad-drawer-foot [data-act="save"]');
    if (b) { b.disabled = false; b.textContent = '保存'; }
    updateSaveState();
  }
}

async function applyVisibility(typeId, id, mode) {
  const body = mode === 'draft' ? { status: 'draft' } : { status: 'published', visible: mode === 'public' };
  await api(`/api/admin/content/${typeId}/${encodeURIComponent(id)}/visibility`, { method: 'PATCH', body });
}

/* ---------------- 条目操作 ---------------- */

async function setStatus(ctx, mode) {
  const type = TYPE_MAP[ctx.type];
  if (!type || type.single) return;
  await applyVisibility(type.id, ctx.id, mode);
  await loadContent();
  renderShell();
  toast(mode === 'private' ? '已设为私密：访客只看到标题和「暂未公开」' : mode === 'draft' ? '已存为草稿：访客完全看不到' : '已公开');
}

function pickVis(ctx) {
  const item = typeRows(TYPE_MAP[ctx.type]).find((x) => String(x.id) === String(ctx.id));
  return statusOf(item) === 'private' ? 'public' : 'private';
}

async function trashItem(ctx) {
  if (!confirm('移入回收站？内容与图片都会保留，可随时恢复。')) return;
  await api(`/api/admin/content/${ctx.type}/${encodeURIComponent(ctx.id)}`, { method: 'DELETE' });
  await loadContent();
  renderShell();
  toast('已移入回收站');
}

async function restoreItem(ctx) {
  await api(`/api/admin/content/${ctx.type}/${encodeURIComponent(ctx.id)}/restore`, { method: 'POST' });
  await loadContent();
  renderShell();
  toast('已从回收站恢复');
}

async function purgeItem(ctx) {
  if (!confirm('彻底删除？会先自动备份 site.json，但删除后不能从后台恢复。')) return;
  await api(`/api/admin/content/${ctx.type}/${encodeURIComponent(ctx.id)}?purge=1`, { method: 'DELETE' });
  await loadContent();
  renderShell();
  toast('已彻底删除（已自动备份）');
}

async function batch(doWhat) {
  if (doWhat === 'clear') {
    state.selected.clear();
    renderShell();
    return;
  }
  const type = state.tab;
  const ids = Array.from(state.selected);
  if (!ids.length) return;
  if (doWhat === 'trash' && !confirm(`把选中的 ${ids.length} 条移入回收站？`)) return;
  for (const id of ids) {
    if (doWhat === 'trash') await api(`/api/admin/content/${type}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    else await applyVisibility(type, id, doWhat);
  }
  state.selected.clear();
  await loadContent();
  renderShell();
  toast(`已处理 ${ids.length} 条`);
}

/* ---------------- 预览 ---------------- */

async function openPreview() {
  const d = state.drawer;
  if (!d) return;
  if (d.dirty) await saveDrawer();
  const type = TYPE_MAP[d.type];
  let url = `/?preview=${type.id}:${encodeURIComponent(d.id)}`;
  if (!type.single) {
    const data = await api(`/api/admin/content/${type.id}/${encodeURIComponent(d.id)}/preview-token`, { method: 'POST' });
    url += `&token=${encodeURIComponent(data.token)}`;
  }
  const hash = type.preview ? type.preview(d.id) : '';
  window.open(url + hash, '_blank', 'noopener');
}

/* ---------------- 新建 / 行编辑 ---------------- */

function addRow(el) {
  const d = state.drawer;
  const path = el.dataset.path.split('.');
  const kind = el.dataset.kind;
  let list = getPath(d.draft, path);
  if (!Array.isArray(list)) { list = []; setPath(d.draft, path, list); }
  const blank = kind === 'str' ? '' : kind === 'kv' ? { k: '', v: '' }
    : kind === 'obj2' ? {} : kind === 'section' ? { h: '', p: '' }
    : kind === 'link' ? { text: '', url: '' } : { src: '', alt: '', caption: '' };
  list.push(blank);
  renderDrawer();
  markDirty();
  const rows = $$('.ad-rows', $('#drawerBody')).find((r) => r.dataset.list === el.dataset.path);
  if (rows) rows.scrollIntoView({ block: 'nearest' });
}

function delRow(el) {
  const d = state.drawer;
  const path = el.dataset.path.split('.');
  const index = Number(path.pop());
  const list = getPath(d.draft, path);
  if (!Array.isArray(list)) return;
  list.splice(index, 1);
  renderDrawer();
  markDirty();
}

function moveRow(el) {
  const d = state.drawer;
  const path = el.dataset.path.split('.');
  const index = Number(path.pop());
  const dir = Number(el.dataset.dir);
  const list = getPath(d.draft, path);
  if (!Array.isArray(list)) return;
  const to = index + dir;
  if (to < 0 || to >= list.length) return;
  list.splice(to, 0, list.splice(index, 1)[0]);
  renderDrawer();
  markDirty();
}

/* ---------------- 上传 ---------------- */

function pickFile(path) {
  state.uploadPath = path;
  const input = $('#filePick');
  input.value = '';
  input.click();
}

async function onFilePicked(e) {
  const file = e.target.files && e.target.files[0];
  if (!file || !state.uploadPath || !state.drawer) return;
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-Requested-With': 'fetch' } });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || '上传失败');
    setPath(state.drawer.draft, state.uploadPath.split('.'), data.url);
    renderDrawer();
    markDirty();
    toast('图片已上传');
  } catch (err) {
    toast(err.message, 'err');
  } finally {
    state.uploadPath = null;
  }
}

/* ---------------- 首页精选 ---------------- */

function openSelectedModal() {
  const cases = typeRows(TYPE_MAP.case).filter((c) => statusOf(c) === 'public');
  const selected = (state.content.home && state.content.home.selectedIds) || [];
  $('#modalHost').innerHTML = `
  <div class="ad-modal-backdrop" data-act="close-selected"></div>
  <div class="ad-modal">
    <header><h2>首页精选</h2><button class="ad-icon-btn" data-act="close-selected">×</button></header>
    <p class="ad-muted">勾选要出现在首页「四件做过的东西」里的项目，最多 6 个。</p>
    <div class="ad-pick-list">
      ${cases.map((c) => `<label class="ad-pick"><input type="checkbox" data-act="toggle-selected" data-id="${esc(c.id)}" ${selected.includes(c.id) ? 'checked' : ''}><span>${esc(c.title)}</span><i>${esc(c.number || '')}</i></label>`).join('')}
    </div>
    <footer><button class="ad-btn" data-act="close-selected">取消</button><button class="ad-btn ad-btn--primary" data-act="save-selected">保存</button></footer>
  </div>`;
}

function toggleSelectedItem(el) { /* checkbox 状态由读取时值决定 */ }

function mdInsert(snippet) {
  if (!state.drawer) return;
  const ta = $('.ad-drawer-body textarea:focus') || $('#drawerBody textarea');
  if (!ta || !ta.dataset.path) { toast('先在正文里点一下再插入', 'err'); return; }
  const start = ta.selectionStart ?? ta.value.length;
  const end = ta.selectionEnd ?? ta.value.length;
  const next = ta.value.slice(0, start) + snippet + ta.value.slice(end);
  ta.value = next;
  setPath(state.drawer.draft, ta.dataset.path.split('.'), ta.value);
  markDirty();
  ta.focus();
  ta.selectionStart = ta.selectionEnd = start + snippet.length;
}

async function saveSelected() {
  const ids = $$('.ad-pick input:checked').map((x) => x.dataset.id);
  const data = await api('/api/admin/selected', { method: 'PUT', body: { ids } });
  state.content.home.selectedIds = data.ids;
  $('#modalHost').innerHTML = '';
  renderShell();
  toast('首页精选已更新');
}

/* ---------------- 发布 ---------------- */

async function publish() {
  try {
    await api('/api/publish', { method: 'POST' });
  } catch (err) {
    toast(err.message, 'err');
    return;
  }
  showPublishPanel();
  pollPublish();
}

function showPublishPanel() {
  if ($('#publishPanel')) return;
  const host = $('#modalHost');
  host.innerHTML = `<div class="ad-modal-backdrop"></div>
  <div class="ad-modal ad-modal--publish" id="publishPanel">
    <header><h2>发布上线</h2><button class="ad-icon-btn" data-act="close-publish">×</button></header>
    <p class="ad-muted">正在构建静态站并推送 GitHub Pages，通常 1-3 分钟。</p>
    <div class="ad-pub-step" id="pubStep">准备中…</div>
    <pre class="ad-pub-log" id="pubLog">${esc(state.publish.log.slice(-20).join('\n'))}</pre>
  </div>`;
}

async function pollPublish() {
  clearTimeout(state.publish.timer);
  try {
    const s = await api('/api/publish/status');
    state.publish = Object.assign(state.publish, s);
    const stepEl = $('#pubStep');
    const logEl = $('#pubLog');
    if (stepEl) stepEl.textContent = s.running ? `${s.step === 'build' ? '正在构建' : '正在推送'}…` : (s.ok ? '发布完成' : s.step === 'error' ? '发布失败' : '已结束');
    if (logEl) { logEl.textContent = (s.log || []).slice(-20).join('\n'); logEl.scrollTop = logEl.scrollHeight; }
    if (s.running) state.publish.timer = setTimeout(pollPublish, 2000);
    else toast(s.ok ? '发布成功，线上已更新' : '发布失败，请看日志', s.ok ? 'ok' : 'err');
  } catch (err) {
    state.publish.timer = setTimeout(pollPublish, 3000);
  }
}

/* ---------------- 备份 ---------------- */

async function restoreBackup(name) {
  if (!confirm(`用备份 ${name} 覆盖当前内容？会先备份当前状态。`)) return;
  await api(`/api/backups/${encodeURIComponent(name)}/restore`, { method: 'POST' });
  await loadContent();
  renderShell();
  toast('已恢复备份');
}

function copyText(text) {
  navigator.clipboard ? navigator.clipboard.writeText(text).then(() => toast('地址已复制')) : toast('复制失败', 'err');
}

/* ---------------- 启动 ---------------- */

boot().catch((err) => {
  console.error(err);
  renderLogin(err.message);
});
