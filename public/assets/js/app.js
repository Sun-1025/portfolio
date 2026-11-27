import { initAiDock } from './ai-dock.js';

/* 前台应用：数据加载 / 路由 / 视图 / 主题 / 留言 / 工具 */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
  data: null,
  route: { name: 'home', id: null },
  source: 'api',
};

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

const ARROW = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const BACK_ARROW = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M19 12H6M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* 每个子页都先给一条回首页的路，再保留原来的上下文返回。 */
function backBar(sub) {
  const extra = sub
    ? `<a class="v5-back v5-back--sub" href="${safeUrl(sub.href)}">${esc(sub.label)}</a>`
    : '';
  return `<div class="v5-backbar"><a class="v5-back" href="#/">${BACK_ARROW} 返回首页</a>${extra}</div>`;
}

/* ---------------- 动效辅助（阶段 C，原生 WAAPI，区间见 docs/design/PICK.md） ---------------- */
const EASE_IN = 'cubic-bezier(0.2,0,0,1)';
const EASE_OUT = 'cubic-bezier(0.4,0,1,1)';
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function waapi(el, frames, opts) {
  if (!el || typeof el.animate !== 'function' || reduceMotion()) return null;
  try { return el.animate(frames, opts); } catch (err) { return null; }
}
function countUp(el, to, duration = 400) {
  const target = Number(to) || 0;
  if (!el) return;
  if (reduceMotion()) { el.textContent = String(target); return; }
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / duration);
    el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function splitChars(text) {
  return Array.from(String(text || '')).map((ch) => `<span class="v5-h1-ch">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');
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
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a0c0f' : '#f4f6f8');
}

/* ---------------- 数据 ---------------- */
const LOCK_NOTE = '暂未公开';
function isLocked(item) {
  return !!(item && item.note === LOCK_NOTE);
}

async function loadData() {
  if (document.documentElement.dataset.static !== '1') {
    try {
      const params = new URLSearchParams(location.search);
      let url = '/api/content';
      if (params.get('token') && params.get('preview')) {
        url = `/api/content?token=${encodeURIComponent(params.get('token'))}&preview=${encodeURIComponent(params.get('preview'))}`;
      }
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok && (res.headers.get('content-type') || '').includes('json')) {
        state.source = 'api';
        return await res.json();
      }
    } catch (err) { /* 静态环境没有 API */ }
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

function branchForNav(item) {
  if (!item || item.type === 'route') return null;
  const branches = state.data.branches || [];
  const id = String(item.target || '').replace(/^#?\//, '').replace(/\/$/, '');
  return branches.find((b) => b.id === id) || null;
}

function renderNav() {
  const nav = $('#nav');
  if (!nav) return;
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
    return `<a href="${href}" data-route="${esc(item.target)}">${esc(item.label)}</a>`;
  }).join('');
  const admin = document.querySelector('.admin-entry');
  if (admin && state.source === 'static') {
    admin.title = '管理员登录（打开本机后台）';
    admin.setAttribute('aria-label', '管理员登录（打开本机后台）');
  }
}

function updateNavActive() {
  const current = state.route.name === 'work' ? 'experience' : state.route.name;
  $$('#nav a').forEach((a) => {
    a.classList.toggle('is-active', a.dataset.route === current);
  });
}

/* ---------------- 通用片段 ---------------- */
function projectCover(c) {
  if (c.cover) {
    const first = (c.images || [])[0];
    const alt = c.coverAlt || (first && first.alt) || `${c.title || '项目'}封面`;
    return `<img src="${safeUrl(c.cover)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  }
  return `<div class="v5-cover-fallback"><span>${esc(c.number || '')}</span><b>${esc((c.title || 'C').slice(0, 1))}</b></div>`;
}

const TAG_NOTES = {
  'C 语言': '建库、建表与链表增删改查',
  'SQL Server': '数据库设计与 SQL 查询',
  '数据结构': '链表与结构体实践',
  'JavaScript': '页面交互与工具逻辑',
  'HTML / CSS': '页面结构与响应式样式',
  'GitHub Pages': '静态站部署与自定义域名',
  'Gitee Pages': '国内镜像部署',
  '物联网': '传感器数据与设备联调',
  '声音可视化': '实时波形与频谱展示',
  'WiFi 链路': 'ESP32 联网与数据传输',
  '本地处理': '文件不上传，浏览器内完成',
  '无上传': '转换全程留在本机',
  '公益课': '课程设计与现场授课',
  '课程设计': '四十分钟实验课拆解',
  '现场授课': '图书馆现场带课'
};

function chipTip(tag, title) {
  const note = TAG_NOTES[tag] || '这个案例里用到的一项技能';
  return `${tag} · 用在《${title}》：${note}`;
}

function chips(tags = [], max = 4, context = '') {
  return `<div class="v5-chiprow">${tags.slice(0, max).map((t) => `<span class="v5-chip"${context ? ` data-tip="${esc(chipTip(t, context))}"` : ''}>${esc(t)}</span>`).join('')}</div>`;
}

function projectCard(c, index = 0) {
  if (isLocked(c)) {
    return `<article class="v5-project-card v5-locked reveal">
      <div class="v5-project-media"><div class="v5-cover-fallback v5-lock-fallback"><span aria-hidden="true">🔒</span></div><span class="v5-project-no">${String(index + 1).padStart(2, '0')}</span></div>
      <div class="v5-project-copy">
        <span class="v5-project-meta">项目</span>
        <h3 class="v5-project-title">${esc(c.title)}</h3>
        <p class="v5-project-summary">该内容暂未公开</p>
      </div>
    </article>`;
  }
  return `<a class="v5-project-card reveal v5-focus-item" href="#/work/${esc(c.id)}">
    <div class="v5-project-media v5-glare">${projectCover(c)}<span class="v5-project-no">${String(index + 1).padStart(2, '0')}</span></div>
    <div class="v5-project-copy">
      <span class="v5-project-meta">${esc(c.number || '')} / ${esc(c.category === 'practice' ? '公益实践' : '项目')}</span>
      <h3 class="v5-project-title">${esc(c.title)}</h3>
      <p class="v5-project-summary">${esc(c.summary)}</p>
      ${chips(c.tags || [], 3, c.title)}
      <span class="v5-card-link">查看记录 ${ARROW}</span>
    </div>
  </a>`;
}

function practiceCard(c) {
  if (!c) return '';
  if (isLocked(c)) {
    return `<article class="v5-practice v5-locked reveal">
      <div class="v5-practice-media"><div class="v5-cover-fallback v5-lock-fallback"><span aria-hidden="true">🔒</span></div><span class="v5-practice-tag">公益实践</span></div>
      <div class="v5-practice-copy">
        <span class="v5-project-meta">公益实践</span>
        <h3 class="v5-project-title">${esc(c.title)}</h3>
        <p class="v5-project-summary">该内容暂未公开</p>
      </div>
    </article>`;
  }
  return `<a class="v5-practice reveal" href="#/work/${esc(c.id)}">
    <div class="v5-practice-media">${projectCover(c)}<span class="v5-practice-tag">公益实践</span></div>
    <div class="v5-practice-copy">
      <span class="v5-project-meta">${esc(c.number || '')} / 公益实践</span>
      <h3 class="v5-project-title">${esc(c.title)}</h3>
      <p class="v5-project-summary">${esc(c.summary)}</p>
      <p class="v5-practice-note">课程放在东营区图书馆，四十分钟里让孩子先动手，再讲为什么。</p>
      <span class="v5-card-link">看公益课记录 ${ARROW}</span>
    </div>
  </a>`;
}

const TIMELINE_LINKS = {
  '01': { href: '#/internship', label: '看实习记录' },
  '02': { href: '#/work/case-physics', label: '看公益课记录' },
  '03': { href: '/assets/photos/campus/qingxie.webp', label: '看现场照片', external: true },
  '04': { href: '/assets/photos/campus/kexie.webp', label: '看现场照片', external: true }
};

function timelineHtml(items = []) {
  return `<div class="v5-timeline">${items.map((item) => {
    if (isLocked(item)) {
      return `<article class="v5-timeline-item v5-locked reveal">
        <span class="v5-timeline-no">${esc(item.no || '')}</span>
        <div class="v5-timeline-body"><span class="v5-timeline-meta">${esc(item.meta || '')}</span><h3>${esc(item.title || item.label || '')}</h3><p>该内容暂未公开</p></div>
      </article>`;
    }
    const map = TIMELINE_LINKS[item.no] || {};
    const href = item.href || map.href;
    const label = item.linkLabel || map.label || '查看';
    const external = item.external != null ? item.external : Boolean(map.external);
    const body = `<div class="v5-timeline-body">
        <span class="v5-timeline-meta">${esc(item.meta || '')}</span>
        <h3>${esc(item.label || '')}</h3>
        <p>${esc(item.text || '')}</p>
        ${href ? `<span class="v5-card-link v5-timeline-open">${esc(label)} ${ARROW}</span>` : ''}
      </div>`;
    const inner = `<span class="v5-timeline-no">${esc(item.no || '')}</span>${body}`;
    return href
      ? `<a class="v5-timeline-item v5-timeline-item--link reveal" href="${safeUrl(href)}"${external ? ' target="_blank" rel="noopener"' : ''} aria-label="${esc(item.label || '')}：${esc(label)}">${inner}</a>`
      : `<article class="v5-timeline-item reveal">${inner}</article>`;
  }).join('')}</div>`;
}

function interestChildren(item) {
  return byOrder((state.data.interests || []).filter((x) => x.parent === item.id));
}

function interestPhotoCount(item) {
  const own = (item.images || []).length;
  return own + interestChildren(item).reduce((sum, child) => sum + (child.images || []).length, 0);
}

function inlineText(value) {
  return esc(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

/* 后台长介绍使用空行分段；支持少量标题和 **加粗**，其余内容一律转义。 */
function richTextHtml(value) {
  return String(value || '').trim().split(/\n{2,}/).map((block) => {
    const text = block.trim();
    if (!text) return '';
    if (/^###\s+/.test(text)) return `<h3>${inlineText(text.replace(/^###\s+/, ''))}</h3>`;
    if (/^##\s+/.test(text)) return `<h2>${inlineText(text.replace(/^##\s+/, ''))}</h2>`;
    return `<p>${inlineText(text).replace(/\n/g, '<br>')}</p>`;
  }).join('');
}

function travelTreeHtml(item, children) {
  const total = children.reduce((sum, child) => sum + (child.images || []).length, 0);
  const nodes = children.map((child, i) => `<a class="v5-travel-node reveal" href="#/interest/${esc(child.id)}" aria-label="打开${esc(child.title)}相册">
      <span class="v5-travel-node-no">${String(i + 1).padStart(2, '0')}</span>
      <span class="v5-travel-node-copy"><strong>${esc(child.title)}</strong><small>${esc(child.lead || '')}</small><em>${(child.images || []).length} 张照片</em></span>
      <span class="v5-travel-node-cover"><img src="${safeUrl(child.cover)}" alt="${esc(child.title)}相册封面" loading="lazy" decoding="async"></span>
      <span class="v5-travel-node-arrow">${ARROW}</span>
    </a>`).join('');
  return `<div class="v5-travel-tree" role="group" aria-label="${esc(item.title)}地点分支">
    <div class="v5-travel-root">
      <span class="v5-travel-root-kicker">TRAVEL / PLACES</span>
      <strong>${esc(item.title)}</strong>
      <span>${children.length} 个地点 · ${total} 张照片</span>
    </div>
    <div class="v5-travel-branches">${nodes}</div>
  </div>`;
}

function interestCard(item, index = 0) {
  if (isLocked(item)) {
    return `<article class="v5-interest-card v5-locked reveal">
      <div class="v5-interest-cover"><div class="v5-lock-fallback"><span aria-hidden="true">🔒</span></div><span>${String(index + 1).padStart(2, '0')}</span></div>
      <div class="v5-interest-copy">
        <div class="v5-interest-head"><h3>${esc(item.title)}</h3><span>0 张</span></div>
        <p>该内容暂未公开</p>
      </div>
    </article>`;
  }
  const count = interestPhotoCount(item);
  const first = (item.images || [])[0];
  const alt = (first && first.alt) || `${item.title || '兴趣'}照片`;
  return `<a class="v5-interest-card reveal v5-focus-item" href="#/interest/${esc(item.id)}">
    <div class="v5-interest-cover v5-glare"><img src="${safeUrl(item.cover)}" alt="${esc(alt)}" loading="lazy" decoding="async"><span>${String(index + 1).padStart(2, '0')}</span></div>
    <div class="v5-interest-copy">
      <div class="v5-interest-head"><h3>${esc(item.title)}</h3><span>${count} 张</span></div>
      <p>${esc(item.lead || '')}</p>
      <span class="v5-card-link">打开相册 ${ARROW}</span>
    </div>
  </a>`;
}

function sectionHead(no, title, lead, id) {
  return `<div class="v5-section-head">
    <span class="v5-kicker">${esc(no)}</span>
    <div><h2 class="v5-h2"${id ? ` id="${esc(id)}"` : ''}>${esc(title)}</h2><p class="v5-lead">${esc(lead || '')}</p></div>
  </div>`;
}

/* ---------------- 首页 ---------------- */
function renderHome() {
  const home = state.data.home || {};
  const hero = home.hero || {};
  const about = home.about || {};
  const cases = (state.data.work && state.data.work.cases) || [];
  const selected = (home.selectedIds || []).map((id) => cases.find((c) => c.id === id)).filter(Boolean);
  const practice = cases.find((c) => c.id === 'case-physics');
  const interests = byOrder(state.data.interests || []).filter((item) => !item.parent);
  const timeline = home.timeline || [];

  const profile = (hero.profile || []).map((row) => `<div class="v5-profile-row"><span>${esc(row.k)}</span><b>${esc(row.v)}</b></div>`).join('');
  const tags = (hero.tags || []).map((t) => `<span class="v5-tag">${esc(t)}</span>`).join('');
  const facts = (about.facts || []).map((f) => `<div class="v5-fact"><span>${esc(f.k)}</span><b>${esc(f.v)}</b></div>`).join('');
  const abilities = (about.abilities || []).map((a) => `<div class="v5-ability"><div class="v5-ability-head"><span>${esc(a.t)}</span></div><p>${esc(a.d)}</p></div>`).join('');
  const SKILL_FROM = {
    'SQL Server': '图书管理系统建库建表',
    'C 语言': 'C 语言程序设计 · ESP32 固件',
    'C++': 'C 语言程序设计 · ESP32 固件'
  };
  const skills = (about.skills || []).map((s) => `<span class="v5-skill"${SKILL_FROM[s.n] ? ` data-from="${esc(SKILL_FROM[s.n])}" tabindex="0"` : ''}>${esc(s.n)}</span>`).join('');
  const emailRaw = ((home.contacts || []).find((c) => c.label === '邮箱'));
  const email = isLocked(emailRaw) ? { value: '暂未公开', url: '' } : (emailRaw || { value: '1322816531@qq.com', url: 'mailto:1322816531@qq.com' });

  return `
  <section class="v5-hero wrap">
    <div class="v5-hero-copy">
      <p class="v5-eyebrow">${esc(hero.eyebrow || '')}</p>
      <h1 class="v5-h1">${splitChars(hero.title || '')}</h1>
      <p class="v5-intro">${esc(hero.intro || '')}</p>
      <div class="v5-tags">${tags}</div>
      <div class="v5-actions">
        ${hero.primary ? `<a class="v5-btn v5-btn--primary" href="${safeUrl(hero.primary.href)}">${esc(hero.primary.label)} ${ARROW}</a>` : ''}
        ${hero.secondary ? `<a class="v5-btn" href="${safeUrl(hero.secondary.href)}">${esc(hero.secondary.label)} ${ARROW}</a>` : ''}
      </div>
      <p class="v5-hero-note">现在在读，也在找嵌入式、物联网方向的实习机会。</p>
    </div>
    <aside class="v5-profile">
      <div class="v5-profile-head"><span>PROFILE&nbsp;/&nbsp;2025</span><span class="v5-live"><i></i>OPEN</span></div>
      ${profile}
      <div class="v5-signal">
        <div class="v5-profile-row"><span>SIGNAL</span><b class="v5-signal-val" data-signal="98.4">98.4</b></div>
        <div class="v5-signal-bar" aria-hidden="true"><i></i></div>
      </div>
      <div class="v5-profile-row"><span>LOCAL</span><b class="v5-clock" aria-hidden="true">--:--:--</b></div>
      <p class="v5-profile-motto">无限进步</p>
    </aside>
  </section>

  <section class="v5-section wrap">
    ${sectionHead('01 / PROJECTS', '做过的四件事', '本站、工具箱、语音监测、图书管理。先看东西，再看过程。')}
    <div class="v5-project-grid v5-focus-group">${selected.slice(0, 4).map(projectCard).join('')}</div>
    <a class="v5-more" href="#/experience">查看全部项目与经历 ${ARROW}</a>
  </section>

  <section class="v5-section wrap v5-practice-section">
    ${sectionHead('02 / PRACTICE', '公益实践', '科普课单独放一块。它不写在项目清单里，但确实花了不少时间。')}
    ${practiceCard(practice)}
  </section>

  <section class="v5-section wrap">
    ${sectionHead('03 / EXPERIENCE', '经历时间线', '从校内到图书馆，再到两个协会。按顺序排，一段一件事。')}
    ${timelineHtml(timeline)}
  </section>

  <section class="v5-section wrap">
    ${sectionHead('04 / INTERESTS', '离开工位以后', '骑行、羽毛球、登山，还有收在“旅行”里的三座城市。点开是一段记录。')}
    <div class="v5-interest-grid${interests.length === 4 ? ' v5-interest-grid--four' : ''} v5-focus-group">${interests.map(interestCard).join('')}</div>
    <a class="v5-more" href="#/interest">查看全部兴趣照片 ${ARROW}</a>
  </section>

  <section class="v5-section wrap v5-about-section">
    ${sectionHead('05 / ABOUT', about.title || '关于我', about.lead || '')}
    <div class="v5-about-grid">
      <div class="v5-about-main">
        ${(about.lines || []).map((l) => `<p>${esc(l)}</p>`).join('')}
        <blockquote class="v5-motto">「${esc((about.belief && about.belief.quote) || '无限进步。')}」</blockquote>
        <div class="v5-abilities">${abilities}</div>
      </div>
      <aside class="v5-about-side">
        <div class="v5-side-block"><span class="v5-side-label">资料 / PROFILE</span>${facts}</div>
        <div class="v5-side-block"><span class="v5-side-label">已掌握 / SKILLS</span><div class="v5-skills">${skills}</div></div>
        <div class="v5-side-block"><span class="v5-side-label">邮箱 / EMAIL</span><a class="v5-side-mail" href="${safeUrl(email.url)}">${email.url ? '点击发送' : esc(email.value)}</a></div>
      </aside>
    </div>
  </section>`;
}

/* ---------------- 实习 ---------------- */
function renderInternship() {
  return `
  <section class="v5-page-head wrap">
    ${backBar()}
    <span class="v5-kicker">01 / INTERNSHIP</span>
    <h1>把一件事从开头跟到落地</h1>
    <p>校内预备实习和东营区图书馆实践。两段都不长，一段练项目里的串联，一段练课程和现场。</p>
  </section>
  <section class="v5-section wrap">
    <div class="v5-intern-grid">
      <a class="v5-intern-card v5-intern-card--link reveal" href="#/experience" aria-label="校内预备实习：查看经历记录">
        <span class="v5-intern-no">01</span>
        <div>
          <span class="v5-timeline-meta">在学校 · 项目实践</span>
          <h2>校内预备实习</h2>
          <p>参与项目实践，做整体串联和调试。最难的一段是前后端和 UI 交互不兼容：前端用 AOS 滚动和响应式交互，后端用 GitHub Pages 与 Gitee Pages 双平台部署，再把路径和接口接起来。</p>
          <p>这段实习让我知道，代码能跑只是第一步。别人能不能按你的说明复核，才是另一回事。</p>
          ${chips(['项目串联', 'AOS 滚动', '双平台部署'])}
          <span class="v5-card-link v5-intern-open">看经历记录 ${ARROW}</span>
        </div>
      </a>
      <a class="v5-intern-card v5-intern-card--link reveal" href="#/work/case-physics" aria-label="东营区图书馆实践：查看公益课记录">
        <span class="v5-intern-no">02</span>
        <div>
          <span class="v5-timeline-meta">东营区图书馆 · 公益课</span>
          <h2>东营区图书馆实践</h2>
          <p>把「小小物理学家探险队」的课程带进图书馆。课程设计、现场授课、场地和物料对接都要跟。四十分钟的课，孩子愿不愿意动手，一眼就能看出来。</p>
          <p>每次上完记下哪一段坐不住，下一次把那段拆短，或者换一个实验。</p>
          ${chips(['课程设计', '现场授课', '物料对接'])}
          <span class="v5-card-link v5-intern-open">看公益课记录 ${ARROW}</span>
        </div>
      </a>
    </div>
  </section>`;
}

/* ---------------- 经历 ---------------- */
function renderExperience() {
  const cases = (state.data.work && state.data.work.cases) || [];
  const selected = ((state.data.home && state.data.home.selectedIds) || []).map((id) => cases.find((c) => c.id === id)).filter(Boolean);
  const practice = cases.find((c) => c.id === 'case-physics');
  const campus = (state.data.home && state.data.home.campus) || [];
  return `
  <section class="v5-page-head wrap">
    ${backBar()}
    <span class="v5-kicker">02 / EXPERIENCE</span>
    <h1>项目是经历的主体</h1>
    <p>四件自己做出来的东西，加一门公益课。下面按项目、时间线、校园照片排开。</p>
  </section>
  <section class="v5-section wrap">
    ${sectionHead('02.1 / PROJECTS', '四件做过的东西', '每张卡片先写做了什么、我负责哪一段、最后留下什么。')}
    <div class="v5-project-grid v5-focus-group">${selected.slice(0, 4).map(projectCard).join('')}</div>
  </section>
  <section class="v5-section wrap v5-practice-section">
    ${sectionHead('02.2 / PRACTICE', '公益课', '「小小物理学家探险队」放在项目之外，单独记。')}
    ${practiceCard(practice)}
  </section>
  <section class="v5-section wrap">
    ${sectionHead('02.3 / TIMELINE', '四段经历', '校内预备实习 → 东营区图书馆 → 青年志愿者协会 → 科技协会。')}
    ${timelineHtml((state.data.home && state.data.home.timeline) || [])}
  </section>
  ${campus.length ? `<section class="v5-section wrap">
    ${sectionHead('02.4 / CAMPUS', '校园里的两张照片', '青协和科协各留一张，不铺成相册。')}
    <div class="v5-campus-grid">${campus.map((item) => isLocked(item)
      ? `<figure class="v5-campus-card v5-locked reveal"><div class="v5-lock-fallback"><span aria-hidden="true">🔒</span></div><figcaption><strong>${esc(item.title)}</strong><span>该内容暂未公开</span></figcaption></figure>`
      : `<figure class="v5-campus-card reveal">
      <a class="v5-campus-media" href="${safeUrl(item.image)}" target="_blank" rel="noopener" aria-label="查看原图：${esc(item.title)}"><img src="${safeUrl(item.image)}" alt="${esc(item.alt)}" loading="lazy" decoding="async"><span class="v5-open-tag">原图 ↗</span></a>
      <figcaption><strong>${esc(item.title)}</strong><span>${esc(item.caption)}</span></figcaption>
    </figure>`).join('')}</div>
  </section>` : ''}`;
}

/* ---------------- 兴趣 ---------------- */
function renderInterest(id) {
  const allInterests = state.data.interests || [];
  const indexInterests = byOrder(allInterests).filter((item) => !item.parent);
  if (id) {
    const item = allInterests.find((x) => x.id === id);
    if (!item) return `<section class="v5-page-head wrap">${backBar({ href: '#/interest', label: '返回兴趣' })}<h1>这个相册不存在</h1></section>`;
    const parent = item.parent ? allInterests.find((x) => x.id === item.parent) : null;
    const backSub = parent ? { href: `#/interest/${parent.id}`, label: `返回${parent.title}` } : { href: '#/interest', label: '返回兴趣' };
    const kicker = parent ? `04 / TRAVEL · ${parent.title}` : '04 / INTEREST';
    if (isLocked(item)) {
      return `
      <section class="v5-page-head wrap">
        ${backBar(backSub)}
        <span class="v5-kicker">${esc(kicker)}</span>
        <h1>${esc(item.title)}</h1>
        <p class="v5-locked-note"><span aria-hidden="true">🔒</span> 该内容暂未公开</p>
      </section>`;
    }
    const children = interestChildren(item);
    const story = item.intro
      ? `<section class="v5-section wrap v5-interest-story"><div class="v5-interest-intro">${richTextHtml(item.intro)}</div></section>`
      : '';
    const tree = children.length
      ? `<section class="v5-section wrap v5-travel-section">${travelTreeHtml(item, children)}</section>`
      : '';
    const gallery = (item.images || []).length
      ? `<section class="v5-section wrap">
      <div class="v5-gallery">${(item.images || []).map((img, i) => `<figure class="v5-gallery-item reveal${i === 0 ? ' is-lead' : ''}">
        <a class="v5-gallery-media" href="${safeUrl(img.src)}" target="_blank" rel="noopener" aria-label="查看原图：${esc(img.alt || item.title || '')}"><img src="${safeUrl(img.src)}" alt="${esc(img.alt)}" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async"><span class="v5-open-tag">原图 ↗</span></a>
        <figcaption>${esc(img.caption || '')}</figcaption>
      </figure>`).join('')}</div>
    </section>`
      : '';
    return `
    <section class="v5-page-head wrap">
      ${backBar(backSub)}
      <span class="v5-kicker">${esc(kicker)}</span>
      <h1>${esc(item.title)}</h1>
      <p>${esc(item.lead || '')}</p>
    </section>
    ${story}
    ${tree}
    ${gallery}`;
  }
  return `
  <section class="v5-page-head wrap">
    ${backBar()}
    <span class="v5-kicker">04 / INTEREST</span>
    <h1>玩过的，去过的</h1>
    <p>骑行、羽毛球、登山，还有一个收着北京、淄博、济南的“旅行”。点开每一项，先看一段记录，再看照片。</p>
  </section>
  <section class="v5-section wrap">
    <div class="v5-interest-grid v5-interest-grid--page${indexInterests.length === 4 ? ' v5-interest-grid--four' : ''} v5-focus-group">${indexInterests.map(interestCard).join('')}</div>
  </section>`;
}

/* ---------------- 项目详情 ---------------- */
function renderCase(id) {
  const c = (state.data.work.cases || []).find((x) => x.id === id);
  if (!c) return `<section class="v5-page-head wrap">${backBar({ href: '#/experience', label: '返回经历' })}<h1>内容不存在</h1></section>`;
  if (isLocked(c)) {
    return `
    <section class="v5-page-head wrap">
      ${backBar({ href: '#/experience', label: '返回经历' })}
      <span class="v5-kicker">PROJECT</span>
      <h1>${esc(c.title)}</h1>
      <p class="v5-locked-note"><span aria-hidden="true">🔒</span> 该内容暂未公开</p>
    </section>`;
  }

  const sections = (c.sections || []).map((s) => `<h2>${esc(s.h)}</h2><p>${esc(s.p)}</p>`).join('');
  const rawImages = c.images || [];
  const images = rawImages.map((img) => typeof img === 'string' ? { src: img, alt: c.title, caption: '' } : img);
  const tags = (c.tags || []).map((t) => `<span class="v5-skill" data-tip="${esc(chipTip(t, c.title))}">${esc(t)}</span>`).join('');
  const links = (c.links || []).map((l) => `<a class="v5-btn" href="${safeUrl(l.url)}" target="_blank" rel="noopener">${esc(l.text)} ${ARROW}</a>`).join('');

  return `
  <section class="v5-page-head wrap">
    ${backBar({ href: '#/experience', label: '返回经历' })}
    <span class="v5-kicker">${esc(c.category === 'practice' ? 'PRACTICE' : 'PROJECT')} / ${esc(c.number || '')}</span>
    <h1>${esc(c.title)}</h1>
    <p>${esc(c.summary)}</p>
  </section>
  <section class="v5-detail wrap">
    <a class="v5-detail-cover" href="${safeUrl(c.cover)}" target="_blank" rel="noopener" aria-label="查看封面原图">
      <img src="${safeUrl(c.cover)}" alt="${esc(c.title)} 封面" fetchpriority="high" decoding="async">
      <span class="v5-cover-org">${esc(c.org || '')}</span><span class="v5-open-tag">原图 ↗</span>
    </a>
    <dl class="v5-detail-meta">
      <div><dt>归属</dt><dd>${esc(c.org || '—')}</dd></div>
      <div><dt>时间</dt><dd>${esc(c.period || '—')}</dd></div>
      <div><dt>角色</dt><dd>${esc(c.role || '—')}</dd></div>
      <div><dt>分类</dt><dd>${esc(c.category === 'practice' ? '公益实践' : '项目')}</dd></div>
    </dl>
    <div class="v5-detail-body">
      <div class="v5-detail-sections">${sections}</div>
      <aside class="v5-detail-side">
        <div class="v5-side-block"><span class="v5-side-label">标签 / TAGS</span><div class="v5-skills">${tags || '<span class="v5-muted">暂无</span>'}</div></div>
        ${images.length ? `<div class="v5-detail-images">${images.map((img) => `<figure><a class="v5-detail-img" href="${safeUrl(img.src)}" target="_blank" rel="noopener" aria-label="查看原图：${esc(img.alt || c.title)}"><img src="${safeUrl(img.src)}" alt="${esc(img.alt || c.title)}" loading="lazy" decoding="async"><span class="v5-open-tag">原图 ↗</span></a><figcaption>${esc(img.caption || '')}</figcaption></figure>`).join('')}</div>` : ''}
        ${c.result ? `<div class="v5-result"><span class="v5-side-label">留下什么 / RESULT</span><p>${esc(c.result)}</p></div>` : ''}
        ${links ? `<div class="v5-detail-links">${links}</div>` : ''}
      </aside>
    </div>
  </section>`;
}

/* ---------------- 工具 ---------------- */
function toolModules() {
  return byOrder(state.data.tools.items || []).filter((t) => t.enabled !== false);
}

function toolIcon(id) {
  const common = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
  if (id === 'converter') return `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><path d="M7 11h15m0 0-4-4m4 4-4 4M25 21H10m0 0 4-4m-4 4 4 4" ${common}/></svg>`;
  if (id === 'markdown') return `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><rect x="4" y="8" width="24" height="16" rx="4" ${common}/><path d="M9 20V13m0 7 3-4 3 4M19 13v7m0-7 3 3 3-3" ${common}/></svg>`;
  if (id === 'wordcount') return `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><path d="M8 7h16M8 13h16M8 19h10M8 25h7" ${common}/></svg>`;
  if (id === 'unit') return `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><rect x="4" y="11" width="24" height="10" rx="3" ${common}/><path d="M9 11v4M14 11v6M19 11v4M24 11v6" ${common}/></svg>`;
  if (id === 'pdf-to-word') return `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><path d="M6 6h12l4 4v16H6z" ${common}/><path d="M18 6v4h4" ${common}/><path d="M11 19h9m0 0-3-3m3 3-3 3" ${common}/></svg>`;
  if (id === 'word-to-pdf') return `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><rect x="7" y="13" width="18" height="10" rx="3" ${common}/><path d="M10 13V5h12v8M10 19h12v7H10z" ${common}/></svg>`;
  return `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><rect x="6" y="8" width="20" height="18" rx="4" ${common}/><path d="M6 14h20M12 5v6M20 5v6" ${common}/></svg>`;
}

function toolCard(t) {
  if (isLocked(t)) {
    return `<article class="v5-tool-card v5-locked reveal">
      <span class="v5-tool-icon"><span aria-hidden="true">🔒</span></span>
      <span class="v5-tool-body">
        <span class="v5-project-meta">工具</span>
        <h3>${esc(t.title || t.name || '')}</h3>
        <p class="v5-tool-problem">该内容暂未公开</p>
      </span>
    </article>`;
  }
  return `<a class="v5-tool-card reveal" href="#/tools/${esc(t.id)}">
    <span class="v5-tool-icon">${toolIcon(t.id)}</span>
    <span class="v5-tool-body">
      <span class="v5-project-meta">${esc(t.category === 'convert' ? '转换' : '查询')}</span>
      <h3>${esc(t.name)}</h3>
      <p class="v5-tool-problem">${esc(t.problem || t.desc || '')}</p>
      <p class="v5-tool-prereq">使用前提：${esc(t.prereq || '在浏览器本地运行。')}</p>
    </span>
    <span class="v5-tool-go">${ARROW}</span>
  </a>`;
}

function renderTools() {
  const tools = state.data.tools;
  const list = toolModules();
  const featured = list.find((t) => t.featured || t.id === 'converter');
  const utilities = list.filter((t) => t !== featured);
  const cards = utilities.map(toolCard).join('');

  setTimeout(async () => {
    const host = $('#converterApp');
    if (!host || !featured) return;
    try {
      const mod = await import(`/tools/${featured.module}?v=${Date.now()}`);
      if (typeof mod.render !== 'function') throw new Error('转换台模块缺少 render');
      host.innerHTML = '';
      await mod.render(host, { toast });
    } catch (err) {
      host.innerHTML = `<p class="tool-error">转换台加载失败：${esc(err.message)}</p>`;
    }
  }, 0);

  return `
  <section class="v5-page-head wrap">
    ${backBar()}
    <span class="v5-kicker">05 / TOOLS</span>
    <h1>${esc(tools.title || '在线工具箱')}</h1>
    <p>${esc(tools.intro || '')}</p>
  </section>
  <section class="v5-section wrap">
    <div class="v5-tools-status"><span><i></i>LOCAL ENGINE / READY</span><span><span class="v5-count" data-count="${list.length}" data-tip="自建在线工具" tabindex="0">${list.length}</span> 个工具</span><span>NO SERVER / NO UPLOAD</span></div>
    <div class="converter-mount" id="converterApp"><p class="tool-loading">转换台初始化中…</p></div>
    <div class="v5-tools-sub">${sectionHead('05.1 / UTILITIES', '常用的几个', '转换台之外，保留这些轻量工具。每个都写了使用前提。')}</div>
    <div class="v5-tool-grid">${cards || '<p class="v5-empty">工具正在整理。</p>'}</div>
  </section>`;
}

async function renderTool(id) {
  const enabled = toolModules().find((t) => t.id === id);
  const item = enabled || (state.data.tools.items || []).find((t) => t.id === id);
  if (!item) {
    return `<section class="v5-page-head wrap">${backBar({ href: '#/tools', label: '返回工具' })}<h1>工具不存在或已关闭</h1></section>`;
  }
  if (isLocked(item)) {
    return `
    <section class="v5-page-head wrap">
      ${backBar({ href: '#/tools', label: '返回工具' })}
      <span class="v5-kicker">TOOL</span>
      <h1>${esc(item.title || item.name || '')}</h1>
      <p class="v5-locked-note"><span aria-hidden="true">🔒</span> 该内容暂未公开</p>
    </section>`;
  }
  if (!enabled) {
    return `<section class="v5-page-head wrap">${backBar({ href: '#/tools', label: '返回工具' })}<h1>工具不存在或已关闭</h1></section>`;
  }
  const head = `
  <section class="v5-page-head wrap">
    ${backBar({ href: '#/tools', label: '返回工具' })}
    <div class="v5-tool-title"><span class="v5-tool-icon">${toolIcon(item.id)}</span><div><span class="v5-kicker">TOOL / ${esc(item.id.toUpperCase())}</span><h1>${esc(item.name)}</h1></div></div>
    <p>${esc(item.desc || '')}</p>
    <p class="v5-tool-prereq">解决什么问题：${esc(item.problem || '')}　使用前提：${esc(item.prereq || '在浏览器本地运行。')}</p>
  </section>
  <section class="v5-section wrap"><div class="tool-panel" id="toolPanel"><p class="tool-loading">模块加载中…</p></div></section>`;

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

/* ---------------- 页脚与留言 ---------------- */
function renderFoot() {
  const contacts = (state.data.home && state.data.home.contacts) || [];
  const email = contacts.find((c) => (c.label || '').includes('邮箱'));
  const contactItems = contacts.map((c) => {
    if (isLocked(c)) {
      const inner = `<span class="foot-contact-label">${esc(c.title || c.label || '')}</span><span class="foot-contact-value">暂未公开</span>`;
      return `<span class="foot-contact-item">${inner}</span>`;
    }
    const inner = `<span class="foot-contact-label">${esc(c.label)}</span><span class="foot-contact-value">${(c.label || '').includes('邮箱') && c.url ? '点击发送' : esc(c.value)}</span>`;
    if (c.url) return `<a class="foot-contact-item" href="${safeUrl(c.url)}" ${String(c.url).startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${inner}<span class="foot-contact-arrow">${ARROW}</span></a>`;
    return `<span class="foot-contact-item">${inner}</span>`;
  }).join('');
  const adminLink = state.source === 'api' ? '<a href="/admin">后台管理</a>' : '';
  return `<div class="wrap">
    <div class="foot-kicker"><span>CONTACT</span><span class="foot-status"><i></i>OPEN TO INTERNSHIP</span></div>
    <div class="foot-top">
      <div>
        <h2 class="foot-title">有想法，<br>随时聊。</h2>
        ${email ? (isLocked(email) ? `<span class="foot-mail">暂未公开</span>` : `<a class="foot-mail" href="${safeUrl(email.url || 'mailto:' + email.value)}">${email.url ? '邮箱 · 点击发送' : esc(email.value)}</a>`) : ''}
        <p class="foot-motto">无限进步</p>
        <div class="v5-avatar-group" role="group" aria-label="关于我的四个切面">
          <button class="v5-avatar" type="button" data-name="孙志昊" data-role="山东石油化工学院" data-sub="2025 级 · 物联网工程" aria-label="孙志昊，山东石油化工学院物联网工程 2025 级">
            <img src="/uploads/avatars/school.webp" alt="" loading="lazy" decoding="async">
          </button>
          <button class="v5-avatar" type="button" data-name="孙志昊" data-role="校内科技协会" data-sub="2025 级 · 物联网工程" aria-label="孙志昊，校内科技协会">
            <img src="/uploads/avatars/kexie.webp" alt="" loading="lazy" decoding="async">
          </button>
          <button class="v5-avatar" type="button" data-name="孙志昊" data-role="公益课讲师 · 东营区图书馆" data-sub="2025 级 · 物联网工程" aria-label="孙志昊，东营区图书馆公益课讲师">
            <img src="/uploads/avatars/physics.webp" alt="" loading="lazy" decoding="async">
          </button>
          <button class="v5-avatar" type="button" data-name="孙志昊" data-role="骑行 · 东营" data-sub="2025 级 · 物联网工程" aria-label="孙志昊，骑行爱好者">
            <img src="/uploads/avatars/cycling.webp" alt="" loading="lazy" decoding="async">
          </button>
        </div>
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
          <h3 id="guestbookTitle">留言</h3>
          <p id="guestMode">不用登录。留个昵称，把想说的话写下来。</p>
        </div>
        <span class="foot-guest-count" id="guestCount" hidden></span>
      </div>
      <form class="guest-form" id="guestForm" novalidate>
        <div class="guest-field guest-field--name"><label for="guestName">昵称</label><input id="guestName" name="nickname" maxlength="20" autocomplete="nickname" placeholder="你的昵称" required></div>
        <div class="guest-field guest-field--text"><label for="guestText">留言</label><textarea id="guestText" name="text" maxlength="500" rows="4" placeholder="想说的话，最多 500 字。" required></textarea></div>
        <div class="guest-honeypot" aria-hidden="true"><label>网站<input name="website" tabindex="-1" autocomplete="off"></label></div>
        <div class="guest-actions"><span class="guest-hint" id="guestHint">留个昵称就能写，不需要登录。</span><button type="submit" class="v5-btn v5-btn--primary" id="guestSubmit">发送留言 ${ARROW}</button></div>
        <p class="guest-status" id="guestStatus" role="status" aria-live="polite"></p>
      </form>
      <div class="guest-list" id="guestList" hidden></div>
    </section>
    <div class="foot-links foot-links--meta">
      ${adminLink}
      <a href="/classic/">经典版 ${ARROW}</a>
      <a href="#/">回到顶部 ↑</a>
    </div>
    <div class="foot-bottom"><span>${esc(state.data.site.footer || '')}</span><span class="foot-credit">Animations adapted from React Bits (MIT + Commons Clause) · Button form by reglobby (Uiverse, MIT)</span><span>BUILD&nbsp;5.0&nbsp;/&nbsp;2026.11</span></div>
  </div>`;
}

function guestbookEndpoint() {
  const configured = String(window.SZH_GUESTBOOK_ENDPOINT || '').trim();
  if (configured) return configured.replace(/\/+$/, '');
  return state.source === 'api' ? '/api/guestbook' : '';
}

function guestbookEmail() {
  const contact = ((state.data.home && state.data.home.contacts) || []).find((c) => (c.label || '').includes('邮箱'));
  return (contact && contact.value) || '1322816531@qq.com';
}

function guestTime(iso) {
  try {
    return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch (err) { return ''; }
}

function guestMessageHtml(item) {
  return `<article class="guest-item"><div class="guest-item-head"><strong>${esc(item.nickname || '匿名')}</strong><time>${esc(guestTime(item.at))}</time></div><p>${esc(item.text || '')}</p></article>`;
}

function guestMailto(nickname, text, hint) {
  const email = guestbookEmail();
  const subject = `网站留言 · ${nickname}`;
  const body = `昵称：${nickname}\n\n${text}\n\n（来自 sunzhihaoai.top 留言框）`;
  window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  if (hint) hint.textContent = '已打开邮件应用。如果没有反应，请使用页脚的邮箱入口。';
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
    list.hidden = false;
    list.innerHTML = items.length ? items.map(guestMessageHtml).join('') : '<p class="guest-empty">还没有留言，来做第一个。</p>';
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
  const status = $('#guestStatus');
  const say = (msg, kind) => {
    if (!status) return;
    status.textContent = msg;
    if (kind) status.dataset.state = kind; else delete status.dataset.state;
    waapi(status, [{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: EASE_IN });
  };
  const endpoint = guestbookEndpoint();

  try { name.value = localStorage.getItem('pf-guest-name') || ''; } catch (err) { /* ignore */ }

  if (endpoint) {
    hint.textContent = '留言会公开显示在下方，不用登录。';
    refreshGuestbook(list, count, hint);
  } else {
    hint.textContent = '静态站点：提交后会打开邮件应用，发到站内邮箱。';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const nickname = String(name.value || '').trim();
    const message = String(text.value || '').trim();
    if (!nickname) { say('先留一个昵称。', 'err'); toast('先留一个昵称。'); name.focus(); return; }
    if (!message) { say('留言内容不能为空。', 'err'); toast('留言内容不能为空。'); text.focus(); return; }
    try { localStorage.setItem('pf-guest-name', nickname); } catch (err) { /* ignore */ }
    if (!endpoint) { say('静态站点：已打开邮件应用发送留言。', 'ok'); guestMailto(nickname, message, hint); return; }

    submit.disabled = true;
    say('发送中…');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, text: message, website: String(form.querySelector('[name="website"]')?.value || '') })
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
      say('留言已发出。', 'ok');
      toast('留言已发出');
    } catch (err) {
      hint.textContent = `公开留言暂时不可用，改为发到 ${guestbookEmail()}。`;
      say('公开留言暂时不可用，已改为邮件发送。', 'err');
      guestMailto(nickname, message, hint);
    } finally { submit.disabled = false; }
  });
}

/* ---------------- 路由 ---------------- */
function parseRoute() {
  const raw = (location.hash || '#/').replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean);
  if (!parts.length) return { name: 'home', id: null };
  if (parts[0] === 'internship') return { name: 'internship', id: parts[1] || null };
  if (parts[0] === 'experience') return { name: 'experience', id: null };
  if (parts[0] === 'interest') return { name: 'interest', id: parts[1] || null };
  if (parts[0] === 'work') return parts[1] ? { name: 'work', id: parts[1] } : { name: 'experience', id: null };
  if (parts[0] === 'tools') return { name: 'tools', id: parts[1] || null };
  return { name: 'home', id: null };
}

function revealIn() {
  const els = $$('.reveal');
  els.forEach((el) => el.classList.add('is-in'));
}

function renderClosedBranch(branch) {
  return `<section class="v5-page-head wrap">${backBar()}<p class="v5-kicker">BRANCH CLOSED</p><h1>${esc(branch.label || '这个分支')}暂时关闭</h1><p>该分支已在后台隐藏。你仍然可以从底部入口进入经典版，或在后台重新启用它。</p><div class="v5-actions"><a class="v5-btn v5-btn--primary" href="#/">回到主页 ${ARROW}</a></div></section>`;
}

async function render(scrollTop = false) {
  state.route = parseRoute();
  const view = $('#view');
  const titles = { home: '首页', internship: '实习', experience: '经历', interest: '兴趣', work: '项目', tools: '工具箱' };
  document.title = `${state.data.site.brand || '孙志昊'} · ${titles[state.route.name] || '首页'}`;

  const branch = (state.data.branches || []).find((b) => b.id === state.route.name);
  let html = '';
  if (branch && branch.visible === false) html = renderClosedBranch(branch);
  else if (state.route.name === 'internship') html = renderInternship();
  else if (state.route.name === 'experience') html = renderExperience();
  else if (state.route.name === 'interest') html = renderInterest(state.route.id);
  else if (state.route.name === 'work' && state.route.id) html = renderCase(state.route.id);
  else if (state.route.name === 'tools' && state.route.id) html = await renderTool(state.route.id);
  else if (state.route.name === 'tools') html = renderTools();
  else html = renderHome();

  view.innerHTML = html;
  updateNavActive();
  revealIn();

  if (state.route.name === 'home') {
    $$('.v5-h1 .v5-h1-ch', view).forEach((ch, i) => waapi(ch, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 320, delay: i * 60, easing: EASE_IN, fill: 'backwards' }));
  }
  if (state.route.name === 'tools') {
    $$('.v5-count', view).forEach((el) => countUp(el, el.dataset.count, 400));
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && view.animate) {
    view.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
  if (scrollTop && (state.route.name !== 'home')) window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}

/* ---------------- 初始化 ---------------- */
async function boot() {
  applyTheme(currentTheme());
  $('#themeBtn')?.addEventListener('click', () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
  $('#menuBtn')?.addEventListener('click', () => {
    const nav = $('#nav');
    const btn = $('#menuBtn');
    if (nav.classList.contains('is-open')) {
      const done = () => { nav.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); };
      const anim = waapi(nav, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-12px)' }], { duration: 200, easing: EASE_OUT });
      if (anim) anim.onfinish = done; else done();
    } else {
      nav.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      waapi(nav, [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 200, easing: EASE_IN });
    }
  });
  $('#nav')?.addEventListener('click', () => {
    const nav = $('#nav');
    const btn = $('#menuBtn');
    if (!nav.classList.contains('is-open')) return;
    const done = () => { nav.classList.remove('is-open'); btn?.setAttribute('aria-expanded', 'false'); };
    const anim = waapi(nav, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-12px)' }], { duration: 200, easing: EASE_OUT });
    if (anim) anim.onfinish = done; else done();
  });

  try {
    state.data = await loadData();
  } catch (err) {
    $('#view').innerHTML = `<section class="v5-page-head wrap"><h1>站点数据加载失败</h1><p>${esc(err.message)}。请确认服务已启动，或检查 /data/site.json 是否存在。</p></section>`;
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
  window.addEventListener('scroll', () => $('#topbar')?.classList.toggle('is-scrolled', window.scrollY > 8), { passive: true });

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
      es.addEventListener('error', () => { /* static fallback */ });
    } catch (err) { /* EventSource unavailable */ }
  }
}

boot();
