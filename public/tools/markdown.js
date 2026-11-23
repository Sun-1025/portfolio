/* 工具：Markdown 转 HTML（纯前端，无第三方依赖） */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(text) {
  const codes = [];
  let out = text.replace(/`([^`]+)`/g, (m, code) => {
    codes.push(`<code>${code}</code>`);
    return `\u0000C${codes.length - 1}\u0000`;
  });

  out = out
    .replace(/!\[([^\]]*)\]\((https?:[^)\s]+)\)/g, '<em>[图片：$1]</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>');

  return out.replace(/\u0000C(\d+)\u0000/g, (m, i) => codes[Number(i)]);
}

function mdToHtml(markdown) {
  const lines = escapeHtml(markdown).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let inCode = false;
  let codeLang = '';
  let codeLines = [];
  let listType = null;
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listType) {
      out.push(listType === 'ul' ? '</ul>' : '</ol>');
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');

    if (line.startsWith('```')) {
      if (inCode) {
        out.push(`<pre><code data-lang="${codeLang}">${codeLines.join('\n')}</code></pre>`);
        inCode = false;
        codeLines = [];
        codeLang = '';
      } else {
        flushParagraph();
        closeList();
        inCode = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushParagraph();
      closeList();
      out.push('<hr>');
      continue;
    }

    const quote = line.match(/^&gt;\s?(.*)$/);
    if (quote) {
      flushParagraph();
      closeList();
      out.push(`<blockquote>${inline(quote[1])}</blockquote>`);
      continue;
    }

    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ul) {
      flushParagraph();
      if (listType !== 'ul') { closeList(); out.push('<ul>'); listType = 'ul'; }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) {
      flushParagraph();
      if (listType !== 'ol') { closeList(); out.push('<ol>'); listType = 'ol'; }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(line.trim());
  }

  if (inCode) out.push(`<pre><code>${codeLines.join('\n')}</code></pre>`);
  flushParagraph();
  closeList();
  return out.join('\n');
}

export function render(root, ctx) {
  root.innerHTML = `
    <div class="field">
      <label for="mdInput">Markdown 原文</label>
      <textarea class="textarea" id="mdInput" spellcheck="false"># 标题

在这里输入 **Markdown**，右侧实时预览。

- 支持标题、列表、引用
- 支持 \`行内代码\` 与代码块
- 支持 [链接](https://example.com)

> 所有转换都在本地完成。</textarea>
    </div>
    <div class="tool-row" style="align-items:center;margin-bottom:18px">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn--solid" type="button" id="mdCopy">复制 HTML</button>
        <button class="mini-btn" type="button" id="mdDownload">下载 .html</button>
        <button class="mini-btn" type="button" id="mdClear">清空</button>
      </div>
      <div class="hint" id="mdStat" style="margin:0;text-align:right"></div>
    </div>
    <div class="split">
      <div>
        <p class="sub-title" style="margin-top:0">HTML 输出</p>
        <textarea class="textarea" id="mdOutput" readonly spellcheck="false"></textarea>
      </div>
      <div>
        <p class="sub-title" style="margin-top:0">预览</p>
        <div class="md-preview" id="mdPreview"></div>
      </div>
    </div>`;

  const input = root.querySelector('#mdInput');
  const output = root.querySelector('#mdOutput');
  const preview = root.querySelector('#mdPreview');
  const stat = root.querySelector('#mdStat');

  let html = '';
  const update = () => {
    html = mdToHtml(input.value);
    output.value = html;
    preview.innerHTML = html || '<p class="hint">预览区</p>';
    stat.textContent = `${input.value.length} 字符 · ${html.length} 字节 HTML`;
  };

  input.addEventListener('input', update);
  root.querySelector('#mdClear').addEventListener('click', () => { input.value = ''; update(); input.focus(); });

  root.querySelector('#mdCopy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(html);
      ctx.toast('HTML 已复制');
    } catch (err) {
      output.select();
      document.execCommand('copy');
      ctx.toast('已选中并复制');
    }
  });

  root.querySelector('#mdDownload').addEventListener('click', () => {
    const doc = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>Markdown 导出</title><style>body{max-width:760px;margin:40px auto;padding:0 20px;font-family:system-ui,sans-serif;line-height:1.8}</style>${html}`;
    const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'markdown-export.html';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    ctx.toast('已下载 HTML 文件');
  });

  update();
}
