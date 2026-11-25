'use strict';

/**
 * 静态导出：生成可放到 GitHub Pages / Cloudflare Pages 的纯静态站点。
 *
 * 用法：
 *   node scripts/export-static.js
 *   node scripts/export-static.js --base=/portfolio/     # 部署在子路径时
 *   node scripts/export-static.js --out=dist --no-minify
 *
 * 说明：
 * - 导出不含后台与 API，前台会自动回退到 /data/site.json；
 * - 需要 Node 18+，依赖 terser / clean-css（devDependencies）。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const DATA = path.join(ROOT, 'data', 'site.json');

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const hit = args.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : fallback;
}

const OUT = path.resolve(ROOT, argValue('--out', 'dist'));
const RAW_BASE = argValue('--base', '');
const BASE = RAW_BASE && RAW_BASE !== '/' ? (`/${RAW_BASE.replace(/^\/|\/$/g, '')}/`) : '';
const MINIFY = !args.includes('--no-minify');

function log(...parts) {
  console.log(...parts);
}

function copy(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

function walk(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, list);
    else list.push(full);
  }
  return list;
}

function rewriteBase(text) {
  if (!BASE) return text;
  return text.replace(/(["'(`])\/(assets|uploads|data|tools|classic)\//g, `$1${BASE}$2/`);
}

async function minifyJs(file) {
  if (!MINIFY) return 0;
  // vendor 里的 UMD/全局库（Turndown、lamejs、SheetJS 等）不能按 ES module 规则压缩，
  // 否则顶层 this/全局挂载会被改写，运行时找不到 TurndownService / lamejs。
  if (file.includes(`${path.sep}tools${path.sep}vendor${path.sep}`)) return 0;
  const code = fs.readFileSync(file, 'utf8');
  try {
    const { minify } = require('terser');
    const result = await minify(code, {
      module: true,
      compress: { passes: 2 },
      mangle: { toplevel: false },
      format: { comments: false },
    });
    if (result.code && result.code.length < code.length) {
      fs.writeFileSync(file, result.code, 'utf8');
      return code.length - result.code.length;
    }
  } catch (err) {
    log(`  [warn] JS 压缩跳过 ${path.relative(ROOT, file)}: ${err.message}`);
  }
  return 0;
}

function minifyCss(file) {
  if (!MINIFY) return 0;
  const code = fs.readFileSync(file, 'utf8');
  try {
    const CleanCSS = require('clean-css');
    const result = new CleanCSS({ level: 1 }).minify(code);
    if (result.styles && result.styles.length < code.length) {
      fs.writeFileSync(file, result.styles, 'utf8');
      return code.length - result.styles.length;
    }
  } catch (err) {
    log(`  [warn] CSS 压缩跳过 ${path.relative(ROOT, file)}: ${err.message}`);
  }
  return 0;
}

async function optimizeImages(dir) {
  let saved = 0;
  let count = 0;
  let sharp = null;
  try { sharp = require('sharp'); } catch (err) { return 0; }

  for (const file of walk(dir)) {
    if (!file.toLowerCase().endsWith('.webp')) continue;
    const before = fs.statSync(file).size;
    try {
      const input = fs.readFileSync(file);
      const buf = await sharp(input)
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80, effort: 5 })
        .toBuffer();
      if (buf.length < before * 0.97) {
        fs.writeFileSync(file, buf);
        saved += before - buf.length;
        count += 1;
      }
    } catch (err) {
      log(`  [warn] 图片压缩跳过 ${path.basename(file)}: ${err.message}`);
    }
  }
  if (count) log(`  图片优化：${count} 张，减少 ${(saved / 1024).toFixed(1)} KB`);
  return saved;
}

async function main() {
  if (!fs.existsSync(DATA)) {
    console.error('找不到 data/site.json，请先启动服务或确认数据文件存在。');
    process.exit(1);
  }

  log(`导出目录：${OUT}`);
  log(`部署前缀：${BASE || '/'}`);

  if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  // 1. 页面与资源
  copy(path.join(PUBLIC, 'index.html'), path.join(OUT, 'index.html'));
  fs.copyFileSync(path.join(PUBLIC, 'sw.js'), path.join(OUT, 'sw.js'));
  const exportedIndex = path.join(OUT, 'index.html');
  // 顶部「管理员登录」在静态站保留，指向本机后台（线上无 Node，相对 /admin 会 404）
  const exportedHtml = fs.readFileSync(exportedIndex, 'utf8')
    .replace('<html lang="zh-CN"', '<html lang="zh-CN" data-static="1"')
    .replace('class="admin-entry" href="/admin"', 'class="admin-entry" href="http://localhost:8080/admin"');
  fs.writeFileSync(exportedIndex, exportedHtml, 'utf8');
  copy(path.join(PUBLIC, 'assets'), path.join(OUT, 'assets'));
  copy(path.join(PUBLIC, 'tools'), path.join(OUT, 'tools'));
  copy(path.join(PUBLIC, 'classic'), path.join(OUT, 'classic'));

  // 数据：私密/草稿过滤后再导出（与公开接口同一套语义）
  const { filterPublic, privateImageRefs, isDraft, isDeleted, isPrivate } = require('../src/content-filter');
  const rawContent = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  const publicContent = filterPublic(rawContent);
  const privateRefs = privateImageRefs(rawContent);
  fs.mkdirSync(path.join(OUT, 'data'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'data', 'site.json'), JSON.stringify(publicContent, null, 2) + '\n', 'utf8');

  if (fs.existsSync(path.join(PUBLIC, 'uploads'))) {
    copy(path.join(PUBLIC, 'uploads'), path.join(OUT, 'uploads'));
  }
  // 私密上传目录整个跳过
  const privateUploads = path.join(OUT, 'uploads', 'private');
  if (fs.existsSync(privateUploads)) fs.rmSync(privateUploads, { recursive: true, force: true });

  // 私密条目引用的图片：只有当公开内容完全没在用时才从静态包剔除
  if (privateRefs.size) {
    const publicRefs = new Set();
    const walkStrings = (node) => {
      if (typeof node === 'string') {
        if (node.startsWith('/assets/') || node.startsWith('/uploads/')) publicRefs.add(node.replace(/^\/+/, ''));
        return;
      }
      if (Array.isArray(node)) { node.forEach(walkStrings); return; }
      if (node && typeof node === 'object') Object.values(node).forEach(walkStrings);
    };
    walkStrings(publicContent);
    for (const rel of privateRefs) {
      if (publicRefs.has(rel)) continue;
      const file = path.join(OUT, rel.replace(/\//g, path.sep));
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }

  const privateCount = Array.isArray(publicContent.work?.cases)
    ? publicContent.work.cases.filter((c) => c.note === '暂未公开').length
    : 0;
  const draftCount = rawContent.work?.cases ? rawContent.work.cases.filter((c) => isDraft(c) || isDeleted(c)).length : 0;
  if (privateCount || draftCount) {
    log(`  私密过滤：${privateCount} 条占位、${draftCount} 条草稿/回收站已剥离`);
  }

  // 后台资源不进静态包
  for (const rel of ['assets/css/admin.css', 'assets/js/admin.js']) {
    const file = path.join(OUT, rel);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }

  // 2. 子路径前缀改写
  if (BASE) {
    for (const file of walk(OUT)) {
      if (!/\.(html|css|js|json)$/i.test(file)) continue;
      const text = fs.readFileSync(file, 'utf8');
      fs.writeFileSync(file, rewriteBase(text), 'utf8');
    }
  }

  // 3. 压缩
  let saved = 0;
  if (MINIFY) {
    saved += await optimizeImages(OUT);
    for (const file of walk(OUT)) {
      if (file.endsWith('.css')) saved += minifyCss(file);
      else if (file.endsWith('.js')) saved += await minifyJs(file);
    }
  }

  // 4. 补充文件
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '', 'utf8');
  fs.copyFileSync(path.join(OUT, 'index.html'), path.join(OUT, '404.html'));

  // 5. 汇总
  const files = walk(OUT);
  const bytes = files.reduce((sum, f) => sum + fs.statSync(f).size, 0);
  log('');
  log(`完成：${files.length} 个文件，${(bytes / 1024 / 1024).toFixed(2)} MB`);
  if (MINIFY) log(`压缩共减少 ${(saved / 1024).toFixed(1)} KB`);
  log(`静态站点：${path.join(OUT, 'index.html')}`);
  log('');
  log('部署提示：');
  log('  GitHub Pages 根域名仓库：将 dist 内容推到仓库根目录即可；');
  log('  项目子路径（/repo/）：使用 --base=/repo/ 重新导出。');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
