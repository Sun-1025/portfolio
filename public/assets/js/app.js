import { initAiDock } from './ai-dock.js';

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

const LOCK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4.2" y="10.2" width="15.6" height="10.6" rx="2.8" fill="none" stroke="currentColor" stroke-width="1.6"></rect><path d="M8 10.2V7.2a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.6"></path><circle cx="12" cy="15.5" r="1.2" fill="currentColor"></circle></svg>';

function lockCard(label = '暂时保密') {
  return `<div class="lock-card"><span class="lock-card-icon">${LOCK_SVG}</span><span class="lock-card-copy"><strong>${esc(label)}</strong></span></div>`;
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
    btn.dataset.mode = theme;
    btn.setAttribute('aria-label', theme === 'dark' ? '切换到浅色' : '切换到深色');
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#070908' : '#f1f0e7');
}

/* ---------------- 数据 ---------------- */
async function loadData() {
  // 静态导出页会带 data-static="1"，直接读 data/site.json，避免无意义的 /api 404。
  if (document.documentElement.dataset.static !== '1') {
    try {
      const res = await fetch('/api/content', { cache: 'no-store' });
      if (res.ok && (res.headers.get('content-type') || '').includes('json')) {
        state.source = 'api';
        return await res.json();
      }
    } catch (err) { /* 静态环境没有 API，继续回退 */ }
  }
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

function projectCover(c) {
  if (c.cover) {
    return `<img src="${safeUrl(c.cover)}" alt="${esc(c.title)} 项目封面" loading="lazy" decoding="async">`;
  }
  return `<div class="cover-fallback"><span>${esc(c.number || '')}</span><b>${esc((CAT_LABEL[c.category] || 'CASE').slice(0, 1))}</b></div>`;
}

function renderHome() {
  const home = state.data.home;
  const hero = home.hero || {};
  const about = home.about || {};
  const facts = about.facts || [];
  const loc = facts.find((f) => f.k === '所在地');
  const dir = facts.find((f) => f.k === '主攻方向');
  const focus = dir ? String(dir.v || '').split(/[、/]/)[0].trim() : 'EMBEDDED';
  const cases = (state.data.work && state.data.work.cases) || [];

  const titleHtml = String(hero.title || '').split('\n').map((line) =>
    `<span class="hero-line">${esc(line).replace('能跑', '<em>能跑</em>')}</span>`
  ).join('');
  const heroIntro = String(hero.intro || '').trim();

  const factsHtml = facts.map((f) => `
    <div class="fact"><dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd></div>`).join('');

  const skills = (about.skills || []).map((s) => `
    <span class="skill${s.hot ? ' hot' : ''}">${esc(s.n)}</span>`).join('');

  const future = (about.future || []).map((f) => `
    <div class="future-item"><h3>${esc(f.t)}</h3><p>${esc(f.d)}</p></div>`).join('');

  const contacts = (home.contacts || []).map((c) => {
    const label = `<span class="skill">${esc(c.label)} · ${esc(c.value)}</span>`;
    return c.url ? `<a href="${safeUrl(c.url)}" class="skill-link">${label}</a>` : label;
  }).join('');

  const abilities = (about.abilities || []).map((a, i) => `
    <details class="ability-fold">
      <summary><span class="ability-no">0${i + 1}</span><span>${esc(a.t)}</span><b>+</b></summary>
      <p>${esc(a.d)}</p>
    </details>`).join('');

  const selected = (home.selectedIds || [])
    .map((id) => cases.find((c) => c.id === id))
    .filter(Boolean);
  const projectRows = selected.map((c, i) => `
    <a class="project-row reveal" href="#/work/${esc(c.id)}">
      <div class="project-media">
        ${projectCover(c)}
        <span class="project-no">${String(i + 1).padStart(2, '0')}</span>
      </div>
      <div class="project-copy">
        <span class="project-meta">${esc(CAT_LABEL[c.category] || c.category || '项目')} / ${esc(c.period || '')}</span>
        <h3 class="project-title">${esc(c.title)}</h3>
        <p class="project-summary">${esc(c.summary)}</p>
        <div class="case-tags">${(c.tags || []).slice(0, 4).map((t) => `<span class="case-tag">${esc(t)}</span>`).join('')}</div>
      </div>
      <span class="project-arrow" aria-hidden="true">↗</span>
    </a>`).join('');

  const practiceRows = (home.practice || []).map((p, i) => `
    <article class="practice-item reveal">
      <div class="practice-meta"><span>P.0${i + 1}</span><span>${esc(p.period || '')}</span></div>
      <h3>${esc(p.label || '')}</h3>
      <p class="practice-org">${esc(p.org || '')}</p>
      <p class="practice-summary">${esc(p.summary || '')}</p>
      <span class="practice-role">${esc(p.role || '')}</span>
    </article>`).join('');

  const hobbyRows = (home.hobbies || []).map((h) => `
    <article class="hobby-row reveal">
      <span class="hobby-no">${esc(h.no || '')}</span>
      <div class="hobby-copy">
        <div class="hobby-head"><h3>${esc(h.title || '')}</h3><span>${h.locked ? '' : esc(h.meta || '')}</span></div>
        ${h.locked ? `<div class="hobby-locked">${LOCK_SVG}<span>暂时保密</span></div>` : `<p>${esc(h.text || '')}</p>`}
      </div>
    </article>`).join('');

  const principles = (home.principles || []).map((p, i) => `
    <div class="principle-item">
      <span class="principle-no">0${i + 1} / ${esc(p.label || '')}</span>
      <h3>${esc(p.title || '')}</h3>
      <p>${esc(p.text || '')}</p>
    </div>`).join('');

  const lines = about.lines || [];
  const shownLines = lines.slice(0, 4);
  const restLines = lines.slice(4);

  return `
  <section class="hero wrap">
    <div class="hero-copy">
      <div class="eyebrow">
        <span class="eyebrow-index">SZH / 001</span>
        <span class="eyebrow-text">${esc(hero.eyebrow || state.data.site.tagline)}</span>
        <span class="live"><i></i>OPEN&nbsp;TO&nbsp;INTERNSHIP</span>
      </div>
      <h1 class="hero-title">${titleHtml}</h1>
      ${heroIntro ? `<p class="hero-intro">${esc(heroIntro)}</p>` : ''}
      <div class="hero-actions">
        ${hero.primary ? `<a class="btn btn--solid" href="${safeUrl(hero.primary.href)}">${esc(hero.primary.label)} <span class="arrow">→</span></a>` : ''}
        ${hero.secondary ? `<a class="btn" href="${safeUrl(hero.secondary.href)}">${esc(hero.secondary.label)} <span class="arrow">↗</span></a>` : ''}
      </div>
      <div class="hero-meta">
        ${loc ? `<span><i></i>${esc(loc.v)}</span>` : ''}
        ${dir ? `<span><i></i>${esc(dir.v)}</span>` : ''}
        <span><i></i>2025 级 · 大二</span>
      </div>
      <div class="hero-terminal" aria-hidden="true">
        <div class="terminal-head"><span>PROFILE.LOG</span><span>REV&nbsp;2026.11</span></div>
        <div class="terminal-line"><span class="prompt">~/sunzhihao</span><span class="cmd">$</span><span>build --focus embedded, iot, ai</span><span class="caret"></span></div>
        <div class="terminal-line terminal-line--muted"><span class="prompt">output</span><span class="cmd">›</span><span>3 projects / 99 routes / open to internship</span></div>
      </div>
    </div>
    <aside class="hero-console" aria-label="个人档案与信号核心">
      <div class="console-head">
        <span>SIGNAL&nbsp;/&nbsp;CORE</span>
        <span class="console-status"><i></i>ONLINE</span>
      </div>
      <div class="signal-stage">
        <img class="signal-core" src="${safeUrl(hero.visual || '/assets/signal-core.webp')}" alt="磨砂玻璃信号核心视觉" fetchpriority="high" decoding="async">
        <span class="signal-scan" aria-hidden="true"></span>
        <span class="signal-corner signal-corner--tl" aria-hidden="true"></span>
        <span class="signal-corner signal-corner--br" aria-hidden="true"></span>
        <div class="signal-caption"><span>SZH&nbsp;/&nbsp;001</span><span>EMBEDDED&nbsp;·&nbsp;IOT</span></div>
      </div>
      <div class="console-readout">
        <div><span>BUILD</span><b class="mono">2026.11</b></div>
        <div><span>FOCUS</span><b>${esc(focus)} / 端侧</b></div>
        <div><span>LOCAL</span><b class="mono" id="localTime">--:--:--</b></div>
      </div>
    </aside>
  </section>

  ${renderStats()}

  <section class="section section--work" id="work">
    <div class="wrap">
      <div class="section-head">
        <span class="section-no">02 / SELECTED WORK</span>
        <div>
          <h2 class="section-title">三个做过的项目</h2>
          <p class="section-lead">先挑三件能说清楚的事：一个从声音到告警的链路，一套自己写完的图书系统，一门给小学生上的物理课。</p>
        </div>
      </div>
      <div class="project-index">${projectRows}</div>
      <div class="section-foot">
        <a class="text-link" href="#/work">查看全部项目 <span>↗</span></a>
      </div>
    </div>
  </section>

  <section class="section section--practice" id="practice">
    <div class="wrap">
      <div class="section-head">
        <span class="section-no">03 / FIELD NOTES</span>
        <div>
          <h2 class="section-title">实践记录</h2>
          <p class="section-lead">校内预备实习、独立开发和图书馆公益课。不是头衔清单，是三种把方案落到地上的方式。</p>
        </div>
      </div>
      <div class="practice-layout">
        <div class="practice-list">${practiceRows}</div>
        <aside class="practice-note">
          <span class="mini-label">WORKING PRINCIPLE</span>
          <h3>先交付一个能验证的版本，再谈把它做漂亮。</h3>
          <p>项目申报、系统开发和公益课都按这个顺序走。能跑、能讲、能被别人复核，才算往前走了一步。</p>
          <a class="text-link" href="#/work/case-physics">看公益课记录 <span>↗</span></a>
        </aside>
      </div>
    </div>
  </section>

  <section class="section" id="about">
    <div class="wrap">
      <div class="section-head">
        <span class="section-no">04 / ABOUT</span>
        <div>
          <h2 class="section-title">${esc(about.title || '关于我')}</h2>
          <p class="section-lead">${esc(about.lead || '')}</p>
        </div>
      </div>
      <div class="about-grid">
        <div class="about-main">
          <div class="prose reveal">
            ${shownLines.map((l) => `<p>${esc(l)}</p>`).join('')}
          </div>
          ${restLines.length ? `<details class="about-archive">
            <summary>展开完整自述 <span>${restLines.length} 段</span><b>+</b></summary>
            <div class="prose prose--archive">${restLines.map((l) => `<p>${esc(l)}</p>`).join('')}</div>
          </details>` : ''}
          <div class="belief-block reveal">
            <span class="mini-label">PERSONAL CREED</span>
            ${about.belief && about.belief.quote ? `<blockquote class="quote">${esc(about.belief.quote)}</blockquote>` : ''}
          </div>
          ${future ? `<details class="about-archive">
            <summary>未来方向 <span>3 个阶段</span><b>+</b></summary>
            <div class="future">${future}</div>
          </details>` : ''}
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
          <p class="contact-note">GitHub、Gitee 仓库开 Issue 也能联系。</p>
        </aside>
      </div>
    </div>
  </section>

  <section class="section section--offclock" id="offclock">
    <div class="wrap">
      <div class="section-head">
        <span class="section-no">05 / OFF CLOCK</span>
        <div>
          <h2 class="section-title">离开工位以后</h2>
          <p class="section-lead">骑车、打球、玩游戏、记账。做事的方法也藏在这些习惯里。</p>
        </div>
      </div>
      <div class="offclock-layout">
        <div class="hobby-list">${hobbyRows}</div>
        <aside class="principles-panel">
          <span class="mini-label">WORKING NOTES</span>
          ${principles}
        </aside>
      </div>
    </div>
  </section>`;
}

/* ---------------- 视图：项目 ---------------- */
function caseCardHtml(c, index = 0) {
  const locked = Boolean(c.locked);
  return `
    <a class="case-card${index === 0 ? ' case-card--wide' : ''}${locked ? ' case-card--locked' : ''} reveal" href="#/work/${esc(c.id)}">
      <div class="case-cover">${projectCover(c)}</div>
      <div class="case-content">
        <div class="case-top">
          <span>${esc(c.number || '')}</span>
          <span class="case-cat">${esc(CAT_LABEL[c.category] || c.category || '')}</span>
        </div>
        <h3 class="case-title">${esc(c.title)}</h3>
        ${locked
          ? `<div class="case-locked">${LOCK_SVG}<span>暂时保密</span></div>`
          : `<p class="case-summary">${esc(c.summary)}</p><div class="case-tags">${(c.tags || []).slice(0, 4).map((t) => `<span class="case-tag">${esc(t)}</span>`).join('')}</div>`}
        <span class="case-arrow" aria-hidden="true">↗</span>
      </div>
    </a>`;
}

function renderWork() {
  const work = state.data.work;
  const cases = work.cases || [];
  const cats = ['all', 'project', 'internship', 'campus', 'hobby'];
  const filters = cats.map((c) => {
    const label = c === 'all' ? '全部' : CAT_LABEL[c];
    return `<button type="button" class="filter${state.filter === c ? ' is-active' : ''}" data-filter="${c}">${label}</button>`;
  }).join('');

  const visible = cases.filter((c) => state.filter === 'all' || c.category === state.filter);
  const cards = visible.map((c, i) => caseCardHtml(c, i)).join('');

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
    $('#caseGrid').innerHTML = cases.map((c, i) => caseCardHtml(c, i)).join('') || '<p class="case-empty">这个分类下还没有内容。</p>';
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

  if (c.locked) {
    return `
    <section class="detail wrap">
      <a class="back" href="#/work">← 返回项目</a>
      <div class="detail-kicker">${esc(CAT_LABEL[c.category] || 'CASE')} · ${esc(c.number || '')}</div>
      <h1 class="detail-title">${esc(c.title)}</h1>
      ${lockCard('暂时保密')}
    </section>`;
  }

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
    ${c.cover ? `<figure class="detail-cover"><img src="${safeUrl(c.cover)}" alt="${esc(c.title)} 项目封面" fetchpriority="high" decoding="async"><span>${esc(CAT_LABEL[c.category] || 'CASE')} / ${esc(c.number || '')}</span></figure>` : ''}
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
  const featured = list.find((t) => t.featured || t.id === 'converter');
  const utilities = list.filter((t) => t !== featured);
  const cards = utilities.map((t) => `
    <a class="tool-card reveal" href="#/tools/${esc(t.id)}">
      <span class="tool-icon">${esc(t.icon || '↗')}</span>
      <span class="tool-body">
        <span class="tool-cat">${esc(TOOL_CAT[t.category] || t.category || '工具')}</span>
        <h3 class="tool-name">${esc(t.name)}</h3>
        <p class="tool-desc">${esc(t.desc)}</p>
      </span>
      <span class="tool-go">打开 →</span>
    </a>`).join('');

  setTimeout(async () => {
    const host = $('#converterApp');
    if (!host || !featured) return;
    try {
      const mod = await import(`/tools/${featured.module}?v=${Date.now()}`);
      if (typeof mod.render !== 'function') throw new Error('转换台模块缺少 render 函数');
      host.innerHTML = '';
      await mod.render(host, { toast });
    } catch (err) {
      host.innerHTML = `<p class="tool-error">转换台加载失败：${esc(err.message)}</p>`;
    }
  }, 0);

  return `
  <section class="detail wrap tools-page">
    <div class="section-head" style="margin-bottom:22px">
      <span class="section-no">03 / TOOLS</span>
      <div>
        <h1 class="section-title">${esc(tools.title || '文件转换台')}</h1>
        <p class="section-lead">${esc(tools.intro || '')}</p>
      </div>
    </div>
    <div class="tools-status-strip">
      <span class="tools-status-live"><i></i>LOCAL ENGINE / READY</span>
      <span><b>${Number(tools.routes) || 99}</b> REAL ROUTES</span>
      <span><b>${list.length}</b> ACTIVE MODULES</span>
      <span class="tools-status-right">NO SERVER / NO UPLOAD</span>
    </div>
    <div class="converter-mount" id="converterApp"><p class="tool-loading">转换台初始化中…</p></div>

    <div class="section-head" style="margin:54px 0 18px">
      <span class="section-no">03.1 / UTILITIES</span>
      <div>
        <h2 class="section-title" style="font-size:clamp(30px,4vw,46px)">常用小工具</h2>
        <p class="section-lead">转换台之外，保留原来的四个轻量工具。它们同样是本地计算。</p>
      </div>
    </div>
    <div class="tool-grid">${cards || '<p class="case-empty">工具正在整理。</p>'}</div>
    <p class="hint" style="margin-top:22px">当前开放：图片、数据、文档、音频、PDF、Office、电子书与 3D 几何转换。视频转码与扫描件 OCR 暂不开放；不会伪造转换成功。</p>
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
  const contactItems = contacts.map((c) => {
    const inner = `<span class="foot-contact-label">${esc(c.label)}</span><span class="foot-contact-value">${esc(c.value)}</span>`;
    if (c.url) {
      return `<a class="foot-contact-item" href="${safeUrl(c.url)}" ${String(c.url).startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${inner}<span class="foot-contact-arrow">↗</span></a>`;
    }
    return `<span class="foot-contact-item">${inner}</span>`;
  }).join('');
  const adminLink = state.source === 'api' ? '<a href="/admin">后台管理</a>' : '';
  return `<div class="wrap">
    <div class="foot-kicker"><span>06 / CONTACT</span><span class="foot-status"><i></i>OPEN TO INTERNSHIP</span></div>
    <div class="foot-top">
      <div>
        <h2 class="foot-title">有想法，<br>随时<em>聊。</em></h2>
        ${email ? `<a class="foot-mail" href="${safeUrl(email.url || 'mailto:' + email.value)}">${esc(email.value)}</a>` : ''}
      </div>
      <div class="foot-contact-list">
        ${contactItems}
        <p class="foot-issue">邮件通常回得最快。GitHub、Gitee 仓库开 Issue 也能联系。</p>
      </div>
    </div>
    <section class="foot-guest" id="guestbook" aria-labelledby="guestbookTitle">
      <div class="foot-guest-head">
        <div>
          <span class="mini-label">GUESTBOOK / ANON</span>
          <h3 id="guestbookTitle">留一句，匿名也行。</h3>
          <p id="guestMode">不用登录。留个昵称，把想说的话写下来。</p>
        </div>
        <span class="foot-guest-count" id="guestCount" hidden></span>
      </div>
      <form class="guest-form" id="guestForm" novalidate>
        <div class="guest-field guest-field--name">
          <label for="guestName">昵称</label>
          <input id="guestName" name="nickname" maxlength="20" autocomplete="nickname" placeholder="随便取一个" required>
        </div>
        <div class="guest-field guest-field--text">
          <label for="guestText">留言</label>
          <textarea id="guestText" name="text" maxlength="500" rows="4" placeholder="想说的话，最多 500 字。" required></textarea>
        </div>
        <div class="guest-honeypot" aria-hidden="true">
          <label>网站<input name="website" tabindex="-1" autocomplete="off"></label>
        </div>
        <div class="guest-actions">
          <span class="guest-hint" id="guestHint">留个昵称就能写，不需要登录。</span>
          <button type="submit" class="btn btn--solid" id="guestSubmit">发送留言 <span class="arrow">→</span></button>
        </div>
      </form>
      <div class="guest-list" id="guestList" hidden></div>
    </section>
    <div class="foot-links foot-links--meta">
      ${adminLink}
      <a href="/classic/">经典版 ↗</a>
      <a href="#/">回到顶部 ↑</a>
    </div>
    <div class="foot-bottom">
      <span>${esc(state.data.site.footer || '')}</span>
      <span>BUILD&nbsp;4.0&nbsp;/&nbsp;2026.11</span>
    </div>
  </div>`;
}

/* ---------------- 页脚留言 ---------------- */
function guestbookEndpoint() {
  const configured = String(window.SZH_GUESTBOOK_ENDPOINT || '').trim();
  if (configured) return configured.replace(/\/+$/, '');
  return state.source === 'api' ? '/api/guestbook' : '';
}

function guestbookEmail() {
  const contact = (state.data.home.contacts || []).find((c) => (c.label || '').includes('邮箱'));
  return (contact && contact.value) || '1322816531@qq.com';
}

function guestTime(iso) {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(new Date(iso));
  } catch (err) {
    return '';
  }
}

function guestMessageHtml(item) {
  return `<article class="guest-item"><div class="guest-item-head"><strong>${esc(item.nickname || '匿名')}</strong><time>${esc(guestTime(item.at))}</time></div><p>${esc(item.text || '')}</p></article>`;
}

function guestMailto(nickname, text, hint) {
  const email = guestbookEmail();
  const subject = `网站留言 · ${nickname}`;
  const body = `昵称：${nickname}\n\n${text}\n\n（来自 sunzhihaoai.top 留言框）`;
  const href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = href;
  if (hint) hint.textContent = `已打开邮件应用。如果没有反应，复制这段内容发到 ${email}。`;
  toast('已打开邮件应用');
}

async function refreshGuestbook(list, count, hint) {
  const endpoint = guestbookEndpoint();
  if (!endpoint) return;
  try {
    const res = await fetch(endpoint, { cache: 'no-store' });
    if (!res.ok) throw new Error('guestbook unavailable');
    const data = await res.json();
    const items = data.items || [];
    count.hidden = false;
    count.textContent = `${items.length} 条`;
    if (!items.length) {
      list.hidden = false;
      list.innerHTML = '<p class="guest-empty">还没有留言，来做第一个。</p>';
      return;
    }
    list.hidden = false;
    list.innerHTML = items.map(guestMessageHtml).join('');
  } catch (err) {
    hint.textContent = `留言服务暂时不可用；提交时会改为发到 ${guestbookEmail()}。`;
  }
}

function bindGuestbook() {
  const form = $('#guestForm');
  if (!form) return;
  const name = $('#guestName');
  const text = $('#guestText');
  const hint = $('#guestHint');
  const submit = $('#guestSubmit');
  const list = $('#guestList');
  const count = $('#guestCount');
  const endpoint = guestbookEndpoint();

  try {
    name.value = localStorage.getItem('pf-guest-name') || '';
  } catch (err) { /* localStorage disabled */ }

  if (endpoint) {
    hint.textContent = '留言会公开显示在下方，不用登录。';
    refreshGuestbook(list, count, hint);
  } else {
    hint.textContent = `静态站点：提交后会打开邮件应用，把留言发到 ${guestbookEmail()}。`;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const nickname = String(name.value || '').trim();
    const message = String(text.value || '').trim();
    if (!nickname) {
      toast('先留一个昵称。');
      name.focus();
      return;
    }
    if (!message) {
      toast('留言内容不能为空。');
      text.focus();
      return;
    }

    try {
      localStorage.setItem('pf-guest-name', nickname);
    } catch (err) { /* ignore */ }

    if (!endpoint) {
      guestMailto(nickname, message, hint);
      return;
    }

    submit.disabled = true;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname,
          text: message,
          website: String(form.querySelector('[name="website"]')?.value || '')
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '发送失败');
      form.reset();
      name.value = nickname;
      if (list) {
        list.hidden = false;
        const empty = list.querySelector('.guest-empty');
        if (empty) empty.remove();
        list.insertAdjacentHTML('afterbegin', guestMessageHtml(data.item || { nickname, text: message, at: new Date().toISOString() }));
      }
      if (count) {
        const current = Number((count.textContent || '').replace(/\D/g, '')) || 0;
        count.hidden = false;
        count.textContent = `${current + 1} 条`;
      }
      hint.textContent = '留言已发出。';
      toast('留言已发出');
    } catch (err) {
      hint.textContent = `公开留言暂时不可用，改为发到 ${guestbookEmail()}。`;
      guestMailto(nickname, message, hint);
    } finally {
      submit.disabled = false;
    }
  });
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
  bindGuestbook();
  await render();

  initAiDock({
    contacts: state.data.home?.contacts || [],
    facts: state.data.home?.about?.facts || [],
    endpoint: (state.data.ai && state.data.ai.endpoint) || window.SZH_AI_ENDPOINT || '',
    quick: (state.data.ai && state.data.ai.quick) || []
  });

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
            bindGuestbook();
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
