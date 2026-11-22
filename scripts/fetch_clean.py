import urllib.request, io, os
from PIL import Image

BASE = r"C:\Users\sun\OneDrive\Desktop\实习\个人作品集\assets"
imgs = {
    'front': 'https://aka.doubaocdn.com/s/tADVerzaUO',
    'left':  'https://aka.doubaocdn.com/s/4MLP8pG3mP',
    'right': 'https://aka.doubaocdn.com/s/Wv8XeMzu57',
    'up':    'https://aka.doubaocdn.com/s/AmaFJiZAqc',
    'down':  'https://aka.doubaocdn.com/s/CR34DS0nix',
    'rb30':  'https://aka.doubaocdn.com/s/cAN5VCYLm4',
    'rb60':  'https://aka.doubaocdn.com/s/65qUctvjOB',
    'lb30':  'https://aka.doubaocdn.com/s/zVMIhz63zH',
    'lb60':  'https://aka.doubaocdn.com/s/XJDjvSpmCy',
    'rt30':  'https://aka.doubaocdn.com/s/ag4trLMFdt',
    'rt60':  'https://aka.doubaocdn.com/s/bClML1W1xz',
    'lt30':  'https://aka.doubaocdn.com/s/URg3xARSZp',
    'lt60':  'https://aka.doubaocdn.com/s/xegbjP2l9w',
}
for k, u in imgs.items():
    data = urllib.request.urlopen(u, timeout=60).read()
    im = Image.open(io.BytesIO(data)).convert('RGB')
    out = os.path.join(BASE, f'scene-{k}.webp')
    im.save(out, 'WEBP', quality=86)
    print(k, im.size, os.path.getsize(out))
