import os, urllib.request
from PIL import Image

D = r"C:\Users\sun\OneDrive\Desktop\实习\个人作品集\assets"
URLS = {
    "front": "https://aka.doubaocdn.com/s/gnUSClypnH",
    "left":  "https://aka.doubaocdn.com/s/rgnPbatlvH",
    "right": "https://aka.doubaocdn.com/s/NSXiVjfv9F",
    "up":    "https://aka.doubaocdn.com/s/uE3gRXqEZa",
    "down":  "https://aka.doubaocdn.com/s/BoOo8Y28Us",
}

for name, url in URLS.items():
    tmp = os.path.join(D, "scene-%s.src" % name)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r, open(tmp, "wb") as f:
        f.write(r.read())
    im = Image.open(tmp).convert("RGB")
    dst = os.path.join(D, "scene-%s.webp" % name)
    im.save(dst, "WEBP", quality=86, method=6)
    os.remove(tmp)
    print(name, im.size, round(os.path.getsize(dst) / 1024), "KB")
