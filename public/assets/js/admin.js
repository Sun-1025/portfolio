/* ============================================================
   管理后台：登录 / 内容编辑 / 结构排序 / 上传 / 备份
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
  content: null,
  user: null,
  tab: 'overview',
  dirty: false,
  caseId: null,
  media: [],
  backups: [],
  saving: false,
  expiresAt: null,
  sessionTimer: null,
};

const TABS = [
  { id: 'overview', label: '概览', n: '00' },
  { id: 'site', label: '站点信息', n: '01' },
  { id: 'nav', label: '导航与分支', n: '02' },
  { id: 'home', label: '首页内容', n: '03' },
  { id: 'work', label: '项目案例', n: '04' },
  { id: 'tools', label: '工具管理', n: '05' },
  { id: 'notices', label: '公告', n: '06' },
  { id: 'media', label: '媒体库', n: '07' },
  { id: 'backups', label: '备份恢复', n: '08' },
  { id: 'account', label: '账号设置', n: '09' },
];

const CATS = [
  ['project', '项目'], ['internship', '实习'], ['campus', '校园'], ['hobby', '兴趣'],
];

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toast(message, isError = false) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.toggle('is-error', isError);
  el.classList.add('is-on');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('is-on'), 2600);
}

async function api(url, options = {}) {
  const opts = { credentials: 'same-origin', ...options };
  if (opts.body && typeof opts.body !== 'string' && !(opts.body instanceof FormData)) {
    opts.headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    opts.body = JSON.stringify(opts.body);
  }
  let res;
  try {
    res = await fetch(url, opts);
  } catch (err) {
    throw new Error('网络请求失败，请确认服务已启动');
  }
  const isJson = (res.headers.get('content-type') || '').includes('json');
  const data = isJson ? await res.json() : { ok: res.ok, text: await res.text() };
  if (res.status === 401 && url !== '/api/auth/login') {
    renderLogin('登录已过期，请重新登录');
    throw new Error('登录已过期');
  }
  if (!res.ok || data.ok === false) throw new Error(data.error || `请求失败（${res.status}）`);
  return data;
}

/* ---------------- 登录 ---------------- */

function renderLogin(message = '') {
  clearInterval(state.sessionTimer);
  state.expiresAt = null;
  document.body.className = '';
  document.body.innerHTML = `
    <div class="login-wrap">
      <form class="login-card" id="loginForm">
        <div class="mark">PORTFOLIO / ADMIN</div>
        <h1>后台登录</h1>
        <p>登录后可修改网站全部内容，保存即生效。</p>
        <div class="f"><label for="lgUser">账号</label><input id="lgUser" name="username" autocomplete="username" required></div>
        <div class="f"><label for="lgPass">密码</label><input id="lgPass" name="password" type="password" autocomplete="current-password" required></div>
        <div class="login-error" id="lgErr">${esc(message)}</div>
        <button class="btn btn--primary" type="submit" style="width:100%;padding:10px">进入后台</button>
        <div class="foot"><a href="/">← 返回网站首页</a></div>
      </form>
    </div>`;

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('button[type="submit"]', e.target);
    const err = $('#lgErr');
    btn.disabled = true;
    err.textContent = '';
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: $('#lgUser').value.trim(),
          password: $('#lgPass').value,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || '登录失败');
      state.user = data.user;
      await enterAdmin();
    } catch (error) {
      err.textContent = error.message;
      btn.disabled = false;
    }
  });
}

/* ---------------- 引导 ---------------- */

async function enterAdmin() {
  const mode = await api('/api/auth/me').catch(() => null);
  if (!mode) return;
  state.user = mode.user;
  state.expiresAt = mode.expiresAt || Date.now() + (mode.expiresInHours || 4) * 3600 * 1000;
  state.content = await api('/api/content');
  if (!state.caseId) state.caseId = (state.content.work.cases[0] || {}).id || null;
  renderShell();
}

async function boot() {
  try {
    const me = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (!me.ok) return renderLogin();
    const data = await me.json();
    state.user = data.user;
    state.expiresAt = data.expiresAt || Date.now() + (data.expiresInHours || 4) * 3600 * 1000;
    state.content = await api('/api/content');
    if (!state.caseId) state.caseId = (state.content.work.cases[0] || {}).id || null;
    renderShell();
  } catch (err) {
    renderLogin();
  }
}

/* ---------------- 框架 ---------------- */

function renderShell() {
  document.body.className = '';
  document.body.innerHTML = `
    <div class="admin-shell">
      <aside class="side">
        <div class="side-brand"><b>${esc(state.content.site.brand)}</b><span>Content Studio</span></div>
        <nav class="side-nav" id="sideNav">
          ${TABS.map((t) => `<button type="button" data-tab="${t.id}"><span class="n">${t.n}</span>${t.label}</button>`).join('')}
        </nav>
        <div class="side-bottom">
          <a href="/" target="_blank" rel="noopener">打开新版网站 ↗</a>
          <a href="/classic/" target="_blank" rel="noopener">打开经典版 ↗</a>
          <button type="button" id="logoutBtn">退出登录</button>
        </div>
      </aside>
      <div class="main">
        <div class="topline">
          <div>
            <div class="crumb" id="crumb">ADMIN / OVERVIEW</div>
            <h2 id="topTitle">概览</h2>
          </div>
          <div class="grow"></div>
          <span class="session-clock" id="sessionClock">会话校验中…</span>
          <span class="dirty-dot">有未保存的修改</span>
          <button class="btn btn--sm" type="button" id="reloadBtn">放弃修改</button>
          <button class="btn btn--primary btn--sm" type="button" id="saveBtn" disabled>保存修改</button>
        </div>
        <main class="panel" id="panel"></main>
      </div>
    </div>
    <div class="toast" id="toast"></div>`;

  $('#sideNav').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    switchTab(btn.dataset.tab);
  });
  $('#saveBtn').addEventListener('click', saveContent);
  $('#reloadBtn').addEventListener('click', async () => {
    if (!confirm('放弃当前未保存的修改，重新从服务器加载？')) return;
    state.content = await api('/api/content');
    state.dirty = false;
    syncDirty();
    switchTab(state.tab);
    toast('已重新加载服务器内容');
  });
  $('#logoutBtn').addEventListener('click', logout);

  startSessionClock();
  switchTab(state.tab || 'overview');
}

/* 登录态倒计时：到时自动回登录页，避免后台长时间开着却仍可操作。 */
function startSessionClock() {
  clearInterval(state.sessionTimer);
  const tick = () => {
    const clock = $('#sessionClock');
    if (!clock) return;
    const left = (state.expiresAt || 0) - Date.now();
    if (left <= 0) {
      clearInterval(state.sessionTimer);
      renderLogin('会话已超时，请重新登录');
      return;
    }
    const h = Math.floor(left / 3600000);
    const m = Math.floor((left % 3600000) / 60000);
    clock.textContent = `会话剩余 ${h}h ${String(m).padStart(2, '0')}m`;
    clock.classList.toggle('is-soon', left < 15 * 60 * 1000);
  };
  tick();
  state.sessionTimer = setInterval(tick, 30000);
}

function syncDirty() {
  document.body.classList.toggle('is-dirty', state.dirty);
  const save = $('#saveBtn');
  if (save) save.disabled = !state.dirty || state.saving;
}

function markDirty() {
  state.dirty = true;
  syncDirty();
}

function switchTab(tab) {
  state.tab = tab;
  $$('#sideNav [data-tab]').forEach((b) => b.classList.toggle('is-on', b.dataset.tab === tab));
  const meta = TABS.find((t) => t.id === tab) || TABS[0];
  const crumb = $('#crumb');
  const title = $('#topTitle');
  if (crumb) crumb.textContent = `ADMIN / ${meta.id.toUpperCase()}`;
  if (title) title.textContent = meta.label;
  renderTab();
}

async function renderTab() {
  const panel = $('#panel');
  if (!panel) return;
  panel.innerHTML = '<div class="loading">加载中…</div>';
  try {
    if (state.tab === 'overview') panel.innerHTML = await viewOverview();
    else if (state.tab === 'site') panel.innerHTML = viewSite();
    else if (state.tab === 'nav') panel.innerHTML = viewNav();
    else if (state.tab === 'home') panel.innerHTML = viewHome();
    else if (state.tab === 'work') panel.innerHTML = viewWork();
    else if (state.tab === 'tools') panel.innerHTML = viewTools();
    else if (state.tab === 'notices') panel.innerHTML = viewNotices();
    else if (state.tab === 'media') { await loadMedia(); panel.innerHTML = viewMedia(); }
    else if (state.tab === 'backups') { await loadBackups(); panel.innerHTML = viewBackups(); }
    else if (state.tab === 'account') panel.innerHTML = viewAccount();
    else panel.innerHTML = viewOverview();
  } catch (err) {
    panel.innerHTML = `<div class="card"><p>加载失败：${esc(err.message)}</p></div>`;
  }
}

/* ---------------- 字段构造 ---------------- */

function field(label, path, value, opts = {}) {
  const type = opts.type || 'text';
  const tip = opts.tip ? `<span class="tip">${esc(opts.tip)}</span>` : '';
  const ph = opts.placeholder ? ` placeholder="${esc(opts.placeholder)}"` : '';
  return `<div class="f">
    <label for="f-${esc(path)}">${esc(label)}</label>
    ${type === 'textarea'
      ? `<textarea id="f-${esc(path)}" data-path="${esc(path)}" class="${opts.tall ? 'tall' : ''}"${ph}>${esc(value)}</textarea>`
      : `<input id="f-${esc(path)}" data-path="${esc(path)}" type="${type}" value="${esc(value)}"${ph}${type === 'number' ? ' step="any" data-kind="number"' : ''}>`}
    ${tip}
  </div>`;
}

function area(label, path, value, opts = {}) {
  return field(label, path, value, { ...opts, type: 'textarea' });
}

function listArea(label, path, value, mode, tip) {
  const text = mode === 'csv' ? (value || []).join(', ') : (value || []).join('\n');
  return `<div class="f">
    <label for="f-${esc(path)}">${esc(label)}</label>
    <textarea id="f-${esc(path)}" data-path="${esc(path)}" data-kind="${mode}" placeholder="${mode === 'csv' ? '用逗号分隔' : '一行一条'}">${esc(text)}</textarea>
    ${tip ? `<span class="tip">${esc(tip)}</span>` : ''}
  </div>`;
}

function check(label, path, value) {
  return `<div class="f check-line">
    <input id="f-${esc(path)}" data-path="${esc(path)}" data-kind="check" type="checkbox" ${value ? 'checked' : ''}>
    <label for="f-${esc(path)}">${esc(label)}</label>
  </div>`;
}

function selectField(label, path, value, options) {
  return `<div class="f">
    <label for="f-${esc(path)}">${esc(label)}</label>
    <select id="f-${esc(path)}" data-path="${esc(path)}">
      ${options.map(([v, t]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(t)}</option>`).join('')}
    </select>
  </div>`;
}

function imageField(label, path, value) {
  return `<div class="f">
    <label>${esc(label)}</label>
    <div style="display:flex;gap:10px;align-items:flex-start">
      <img src="${esc(value)}" alt="" style="width:88px;height:66px;object-fit:cover;border:1px solid var(--adm-line);border-radius:7px;background:#eee">
      <div style="flex:1;min-width:0">
        <input data-path="${esc(path)}" type="text" value="${esc(value)}" placeholder="/assets/xxx.webp 或 /uploads/xxx.png" style="width:100%;padding:8px 10px;border:1px solid var(--adm-line);border-radius:7px;background:var(--adm-soft)">
        <div class="actions" style="margin-top:6px">
          <button class="btn btn--sm" type="button" data-upload="${esc(path)}">上传图片</button>
          <button class="btn btn--sm" type="button" data-pick-media="${esc(path)}">从媒体库选择</button>
        </div>
      </div>
    </div>
  </div>`;
}

function rowHead(index, title, arrayPath, extra = '') {
  return `<div class="row-head">
    <span class="idx">${String(index + 1).padStart(2, '0')}</span>
    <b>${esc(title)}</b>
    <div class="row-actions">
      ${extra}
      <button class="icon-btn" type="button" data-act="up" data-array="${esc(arrayPath)}" data-index="${index}" title="上移">↑</button>
      <button class="icon-btn" type="button" data-act="down" data-array="${esc(arrayPath)}" data-index="${index}" title="下移">↓</button>
      <button class="icon-btn danger" type="button" data-act="del" data-array="${esc(arrayPath)}" data-index="${index}" title="删除">×</button>
    </div>
  </div>`;
}

/* ---------------- 概览 ---------------- */

async function viewOverview() {
  let health = null;
  try { health = await api('/api/health'); } catch (err) { /* ignore */ }
  const c = state.content;
  const enabledTools = (c.tools.items || []).filter((t) => t.enabled !== false).length;
  const visibleNav = (c.nav || []).filter((n) => n.visible !== false).length;
  const source = state.dirty ? '有未保存修改' : '与服务器一致';

  return `
    <div class="panel-head"><h1>内容概览</h1><p>这里改的不是代码，是数据。保存后前台通过 SSE 自动刷新。</p></div>
    <div class="kpis">
      <div class="kpi"><b>${(c.work.cases || []).length}</b><span>项目案例</span></div>
      <div class="kpi"><b>${enabledTools}</b><span>启用工具</span></div>
      <div class="kpi"><b>${visibleNav}</b><span>导航入口</span></div>
      <div class="kpi"><b>${(c.home.about.lines || []).length}</b><span>关于我段落</span></div>
    </div>
    <div class="card">
      <h3>运行状态</h3>
      <p class="desc">服务 ${health ? '在线' : '未响应'}，数据状态：${esc(source)}。</p>
      <div class="notice-list">
        <div class="notice-item"><span class="t">ADMIN</span><span>登录账号 <b>${esc(state.user ? state.user.username : '')}</b>，登录后 4 小时自动失效。</span></div>
        <div class="notice-item"><span class="t">DATA</span><span>数据文件 data/site.json，每次保存自动留备份，最多保留 30 份。</span></div>
        <div class="notice-item"><span class="t">PUBLISH</span><span>本地服务保存即生效；GitHub Pages 需要运行静态导出并推送后生效。</span></div>
      </div>
    </div>
    <div class="card">
      <h3>快捷操作</h3>
      <p class="desc">常用入口，避免来回翻菜单。</p>
      <div class="actions">
        <button class="btn" type="button" data-goto="site">改站点信息</button>
        <button class="btn" type="button" data-goto="home">改首页</button>
        <button class="btn" type="button" data-goto="work">改项目</button>
        <button class="btn" type="button" data-goto="tools">管工具</button>
        <button class="btn" type="button" data-goto="media">传图片</button>
      </div>
    </div>`;
}

/* ---------------- 站点信息 ---------------- */

function viewSite() {
  const s = state.content.site;
  return `
    <div class="panel-head"><h1>站点信息</h1><p>品牌名、SEO 描述、头像与页脚，全站共用。</p></div>
    <div class="card">
      <h3>基础信息</h3>
      <div class="grid-2">
        ${field('品牌名', 'site.brand', s.brand)}
        ${field('浏览器标题', 'site.title', s.title)}
      </div>
      ${field('一句话签名', 'site.tagline', s.tagline)}
      ${area('SEO 描述', 'site.description', s.description, { tall: false })}
      ${imageField('头像', 'site.avatar', s.avatar)}
      <div class="grid-3">
        ${field('主题色', 'site.themeColor', s.themeColor, { tip: '浏览器地址栏颜色，如 #12110b' })}
        ${field('强调色', 'site.accent', s.accent)}
        ${field('页脚版权', 'site.footer', s.footer)}
      </div>
    </div>`;
}

/* ---------------- 导航与分支 ---------------- */

function viewNav() {
  const c = state.content;
  const nav = c.nav || [];
  const branches = c.branches || [];

  const navRows = nav.map((n, i) => `
    <div class="row-card">
      ${rowHead(i, n.label || '未命名菜单', 'nav')}
      <div class="grid-3">
        ${field('显示文字', `nav.${i}.label`, n.label)}
        ${selectField('类型', `nav.${i}.type`, n.type, [['route', '站内路由'], ['link', '外部 / 静态链接']])}
        ${field('目标', `nav.${i}.target`, n.target, { tip: 'route 填 home / work / tools；link 填 /classic/ 或完整网址' })}
      </div>
      <div class="grid-3">
        ${field('排序', `nav.${i}.order`, n.order, { type: 'number' })}
        ${check('在导航显示', `nav.${i}.visible`, n.visible !== false)}
      </div>
    </div>`).join('');

  const branchRows = branches.map((b, i) => `
    <div class="row-card">
      ${rowHead(i, b.label || '未命名分支', 'branches')}
      <div class="grid-3">
        ${field('分支名称', `branches.${i}.label`, b.label)}
        ${field('ID', `branches.${i}.id`, b.id, { tip: '唯一标识，保存后尽量不改' })}
        ${selectField('类型', `branches.${i}.type`, b.type, [['builtin', '内置页面'], ['legacy', '旧版页面'], ['custom', '自定义']])}
      </div>
      <div class="grid-3">
        ${field('排序', `branches.${i}.order`, b.order, { type: 'number' })}
        ${check('启用', `branches.${i}.visible`, b.visible !== false)}
      </div>
      ${field('说明', `branches.${i}.description`, b.description)}
    </div>`).join('');

  return `
    <div class="panel-head"><h1>导航与分支</h1><p>控制顶部菜单的顺序、显隐，以及站点分支的开关。</p></div>
    <div class="card">
      <h3>顶部导航</h3>
      <p class="desc">排序数字越小越靠前；隐藏只影响导航，不删除内容。</p>
      ${navRows || '<div class="empty">还没有导航项</div>'}
      <button class="btn" type="button" data-act="add" data-array="nav">+ 新增导航项</button>
    </div>
    <div class="card">
      <h3>站点分支</h3>
      <p class="desc">分支用于标记站点结构，经典版属于 legacy 类型，页面文件在 /classic/。</p>
      ${branchRows || '<div class="empty">还没有分支</div>'}
      <button class="btn" type="button" data-act="add" data-array="branches">+ 新增分支</button>
    </div>`;
}

/* ---------------- 首页 ---------------- */

function viewHome() {
  const h = state.content.home;
  const hero = h.hero || {};
  const about = h.about || {};

  const stats = (h.stats || []).map((s, i) => `
    <div class="row-card">
      ${rowHead(i, `${s.value || '—'} / ${s.label || '指标'}`, 'home.stats')}
      <div class="grid-2">
        ${field('数值', `home.stats.${i}.value`, s.value)}
        ${field('说明', `home.stats.${i}.label`, s.label)}
      </div>
    </div>`).join('');

  const facts = (about.facts || []).map((f, i) => `
    <div class="row-card">
      ${rowHead(i, `${f.k || '字段'}：${f.v || ''}`, 'home.about.facts')}
      <div class="grid-2">
        ${field('字段名', `home.about.facts.${i}.k`, f.k)}
        ${field('内容', `home.about.facts.${i}.v`, f.v)}
      </div>
    </div>`).join('');

  const abilities = (about.abilities || []).map((a, i) => `
    <div class="row-card">
      ${rowHead(i, a.t || '能力', 'home.about.abilities')}
      ${field('标题', `home.about.abilities.${i}.t`, a.t)}
      ${area('正文', `home.about.abilities.${i}.d`, a.d)}
    </div>`).join('');

  const skills = (about.skills || []).map((s, i) => `
    <div class="row-card">
      ${rowHead(i, s.n || '技能', 'home.about.skills')}
      <div class="grid-2">
        ${field('名称', `home.about.skills.${i}.n`, s.n)}
        ${check('高亮显示', `home.about.skills.${i}.hot`, Boolean(s.hot))}
      </div>
    </div>`).join('');

  const future = (about.future || []).map((f, i) => `
    <div class="row-card">
      ${rowHead(i, f.t || '阶段', 'home.about.future')}
      ${field('阶段标题', `home.about.future.${i}.t`, f.t)}
      ${area('说明', `home.about.future.${i}.d`, f.d)}
    </div>`).join('');

  const contacts = (h.contacts || []).map((c, i) => `
    <div class="row-card">
      ${rowHead(i, `${c.label || '联系方式'} · ${c.value || ''}`, 'home.contacts')}
      <div class="grid-3">
        ${field('标签', `home.contacts.${i}.label`, c.label)}
        ${field('显示值', `home.contacts.${i}.value`, c.value)}
        ${field('链接', `home.contacts.${i}.url`, c.url, { tip: '邮箱填 mailto:，网页填 https://；可留空' })}
      </div>
    </div>`).join('');

  return `
    <div class="panel-head"><h1>首页内容</h1><p>首屏、数据条、关于我、能力与联系方式。</p></div>

    <div class="card">
      <h3>首屏 Hero</h3>
      ${field('上方小字', 'home.hero.eyebrow', hero.eyebrow)}
      ${area('主标题', 'home.hero.title', hero.title, { tip: '需要换行时直接回车，前台会保留换行' })}
      ${area('引导语', 'home.hero.intro', hero.intro)}
      <div class="grid-2">
        ${field('主按钮文字', 'home.hero.primary.label', (hero.primary || {}).label)}
        ${field('主按钮链接', 'home.hero.primary.href', (hero.primary || {}).href)}
        ${field('次按钮文字', 'home.hero.secondary.label', (hero.secondary || {}).label)}
        ${field('次按钮链接', 'home.hero.secondary.href', (hero.secondary || {}).href)}
      </div>
    </div>

    <div class="card">
      <h3>数据条</h3>
      <p class="desc">首屏下方的四个关键数字。</p>
      ${stats || '<div class="empty">暂无数据条</div>'}
      <button class="btn" type="button" data-act="add" data-array="home.stats">+ 新增指标</button>
    </div>

    <div class="card">
      <h3>关于我</h3>
      ${field('区块标题', 'home.about.title', about.title)}
      ${field('区块副标题', 'home.about.lead', about.lead)}
      ${listArea('正文段落', 'home.about.lines', about.lines, 'lines', '一行一段，前台按段落渲染')}
      <button class="btn btn--sm" type="button" data-act="add" data-array="home.about.lines">+ 新增段落</button>
    </div>

    <div class="card">
      <h3>个人档案</h3>
      ${facts || '<div class="empty">暂无档案字段</div>'}
      <button class="btn" type="button" data-act="add" data-array="home.about.facts">+ 新增字段</button>
    </div>

    <div class="card">
      <h3>能力介绍</h3>
      ${abilities}
      <button class="btn" type="button" data-act="add" data-array="home.about.abilities">+ 新增能力</button>
    </div>

    <div class="card">
      <h3>技能标签</h3>
      <div class="grid-2">${skills}</div>
      <button class="btn" type="button" data-act="add" data-array="home.about.skills">+ 新增技能</button>
    </div>

    <div class="card">
      <h3>个人理念</h3>
      ${listArea('理念段落', 'home.about.belief.lines', (about.belief || {}).lines, 'lines')}
      <button class="btn btn--sm" type="button" data-act="add" data-array="home.about.belief.lines">+ 新增段落</button>
      ${field('金句', 'home.about.belief.quote', (about.belief || {}).quote)}
    </div>

    <div class="card">
      <h3>未来方向</h3>
      ${future}
      <button class="btn" type="button" data-act="add" data-array="home.about.future">+ 新增阶段</button>
    </div>

    <div class="card">
      <h3>联系方式</h3>
      ${contacts}
      <button class="btn" type="button" data-act="add" data-array="home.contacts">+ 新增联系方式</button>
    </div>`;
}

/* ---------------- 项目案例 ---------------- */

function viewWork() {
  const work = state.content.work;
  const cases = work.cases || [];
  if (!cases.length) {
    return `<div class="panel-head"><h1>项目案例</h1></div>
      <div class="card"><div class="empty">还没有案例</div><button class="btn" data-act="add" data-array="work.cases">+ 新增案例</button></div>`;
  }
  if (!state.caseId || !cases.some((c) => c.id === state.caseId)) state.caseId = cases[0].id;
  const index = cases.findIndex((c) => c.id === state.caseId);
  const c = cases[index];

  const tabs = cases.map((item, i) => `<button type="button" data-case="${esc(item.id)}" class="${item.id === c.id ? 'is-on' : ''}">${String(i + 1).padStart(2, '0')} ${esc(item.title)}</button>`).join('');

  const sections = (c.sections || []).map((s, i) => `
    <div class="row-card">
      ${rowHead(i, s.h || '小节', `work.cases.${index}.sections`)}
      ${field('小标题', `work.cases.${index}.sections.${i}.h`, s.h)}
      ${area('正文', `work.cases.${index}.sections.${i}.p`, s.p)}
    </div>`).join('');

  const links = (c.links || []).map((l, i) => `
    <div class="row-card">
      ${rowHead(i, l.text || '链接', `work.cases.${index}.links`)}
      <div class="grid-2">
        ${field('文字', `work.cases.${index}.links.${i}.text`, l.text)}
        ${field('URL', `work.cases.${index}.links.${i}.url`, l.url)}
      </div>
    </div>`).join('');

  return `
    <div class="panel-head"><h1>项目案例</h1><p>先选一个案例，再编辑它的字段。修改后点右上角保存。</p></div>
    <div class="card">
      <div class="case-tabs">${tabs}</div>
      <div class="actions" style="margin-bottom:16px">
        <button class="btn btn--sm" type="button" data-act="add" data-array="work.cases">+ 新增案例</button>
        <button class="btn btn--sm btn--danger" type="button" data-act="del" data-array="work.cases" data-index="${index}">删除当前案例</button>
        <span class="tip" style="font-size:11px;color:var(--adm-muted)">删除不可撤销，但可从备份恢复</span>
      </div>
      <div class="grid-3">
        ${field('标题', `work.cases.${index}.title`, c.title)}
        ${selectField('分类', `work.cases.${index}.category`, c.category, CATS)}
        ${field('序号', `work.cases.${index}.number`, c.number)}
      </div>
      <div class="grid-3">
        ${field('归属', `work.cases.${index}.org`, c.org)}
        ${field('时间', `work.cases.${index}.period`, c.period)}
        ${field('角色', `work.cases.${index}.role`, c.role)}
      </div>
      ${area('摘要', `work.cases.${index}.summary`, c.summary)}
      ${listArea('标签', `work.cases.${index}.tags`, c.tags, 'csv', '逗号分隔，前台最多显示 4 个')}
      ${listArea('配图', `work.cases.${index}.images`, c.images, 'lines', '一行一个图片地址，如 /assets/xxx.webp')}
      ${area('结果一句话', `work.cases.${index}.result`, c.result)}
      <label class="tip" style="display:block;margin:6px 0">案例 ID：<b>${esc(c.id)}</b>（供链接 #/work/${esc(c.id)} 使用）</label>
    </div>
    <div class="card">
      <h3>正文小节</h3>
      ${sections || '<div class="empty">还没有小节</div>'}
      <button class="btn" type="button" data-act="add" data-array="work.cases.${index}.sections">+ 新增小节</button>
    </div>
    <div class="card">
      <h3>外部链接</h3>
      ${links || '<div class="empty">还没有链接</div>'}
      <button class="btn" type="button" data-act="add" data-array="work.cases.${index}.links">+ 新增链接</button>
    </div>`;
}

/* ---------------- 工具 ---------------- */

function viewTools() {
  const t = state.content.tools;
  const items = t.items || [];
  const rows = items.map((item, i) => `
    <div class="row-card">
      ${rowHead(i, `${item.name || '未命名工具'} · ${item.enabled === false ? '已关闭' : '启用中'}`, 'tools.items')}
      <div class="grid-4">
        ${field('ID', `tools.items.${i}.id`, item.id)}
        ${field('名称', `tools.items.${i}.name`, item.name)}
        ${field('图标', `tools.items.${i}.icon`, item.icon)}
        ${selectField('分类', `tools.items.${i}.category`, item.category, [['convert', '转换'], ['query', '查询']])}
      </div>
      ${field('简介', `tools.items.${i}.desc`, item.desc)}
      <div class="grid-3">
        ${field('模块文件', `tools.items.${i}.module`, item.module, { tip: '必须与 public/tools/ 下的文件名一致，如 markdown.js' })}
        ${field('排序', `tools.items.${i}.order`, item.order, { type: 'number' })}
        ${check('启用', `tools.items.${i}.enabled`, item.enabled !== false)}
      </div>
    </div>`).join('');

  return `
    <div class="panel-head"><h1>工具管理</h1><p>开关、排序、新增入口。新增工具时先在 public/tools/ 放一个导出 render() 的模块文件。</p></div>
    <div class="card">
      <h3>工具列表</h3>
      <p class="desc">关闭后前台不显示；模块文件不存在时会提示加载失败。</p>
      ${rows || '<div class="empty">还没有工具</div>'}
      <button class="btn" type="button" data-act="add" data-array="tools.items">+ 新增工具</button>
    </div>
    <div class="card">
      <h3>扩展约定</h3>
      <p class="desc">模块需导出：<code>export function render(root, ctx)</code>。root 是容器节点，ctx.toast 可弹提示。文件放在 public/tools/&lt;module&gt;。</p>
    </div>`;
}

/* ---------------- 公告 ---------------- */

function viewNotices() {
  const notices = state.content.notices || [];
  const rows = notices.map((n, i) => `
    <div class="row-card">
      ${rowHead(i, n.title || '公告', 'notices')}
      <div class="grid-3">
        ${field('标题', `notices.${i}.title`, n.title)}
        ${field('日期', `notices.${i}.date`, n.date, { placeholder: '2026-11-22' })}
        ${check('启用', `notices.${i}.enabled`, n.enabled !== false)}
      </div>
      ${area('正文', `notices.${i}.body`, n.body, { tip: '支持 **加粗** 与 `行内代码`' })}
    </div>`).join('');

  return `
    <div class="panel-head"><h1>公告</h1><p>首页只显示第一条启用的公告；没有启用公告时整块隐藏。</p></div>
    <div class="card">
      ${rows || '<div class="empty">还没有公告</div>'}
      <button class="btn" type="button" data-act="add" data-array="notices">+ 新增公告</button>
    </div>`;
}

/* ---------------- 媒体 ---------------- */

async function loadMedia() {
  const res = await api('/api/admin/media');
  state.media = res.items || [];
}

function viewMedia() {
  const cards = state.media.map((m) => `
    <div class="media-card">
      <img src="${esc(m.url)}" alt="${esc(m.name)}" loading="lazy">
      <div class="media-meta">
        <div>${esc(m.name)}</div>
        <div>${(m.size / 1024).toFixed(1)} KB · ${esc(m.dir)}</div>
        <div class="m-act">
          <button type="button" data-copy="${esc(m.url)}">复制地址</button>
          <button type="button" data-avatar-url="${esc(m.url)}">设为头像</button>
          ${m.dir === '/uploads/' ? `<button type="button" class="danger" data-del-media="${esc(m.name)}">删除</button>` : ''}
        </div>
      </div>
    </div>`).join('');

  return `
    <div class="panel-head"><h1>媒体库</h1><p>上传图片后把地址填到对应字段；assets 内为原站资源，只读。</p></div>
    <div class="card">
      <div class="actions" style="margin-bottom:14px">
        <button class="btn btn--primary" type="button" id="mediaUploadBtn">上传图片</button>
        <span class="tip" style="font-size:11px;color:var(--adm-muted)">支持 png / jpg / webp / gif / avif，单张不超过 8MB</span>
      </div>
      <div class="media-grid">${cards || '<div class="empty">媒体库为空</div>'}</div>
    </div>`;
}

/* ---------------- 备份 ---------------- */

async function loadBackups() {
  const res = await api('/api/backups');
  state.backups = res.items || [];
}

function viewBackups() {
  const rows = state.backups.map((b) => `
    <div class="backup-row">
      <span class="mono">${esc(b.name)}</span>
      <span class="mono">${(b.size / 1024).toFixed(1)} KB</span>
      <span class="grow mono">${new Date(b.time).toLocaleString('zh-CN')}</span>
      <button class="btn btn--sm" type="button" data-restore="${esc(b.name)}">恢复到此版本</button>
    </div>`).join('');

  return `
    <div class="panel-head"><h1>备份恢复</h1><p>每次保存都会生成一份备份，最多保留 30 份。</p></div>
    <div class="card">
      ${rows || '<div class="empty">暂无备份，第一次保存后会出现</div>'}
    </div>
    <div class="card">
      <h3>手动备份</h3>
      <p class="desc">也可以直接复制 data/site.json 到其他位置保存。</p>
      <button class="btn" type="button" id="manualBackup">立即生成一份备份</button>
    </div>`;
}

/* ---------------- 账号 ---------------- */

function viewAccount() {
  return `
    <div class="panel-head"><h1>账号设置</h1><p>当前账号：<b>${esc(state.user ? state.user.username : '')}</b>。登录后 4 小时自动失效。</p></div>
    <div class="card">
      <h3>修改密码</h3>
      <form id="pwdForm" style="max-width:420px">
        ${field('当前密码', 'pwd.current', '', { type: 'password' })}
        ${field('新密码', 'pwd.next', '', { type: 'password', tip: '至少 8 位' })}
        ${field('确认新密码', 'pwd.confirm', '', { type: 'password' })}
        <button class="btn btn--primary" type="submit">保存新密码</button>
      </form>
    </div>
    <div class="card">
      <h3>会话</h3>
      <p class="desc">退出后需要重新输入账号密码。</p>
      <button class="btn btn--danger" type="button" id="logoutBtn2">退出登录</button>
    </div>`;
}

/* ---------------- 路径读写 ---------------- */

function getPath(obj, path) {
  return path.split('.').reduce((cur, key) => (cur == null ? undefined : cur[key]), obj);
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  keys.forEach((key, i) => {
    if (i === keys.length - 1) {
      cur[key] = value;
      return;
    }
    if (cur[key] == null || typeof cur[key] !== 'object') cur[key] = {};
    cur = cur[key];
  });
}

function defaultValue(arrayPath) {
  const name = arrayPath.split('.').pop();
  const now = Date.now().toString(36);
  if (name === 'nav') return { id: `nav-${now}`, label: '新菜单', type: 'route', target: 'home', visible: true, order: 99 };
  if (name === 'branches') return { id: `branch-${now}`, label: '新分支', type: 'custom', visible: true, order: 99, description: '' };
  if (name === 'stats') return { value: '0', label: '新指标' };
  if (name === 'facts') return { k: '字段', v: '内容' };
  if (name === 'abilities') return { t: '新能力', d: '' };
  if (name === 'skills') return { n: '新技能' };
  if (name === 'future') return { t: '新阶段', d: '' };
  if (name === 'contacts') return { label: '联系方式', value: '', url: '' };
  if (name === 'notices') return { id: `notice-${now}`, title: '新公告', body: '', date: '', enabled: true };
  if (name === 'tools') return { id: `tool-${now}`, name: '新工具', desc: '', module: '', icon: '↗', category: 'convert', enabled: true, order: 99 };
  if (name === 'cases') return { id: `case-${now}`, title: '新案例', category: 'project', number: '', org: '', period: '', role: '', summary: '', tags: [], images: [], links: [], sections: [], result: '' };
  if (name === 'sections') return { h: '新小节', p: '' };
  if (name === 'links') return { text: '新链接', url: 'https://' };
  if (name === 'lines') return '';
  return '';
}

/* ---------------- 事件绑定 ---------------- */

document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-path]');
  if (!el || !state.content) return;
  if (el.closest('#loginForm') || el.closest('#pwdForm')) return;
  let value;
  if (el.dataset.kind === 'check') value = el.checked;
  else if (el.dataset.kind === 'number') value = Number(el.value) || 0;
  else if (el.dataset.kind === 'csv') value = el.value.split(/[,，\n]/).map((s) => s.trim()).filter(Boolean);
  else if (el.dataset.kind === 'lines') value = el.value.split('\n').map((s) => s.trim()).filter(Boolean);
  else value = el.value;
  setPath(state.content, el.dataset.path, value);
  markDirty();
});

document.addEventListener('click', async (e) => {
  const goto = e.target.closest('[data-goto]');
  if (goto) return switchTab(goto.dataset.goto);

  const caseTab = e.target.closest('[data-case]');
  if (caseTab) {
    state.caseId = caseTab.dataset.case;
    return renderTab();
  }

  const upload = e.target.closest('[data-upload]');
  if (upload) {
    pickAndUpload(upload.dataset.upload);
    return;
  }

  const pick = e.target.closest('[data-pick-media]');
  if (pick) {
    state.tab = 'media';
    switchTab('media');
    toast('在媒体库复制图片地址，再填回字段');
    return;
  }

  const copy = e.target.closest('[data-copy]');
  if (copy) {
    try { await navigator.clipboard.writeText(copy.dataset.copy); toast('地址已复制'); }
    catch (err) { toast('复制失败，请手动选择', true); }
    return;
  }

  const avatar = e.target.closest('[data-avatar-url]');
  if (avatar && state.content) {
    state.content.site.avatar = avatar.dataset.avatarUrl;
    state.dirty = true;
    syncDirty();
    toast('已设为头像，记得点保存');
    return;
  }

  const delMedia = e.target.closest('[data-del-media]');
  if (delMedia) {
    if (!confirm(`删除上传文件 ${delMedia.dataset.delMedia}？`)) return;
    try {
      await api(`/api/admin/media/${encodeURIComponent(delMedia.dataset.delMedia)}`, { method: 'DELETE' });
      await loadMedia();
      renderTab();
      toast('已删除');
    } catch (err) { toast(err.message, true); }
    return;
  }

  if (e.target.closest('#mediaUploadBtn')) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const url = await uploadFile(file);
      if (url) {
        await loadMedia();
        renderTab();
        toast('上传完成：' + url);
      }
    };
    input.click();
    return;
  }

  const restore = e.target.closest('[data-restore]');
  if (restore) {
    if (!confirm(`恢复备份 ${restore.dataset.restore}？当前内容会被覆盖。`)) return;
    try {
      await api(`/api/backups/${encodeURIComponent(restore.dataset.restore)}/restore`, { method: 'POST' });
      state.content = await api('/api/content');
      state.dirty = false;
      syncDirty();
      switchTab('overview');
      toast('已恢复备份');
    } catch (err) { toast(err.message, true); }
    return;
  }

  if (e.target.closest('#manualBackup')) {
    try {
      await saveContent(true);
      await loadBackups();
      renderTab();
    } catch (err) { toast(err.message, true); }
    return;
  }

  if (e.target.closest('#logoutBtn2')) return logout();

  const act = e.target.closest('[data-act]');
  if (!act) return;
  const arrayPath = act.dataset.array;
  const index = Number(act.dataset.index);
  const arr = getPath(state.content, arrayPath);
  if (!Array.isArray(arr)) return;

  if (act.dataset.act === 'add') {
    const item = defaultValue(arrayPath);
    if (item && typeof item === 'object' && 'order' in item) {
      item.order = arr.reduce((max, it) => Math.max(max, Number(it.order) || 0), 0) + 1;
    }
    arr.push(item);
  } else if (act.dataset.act === 'del') {
    if (!confirm('确定删除这一条？')) return;
    if (arrayPath === 'work.cases') {
      const removed = arr[index];
      arr.splice(index, 1);
      if (removed && removed.id === state.caseId) state.caseId = (arr[0] || {}).id || null;
    } else {
      arr.splice(index, 1);
    }
  } else if (act.dataset.act === 'up' && index > 0) {
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
  } else if (act.dataset.act === 'down' && index < arr.length - 1) {
    [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
  }

  state.dirty = true;
  syncDirty();
  renderTab();
});

document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'pwdForm') return;
  e.preventDefault();
  const current = $('#f-pwd\\.current').value;
  const next = $('#f-pwd\\.next').value;
  const confirmValue = $('#f-pwd\\.confirm').value;
  if (next.length < 8) return toast('新密码至少 8 位', true);
  if (next !== confirmValue) return toast('两次输入的新密码不一致', true);
  try {
    await api('/api/auth/password', { method: 'POST', body: { currentPassword: current, newPassword: next } });
    toast('密码已更新，下次用新密码登录');
    e.target.reset();
  } catch (err) { toast(err.message, true); }
});

async function uploadFile(file) {
  if (file.size > 8 * 1024 * 1024) {
    toast('图片超过 8MB，请先压缩', true);
    return null;
  }
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await api('/api/admin/upload', { method: 'POST', body: fd });
    return res.url;
  } catch (err) {
    toast(err.message, true);
    return null;
  }
}

function pickAndUpload(path) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    const url = await uploadFile(file);
    if (!url) return;
    setPath(state.content, path, url);
    markDirty();
    renderTab();
    toast('图片已上传并填入');
  };
  input.click();
}

/* ---------------- 保存 / 退出 ---------------- */

async function saveContent(silent = false) {
  if (!state.content || state.saving) return;
  state.saving = true;
  syncDirty();
  try {
    const res = await api('/api/content', { method: 'PUT', body: state.content });
    state.dirty = false;
    state.saving = false;
    syncDirty();
    if (!silent) toast(`已保存（${(res.bytes / 1024).toFixed(1)} KB），前台已刷新`);
  } catch (err) {
    state.saving = false;
    syncDirty();
    toast(err.message, true);
    throw err;
  }
}

async function logout() {
  try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } catch (err) { /* ignore */ }
  clearInterval(state.sessionTimer);
  state.content = null;
  state.dirty = false;
  state.expiresAt = null;
  renderLogin();
}

window.addEventListener('beforeunload', (e) => {
  if (state.dirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveContent();
  }
});

boot();
