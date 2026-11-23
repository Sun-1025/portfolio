const fs = require('fs');
const path = require('path');
const JSZip = require('../public/tools/vendor/jszip.min.js');
const XLSX = require('../public/tools/vendor/xlsx.full.min.js');
const { PDFDocument, StandardFonts, rgb } = require('../public/tools/vendor/pdf-lib.min.js');
const sharp = require('sharp');

const outDir = path.join(__dirname, 'docs-fixtures');
fs.mkdirSync(outDir, { recursive: true });
const write = (name, data) => fs.writeFileSync(path.join(outDir, name), data);

async function makePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 2; i += 1) {
    const page = doc.addPage([595, 842]);
    page.drawText(`PDF TEST PAGE ${i}`, { x: 72, y: 760, size: 24, font, color: rgb(0.1, 0.1, 0.1) });
    page.drawText('Browser local conversion check.', { x: 72, y: 720, size: 12, font });
  }
  write('sample.pdf', await doc.save());
}

async function makeDocx() {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
<w:p><w:r><w:t>DOCX 测试标题</w:t></w:r></w:p>
<w:p><w:r><w:t>这是一段中文正文，包含 **粗体** 文本。</w:t></w:r></w:p>
<w:tbl><w:tr><w:tc><w:p><w:r><w:t>单元格 A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>单元格 B</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
<w:sectPr/></w:body></w:document>`);
  write('sample.docx', await zip.generateAsync({ type: 'nodebuffer' }));
}

function makeXlsx() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([['姓名', '专业', '绩点'], ['孙志昊', '物联网工程', '3.83'], ['测试', '计算机', '3.5']]);
  XLSX.utils.book_append_sheet(wb, ws, '成绩');
  write('sample.xlsx', XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  write('sample.ods', XLSX.write(wb, { type: 'buffer', bookType: 'ods' }));
}

async function makePptx() {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`);
  zip.file('ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>`);
  zip.file('ppt/_rels/presentation.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`);
  zip.file('ppt/slides/slide1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
<p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>PPTX 测试标题</a:t></a:r></a:p>
<a:p><a:r><a:t>这是第一页的正文。</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`);
  write('sample.pptx', await zip.generateAsync({ type: 'nodebuffer' }));
}

async function makeEpub() {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
  zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>测试电子书</dc:title></metadata>
<manifest><item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
<item id="ch2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
<item id="pic" href="pic.svg" media-type="image/svg+xml"/></manifest>
<spine><itemref idref="ch1"/><itemref idref="ch2"/></spine></package>`);
  zip.file('OEBPS/ch1.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>第一章</title></head><body>
<h1>第一章</h1><p>这是 EPUB 第一章的正文。</p><img src="pic.svg" alt="测试图"/></body></html>`);
  zip.file('OEBPS/ch2.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>第二章</title></head><body>
<h1>第二章</h2><p>第二章内容。</p><script>alert(1)</script></body></html>`);
  zip.file('OEBPS/pic.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40" fill="#d7ff4f"/><text x="8" y="26">EPUB</text></svg>`);
  write('sample.epub', await zip.generateAsync({ type: 'nodebuffer' }));
}

function makeModels() {
  write('sample.stl', `solid tetra
facet normal 0 0 1
 outer loop
  vertex 0 0 0
  vertex 1 0 0
  vertex 0 1 0
 endloop
endfacet
endsolid tetra`);
  write('sample.obj', `# tetra
v 0 0 0
v 1 0 0
v 0 1 0
v 0 0 1
f 1 2 3
f 1 2 4
f 1 3 4
f 2 3 4
`);
}

async function makeRasterFormats() {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="#d7ff4f"/><text x="12" y="58" font-size="22" fill="#060809">RASTER</text></svg>');
  await sharp(svg).png().toFile(path.join(outDir, 'sample.png'));
  await sharp(svg).jpeg({ quality: 90 }).toFile(path.join(outDir, 'sample.jpg'));
  await sharp(svg).webp({ quality: 90 }).toFile(path.join(outDir, 'sample.webp'));
  write('sample.gif', Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64'));
}

async function makeCbz() {
  const zip = new JSZip();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  zip.file('001.png', png);
  zip.file('002.png', png);
  zip.file('info.txt', 'comic');
  write('sample.cbz', await zip.generateAsync({ type: 'nodebuffer' }));
}

function makeTextFixtures() {
  write('sample.json', '[\n  {"姓名":"孙志昊","专业":"物联网工程","绩点":3.83},\n  {"姓名":"测试","专业":"计算机","绩点":3.5}\n]\n');
  write('sample.csv', '姓名,专业,绩点\n孙志昊,物联网工程,3.83\n测试,计算机,3.5\n');
  write('sample.yaml', 'name: 孙志昊\nmajor: 物联网工程\nskills:\n  - 嵌入式\n  - 前端\n');
  write('sample.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<root><user><name>孙志昊</name><major>物联网工程</major></user></root>');
  write('sample.ini', '[user]\nname=孙志昊\nmajor=物联网工程\n[meta]\nenabled=true\n');
  write('sample.tsv', '姓名\t专业\t绩点\n孙志昊\t物联网工程\t3.83\n测试\t计算机\t3.5\n');
  write('sample.ndjson', '{"姓名":"孙志昊","专业":"物联网工程"}\n{"姓名":"测试","专业":"计算机"}\n');
  write('sample.html', '<html><head><title>测试页</title></head><body><h1>市场调查</h1><p>这是 <b>HTML</b> 转 Markdown 的测试。</p><ul><li>第一项</li><li>第二项</li></ul></body></html>');
  write('sample.md', '# 市场调查\n\n这是一段 **Markdown** 测试。\n\n- 第一项\n- 第二项\n');
  write('sample.txt', '第一段纯文本。\n\n第二段纯文本。\n');
  write('sample.fb2', `<?xml version="1.0" encoding="UTF-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
<description><title-info><book-title>测试 FB2</book-title></title-info></description>
<body><section><title><p>第一章</p></title><p>这是 FB2 电子书的第一段。</p><p>第二段内容。</p></section></body>
</FictionBook>`);
  write('sample.ply', `ply
format ascii 1.0
element vertex 4
property float x
property float y
property float z
element face 4
property list uchar int vertex_indices
end_header
0 0 0
1 0 0
0 1 0
0 0 1
3 0 1 2
3 0 1 3
3 0 2 3
3 1 2 3
`);
  write('sample.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="#d7ff4f"/><text x="12" y="58" font-size="22" fill="#060809">SVG TEST</text></svg>');
}

function makeWav() {
  const sampleRate = 8000;
  const seconds = 0.4;
  const samples = Math.floor(sampleRate * seconds);
  const dataBytes = samples * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < samples; i += 1) {
    const value = Math.round(Math.sin((i / sampleRate) * Math.PI * 2 * 440) * 0.35 * 32767);
    buffer.writeInt16LE(value, 44 + i * 2);
  }
  write('sample.wav', buffer);
}

function makeBmp() {  const width = 2;
  const height = 2;
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelBytes = rowSize * height;
  const buffer = Buffer.alloc(54 + pixelBytes);
  buffer.write('BM', 0);
  buffer.writeUInt32LE(buffer.length, 2);
  buffer.writeUInt32LE(54, 10);
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28);
  buffer.writeUInt32LE(pixelBytes, 34);
  buffer.writeInt32LE(2835, 38);
  buffer.writeInt32LE(2835, 42);
  const colors = [[215, 255, 79], [6, 8, 9], [255, 255, 255], [0, 0, 0]];
  let offset = 54;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = colors[(y * width + x) % colors.length];
      buffer[offset] = b; buffer[offset + 1] = g; buffer[offset + 2] = r;
      offset += 3;
    }
    offset += rowSize - width * 3;
  }
  write('sample.bmp', buffer);
}

function makeIco() {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry[0] = 1; entry[1] = 1; entry[2] = 0; entry[3] = 0;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12);
  write('sample.ico', Buffer.concat([header, entry, png]));
}

async function makeAll() {
  await makePdf();
  await makeDocx();
  makeXlsx();
  await makePptx();
  await makeEpub();
  makeModels();
  await makeCbz();
  await makeRasterFormats();
  makeTextFixtures();
  makeWav();
  makeBmp();
  makeIco();
  console.log('fixtures:', fs.readdirSync(outDir).join(', '));
}

makeAll().catch((err) => { console.error(err); process.exit(1); });
