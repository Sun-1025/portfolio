/* 文档转换：PDF / Office / EPUB / 3D。所有库按需加载，不上传文件。 */
import { wrapHtml, htmlToText } from './convert-core.js';
import { convertModel } from './model-core.js';

const scriptCache = new Map();
let pdfjsPromise = null;

function baseName(name) {
  return String(name || 'file').replace(/\.[^.]+$/, '') || 'file';
}

function loadScript(globalName, path) {
  if (window[globalName]) return Promise.resolve(window[globalName]);
  if (scriptCache.has(path)) return scriptCache.get(path);
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL(path, import.meta.url).href;
    script.async = true;
    script.onload = () => {
      if (window[globalName]) resolve(window[globalName]);
      else reject(new Error(`${globalName} 库加载失败`));
    };
    script.onerror = () => reject(new Error(`${globalName} 库加载失败`));
    document.head.appendChild(script);
  });
  scriptCache.set(path, promise);
  return promise;
}

const getPdfLib = () => loadScript('PDFLib', './vendor/pdf-lib.min.js');
const getMammoth = () => loadScript('mammoth', './vendor/mammoth.browser.min.js');
const getXLSX = () => loadScript('XLSX', './vendor/xlsx.full.min.js');
const getJSZip = () => loadScript('JSZip', './vendor/jszip.min.js');

async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('./vendor/pdf.min.mjs').then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.min.mjs', import.meta.url).href;
      return mod;
    });
  }
  return pdfjsPromise;
}

function blobFromText(content, mime, ext) {
  return { blob: new Blob([content], { type: mime }), ext };
}

function textResult(content, ext = 'txt') {
  return blobFromText(content, 'text/plain;charset=utf-8', ext);
}

function htmlResult(content) {
  return blobFromText(content, 'text/html;charset=utf-8', 'html');
}

function tidyText(text) {
  return String(text || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function pdfTextPage(items) {
  let out = '';
  let last = '';
  for (const item of items) {
    if (!item.str) continue;
    const next = item.str[0] || '';
    if (out && /[A-Za-z0-9]/.test(last) && /[A-Za-z0-9]/.test(next) && !/\s$/.test(out)) out += ' ';
    out += item.str;
    last = item.str[item.str.length - 1] || last;
    if (item.hasEOL) out += '\n';
  }
  return tidyText(out);
}

export async function pdfToText(file) {
  const pdfjs = await getPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  try {
    const pages = [];
    for (let n = 1; n <= doc.numPages; n += 1) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      pages.push(pdfTextPage(content.items));
      page.cleanup();
    }
    const body = pages.map((text, i) => `===== 第 ${i + 1} 页 =====\n\n${text}`).join('\n\n');
    return textResult(body || '（这份 PDF 没有可提取的文字，可能是扫描件）');
  } finally {
    await doc.destroy();
  }
}

export async function pdfToImages(file, target) {
  const pdfjs = await getPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const maxPages = 80;
  try {
    if (doc.numPages > maxPages) throw new Error(`PDF 超过 ${maxPages} 页，请拆分后再转`);
    const zip = doc.numPages > 1 ? new (await getJSZip())() : null;
    const blobs = [];
    for (let n = 1; n <= doc.numPages; n += 1) {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 2 });
      const maxSide = 4096;
      const scale = Math.min(2, maxSide / Math.max(base.width, base.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const context = canvas.getContext('2d', { alpha: target !== 'jpg' });
      if (!context) throw new Error('浏览器无法创建 PDF 画布');
      if (target === 'jpg') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      await page.render({ canvasContext: context, viewport }).promise;
      const mime = target === 'png' ? 'image/png' : 'image/jpeg';
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, target === 'png' ? undefined : 0.92));
      if (!blob) throw new Error('PDF 页面渲染失败');
      blobs.push(blob);
      if (zip) zip.file(`page-${String(n).padStart(2, '0')}.${target}`, blob);
      page.cleanup();
    }
    if (!zip) return { blob: blobs[0], ext: target, note: '第 1 页' };
    const archive = await zip.generateAsync({ type: 'blob' });
    return { blob: archive, ext: 'zip', note: `${doc.numPages} 页已打包` };
  } finally {
    await doc.destroy();
  }
}

async function imageBlobForPdf(file) {
  const ext = file.name.split('.').pop().toLowerCase().replace('jpeg', 'jpg');
  if (ext === 'jpg' || ext === 'png') return { bytes: await file.arrayBuffer(), type: ext };
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  context.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('图片转 PDF 失败');
  return { bytes: await blob.arrayBuffer(), type: 'png' };
}

export async function imageToPdf(file) {
  const PDFLib = await getPdfLib();
  const { bytes, type } = await imageBlobForPdf(file);
  const doc = await PDFLib.PDFDocument.create();
  const image = type === 'jpg' ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
  const width = image.width * 72 / 96;
  const height = image.height * 72 / 96;
  const page = doc.addPage([width, height]);
  page.drawImage(image, { x: 0, y: 0, width, height });
  const out = await doc.save();
  return { blob: new Blob([out], { type: 'application/pdf' }), ext: 'pdf' };
}

export async function docxConvert(file, target) {
  const mammoth = await getMammoth();
  const arrayBuffer = await file.arrayBuffer();
  if (target === 'txt') {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return textResult(tidyText(result.value));
  }
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return htmlResult(wrapHtml(baseName(file.name), result.value || '<p></p>'));
}

export async function xlsxConvert(file, target) {
  const XLSX = await getXLSX();
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const firstName = workbook.SheetNames[0];
  if (!firstName) throw new Error('工作簿里没有工作表');
  const sheet = workbook.Sheets[firstName];
  if (target === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ',', RS: '\n' });
    return blobFromText(`\uFEFF${csv}`, 'text/csv;charset=utf-8', 'csv');
  }
  if (target === 'json') {
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return blobFromText(JSON.stringify(rows, null, 2), 'application/json;charset=utf-8', 'json');
  }
  const html = XLSX.utils.sheet_to_html(sheet, { editable: false });
  return htmlResult(wrapHtml(`${baseName(file.name)} / ${firstName}`, html));
}

export async function dataToXlsx(file, from) {
  const XLSX = await getXLSX();
  const text = await file.text();
  let workbook;
  if (from === 'json') {
    let data;
    try { data = JSON.parse(text.replace(/^\uFEFF/, '')); } catch (err) { throw new Error('JSON 解析失败'); }
    const rows = Array.isArray(data) ? data : [data];
    const sheet = XLSX.utils.json_to_sheet(rows.map((row) => (row && typeof row === 'object' ? row : { value: row })));
    workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  } else {
    workbook = XLSX.read(text, { type: 'string' });
  }
  const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return { blob: new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), ext: 'xlsx' };
}

export async function pptxToText(file) {
  const JSZip = await getJSZip();
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slides = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/(\d+)\.xml$/)[1]) - Number(b.match(/(\d+)\.xml$/)[1]));
  if (!slides.length) throw new Error('PPTX 里没有找到幻灯片');
  const out = [];
  for (let i = 0; i < slides.length; i += 1) {
    const xml = await zip.file(slides[i]).async('string');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const texts = Array.from(doc.getElementsByTagNameNS('*', 't')).map((node) => node.textContent.trim()).filter(Boolean);
    out.push(`===== 第 ${i + 1} 页 =====\n\n${texts.join('\n')}`);
  }
  return textResult(out.join('\n\n'));
}

function resolvePath(base, relative) {
  const clean = decodeURIComponent(String(relative || '')).replace(/\\/g, '/');
  if (clean.startsWith('/')) return clean.slice(1);
  const parts = `${base}/${clean}`.split('/');
  const out = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

const imageMime = (path) => {
  const ext = path.split('.').pop().toLowerCase();
  return { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' }[ext] || 'application/octet-stream';
};

async function inlineEpubImages(doc, zip, chapterPath) {
  const images = Array.from(doc.querySelectorAll('img[src]'));
  for (const img of images) {
    const src = img.getAttribute('src');
    if (!src || /^(data:|https?:|#)/i.test(src)) continue;
    const target = resolvePath(chapterPath.split('/').slice(0, -1).join('/'), src);
    const entry = zip.file(target);
    if (!entry) continue;
    try {
      const base64 = await entry.async('base64');
      img.setAttribute('src', `data:${imageMime(target)};base64,${base64}`);
    } catch (err) { /* 单张图片失败不影响正文 */ }
  }
}

export async function epubConvert(file, target) {
  const JSZip = await getJSZip();
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const container = zip.file('META-INF/container.xml');
  let opfPath = '';
  if (container) {
    const xml = await container.async('string');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    opfPath = doc.getElementsByTagNameNS('*', 'rootfile')[0]?.getAttribute('full-path') || '';
  }
  if (!opfPath) {
    const candidates = Object.keys(zip.files).filter((name) => name.toLowerCase().endsWith('.opf'));
    opfPath = candidates[0] || '';
  }
  if (!opfPath) throw new Error('找不到 EPUB 的 OPF 清单');
  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error('EPUB 的 OPF 清单缺失');
  const opfXml = await opfFile.async('string');
  const opf = new DOMParser().parseFromString(opfXml, 'application/xml');
  const base = opfPath.split('/').slice(0, -1).join('/');
  const manifest = new Map();
  Array.from(opf.getElementsByTagNameNS('*', 'item')).forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) manifest.set(id, { href, type: item.getAttribute('media-type') || '' });
  });
  const spine = Array.from(opf.getElementsByTagNameNS('*', 'itemref'))
    .map((item) => manifest.get(item.getAttribute('idref')))
    .filter((item) => item && /html|xml/.test(item.type || 'html'));
  const fallback = Object.keys(zip.files)
    .filter((name) => /\.(x?html?)$/i.test(name) && !name.startsWith('META-INF/'))
    .sort();
  const chapters = spine.length ? spine.map((item) => item.href) : fallback;
  if (!chapters.length) throw new Error('EPUB 里没有可读取的正文');
  const title = (opf.getElementsByTagNameNS('*', 'title')[0]?.textContent || baseName(file.name)).trim();
  const parts = [];
  const texts = [];
  for (let i = 0; i < chapters.length; i += 1) {
    const path = resolvePath(base, chapters[i]);
    const entry = zip.file(path);
    if (!entry) continue;
    const html = await entry.async('string');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,style,iframe,object,embed,link').forEach((node) => node.remove());
    Array.from(doc.querySelectorAll('*')).forEach((node) => {
      Array.from(node.attributes).forEach((attr) => { if (/^on/i.test(attr.name)) node.removeAttribute(attr.name); });
    });
    await inlineEpubImages(doc, zip, path);
    const body = doc.body?.innerHTML || '';
    if (target === 'txt') {
      texts.push(`===== 第 ${i + 1} 章 =====\n\n${tidyText(doc.body?.textContent || '')}`);
    } else {
      parts.push(`<section class="epub-chapter"><h2>第 ${i + 1} 章</h2>${body}</section>`);
    }
  }
  if (target === 'txt') return textResult(texts.join('\n\n'));
  return htmlResult(wrapHtml(title, `<h1>${title}</h1>${parts.join('\n')}`));
}

export async function modelConvert(file, from, to) {
  const text = await convertModel(await file.arrayBuffer(), from, to);
  return blobFromText(text, 'text/plain;charset=utf-8', to);
}

export { htmlToText };
