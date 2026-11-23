const fs = require('fs');
const path = require('path');
const JSZip = require('../public/tools/vendor/jszip.min.js');
const XLSX = require('../public/tools/vendor/xlsx.full.min.js');
const { PDFDocument, StandardFonts, rgb } = require('../public/tools/vendor/pdf-lib.min.js');

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

(async () => {
  await makePdf();
  await makeDocx();
  makeXlsx();
  await makePptx();
  await makeEpub();
  makeModels();
  console.log('fixtures:', fs.readdirSync(outDir).join(', '));
})().catch((err) => { console.error(err); process.exit(1); });
