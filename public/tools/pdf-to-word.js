/* 工具：PDF → Word（只保留文字与段落顺序） */

import { dropZoneHtml, wireDrop } from './lib/file-drop.js';
import { pdfToDocx, ScanOnlyError } from './lib/pdf-to-docx.js';
import { downloadBlob, formatBytes, safeFileName } from './lib/download.js';

const MAX_BYTES = 80 * 1024 * 1024;

export function render(root) {
  root.innerHTML = `
    <p class="hint" style="margin:0 0 16px">只保留文字与段落顺序：表格、双栏、图表、页眉页脚会丢。扫描件没有文字层，当前版本不做 OCR。</p>
    <div class="field">
      <label for="ptwFile">PDF 文件</label>
      ${dropZoneHtml({ id: 'ptw', accept: '.pdf,application/pdf', title: '拖入 PDF，或点击选择', sub: '单份最大 80MB；文件只在浏览器本地处理，不上传。' })}
    </div>
    <div class="tool-row">
      <button class="v5-btn v5-btn--primary" id="ptwConvert" type="button" disabled>开始转换</button>
      <button class="mini-btn" id="ptwCancel" type="button" hidden>取消</button>
      <button class="mini-btn" id="ptwReset" type="button" hidden>换一个文件</button>
    </div>
    <p class="tool-loading" id="ptwStatus" hidden></p>
    <p class="tool-error" id="ptwError" hidden></p>
    <div class="tool-result" id="ptwResult" hidden></div>
    <p class="hint">输出名为「原文件名-word.docx」。如果某些页是图片，会在对应页插入斜体提示，不会凭空生成文字。</p>`;

  const drop = root.querySelector('#ptwDrop');
  const convertBtn = root.querySelector('#ptwConvert');
  const cancelBtn = root.querySelector('#ptwCancel');
  const resetBtn = root.querySelector('#ptwReset');
  const status = root.querySelector('#ptwStatus');
  const error = root.querySelector('#ptwError');
  const result = root.querySelector('#ptwResult');

  let selected = null;
  let cancelled = false;
  let running = false;

  function setStatus(text) {
    status.textContent = text;
    status.hidden = !text;
  }
  function setError(text) {
    error.textContent = text;
    error.hidden = !text;
  }
  function setRunning(value) {
    running = value;
    convertBtn.disabled = value || !selected;
    cancelBtn.hidden = !value;
    resetBtn.hidden = value || !selected;
  }
  function reset() {
    selected = null;
    cancelled = false;
    setRunning(false);
    setStatus('');
    setError('');
    result.hidden = true;
    result.innerHTML = '';
    convertBtn.textContent = '开始转换';
    const title = drop?.querySelector('.conv-drop-title');
    const sub = drop?.querySelector('.conv-drop-sub');
    if (title) title.textContent = '拖入 PDF，或点击选择';
    if (sub) sub.textContent = '单份最大 80MB；文件只在浏览器本地处理，不上传。';
  }

  wireDrop(root, {
    id: 'ptw',
    maxBytes: MAX_BYTES,
    onFiles: ([file]) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('只接受 .pdf 文件');
        return;
      }
      selected = file;
      cancelled = false;
      setError('');
      setStatus('');
      result.hidden = true;
      const title = drop.querySelector('.conv-drop-title');
      const sub = drop.querySelector('.conv-drop-sub');
      if (title) title.textContent = file.name;
      if (sub) sub.textContent = `${formatBytes(file.size)} · 已选择，等待转换`;
      convertBtn.disabled = false;
    },
    onError: (message) => {
      setError(message);
      setStatus('');
    },
  });

  convertBtn.addEventListener('click', async () => {
    if (!selected || running) return;
    running = true;
    cancelled = false;
    setRunning(true);
    setError('');
    result.hidden = true;
    convertBtn.textContent = '转换中…';
    setStatus('正在读取 PDF…');
    try {
      const output = await pdfToDocx(selected, {
        isCancelled: () => cancelled,
        onProgress: (page, total) => setStatus(`正在读取第 ${page} / ${total} 页…`),
      });
      if (cancelled) throw Object.assign(new Error('已取消'), { name: 'AbortError' });
      const outputName = `${safeFileName(selected.name.replace(/\.pdf$/i, ''), 'document')}-word.docx`;
      const noText = output.noTextPages;
      result.innerHTML = `
        <div><strong>转换完成</strong></div>
        <p class="hint" style="margin:8px 0 0">${output.pages} 页 · ${formatBytes(output.blob.size)}${noText.length ? ` · ${noText.length} 页无文字层` : ''}</p>
        ${noText.length ? `<p class="hint">第 ${noText.join('、')} 页没有提取到文字，已在 Word 中插入斜体提示；这些页可能是图片。</p>` : ''}
        <div class="tool-row" style="margin-top:12px"><button class="v5-btn v5-btn--primary" id="ptwDownload" type="button">下载 .docx</button></div>`;
      result.hidden = false;
      setStatus('');
      const downloadBtn = root.querySelector('#ptwDownload');
      downloadBtn?.addEventListener('click', () => downloadBlob(output.blob, outputName));
      downloadBlob(output.blob, outputName);
      convertBtn.textContent = '重新转换';
    } catch (err) {
      if (err.name === 'AbortError' || cancelled) {
        setError('已取消，没有生成文件。');
      } else if (err instanceof ScanOnlyError) {
        setError('这个 PDF 没有文字层，当前版本不做 OCR。可以先用「PDF → TXT」或「PDF → 图片」导出，再处理。');
      } else if (err?.name === 'PasswordException') {
        setError('PDF 有密码保护，请先解除密码后再转换。');
      } else {
        setError(`转换失败：${err.message || 'PDF 解析出错'}`);
      }
    } finally {
      running = false;
      setRunning(false);
      convertBtn.textContent = selected ? '重新转换' : '开始转换';
    }
  });

  cancelBtn.addEventListener('click', () => {
    cancelled = true;
    setStatus('正在停止…');
  });
  resetBtn.addEventListener('click', reset);
  reset();
}
