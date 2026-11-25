/* DOCX 打印流程：mammoth → 完整 HTML → 隐藏 iframe → 系统打印面板。 */

import { getJSZip, getMammoth } from '../docs-core.js';

const PRINT_CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  html, body { margin: 0; padding: 0; background: #fff; color: #111; }
  body { font-family: "Songti SC", "SimSun", "Noto Serif CJK SC", serif; font-size: 11pt; line-height: 1.7; }
  .docx-body p { margin: 0 0 0.6em; text-align: justify; }
  h1, h2, h3, h4, h5, h6 { break-after: avoid; page-break-after: avoid; margin: 1.1em 0 0.5em; line-height: 1.35; }
  img { max-width: 100%; height: auto; break-inside: avoid; page-break-inside: avoid; }
  table { width: 100%; border-collapse: collapse; margin: 0.6em 0 1em; break-inside: auto; }
  tr, td, th { break-inside: avoid; page-break-inside: avoid; }
  th, td { border: 0.5pt solid #333; padding: 4pt 6pt; vertical-align: top; }
  ul, ol { margin: 0.4em 0 0.7em 1.4em; padding: 0; }
  li { margin: 0.2em 0; }
  a { color: #111; text-decoration: underline; }
  .page-note { color: #777; font-size: 9pt; }
`;

const MAMMOTH_OPTIONS = {
  styleMap: [
    "p[style-name='Title'] => h1:fresh",
    "p[style-name='Subtitle'] => h2:fresh",
    "p[style-name='Heading 1'] => h1:fresh",
    "p[style-name='Heading 2'] => h2:fresh",
    "p[style-name='Heading 3'] => h3:fresh",
    "p[style-name='Heading 4'] => h4:fresh",
  ],
};

function isSafari() {
  const ua = navigator.userAgent || '';
  return /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|Edg/.test(ua);
}

function waitForImages(doc) {
  const images = Array.from(doc.images || []);
  if (!images.length) return Promise.resolve();
  return Promise.all(images.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
      setTimeout(resolve, 1500);
    });
  }));
}

export async function docxPageCount(arrayBuffer) {
  try {
    const JSZip = await getJSZip();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const app = zip.file('docProps/app.xml');
    if (app) {
      const xml = await app.async('string');
      const match = xml.match(/<Pages>\s*(\d+)\s*<\/Pages>/i);
      if (match) return Number(match[1]);
    }
    const documentFile = zip.file('word/document.xml');
    if (!documentFile) return 0;
    const xml = await documentFile.async('string');
    return xml.match(/<w:br[^>]*w:type="page"/g)?.length + 1 || 0;
  } catch {
    return 0;
  }
}

export async function docxToHtml(arrayBuffer) {
  const mammoth = await getMammoth();
  const result = await mammoth.convertToHtml({ arrayBuffer }, MAMMOTH_OPTIONS);
  const body = result.value || '<p class="page-note">文档没有可打印内容。</p>';
  return `<!doctype html><html><head><meta charset="utf-8"><title>打印预览</title><style>${PRINT_CSS}</style></head><body><article class="docx-body">${body}</article></body></html>`;
}

export async function printDocx(arrayBuffer) {
  const html = await docxToHtml(arrayBuffer);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:0;';
  document.body.appendChild(iframe);

  const frameDoc = iframe.contentDocument;
  if (!frameDoc) {
    iframe.remove();
    throw new Error('浏览器无法创建打印预览 iframe');
  }
  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    setTimeout(() => iframe.remove(), 100);
  };
  const win = iframe.contentWindow;
  win.addEventListener('afterprint', cleanup, { once: true });

  await waitForImages(frameDoc);
  await new Promise((resolve) => setTimeout(resolve, 80));

  try {
    win.focus();
    win.print();
  } catch (err) {
    iframe.remove();
    throw new Error(`无法打开系统打印面板：${err.message}`);
  }

  if (isSafari()) setTimeout(cleanup, 3000);
  return { title: result.messages?.length ? result.messages[0].message : '' };
}
