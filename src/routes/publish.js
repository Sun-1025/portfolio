'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { requireAuth } = require('../auth');

const router = express.Router();
const ROOT = path.resolve(__dirname, '..', '..');
const NODE_EXE = process.execPath;
const NPM_CMD = path.join(path.dirname(NODE_EXE), 'npm.cmd');
const POWERSHELL = [
  'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
  'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
].find((candidate) => fs.existsSync(candidate)) || 'powershell.exe';
const DEPLOY_SCRIPT = path.join(ROOT, 'sync', 'deploy-v6-pages.ps1');
const PUBLISH_LOG = path.join(ROOT, '_shots', 'publish.log');

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
  const stamped = `[${new Date().toISOString()}] ${line}`;
  job.log.push(stamped);
  if (job.log.length > 400) job.log.splice(0, job.log.length - 400);
  try {
    fs.mkdirSync(path.dirname(PUBLISH_LOG), { recursive: true });
    fs.appendFileSync(PUBLISH_LOG, stamped + '\n', 'utf8');
  } catch (err) { /* 日志写入失败不影响发布 */ }
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
  if (!fs.existsSync(DEPLOY_SCRIPT)) return res.status(500).json({ ok: false, error: '找不到 Pages 部署脚本' });
  job.running = true;
  job.step = 'export';
  job.ok = null;
  job.startedAt = Date.now();
  job.finishedAt = null;
  job.log = [];
  push('publish requested');
  res.json({ ok: true, startedAt: job.startedAt });

  (async () => {
    try {
      // 内容发布只需要重新导出静态站；Tailwind 只在源样式比产物新时重跑。
      // 这样避免每次发布都被 Tailwind CLI 的偶发崩溃卡住。
      const cssSrc = path.join(ROOT, 'src', 'tailwind.css');
      const cssOut = path.join(ROOT, 'public', 'assets', 'css', 'tailwind.css');
      const needsCss = fs.existsSync(cssSrc) && fs.existsSync(cssOut)
        && fs.statSync(cssSrc).mtimeMs > fs.statSync(cssOut).mtimeMs;
      if (needsCss) {
        await runStep('css', `"${NPM_CMD}" run css`);
      }

      await runStep('export', `"${NODE_EXE}" "${path.join(ROOT, 'scripts', 'export-static.js')}"`);
      await runStep('deploy', `"${POWERSHELL}" -NoProfile -ExecutionPolicy Bypass -File "${DEPLOY_SCRIPT}" -Message "publish: content update"`);
      job.ok = true;
      job.step = 'done';
      push('publish finished');
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
