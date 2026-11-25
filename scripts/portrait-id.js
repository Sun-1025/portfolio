const sharp = require('sharp');

const input = 'C:/Users/sun/OneDrive/Desktop/实习/个人形象照-奶白底.png';
const output = 'C:/Users/sun/OneDrive/Desktop/实习/portfolio-v2/public/assets/portrait-id-cream.webp';
const targetW = 900;
const targetH = 1125;
const cream = { r: 249, g: 240, b: 229, alpha: 1 };

(async () => {
  const meta = await sharp(input).metadata();
  console.log('source', meta.width, meta.height);

  const resized = await sharp(input)
    .resize({ height: targetH, fit: 'inside', withoutEnlargement: false })
    .toBuffer();
  const resizedMeta = await sharp(resized).metadata();
  const left = Math.round((targetW - resizedMeta.width) / 2);
  console.log('resized', resizedMeta.width, resizedMeta.height, 'left', left);

  const out = await sharp({
    create: { width: targetW, height: targetH, channels: 4, background: cream },
  })
    .composite([{ input: resized, left, top: 0 }])
    .webp({ quality: 90, effort: 5 })
    .toBuffer();

  await sharp(out).toFile(output);
  const outMeta = await sharp(output).metadata();
  console.log('output', outMeta.width, outMeta.height, outMeta.format, out.length);
})();
