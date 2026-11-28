import { initAiDock } from './ai-dock.js';
import { SITE_TEXT } from './site-text.js';

/* 前台应用：数据加载 / 路由 / 视图 / 主题 / 留言 / 工具 */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
  data: null,
  route: { name: 'home', id: null },
  source: 'api',
};

/* 统一文案读取：字段在 site-text.js，模板里不再写死中文。 */
function tx(path, fallback = '', vars) {
  const parts = String(path || '').split('.');
  let cur = SITE_TEXT;
  for (const part of parts) {
    if (!cur || typeof cur !== 'object') { cur = undefined; break; }
    cur = cur[part];
  }
  let value = typeof cur === 'string' ? cur : String(fallback || '');
  if (vars && typeof vars === 'object') {
    value = value.replace(/\{(\w+)\}/g, (m, key) => (vars[key] == null ? m : String(vars[key])));
  }
  return value;
}

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

/* 缩略图约定：/assets/... 或 /uploads/... 原图，对应 /assets/thumbs/<原路径>.webp。
   缩略图不存在时，容器底色兜底，原图仍会正常淡入。 */
function thumbUrl(src) {
  const value = String(src || '').trim();
  if (!/^\/(?:assets|uploads)\//i.test(value)) return value;
  return `/assets/thumbs/${value.replace(/^\/+/, '')}.webp`;
}

function normalizePhotos(list) {
  return (Array.isArray(list) ? list : []).map((item) => {
    if (typeof item === 'string') return { src: item, alt: '', caption: '', date: '' };
    return {
      src: item && (item.src || item.url || item.image) || '',
      alt: (item && (item.alt || item.title)) || '',
      caption: (item && (item.caption || item.desc || item.text)) || '',
      date: (item && (item.date || item.time)) || '',
    };
  }).filter((item) => item.src);
}

function photoDateText(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : raw;
}

/* 渐进加载图片：缩略图模糊垫底，原图加载完成后淡入。
   opts.loading = eager|lazy；opts.priority = high。 */
function imageFrame(src, alt = '', opts = {}) {
  const full = safeUrl(src);
  const thumb = thumbUrl(src);
  const loading = opts.loading || 'lazy';
  const priority = opts.priority ? ` fetchpriority="${esc(opts.priority)}"` : '';
  const hasThumb = thumb && thumb !== src;
  return `<span class="v5-img-frame">
    ${hasThumb ? `<img class="v5-img-thumb" src="${safeUrl(thumb)}" alt="" aria-hidden="true" loading="${esc(loading)}" decoding="async">` : ''}
    <img class="v5-img-full v5-progressive" src="${full}" alt="${esc(alt)}" loading="${esc(loading)}" decoding="async"${priority}>
    <span class="v5-img-spin" aria-hidden="true"></span>
  </span>`;
}

function hydrateImages(root = document) {
  $$('img.v5-progressive', root).forEach((img) => {
    const mark = () => img.classList.add('is-loaded');
    if (img.complete && img.naturalWidth) mark();
    else img.addEventListener('load', mark, { once: true });
    img.addEventListener('error', () => img.classList.add('is-error'), { once: true });
  });
  $$('img.v5-img-thumb', root).forEach((img) => {
    img.addEventListener('error', () => img.classList.add('is-empty'), { once: true });
  });
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
  return `<div class="v5-backbar"><a class="v5-back" href="#/">${BACK_ARROW} ${esc(tx('common.backHome', '返回首页'))}</a>${extra}</div>`;
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
    btn.setAttribute('aria-label', theme === 'dark' ? tx('common.themeToLight', '') : tx('common.themeToDark', ''));
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
  if (!res.ok) throw new Error(tx('errors.loadData', ''));
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
    admin.title = tx('common.adminEntry', '');
    admin.setAttribute('aria-label', tx('common.adminEntry', ''));
  }
}

function updateNavActive() {
  const current = state.route.name === 'work' ? 'experience' : state.route.name;
  $$('#nav a').forEach((a) => {
    a.classList.toggle('is-active', a.dataset.route === current);
  });
}

/* ---------------- 通用片段 ---------------- */
function projectCover(c, loading = 'lazy') {
  if (c.cover) {
    const first = (c.images || [])[0];
    const alt = c.coverAlt || (first && first.alt) || `${c.title || tx('common.projectFallbackTitle', '')}${tx('common.coverSuffix', '')}`;
    return imageFrame(c.cover, alt, { loading });
  }
  return `<div class="v5-cover-fallback"><span>${esc(c.number || '')}</span><b>${esc((c.title || 'C').slice(0, 1))}</b></div>`;
}

function chipTip(tag, title) {
  const notes = SITE_TEXT.tagNotes || {};
  const note = notes[tag] || notes.fallback || '';
  return tx('tagNotes.pattern', '', { tag, title, note });
}

function chips(tags = [], max = 4, context = '') {
  return `<div class="v5-chiprow">${tags.slice(0, max).map((t) => `<span class="v5-chip"${context ? ` data-tip="${esc(chipTip(t, context))}"` : ''}>${esc(t)}</span>`).join('')}</div>`;
}

function projectCard(c, index = 0) {
  if (isLocked(c)) {
    return `<article class="v5-project-card v5-locked reveal">
      <div class="v5-project-media"><div class="v5-cover-fallback v5-lock-fallback"><span aria-hidden="true">🔒</span></div><span class="v5-project-no">${String(index + 1).padStart(2, '0')}</span></div>
      <div class="v5-project-copy">
        <span class="v5-project-meta">${esc(tx('project.metaProject', ''))}</span>
        <h3 class="v5-project-title">${esc(c.title)}</h3>
        <p class="v5-project-summary">${esc(tx('project.locked', ''))}</p>
      </div>
    </article>`;
  }
  return `<a class="v5-project-card reveal v5-focus-item" href="#/work/${esc(c.id)}">
    <div class="v5-project-media v5-glare">${projectCover(c, index === 0 ? 'eager' : 'lazy')}<span class="v5-project-no">${String(index + 1).padStart(2, '0')}</span></div>
    <div class="v5-project-copy">
      <span class="v5-project-meta">${esc(c.number || '')} / ${esc(c.category === 'practice' ? tx('project.metaPractice', '') : tx('project.metaProject', ''))}</span>
      <h3 class="v5-project-title">${esc(c.title)}</h3>
      <p class="v5-project-summary">${esc(c.summary)}</p>
      ${chips(c.tags || [], 3, c.title)}
      <span class="v5-card-link">${esc(tx('project.read', ''))} ${ARROW}</span>
    </div>
  </a>`;
}

function practiceCard(c) {
  if (!c) return '';
  if (isLocked(c)) {
    return `<article class="v5-practice v5-locked reveal">
      <div class="v5-practice-media"><div class="v5-cover-fallback v5-lock-fallback"><span aria-hidden="true">🔒</span></div><span class="v5-practice-tag">${esc(tx('project.metaPractice', ''))}</span></div>
      <div class="v5-practice-copy">
        <span class="v5-project-meta">${esc(tx('project.metaPractice', ''))}</span>
        <h3 class="v5-project-title">${esc(c.title)}</h3>
        <p class="v5-project-summary">${esc(tx('project.locked', ''))}</p>
      </div>
    </article>`;
  }
  return `<a class="v5-practice reveal" href="#/work/${esc(c.id)}">
    <div class="v5-practice-media">${projectCover(c)}<span class="v5-practice-tag">${esc(tx('project.metaPractice', ''))}</span></div>
    <div class="v5-practice-copy">
      <span class="v5-project-meta">${esc(c.number || '')} / ${esc(tx('project.metaPractice', ''))}</span>
      <h3 class="v5-project-title">${esc(c.title)}</h3>
      <p class="v5-project-summary">${esc(c.summary)}</p>
      <p class="v5-practice-note">${esc(tx('project.practiceNote', ''))}</p>
      <span class="v5-card-link">${esc(tx('project.readPractice', ''))} ${ARROW}</span>
    </div>
  </a>`;
}

/* 四学段时间线：桌面左右交替，移动端统一在轴线右侧。
   每个节点保留说明和照片按钮；照片数据由后台 photos 字段提供。 */
function timelineItems(items = []) {
  return byOrder(items || []).slice(0, 4);
}

function timelineHtml(items = []) {
  const list = timelineItems(items);
  return `<div class="v5-life-timeline" data-count="${list.length}" aria-label="${esc(tx('timeline.axisLabel', '成长时间线'))}">
    <span class="v5-life-axis" aria-hidden="true"></span>
    ${list.map((item, index) => {
      if (isLocked(item)) {
        return `<article class="v5-life-item v5-life-item--${index % 2 ? 'right' : 'left'} reveal">
          <span class="v5-life-dot" aria-hidden="true"></span>
          <div class="v5-life-card">
            <div class="v5-life-head"><span class="v5-life-no">${esc(item.no || String(index + 1).padStart(2, '0'))}</span><span class="v5-life-meta">${esc(item.meta || '')}</span></div>
            <h3>${esc(item.title || item.label || '')}</h3>
            <p class="v5-life-locked">${esc(tx('common.privateNote', '该内容暂未公开'))}</p>
          </div>
        </article>`;
      }
      const photos = normalizePhotos(item.photos || item.images || []);
      const buttonLabel = item.photoLabel || (photos.length ? tx('timeline.photoButton', '看这一段的照片') : tx('timeline.noPhotoButton', '照片还在整理'));
      const body = `<div class="v5-life-head"><span class="v5-life-no">${esc(item.no || String(index + 1).padStart(2, '0'))}</span><span class="v5-life-meta">${esc(item.meta || '')}</span></div>
        <h3>${esc(item.label || '')}</h3>
        <p>${esc(item.text || '')}</p>
        <div class="v5-life-foot">
          <button class="v5-life-photo-btn${photos.length ? '' : ' is-empty'}" type="button" ${photos.length ? `data-timeline-index="${index}"` : 'disabled aria-disabled="true"'} aria-label="${esc(buttonLabel)}">
            <span class="v5-life-photo-icon" aria-hidden="true">${photos.length ? '▧' : '·'}</span>${esc(buttonLabel)} ${ARROW}
          </button>
        </div>`;
      return `<article class="v5-life-item v5-life-item--${index % 2 ? 'right' : 'left'} reveal">
        <span class="v5-life-dot" aria-hidden="true"></span>
        <div class="v5-life-card">${body}</div>
      </article>`;
    }).join('')}
  </div>`;
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
  const nodes = children.map((child, i) => {
    const no = String(i + 1).padStart(2, '0');
    if (isLocked(child)) {
      return `<div class="v5-travel-node v5-travel-node--locked v5-locked reveal" aria-label="${esc(child.title)}">
      <span class="v5-travel-node-no">${no}</span>
      <span class="v5-travel-node-copy"><strong>${esc(child.title)}</strong><small>${esc(tx('common.privateNote', '该内容暂未公开'))}</small></span>
      <span class="v5-travel-node-cover v5-lock-fallback"><span aria-hidden="true">🔒</span></span>
      <span class="v5-travel-node-arrow" aria-hidden="true">—</span>
    </div>`;
    }
    return `<a class="v5-travel-node reveal" href="#/interest/${esc(child.id)}" aria-label="${esc(tx('interest.openAlbum', '打开相册'))}：${esc(child.title)}">
      <span class="v5-travel-node-no">${no}</span>
      <span class="v5-travel-node-copy"><strong>${esc(child.title)}</strong><small>${esc(child.lead || '')}</small><em>${(child.images || []).length} ${esc(tx('common.photosUnit', '张照片'))}</em></span>
      <span class="v5-travel-node-cover">${imageFrame(child.cover, `${child.title}${tx('interest.camera', '相册')}${tx('common.coverSuffix', '')}`, { loading: i < 2 ? 'eager' : 'lazy' })}</span>
      <span class="v5-travel-node-arrow">${ARROW}</span>
    </a>`;
  }).join('');
  return `<div class="v5-travel-tree" role="group" aria-label="${esc(item.title)}${esc(tx('interest.treeGroupSuffix', ''))}">
    <div class="v5-travel-root">
      <span class="v5-travel-root-kicker">${esc(tx('interest.treeRootKicker', 'TRAVEL / PLACES'))}</span>
      <strong>${esc(item.title)}</strong>
      <span>${esc(tx('interest.treePlaces', '{count} 个地点 · {photos} 张照片', { count: children.length, photos: total }))}</span>
    </div>
    <div class="v5-travel-branches">${nodes}</div>
  </div>`;
}

function interestCard(item, index = 0) {
  if (isLocked(item)) {
    return `<article class="v5-interest-card v5-locked reveal">
      <div class="v5-interest-cover"><div class="v5-lock-fallback"><span aria-hidden="true">🔒</span></div><span>${String(index + 1).padStart(2, '0')}</span></div>
      <div class="v5-interest-copy">
        <div class="v5-interest-head"><h3>${esc(item.title)}</h3><span>0 ${esc(tx('common.photoUnit', '张'))}</span></div>
        <p>${esc(tx('common.privateNote', '该内容暂未公开'))}</p>
      </div>
    </article>`;
  }
  const count = interestPhotoCount(item);
  const first = (item.images || [])[0];
  const alt = (first && first.alt) || `${item.title || tx('common.interestFallbackTitle', '')}${tx('project.photoAltSuffix', '')}`;
  return `<a class="v5-interest-card reveal v5-focus-item" href="#/interest/${esc(item.id)}" data-interest-key="${esc(item.id)}">
    <div class="v5-interest-cover v5-glare">${imageFrame(item.cover, alt, { loading: index < 4 ? 'eager' : 'lazy', priority: index === 0 ? 'high' : '' })}<span>${String(index + 1).padStart(2, '0')}</span></div>
    <div class="v5-interest-copy">
      <div class="v5-interest-head"><h3>${esc(item.title)}</h3><span>${count} ${esc(tx('common.photoUnit', '张'))}</span></div>
      <p>${esc(item.lead || '')}</p>
      <span class="v5-card-link">${esc(tx('interest.openAlbum', '打开相册'))} ${ARROW}</span>
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
  const SKILL_FROM = SITE_TEXT.skillFrom || {};
  const skills = (about.skills || []).map((s) => `<span class="v5-skill"${SKILL_FROM[s.n] ? ` data-from="${esc(SKILL_FROM[s.n])}" tabindex="0"` : ''}>${esc(s.n)}</span>`).join('');
  const emailRaw = ((home.contacts || []).find((c) => c.label === '邮箱'));
  const fallbackEmail = tx('home.emailFallback', '');
  const email = isLocked(emailRaw) ? { value: tx('common.privateNote', ''), url: '' } : (emailRaw || { value: fallbackEmail, url: `mailto:${fallbackEmail}` });

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
      <p class="v5-hero-note">${esc(tx('home.heroNote', '现在在读，也在找嵌入式、物联网方向的实习机会。'))}</p>
    </div>
    <aside class="v5-profile">
      <div class="v5-profile-head"><span>${esc(tx('home.profileKicker', ''))}</span><span class="v5-live"><i></i>${esc(tx('home.profileOpen', ''))}</span></div>
      ${profile}
      <div class="v5-signal">
        <div class="v5-profile-row"><span>${esc(tx('home.signalLabel', ''))}</span><b class="v5-signal-val" data-signal="98.4">98.4</b></div>
        <div class="v5-signal-bar" aria-hidden="true"><i></i></div>
      </div>
      <div class="v5-profile-row"><span>${esc(tx('home.localLabel', ''))}</span><b class="v5-clock" aria-hidden="true">--:--:--</b></div>
      <p class="v5-profile-motto">${esc(tx('home.motto', '无限进步'))}</p>
    </aside>
  </section>

  <section class="v5-section wrap">
    ${sectionHead(tx('home.projectsNo', '01 / PROJECTS'), tx('home.projectsTitle', '做过的四件事'), tx('home.projectsLead', ''))}
    <div class="v5-project-grid v5-focus-group">${selected.slice(0, 4).map(projectCard).join('')}</div>
    <a class="v5-more" href="#/experience">${esc(tx('home.moreProjects', '查看全部项目与经历'))} ${ARROW}</a>
  </section>

  <section class="v5-section wrap v5-practice-section">
    ${sectionHead(tx('home.practiceNo', '02 / PRACTICE'), tx('home.practiceTitle', '公益实践'), tx('home.practiceLead', ''))}
    ${practiceCard(practice)}
  </section>

  <section class="v5-section wrap">
    ${sectionHead(tx('home.interestsNo', '03 / INTERESTS'), tx('home.interestsTitle', '离开工位以后'), tx('home.interestsLead', ''))}
    <div class="v5-interest-grid${interests.length === 4 ? ' v5-interest-grid--four' : ''} v5-focus-group">${interests.map(interestCard).join('')}</div>
    <a class="v5-more" href="#/interest">${esc(tx('home.moreInterests', '查看全部兴趣照片'))} ${ARROW}</a>
  </section>

  <section class="v5-section wrap">
    ${sectionHead(tx('home.timelineNo', '04 / EXPERIENCE'), tx('home.timelineTitle', '成长时间线'), tx('home.timelineLead', ''))}
    ${timelineHtml(timeline)}
  </section>

  <section class="v5-section wrap v5-about-section">
    ${sectionHead(tx('home.aboutNo', '05 / ABOUT'), about.title || tx('home.aboutTitle', '关于我'), about.lead || tx('home.aboutLead', ''))}
    <div class="v5-about-grid">
      <div class="v5-about-main">
        ${(about.lines || []).map((l) => `<p>${esc(l)}</p>`).join('')}
        <blockquote class="v5-motto">「${esc((about.belief && about.belief.quote) || tx('home.quoteFallback', '无限进步。'))}」</blockquote>
        <div class="v5-abilities">${abilities}</div>
      </div>
      <aside class="v5-about-side">
        <div class="v5-side-block"><span class="v5-side-label">${esc(tx('home.profileLabel', '资料 / PROFILE'))}</span>${facts}</div>
        <div class="v5-side-block"><span class="v5-side-label">${esc(tx('home.skillsLabel', '已掌握 / SKILLS'))}</span><div class="v5-skills">${skills}</div></div>
        <div class="v5-side-block"><span class="v5-side-label">${esc(tx('home.emailLabel', '邮箱 / EMAIL'))}</span><a class="v5-side-mail" href="${safeUrl(email.url)}">${email.url ? esc(tx('footer.emailSend', '邮箱 · 点击发送')) : esc(email.value)}</a></div>
      </aside>
    </div>
  </section>`;
}

/* ---------------- 实习 ---------------- */
function renderInternship() {
  const cards = (SITE_TEXT.internship.cards || []).map((card) => `<a class="v5-intern-card v5-intern-card--link reveal" href="${safeUrl(card.href)}" aria-label="${esc(card.title)}${esc(tx('common.separator', ''))}${esc(tx('internship.cardLink', ''))}">
        <span class="v5-intern-no">${esc(card.no)}</span>
        <div>
          <span class="v5-timeline-meta">${esc(card.meta)}</span>
          <h2>${esc(card.title)}</h2>
          ${(card.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join('')}
          ${chips(card.tags || [])}
          <span class="v5-card-link v5-intern-open">${esc(tx('internship.cardLink', ''))} ${ARROW}</span>
        </div>
      </a>`).join('');
  return `
  <section class="v5-page-head wrap">
    ${backBar()}
    <span class="v5-kicker">${esc(tx('internship.kicker', ''))}</span>
    <h1>${esc(tx('internship.title', ''))}</h1>
    <p>${esc(tx('internship.lead', ''))}</p>
  </section>
  <section class="v5-section wrap">
    <div class="v5-intern-grid">${cards}</div>
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
    <span class="v5-kicker">${esc(tx('experience.kicker', '02 / EXPERIENCE'))}</span>
    <h1>${esc(tx('experience.title', '项目是经历的主体'))}</h1>
    <p>${esc(tx('experience.lead', ''))}</p>
  </section>
  <section class="v5-section wrap">
    ${sectionHead(tx('experience.projectsNo', '02.1 / PROJECTS'), tx('experience.projectsTitle', '四件做过的东西'), tx('experience.projectsLead', ''))}
    <div class="v5-project-grid v5-focus-group">${selected.slice(0, 4).map(projectCard).join('')}</div>
  </section>
  <section class="v5-section wrap v5-practice-section">
    ${sectionHead(tx('experience.practiceNo', '02.2 / PRACTICE'), tx('experience.practiceTitle', '公益课'), tx('experience.practiceLead', ''))}
    ${practiceCard(practice)}
  </section>
  <section class="v5-section wrap">
    ${sectionHead(tx('experience.timelineNo', '02.3 / TIMELINE'), tx('experience.timelineTitle', '四段成长'), tx('experience.timelineLead', ''))}
    ${timelineHtml((state.data.home && state.data.home.timeline) || [])}
  </section>
  ${campus.length ? `<section class="v5-section wrap">
    ${sectionHead(tx('experience.campusNo', '02.4 / CAMPUS'), tx('experience.campusTitle', '校园里的两张照片'), tx('experience.campusLead', ''))}
    <div class="v5-campus-grid">${campus.map((item, index) => isLocked(item)
      ? `<figure class="v5-campus-card v5-locked reveal"><div class="v5-lock-fallback"><span aria-hidden="true">🔒</span></div><figcaption><strong>${esc(item.title)}</strong><span>${esc(tx('common.privateNote', '该内容暂未公开'))}</span></figcaption></figure>`
      : `<figure class="v5-campus-card reveal">
      <a class="v5-campus-media" href="${safeUrl(item.image)}" target="_blank" rel="noopener" aria-label="${esc(tx('common.viewOriginal', '查看原图'))}：${esc(item.title)}">${imageFrame(item.image, item.alt, { loading: index === 0 ? 'eager' : 'lazy' })}<span class="v5-open-tag">${esc(tx('common.originalTag', '原图 ↗'))}</span></a>
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
    if (!item) return `<section class="v5-page-head wrap">${backBar({ href: '#/interest', label: tx('common.backInterest', '返回兴趣') })}<h1>${esc(tx('errors.missingAlbum', '这个相册不存在'))}</h1></section>`;
    const parent = item.parent ? allInterests.find((x) => x.id === item.parent) : null;
    const backSub = parent ? { href: `#/interest/${parent.id}`, label: `${tx('common.backPrefix', '')}${parent.title}` } : { href: '#/interest', label: tx('common.backInterest', '返回兴趣') };
    const kicker = parent ? `${tx('interest.travelKicker', '04 / TRAVEL')} · ${parent.title}` : tx('interest.indexKicker', '04 / INTEREST');
    if (isLocked(item)) {
      return `
      <section class="v5-page-head wrap">
        ${backBar(backSub)}
        <span class="v5-kicker">${esc(kicker)}</span>
        <h1>${esc(item.title)}</h1>
        <p class="v5-locked-note"><span aria-hidden="true">🔒</span> ${esc(tx('common.privateNote', '该内容暂未公开'))}</p>
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
      ? `<section class="v5-section wrap v5-gallery-section" data-gallery-id="${esc(item.id)}">
      <div class="v5-gallery">${(item.images || []).map((img, i) => `<figure class="v5-gallery-item reveal${i === 0 ? ' is-lead' : ''}">
        <button class="v5-gallery-media" type="button" data-photo-open data-gallery-id="${esc(item.id)}" data-photo-index="${i}" aria-label="${esc(tx('common.viewOriginal', '查看原图'))}：${esc(img.alt || item.title || '')}">
          ${imageFrame(img.src, img.alt || item.title || '', { loading: i < 4 ? 'eager' : 'lazy', priority: i === 0 ? 'high' : '' })}
          <span class="v5-open-tag">${esc(tx('common.originalTag', '原图 ↗'))}</span>
        </button>
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
    <span class="v5-kicker">${esc(tx('interest.indexKicker', '04 / INTEREST'))}</span>
    <h1>${esc(tx('interest.indexTitle', '玩过的，去过的'))}</h1>
    <p>${esc(tx('interest.indexLead', ''))}</p>
  </section>
  <section class="v5-section wrap">
    <div class="v5-album-filter" role="tablist" aria-label="${esc(tx('interest.filterLabel', '相册分类'))}">
      <button class="is-active" type="button" role="tab" aria-selected="true" data-filter="all">${esc(tx('interest.filterAll', '全部'))}</button>
      ${indexInterests.map((item) => `<button type="button" role="tab" aria-selected="false" data-filter="${esc(item.id)}">${esc(item.title)}</button>`).join('')}
    </div>
    <div class="v5-interest-grid v5-interest-grid--page${indexInterests.length === 4 ? ' v5-interest-grid--four' : ''} v5-focus-group" data-interest-grid>${indexInterests.map(interestCard).join('')}</div>
  </section>`;
}

/* ---------------- 图片查看器 ---------------- */
const photoViewer = {
  open: false,
  images: [],
  index: 0,
  title: '',
  meta: '',
  note: '',
  emptyText: '',
  opener: null,
  lastFocus: null,
  touch: null,
  preloaded: new Set(),
};

function preloadPhoto(src) {
  if (!src || photoViewer.preloaded.has(src)) return;
  photoViewer.preloaded.add(src);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  } catch (err) { /* ignore */ }
}

function ensurePhotoViewer() {
  let root = $('#photoViewer');
  if (!root) {
    root = document.createElement('div');
    root.id = 'photoViewer';
    root.className = 'v5-photo-viewer';
    root.hidden = true;
    document.body.appendChild(root);
    bindPhotoViewerGlobal();
  }
  return root;
}

function photoViewerHtml() {
  const total = photoViewer.images.length;
  const current = photoViewer.images[photoViewer.index] || null;
  const title = photoViewer.title || tx('modal.titleFallback', '照片');
  const meta = photoViewer.meta || (total ? tx('modal.counter', '{current} / {total}', { current: photoViewer.index + 1, total }) : tx('modal.metaFallback', '照片'));
  const counter = total ? tx('modal.counter', '{current} / {total}', { current: photoViewer.index + 1, total }) : '';
  // 照片较多时只渲染当前附近的 9 个圆点，避免 70+ 个点撑破弹窗
  const dotStart = total > 12 ? Math.max(0, Math.min(photoViewer.index - 4, total - 9)) : 0;
  const dotEnd = total > 12 ? dotStart + 9 : total;
  const dots = total > 1 ? `<div class="v5-photo-dots" role="tablist" aria-label="${esc(tx('modal.titleFallback', '照片'))}">${photoViewer.images.slice(dotStart, dotEnd).map((_, k) => {
    const i = dotStart + k;
    return `<button type="button" class="v5-photo-dot${i === photoViewer.index ? ' is-active' : ''}" data-photo-dot="${i}" role="tab" aria-selected="${i === photoViewer.index}" aria-label="${esc(tx('modal.counter', '{current} / {total}', { current: i + 1, total }))}"></button>`;
  }).join('')}</div>` : '';
  const stage = current
    ? `<div class="v5-photo-stage" data-photo-stage>
        ${total > 1 ? `<button class="v5-photo-nav v5-photo-prev" type="button" data-photo-prev aria-label="${esc(tx('modal.prev', '上一张'))}">‹</button>` : ''}
        <figure class="v5-photo-figure">
          ${imageFrame(current.src, current.alt || title, { loading: 'eager', priority: 'high' })}
          <figcaption class="v5-photo-caption">
            ${photoDateText(current.date) ? `<time class="v5-photo-date" datetime="${esc(current.date)}">${esc(photoDateText(current.date))}</time>` : ''}
            ${current.caption ? `<span class="v5-photo-caption-text">${esc(current.caption)}</span>` : ''}
          </figcaption>
        </figure>
        ${total > 1 ? `<button class="v5-photo-nav v5-photo-next" type="button" data-photo-next aria-label="${esc(tx('modal.next', '下一张'))}">›</button>` : ''}
        <span class="v5-photo-counter">${esc(counter)}</span>
      </div>`
    : `<div class="v5-photo-stage v5-photo-empty-stage" data-photo-stage><p>${esc(photoViewer.emptyText || tx('modal.empty', '这一组还没有照片。'))}</p></div>`;
  return `<div class="v5-photo-viewer-panel" role="dialog" aria-modal="true" aria-labelledby="photoViewerTitle" tabindex="-1">
    <div class="v5-photo-viewer-head">
      <div>
        <span class="v5-photo-viewer-kicker">${esc(tx('modal.kicker', 'PHOTO / VIEWER'))}</span>
        <h2 id="photoViewerTitle">${esc(title)}</h2>
        <p>${esc(meta)}</p>
      </div>
      <button class="v5-photo-close" type="button" data-photo-close aria-label="${esc(tx('modal.close', '关闭'))}"><span aria-hidden="true">×</span></button>
    </div>
    ${stage}
    ${dots}
    <div class="v5-photo-viewer-foot">
      ${current && current.alt ? `<p class="v5-photo-alt">${esc(current.alt)}</p>` : ''}
      ${photoViewer.note ? `<p class="v5-photo-note">${esc(photoViewer.note)}</p>` : ''}
    </div>
  </div>`;
}

function renderPhotoViewer() {
  const root = ensurePhotoViewer();
  root.innerHTML = `<div class="v5-photo-backdrop" data-photo-close aria-hidden="true"></div>${photoViewerHtml()}`;
  hydrateImages(root);
  const panel = $('.v5-photo-viewer-panel', root);
  if (panel) requestAnimationFrame(() => panel.focus({ preventScroll: true }));
}

function openPhotoViewer(images, startIndex = 0, opts = {}) {
  const list = normalizePhotos(images);
  photoViewer.images = list;
  photoViewer.index = list.length ? Math.max(0, Math.min(Number(startIndex) || 0, list.length - 1)) : 0;
  photoViewer.title = opts.title || '';
  photoViewer.meta = opts.meta || '';
  photoViewer.note = opts.note || '';
  photoViewer.emptyText = opts.emptyText || '';
  photoViewer.opener = opts.opener || document.activeElement;
  photoViewer.lastFocus = photoViewer.opener;
  photoViewer.open = true;
  const root = ensurePhotoViewer();
  root.hidden = false;
  document.body.classList.add('is-photo-viewer-open');
  root.classList.remove('is-open');
  requestAnimationFrame(() => {
    root.classList.add('is-open');
    renderPhotoViewer();
  });
  if (list.length) {
    preloadPhoto(list[photoViewer.index].src);
    preloadPhoto(list[photoViewer.index - 1]?.src);
    preloadPhoto(list[photoViewer.index + 1]?.src);
  }
}

function closePhotoViewer() {
  const root = ensurePhotoViewer();
  photoViewer.open = false;
  root.classList.remove('is-open');
  document.body.classList.remove('is-photo-viewer-open');
  window.setTimeout(() => { root.hidden = true; }, 220);
  const focus = photoViewer.lastFocus;
  photoViewer.lastFocus = null;
  if (focus && typeof focus.focus === 'function') focus.focus({ preventScroll: true });
}

function goPhoto(delta) {
  const total = photoViewer.images.length;
  if (!total) return;
  photoViewer.index = (photoViewer.index + delta + total) % total;
  preloadPhoto(photoViewer.images[photoViewer.index].src);
  preloadPhoto(photoViewer.images[photoViewer.index - 1]?.src);
  preloadPhoto(photoViewer.images[photoViewer.index + 1]?.src);
  renderPhotoViewer();
}

function setPhoto(index) {
  if (!photoViewer.images.length) return;
  photoViewer.index = Math.max(0, Math.min(Number(index) || 0, photoViewer.images.length - 1));
  renderPhotoViewer();
}

function bindPhotoViewerGlobal() {
  const root = ensurePhotoViewer();
  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-photo-close]')) { closePhotoViewer(); return; }
    if (event.target.closest('[data-photo-prev]')) { goPhoto(-1); return; }
    if (event.target.closest('[data-photo-next]')) { goPhoto(1); return; }
    const dot = event.target.closest('[data-photo-dot]');
    if (dot) setPhoto(Number(dot.dataset.photoDot));
  });
  root.addEventListener('touchstart', (event) => {
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    photoViewer.touch = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  root.addEventListener('touchend', (event) => {
    if (!photoViewer.touch) return;
    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch) { photoViewer.touch = null; return; }
    const dx = touch.clientX - photoViewer.touch.x;
    const dy = touch.clientY - photoViewer.touch.y;
    photoViewer.touch = null;
    // 只处理明确的横向滑动，避免上下浏览时误触切图。
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.35) {
      goPhoto(dx < 0 ? 1 : -1);
    }
  }, { passive: true });
  document.addEventListener('keydown', (event) => {
    if (!photoViewer.open) return;
    const key = event.key || '';
    const code = event.code || '';
    if (key === 'Escape' || key === 'Esc' || code === 'Escape') { event.preventDefault(); closePhotoViewer(); }
    else if (key === 'ArrowLeft' || key === 'Left' || code === 'ArrowLeft') { event.preventDefault(); goPhoto(-1); }
    else if (key === 'ArrowRight' || key === 'Right' || code === 'ArrowRight') { event.preventDefault(); goPhoto(1); }
  });
}

/* ---------------- 相册筛选 / 图片入口 ---------------- */
function bindAlbumFilter(root) {
  const bar = $('.v5-album-filter', root);
  const grid = $('[data-interest-grid]', root);
  if (!bar || !grid) return;
  const cards = $$('.v5-interest-card', grid);
  bar.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    const value = button.dataset.filter || 'all';
    $$('button[data-filter]', bar).forEach((item) => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    cards.forEach((card) => {
      const show = value === 'all' || card.dataset.interestKey === value;
      if (show) {
        card.style.display = '';
        requestAnimationFrame(() => card.classList.remove('is-filtered-out'));
      } else {
        card.classList.add('is-filtered-out');
        window.setTimeout(() => { if (card.classList.contains('is-filtered-out')) card.style.display = 'none'; }, 200);
      }
    });
  });
}

function bindPhotoEntries(root) {
  $$('[data-photo-open]', root).forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const galleryId = button.dataset.galleryId;
      if (galleryId) {
        const item = (state.data.interests || []).find((x) => x.id === galleryId);
        if (!item) return;
        const images = normalizePhotos(item.images || []);
        openPhotoViewer(images, Number(button.dataset.photoIndex) || 0, {
          title: item.title,
          meta: tx('interest.photoCount', '{count} 张', { count: images.length }),
          note: item.lead || '',
          opener: button,
        });
        return;
      }
      const json = button.dataset.photoJson;
      if (json) {
        try {
          const images = normalizePhotos(JSON.parse(json));
          openPhotoViewer(images, Number(button.dataset.photoIndex) || 0, {
            title: tx('modal.titleFallback', '照片'),
            meta: tx('interest.photoCount', '{count} 张', { count: images.length }),
            opener: button,
          });
        } catch (err) { /* ignore */ }
      }
    });
  });
}

function bindTimelinePhotos(root) {
  $$('[data-timeline-index]', root).forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.timelineIndex);
      const item = timelineItems((state.data.home && state.data.home.timeline) || [])[index];
      if (!item) return;
      const photos = normalizePhotos(item.photos || item.images || []);
      openPhotoViewer(photos, 0, {
        title: item.label || item.title || tx('modal.titleFallback', '照片'),
        meta: item.meta || '',
        note: item.modalNote || (photos.length ? item.text : tx('timeline.emptyNote', '先留下文字，照片以后再补。')),
        emptyText: tx('timeline.emptyPhotos', '这一段的照片还在整理。'),
        opener: button,
      });
    });
  });
}

/* ---------------- 项目详情 ---------------- */
function renderCase(id) {
  const c = (state.data.work.cases || []).find((x) => x.id === id);
  if (!c) return `<section class="v5-page-head wrap">${backBar({ href: '#/experience', label: tx('case.back', '返回经历') })}<h1>${esc(tx('case.notFound', '内容不存在'))}</h1></section>`;
  if (isLocked(c)) {
    return `
    <section class="v5-page-head wrap">
      ${backBar({ href: '#/experience', label: tx('case.back', '返回经历') })}
      <span class="v5-kicker">${esc(tx('case.kickerProject', 'PROJECT'))}</span>
      <h1>${esc(c.title)}</h1>
      <p class="v5-locked-note"><span aria-hidden="true">🔒</span> ${esc(tx('common.privateNote', '该内容暂未公开'))}</p>
    </section>`;
  }

  const sections = (c.sections || []).map((s) => `<h2>${esc(s.h)}</h2><p>${esc(s.p)}</p>`).join('');
  const rawImages = c.images || [];
  const images = rawImages.map((img) => typeof img === 'string' ? { src: img, alt: c.title, caption: '' } : img);
  const tags = (c.tags || []).map((t) => `<span class="v5-skill" data-tip="${esc(chipTip(t, c.title))}">${esc(t)}</span>`).join('');
  const links = (c.links || []).map((l) => `<a class="v5-btn" href="${safeUrl(l.url)}" target="_blank" rel="noopener">${esc(l.text)} ${ARROW}</a>`).join('');
  const cat = c.category === 'practice' ? tx('case.kickerPractice', 'PRACTICE') : tx('case.kickerProject', 'PROJECT');

  return `
  <section class="v5-page-head wrap">
    ${backBar({ href: '#/experience', label: tx('case.back', '返回经历') })}
    <span class="v5-kicker">${esc(cat)} / ${esc(c.number || '')}</span>
    <h1>${esc(c.title)}</h1>
    <p>${esc(c.summary)}</p>
  </section>
  <section class="v5-detail wrap">
    <a class="v5-detail-cover" href="${safeUrl(c.cover)}" target="_blank" rel="noopener" aria-label="${esc(tx('common.viewOriginal', '查看原图'))}">
      ${imageFrame(c.cover, `${c.title} ${tx('case.coverAlt', '封面')}`, { loading: 'eager', priority: 'high' })}
      <span class="v5-cover-org">${esc(c.org || '')}</span><span class="v5-open-tag">${esc(tx('common.originalTag', '原图 ↗'))}</span>
    </a>
    <dl class="v5-detail-meta">
      <div><dt>${esc(tx('case.metaOrg', '归属'))}</dt><dd>${esc(c.org || '—')}</dd></div>
      <div><dt>${esc(tx('case.metaPeriod', '时间'))}</dt><dd>${esc(c.period || '—')}</dd></div>
      <div><dt>${esc(tx('case.metaRole', '角色'))}</dt><dd>${esc(c.role || '—')}</dd></div>
      <div><dt>${esc(tx('case.metaCategory', '分类'))}</dt><dd>${esc(c.category === 'practice' ? tx('case.categoryPractice', '公益实践') : tx('case.categoryProject', '项目'))}</dd></div>
    </dl>
    <div class="v5-detail-body">
      <div class="v5-detail-sections">${sections}</div>
      <aside class="v5-detail-side">
        <div class="v5-side-block"><span class="v5-side-label">${esc(tx('case.tags', '标签 / TAGS'))}</span><div class="v5-skills">${tags || `<span class="v5-muted">${esc(tx('case.empty', '暂无'))}</span>`}</div></div>
        ${images.length ? `<div class="v5-detail-images">${images.map((img, index) => `<figure><button class="v5-detail-img" type="button" data-photo-open data-photo-json="${esc(JSON.stringify(images.map((x) => ({ src: x.src, alt: x.alt || c.title, caption: x.caption || '' }))))}" data-photo-index="${index}" aria-label="${esc(tx('common.viewOriginal', '查看原图'))}：${esc(img.alt || c.title)}">${imageFrame(img.src, img.alt || c.title, { loading: index === 0 ? 'eager' : 'lazy' })}<span class="v5-open-tag">${esc(tx('common.originalTag', '原图 ↗'))}</span></button><figcaption>${esc(img.caption || '')}</figcaption></figure>`).join('')}</div>` : ''}
        ${c.result ? `<div class="v5-result"><span class="v5-side-label">${esc(tx('case.result', '留下什么 / RESULT'))}</span><p>${esc(c.result)}</p></div>` : ''}
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
        <span class="v5-project-meta">${esc(tx('tools.cardTool', '工具'))}</span>
        <h3>${esc(t.title || t.name || '')}</h3>
        <p class="v5-tool-problem">${esc(tx('common.privateNote', '该内容暂未公开'))}</p>
      </span>
    </article>`;
  }
  return `<a class="v5-tool-card reveal" href="#/tools/${esc(t.id)}" data-tool-id="${esc(t.id)}">
    <span class="v5-tool-icon">${toolIcon(t.id)}</span>
    <span class="v5-tool-body">
      <span class="v5-project-meta">${esc(t.category === 'convert' ? tx('tools.cardConvert', '转换') : tx('tools.cardQuery', '查询'))}</span>
      <h3>${esc(t.name)}</h3>
      <p class="v5-tool-problem">${esc(t.problem || t.desc || '')}</p>
      <p class="v5-tool-prereq">${esc(tx('tools.cardPrereq', '使用前提：'))}${esc(t.prereq || '在浏览器本地运行。')}</p>
    </span>
    <span class="v5-tool-go"><span>${esc(tx('tools.cardAction', '立即使用'))}</span>${ARROW}</span>
  </a>`;
}

function featuredToolCard(t) {
  if (!t) return '';
  return `<a class="v5-feature-tool reveal" href="#/tools/${esc(t.id)}" data-tool-id="${esc(t.id)}" aria-label="${esc(tx('tools.featuredAction', '立即使用'))}：${esc(t.name)}">
    <span class="v5-feature-tool-icon">${toolIcon(t.id)}</span>
    <span class="v5-feature-tool-copy">
      <span class="v5-kicker">${esc(tx('tools.featuredKicker', 'CORE / CONVERTER'))}</span>
      <h2>${esc(t.name || tx('tools.featuredTitle', '文件转换台'))}</h2>
      <p>${esc(t.desc || t.problem || tx('tools.featuredLead', ''))}</p>
      <span class="v5-feature-tool-action">${esc(tx('tools.featuredAction', '立即使用'))} ${ARROW}</span>
    </span>
    <span class="v5-feature-tool-glow" aria-hidden="true"></span>
  </a>`;
}

function renderTools() {
  const tools = state.data.tools || {};
  const list = toolModules();
  const featured = list.find((t) => t.featured || t.id === 'converter') || list[0];
  const utilities = list.filter((t) => t !== featured).slice(0, 5);
  const cards = utilities.map(toolCard).join('');
  const count = (featured ? 1 : 0) + utilities.length;

  return `
  <section class="v5-page-head wrap">
    ${backBar()}
    <span class="v5-kicker">${esc(tx('tools.kicker', '05 / TOOLS'))}</span>
    <h1>${esc(tools.title || tx('tools.featuredTitle', '在线工具箱'))}</h1>
    <p>${esc(tools.intro || '')}</p>
  </section>
  <section class="v5-section wrap">
    <div class="v5-tools-status"><span><i></i>${esc(tx('tools.statusReady', 'LOCAL ENGINE / READY'))}</span><span><span class="v5-count" data-count="${count}" data-tip="${esc(tx('tools.statusTip', '自建在线工具'))}" tabindex="0">${count}</span> ${esc(tx('tools.unit', '个'))}${esc(tx('tools.unitSuffix', '工具'))}</span><span>${esc(tx('tools.statusLocal', 'NO SERVER / NO UPLOAD'))}</span></div>
    ${featuredToolCard(featured)}
    <div class="v5-tools-sub">${sectionHead(tx('tools.utilitiesKicker', '05.1 / UTILITIES'), tx('tools.utilitiesTitle', '常用的几个'), tx('tools.utilitiesLead', ''))}</div>
    <div class="v5-tool-grid v5-tool-grid--five">${cards || `<p class="v5-empty">${esc(tx('tools.empty', '工具正在整理。'))}</p>`}</div>
  </section>`;
}

async function renderTool(id) {
  const enabled = toolModules().find((t) => t.id === id);
  const item = enabled || (state.data.tools.items || []).find((t) => t.id === id);
  if (!item) {
    return `<section class="v5-page-head wrap">${backBar({ href: '#/tools', label: tx('tools.back', '返回工具') })}<h1>${esc(tx('tools.missing', '工具不存在或已关闭'))}</h1></section>`;
  }
  if (isLocked(item)) {
    return `
    <section class="v5-page-head wrap">
      ${backBar({ href: '#/tools', label: tx('tools.back', '返回工具') })}
      <span class="v5-kicker">${esc(tx('tools.detailKicker', 'TOOL'))}</span>
      <h1>${esc(item.title || item.name || '')}</h1>
      <p class="v5-locked-note"><span aria-hidden="true">🔒</span> ${esc(tx('common.privateNote', '该内容暂未公开'))}</p>
    </section>`;
  }
  if (!enabled) {
    return `<section class="v5-page-head wrap">${backBar({ href: '#/tools', label: tx('tools.back', '返回工具') })}<h1>${esc(tx('tools.missing', '工具不存在或已关闭'))}</h1></section>`;
  }
  const head = `
  <section class="v5-page-head wrap">
    ${backBar({ href: '#/tools', label: tx('tools.back', '返回工具') })}
    <div class="v5-tool-title"><span class="v5-tool-icon">${toolIcon(item.id)}</span><div><span class="v5-kicker">${esc(tx('tools.detailKicker', 'TOOL'))} / ${esc(item.id.toUpperCase())}</span><h1>${esc(item.name)}</h1></div></div>
    <p>${esc(item.desc || '')}</p>
    <p class="v5-tool-prereq">${esc(tx('tools.problem', '解决什么问题：'))}${esc(item.problem || '')}　${esc(tx('tools.cardPrereq', '使用前提：'))}${esc(item.prereq || '在浏览器本地运行。')}</p>
  </section>
  <section class="v5-section wrap"><div class="tool-panel" id="toolPanel"><p class="tool-loading">${esc(tx('tools.loadingModule', '模块加载中…'))}</p></div></section>`;

  setTimeout(async () => {
    const panel = $('#toolPanel');
    if (!panel) return;
    try {
      const stamp = Date.now();
      const mod = await import(`/tools/${item.module}?v=${stamp}`);
      if (typeof mod.render !== 'function') throw new Error(tx('errors.missingRender', '模块缺少 render 函数'));
      panel.innerHTML = '';
      await mod.render(panel, { toast, item });
    } catch (err) {
      panel.innerHTML = `<p class="tool-error">${esc(tx('errors.tool', '工具加载失败'))}：${esc(err.message)}</p>`;
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
      const inner = `<span class="foot-contact-label">${esc(c.title || c.label || '')}</span><span class="foot-contact-value">${esc(tx('footer.emailLocked', '暂未公开'))}</span>`;
      return `<span class="foot-contact-item">${inner}</span>`;
    }
    const inner = `<span class="foot-contact-label">${esc(c.label)}</span><span class="foot-contact-value">${(c.label || '').includes('邮箱') && c.url ? esc(tx('footer.emailSend', '邮箱 · 点击发送')) : esc(c.value)}</span>`;
    if (c.url) return `<a class="foot-contact-item" href="${safeUrl(c.url)}" ${String(c.url).startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${inner}<span class="foot-contact-arrow">${ARROW}</span></a>`;
    return `<span class="foot-contact-item">${inner}</span>`;
  }).join('');
  const adminLink = state.source === 'api' ? `<a href="/admin">${esc(tx('footer.admin', '后台管理'))}</a>` : '';
  const avatars = (SITE_TEXT.footer.avatars || []).map((a) => `<button class="v5-avatar" type="button" data-name="${esc(a.name)}" data-role="${esc(a.role)}" data-sub="${esc(a.sub)}" aria-label="${esc(a.label)}">
            ${imageFrame(a.image, '', { loading: 'lazy' })}
          </button>`).join('');
  return `<div class="wrap">
    <div class="foot-kicker"><span>${esc(tx('footer.contactKicker', 'CONTACT'))}</span><span class="foot-status"><i></i>${esc(tx('footer.open', 'OPEN TO INTERNSHIP'))}</span></div>
    <div class="foot-top">
      <div>
        <h2 class="foot-title">${esc(tx('footer.titleA', '有想法，'))}<br>${esc(tx('footer.titleB', '随时聊。'))}</h2>
        ${email ? (isLocked(email) ? `<span class="foot-mail">${esc(tx('footer.emailLocked', '暂未公开'))}</span>` : `<a class="foot-mail" href="${safeUrl(email.url || 'mailto:' + email.value)}">${email.url ? esc(tx('footer.emailSend', '邮箱 · 点击发送')) : esc(email.value)}</a>`) : ''}
        <p class="foot-motto">${esc(tx('footer.motto', '无限进步'))}</p>
        <div class="v5-avatar-group" role="group" aria-label="${esc(tx('footer.avatarGroupLabel', ''))}">${avatars}</div>
      </div>
      <div class="foot-contact-list">
        ${contactItems}
        <p class="foot-issue">${esc(tx('footer.issue', ''))}</p>
      </div>
    </div>
    <section class="foot-guest" id="guestbook" aria-labelledby="guestbookTitle">
      <div class="foot-guest-head">
        <div>
          <span class="mini-label">${esc(tx('footer.guestKicker', 'GUESTBOOK / ANON'))}</span>
          <h3 id="guestbookTitle">${esc(tx('footer.guestTitle', '留言'))}</h3>
          <p id="guestMode">${esc(tx('footer.guestLead', ''))}</p>
        </div>
        <span class="foot-guest-count" id="guestCount" hidden></span>
      </div>
      <form class="guest-form" id="guestForm" novalidate>
        <div class="guest-field guest-field--name"><label for="guestName">${esc(tx('footer.nameLabel', '昵称'))}</label><input id="guestName" name="nickname" maxlength="20" autocomplete="nickname" placeholder="${esc(tx('footer.namePlaceholder', '你的昵称'))}" required></div>
        <div class="guest-field guest-field--text"><label for="guestText">${esc(tx('footer.textLabel', '留言'))}</label><textarea id="guestText" name="text" maxlength="500" rows="4" placeholder="${esc(tx('footer.textPlaceholder', '想说的话，最多 500 字。'))}" required></textarea></div>
        <div class="guest-honeypot" aria-hidden="true"><label>${esc(tx('footer.guestHoneypot', ''))}<input name="website" tabindex="-1" autocomplete="off"></label></div>
        <div class="guest-actions"><span class="guest-hint" id="guestHint">${esc(tx('footer.guestHint', ''))}</span><button type="submit" class="v5-btn v5-btn--primary" id="guestSubmit">${esc(tx('footer.guestSubmit', '发送留言'))} ${ARROW}</button></div>
        <p class="guest-status" id="guestStatus" role="status" aria-live="polite"></p>
      </form>
      <div class="guest-list" id="guestList" hidden></div>
    </section>
    <div class="foot-links foot-links--meta">
      ${adminLink}
      <a href="/classic/">${esc(tx('footer.classic', '经典版'))} ${ARROW}</a>
      <a href="#/">${esc(tx('common.backTop', '回到顶部 ↑'))}</a>
    </div>
    <div class="foot-bottom"><span>${esc(state.data.site.footer || '')}</span><span class="foot-credit">${esc(tx('footer.credit', ''))}</span><span>${esc(tx('footer.build', 'BUILD 5.0 / 2026.11'))}</span></div>
  </div>`;
}

function guestbookEndpoint() {
  const configured = String(window.SZH_GUESTBOOK_ENDPOINT || '').trim();
  if (configured) return configured.replace(/\/+$/, '');
  return state.source === 'api' ? '/api/guestbook' : '';
}

function guestbookEmail() {
  const contact = ((state.data.home && state.data.home.contacts) || []).find((c) => (c.label || '').includes('邮箱'));
  return (contact && contact.value) || tx('home.emailFallback', '');
}

function guestTime(iso) {
  try {
    return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch (err) { return ''; }
}

function guestMessageHtml(item) {
  return `<article class="guest-item"><div class="guest-item-head"><strong>${esc(item.nickname || tx('common.anonymous', ''))}</strong><time>${esc(guestTime(item.at))}</time></div><p>${esc(item.text || '')}</p></article>`;
}

function guestMailto(nickname, text, hint) {
  const email = guestbookEmail();
  const subject = tx('footer.guestMailSubject', '', { name: nickname });
  const body = tx('footer.guestMailBody', '', { name: nickname, text });
  window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  if (hint) hint.textContent = tx('footer.guestMailHint', '已打开邮件应用。如果没有反应，请使用页脚的邮箱入口。');
  toast(tx('footer.guestMail', '已打开邮件应用'));
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
    count.textContent = tx('footer.guestCount', '{count} 条', { count: items.length });
    list.hidden = false;
    list.innerHTML = items.length ? items.map(guestMessageHtml).join('') : `<p class="guest-empty">${esc(tx('footer.guestEmpty', '还没有留言，来做第一个。'))}</p>`;
  } catch (err) {
    hint.textContent = tx('footer.guestUnavailable', '留言服务暂时不可用；提交时会改为发到站内邮箱。');
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
    hint.textContent = tx('footer.guestPublic', '留言会公开显示在下方，不用登录。');
    refreshGuestbook(list, count, hint);
  } else {
    hint.textContent = tx('footer.guestStatic', '静态站点：提交后会打开邮件应用，发到站内邮箱。');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const nickname = String(name.value || '').trim();
    const message = String(text.value || '').trim();
    if (!nickname) { const message = tx('footer.guestBadName', '先留一个昵称。'); say(message, 'err'); toast(message); name.focus(); return; }
    if (!message) { const notice = tx('footer.guestBadText', '留言内容不能为空。'); say(notice, 'err'); toast(notice); text.focus(); return; }
    try { localStorage.setItem('pf-guest-name', nickname); } catch (err) { /* ignore */ }
    if (!endpoint) { say(tx('footer.guestStatic', '静态站点：提交后会打开邮件应用，发到站内邮箱。'), 'ok'); guestMailto(nickname, message, hint); return; }

    submit.disabled = true;
    say(tx('footer.guestSending', '发送中…'));
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, text: message, website: String(form.querySelector('[name="website"]')?.value || '') })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || tx('footer.guestMailError', ''));
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
        count.textContent = tx('footer.guestCount', '{count} 条', { count: current + 1 });
      }
      hint.textContent = tx('footer.guestSent', '留言已发出。');
      say(tx('footer.guestSent', '留言已发出。'), 'ok');
      toast(tx('footer.guestSent', '留言已发出。'));
    } catch (err) {
      hint.textContent = tx('footer.guestMailStatus', '公开留言暂时不可用，改为发到站内邮箱。');
      say(tx('footer.guestMailFallback', '公开留言暂时不可用，已改为邮件发送。'), 'err');
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
  return `<section class="v5-page-head wrap">${backBar()}<p class="v5-kicker">${esc(tx('branchClosed.kicker', ''))}</p><h1>${esc(branch.label || tx('branchClosed.fallbackName', ''))}${esc(tx('branchClosed.titleSuffix', ''))}</h1><p>${esc(tx('branchClosed.lead', ''))}</p><div class="v5-actions"><a class="v5-btn v5-btn--primary" href="#/">${esc(tx('branchClosed.action', ''))} ${ARROW}</a></div></section>`;
}

async function render(scrollTop = false) {
  state.route = parseRoute();
  const view = $('#view');
  const titles = { home: tx('nav.home', ''), internship: tx('nav.internship', ''), experience: tx('nav.experience', ''), interest: tx('nav.interest', ''), work: tx('nav.work', ''), tools: tx('nav.tools', '') };
  document.title = `${state.data.site.brand || tx('common.brandFallback', '')} · ${titles[state.route.name] || titles.home}`;

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
  hydrateImages(view);
  bindAlbumFilter(view);
  bindPhotoEntries(view);
  bindTimelinePhotos(view);
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
    $('#view').innerHTML = `<section class="v5-page-head wrap"><h1>${esc(tx('errors.data', ''))}</h1><p>${esc(err.message)}。${esc(tx('errors.dataHint', ''))}</p></section>`;
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
            toast(tx('common.updated', ''));
          } catch (err) { /* ignore */ }
        }, 500);
      });
      es.addEventListener('error', () => { /* static fallback */ });
    } catch (err) { /* EventSource unavailable */ }
  }
}

boot();
