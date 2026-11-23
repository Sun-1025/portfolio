const fs = require('fs');
const path = require('path');
const base = 'http://127.0.0.1:9335';
const TARGET = process.env.CONVERTER_URL || `http://localhost:8080/?qa=all-${Date.now()}#/tools`;
const SHOT = process.env.CONVERTER_SHOT || 'tools-all-formats.png';

const specs = [
  { key: 'pdf', name: 'pdf-txt.pdf', mime: 'application/pdf', target: 'txt' },
  { key: 'docx', name: 'docx-md.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', target: 'md' },
  { key: 'xlsx', name: 'xlsx-tsv.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', target: 'tsv' },
  { key: 'pptx', name: 'pptx-html.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', target: 'html' },
  { key: 'ods', name: 'ods-csv.ods', mime: 'application/vnd.oasis.opendocument.spreadsheet', target: 'csv' },
  { key: 'epub', name: 'epub-md.epub', mime: 'application/epub+zip', target: 'md' },
  { key: 'fb2', name: 'fb2-html.fb2', mime: 'application/xml', target: 'html' },
  { key: 'cbz', name: 'cbz-pdf.cbz', mime: 'application/zip', target: 'pdf' },
  { key: 'bmp', name: 'image-bmp.bmp', mime: 'image/bmp', target: 'png' },
  { key: 'bmp', name: 'image-bmp-pdf.bmp', mime: 'image/bmp', target: 'pdf' },
  { key: 'svg', name: 'image-svg.svg', mime: 'image/svg+xml', target: 'png' },
  { key: 'svg', name: 'image-svg-pdf.svg', mime: 'image/svg+xml', target: 'pdf' },
  { key: 'ico', name: 'image-ico.ico', mime: 'image/x-icon', target: 'png' },
  { key: 'ico', name: 'image-ico-pdf.ico', mime: 'image/x-icon', target: 'pdf' },
  { key: 'ico', name: 'image-ico-jpg.ico', mime: 'image/x-icon', target: 'jpg' },
  { key: 'ico', name: 'image-ico-webp.ico', mime: 'image/x-icon', target: 'webp' },
  { key: 'png', name: 'image-png-to-jpg.png', mime: 'image/png', target: 'jpg' },
  { key: 'jpg', name: 'image-jpg-to-png.jpg', mime: 'image/jpeg', target: 'png' },
  { key: 'jpg', name: 'image-jpg-to-webp.jpg', mime: 'image/jpeg', target: 'webp' },
  { key: 'jpg', name: 'image-jpg-pdf.jpg', mime: 'image/jpeg', target: 'pdf' },
  { key: 'webp', name: 'image-webp-to-png.webp', mime: 'image/webp', target: 'png' },
  { key: 'webp', name: 'image-webp-to-jpg.webp', mime: 'image/webp', target: 'jpg' },
  { key: 'webp', name: 'image-webp-pdf.webp', mime: 'image/webp', target: 'pdf' },
  { key: 'gif', name: 'image-gif-to-png.gif', mime: 'image/gif', target: 'png' },
  { key: 'gif', name: 'image-gif-to-jpg.gif', mime: 'image/gif', target: 'jpg' },
  { key: 'gif', name: 'image-gif-to-webp.gif', mime: 'image/gif', target: 'webp' },
  { key: 'gif', name: 'image-gif-pdf.gif', mime: 'image/gif', target: 'pdf' },
  { key: 'yaml', name: 'data-yaml.yaml', mime: 'application/yaml', target: 'json' },
  { key: 'json', name: 'data-json-xml.json', mime: 'application/json', target: 'xml' },
  { key: 'json', name: 'data-json-yaml.json', mime: 'application/json', target: 'yaml' },
  { key: 'json', name: 'data-json-ini.json', mime: 'application/json', target: 'ini' },
  { key: 'json', name: 'data-json-tsv.json', mime: 'application/json', target: 'tsv' },
  { key: 'json', name: 'data-json-ndjson.json', mime: 'application/json', target: 'ndjson' },
  { key: 'csv', name: 'data-csv.csv', mime: 'text/csv', target: 'tsv' },
  { key: 'tsv', name: 'data-tsv.tsv', mime: 'text/tab-separated-values', target: 'csv' },
  { key: 'ndjson', name: 'data-ndjson.ndjson', mime: 'application/x-ndjson', target: 'json' },
  { key: 'ini', name: 'data-ini.ini', mime: 'text/plain', target: 'json' },
  { key: 'xml', name: 'data-xml.xml', mime: 'application/xml', target: 'json' },
  { key: 'html', name: 'data-html.html', mime: 'text/html', target: 'md' },
  { key: 'stl', name: 'model-stl.stl', mime: 'model/stl', target: 'ply' },
  { key: 'obj', name: 'model-obj.obj', mime: 'text/plain', target: 'ply' },
  { key: 'ply', name: 'model-ply.ply', mime: 'text/plain', target: 'obj' },
  { key: 'wav', name: 'audio-mp3.wav', mime: 'audio/wav', target: 'mp3' },
  { key: 'mp3', name: 'audio-wav.mp3', mime: 'audio/mpeg', target: 'wav' },
  { key: 'yaml', name: 'data-yaml-csv.yaml', mime: 'application/yaml', target: 'csv' },
  { key: 'yaml', name: 'data-yaml-txt.yaml', mime: 'application/yaml', target: 'txt' },
  { key: 'xml', name: 'data-xml-txt.xml', mime: 'application/xml', target: 'txt' },
  { key: 'ini', name: 'data-ini-txt.ini', mime: 'text/plain', target: 'txt' },
  { key: 'tsv', name: 'data-tsv-json.tsv', mime: 'text/tab-separated-values', target: 'json' },
  { key: 'tsv', name: 'data-tsv-txt.tsv', mime: 'text/tab-separated-values', target: 'txt' },
  { key: 'ndjson', name: 'data-ndjson-csv.ndjson', mime: 'application/x-ndjson', target: 'csv' },
  { key: 'ndjson', name: 'data-ndjson-txt.ndjson', mime: 'application/x-ndjson', target: 'txt' },
  { key: 'json', name: 'data-json-csv.json', mime: 'application/json', target: 'csv' },
  { key: 'json', name: 'data-json-txt.json', mime: 'application/json', target: 'txt' },
  { key: 'json', name: 'data-json-xlsx.json', mime: 'application/json', target: 'xlsx' },
  { key: 'csv', name: 'data-csv-json.csv', mime: 'text/csv', target: 'json' },
  { key: 'csv', name: 'data-csv-txt.csv', mime: 'text/csv', target: 'txt' },
  { key: 'csv', name: 'data-csv-xlsx.csv', mime: 'text/csv', target: 'xlsx' },
  { key: 'csv', name: 'data-csv-yaml.csv', mime: 'text/csv', target: 'yaml' },
  { key: 'md', name: 'data-md-html.md', mime: 'text/markdown', target: 'html' },
  { key: 'md', name: 'data-md-txt.md', mime: 'text/markdown', target: 'txt' },
  { key: 'txt', name: 'data-txt-html.txt', mime: 'text/plain', target: 'html' },
  { key: 'html', name: 'data-html-txt.html', mime: 'text/html', target: 'txt' },
  { key: 'docx', name: 'docx-html.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', target: 'html' },
  { key: 'docx', name: 'docx-txt.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', target: 'txt' },
  { key: 'xlsx', name: 'xlsx-csv.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', target: 'csv' },
  { key: 'xlsx', name: 'xlsx-json.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', target: 'json' },
  { key: 'xlsx', name: 'xlsx-html.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', target: 'html' },
  { key: 'ods', name: 'ods-json.ods', mime: 'application/vnd.oasis.opendocument.spreadsheet', target: 'json' },
  { key: 'ods', name: 'ods-html.ods', mime: 'application/vnd.oasis.opendocument.spreadsheet', target: 'html' },
  { key: 'ods', name: 'ods-tsv.ods', mime: 'application/vnd.oasis.opendocument.spreadsheet', target: 'tsv' },
  { key: 'pptx', name: 'pptx-txt.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', target: 'txt' },
  { key: 'epub', name: 'epub-html.epub', mime: 'application/epub+zip', target: 'html' },
  { key: 'epub', name: 'epub-txt.epub', mime: 'application/epub+zip', target: 'txt' },
  { key: 'fb2', name: 'fb2-txt.fb2', mime: 'application/xml', target: 'txt' },
  { key: 'fb2', name: 'fb2-md.fb2', mime: 'application/xml', target: 'md' },
  { key: 'stl', name: 'model-stl-obj.stl', mime: 'model/stl', target: 'obj' },
  { key: 'obj', name: 'model-obj-stl.obj', mime: 'text/plain', target: 'stl' },
  { key: 'ply', name: 'model-ply-stl.ply', mime: 'text/plain', target: 'stl' },
  { key: 'bmp', name: 'image-bmp-jpg.bmp', mime: 'image/bmp', target: 'jpg' },
  { key: 'bmp', name: 'image-bmp-webp.bmp', mime: 'image/bmp', target: 'webp' },
  { key: 'svg', name: 'image-svg-webp.svg', mime: 'image/svg+xml', target: 'webp' },
  { key: 'svg', name: 'image-svg-jpg.svg', mime: 'image/svg+xml', target: 'jpg' },
  { key: 'ico', name: 'image-ico-jpg.ico', mime: 'image/x-icon', target: 'jpg' },
];

const payload = {};
for (const spec of specs) {
  const file = spec.key === 'csv' ? 'sample.csv' : spec.key === 'json'
    ? 'sample.json'
    : `sample.${spec.key === 'pdf' ? 'pdf' : spec.key}`;
  payload[spec.key] = payload[spec.key] || {};
  if (!payload[spec.key][spec.name]) {
    const raw = fs.readFileSync(path.join(__dirname, 'docs-fixtures', file));
    payload[spec.key][spec.name] = raw.toString('base64');
  }
}

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
    setTimeout(() => reject(new Error(`timeout ${method}`)), 20000);
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
    const specs = ${JSON.stringify(specs)};
    const payload = ${JSON.stringify(payload)};
    const input = document.querySelector('#convFile');
    const bytes = (value) => {
      const raw = atob(value);
      const out = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
      return out;
    };
    const dt = new DataTransfer();
    for (const spec of specs) {
      const b64 = payload[spec.key][spec.name];
      dt.items.add(new File([bytes(b64)], spec.name, { type: spec.mime }));
    }
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#d7ff4f'; ctx.fillRect(0, 0, 320, 200);
    ctx.fillStyle = '#060809'; ctx.font = 'bold 32px sans-serif'; ctx.fillText('IMAGE → PDF', 20, 112);
    const png = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    dt.items.add(new File([png], 'image-png.png', { type: 'image/png' }));
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));

    await sleep(500);
    const rowFor = (name) => Array.from(document.querySelectorAll('.conv-row')).find((row) => row.querySelector('b')?.innerText === name);
    const setTarget = (name, value) => {
      const row = rowFor(name);
      if (!row) return false;
      const select = row.querySelector('.conv-row-select');
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return select.value === value;
    };
    const targets = specs.map((spec) => [spec.name, spec.target]).concat([['image-png.png', 'pdf']]);
    const targetSet = targets.every(([name, value]) => setTarget(name, value));
    await sleep(300);
    const before = {
      rows: document.querySelectorAll('.conv-row').length,
      queue: document.querySelector('#convQueueCount')?.innerText,
      targets: Array.from(document.querySelectorAll('.conv-row-select')).map((s) => s.value),
      targetSet,
    };
    document.querySelector('#convConvertAll').click();
    for (let i = 0; i < 180; i += 1) {
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
