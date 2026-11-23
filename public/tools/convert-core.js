/* 本地转换核心：只放纯函数，便于浏览器和 Node 测试复用。 */

export const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg', 'ico'];
export const DATA_EXT = ['json', 'csv', 'md', 'markdown', 'txt', 'html', 'htm', 'xml', 'yaml', 'yml', 'ini', 'tsv', 'ndjson'];
export const AUDIO_EXT = ['mp3', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'wav'];
export const PDF_EXT = ['pdf'];
export const OFFICE_EXT = ['docx', 'xlsx', 'xls', 'pptx', 'ods'];
export const EBOOK_EXT = ['epub', 'fb2', 'cbz'];
export const MODEL_EXT = ['stl', 'obj', 'ply'];

export const IMAGE_TARGETS = ['png', 'jpg', 'webp', 'pdf'];
export const AUDIO_TARGETS = ['wav', 'mp3'];

export const MATRIX = [
  { family: 'image', from: 'PNG', targets: ['JPG', 'WEBP', 'PDF'], note: '透明底转 JPG 自动补白' },
  { family: 'image', from: 'JPG / JPEG', targets: ['PNG', 'WEBP', 'PDF'], note: '保留原尺寸' },
  { family: 'image', from: 'WEBP', targets: ['PNG', 'JPG', 'PDF'], note: '适合导出通用图片' },
  { family: 'image', from: 'GIF', targets: ['PNG', 'JPG', 'WEBP', 'PDF'], note: '静态首帧' },
  { family: 'image', from: 'BMP', targets: ['PNG', 'JPG', 'WEBP', 'PDF'], note: '位图转通用格式' },
  { family: 'image', from: 'SVG', targets: ['PNG', 'JPG', 'WEBP', 'PDF'], note: '矢量栅格化' },
  { family: 'image', from: 'ICO', targets: ['PNG', 'JPG', 'WEBP', 'PDF'], note: '图标取最大帧' },
  { family: 'data', from: 'JSON', targets: ['CSV', 'TXT', 'XLSX', 'XML', 'YAML', 'INI', 'TSV', 'NDJSON'], note: '数组对象转表格' },
  { family: 'data', from: 'CSV', targets: ['JSON', 'TXT', 'XLSX', 'TSV', 'YAML'], note: '首行作为字段名' },
  { family: 'data', from: 'YAML', targets: ['JSON', 'CSV', 'TXT'], note: '解析 YAML 结构' },
  { family: 'data', from: 'XML', targets: ['JSON', 'TXT'], note: '元素转对象' },
  { family: 'data', from: 'INI', targets: ['JSON', 'TXT'], note: '分组键值对' },
  { family: 'data', from: 'TSV', targets: ['CSV', 'JSON', 'TXT'], note: '制表符分隔' },
  { family: 'data', from: 'NDJSON', targets: ['JSON', 'CSV', 'TXT'], note: '每行一个对象' },
  { family: 'data', from: 'Markdown', targets: ['HTML', 'TXT'], note: '可下载完整 HTML' },
  { family: 'data', from: 'TXT', targets: ['HTML'], note: '纯文本转网页' },
  { family: 'data', from: 'HTML', targets: ['TXT', 'MD'], note: '正文提取 / 转 Markdown' },
  { family: 'audio', from: 'MP3 / M4A / OGG / AAC / FLAC / WAV', targets: ['WAV', 'MP3'], note: '浏览器解码后转 PCM 或 MP3' },
  { family: 'pdf', from: 'PDF', targets: ['TXT', 'PNG', 'JPG'], note: '逐页提取文字或渲染' },
  { family: 'office', from: 'DOCX', targets: ['HTML', 'TXT', 'MD'], note: '保留标题、段落与表格' },
  { family: 'office', from: 'XLSX / XLS', targets: ['CSV', 'JSON', 'HTML', 'TSV'], note: '读取首个工作表' },
  { family: 'office', from: 'ODS', targets: ['CSV', 'JSON', 'HTML', 'TSV'], note: '读取首个工作表' },
  { family: 'office', from: 'PPTX', targets: ['TXT', 'HTML'], note: '提取每页文字' },
  { family: 'office', from: 'CSV / JSON', targets: ['XLSX'], note: '写入 Excel 工作簿' },
  { family: 'ebook', from: 'EPUB', targets: ['HTML', 'TXT', 'MD'], note: '按阅读顺序合并章节' },
  { family: 'ebook', from: 'FB2', targets: ['HTML', 'TXT', 'MD'], note: 'XML 电子书正文' },
  { family: 'ebook', from: 'CBZ', targets: ['PDF'], note: '漫画图片合成 PDF' },
  { family: 'model', from: 'STL', targets: ['OBJ', 'PLY'], note: '三角网格，无材质' },
  { family: 'model', from: 'OBJ', targets: ['STL', 'PLY'], note: '三角网格，无材质' },
  { family: 'model', from: 'PLY', targets: ['OBJ', 'STL'], note: '三角网格，无材质' },
];

export function extOf(name) {
  const m = String(name || '').toLowerCase().match(/([a-z0-9]+)$/);
  if (!m) return '';
  const ext = m[1];
  return ext === 'jpeg' ? 'jpg' : ext === 'markdown' ? 'md' : ext === 'oga' ? 'ogg' : ext === 'htm' ? 'html' : ext === 'yml' ? 'yaml' : ext;
}

export function familyOf(ext) {
  if (IMAGE_EXT.includes(ext)) return 'image';
  if (DATA_EXT.includes(ext)) return 'data';
  if (AUDIO_EXT.includes(ext)) return 'audio';
  if (PDF_EXT.includes(ext)) return 'pdf';
  if (OFFICE_EXT.includes(ext)) return 'office';
  if (EBOOK_EXT.includes(ext)) return 'ebook';
  if (MODEL_EXT.includes(ext)) return 'model';
  return '';
}

export function targetsFor(ext) {
  if (IMAGE_EXT.includes(ext)) return IMAGE_TARGETS.filter((x) => x !== ext);
  if (ext === 'json') return ['csv', 'txt', 'xlsx', 'xml', 'yaml', 'ini', 'tsv', 'ndjson'];
  if (ext === 'csv') return ['json', 'txt', 'xlsx', 'tsv', 'yaml'];
  if (ext === 'yaml') return ['json', 'csv', 'txt'];
  if (ext === 'xml') return ['json', 'txt'];
  if (ext === 'ini') return ['json', 'txt'];
  if (ext === 'tsv') return ['csv', 'json', 'txt'];
  if (ext === 'ndjson') return ['json', 'csv', 'txt'];
  if (ext === 'md') return ['html', 'txt'];
  if (ext === 'txt') return ['html'];
  if (ext === 'html') return ['txt', 'md'];
  if (AUDIO_EXT.includes(ext)) return AUDIO_TARGETS.filter((x) => x !== ext);
  if (ext === 'pdf') return ['txt', 'png', 'jpg'];
  if (ext === 'docx') return ['html', 'txt', 'md'];
  if (ext === 'xlsx' || ext === 'xls' || ext === 'ods') return ['csv', 'json', 'html', 'tsv'];
  if (ext === 'pptx') return ['txt', 'html'];
  if (ext === 'epub' || ext === 'fb2') return ['html', 'txt', 'md'];
  if (ext === 'cbz') return ['pdf'];
  if (ext === 'stl') return ['obj', 'ply'];
  if (ext === 'obj') return ['stl', 'ply'];
  if (ext === 'ply') return ['obj', 'stl'];
  return [];
}

export const ROUTE_COUNT = Array.from(new Set([
  ...IMAGE_EXT, ...DATA_EXT, ...AUDIO_EXT,
  ...PDF_EXT, ...OFFICE_EXT, ...EBOOK_EXT, ...MODEL_EXT,
].map(extOf))).reduce((sum, ext) => sum + targetsFor(ext).length, 0);

export function defaultTarget(ext) {
  const targets = targetsFor(ext);
  return targets[0] || '';
}

export function imageTargetFor(ext) {
  if (!IMAGE_EXT.includes(ext)) return '';
  if (ext === 'webp') return 'png';
  return 'webp';
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function normalize(text) {
  return String(text || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

export function parseCSV(text) {
  const input = normalize(text);
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows.filter((r) => r.some((c) => c !== ''));
}

function safeKey(key, index, seen) {
  const base = String(key || '').trim() || `列${index + 1}`;
  if (!seen.has(base)) {
    seen.add(base);
    return base;
  }
  let n = 2;
  while (seen.has(`${base}_${n}`)) n += 1;
  const next = `${base}_${n}`;
  seen.add(next);
  return next;
}

export function csvToJson(text) {
  const rows = parseCSV(text);
  if (!rows.length) throw new Error('CSV 为空');
  const seen = new Set();
  const headers = rows[0].map((h, i) => safeKey(h, i, seen));
  const objects = rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    return obj;
  });
  return JSON.stringify(objects, null, 2);
}

function csvCell(value) {
  if (value == null) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function jsonToCsv(text) {
  let data;
  try { data = JSON.parse(normalize(text)); } catch (err) { throw new Error('JSON 解析失败'); }
  if (!Array.isArray(data)) throw new Error('JSON 顶层需要是数组');
  const objects = data.filter((item) => item && typeof item === 'object' && !Array.isArray(item));
  if (!objects.length) throw new Error('数组里没有可转成表格的对象');
  const headers = Array.from(new Set(objects.flatMap((item) => Object.keys(item))));
  const lines = [
    headers.map(csvCell).join(','),
    ...objects.map((item) => headers.map((key) => csvCell(item[key])).join(',')),
  ];
  return `\uFEFF${lines.join('\n')}`;
}

export function csvToText(text) {
  const rows = parseCSV(text);
  if (!rows.length) throw new Error('CSV 为空');
  return rows.map((row) => row.join('\t')).join('\n');
}

export function jsonToText(text) {
  try { return JSON.stringify(JSON.parse(normalize(text)), null, 2); } catch (err) { throw new Error('JSON 解析失败'); }
}

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

export function markdownToHtmlBody(markdown) {
  const lines = normalize(markdown).split('\n');
  const out = [];
  let inCode = false;
  let codeLines = [];
  let list = '';
  const closeList = () => { if (list) { out.push(`</${list}>`); list = ''; } };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (line.startsWith('```')) {
      if (inCode) { out.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`); inCode = false; codeLines = []; }
      else { closeList(); inCode = true; }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }
    if (!line.trim()) { closeList(); continue; }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) { closeList(); out.push(`<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) { closeList(); out.push('<hr>'); continue; }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) { closeList(); out.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`); continue; }
    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ul) { if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${inlineMarkdown(ul[1])}</li>`); continue; }
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) { if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inlineMarkdown(ol[1])}</li>`); continue; }
    closeList();
    out.push(`<p>${inlineMarkdown(line.trim())}</p>`);
  }
  if (inCode) out.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  closeList();
  return out.join('\n');
}

export function markdownToText(markdown) {
  return normalize(markdown)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_~`>]/g, '')
    .replace(/^\s*[-+]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function textToHtml(text) {
  const blocks = normalize(text).split(/\n\s*\n/).filter((b) => b.trim());
  const body = blocks.map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`).join('\n');
  return body || '<p></p>';
}

export function htmlToText(text) {
  const input = normalize(text);
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(input, 'text/html');
    doc.querySelectorAll('script,style').forEach((el) => el.remove());
    return (doc.body?.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  }
  return input.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export function wrapHtml(title, body) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body{max-width:760px;margin:48px auto;padding:0 24px;color:#17201b;background:#f7f8f3;font:16px/1.8 system-ui,-apple-system,"Segoe UI",sans-serif}
  h1,h2,h3{line-height:1.25;margin:1.6em 0 .7em}
  h1{font-size:2em}h2{font-size:1.5em}h3{font-size:1.2em}
  pre{overflow:auto;padding:16px;border:1px solid #dce3d8;background:#eff3ea;border-radius:6px}
  code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
  blockquote{margin:1em 0;padding:.2em 0 .2em 1em;border-left:3px solid #698900;color:#526158}
  a{color:#698900}
</style>
</head>
<body>
${body}
</body>
</html>`;
}

export function convertDataText(text, from, to) {
  if (from === 'json' && to === 'csv') return { content: jsonToCsv(text), mime: 'text/csv;charset=utf-8', ext: 'csv' };
  if (from === 'json' && to === 'txt') return { content: jsonToText(text), mime: 'text/plain;charset=utf-8', ext: 'txt' };
  if (from === 'csv' && to === 'json') return { content: csvToJson(text), mime: 'application/json;charset=utf-8', ext: 'json' };
  if (from === 'csv' && to === 'txt') return { content: csvToText(text), mime: 'text/plain;charset=utf-8', ext: 'txt' };
  if (from === 'md' && to === 'html') return { content: wrapHtml('Markdown 导出', markdownToHtmlBody(text)), mime: 'text/html;charset=utf-8', ext: 'html' };
  if (from === 'md' && to === 'txt') return { content: markdownToText(text), mime: 'text/plain;charset=utf-8', ext: 'txt' };
  if (from === 'txt' && to === 'html') return { content: wrapHtml('文本导出', textToHtml(text)), mime: 'text/html;charset=utf-8', ext: 'html' };
  if (from === 'html' && to === 'txt') return { content: htmlToText(text), mime: 'text/plain;charset=utf-8', ext: 'txt' };
  throw new Error(`暂不支持 ${from.toUpperCase()} → ${to.toUpperCase()}`);
}

export function wavBlobFromAudioBuffer(audioBuffer) {
  const channels = Math.min(2, audioBuffer.numberOfChannels);
  const frames = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;
  const bytes = 44 + frames * channels * 2;
  const buffer = new ArrayBuffer(bytes);
  const view = new DataView(buffer);
  const write = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, bytes - 8, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, frames * channels * 2, true);
  let offset = 44;
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([buffer], { type: 'audio/wav' });
}
