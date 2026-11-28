'use strict';

/**
 * 生成卡片/相册使用的中图，原图只留给照片查看器。
 * 输出约定：public/assets/derived/<原相对路径>.webp
 * 例：/uploads/foo.jpg -> public/assets/derived/uploads/foo.webp
 *     /assets/photos/campus/a.webp -> public/assets/derived/assets/photos/campus/a.webp
 *
 * 用法：
 *   node scripts/make-mediums.js
 *   node scripts/make-mediums.js --force --width=1200 --quality=76
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const SOURCE_DIRS = [
  path.join(PUBLIC, 'uploads'),
  path.join(PUBLIC, 'assets'),
];
const DERIVED_ROOT = path.join(PUBLIC, 'assets', 'derived');
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const SKIP_DIRS = new Set(['derived', 'thumbs', 'private']);

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const hit = args.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : fallback;
}

const FORCE = args.includes('--force');
const WIDTH = Math.max(480, Number(argValue('--width', 1200)) || 1200);
const QUALITY = Math.max(45, Math.min(90, Number(argValue('--quality', 76)) || 76));

function walk(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, list);
    else if (stat.isFile() && IMAGE_EXT.test(name)) list.push(full);
  }
  return list;
}

function publicRel(file) {
  return path.relative(PUBLIC, file).split(path.sep).join('/');
}

function derivedPathFor(file) {
  const rel = publicRel(file).replace(/\.(webp|jpe?g|png)$/i, '');
  return path.join(DERIVED_ROOT, `${rel}.webp`);
}

async function makeMedium(file, opts = {}) {
  const sharp = opts.sharp || require('sharp');
  const force = opts.force != null ? opts.force : FORCE;
  const srcStat = fs.statSync(file);
  const dest = derivedPathFor(file);
  if (!force && fs.existsSync(dest)) {
    const destStat = fs.statSync(dest);
    if (destStat.mtimeMs >= srcStat.mtimeMs) return { skipped: true, dest };
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await sharp(file)
    .rotate()
    .resize({ width: WIDTH, height: WIDTH, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 5 })
    .toFile(dest);
  return { skipped: false, dest };
}

async function makeMediumForFile(file) {
  try {
    const result = await makeMedium(file, { force: true });
    return result.dest;
  } catch (err) {
    console.warn(`  [warn] 上传中图失败: ${err.message}`);
    return '';
  }
}

async function makeMediums({ force = FORCE } = {}) {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (err) {
    console.warn('  [warn] 未安装 sharp，跳过中图生成。');
    return { total: 0, made: 0 };
  }
  const files = SOURCE_DIRS.reduce((list, dir) => walk(dir, list), []);
  let made = 0;
  for (const file of files) {
    try {
      const result = await makeMedium(file, { sharp, force });
      if (!result.skipped) made += 1;
    } catch (err) {
      console.warn(`  [warn] 中图跳过 ${path.relative(PUBLIC, file)}: ${err.message}`);
    }
  }
  console.log(`中图：${made} 张新生成 / ${files.length} 张源图（${WIDTH}px, q${QUALITY}）`);
  return { total: files.length, made };
}

if (require.main === module) {
  makeMediums().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { makeMediums, makeMediumForFile, derivedPathFor };
