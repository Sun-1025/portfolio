const fs = require('fs');
const path = require('path');
const base = 'http://127.0.0.1:9335';
const TARGET = process.env.CONVERTER_URL || `http://localhost:8080/?qa=docs-${Date.now()}#/tools`;
const SHOT = process.env.CONVERTER_SHOT || 'tools-docs-batch.png';

function fixture(name) {
  return fs.readFileSync(path.join(__dirname, 'docs-fixtures', name)).toString('base64');
}

const payload = {
  pdf: fixture('sample.pdf'),
  docx: fixture('sample.docx'),
  xlsx: fixture('sample.xlsx'),
  pptx: fixture('sample.pptx'),
  epub: fixture('sample.epub'),
  stl: fixture('sample.stl'),
  obj: fixture('sample.obj'),
  json: Buffer.from('[{"姓名":"孙志昊","专业":"物联网"},{"姓名":"测试","专业":"计算机"}]').toString('base64'),
};

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
    setTimeout(() => reject(new Error(`timeout ${method}`)), 12000);
  });
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Network.clearBrowserCache');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: TARGET });
  await new Promise((resolve) => setTimeout(resolve, 4500));

  const expression = `(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const input = document.querySelector('#convFile');
    const b64 = ${JSON.stringify(payload)};
    const bytes = (value) => {
      const raw = atob(value);
      const out = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
      return out;
    };
    const file = (name, value, type) => new File([bytes(value)], name, { type });
    const dt = new DataTransfer();
    const add = (f) => dt.items.add(f);
    add(file('sample.pdf', b64.pdf, 'application/pdf'));
    add(file('pdf-pages.pdf', b64.pdf, 'application/pdf'));
    add(file('pdf-jpg.pdf', b64.pdf, 'application/pdf'));
    add(file('sample.docx', b64.docx, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
    add(file('docx-txt.docx', b64.docx, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
    add(file('sample.xlsx', b64.xlsx, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
    add(file('xlsx-json.xlsx', b64.xlsx, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
    add(file('xlsx-html.xlsx', b64.xlsx, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
    add(file('sample.pptx', b64.pptx, 'application/vnd.openxmlformats-officedocument.presentationml.presentation'));
    add(file('sample.epub', b64.epub, 'application/epub+zip'));
    add(file('epub-txt.epub', b64.epub, 'application/epub+zip'));
    add(file('sample.stl', b64.stl, 'model/stl'));
    add(file('sample.obj', b64.obj, 'text/plain'));
    add(file('people.json', b64.json, 'application/json'));

    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#d7ff4f'; ctx.fillRect(0, 0, 320, 200);
    ctx.fillStyle = '#060809'; ctx.font = 'bold 32px sans-serif'; ctx.fillText('IMAGE → PDF', 20, 112);
    const png = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    add(new File([png], 'signal.png', { type: 'image/png' }));
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));

    await sleep(400);
    const rowFor = (name) => Array.from(document.querySelectorAll('.conv-row')).find((row) => row.querySelector('b')?.innerText === name);
    const setTarget = (name, value) => {
      const row = rowFor(name);
      if (!row) return false;
      const select = row.querySelector('.conv-row-select');
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return select.value === value;
    };
    const targets = [
      ['pdf-pages.pdf', 'png'],
      ['pdf-jpg.pdf', 'jpg'],
      ['docx-txt.docx', 'txt'],
      ['xlsx-json.xlsx', 'json'],
      ['xlsx-html.xlsx', 'html'],
      ['epub-txt.epub', 'txt'],
      ['people.json', 'xlsx'],
      ['signal.png', 'pdf'],
    ];
    const targetSet = targets.every(([name, value]) => setTarget(name, value));
    await sleep(200);
    const before = {
      rows: document.querySelectorAll('.conv-row').length,
      queue: document.querySelector('#convQueueCount')?.innerText,
      targets: Array.from(document.querySelectorAll('.conv-row-select')).map((s) => s.value),
      targetSet,
    };
    document.querySelector('#convConvertAll').click();
    for (let i = 0; i < 140; i += 1) {
      await sleep(500);
      const statuses = Array.from(document.querySelectorAll('.conv-row-status'));
      if (statuses.length && statuses.every((s) => !s.querySelector('.conv-working') && !s.querySelector('.conv-ready'))) break;
    }
    return JSON.stringify({
      before,
      statuses: Array.from(document.querySelectorAll('.conv-row-status')).map((s) => s.innerText),
      names: Array.from(document.querySelectorAll('.conv-row b')).map((b) => b.innerText),
      history: Array.from(document.querySelectorAll('.conv-history-row')).length,
      progress: document.querySelector('#convProgressLabel')?.innerText,
    });
  })()`;
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  console.log(result.result.value);
  if (result.exceptionDetails) console.log('exception:', JSON.stringify(result.exceptionDetails));
  console.log('errors:', JSON.stringify(errors));
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(process.cwd(), 'qa', SHOT), Buffer.from(shot.data, 'base64'));
  ws.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
