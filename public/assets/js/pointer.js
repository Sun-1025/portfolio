/* pointer.js — v6 光标探针 / 读数响应 / 数据出处
   一个 rAF、一个 pointermove、一个 pointerdown/up、一个 pointerleave。 */
(() => {
  'use strict';
  if (window.__v6Pointer) return;
  window.__v6Pointer = true;

  const doc = document;
  const root = doc.documentElement;
  const bus = window.PointerBus;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const LINK_SEL = 'a, button, [role="button"], input, textarea, .v5-project-card, .v5-tool-card';
  const TIP_SEL = '.v5-skill[data-from], [data-tip]';

  /* ---------------- 第一件：光标 ---------------- */
  let cursor = null, dot = null, ring = null;
  let tx = -100, ty = -100, rx = -100, ry = -100;
  let cursorRaf = 0;
  function frame() {
    cursorRaf = 0;
    rx += (tx - rx) * 0.16;
    ry += (ty - ry) * 0.16;
    if (dot) dot.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
    if (ring) ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
    if (Math.abs(tx - rx) > 0.06 || Math.abs(ty - ry) > 0.06) {
      cursorRaf = requestAnimationFrame(frame);
    } else {
      rx = tx; ry = ty;
      if (ring) ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
    }
  }
  function startCursor() {
    if (cursor && !cursorRaf) cursorRaf = requestAnimationFrame(frame);
  }
  if (fine && !reduce) {
    root.dataset.cursor = 'on';
    cursor = doc.createElement('div');
    cursor.className = 'v6-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = '<span class="v6-cursor-dot"></span><span class="v6-cursor-ring"><span class="v6-cursor-glyph">↗</span></span>';
    doc.body.appendChild(cursor);
    dot = cursor.querySelector('.v6-cursor-dot');
    ring = cursor.querySelector('.v6-cursor-ring');
  }

  /* ---------------- 第三件：共享 tooltip ---------------- */
  const tip = doc.createElement('div');
  tip.className = 'v6-tip';
  tip.setAttribute('aria-hidden', 'true');
  doc.body.appendChild(tip);
  let tipEl = null, tipOn = false, tipTimer = 0;
  function tipText(el) { return el.getAttribute('data-from') || el.getAttribute('data-tip') || ''; }
  function tipPlace(x, y) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = tip.offsetWidth || 240, h = tip.offsetHeight || 40;
    let px = x + 14, py = y + 16;
    if (vw - x < 120) px = x - w - 14;      /* 距视口右 <120px 翻转 */
    if (vh - y < 120) py = y - h - 16;      /* 距视口下 <120px 翻转 */
    tip.style.transform = 'translate3d(' + Math.max(6, px) + 'px,' + Math.max(6, py) + 'px,0)';
  }
  function tipShow(el, x, y) {
    if (!el) return;
    tipEl = el; tipOn = true;
    tip.textContent = tipText(el);
    tip.classList.add('is-on');
    tipPlace(x, y);
  }
  function tipHide() {
    tipOn = false; tipEl = null;
    window.clearTimeout(tipTimer);
    tip.classList.remove('is-on');
  }

  /* ---------------- 第三件：h3 竖括号 ---------------- */
  let bracketEl = null;
  function setBracket(h3) {
    if (h3 === bracketEl) return;
    if (bracketEl) bracketEl.classList.remove('v6-bracket');
    bracketEl = h3;
    if (h3) h3.classList.add('v6-bracket');
  }

  /* ---------------- 第二件：SIGNAL 抖动（120px 半径，一次） ---------------- */
  let sigArmed = true, sigTimer = 0;
  function signalCheck(x, y) {
    const wrap = doc.querySelector('.v5-signal');
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
    if (d <= 120) {
      if (sigArmed) {
        sigArmed = false;
        if (!reduce) {
          const el = wrap.querySelector('.v5-signal-val');
          const bar = wrap.querySelector('.v5-signal-bar i');
          const base = parseFloat((el && el.dataset.signal) || '98.4');
          const hi = Math.min(100, +(base + 0.2).toFixed(1)); /* ±0.3 内抖一次，示例 98.4 → 98.6 → 98.4 */
          el.textContent = hi.toFixed(1);
          if (bar) bar.style.transform = 'scaleX(' + hi / 100 + ')';
          sigTimer = window.setTimeout(() => {
            el.textContent = base.toFixed(1);
            if (bar) bar.style.transform = 'scaleX(' + base / 100 + ')';
            sigTimer = 0;
          }, 120);
        }
      }
    } else if (!sigArmed) {
      sigArmed = true; /* 离开半径，下次进入再触发；不重启不循环 */
    }
  }

  /* ---------------- 第二件：LOCAL 时钟（隐藏时暂停） ---------------- */
  let clockEl = null, lastSec = -1;
  function tickClock() {
    if (doc.hidden) return;
    const el = doc.querySelector('.v5-clock');
    if (!el) return;
    if (el !== clockEl) { clockEl = el; lastSec = -1; }
    const now = new Date();
    if (now.getSeconds() === lastSec) return;
    lastSec = now.getSeconds();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(lastSec).padStart(2, '0');
    el.textContent = hh + ':' + mm + ':' + ss;
    if (!reduce) { el.classList.remove('v6-tick'); void el.offsetWidth; el.classList.add('v6-tick'); }
  }

  /* ---------------- 第二件：编号点亮 + 滚动进度 ---------------- */
  const progress = doc.createElement('div');
  progress.className = 'v6-progress';
  progress.setAttribute('aria-hidden', 'true');
  progress.innerHTML = '<i class="v6-progress-fill"></i><span class="v6-progress-ticks"></span><span class="v6-progress-label">0%</span>';
  doc.body.appendChild(progress);
  const fillEl = progress.querySelector('.v6-progress-fill');
  const ticksEl = progress.querySelector('.v6-progress-ticks');
  const labelEl = progress.querySelector('.v6-progress-label');
  let tickRefs = [];

  function paintSections() {
    const vh = window.innerHeight;
    /* 区块编号：中线越过视口 40% 点亮 */
    doc.querySelectorAll('.v5-section-head .v5-kicker').forEach((k) => {
      const r = k.getBoundingClientRect();
      k.classList.toggle('is-hot', r.top + r.height / 2 <= vh * 0.4);
    });
    /* 进度条 + 刻度 */
    const docH = doc.documentElement.scrollHeight;
    const max = Math.max(1, docH - vh);
    const y = Math.min(max, Math.max(0, window.scrollY));
    const pct = y / max;
    const ph = (pct * 100).toFixed(2) + '%';
    fillEl.style.setProperty('--ph', ph);
    labelEl.style.setProperty('--ph', ph);
    labelEl.textContent = Math.round(pct * 100) + '%';
    const secs = doc.querySelectorAll('.v5-hero, .v5-section, .v5-page-head');
    const mid = window.scrollY + vh * 0.4;
    let nowIdx = -1;
    const html = [];
    secs.forEach((s, i) => {
      const top = s.getBoundingClientRect().top + window.scrollY;
      const bottom = top + s.offsetHeight;
      const tp = Math.min(98, Math.max(2, (top / docH) * 100));
      html.push('<i class="v6-progress-tick" style="--tp:' + tp.toFixed(2) + '%"></i>');
      if (mid >= top && mid < bottom) nowIdx = i;
    });
    const joined = html.join('');
    if (joined !== ticksEl.dataset.html) {
      ticksEl.dataset.html = joined;
      ticksEl.innerHTML = joined;
      tickRefs = Array.prototype.slice.call(ticksEl.children);
    }
    tickRefs.forEach((t, i) => t.classList.toggle('is-now', i === nowIdx));
  }

  /* ---------------- 统一指针总线订阅 ---------------- */
  let hx = 0, hy = 0, hoverEl = null;
  if (bus) bus.subscribe((p) => {
    if (p.x === -9999) {
      if (cursor) cursor.classList.add('is-out');
      tipHide();
      hoverEl = null;
      setBracket(null);
      return;
    }
    hx = p.x; hy = p.y;
    if (cursor) {
      cursor.classList.remove('is-out');
      tx = hx; ty = hy;
      cursor.classList.toggle('is-link', !!(p.target && p.target.closest && p.target.closest(LINK_SEL)));
      startCursor();
    }
    const hit = p.target && p.target.closest ? p.target.closest(TIP_SEL) : null;
    if (hit !== hoverEl) {
      tipHide();
      hoverEl = hit;
      if (hit) tipTimer = window.setTimeout(() => { if (hoverEl === hit) tipShow(hit, hx, hy); }, reduce ? 0 : 220);
    } else if (hit && tipOn) {
      tipPlace(hx, hy); /* 跟着指针，不盖 chip */
    }
    setBracket(p.target && p.target.closest ? p.target.closest('.v5-timeline-body h3') : null);
    signalCheck(hx, hy);
  });

  doc.addEventListener('pointerdown', () => { if (cursor) cursor.classList.add('is-press'); });
  doc.addEventListener('pointerup', () => { if (cursor) cursor.classList.remove('is-press'); });
  window.addEventListener('wheel', () => { if (tipOn) tipHide(); hoverEl = null; }, { passive: true });
  window.addEventListener('touchmove', () => { if (tipOn) tipHide(); hoverEl = null; }, { passive: true });

  /* 键盘：focus 同样触发 tooltip */
  doc.addEventListener('focusin', (e) => {
    const el = e.target.closest ? e.target.closest(TIP_SEL) : null;
    if (el) {
      window.clearTimeout(tipTimer);
      const r = el.getBoundingClientRect();
      tipShow(el, r.left + r.width / 2, r.bottom + 6);
      hoverEl = el;
    }
  });
  doc.addEventListener('focusout', (e) => {
    const el = e.target.closest ? e.target.closest(TIP_SEL) : null;
    if (el && tipEl === el) { tipHide(); hoverEl = null; }
  });

  /* ---------------- 滚动 / 可见性 / 路由 ---------------- */
  window.addEventListener('scroll', paintSections, { passive: true });
  window.addEventListener('resize', paintSections, { passive: true });
  window.addEventListener('hashchange', () => window.setTimeout(paintSections, 60));
  doc.addEventListener('visibilitychange', () => { if (!doc.hidden) tickClock(); });

  window.setInterval(tickClock, 250);
  tickClock();
  window.setTimeout(paintSections, 0);
  window.setTimeout(paintSections, 400);
})();
