import os
from PIL import Image, ImageFilter, ImageEnhance

D = r"C:\Users\sun\OneDrive\Desktop\实习\个人作品集\assets"
im = Image.open(os.path.join(D, "hero-front.jpg")).convert("RGB")   # 900 x 1199

L = im.crop((0, 0, 250, 780)).resize((1920, 1080), Image.LANCZOS)
R = im.crop((650, 0, 900, 780)).resize((1920, 1080), Image.LANCZOS)

grad = Image.new("L", (1920, 1))
for i in range(1920):
    t = i / 1919
    v = 255 if t < 0.34 else (0 if t > 0.62 else int(255 * (0.62 - t) / 0.28))
    grad.putpixel((i, 0), v)
g = grad.resize((1920, 1080))

out = Image.composite(L, R, g)
out = out.filter(ImageFilter.GaussianBlur(7))
out = ImageEnhance.Brightness(out).enhance(0.68)
out = ImageEnhance.Color(out).enhance(0.90)
out = ImageEnhance.Contrast(out).enhance(1.03)

dst = os.path.join(D, "bg-wall.jpg")
out.save(dst, "JPEG", quality=85, optimize=True)
print("saved", out.size, round(os.path.getsize(dst) / 1024), "KB")
