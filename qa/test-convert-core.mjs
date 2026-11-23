import assert from 'node:assert/strict';
import {
  MATRIX, extOf, familyOf, targetsFor, imageTargetFor,
  parseCSV, csvToJson, jsonToCsv, convertDataText, markdownToHtmlBody, markdownToText,
} from '../public/tools/convert-core.js';

const routes = MATRIX.reduce((n, row) => n + row.targets.length, 0);
assert.equal(routes, 18);
assert.equal(extOf('a.JPEG'), 'jpg');
assert.equal(extOf('a.markdown'), 'md');
assert.equal(familyOf('png'), 'image');
assert.equal(familyOf('csv'), 'data');
assert.equal(familyOf('wav'), '');
assert.equal(imageTargetFor('png'), 'webp');
assert.equal(imageTargetFor('webp'), 'png');
assert.deepEqual(targetsFor('json'), ['csv', 'txt']);
assert.deepEqual(targetsFor('html'), ['txt']);

const json = '[{"姓名":"孙志昊","专业":"物联网"},{"姓名":"测试","专业":"计算机"}]';
const csv = jsonToCsv(json);
assert.match(csv, /姓名,专业/);
assert.match(csv, /孙志昊,物联网/);
const back = csvToJson(csv);
assert.equal(JSON.parse(back).length, 2);

const withQuotes = parseCSV('name,note\n"Sun, Z","line1\nline2"');
assert.equal(withQuotes[1][0], 'Sun, Z');
assert.equal(withQuotes[1][1], 'line1\nline2');

const md = '# 标题\n\n这是一段 **加粗** 和 [链接](https://example.com)。\n\n- 一\n- 二';
const html = convertDataText(md, 'md', 'html');
assert.match(html.content, /<h1>标题<\/h1>/);
assert.match(html.content, /<strong>加粗<\/strong>/);
assert.match(html.content, /https:\/\/example\.com/);
assert.equal(html.ext, 'html');
assert.match(markdownToText(md), /标题/);

const txtHtml = convertDataText('第一段\n\n第二段\n换行', 'txt', 'html');
assert.match(txtHtml.content, /<p>第一段<\/p>/);
assert.match(txtHtml.content, /<br>/);

const htmlText = convertDataText('<h1>标题</h1><p>正文 <b>加粗</b></p>', 'html', 'txt');
assert.match(htmlText.content, /标题/);
assert.match(htmlText.content, /正文 加粗/);

console.log('convert-core tests: OK');
