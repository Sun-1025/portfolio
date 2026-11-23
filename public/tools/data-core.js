/* 纯文本数据格式互换：INI / TSV / NDJSON / XML。 */
import { parseCSV, csvToJson, jsonToCsv } from './convert-core.js';

function normalize(text) {
  return String(text || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

function splitDelimited(text, delimiter) {
  const input = normalize(text);
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  row.push(cell);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows.filter((r) => r.some((c) => c !== ''));
}

function tabCell(value) {
  if (value == null) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[\t\n\r"]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function rowsToTsv(rows) {
  return rows.map((row) => row.map(tabCell).join('\t')).join('\n');
}

export function parseTsv(text) {
  return splitDelimited(text, '\t');
}

export function tsvToCsv(text) {
  const rows = parseTsv(text);
  if (!rows.length) throw new Error('TSV 为空');
  return `\uFEFF${rows.map((row) => row.map((cell) => {
    const value = String(cell ?? '');
    return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  }).join(',')).join('\n')}`;
}

export function csvToTsv(text) {
  const rows = parseCSV(text);
  if (!rows.length) throw new Error('CSV 为空');
  return rowsToTsv(rows);
}

export function tsvToJson(text) {
  const rows = parseTsv(text);
  if (!rows.length) throw new Error('TSV 为空');
  const seen = new Set();
  const headers = rows[0].map((h, i) => {
    const base = String(h || '').trim() || `列${i + 1}`;
    if (!seen.has(base)) { seen.add(base); return base; }
    const next = `${base}_${seen.size + 1}`;
    seen.add(next);
    return next;
  });
  const objects = rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    return obj;
  });
  return JSON.stringify(objects, null, 2);
}

export function jsonToTsv(text) {
  let data;
  try { data = JSON.parse(normalize(text)); } catch (err) { throw new Error('JSON 解析失败'); }
  if (!Array.isArray(data)) throw new Error('JSON 顶层需要是数组');
  const objects = data.filter((item) => item && typeof item === 'object' && !Array.isArray(item));
  if (!objects.length) throw new Error('数组里没有可转成表格的对象');
  const headers = Array.from(new Set(objects.flatMap((item) => Object.keys(item))));
  return rowsToTsv([headers, ...objects.map((item) => headers.map((key) => item[key]))]);
}

export function ndjsonToJson(text) {
  const lines = normalize(text).split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) throw new Error('NDJSON 为空');
  const objects = lines.map((line, i) => {
    try { return JSON.parse(line); } catch (err) { throw new Error(`第 ${i + 1} 行 JSON 解析失败`); }
  });
  return JSON.stringify(objects, null, 2);
}

export function jsonToNdjson(text) {
  let data;
  try { data = JSON.parse(normalize(text)); } catch (err) { throw new Error('JSON 解析失败'); }
  const rows = Array.isArray(data) ? data : [data];
  return rows.map((item) => JSON.stringify(item)).join('\n');
}

export function parseIni(text) {
  const out = {};
  let section = null;
  for (const raw of normalize(text).split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;
    const header = line.match(/^\[([^\]]+)\]$/);
    if (header) {
      section = header[1].trim();
      out[section] = out[section] || {};
      continue;
    }
    const pair = line.match(/^([^=:]+)\s*[=:]\s*(.*)$/);
    if (!pair) continue;
    const key = pair[1].trim();
    const value = pair[2].trim();
    if (section) out[section][key] = value;
    else out[key] = value;
  }
  return out;
}

export function iniToJson(text) {
  return JSON.stringify(parseIni(text), null, 2);
}

export function iniToText(text) {
  const data = parseIni(text);
  const lines = [];
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      lines.push(`[${key}]`);
      for (const [k, v] of Object.entries(value)) lines.push(`${k}=${v}`);
      lines.push('');
    } else {
      lines.push(`${key}=${value}`);
    }
  }
  return lines.join('\n').trim();
}

export function jsonToIni(text) {
  let data;
  try { data = JSON.parse(normalize(text)); } catch (err) { throw new Error('JSON 解析失败'); }
  if (!data || typeof data !== 'object') throw new Error('JSON 顶层需要是对象或数组');
  const lines = [];
  const scalar = (value) => {
    if (value == null) return '';
    if (Array.isArray(value)) return value.map((item) => (item && typeof item === 'object' ? JSON.stringify(item) : item)).join(',');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };
  const writeSection = (name, object) => {
    lines.push(`[${name}]`);
    for (const [key, value] of Object.entries(object)) lines.push(`${key}=${scalar(value)}`);
    lines.push('');
  };
  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) writeSection(`item${index}`, item);
      else lines.push(`item${index}=${scalar(item)}`);
    });
  } else {
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) writeSection(key, value);
    }
    for (const [key, value] of Object.entries(data)) {
      if (value == null || typeof value !== 'object' || Array.isArray(value)) lines.push(`${key}=${scalar(value)}`);
    }
  }
  return lines.join('\n').trim();
}

function xmlEscape(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function objectToXml(key, value) {
  if (Array.isArray(value)) return value.map((item) => objectToXml('item', item)).join('');
  if (value && typeof value === 'object') {
    const attrs = Object.entries(value).filter(([k]) => k.startsWith('@')).map(([k, v]) => ` ${k.slice(1)}="${xmlEscape(v)}"`).join('');
    const children = Object.entries(value).filter(([k]) => !k.startsWith('@') && k !== '#text').map(([k, v]) => objectToXml(k, v)).join('');
    const text = value['#text'] == null ? '' : xmlEscape(value['#text']);
    return `<${key}${attrs}>${text}${children}</${key}>`;
  }
  return `<${key}>${xmlEscape(value == null ? '' : value)}</${key}>`;
}

export function jsonToXml(text) {
  let data;
  try { data = JSON.parse(normalize(text)); } catch (err) { throw new Error('JSON 解析失败'); }
  const body = data && typeof data === 'object' && !Array.isArray(data)
    ? Object.entries(data).map(([key, value]) => objectToXml(key, value)).join('')
    : objectToXml('item', data);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<root>${body}</root>\n`;
}

function elementValue(element) {
  const attrs = Array.from(element.attributes || []);
  const children = Array.from(element.children || []);
  if (!children.length) {
    const text = (element.textContent || '').trim();
    if (!attrs.length) return text;
    const obj = {};
    attrs.forEach((attr) => { obj[`@${attr.name}`] = attr.value; });
    if (text) obj['#text'] = text;
    return obj;
  }
  const obj = {};
  attrs.forEach((attr) => { obj[`@${attr.name}`] = attr.value; });
  for (const child of children) {
    const value = elementValue(child);
    if (obj[child.nodeName] === undefined) obj[child.nodeName] = value;
    else if (Array.isArray(obj[child.nodeName])) obj[child.nodeName].push(value);
    else obj[child.nodeName] = [obj[child.nodeName], value];
  }
  const text = Array.from(element.childNodes || [])
    .filter((node) => node.nodeType === 3).map((node) => node.textContent).join('').trim();
  if (text) obj['#text'] = text;
  return obj;
}

export function xmlToJson(text) {
  if (typeof DOMParser === 'undefined') throw new Error('当前环境不支持 XML 解析');
  const doc = new DOMParser().parseFromString(normalize(text), 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('XML 解析失败');
  const root = doc.documentElement;
  if (!root) throw new Error('XML 没有根元素');
  const result = {};
  result[root.nodeName] = elementValue(root);
  return JSON.stringify(result, null, 2);
}

export function xmlToText(text) {
  if (typeof DOMParser === 'undefined') throw new Error('当前环境不支持 XML 解析');
  const doc = new DOMParser().parseFromString(normalize(text), 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('XML 解析失败');
  const lines = [];
  const walk = (element, depth) => {
    const label = element.nodeName + (Array.from(element.attributes || []).map((a) => ` ${a.name}="${a.value}"`).join(''));
    const text = Array.from(element.childNodes || []).filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
    lines.push(`${'  '.repeat(depth)}${label}${text ? `: ${text}` : ''}`);
    Array.from(element.children || []).forEach((child) => walk(child, depth + 1));
  };
  walk(doc.documentElement, 0);
  return lines.join('\n');
}

export function convertStructuredText(text, from, to) {
  if (from === 'xml' && to === 'json') return { content: xmlToJson(text), ext: 'json', mime: 'application/json;charset=utf-8' };
  if (from === 'xml' && to === 'txt') return { content: xmlToText(text), ext: 'txt', mime: 'text/plain;charset=utf-8' };
  if (from === 'ini' && to === 'json') return { content: iniToJson(text), ext: 'json', mime: 'application/json;charset=utf-8' };
  if (from === 'ini' && to === 'txt') return { content: iniToText(text), ext: 'txt', mime: 'text/plain;charset=utf-8' };
  if (from === 'tsv' && to === 'csv') return { content: tsvToCsv(text), ext: 'csv', mime: 'text/csv;charset=utf-8' };
  if (from === 'tsv' && to === 'json') return { content: tsvToJson(text), ext: 'json', mime: 'application/json;charset=utf-8' };
  if (from === 'tsv' && to === 'txt') return { content: parseTsv(text).map((row) => row.join('\t')).join('\n'), ext: 'txt', mime: 'text/plain;charset=utf-8' };
  if (from === 'ndjson' && to === 'json') return { content: ndjsonToJson(text), ext: 'json', mime: 'application/json;charset=utf-8' };
  if (from === 'ndjson' && to === 'csv') return { content: jsonToCsv(ndjsonToJson(text)), ext: 'csv', mime: 'text/csv;charset=utf-8' };
  if (from === 'ndjson' && to === 'txt') return { content: ndjsonToJson(text), ext: 'txt', mime: 'text/plain;charset=utf-8' };
  if (from === 'json' && to === 'xml') return { content: jsonToXml(text), ext: 'xml', mime: 'application/xml;charset=utf-8' };
  if (from === 'json' && to === 'ini') return { content: jsonToIni(text), ext: 'ini', mime: 'text/plain;charset=utf-8' };
  if (from === 'json' && to === 'tsv') return { content: jsonToTsv(text), ext: 'tsv', mime: 'text/tab-separated-values;charset=utf-8' };
  if (from === 'json' && to === 'ndjson') return { content: jsonToNdjson(text), ext: 'ndjson', mime: 'application/x-ndjson;charset=utf-8' };
  if (from === 'csv' && to === 'tsv') return { content: csvToTsv(text), ext: 'tsv', mime: 'text/tab-separated-values;charset=utf-8' };
  throw new Error(`暂不支持 ${from.toUpperCase()} → ${to.toUpperCase()}`);
}

export { csvToJson };
