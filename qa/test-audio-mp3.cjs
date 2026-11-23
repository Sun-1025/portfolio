const fs = require('fs');
const path = require('path');
const base = 'http://127.0.0.1:9335';
const wavB64 = fs.readFileSync(path.join(__dirname, 'docs-fixtures', 'sample.wav')).toString('base64');

async function main() {
  const tabs = await fetch(`${base}/json/list`).then((r) => r.json());
  const tab = tabs.find((t) => t.type === 'page') || await fetch(`${base}/json/new`, { method: 'PUT' }).then((r) => r.json());
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  const pending = new Map();
  let nextId = 1;
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
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
  await send('Page.navigate', { url: `http://localhost:8080/?qa=mp3-${Date.now()}#/tools` });
  await new Promise((resolve) => setTimeout(resolve, 4000));
  const expression = `(async () => {
    const raw = atob(${JSON.stringify(wavB64)});
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
    const file = new File([bytes], 'tone.wav', { type: 'audio/wav' });
    const docs = await import('/tools/docs-core.js');
    const ctx = new AudioContext();
    const wavBytes = await file.arrayBuffer();
    const decoded = await new Promise((resolve, reject) => ctx.decodeAudioData(wavBytes, resolve, reject));
    const mp3 = await docs.audioBufferToMp3(decoded);
    const mp3Bytes = new Uint8Array(await mp3.arrayBuffer());
    const header = Array.from(mp3Bytes.slice(0, 12)).map((b) => b.toString(16).padStart(2, '0')).join(' ');
    let redecoded = null;
    try {
      redecoded = await new Promise((resolve, reject) => ctx.decodeAudioData(mp3Bytes.slice().buffer, resolve, reject));
    } catch (err) { redecoded = { error: String(err) }; }
    await ctx.close();
    let binary = '';
    for (let i = 0; i < mp3Bytes.length; i += 1) binary += String.fromCharCode(mp3Bytes[i]);
    return JSON.stringify({
      wavDuration: decoded.duration,
      mp3Bytes: mp3Bytes.length,
      header,
      mp3Duration: redecoded && redecoded.duration ? redecoded.duration : redecoded,
      mp3Base64: btoa(binary),
    });
  })()`;
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  const data = JSON.parse(result.result.value);
  if (data.mp3Base64) {
    fs.writeFileSync(path.join(__dirname, 'docs-fixtures', 'sample.mp3'), Buffer.from(data.mp3Base64, 'base64'));
    delete data.mp3Base64;
  }
  console.log(JSON.stringify(data));
  if (result.exceptionDetails) console.log(JSON.stringify(result.exceptionDetails));
  ws.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
