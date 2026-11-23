/* ============================================================
   前台应用：数据加载 / 路由 / 视图渲染 / 主题 / 实时刷新
   路由均为 hash 形式：#/、#/work、#/work/:id、#/tools、#/tools/:id
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const CAT_LABEL = { project: '项目', internship: '实习', campus: '校园', hobby: '兴趣' };
const TOOL_CAT = { convert: '转换', query: '查询' };

const state = {
  data: null,
  route: { name: 'home', id: null },
  filter: 'all',
  source: 'api',
};

/* ---------------- 工具函数 ---------------- */
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(url) {
  const value = String(url || '').trim();
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(value)) return esc(value);
  return '#';
}

function inlineMd(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

function byOrder(list) {
  return (list || []).slice().sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}

function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-on');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('is-on'), 2200);
}

/* ---------------- 控制台氛围 ---------------- */
function renderTicker() {
  const tokens = [
    'EMBEDDED SYSTEMS', 'IOT / ESP32', 'AI AGENTS', 'C / C++',
    'PYTHON', 'SQL SERVER', 'INTERFACE DESIGN', 'SIGNAL / NOISE'
  ];
  const items = tokens.map((t) => `<span class="ticker-item"><i></i>${esc(t)}</span>`).join('');
  return `<div class="ticker" aria-hidden="true"><div class="ticker-track">${items}${items}</div></div>`;
}

function updateClock() {
  const el = $('#localTime');
  if (!el) return;
  const value = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Shanghai'
  }).format(new Date());
  el.textContent = `${value} CST`;
}

function updateScrollProgress() {
  const el = $('#scrollProgress');
  if (!el) return;
  const doc = document.documentElement;
  const max = doc.scrollHeight - doc.clientHeight;
  const ratio = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
  el.style.width = `${ratio * 100}%`;
}

function bindPointerGlow() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  window.addEventListener('pointermove', (e) => {
    document.documentElement.style.setProperty('--mx', `${e.clientX}px`);
    document.documentElement.style.setProperty('--my', `${e.clientY}px`);
    if (!(e.target instanceof Element)) return;
    const card = e.target.closest('.case-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx-local', `${e.clientX - rect.left}px`);
    card.style.setProperty('--my-local', `${e.clientY - rect.top}px`);
  }, { passive: true });
}


/* ---------------- 主题 ---------------- */
function currentTheme() {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === 'light' || explicit === 'dark') return explicit;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('pf-theme', theme); } catch (err) { /* ignore */ }
  const btn = $('#themeBtn');
  if (btn) {
    btn.textContent = theme === 'dark' ? '☀' : '☾';
    btn.setAttribute('aria-label', theme === 'dark' ? '切换到浅色' : '切换到深色');
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#060809' : '#eff2e8');
}

/* ---------------- 数据 ---------------- */
async function loadData() {
  try {
    const res = await fetch('/api/content', { cache: 'no-store' });
    if (res.ok && (res.headers.get('content-type') || '').includes('json')) {
      state.source = 'api';
      return await res.json();
    }
  } catch (err) { /* 静态环境没有 API，继续回退 */ }
  const res = await fetch('/data/site.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('无法读取站点数据');
  state.source = 'static';
  return res.json();
}

/* ---------------- 导航 ---------------- */
function navHref(item) {
  if (item.type === 'link') return safeUrl(item.target);
  return item.target === 'home' ? '#/' : `#/${item.target}`;
}

/* 分支开关同时约束导航和直达路由，避免“后台隐藏了、前台还能打开”。 */
function branchForNav(item) {
  if (!item || item.type === 'route') return null;
  const branches = state.data.branches || [];
  const id = String(item.target || '').replace(/^#?\//, '').replace(/\/$/, '');
  return branches.find((b) => b.id === id) || null;
}

function branchVisible(name) {
  const branch = (state.data.branches || []).find((b) => b.id === name);
  return !branch || branch.visible !== false;
}

function renderNav() {
  const nav = $('#nav');
  const items = byOrder(state.data.nav)
    .filter((n) => n.visible !== false)
    .filter((n) => {
      const branch = n.type === 'route'
        ? (state.data.branches || []).find((b) => b.id === n.target)
        : branchForNav(n);
      return !branch || branch.visible !== false;
    });
  nav.innerHTML = items.map((item) => {
    const href = navHref(item);
    const cls = item.type === 'link' ? '' : 'data-route="' + esc(item.target) + '"';
    return `<a href="${href}" ${cls}>${esc(item.label)}</a>`;
  }).join('');
  const admin = document.querySelector('.admin-link');
  if (admin && state.source === 'static') admin.style.display = 'none';
}

function updateNavActive() {
  $$('#nav a').forEach((a) => {
    const route = a.dataset.route;
    a.classList.toggle('is-active', Boolean(route) && route === state.route.name);
  });
}

/* ---------------- 视图：首页 ---------------- */
function renderNotice() {
  const notice = (state.data.notices || []).find((n) => n.enabled !== false);
  if (!notice) return '';
  return `<div class="wrap"><aside class="notice">
    <span><strong>${esc(notice.title)}</strong>${inlineMd(notice.body)}</span>
    ${notice.date ? `<time>${esc(notice.date)}</time>` : ''}
  </aside></div>`;
}

function renderStats() {
  const stats = state.data.home.stats || [];
  if (!stats.length) return '';
  return `<div class="wrap"><div class="stats">${stats.map((s) => `
    <div class="stat"><span class="stat-value">${esc(s.value)}</span><span class="stat-label">${esc(s.label)}</span></div>
  `).join('')}</div></div>`;
}

function renderHome() {
  const home = state.data.home;
  const hero = home.hero || {};
  const facts = (home.about && home.about.facts) || [];
  const loc = facts.find((f) => f.k === '所在地');
  const dir = facts.find((f) => f.k === '主攻方向');
  const about = home.about || {};
  const focus = dir ? String(dir.v || '').split(/[、/]/)[0].trim() : 'EMBEDDED';

  const titleHtml = String(hero.title || '').split('\n').map((line, i) =>
    `<span class="hero-line${i === 1 ? ' is-accent' : ''}">${esc(line)}</span>`
  ).join('');

  const abilities = (about.abilities || []).map((a, i) => `
    <article class="ability reveal">
      <span class="ability-no">0${i + 1}</span>
      <h3>${esc(a.t)}</h3>
      <p>${esc(a.d)}</p>
    </article>`).join('');

  const factsHtml = facts.map((f) => `
    <div class="fact"><dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd></div>`).join('');

  const skills = (about.skills || []).map((s) => `
    <span class="skill${s.hot ? ' hot' : ''}">${esc(s.n)}</span>`).join('');

  const future = (about.future || []).map((f) => `
    <div class="future-item"><h3>${esc(f.t)}</h3><p>${esc(f.d)}</p></div>`).join('');

  const contacts = (home.contacts || []).map((c) => {
    const label = `<span class="skill">${esc(c.label)} · ${esc(c.value)}</span>`;
    return c.url ? `<a href="${safeUrl(c.url)}" style="text-decoration:none">${label}</a>` : label;
  }).join('');

  return `
  <section class="hero wrap">
    <div class="hero-copy">
      <div class="eyebrow">
        <span class="eyebrow-index">00</span>
        <span class="eyebrow-text">${esc(hero.eyebrow || state.data.site.tagline)}</span>
        <span class="live"><i></i>LIVE&nbsp;/&nbsp;2026</span>
      </div>
      <h1 class="hero-title">${titleHtml}</h1>
      <p class="hero-intro">${esc(hero.intro || '')}</p>
      <div class="hero-actions">
        ${hero.primary ? `<a class="btn btn--solid" href="${safeUrl(hero.primary.href)}">${esc(hero.primary.label)} <span class="arrow">→</span></a>` : ''}
        ${hero.secondary ? `<a class="btn" href="${safeUrl(hero.secondary.href)}">${esc(hero.secondary.label)} <span class="arrow">↗</span></a>` : ''}
      </div>
      <div class="hero-meta">
        ${loc ? `<span><i></i>${esc(loc.v)}</span>` : ''}
        ${dir ? `<span><i></i>${esc(dir.v)}</span>` : ''}
        <span><i></i>Open to internship</span>
      </div>
      <div class="hero-terminal" aria-hidden="true">
        <div class="terminal-head"><span>PROFILE.LOG</span><span>REV&nbsp;2026.11</span></div>
        <div class="terminal-line"><span class="prompt">~/sunzhihao</span><span class="cmd">$</span><span>build --focus embedded, ai, interface</span><span class="caret"></span></div>
      </div>
    </div>
    <aside class="hero-console" aria-label="个人档案终端">
      <div class="console-head">
        <span>PROFILE&nbsp;/&nbsp;001</span>
        <span class="console-status"><i></i>ONLINE</span>
      </div>
      <div class="portrait-stage">
        <span class="hero-orbit" aria-hidden="true"></span>
        <figure class="hero-figure">
          <div class="portrait-frame"><img src="${safeUrl(state.data.site.avatar)}" alt="孙志昊" fetchpriority="high" decoding="async"></div>
          <figcaption><span>PORTRAIT&nbsp;/&nbsp;2026</span><span>DONGYING</span></figcaption>
        </figure>
      </div>
      <div class="console-readout">
        <div><span>SIGNAL</span><b class="signal">98.4</b></div>
        <div><span>FOCUS</span><b>${esc(focus)}</b></div>
        <div><span>LOCAL</span><b class="mono" id="localTime">--:--:--</b></div>
      </div>
    </aside>
  </section>

  ${renderTicker()}
  ${renderStats()}
  ${renderNotice()}

  <section class="section" id="about">
    <div class="wrap">
      <div class="section-head">
        <span class="section-no">01 / ABOUT</span>
        <div>
          <h2 class="section-title">${esc(about.title || '关于我')}</h2>
          <p class="section-lead">${esc(about.lead || '')}</p>
        </div>
      </div>
      <div class="about-grid">
        <div class="prose reveal">
          ${(about.lines || []).map((l) => `<p>${esc(l)}</p>`).join('')}
          <p class="sub-title">个人理念</p>
          <div class="belief">
            ${((about.belief && about.belief.lines) || []).map((l) => `<p>${esc(l)}</p>`).join('')}
            ${about.belief && about.belief.quote ? `<blockquote class="quote">${esc(about.belief.quote)}</blockquote>` : ''}
          </div>
          <p class="sub-title">未来方向</p>
          <div class="future">${future}</div>
        </div>
        <aside class="about-side reveal">
          <div class="side-panel">
            <div class="panel-head"><span>SPEC&nbsp;/&nbsp;PROFILE</span><span>001</span></div>
            <div class="facts">${factsHtml}</div>
          </div>
          <p class="sub-title">技术能力 <span>/ CAPABILITIES</span></p>
          <div class="abilities">${abilities}</div>
          <p class="sub-title">技能栈 <span>/ STACK</span></p>
          <div class="skills">${skills}</div>
          <p class="sub-title">联系 <span>/ CONTACT</span></p>
          <div class="skills">${contacts}</div>
        </aside>
      </div>
    </div>
  </section>`;
}

/* ---------------- 视图：项目 ---------------- */
function renderWork() {
  const work = state.data.work;
  const cases = work.cases || [];
  const cats = ['all', 'project', 'internship', 'campus', 'hobby'];
  const filters = cats.map((c) => {
    const label = c === 'all' ? '全部' : CAT_LABEL[c];
    return `<button type="button" class="filter${state.filter === c ? ' is-active' : ''}" data-filter="${c}">${label}</button>`;
  }).join('');

  const visible = cases.filter((c) => state.filter === 'all' || c.category === state.filter);
  const cards = visible.map((c) => `
    <a class="case-card reveal" href="#/work/${esc(c.id)}">
      <div class="case-top">
        <span>${esc(c.number || '')}</span>
        <span class="case-cat">${esc(CAT_LABEL[c.category] || c.category || '')}</span>
      </div>
      <h3 class="case-title">${esc(c.title)}</h3>
      <p class="case-summary">${esc(c.summary)}</p>
      <div class="case-tags">${(c.tags || []).slice(0, 4).map((t) => `<span class="case-tag">${esc(t)}</span>`).join('')}</div>
      <span class="case-arrow">↗</span>
    </a>`).join('');

  return `
  <section class="detail wrap" style="padding-bottom:0">
    <div class="section-head" style="margin-bottom:26px">
      <span class="section-no">02 / WORK</span>
      <div>
        <h1 class="section-title">${esc(work.title || '项目与经历')}</h1>
        <p class="section-lead">${esc(work.intro || '')}</p>
      </div>
    </div>
    <div class="work-meta">
      <span><strong>DATABASE&nbsp;/&nbsp;WORK</strong></span>
      <span id="workCount">${cases.length} RECORDS</span>
      <span class="meta-right" id="workFilterLabel">FILTER&nbsp;/&nbsp;ALL</span>
    </div>
    <div class="filters" id="filters">${filters}</div>
    <div class="case-grid" id="caseGrid">${cards || '<p class="case-empty">这个分类下还没有内容。</p>'}</div>
  </section>`;
}

function bindWorkFilters() {
  const box = $('#filters');
  if (!box) return;
  box.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    state.filter = btn.dataset.filter;
    $$('.filter', box).forEach((b) => b.classList.toggle('is-active', b === btn));
    const work = state.data.work;
    const cases = (work.cases || []).filter((c) => state.filter === 'all' || c.category === state.filter);
    $('#caseGrid').innerHTML = cases.map((c) => `
      <a class="case-card reveal" href="#/work/${esc(c.id)}">
        <div class="case-top"><span>${esc(c.number || '')}</span><span class="case-cat">${esc(CAT_LABEL[c.category] || '')}</span></div>
        <h3 class="case-title">${esc(c.title)}</h3>
        <p class="case-summary">${esc(c.summary)}</p>
        <div class="case-tags">${(c.tags || []).slice(0, 4).map((t) => `<span class="case-tag">${esc(t)}</span>`).join('')}</div>
        <span class="case-arrow">↗</span>
      </a>`).join('') || '<p class="case-empty">这个分类下还没有内容。</p>';
    const count = $('#workCount');
    if (count) count.textContent = `${cases.length} RECORDS`;
    const label = $('#workFilterLabel');
    if (label) label.textContent = `FILTER / ${state.filter === 'all' ? 'ALL' : String(state.filter).toUpperCase()}`;
    revealIn();
  });
}

function renderCase(id) {
  const c = (state.data.work.cases || []).find((x) => x.id === id);
  if (!c) return `<section class="detail wrap"><a class="back" href="#/work">← 返回项目</a><h1 class="detail-title">内容不存在</h1></section>`;

  const sections = (c.sections || []).map((s) => `<h3>${esc(s.h)}</h3><p>${esc(s.p)}</p>`).join('');
  const images = (c.images || []).map((src) => `<img src="${safeUrl(src)}" alt="${esc(c.title)}" loading="lazy" decoding="async">`).join('');
  const tags = (c.tags || []).map((t) => `<span class="skill">${esc(t)}</span>`).join('');
  const links = (c.links || []).map((l) => `<a class="btn" href="${safeUrl(l.url)}" target="_blank" rel="noopener">${esc(l.text)} <span class="arrow">↗</span></a>`).join('');

  return `
  <section class="detail wrap">
    <a class="back" href="#/work">← 返回项目</a>
    <div class="detail-kicker">${esc(CAT_LABEL[c.category] || '')} · ${esc(c.number || '')}</div>
    <h1 class="detail-title">${esc(c.title)}</h1>
    <p class="detail-summary">${esc(c.summary)}</p>
    <dl class="detail-meta">
      <div><dt>归属</dt><dd>${esc(c.org || '—')}</dd></div>
      <div><dt>时间</dt><dd>${esc(c.period || '—')}</dd></div>
      <div><dt>角色</dt><dd>${esc(c.role || '—')}</dd></div>
      <div><dt>分类</dt><dd>${esc(CAT_LABEL[c.category] || '—')}</dd></div>
    </dl>
    <div class="detail-body">
      <div class="detail-sections">${sections || '<p>暂无详情。</p>'}</div>
      <aside class="detail-side">
        <div class="panel-head"><span>ASSET&nbsp;/&nbsp;${esc(c.number || 'LOG')}</span><span>${esc(CAT_LABEL[c.category] || 'CASE')}</span></div>
        ${images ? `<div class="detail-images">${images}</div>` : ''}
        ${tags ? `<div class="detail-tags">${tags}</div>` : ''}
        ${c.result ? `<div class="detail-result">${esc(c.result)}</div>` : ''}
        ${links ? `<div class="detail-links">${links}</div>` : ''}
      </aside>
    </div>
  </section>`;
}

/* ---------------- 视图：工具 ---------------- */
function toolModules() {
  return byOrder(state.data.tools.items || []).filter((t) => t.enabled !== false);
}

function renderTools() {
  const tools = state.data.tools;
  const list = toolModules();
  const cards = list.map((t) => `
    <a class="tool-card reveal" href="#/tools/${esc(t.id)}">
      <span class="tool-icon">${esc(t.icon || '↗')}</span>
      <span class="tool-body">
        <span class="tool-cat">${esc(TOOL_CAT[t.category] || t.category || '工具')}</span>
        <h3 class="tool-name">${esc(t.name)}</h3>
        <p class="tool-desc">${esc(t.desc)}</p>
      </span>
      <span class="tool-go">打开 →</span>
    </a>`).join('');

  return `
  <section class="detail wrap" style="padding-bottom:0">
    <div class="section-head" style="margin-bottom:26px">
      <span class="section-no">03 / TOOLS</span>
      <div>
        <h1 class="section-title">${esc(tools.title || '在线工具')}</h1>
        <p class="section-lead">${esc(tools.intro || '')}</p>
      </div>
    </div>
    <div class="work-meta">
      <span><strong>MODULE&nbsp;/&nbsp;TOOLS</strong></span>
      <span>${list.length} ACTIVE</span>
      <span class="meta-right">LOCAL-FIRST</span>
    </div>
    <div class="tool-grid">${cards || '<p class="case-empty">工具正在整理。</p>'}</div>
    <p class="hint" style="margin-top:22px">所有计算都在本地浏览器完成，不上传任何内容。</p>
  </section>`;
}

async function renderTool(id) {
  const item = toolModules().find((t) => t.id === id);
  if (!item) {
    return `<section class="detail wrap"><a class="back" href="#/tools">← 返回工具</a><h1 class="detail-title">工具不存在或已关闭</h1></section>`;
  }

  const head = `
  <section class="tool-page wrap">
    <a class="back" href="#/tools">← 返回工具</a>
    <header class="tool-header">
      <span class="tool-icon">${esc(item.icon || '↗')}</span>
      <div><h1>${esc(item.name)}</h1><p>${esc(item.desc)}</p></div>
    </header>
    <div class="tool-panel" id="toolPanel"><p class="tool-loading">模块加载中…</p></div>
  </section>`;

  // 延后加载模块，先返回骨架
  setTimeout(async () => {
    const panel = $('#toolPanel');
    if (!panel) return;
    try {
      const stamp = Date.now();
      const mod = await import(`/tools/${item.module}?v=${stamp}`);
      if (typeof mod.render !== 'function') throw new Error('模块缺少 render 函数');
      panel.innerHTML = '';
      await mod.render(panel, { toast, item });
    } catch (err) {
      panel.innerHTML = `<p class="tool-error">工具加载失败：${esc(err.message)}</p>`;
    }
  }, 0);

  return head;
}

/* ---------------- 页脚 ---------------- */
function renderFoot() {
  const contacts = state.data.home.contacts || [];
  const email = contacts.find((c) => (c.label || '').includes('邮箱'));
  const links = contacts.filter((c) => c.url).map((c) => `<a href="${safeUrl(c.url)}" ${String(c.url).startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${esc(c.label)} ↗</a>`).join('');
  const adminLink = state.source === 'api' ? '<a href="/admin">后台管理</a>' : '';
  return `<div class="wrap">
    <div class="foot-kicker"><span>04 / CONTACT</span><span>RESPONSE &lt; 24H</span></div>
    <div class="foot-top">
      <div>
        <h2 class="foot-title">有想法，<br>随时<em>聊。</em></h2>
        ${email ? `<a class="foot-mail" href="${safeUrl(email.url || 'mailto:' + email.value)}">${esc(email.value)}</a>` : ''}
      </div>
      <div class="foot-links">
        ${links}
        ${adminLink}
        <a href="/classic/">经典版 ↗</a>
        <a href="#/">回到顶部 ↑</a>
      </div>
    </div>
    <div class="foot-bottom">
      <span>${esc(state.data.site.footer || '')}</span>
      <span>VANILLA&nbsp;JS&nbsp;/&nbsp;SIGNAL&nbsp;UI</span>
    </div>
  </div>`;
}

/* ---------------- 路由 ---------------- */
function parseRoute() {
  const raw = (location.hash || '#/').replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean);
  if (!parts.length) return { name: 'home', id: null };
  if (parts[0] === 'work') return { name: 'work', id: parts[1] || null };
  if (parts[0] === 'tools') return { name: 'tools', id: parts[1] || null };
  return { name: 'home', id: null };
}

function revealIn() {
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  els.forEach((el) => io.observe(el));
}

function renderClosedBranch(branch) {
  return `<section class="detail wrap">
    <p class="detail-eyebrow">BRANCH CLOSED</p>
    <h1 class="detail-title">${esc(branch.label || '这个分支')}暂时关闭</h1>
    <p class="detail-summary">该分支已在后台隐藏。你仍然可以从底部入口进入经典版，或在后台重新启用它。</p>
    <div class="detail-actions"><a class="btn btn--solid" href="#/">回到主页 <span class="arrow">→</span></a></div>
  </section>`;
}

async function render(scrollTop = false) {
  state.route = parseRoute();
  const view = $('#view');
  document.title = `${state.data.site.brand || '孙志昊'} · ${state.route.name === 'tools' ? '工具' : state.route.name === 'work' ? '项目' : '主页'}`;

  const branch = (state.data.branches || []).find((b) => b.id === state.route.name);
  let html = '';
  if (branch && branch.visible === false) html = renderClosedBranch(branch);
  else if (state.route.name === 'work' && state.route.id) html = renderCase(state.route.id);
  else if (state.route.name === 'work') html = renderWork();
  else if (state.route.name === 'tools' && state.route.id) html = await renderTool(state.route.id);
  else if (state.route.name === 'tools') html = renderTools();
  else html = renderHome();

  view.innerHTML = html;
  updateNavActive();
  if (state.route.name === 'work' && !state.route.id) bindWorkFilters();
  revealIn();

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && view.animate) {
    view.animate(
      [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
      { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' }
    );
  }
  if (scrollTop) window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  else if (state.route.name === 'work' || state.route.name === 'tools') window.scrollTo({ top: 0, behavior: 'auto' });
}

/* ---------------- 初始化 ---------------- */
async function boot() {
  applyTheme(currentTheme());
  updateClock();
  setInterval(updateClock, 1000);
  updateScrollProgress();
  bindPointerGlow();

  $('#themeBtn')?.addEventListener('click', () => {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });

  $('#menuBtn')?.addEventListener('click', () => {
    const nav = $('#nav');
    const open = nav.classList.toggle('is-open');
    $('#menuBtn').setAttribute('aria-expanded', String(open));
  });
  $('#nav')?.addEventListener('click', () => {
    $('#nav').classList.remove('is-open');
    $('#menuBtn')?.setAttribute('aria-expanded', 'false');
  });

  try {
    state.data = await loadData();
  } catch (err) {
    $('#view').innerHTML = `<section class="detail wrap"><h1 class="detail-title">站点数据加载失败</h1><p class="detail-summary">${esc(err.message)}。请确认服务已启动，或检查 /data/site.json 是否存在。</p></section>`;
    return;
  }

  renderNav();
  $('#foot').innerHTML = renderFoot();
  await render();

  window.addEventListener('hashchange', () => render(true));
  window.addEventListener('scroll', () => {
    $('#topbar')?.classList.toggle('is-scrolled', window.scrollY > 8);
    updateScrollProgress();
  }, { passive: true });
  window.addEventListener('resize', updateScrollProgress, { passive: true });
  updateScrollProgress();

  // 实时刷新：后台保存后自动更新页面；静态导出环境没有 SSE，跳过
  if (state.source === 'api') {
    try {
      const es = new EventSource('/api/events');
      let timer = null;
      es.addEventListener('content', () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          try {
            state.data = await loadData();
            renderNav();
            $('#foot').innerHTML = renderFoot();
            await render(false);
            toast('内容已更新');
          } catch (err) { /* ignore */ }
        }, 500);
      });
      es.addEventListener('error', () => { /* 静态环境会反复失败，不提示 */ });
    } catch (err) { /* EventSource 不可用 */ }
  }
}

boot();
