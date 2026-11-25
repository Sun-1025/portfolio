/* PDF 文字层提取：按页读取，按 y 聚行，再按缩进重建段落。 */

import { openPdf } from '../docs-core.js';

const CJK = /[\u3400-\u9fff]/;
const PUNCT_END = /[。！？!?.;；:：,，、)）】”』…]$/;

function itemFont(item) {
  const t = item.transform || [];
  return Math.max(1, Math.abs(Number(item.height) || 0), Math.abs(Number(t[3]) || 0));
}

function cleanLineText(text) {
  return String(text || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
}

function buildLines(items) {
  const usable = (items || [])
    .filter((item) => item && String(item.str || '').trim())
    .map((item) => {
      const t = item.transform || [];
      const x = Number(t[4]) || 0;
      const y = Number(t[5]) || 0;
      const font = itemFont(item);
      return {
        str: String(item.str || ''),
        x,
        y,
        font,
        width: Math.abs(Number(item.width) || 0),
        height: Math.abs(Number(item.height) || 0),
      };
    });
  if (!usable.length) return [];

  usable.sort((a, b) => (Math.abs(b.y - a.y) > 0.01 ? b.y - a.y : a.x - b.x));
  const lines = [];
  let line = null;

  for (const item of usable) {
    const tolerance = Math.max(2, item.font * 0.8);
    if (!line || Math.abs(line.y - item.y) > tolerance) {
      line = { y: item.y, x: item.x, endX: item.x, font: item.font, items: [] };
      lines.push(line);
    }
    line.items.push(item);
    line.endX = Math.max(line.endX, item.x + item.width);
  }

  return lines.map((line) => {
    const items = [...line.items].sort((a, b) => a.x - b.x);
    let text = '';
    let lastEnd = null;
    let lastFont = line.font;
    for (const item of items) {
      const str = item.str.replace(/\s+/g, ' ');
      if (!str) continue;
      if (lastEnd !== null) {
        const gap = item.x - lastEnd;
        const prevChar = text.slice(-1);
        const nextChar = str.trimStart()[0] || '';
        const cjkPair = CJK.test(prevChar) && CJK.test(nextChar);
        const threshold = cjkPair ? lastFont * 1.6 : Math.max(0.8, lastFont * 0.18);
        if (gap > threshold && !/\s$/.test(text) && !/^\s/.test(str)) text += ' ';
      }
      text += str;
      lastEnd = item.x + (item.width || str.length * item.font * 0.5);
      lastFont = item.font;
    }
    return {
      text: cleanLineText(text),
      x: items[0]?.x || line.x,
      endX: lastEnd || line.endX,
      y: line.y,
      font: line.font,
    };
  }).filter((line) => line.text);
}

function buildParagraphs(lines) {
  const paragraphs = [];
  let current = null;
  for (const line of lines) {
    if (!current) {
      current = { text: line.text, x: line.x, font: line.font, lastY: line.y };
      continue;
    }
    const indented = line.x > current.x + line.font * 1.2;
    const tightWrap = line.x <= current.x + 1 && Math.abs(current.lastY - line.y) <= current.font * 2.2;
    if (!PUNCT_END.test(current.text) && (indented || tightWrap)) {
      const prevChar = current.text.slice(-1);
      const nextChar = line.text[0] || '';
      current.text += (!CJK.test(prevChar) || !CJK.test(nextChar)) ? ` ${line.text}` : line.text;
      current.lastY = line.y;
    } else {
      paragraphs.push(current.text);
      current = { text: line.text, x: line.x, font: line.font, lastY: line.y };
    }
  }
  if (current) paragraphs.push(current.text);
  return paragraphs;
}

function pageText(paragraphs) {
  return paragraphs.join('\n\n');
}

export async function extractPdfPages(file, { onProgress, isCancelled } = {}) {
  const doc = await openPdf(new Uint8Array(await file.arrayBuffer()));
  const pages = [];
  try {
    for (let n = 1; n <= doc.numPages; n += 1) {
      if (isCancelled?.()) {
        const err = new Error('已取消');
        err.name = 'AbortError';
        throw err;
      }
      onProgress?.(n, doc.numPages);
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const lines = buildLines(content.items);
      const paragraphs = buildParagraphs(lines);
      const text = pageText(paragraphs);
      pages.push({
        pageNumber: n,
        paragraphs,
        text,
        charCount: text.replace(/\s/g, '').length,
        noText: text.replace(/\s/g, '').length < 20,
      });
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  return pages;
}
