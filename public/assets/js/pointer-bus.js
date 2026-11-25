/* pointer-bus.js — v6 全站唯一指针总线
   全站只有一个 pointermove 监听；rAF 合并后广播给订阅者。
   订阅：PointerBus.subscribe(fn) → fn({ x, y, clientX, clientY, target })
   指针离开：x/y = -9999，target = null。
   静止 500ms：停止 rAF，进入 idle；下一次移动再启动。 */
(() => {
  'use strict';
  if (window.PointerBus) return;

  const subs = new Set();
  let clientX = -9999;
  let clientY = -9999;
  let target = null;
  let raf = 0;
  let idleTimer = 0;

  function emit() {
    raf = 0;
    const evt = { x: clientX, y: clientY, clientX, clientY, target };
    subs.forEach((fn) => {
      try { fn(evt); } catch (err) { /* 单个订阅者出错不影响其它 */ }
    });
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(emit);
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      idleTimer = 0;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      const evt = { x: clientX, y: clientY, clientX, clientY, target, idle: true };
      subs.forEach((fn) => {
        try { fn(evt); } catch (err) { /* noop */ }
      });
    }, 500);
  }

  window.addEventListener('pointermove', (e) => {
    clientX = e.clientX;
    clientY = e.clientY;
    target = e.target;
    schedule();
  }, { passive: true });

  function leave() {
    clientX = -9999;
    clientY = -9999;
    target = null;
    window.clearTimeout(idleTimer);
    idleTimer = 0;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    emit();
  }

  document.addEventListener('pointerleave', leave);
  window.addEventListener('blur', leave);

  window.PointerBus = {
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    fine: window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    reduce: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    get last() { return { x: clientX, y: clientY, clientX, clientY, target }; }
  };
})();
