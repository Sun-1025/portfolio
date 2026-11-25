/* 工具：Word → PDF（浏览器打印面板，另存为 PDF） */

import { dropZoneHtml, wireDrop } from './lib/file-drop.js';
import { printDocx, docxPageCount } from './lib/word-print.js';
import { formatBytes } from './lib/download.js';

const MAX_BYTES = 40 * 1024 * 1024;

export function render(root) {
  root.innerHTML = `
    <p class="hint" style="margin:0 0 16px">会打开系统打印面板，选择「另存为 PDF」。批注、修订、复杂域会丢；图片和表格按 HTML 打印样式排版，不保证与原 Word 完全一致。</p>
    <div class="field">
      <label for="wtpFile">Word 文件（.docx）</label>
      ${dropZoneHtml({ id: 'wtp', accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document', title: '拖入 DOCX，或点击选择', sub: '单份最大 40MB；文件只在浏览器本地处理，不上传。' })}
    </div>
    <div class="tool-row">
      <button class="v5-btn v5-btn--primary" id="wtpPrint" type="button" disabled>打印 / 保存为 PDF</button>
      <button class="mini-btn" id="wtpReset" type="button" hidden>换一个文件</button>
    </div>
    <p class="tool-loading" id="wtpStatus" hidden></p>
    <p class="tool-error" id="wtpError" hidden></p>
    <div class="tool-result" id="wtpResult" hidden></div>
    <p class="hint">打印面板里选择「另存为 PDF」即可得到 PDF。这个工具不会生成位图 PDF，文字在 PDF 中仍然可选、可搜索。超过 20MB 或 100 页的文档可能比较慢。</p>`;

  const drop = root.querySelector('#wtpDrop');
  const printBtn = root.querySelector('#wtpPrint');
  const resetBtn = root.querySelector('#wtpReset');
  const status = root.querySelector('#wtpStatus');
  const error = root.querySelector('#wtpError');
  const result = root.querySelector('#wtpResult');

  let selected = null;
  let running = false;

  function setStatus(text) {
    status.textContent = text;
    status.hidden = !text;
  }
  function setError(text) {
    error.textContent = text;
    error.hidden = !text;
  }
  function setSelected(file) {
    selected = file;
    printBtn.disabled = !file;
    resetBtn.hidden = !file;
    const title = drop.querySelector('.conv-drop-title');
    const sub = drop.querySelector('.conv-drop-sub');
    if (title) title.textContent = file.name;
    if (sub) sub.textContent = `${formatBytes(file.size)} · 已选择，点击按钮打开打印面板`;
    if (file.size > 20 * 1024 * 1024) {
      setError('文件超过 20MB，打印预览可能需要较长时间；如果浏览器卡住，建议先在 Word 里拆分文档。');
    }
  }

  wireDrop(root, {
    id: 'wtp',
    maxBytes: MAX_BYTES,
    onFiles: ([file]) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.docx')) {
        setError('只接受 .docx 文件；旧版 .doc 请先在 Word 里另存为 .docx。');
        return;
      }
      setError('');
      setStatus('');
      result.hidden = true;
      setSelected(file);
    },
    onError: (message) => setError(message),
  });

  printBtn.addEventListener('click', async () => {
    if (!selected || running) return;
    running = true;
    setError('');
    setStatus('正在读取 DOCX…');
    result.hidden = true;
    printBtn.disabled = true;
    try {
      const buffer = await selected.arrayBuffer();
      const pages = await docxPageCount(buffer);
      setStatus(pages > 100 ? `文档约 ${pages} 页，正在生成打印预览；页数较多时可能需要更久…` : '正在生成打印预览…');
      await printDocx(buffer);
      setStatus('');
      result.innerHTML = `
        <div><strong>打印面板已打开</strong></div>
        <p class="hint" style="margin:8px 0 0">在系统打印面板里选择「另存为 PDF」，再选择保存位置即可。</p>
        <p class="hint" style="margin:4px 0 0">如果没有看到打印面板，请检查浏览器是否拦截了弹出窗口。</p>`;
      result.hidden = false;
      printBtn.textContent = '再次打印 / 保存为 PDF';
    } catch (err) {
      setStatus('');
      setError(`无法打印：${err.message || 'DOCX 解析出错'}`);
    } finally {
      running = false;
      printBtn.disabled = !selected;
    }
  });

  resetBtn.addEventListener('click', () => {
    selected = null;
    running = false;
    printBtn.disabled = true;
    printBtn.textContent = '打印 / 保存为 PDF';
    resetBtn.hidden = true;
    setStatus('');
    setError('');
    result.hidden = true;
    result.innerHTML = '';
    const title = drop.querySelector('.conv-drop-title');
    const sub = drop.querySelector('.conv-drop-sub');
    if (title) title.textContent = '拖入 DOCX，或点击选择';
    if (sub) sub.textContent = '单份最大 40MB；文件只在浏览器本地处理，不上传。';
  });
}
