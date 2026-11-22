import os
from PIL import Image

D = r"C:\Users\sun\OneDrive\Desktop\实习\个人作品集\assets"

for name, w in [("hero-front", 900), ("hero-left", 900), ("hero-right", 900),
                ("hero-up", 900), ("hero-down", 900), ("library-shot", 1100)]:
    src = os.path.join(D, name + ".png")
    if not os.path.exists(src):
        print("skip", name)
        continue
    im = Image.open(src).convert("RGB")
    h = int(im.height * w / im.width)
    im = im.resize((w, h), Image.LANCZOS)
    out = os.path.join(D, name + ".jpg")
    im.save(out, "JPEG", quality=86, optimize=True, progressive=True)
    print(name, im.size, round(os.path.getsize(out) / 1024), "KB")
