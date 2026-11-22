from PIL import Image, ImageDraw, ImageFilter
import os
os.chdir(r"C:\Users\sun\OneDrive\Desktop\实习\个人作品集\assets")
front = Image.open('scene-front.webp').convert('RGB')
W, H = front.size
cx, cy, r = 0.50 * W, 0.305 * H, 0.127 * W
mask = Image.new('L', (W, H), 0)
d = ImageDraw.Draw(mask)
d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(7))
for k in ['left', 'right', 'up', 'down', 'rb30', 'rb60', 'lb30', 'lb60', 'rt30', 'rt60', 'lt30', 'lt60']:
    img = Image.open(f'scene-{k}.webp').convert('RGB')
    out = Image.composite(img, front, mask)
    out.save(f'scene-{k}.webp', quality=92)
    print('composited', k)
