import assert from 'node:assert/strict';
import {
  MATRIX, ROUTE_COUNT, extOf, familyOf, targetsFor, imageTargetFor,
  parseCSV, csvToJson, jsonToCsv, convertDataText, markdownToHtmlBody, markdownToText,
} from '../public/tools/convert-core.js';

assert.equal(ROUTE_COUNT, 99);
assert.equal(MATRIX.length, 30);
assert.equal(extOf('a.JPEG'), 'jpg');
assert.equal(extOf('a.markdown'), 'md');
assert.equal(extOf('a.YML'), 'yaml');
assert.equal(familyOf('png'), 'image');
assert.equal(familyOf('svg'), 'image');
assert.equal(familyOf('csv'), 'data');
assert.equal(familyOf('yaml'), 'data');
assert.equal(familyOf('pdf'), 'pdf');
assert.equal(familyOf('docx'), 'office');
assert.equal(familyOf('ods'), 'office');
assert.equal(familyOf('epub'), 'ebook');
assert.equal(familyOf('cbz'), 'ebook');
assert.equal(familyOf('stl'), 'model');
assert.equal(familyOf('ply'), 'model');
assert.equal(familyOf('wav'), 'audio');
assert.equal(imageTargetFor('svg'), 'webp');
assert.equal(imageTargetFor('webp'), 'png');
assert.deepEqual(targetsFor('json'), ['csv', 'txt', 'xlsx', 'xml', 'yaml', 'ini', 'tsv', 'ndjson']);
assert.deepEqual(targetsFor('csv'), ['json', 'txt', 'xlsx', 'tsv', 'yaml']);
assert.deepEqual(targetsFor('pdf'), ['txt', 'png', 'jpg']);
assert.deepEqual(targetsFor('docx'), ['html', 'txt', 'md']);
assert.deepEqual(targetsFor('obj'), ['stl', 'ply']);

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

import {
  tsvToCsv, csvToTsv, tsvToJson, jsonToTsv, iniToJson, jsonToIni,
  ndjsonToJson, jsonToNdjson, jsonToXml,
} from '../public/tools/data-core.js';

assert.match(tsvToCsv('name\tmajor\n孙志昊\t物联网'), /姓名|name,major/);
assert.equal(csvToTsv('name,note\nSun,"a,b"'), 'name\tnote\nSun\ta,b');
assert.equal(JSON.parse(tsvToJson('name\tage\nSun\t20')).length, 1);
assert.match(jsonToTsv('[{"a":1,"b":2}]'), /a\tb/);
assert.deepEqual(JSON.parse(iniToJson('[user]\nname=Sun\nage=20')), { user: { name: 'Sun', age: '20' } });
assert.match(jsonToIni('{"user":{"name":"Sun"},"debug":true}'), /\[user\]/);
assert.equal(JSON.parse(ndjsonToJson('{"a":1}\n{"b":2}')).length, 2);
assert.equal(jsonToNdjson('[{"a":1},{"b":2}]'), '{"a":1}\n{"b":2}');
assert.match(jsonToXml('{"user":{"name":"Sun"}}'), /<user>/);

console.log('convert-core tests: OK');
