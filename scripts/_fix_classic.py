p = r"C:\Users\sun\OneDrive\Desktop\实习\portfolio-v2\public\classic\index.html"
s = open(p, encoding="utf-8").read()
s = s.replace('src="assets/', 'src="/assets/')
s = s.replace("url('assets/", "url('/assets/")
s = s.replace("fetch('site.json'", "fetch('/data/site.json'")

pill = ('<a href="/" style="position:fixed;left:18px;bottom:18px;z-index:9999;'
        'padding:9px 14px;border-radius:999px;background:rgba(31,31,31,.72);'
        'border:1px solid rgba(236,231,219,.22);color:#ece7db;'
        "font:500 12px/1 system-ui,-apple-system,'Segoe UI',sans-serif;text-decoration:none;"
        'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)">← 返回新版</a>')
s = s.replace("</body>", pill + "\n</body>")
open(p, "w", encoding="utf-8").write(s)
print("absolute asset refs:", s.count('src="/assets/'))
print("site data fetch:", "fetch('/data/site.json'" in s)
print("tail:", s[-120:])
