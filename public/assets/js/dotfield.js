/* dotfield.js — v6 动态点阵背景（React Bits DotField 的原生 Canvas 等价）
   参数锁定；静态层烘焙 + 指针透镜局部重绘；静止 500ms 停帧。
   移动端 / 触屏不挂载，恢复 .site-grid；reduced-motion 只画静态点阵。 */
(() => {
  'use strict';
  if (window.__v6Dotfield) return;
  window.__v6Dotfield = true;

  const CONFIG = {
    gradientFrom: '#000000', gradientTo: '#ffffff', dotRadius: 2, dotSpacing: 12,
    cursorRadius: 240, bulgeStrength: 0.6, glowRadius: 160, pattern: 'grid',
    glowColor: '#6366f1', gradientAngle: 218, twist: 0, glowIntensity: 0.8,
    baseOpacity: 0.55, waveAmplitude: 0, speed: 1, sparkle: false,
    interactive: true, holdToZoom: true, intro: true, lightMode: false
  };

  const doc = document;
  const root = doc.documentElement;
  const bus = window.PointerBus;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let enabled = fine && window.innerWidth >= 768;
  let canvas = null, ctx = null, base = null, baseCtx = null;
  let dpr = 1, W = 0, H = 0;
  let dots = [];
  let alpha = reduce ? CONFIG.baseOpacity : 0;
  let introDone = reduce || !CONFIG.intro;
  let spacing = CONFIG.dotSpacing;
  let glowOn = true;
  let pointer = { x: -9999, y: -9999, inside: false };
  let bulge = CONFIG.bulgeStrength;
  let bulgeTarget = CONFIG.bulgeStrength;
  let zoomRaf = 0;
  let holdTimer = 0;
  let perfStart = 0, perfFrames = 0, perfChecked = false;
  let resizeTimer = 0;

  function themeDots() {
    const light = root.dataset.theme === 'light';
    return light ? '32,36,42' : '255,255,255';
  }

  function themeAlphaScale() {
    return root.dataset.theme === 'light' ? 0.38 : 1;
  }

  function glowColor() {
    const v = canvas ? getComputedStyle(canvas).getPropertyValue('--dotfield-glow').trim() : '';
    return v || CONFIG.glowColor;
  }

  function bake() {
    const useOffscreen = typeof OffscreenCanvas !== 'undefined';
    const c = useOffscreen
      ? new OffscreenCanvas(Math.max(1, Math.round(W * dpr)), Math.max(1, Math.round(H * dpr)))
      : doc.createElement('canvas');
    if (!useOffscreen) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    base = c;
    baseCtx = c.getContext('2d', { alpha: true });
    baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    baseCtx.clearRect(0, 0, W, H);

    const rgb = themeDots();
    const scale = themeAlphaScale();
    const ang = (CONFIG.gradientAngle * Math.PI) / 180;
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const corners = [[0, 0], [W, 0], [0, H], [W, H]].map((p) => p[0] * ux + p[1] * uy);
    const min = Math.min.apply(null, corners);
    const max = Math.max.apply(null, corners);
    const span = Math.max(1, max - min);

    dots = [];
    for (let y = spacing / 2; y < H + spacing; y += spacing) {
      for (let x = spacing / 2; x < W + spacing; x += spacing) {
        const t = Math.min(1, Math.max(0, ((x * ux + y * uy) - min) / span));
        /* 参数里的 32%→100% 保留为梯度形状；实际落点按可读性压到 5%→22% */
        const lum = 0.05 + 0.17 * t;
        dots.push({ x, y, a: lum * scale });
      }
    }
    const radius = CONFIG.dotRadius;
    baseCtx.fillStyle = 'rgb(' + rgb + ')';
    for (const d of dots) {
      baseCtx.globalAlpha = d.a;
      baseCtx.beginPath();
      baseCtx.arc(d.x, d.y, radius, 0, Math.PI * 2);
      baseCtx.fill();
    }
    baseCtx.globalAlpha = 1;
  }

  function clearAndBase() {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = alpha;
    ctx.drawImage(base, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  function drawLens() {
    if (!ctx || !pointer.inside || !introDone || reduce) return;
    const px = pointer.x, py = pointer.y;
    const rgb = themeDots();
    const scale = themeAlphaScale();

    clearAndBase();

    ctx.fillStyle = 'rgb(' + rgb + ')';
    const r = CONFIG.dotRadius;
    const maxDisp = bulge * spacing * 1.6;
    for (const d of dots) {
      if (Math.abs(d.x - px) > CONFIG.cursorRadius + maxDisp || Math.abs(d.y - py) > CONFIG.cursorRadius + maxDisp) continue;
      const dx = d.x - px, dy = d.y - py;
      const dist = Math.hypot(dx, dy);
      if (dist > CONFIG.cursorRadius || dist === 0) continue;
      const t = 1 - dist / CONFIG.cursorRadius;
      const disp = t * t * bulge * spacing * 1.6;
      const nx = d.x + (dx / dist) * disp;
      const ny = d.y + (dy / dist) * disp;
      ctx.globalAlpha = alpha * 0.85 * Math.min(1, d.a / scale + t * 0.06);
      ctx.beginPath();
      ctx.arc(nx, ny, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (glowOn && CONFIG.glowIntensity > 0) {
      const grad = ctx.createRadialGradient(px, py, 0, px, py, CONFIG.glowRadius);
      const col = glowColor();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1;
      grad.addColorStop(0, hexA(col, CONFIG.glowIntensity * 0.10));
      grad.addColorStop(1, hexA(col, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, CONFIG.glowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function hexA(hex, a) {
    const s = String(hex || '').trim();
    if (s.startsWith('rgb')) {
      const m = s.match(/rgba?\(([^)]+)\)/);
      if (m) {
        const p = m[1].split(',').map((v) => Number(v.trim()));
        return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + a + ')';
      }
      return 'rgba(99,102,241,' + a + ')';
    }
    let h = s.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    if (Number.isNaN(n)) return 'rgba(99,102,241,' + a + ')';
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function startZoomAnim() {
    if (zoomRaf) return;
    const step = () => {
      zoomRaf = 0;
      bulge += (bulgeTarget - bulge) * 0.18;
      if (Math.abs(bulgeTarget - bulge) > 0.01) {
        if (pointer.inside) drawLens();
        zoomRaf = requestAnimationFrame(step);
      } else {
        bulge = bulgeTarget;
        if (pointer.inside) drawLens();
      }
    };
    zoomRaf = requestAnimationFrame(step);
  }

  function intro() {
    if (introDone) return;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 400);
      const e = 1 - Math.pow(1 - p, 3);
      alpha = CONFIG.baseOpacity * e;
      if (canvas) canvas.style.transform = 'scale(' + (0.985 + 0.015 * e) + ')';
      clearAndBase();
      if (p < 1) requestAnimationFrame(step);
      else { introDone = true; alpha = CONFIG.baseOpacity; canvas.style.transform = ''; }
    };
    requestAnimationFrame(step);
  }

  function measurePerf(start) {
    if (perfChecked || reduce) return;
    if (!start) { perfStart = 0; perfFrames = 0; return; }
    if (!perfStart) { perfStart = performance.now(); perfFrames = 0; return; }
    perfFrames++;
    const elapsed = performance.now() - perfStart;
    if (elapsed >= 3000) {
      perfChecked = true;
      const avg = elapsed / Math.max(1, perfFrames);
      if (avg > 20) {
        spacing = 16;
        glowOn = false;
        rebuild();
        console.info('[dotfield] degraded');
      }
    }
  }

  function rebuild() {
    if (!enabled) return;
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!canvas) {
      canvas = doc.createElement('canvas');
      canvas.className = 'v6-dotfield';
      canvas.setAttribute('aria-hidden', 'true');
      doc.body.appendChild(canvas);
      ctx = canvas.getContext('2d', { alpha: true });
    }
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    root.dataset.dotfield = 'on';
    bake();
    clearAndBase();
    if (pointer.inside) drawLens();
  }

  function disable() {
    enabled = false;
    root.dataset.dotfield = 'off';
    if (canvas) { canvas.remove(); canvas = null; ctx = null; }
  }

  function subscribe() {
    if (!bus) return;
    bus.subscribe((p) => {
      if (!enabled) return;
      if (p.x === -9999) {
        pointer.inside = false;
        clearAndBase();
        return;
      }
      if (p.idle) {
        pointer.inside = false;
        clearAndBase();
        if (zoomRaf) { cancelAnimationFrame(zoomRaf); zoomRaf = 0; }
        return;
      }
      pointer.x = p.x; pointer.y = p.y; pointer.inside = true;
      if (!introDone || reduce) return;
      drawLens();
      measurePerf(true);
    });
  }

  function bind() {
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const should = fine && window.innerWidth >= 768;
        if (!should) { disable(); return; }
        if (!enabled) {
          enabled = true;
          rebuild();
          if (!introDone) intro();
          return;
        }
        rebuild();
      }, 120);
    }, { passive: true });

    doc.addEventListener('visibilitychange', () => {
      if (!enabled) return;
      if (doc.hidden) {
        if (zoomRaf) { cancelAnimationFrame(zoomRaf); zoomRaf = 0; }
      } else {
        clearAndBase();
      }
    });

    if (CONFIG.holdToZoom && fine) {
      window.addEventListener('pointerdown', (e) => {
        if (!enabled || reduce || !pointer.inside) return;
        if (e.target && e.target.closest && e.target.closest('a, button, input, textarea, select, .ai-fab, .pf-top')) return;
        window.clearTimeout(holdTimer);
        holdTimer = window.setTimeout(() => {
          if (!pointer.inside) return;
          bulgeTarget = 1.2;
          startZoomAnim();
        }, 500);
      }, { passive: true });
      ['pointerup', 'pointercancel', 'blur'].forEach((type) => {
        window.addEventListener(type, () => {
          window.clearTimeout(holdTimer);
          if (bulgeTarget !== CONFIG.bulgeStrength) {
            bulgeTarget = CONFIG.bulgeStrength;
            startZoomAnim();
          }
        }, { passive: true });
      });
    }

    new MutationObserver(() => {
      if (!enabled) return;
      bake();
      clearAndBase();
      if (pointer.inside) drawLens();
    }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }

  function init() {
    if (!enabled) { root.dataset.dotfield = 'off'; return; }
    rebuild();
    if (!introDone) {
      try {
        if (sessionStorage.getItem('dotfield-intro')) introDone = true;
        else sessionStorage.setItem('dotfield-intro', '1');
      } catch (e) { /* noop */ }
      if (introDone) { alpha = CONFIG.baseOpacity; clearAndBase(); }
      else intro();
    }
    subscribe();
    bind();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
