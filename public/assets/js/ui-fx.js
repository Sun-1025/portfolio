/* ui-fx.js — v6 信息层 / 结构层 / 动效层
   1) 头像 Animated Tooltip：胶囊跟随、邻位让位、触屏点按 2s
   2) Focus Cards 键盘态补丁（纯 CSS 为主，这里只补 focus 类）
   3) Glare：只作用于卡片封面，±3deg，文字层级在 CSS 里保证 */
(() => {
  'use strict';
  if (window.__v6UiFx) return;
  window.__v6UiFx = true;

  const doc = document;
  const bus = window.PointerBus;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------------- 头像 tooltip ---------------- */
  const tip = doc.createElement('div');
  tip.className = 'v6-avatar-tip';
  tip.setAttribute('aria-hidden', 'true');
  tip.innerHTML = '<strong></strong><span></span><small></small>';
  doc.body.appendChild(tip);
  const tipName = tip.querySelector('strong');
  const tipRole = tip.querySelector('span');
  const tipSub = tip.querySelector('small');

  let tipOn = false;
  let tipAvatar = null;
  let tipGroup = null;
  let hideTimer = 0;
  let touchTimer = 0;

  function avatarData(el) {
    return {
      name: el.getAttribute('data-name') || '',
      role: el.getAttribute('data-role') || '',
      sub: el.getAttribute('data-sub') || ''
    };
  }

  function placeTip(x, y) {
    const vw = window.innerWidth;
    const w = tip.offsetWidth || 180;
    let left = x + 10;
    if (left + w > vw - 8) left = vw - w - 8;
    left = Math.max(8, left);
    const top = Math.max(8, y - tip.offsetHeight - 12);
    tip.style.transform = 'translate3d(' + left + 'px,' + top + 'px,0)';
  }

  function markNeighbors(avatar) {
    if (!tipGroup) return;
    const kids = Array.prototype.slice.call(tipGroup.querySelectorAll('.v5-avatar'));
    const idx = kids.indexOf(avatar);
    kids.forEach((el, i) => {
      el.classList.toggle('is-left', i < idx);
      el.classList.toggle('is-right', i > idx);
    });
  }

  function showTip(avatar, x, y, sticky) {
    if (!avatar) return;
    window.clearTimeout(hideTimer);
    window.clearTimeout(touchTimer);
    tipGroup = avatar.closest('.v5-avatar-group');
    tipAvatar = avatar;
    const data = avatarData(avatar);
    tipName.textContent = data.name;
    tipRole.textContent = data.role;
    tipSub.textContent = data.sub;
    tip.classList.add('is-on');
    tipOn = true;
    markNeighbors(avatar);
    const r = avatar.getBoundingClientRect();
    const anchorX = Number.isFinite(x) ? x : r.left + r.width / 2;
    const anchorY = r.top + (sticky ? 0 : 0);
    placeTip(anchorX, anchorY);
    if (sticky) touchTimer = window.setTimeout(hideTip, 2000);
  }

  function hideTip() {
    window.clearTimeout(hideTimer);
    window.clearTimeout(touchTimer);
    tipOn = false;
    tipAvatar = null;
    tip.classList.remove('is-on');
    if (tipGroup) {
      Array.prototype.slice.call(tipGroup.querySelectorAll('.v5-avatar')).forEach((el) => el.classList.remove('is-left', 'is-right'));
    }
    tipGroup = null;
  }

  function scheduleHide() {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hideTip, 120);
  }

  doc.addEventListener('pointerover', (e) => {
    const avatar = e.target.closest ? e.target.closest('.v5-avatar') : null;
    if (avatar && fine) {
      showTip(avatar, e.clientX, avatar.getBoundingClientRect().top);
    }
  });
  doc.addEventListener('pointerout', (e) => {
    const avatar = e.target.closest ? e.target.closest('.v5-avatar') : null;
    if (!avatar) return;
    const to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('.v5-avatar') : null;
    if (!to || to.closest('.v5-avatar-group') !== avatar.closest('.v5-avatar-group')) scheduleHide();
  });
  doc.addEventListener('focusin', (e) => {
    const avatar = e.target.closest ? e.target.closest('.v5-avatar') : null;
    if (avatar) {
      const r = avatar.getBoundingClientRect();
      showTip(avatar, r.left + r.width / 2, r.top);
    }
  });
  doc.addEventListener('focusout', (e) => {
    if (e.target.closest && e.target.closest('.v5-avatar')) scheduleHide();
  });
  doc.addEventListener('click', (e) => {
    const avatar = e.target.closest ? e.target.closest('.v5-avatar') : null;
    if (avatar && !fine) {
      showTip(avatar, avatar.getBoundingClientRect().left + 22, avatar.getBoundingClientRect().top, true);
    }
  });

  if (bus) bus.subscribe((p) => {
    if (!tipOn || !fine) return;
    if (p.x === -9999) { hideTip(); return; }
    const r = tipAvatar ? tipAvatar.getBoundingClientRect() : null;
    if (!r) return;
    /* 只在头像组内跟随；离开组就收 */
    if (p.y < r.top - 40 || p.y > r.bottom + 40) { hideTip(); return; }
    placeTip(p.x, r.top);
  });

  /* ---------------- Focus Cards 键盘补丁 ---------------- */
  doc.addEventListener('focusin', (e) => {
    const item = e.target.closest ? e.target.closest('.v5-focus-item') : null;
    if (!item) return;
    const group = item.closest('.v5-focus-group');
    if (!group) return;
    group.classList.add('is-key-focus');
    Array.prototype.slice.call(group.querySelectorAll('.v5-focus-item')).forEach((el) => el.classList.toggle('is-focus-current', el === item));
  });
  doc.addEventListener('focusout', (e) => {
    const item = e.target.closest ? e.target.closest('.v5-focus-item') : null;
    if (!item) return;
    const group = item.closest('.v5-focus-group');
    if (!group) return;
    const to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('.v5-focus-item') : null;
    if (to && to.closest('.v5-focus-group') === group) return;
    group.classList.remove('is-key-focus');
    Array.prototype.slice.call(group.querySelectorAll('.v5-focus-item')).forEach((el) => el.classList.remove('is-focus-current'));
  });

  /* ---------------- Glare ---------------- */
  let glare = null;
  let glareRaf = 0;
  let pending = null;

  function clearGlare() {
    if (glare) {
      glare.classList.remove('is-glare');
      glare.style.removeProperty('--gx');
      glare.style.removeProperty('--gy');
      glare.style.removeProperty('--rx');
      glare.style.removeProperty('--ry');
    }
    glare = null;
    pending = null;
  }

  function paintGlare(p) {
    glareRaf = 0;
    if (!glare || !pending) return;
    const r = glare.getBoundingClientRect();
    const px = pending.x, py = pending.y;
    if (px < r.left || px > r.right || py < r.top || py > r.bottom) { clearGlare(); return; }
    const gx = ((px - r.left) / Math.max(1, r.width)) * 100;
    const gy = ((py - r.top) / Math.max(1, r.height)) * 100;
    const ry = ((gx - 50) / 50) * 3;
    const rx = -((gy - 50) / 50) * 3;
    glare.style.setProperty('--gx', gx.toFixed(2) + '%');
    glare.style.setProperty('--gy', gy.toFixed(2) + '%');
    glare.style.setProperty('--rx', rx.toFixed(2) + 'deg');
    glare.style.setProperty('--ry', ry.toFixed(2) + 'deg');
  }

  doc.addEventListener('pointerover', (e) => {
    if (!fine || reduce) return;
    const el = e.target.closest ? e.target.closest('.v5-glare') : null;
    if (!el || el === glare) return;
    clearGlare();
    glare = el;
    glare.classList.add('is-glare');
  });
  doc.addEventListener('pointerout', (e) => {
    const el = e.target.closest ? e.target.closest('.v5-glare') : null;
    if (!el || el !== glare) return;
    const to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('.v5-glare') : null;
    if (to !== glare) clearGlare();
  });

  if (bus) bus.subscribe((p) => {
    if (!glare || !fine || reduce) return;
    if (p.x === -9999) { clearGlare(); return; }
    pending = { x: p.x, y: p.y };
    if (!glareRaf) glareRaf = requestAnimationFrame(() => paintGlare(p));
  });

  /* 路由切换后清理残留 */
  window.addEventListener('hashchange', () => {
    clearGlare();
    hideTip();
  });
  window.addEventListener('scroll', () => {
    clearGlare();
  }, { passive: true });
  window.addEventListener('wheel', () => { if (tipOn) hideTip(); }, { passive: true });
  window.addEventListener('touchmove', () => { if (tipOn) hideTip(); }, { passive: true });
})();
