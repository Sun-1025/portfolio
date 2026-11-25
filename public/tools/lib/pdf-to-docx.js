/* PDF → DOCX：抽取文字层并生成最小 Word 文件；扫描件不生成空文档。 */

import { extractPdfPages } from './pdf-text.js';
import { buildDocx } from './docx-write.js';

export class ScanOnlyError extends Error {
  constructor() {
    super('这是扫描件，当前版本不做 OCR；可以先导出 TXT 或图片。');
    this.name = 'ScanOnlyError';
  }
}

export async function pdfToDocx(file, { onProgress, isCancelled } = {}) {
  const pages = await extractPdfPages(file, { onProgress, isCancelled });
  if (!pages.length) throw new Error('PDF 没有页面');
  if (pages.every((page) => page.noText)) throw new ScanOnlyError();
  const blob = await buildDocx(pages);
  return {
    blob,
    pages: pages.length,
    noTextPages: pages.filter((page) => page.noText).map((page) => page.pageNumber),
  };
}
