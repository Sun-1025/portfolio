'use strict';

/**
 * 生成渐进加载用的低清缩略图。
 * 输出约定：public/assets/thumbs/<原相对路径>.webp
 * 例：/uploads/foo.jpg -> public/assets/thumbs/uploads/foo.jpg.webp
 *     /assets/photos/campus/a.webp -> public/assets/thumbs/assets/photos/campus/a.webp.webp
 *
 * 用法：
 *   node scripts/make-thumbs.js
 *   node scripts/make-thumbs.js --force --width=420 --quality=46
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const SOURCE_DIRS = [
  path.join(PUBLIC, 'uploads'),
  path.join(PUBLIC, 'assets', 'photos'),
  path.join(PUBLIC, 'assets', 'covers'),
];
const THUMB_ROOT = path.join(PUBLIC, 'assets', 'thumbs');
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const hit = args.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : fallback;
}

const FORCE = args.includes('--force');
const WIDTH = Math.max(160, Number(argValue('--width', 360)) || 360);
const QUALITY = Math.max(20, Math.min(80, Number(argValue('--quality', 42)) || 42));

function walk(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const name of fs.readdirSync(dir)) {
    if (name === 'private' || name === 'thumbs') continue;
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

function thumbPathFor(file) {
  return path.join(THUMB_ROOT, `${publicRel(file)}.webp`);
}

async function makeThumb(file, opts = {}) {
  const sharp = opts.sharp || require('sharp');
  const srcStat = fs.statSync(file);
  const dest = thumbPathFor(file);
  if (!FORCE && fs.existsSync(dest)) {
    const destStat = fs.statSync(dest);
    if (destStat.mtimeMs >= srcStat.mtimeMs) return { skipped: true, dest };
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await sharp(file)
    .rotate()
    .resize({ width: WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 4 })
    .toFile(dest);
  return { skipped: false, dest };
}

async function makeThumbs({ force = FORCE } = {}) {
  let sharp;
  try { sharp = require('sharp'); } catch (err) {
    console.warn('  [warn] 未安装 sharp，跳过缩略图生成。');
    return { total: 0, made: 0 };
  }
  const files = SOURCE_DIRS.reduce((list, dir) => walk(dir, list), []);
  let made = 0;
  for (const file of files) {
    try {
      const result = await makeThumb(file, { sharp });
      if (!result.skipped) made += 1;
    } catch (err) {
      console.warn(`  [warn] 缩略图跳过 ${path.relative(PUBLIC, file)}: ${err.message}`);
    }
  }
  console.log(`缩略图：${made} 张新生成 / ${files.length} 张源图（${WIDTH}px, q${QUALITY}）`);
  return { total: files.length, made };
}

async function makeThumbForFile(file) {
  try {
    const result = await makeThumb(file, { force: true });
    return result.dest;
  } catch (err) {
    console.warn(`  [warn] 上传缩略图失败: ${err.message}`);
    return '';
  }
}

if (require.main === module) {
  makeThumbs().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { makeThumbs, makeThumbForFile, thumbPathFor, THUMB_ROOT };
