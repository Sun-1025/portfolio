'use strict';

const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const { requireAuth } = require('../auth');

const router = express.Router();
const ROOT = path.resolve(__dirname, '..', '..');

const job = {
  running: false,
  step: 'idle',
  ok: null,
  startedAt: null,
  finishedAt: null,
  log: [],
};

function push(line) {
  if (!line) return;
  job.log.push(line);
  if (job.log.length > 400) job.log.splice(0, job.log.length - 400);
}

function runStep(name, commandLine) {
  return new Promise((resolve, reject) => {
    job.step = name;
    push('> ' + commandLine);
    const child = spawn(commandLine, { cwd: ROOT, shell: true, windowsHide: true });
    const timer = setTimeout(() => {
      push('step timeout: ' + name);
      try { child.kill(); } catch (err) { /* ignore */ }
      reject(new Error(name + ' 超时（15 分钟）'));
    }, 15 * 60 * 1000);
    child.stdout.on('data', (d) => String(d).trimEnd().split(/\r?\n/).forEach(push));
    child.stderr.on('data', (d) => String(d).trimEnd().split(/\r?\n/).forEach(push));
    child.on('error', (err) => { clearTimeout(timer); reject(err); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(name + ' 退出码 ' + code));
    });
  });
}

router.post('/publish', requireAuth, (req, res) => {
  if (job.running) return res.status(409).json({ ok: false, error: '已有发布任务在跑，稍后再试' });
  job.running = true;
  job.step = 'build';
  job.ok = null;
  job.startedAt = Date.now();
  job.finishedAt = null;
  job.log = [];
  res.json({ ok: true, startedAt: job.startedAt });

  (async () => {
    try {
      await runStep('build', 'npm run build');
      await runStep('deploy', 'pwsh -NoProfile -ExecutionPolicy Bypass -File sync/deploy-v6-pages.ps1');
      job.ok = true;
      job.step = 'done';
    } catch (err) {
      job.ok = false;
      job.step = 'error';
      push('ERROR ' + err.message);
    } finally {
      job.running = false;
      job.finishedAt = Date.now();
    }
  })();
});

router.get('/publish/status', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    ok: true,
    running: job.running,
    step: job.step,
    ok: job.ok,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    log: job.log.slice(-40),
  });
});

module.exports = router;
