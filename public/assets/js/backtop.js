/* backtop.js — 圆形回到顶部按钮（Uiverse afraid-falcon-17 的原生实现）
   50px 圆形；hover 展开 140px 胶囊；scrollY > 600 显形。 */
(() => {
  'use strict';
  if (window.__v6BackTop) return;
  window.__v6BackTop = true;

  const doc = document;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const btn = doc.createElement('button');
  btn.className = 'pf-top';
  btn.type = 'button';
  btn.setAttribute('aria-label', '回到顶部');
  btn.innerHTML = '<svg class="pf-top__icon" viewBox="0 0 384 512" aria-hidden="true"><path d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2V448c0 17.7 14.3 32 32 32s32-14.3 32-32V141.2L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z"/></svg>';
  doc.body.appendChild(btn);

  let shown = false;
  let frame = 0;
  function paint() {
    frame = 0;
    const on = window.scrollY > 600;
    if (on === shown) return;
    shown = on;
    btn.classList.toggle('is-on', on);
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(paint);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  paint();

  btn.addEventListener('pointerenter', () => {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) btn.style.willChange = 'width';
  });
  btn.addEventListener('pointerleave', () => { btn.style.willChange = 'auto'; });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
})();
