from PIL import Image, ImageFilter
import numpy as np, os
os.chdir(r"C:\Users\sun\OneDrive\Desktop\实习\个人作品集\assets")
front = np.array(Image.open('scene-front.webp').convert('RGB'))
dim = np.array(Image.open('dim_full.img').convert('RGB'), dtype=np.int16)
diff = np.abs(front.astype(np.int16) - dim).sum(axis=2)
H, W = diff.shape
yy, xx = np.mgrid[0:H, 0:W]
in_region = (xx > 0.55 * W) & (xx < 0.75 * W) & (yy > 0.72 * H) & (yy < 0.95 * H)
m = ((diff > 90) & in_region).astype(np.uint8) * 255
mask = Image.fromarray(m)
mask_near = np.array(mask.filter(ImageFilter.MaxFilter(11))) > 0
ys, xs = np.where(mask_near)
y0, y1 = max(int(ys.min()) - 34, 0), min(int(ys.max()) + 34, H)
x0, x1 = max(int(xs.min()) - 34, 0), min(int(xs.max()) + 34, W)
top = front[max(y0 - 3, 0), x0:x1].mean(axis=0)
bot = front[min(y1 + 3, H - 1), x0:x1].mean(axis=0)
lft = front[y0:y1, max(x0 - 3, 0)].mean(axis=0)
rgt = front[y0:y1, min(x1 + 3, W - 1)].mean(axis=0)
hgt, wid = y1 - y0, x1 - x0
t = np.linspace(0, 1, hgt)[:, None]
s = np.linspace(0, 1, wid)[:, None]
vert = top[None, :] * (1 - t) + bot[None, :] * t
horz = lft[None, :] * (1 - s) + rgt[None, :] * s
grad = (vert[:, None, :] + horz[None, :, :]) / 2
print('bbox', (x0, y0, x1, y1), 'top', top.round(0), 'bot', bot.round(0))
front2 = front.astype(np.float32).copy()
front2[y0:y1, x0:x1] = grad
rgba = Image.fromarray(front2.astype(np.uint8)).convert('RGBA')
alpha = np.zeros((H, W), np.uint8)
alpha[y0:y1, x0:x1] = 255
alpha_img = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(2))
rgba.putalpha(alpha_img)
rgba.save('scene-ydim.png')
print('saved scene-ydim.png')
