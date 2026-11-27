/* Offline shell for the local-only tools.
   Version bump is required whenever the cached tool assets change. */
const CACHE = 'szh-t1-m1-v9';
const CORE = [
  '/',
  '/index.html',
  '/404.html',
  '/assets/css/tailwind.css',
  '/assets/css/app.css',
  '/assets/css/app-v4.css',
  '/assets/css/app-v5.css',
  '/assets/css/app-v6.css',
  '/assets/favicon.svg',
  '/assets/js/app.js',
  '/assets/js/ai-dock.js',
  '/assets/js/backtop.js',
  '/assets/js/pointer-bus.js',
  '/assets/js/pointer.js',
  '/assets/js/threads.js',
  '/assets/js/ui-fx.js',
  '/data/site.json',
  '/tools/convert-core.js',
  '/tools/converter.js',
  '/tools/data-core.js',
  '/tools/date.js',
  '/tools/docs-core.js',
  '/tools/markdown.js',
  '/tools/model-core.js',
  '/tools/pdf-to-word.js',
  '/tools/unit.js',
  '/tools/word-to-pdf.js',
  '/tools/wordcount.js',
  '/tools/lib/docx-write.js',
  '/tools/lib/download.js',
  '/tools/lib/file-drop.js',
  '/tools/lib/pdf-text.js',
  '/tools/lib/pdf-to-docx.js',
  '/tools/lib/word-print.js',
  '/tools/vendor/js-yaml.min.js',
  '/tools/vendor/jszip.min.js',
  '/tools/vendor/lame.min.js',
  '/tools/vendor/mammoth.browser.min.js',
  '/tools/vendor/pdf-lib.min.js',
  '/tools/vendor/pdf.min.mjs',
  '/tools/vendor/pdf.worker.min.mjs',
  '/tools/vendor/turndown.js',
  '/tools/vendor/xlsx.full.min.js',
  '/tools/vendor/cmaps/Adobe-GB1-UCS2.bcmap',
  '/tools/vendor/cmaps/UniGB-UCS2-H.bcmap',
  '/tools/vendor/cmaps/UniGB-UCS2-V.bcmap',
  '/tools/vendor/cmaps/UniGB-UTF16-H.bcmap',
  '/tools/vendor/cmaps/UniGB-UTF16-V.bcmap'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(CORE.map((path) => cache.add(path)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) {
      fetch(req).then((res) => {
        if (res.ok) cache.put(req, res);
      }).catch(() => {});
      return cached;
    }

    try {
      const res = await fetch(req);
      if (res.ok) await cache.put(req, res.clone());
      return res;
    } catch (err) {
      if (req.mode === 'navigate') {
        const shell = await cache.match('/index.html') || await cache.match('/');
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
