/* 文件转换台：浏览器内转换，不上传文件。 */
import {
  MATRIX, extOf, familyOf, targetsFor, imageTargetFor, formatBytes,
  convertDataText, wavBlobFromAudioBuffer,
} from './convert-core.js';

const MAX_BYTES = { image: 60 * 1024 * 1024, data: 10 * 1024 * 1024, audio: 80 * 1024 * 1024 };
const HISTORY_KEY = 'szh.converter.history.v1';
const ROUTE_COUNT = MATRIX.reduce((sum, row) => sum + row.targets.length, 0);
const FAMILY_LABEL = { image: '图片', data: '数据 / 文档', audio: '音频' };

const state = {
  items: [],
  filter: 'all',
  query: '',
  quality: 0.9,
  busy: false,
  history: [],
};

let els = {};
let uid = 0;
let toastFn = () => {};

const escape = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const sleep = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

function fileExtLabel(ext) {
  if (ext === 'jpg') return 'JPG';
  return String(ext || '').toUpperCase();
}

function itemById(id) {
  return state.items.find((item) => item.id === id);
}

function baseName(name) {
  return String(name || 'file').replace(/\.[^.]+$/, '') || 'file';
}

function loadHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(value) ? value.slice(0, 8) : [];
  } catch { return []; }
}

function saveHistory() {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history)); } catch { /* storage disabled */ }
}

function statusText(item) {
  if (item.status === 'working') return '<span class="conv-working"><i></i>转换中</span>';
  if (item.status === 'done') return `<span class="conv-done">完成 · ${formatBytes(item.resultBlob?.size || 0)}</span>`;
  if (item.status === 'error') return `<span class="conv-error">失败 · ${escape(item.error || '未知错误')}</span>`;
  return `<span class="conv-ready">待转换 · ${formatBytes(item.file.size)}</span>`;
}

function targetOptions(item) {
  return targetsFor(item.ext).map((target) => `<option value="${target}" ${item.target === target ? 'selected' : ''}>${fileExtLabel(target)}</option>`).join('');
}

function rowMarkup(item, index) {
  const action = item.status === 'done'
    ? `<button type="button" class="conv-row-btn is-primary" data-action="download" data-id="${item.id}">下载</button>
       <button type="button" class="conv-row-btn" data-action="remove" data-id="${item.id}" aria-label="移除">×</button>`
    : item.status === 'working'
      ? '<span class="conv-row-btn is-loading">处理中</span>'
      : `<button type="button" class="conv-row-btn is-primary" data-action="run" data-id="${item.id}">${item.status === 'error' ? '重试' : '转换'}</button>
         <button type="button" class="conv-row-btn" data-action="remove" data-id="${item.id}" aria-label="移除">×</button>`;
  return `<div class="conv-row" data-id="${item.id}">
    <span class="conv-row-index">${String(index + 1).padStart(2, '0')}</span>
    <span class="conv-row-file">
      <b title="${escape(item.file.name)}">${escape(item.file.name)}</b>
      <span>${FAMILY_LABEL[item.family] || '文件'} · ${fileExtLabel(item.ext)}${item.ext === 'gif' ? ' · 首帧' : ''}</span>
    </span>
    <span class="conv-arrow" aria-hidden="true">→</span>
    <select class="conv-row-select" data-target="${item.id}" aria-label="选择目标格式" ${item.status === 'working' ? 'disabled' : ''}>${targetOptions(item)}</select>
    <span class="conv-row-status" role="status">${statusText(item)}</span>
    <span class="conv-row-actions">${action}</span>
  </div>`;
}

function renderQueue() {
  if (!els.queue) return;
  els.queue.innerHTML = state.items.map(rowMarkup).join('');
  els.empty.hidden = state.items.length > 0;
  els.queue.hidden = state.items.length === 0;
  const done = state.items.filter((item) => item.status === 'done').length;
  const working = state.items.filter((item) => item.status === 'working').length;
  els.queueCount.textContent = `QUEUE / ${String(state.items.length).padStart(2, '0')}`;
  els.progressLabel.textContent = `${done} / ${state.items.length} DONE`;
  els.progressBar.style.width = state.items.length ? `${Math.round((done / state.items.length) * 100)}%` : '0%';
  els.convertAll.disabled = state.busy || !state.items.some((item) => item.status === 'ready' || item.status === 'error');
  els.downloadAll.disabled = state.busy || !done;
  els.clear.disabled = state.busy || !state.items.length;
  if (working) els.progressBar.style.width = `${Math.max(4, Math.round((done / state.items.length) * 100))}%`;
}

function renderMatrix() {
  if (!els.matrix) return;
  const query = state.query.trim().toLowerCase();
  const rows = MATRIX.filter((row) => {
    if (state.filter !== 'all' && row.family !== state.filter) return false;
    if (!query) return true;
    return [row.family, FAMILY_LABEL[row.family], row.from, ...row.targets, row.note]
      .join(' ').toLowerCase().includes(query);
  });
  els.matrix.innerHTML = rows.length ? rows.map((row) => `<div class="conv-fmt-row">
    <div class="conv-fmt-top">
      <span class="conv-fmt-from">${escape(row.from)}</span>
      <span class="conv-fmt-arrow">→</span>
      <span class="conv-fmt-targets">${row.targets.map((target) => `<b>${escape(target)}</b>`).join('')}</span>
    </div>
    <span class="conv-fmt-note">${escape(row.note)}</span>
  </div>`).join('') : '<p class="conv-empty-matrix">没有匹配的转换路径。</p>';
  els.matrixCount.textContent = `${rows.length} / ${MATRIX.length} ROWS`;
}

function renderHistory() {
  if (!els.historyList) return;
  els.historyList.innerHTML = state.history.length ? state.history.map((entry) => {
    const time = new Date(entry.time);
    const hhmm = Number.isNaN(time.getTime()) ? '' : time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    return `<div class="conv-history-row">
      <span class="conv-history-name" title="${escape(entry.name)}">${escape(entry.name)}</span>
      <span class="conv-history-meta">${escape(entry.from)} → ${escape(entry.to)} · ${escape(hhmm)}</span>
    </div>`;
  }).join('') : '<p class="conv-history-empty">还没有转换记录。</p>';
  els.historyClear.disabled = !state.history.length;
}

function renderAll() {
  renderMatrix();
  renderQueue();
  renderHistory();
}

function setBusy(busy) {
  state.busy = busy;
  els.root.classList.toggle('is-busy', busy);
  renderQueue();
}

function addFiles(files) {
  const skipped = [];
  for (const file of files) {
    const ext = extOf(file.name);
    const family = familyOf(ext);
    if (!family) {
      skipped.push(`${file.name}（暂不支持）`);
      continue;
    }
    if (file.size > MAX_BYTES[family]) {
      skipped.push(`${file.name}（超过 ${formatBytes(MAX_BYTES[family])}）`);
      continue;
    }
    const duplicate = state.items.some((item) => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified);
    if (duplicate) continue;
    const target = family === 'image' ? imageTargetFor(ext) : targetsFor(ext)[0];
    if (!target) {
      skipped.push(`${file.name}（没有可用目标格式）`);
      continue;
    }
    state.items.push({
      id: `conv-${uid += 1}`,
      file,
      ext,
      family,
      target,
      status: 'ready',
      resultBlob: null,
      resultName: '',
      error: '',
    });
  }
  renderQueue();
  if (skipped.length) toastFn(`已跳过 ${skipped.length} 个文件：${skipped.slice(0, 2).join('、')}${skipped.length > 2 ? '…' : ''}`);
  else if (files.length) toastFn(`已加入 ${files.length} 个文件`);
}

function readFileAsText(file) {
  return file.text ? file.text() : new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

async function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file); } catch { /* fallback below */ }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片解码失败')); };
    image.src = url;
  });
}

async function convertImage(item) {
  const source = await loadBitmap(item.file);
  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  if (!width || !height) throw new Error('图片尺寸无效');
  const maxSide = 8192;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext('2d', { alpha: item.target !== 'jpg' });
  if (!context) throw new Error('浏览器无法创建图片画布');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  if (item.target === 'jpg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, w, h);
  } else {
    context.clearRect(0, 0, w, h);
  }
  context.drawImage(source, 0, 0, w, h);
  if (typeof source.close === 'function') source.close();
  const mime = item.target === 'png' ? 'image/png' : item.target === 'jpg' ? 'image/jpeg' : 'image/webp';
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, item.target === 'png' ? undefined : state.quality));
  if (!blob) throw new Error('当前浏览器不支持该图片输出格式');
  if (item.ext === 'gif') toastFn('GIF 动图仅转换首帧');
  return blob;
}

async function convertAudio(item) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error('当前浏览器不支持音频解码');
  const audioContext = new AudioContextClass();
  try {
    const buffer = await item.file.arrayBuffer();
    const decoded = await new Promise((resolve, reject) => {
      audioContext.decodeAudioData(buffer.slice(0), resolve, reject);
    });
    return wavBlobFromAudioBuffer(decoded);
  } finally {
    await audioContext.close().catch(() => {});
  }
}

async function convertItem(item) {
  item.status = 'working';
  item.error = '';
  renderQueue();
  await sleep(60);
  try {
    let blob;
    if (item.family === 'image') blob = await convertImage(item);
    else if (item.family === 'audio') blob = await convertAudio(item);
    else if (item.family === 'data') {
      const text = await readFileAsText(item.file);
      const result = convertDataText(text, item.ext, item.target);
      blob = new Blob([result.content], { type: result.mime });
    } else throw new Error('暂不支持该文件类型');
    item.resultBlob = blob;
    item.resultName = `${baseName(item.file.name)}.${item.target}`;
    item.status = 'done';
    state.history.unshift({
      name: item.file.name,
      from: fileExtLabel(item.ext),
      to: fileExtLabel(item.target),
      size: blob.size,
      time: Date.now(),
    });
    state.history = state.history.slice(0, 8);
    saveHistory();
    toastFn(`${item.file.name} 已转换为 ${fileExtLabel(item.target)}`);
  } catch (err) {
    item.status = 'error';
    item.error = err?.message || '转换失败';
    toastFn(`${item.file.name} 转换失败：${item.error}`);
  } finally {
    renderQueue();
    renderHistory();
  }
}

async function convertAll() {
  const pending = state.items.filter((item) => item.status === 'ready' || item.status === 'error');
  if (!pending.length) return;
  setBusy(true);
  for (const item of pending) await convertItem(item);
  setBusy(false);
  const done = state.items.filter((item) => item.status === 'done').length;
  if (done) toastFn(`批量完成：${done} 个文件可下载`);
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function downloadAll() {
  const done = state.items.filter((item) => item.status === 'done' && item.resultBlob);
  if (!done.length) return;
  done.forEach((item, index) => {
    setTimeout(() => downloadBlob(item.resultBlob, item.resultName), index * 180);
  });
  toastFn(`正在下载 ${done.length} 个文件；浏览器可能要求允许多文件下载`);
}

function bind() {
  els.root.addEventListener('change', (event) => {
    const select = event.target.closest('[data-target]');
    if (!select) return;
    const item = itemById(select.dataset.target);
    if (item && item.status !== 'working') {
      item.target = select.value;
      if (item.status === 'done') {
        item.status = 'ready';
        item.resultBlob = null;
        item.resultName = '';
      }
      renderQueue();
    }
  });

  els.root.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]');
    if (!action) return;
    const item = itemById(action.dataset.id);
    if (!item || state.busy) return;
    if (action.dataset.action === 'run') convertItem(item);
    if (action.dataset.action === 'download' && item.resultBlob) downloadBlob(item.resultBlob, item.resultName);
    if (action.dataset.action === 'remove') {
      state.items = state.items.filter((x) => x.id !== item.id);
      renderQueue();
    }
  });

  els.drop.addEventListener('dragover', (event) => {
    event.preventDefault();
    els.drop.classList.add('is-drag');
  });
  els.drop.addEventListener('dragleave', () => els.drop.classList.remove('is-drag'));
  els.drop.addEventListener('drop', (event) => {
    event.preventDefault();
    els.drop.classList.remove('is-drag');
    addFiles(Array.from(event.dataTransfer?.files || []));
  });
  els.fileInput.addEventListener('change', () => {
    addFiles(Array.from(els.fileInput.files || []));
    els.fileInput.value = '';
  });

  els.convertAll.addEventListener('click', convertAll);
  els.downloadAll.addEventListener('click', downloadAll);
  els.clear.addEventListener('click', () => {
    if (state.busy) return;
    state.items = [];
    renderQueue();
    toastFn('队列已清空');
  });

  els.matrixSearch.addEventListener('input', () => {
    state.query = els.matrixSearch.value;
    renderMatrix();
  });
  els.filters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-family]');
    if (!button) return;
    state.filter = button.dataset.family;
    els.filters.querySelectorAll('[data-family]').forEach((node) => node.classList.toggle('is-active', node === button));
    renderMatrix();
  });

  els.quality.addEventListener('input', () => {
    state.quality = Number(els.quality.value) / 100;
    els.qualityLabel.textContent = `${els.quality.value}%`;
  });
  els.historyClear.addEventListener('click', () => {
    state.history = [];
    saveHistory();
    renderHistory();
    toastFn('转换记录已清空');
  });
}

export function render(root, ctx = {}) {
  toastFn = typeof ctx.toast === 'function' ? ctx.toast : () => {};
  state.items = [];
  state.history = loadHistory();
  root.innerHTML = `<div class="converter-app">
    <aside class="converter-side">
      <div class="conv-side-kicker"><span>CONVERTER / 001</span><span class="conv-live"><i></i>LOCAL</span></div>
      <h2 class="conv-side-title">格式矩阵</h2>
      <p class="conv-side-desc">先选方向，再拖入文件。每一行都是当前浏览器里真实可跑的路径。</p>
      <div class="conv-filters" id="convFilters" role="group" aria-label="转换分类">
        <button type="button" class="conv-filter is-active" data-family="all">全部</button>
        <button type="button" class="conv-filter" data-family="image">图片</button>
        <button type="button" class="conv-filter" data-family="data">数据 / 文档</button>
        <button type="button" class="conv-filter" data-family="audio">音频</button>
      </div>
      <label class="conv-search"><span>SEARCH / ROUTES</span><input id="convMatrixSearch" type="search" placeholder="PNG、CSV、WAV…" autocomplete="off"></label>
      <div class="conv-matrix" id="convMatrix"></div>
      <div class="conv-matrix-count" id="convMatrixCount"></div>
      <div class="conv-quality">
        <label for="convQuality"><span>JPEG / WEBP QUALITY</span><b id="convQualityLabel">90%</b></label>
        <input id="convQuality" type="range" min="40" max="100" step="1" value="90">
      </div>
      <div class="conv-history-head"><span>HISTORY / LOCAL</span><button type="button" id="convHistoryClear">清空</button></div>
      <div class="conv-history" id="convHistoryList"></div>
      <p class="conv-note">视频、Office/PDF、电子书和 3D 模型需要本地转换引擎，当前暂不开放，也不会伪造转换结果。</p>
    </aside>
    <main class="converter-main">
      <div class="conv-main-head">
        <div><span class="conv-eyebrow">DROP ZONE / BATCH 001</span><h3>把文件拖进来。</h3></div>
        <div class="conv-main-count"><b>${ROUTE_COUNT}</b><span>REAL ROUTES</span></div>
      </div>
      <input class="conv-file-input" id="convFile" type="file" multiple accept=".png,.jpg,.jpeg,.webp,.gif,.json,.csv,.md,.markdown,.txt,.html,.htm,.mp3,.ogg,.oga,.m4a,.aac,.flac">
      <label class="conv-drop" id="convDrop" for="convFile" tabindex="0">
        <span class="conv-drop-icon">⇣</span>
        <span class="conv-drop-title">拖入文件，或点击选择</span>
        <span class="conv-drop-sub">PNG · JPG · WEBP · GIF · JSON · CSV · MD · TXT · HTML · MP3 · M4A · OGG · AAC · FLAC</span>
        <span class="conv-drop-meta"><i></i>LOCAL ONLY · 图片 60MB / 数据 10MB / 音频 80MB · 不上传服务器</span>
      </label>
      <div class="conv-toolbar">
        <span class="conv-queue-count" id="convQueueCount">QUEUE / 00</span>
        <span class="conv-progress-label" id="convProgressLabel">0 / 0 DONE</span>
        <span class="conv-toolbar-actions">
          <button type="button" class="conv-btn conv-btn--primary" id="convConvertAll">全部转换</button>
          <button type="button" class="conv-btn" id="convDownloadAll">下载全部</button>
          <button type="button" class="conv-btn conv-btn--ghost" id="convClear">清空</button>
        </span>
      </div>
      <div class="conv-progress"><i id="convProgressBar"></i></div>
      <div class="conv-queue" id="convQueue"></div>
      <div class="conv-empty" id="convEmpty">
        <span class="conv-empty-mark">∅</span>
        <b>队列为空</b>
        <span>拖入文件后会出现在这里。图片、数据、文档和音频都在本机处理。</span>
      </div>
      <div class="conv-footnote"><span>NO SERVER / NO UPLOAD</span><span>BYTECRAFT / 2026</span></div>
    </main>
  </div>`;

  els = {
    root: root.querySelector('.converter-app'),
    drop: root.querySelector('#convDrop'),
    fileInput: root.querySelector('#convFile'),
    queue: root.querySelector('#convQueue'),
    empty: root.querySelector('#convEmpty'),
    queueCount: root.querySelector('#convQueueCount'),
    progressLabel: root.querySelector('#convProgressLabel'),
    progressBar: root.querySelector('#convProgressBar'),
    convertAll: root.querySelector('#convConvertAll'),
    downloadAll: root.querySelector('#convDownloadAll'),
    clear: root.querySelector('#convClear'),
    matrix: root.querySelector('#convMatrix'),
    matrixCount: root.querySelector('#convMatrixCount'),
    matrixSearch: root.querySelector('#convMatrixSearch'),
    filters: root.querySelector('#convFilters'),
    quality: root.querySelector('#convQuality'),
    qualityLabel: root.querySelector('#convQualityLabel'),
    historyList: root.querySelector('#convHistoryList'),
    historyClear: root.querySelector('#convHistoryClear'),
  };

  bind();
  renderAll();
}
