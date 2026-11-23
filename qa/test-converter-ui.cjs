const base = 'http://127.0.0.1:9335';

async function main() {
  const tabs = await fetch(`${base}/json/list`).then((r) => r.json());
  const tab = tabs.find((t) => t.type === 'page') || await fetch(`${base}/json/new`, { method: 'PUT' }).then((r) => r.json());
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  const pending = new Map();
  const errors = [];
  let nextId = 1;
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.text);
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') errors.push(msg.params.entry.text);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
    }
  };
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++; pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => reject(new Error(`timeout ${method}`)), 10000);
  });
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Network.clearBrowserCache');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:8080/?qa=converter#/tools' });
  await new Promise((resolve) => setTimeout(resolve, 4500));

  const result = await send('Runtime.evaluate', {
    expression: `(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const input = document.querySelector('#convFile');
      const add = (file) => {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };

      add(new File(['[{"姓名":"孙志昊","专业":"物联网"},{"姓名":"测试","专业":"计算机"}]'], 'people.json', { type: 'application/json' }));
      add(new File(['# 测试\\n\\n这段文字会变成 **HTML**。\\n\\n- 第一项\\n- 第二项'], 'note.md', { type: 'text/markdown' }));

      const canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 200;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#d7ff4f'; ctx.fillRect(0, 0, 320, 200);
      ctx.fillStyle = '#060809'; ctx.font = 'bold 32px sans-serif'; ctx.fillText('SIGNAL', 34, 112);
      const png = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      add(new File([png], 'signal.png', { type: 'image/png' }));

      const sampleRate = 44100;
      const frames = sampleRate / 4;
      const wav = new ArrayBuffer(44 + frames * 2);
      const view = new DataView(wav);
      const text = (offset, value) => { for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i)); };
      text(0, 'RIFF'); view.setUint32(4, 36 + frames * 2, true); text(8, 'WAVE'); text(12, 'fmt ');
      view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, frames * 2, true);
      for (let i = 0; i < frames; i += 1) view.setInt16(44 + i * 2, Math.sin(i / sampleRate * Math.PI * 2 * 440) * 0x5fff, true);
      add(new File([wav], 'tone.mp3', { type: 'audio/mpeg' }));

      await sleep(400);
      const before = {
        rows: document.querySelectorAll('.conv-row').length,
        queue: document.querySelector('#convQueueCount')?.innerText,
        targets: Array.from(document.querySelectorAll('.conv-row-select')).map((s) => s.value),
      };
      document.querySelector('#convConvertAll').click();
      await sleep(7000);
      return JSON.stringify({
        before,
        statuses: Array.from(document.querySelectorAll('.conv-row-status')).map((s) => s.innerText),
        history: Array.from(document.querySelectorAll('.conv-history-row')).length,
        afterQueue: document.querySelector('#convQueueCount')?.innerText,
        progress: document.querySelector('#convProgressLabel')?.innerText,
      });
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  console.log(result.result.value);
  if (result.exceptionDetails) console.log('exception:', JSON.stringify(result.exceptionDetails));
  console.log('errors:', JSON.stringify(errors));
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const fs = require('fs');
  const path = require('path');
  fs.writeFileSync(path.join(process.cwd(), 'qa', 'tools-converter-batch.png'), Buffer.from(shot.data, 'base64'));
  ws.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
