# 孙志昊 · 个人站 5.0

> 技术名片 + 成长档案 + 自研小工具。保留路由、主题切换、留言、工具箱、CMS 后台逻辑。

线上：<https://sunzhihaoai.top>　经典版归档：<https://sunzhihaoai.top/classic/>

## 5.0 改了什么

- 从终端极客风 v4 改为极简科技：近黑底、蓝灰点缀、克制的磨砂玻璃；浅色主题同步可用。
- 导航一级收为 **实习、经历、兴趣**；项目放进经历，工具箱保留独立入口。
- 首页四张项目卡：个人主页、在线工具箱、家用语音监测系统、图书管理系统；公益实践单独一张卡。
- 经历时间线四段：校内预备实习、东营区图书馆、青年志愿者协会、科技协会。
- 兴趣六格：骑行、羽毛球、登山、北京、淄博、济南；接入 21 张真实照片。
- 25 张公开 WebP，全部在 `public/assets/photos/`；理财截图不公开，儿童正脸不公开。
- 静态站 62 files / 9.66 MB（构建后 `dist`）；照片单张 ≤500 KB。

硬参数：桌面导航 72px、移动 68px；桌面 H1 40px、移动 32px；正文 16px / 1.7；标签 13px；磨砂只用于导航、卡片、弹层、抽屉、助手面板，`blur(22px)`。

## 快速启动

```powershell
cd C:\Users\sun\OneDrive\Desktop\实习\portfolio-v2
npm install
npm start           # http://localhost:8080
```

首次启动会生成默认管理员 `admin` / `Admin@12345`。首次登录后请立即改密码；生产环境不要把默认密码留在 README 之外。

## 构建与部署

```powershell
npm run build       # Tailwind + 静态导出到 dist/
npm run export      # 只导出静态站
```

`dist/` 可直接放到 GitHub Pages、Gitee Pages 或任意静态主机。根域名仓库直接推 `dist` 内容；项目子路径用：

```powershell
npm run export -- --base=/repo/
```

当前 GitHub Pages 仓库 `Sun-1025/Sun-1025.github.io`，自定义域名 `sunzhihaoai.top`，CNAME 已保留。仓库内提供 `sync/deploy-v5-pages.ps1`（全量构建包 + 保留 CNAME）与 `sync/clean-pages.ps1`（清理旧文件）。

## 路由

| 路由 | 内容 |
|---|---|
| `#/` | 首页：Hero、四张项目卡、公益实践、关于、联系 |
| `#/internship` | 实习：校内预备实习、东营区图书馆 |
| `#/experience` | 经历：四个项目、公益实践、四段时间线、校园组织 |
| `#/interest` | 兴趣六格 |
| `#/interest/:id` | 兴趣详情（骑行 / 羽毛球 / 登山 / 北京 / 淄博 / 济南） |
| `#/work/:id` | 项目详情（case-site / case-tools / case-voice / case-lib / case-physics） |
| `#/tools` | 工具箱 |
| `#/tools/:id` | 单个工具 |
| `/classic/` | 经典版归档页 |

`#/work` 无 id 时回退到 `#/experience`。

## 目录

```
portfolio-v2/
├─ data/site.json             站点内容（site/nav/branches/home/work/interests/tools/ai/notices/settings）
├─ public/
│  ├─ index.html              前台 SPA 壳
│  ├─ assets/css/app-v5.css   V5 视觉系统（最后加载）
│  ├─ assets/js/app.js        路由与页面渲染
│  ├─ assets/js/ai-dock.js    本地事实库 + 可选远程 AI
│  ├─ assets/photos/          25 张公开 WebP + _manifest.json
│  ├─ assets/covers/          四张项目线稿封面
│  ├─ classic/index.html      经典版归档
│  ├─ tools/                  工具箱模块与按需加载的 vendor
│  └─ admin/                  CMS 后台
├─ ai-server/                 可选 Next.js AI 代理（当前前端 endpoint 为空，走本地事实回退）
├─ scripts/                   静态导出、初始化管理员等
├─ sync/                      Pages 部署 / 清理脚本
└─ docs/v5/                   交付文档
```

## 留言与后台

- 源服务（Express）模式：留言写 `/api/guestbook`，页脚显示后台入口。
- 静态站模式：`window.SZH_GUESTBOOK_ENDPOINT=''`，留言提交回退到邮箱 `mailto`；后台入口自动隐藏。

后台 `/admin/` 只在源服务下使用；内容保存写入 `data/site.json`，每次保存自动备份到 `data/backups/`（最多 30 份）。`data/.jwt-secret`、`data/users.json`、`data/backups/` 不要提交到公开仓库。

## AI 助手

`public/assets/js/ai-dock.js` 内置本地事实库，`ai.endpoint` 为空时完全本地回答；面板里的快捷问题为「你在做什么项目 / 会哪些技术 / 能实习吗」。远程入口配置后才会请求服务端；服务端不可达时自动回退到本地事实。

## 图片与隐私

- 公开 25 张：项目 2、校园 2、兴趣 21；均为 WebP，长边 ≤1600，单张 ≤500 KB。
- 公益课两张：封面只保留屏幕、教师和背影；第二张裁成手 / 桌面 / 桌腿，无儿童正脸。
- 科协图已裁掉奖状墙；青协图只保留孙志昊本人可识别正脸。
- 理财 11 张截图不复制、不部署；原因见 `docs/v5/06-not-public.md`。

## 文档

- [改动清单](docs/v5/01-change-list.md)
- [部署与代码说明](docs/v5/02-deploy.md)
- [图片落位对照表](docs/v5/03-image-map.md)
- [全部板块文案](docs/v5/04-copy.md)
- [自检报告](docs/v5/05-self-check.md)
- [不建议公开的素材](docs/v5/06-not-public.md)
