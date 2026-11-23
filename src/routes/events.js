'use strict';

const express = require('express');
const store = require('../store');

const router = express.Router();

/**
 * SSE：后台保存内容后，所有打开的前台页面会收到 content 事件并自动重载数据。
 * 静态导出（GitHub Pages）环境没有该接口，前端会自动忽略。
 */
router.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
  res.write('retry: 3000\n\n');
  res.write(`event: hello\ndata: ${JSON.stringify({ ok: true })}\n\n`);

  const unsubscribe = store.onContentChange((meta) => {
    res.write(`event: content\ndata: ${JSON.stringify(meta)}\n\n`);
  });

  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

module.exports = router;
