/* 工具：字数统计（实时，本地计算） */

export function render(root, ctx) {
  root.innerHTML = `
    <div class="field">
      <label for="wcInput">粘贴或输入文本</label>
      <textarea class="textarea" id="wcInput" placeholder="在这里输入需要统计的文本…"></textarea>
    </div>
    <div class="tool-row">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="mini-btn" type="button" id="wcPaste">读取剪贴板</button>
        <button class="mini-btn" type="button" id="wcClear">清空</button>
      </div>
      <p class="hint" style="margin:0;text-align:right">统计不离开浏览器，无需联网</p>
    </div>
    <div class="stat-grid" id="wcStats"></div>
    <p class="hint" id="wcTime"></p>`;

  const input = root.querySelector('#wcInput');
  const statsBox = root.querySelector('#wcStats');
  const timeBox = root.querySelector('#wcTime');

  const calc = () => {
    const text = input.value;
    const chars = Array.from(text).length;
    const noSpace = Array.from(text.replace(/\s/g, '')).length;
    const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const words = (text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) || []).length;
    const numbers = (text.match(/\d+(?:\.\d+)?/g) || []).length;
    const lines = text ? text.split('\n').length : 0;
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
    const minutes = Math.max(0, chinese / 300 + words / 200);

    const items = [
      ['总字符', chars], ['不含空格', noSpace], ['中文字符', chinese],
      ['英文单词', words], ['数字串', numbers], ['行数', lines], ['段落', paragraphs],
    ];
    statsBox.innerHTML = items.map(([label, value]) => `
      <div class="stat-box"><b>${value}</b><span>${label}</span></div>`).join('');
    timeBox.textContent = minutes ? `预计阅读时间：约 ${minutes < 1 ? '不到 1' : Math.round(minutes)} 分钟（中文 300 字/分，英文 200 词/分）` : '';
  };

  input.addEventListener('input', calc);
  root.querySelector('#wcClear').addEventListener('click', () => { input.value = ''; calc(); input.focus(); });
  root.querySelector('#wcPaste').addEventListener('click', async () => {
    try {
      input.value = await navigator.clipboard.readText();
      calc();
      ctx.toast('已读取剪贴板');
    } catch (err) {
      ctx.toast('浏览器拒绝了剪贴板读取，请手动粘贴');
    }
  });

  calc();
}
