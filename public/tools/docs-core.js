/* 文档转换：PDF / Office / EPUB / 3D。所有库按需加载，不上传文件。 */
import { wrapHtml, jsonToCsv } from './convert-core.js';
import { convertModel } from './model-core.js';
import { convertStructuredText } from './data-core.js';

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
export const getMammoth = () => loadScript('mammoth', './vendor/mammoth.browser.min.js');
export const getXLSX = () => loadScript('XLSX', './vendor/xlsx.full.min.js');
export const getJSZip = () => loadScript('JSZip', './vendor/jszip.min.js');
const getYaml = () => loadScript('jsyaml', './vendor/js-yaml.min.js');
const getTurndown = () => loadScript('TurndownService', './vendor/turndown.js');
const getLame = () => loadScript('lamejs', './vendor/lame.min.js');

async function htmlToMarkdown(html) {
  const TurndownService = await getTurndown();
  const service = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
  });
  return service.turndown(String(html || ''));
}

async function fileToJson(file) {
  try { return JSON.parse((await file.text()).replace(/^\uFEFF/, '')); } catch (err) { throw new Error('JSON 解析失败'); }
}

export async function yamlConvert(file, target) {
  const yaml = await getYaml();
  let data;
  try { data = yaml.load((await file.text()).replace(/^\uFEFF/, '')); } catch (err) { throw new Error('YAML 解析失败'); }
  if (target === 'json') return blobFromText(JSON.stringify(data, null, 2), 'application/json;charset=utf-8', 'json');
  if (target === 'csv') {
    const rows = Array.isArray(data) ? data : [data];
    if (!rows.length || rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('YAML 顶层需要是对象或对象数组');
    return blobFromText(jsonToCsv(JSON.stringify(rows)), 'text/csv;charset=utf-8', 'csv');
  }
  return textResult(JSON.stringify(data, null, 2));
}

export async function jsonToYaml(file) {
  const yaml = await getYaml();
  return blobFromText(yaml.dump(await fileToJson(file), { noRefs: true, lineWidth: 100 }), 'text/yaml;charset=utf-8', 'yaml');
}

export async function htmlToMarkdownFile(file) {
  return textResult(await htmlToMarkdown(await file.text()), 'md');
}

export async function structuredTextConvert(file, from, to) {
  const text = await file.text();
  if (from === 'json' && to === 'yaml') {
    return textResult(await (await getYaml()).dump(JSON.parse(text.replace(/^\uFEFF/, ''))), 'yaml');
  }
  if (from === 'csv' && to === 'yaml') {
    const { csvToJson } = await import('./convert-core.js');
    return textResult(await (await getYaml()).dump(JSON.parse(csvToJson(text))), 'yaml');
  }
  const result = convertStructuredText(text, from, to);
  return blobFromText(result.content, result.mime, result.ext);
}

export async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('./vendor/pdf.min.mjs').then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = '/tools/vendor/pdf.worker.min.mjs';
      return mod;
    });
  }
  return pdfjsPromise;
}

export async function openPdf(data) {
  const pdfjs = await getPdfjs();
  return pdfjs.getDocument({
    data,
    cMapUrl: new URL('./vendor/cmaps/', import.meta.url).href,
    cMapPacked: true,
  }).promise;
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
  const doc = await openPdf(new Uint8Array(await file.arrayBuffer()));
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
  const doc = await openPdf(new Uint8Array(await file.arrayBuffer()));
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
  let source;
  let width;
  let height;
  try {
    source = await createImageBitmap(file);
    width = source.width;
    height = source.height;
  } catch (err) {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    await image.decode();
    source = image;
    width = image.naturalWidth || image.width || 1024;
    height = image.naturalHeight || image.height || 1024;
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.drawImage(source, 0, 0, width, height);
  source.close?.();
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
  if (target === 'md') return textResult(await htmlToMarkdown(result.value || ''), 'md');
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
  if (target === 'tsv') {
    const tsv = XLSX.utils.sheet_to_csv(sheet, { FS: '\t', RS: '\n' });
    return blobFromText(`\uFEFF${tsv}`, 'text/tab-separated-values;charset=utf-8', 'tsv');
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

export async function pptxConvert(file, target) {
  const JSZip = await getJSZip();
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slides = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/(\d+)\.xml$/)[1]) - Number(b.match(/(\d+)\.xml$/)[1]));
  if (!slides.length) throw new Error('PPTX 里没有找到幻灯片');
  const pages = [];
  for (let i = 0; i < slides.length; i += 1) {
    const xml = await zip.file(slides[i]).async('string');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const texts = Array.from(doc.getElementsByTagNameNS('*', 't')).map((node) => node.textContent.trim()).filter(Boolean);
    pages.push(texts);
  }
  if (target === 'html') {
    const body = pages.map((texts, i) => `<section><h2>第 ${i + 1} 页</h2>${texts.map((text) => `<p>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`).join('')}</section>`).join('\n');
    return htmlResult(wrapHtml(baseName(file.name), body));
  }
  return textResult(pages.map((texts, i) => `===== 第 ${i + 1} 页 =====\n\n${texts.join('\n')}`).join('\n\n'));
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
  const htmlBody = `<h1>${title}</h1>${parts.join('\n')}`;
  if (target === 'md') return textResult(await htmlToMarkdown(htmlBody), 'md');
  return htmlResult(wrapHtml(title, htmlBody));
}

export async function audioBufferToMp3(audioBuffer) {
  const lame = await getLame();
  if (!lame || typeof lame.Mp3Encoder !== 'function') throw new Error('MP3 编码器加载失败');
  const channels = Math.min(2, audioBuffer.numberOfChannels) || 1;
  const sampleRate = audioBuffer.sampleRate;
  const encoder = new lame.Mp3Encoder(channels, sampleRate, 128);
  const block = 1152;
  const left = audioBuffer.getChannelData(0);
  const right = channels > 1 ? audioBuffer.getChannelData(1) : left;
  const chunks = [];
  for (let offset = 0; offset < audioBuffer.length; offset += block) {
    const length = Math.min(block, audioBuffer.length - offset);
    const leftChunk = new Int16Array(length);
    const rightChunk = new Int16Array(length);
    for (let i = 0; i < length; i += 1) {
      const l = Math.max(-1, Math.min(1, left[offset + i]));
      leftChunk[i] = l < 0 ? l * 0x8000 : l * 0x7fff;
      if (channels > 1) {
        const r = Math.max(-1, Math.min(1, right[offset + i]));
        rightChunk[i] = r < 0 ? r * 0x8000 : r * 0x7fff;
      }
    }
    const encoded = encoder.encodeBuffer(leftChunk, channels > 1 ? rightChunk : leftChunk);
    if (encoded.length) chunks.push(new Int8Array(encoded));
  }
  const tail = encoder.flush();
  if (tail.length) chunks.push(new Int8Array(tail));
  return new Blob(chunks, { type: 'audio/mpeg' });
}

export async function fb2Convert(file, target) {
  const xml = await file.text();
  const doc = new DOMParser().parseFromString(xml.replace(/^\uFEFF/, ''), 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('FB2 XML 解析失败');
  const title = (doc.getElementsByTagNameNS('*', 'book-title')[0]?.textContent || baseName(file.name)).trim();
  const body = doc.getElementsByTagNameNS('*', 'body')[0];
  if (!body) throw new Error('FB2 里没有正文');
  const paragraphs = Array.from(body.getElementsByTagNameNS('*', 'p')).map((node) => node.textContent.trim()).filter(Boolean);
  if (!paragraphs.length) throw new Error('FB2 里没有可读取的段落');
  const htmlBody = `<h1>${title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</h1>${paragraphs.map((text) => `<p>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`).join('\n')}`;
  if (target === 'txt') return textResult(paragraphs.join('\n\n'));
  if (target === 'md') return textResult(await htmlToMarkdown(htmlBody), 'md');
  return htmlResult(wrapHtml(title, htmlBody));
}

export async function cbzToPdf(file) {
  const JSZip = await getJSZip();
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const images = Object.keys(zip.files)
    .filter((name) => !zip.files[name].dir && /\.(png|jpe?g|webp|gif)$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  if (!images.length) throw new Error('CBZ 里没有图片');
  if (images.length > 100) throw new Error('CBZ 超过 100 张图片，请拆分后再转');
  const PDFLib = await getPdfLib();
  const doc = await PDFLib.PDFDocument.create();
  for (const name of images) {
    const blob = await zip.file(name).async('blob');
    const imageFile = new File([blob], name.split('/').pop() || 'page.png', { type: blob.type || 'application/octet-stream' });
    const { bytes, type } = await imageBlobForPdf(imageFile);
    const image = type === 'jpg' ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
    const width = image.width * 72 / 96;
    const height = image.height * 72 / 96;
    const page = doc.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
  }
  const out = await doc.save();
  return { blob: new Blob([out], { type: 'application/pdf' }), ext: 'pdf' };
}

export async function modelConvert(file, from, to) {
  const text = await convertModel(await file.arrayBuffer(), from, to);
  return blobFromText(text, 'text/plain;charset=utf-8', to);
}
