import json, re, os

src = r"C:\Users\sun\OneDrive\Desktop\实习\个人作品集\site.json"
dst = r"C:\Users\sun\OneDrive\Desktop\实习\portfolio-v2\data\site.json"
old = json.load(open(src, encoding="utf-8"))
about = old["about"]
tagline = re.sub("<[^>]+>", "", about["highlight"])


def fix(p):
    return p if p.startswith("/") else "/" + p


cases = []
for c in old["cases"]:
    cases.append({
        "id": c["key"], "title": c["title"], "category": c["cat"], "number": c["num"],
        "org": c["org"], "period": c["period"], "role": c["role"], "summary": c["summary"],
        "tags": c["tags"], "images": [fix(i) for i in c.get("images", [])],
        "links": c.get("links", []), "sections": c.get("sections", []), "result": c.get("result", ""),
    })

data = {
    "site": {
        "title": "孙志昊 · 个人站与工具台",
        "brand": "孙志昊",
        "tagline": tagline,
        "description": "孙志昊的个人网站：作品集、在线工具与实验记录。山东石油化工学院物联网工程，嵌入式与 AI 应用方向。",
        "avatar": "/assets/portrait-dark.webp",
        "footer": "© 2026 孙志昊 · 原生 HTML / CSS / JS 手写",
        "themeColor": "#12110b",
        "accent": "#cdd96b",
    },
    "nav": [
        {"id": "home", "label": "主页", "type": "route", "target": "home", "visible": True, "order": 1},
        {"id": "work", "label": "项目", "type": "route", "target": "work", "visible": True, "order": 2},
        {"id": "tools", "label": "工具", "type": "route", "target": "tools", "visible": True, "order": 3},
        {"id": "classic", "label": "经典版", "type": "link", "target": "/classic/", "visible": True, "order": 4},
    ],
    "branches": [
        {"id": "home", "label": "个人主页", "type": "builtin", "visible": True, "order": 1, "description": "原有单页作品集的等价重构"},
        {"id": "work", "label": "项目档案", "type": "builtin", "visible": True, "order": 2, "description": "案例卡片与详情"},
        {"id": "tools", "label": "在线工具", "type": "builtin", "visible": True, "order": 3, "description": "可插拔的工具模块"},
        {"id": "classic", "label": "经典版", "type": "legacy", "visible": True, "order": 4, "description": "原版场景交互页面，完整保留"},
    ],
    "home": {
        "hero": {
            "eyebrow": "山东石油化工学院 · 物联网工程 2025 级",
            "title": "把想法做成\n能跑起来的东西。",
            "intro": "我是孙志昊。写代码、焊板子、做项目，也把做过的事整理成能被看懂的样子。这个站点是我的档案柜，也是我练手的小工具台。",
            "primary": {"label": "浏览项目", "href": "#/work"},
            "secondary": {"label": "打开工具", "href": "#/tools"},
        },
        "stats": [
            {"value": "3.83", "label": "绩点 / 5.0"},
            {"value": "前 20%", "label": "专业排名"},
            {"value": "10", "label": "案例与经历"},
            {"value": "4", "label": "在线工具"},
        ],
        "about": {
            "title": "关于我",
            "lead": "比起“学过”，我更在意“做出来过”。",
            "lines": about["lines"],
            "facts": about["facts"],
            "abilities": about["abilities"],
            "skills": about["skills"],
            "belief": about["belief"],
            "future": about["future"],
        },
        "contacts": old["contacts"],
    },
    "work": {"title": "项目与经历", "intro": "十段记录，按方向分成项目、实习、校园与兴趣四类。点开看细节。", "cases": cases},
    "tools": {
        "title": "在线工具",
        "intro": "先用得上的小工具。全部在浏览器里跑，不上传任何数据。",
        "items": [
            {"id": "markdown", "name": "Markdown 转 HTML", "desc": "左边写 Markdown，右边实时出 HTML，可复制结果。", "category": "convert", "module": "markdown.js", "icon": "MD", "enabled": True, "order": 1},
            {"id": "wordcount", "name": "字数统计", "desc": "统计字符、词数、行数与阅读时间，支持中英文混排。", "category": "convert", "module": "wordcount.js", "icon": "字", "enabled": True, "order": 2},
            {"id": "unit", "name": "单位换算", "desc": "长度、质量、面积、温度、存储五类常用单位互换。", "category": "query", "module": "unit.js", "icon": "↔", "enabled": True, "order": 3},
            {"id": "date", "name": "日期计算", "desc": "计算两个日期相差多少天，或从某天起加减天数。", "category": "query", "module": "date.js", "icon": "日", "enabled": True, "order": 4},
        ],
    },
    "notices": [
        {"id": "v2", "title": "站点升级到 2.0", "body": "新增后台管理、在线工具与模块化架构，原版页面保留在「经典版」。", "enabled": True, "level": "info", "date": "2026-11-22"},
    ],
    "settings": {"sessionHours": 4, "idleMinutes": 30, "classicLabel": "经典版", "showClassic": True},
}

json.dump(data, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("cases", len(cases), "bytes", os.path.getsize(dst), "tagline", tagline)
