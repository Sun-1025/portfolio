import os
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

D = r"C:\Users\sun\OneDrive\Desktop\实习\个人作品集\assets"
NAMES = ["hero-front", "hero-left", "hero-right", "hero-up", "hero-down"]

def make_alpha(size, pad_x=86, pad_top=42, pad_bottom=28, blur=40):
    w, h = size
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    d.rectangle([pad_x, pad_top, w - pad_x, h - pad_bottom], fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur))

for name in NAMES:
    src = os.path.join(D, name + ".jpg")
    im = Image.open(src).convert("RGB")
    out = im.convert("RGBA")
    out.putalpha(make_alpha(im.size))
    dst = os.path.join(D, name + ".webp")
    out.save(dst, "WEBP", quality=88, method=6)
    print(name, round(os.path.getsize(dst) / 1024), "KB")

# 背景与照片亮度对齐
im = Image.open(os.path.join(D, "hero-front.jpg")).convert("RGB")
L = im.crop((0, 0, 250, 780)).resize((1920, 1080), Image.LANCZOS)
R = im.crop((650, 0, 900, 780)).resize((1920, 1080), Image.LANCZOS)
grad = Image.new("L", (1920, 1))
for i in range(1920):
    t = i / 1919
    v = 255 if t < 0.34 else (0 if t > 0.62 else int(255 * (0.62 - t) / 0.28))
    grad.putpixel((i, 0), v)
g = grad.resize((1920, 1080))
bg = Image.composite(L, R, g)
bg = bg.filter(ImageFilter.GaussianBlur(7))
bg = ImageEnhance.Brightness(bg).enhance(0.80)
bg = ImageEnhance.Color(bg).enhance(0.92)
bg = ImageEnhance.Contrast(bg).enhance(1.02)
bg.save(os.path.join(D, "bg-wall.jpg"), "JPEG", quality=85, optimize=True)
print("bg ready", round(os.path.getsize(os.path.join(D, "bg-wall.jpg")) / 1024), "KB")
