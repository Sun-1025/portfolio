# 孙志昊 · 个人站 4.0

个人主页 + 在线工具 + 可视化后台，保留原版 3D 场景页作为「经典版」。

4.0 采用 **工程仪表 + 编辑式排版**：近黑深空底、酸性信号绿与冰青信号色、72px 顶栏、六级字号层级、磨砂玻璃 3D 主视觉与克制动效。完整的设计与验收记录见 `docs/design-v4.md`、`docs/checklist-v4.md`。

> **iOS 27 日间玻璃（2026-11-23）**：浅色模式新增独立覆盖层 `public/assets/css/app-ios27.css`，提供 `blur(22px)` + 低饱和白 tint + 0.5px 白内描边 + 柔和落影；深色模式不加载任何 iOS27 规则，完整保留 v4 原版。材质参数见 `docs/material-ios27-light-glass.md`，巡检记录见 `docs/audit-ios27.md`。经典版 `/classic/` 与后台 `/admin/` 未接该覆盖层。

## 视觉系统

- 主色：`#070908` 近黑 / `#d6f36a` 酸性信号绿 / `#7ce9d5` 冰青遥测色；浅色 `#f1f0e7` / `#5c7900` / `#087c72`
- 字体：IBM Plex Sans（正文与标题）+ IBM Plex Mono（标签、数据、代码）+ Noto Sans SC（中文回退）
- 间距：以 4px 为基础节奏；卡片、面板、导航统一圆角、边框与阴影层级
- 字号：正文 16.5–18px，导航 16.5px / 500，全站硬下限 12px；首页 Hero 为 66–82px 展示级
- 首页主视觉：磨砂玻璃信号核心 `signal-core.webp`；三个核心项目封面为同材质 1200×800 WebP；`/classic/` 原场景入口仍保留
- AI 助手：56×56 双主题 SVG 浮标，终端提示符 + 信号脉冲，面板 420px，移动端底部抽屉

## 快速启动

```powershell
cd C:\Users\sun\OneDrive\Desktop\实习\portfolio-v2
npm install
npm start           # 默认 http://localhost:8080
```

首次启动会自动生成默认管理员 `admin` / `Admin@12345`。如需重置密码：

```powershell
npm run init -- admin 你的新密码
```

默认管理员：`admin` / `Admin@12345`。首次登录后，请立即到「账号设置」修改密码。

## 目录结构

```
portfolio-v2/
├─ server.js                 Express 入口
├─ src/
│  ├─ auth.js                JWT / Cookie / 登录限流 / 会话过期
│  ├─ store.js               JSON 内容库、原子写入、自动备份
│  └─ routes/
│     ├─ auth.js             登录、退出、会话信息、改密
│     ├─ content.js          内容读取 / 保存 / 备份恢复
│     ├─ upload.js           图片上传与媒体库
│     └─ events.js           SSE 内容更新推送
├─ public/
│  ├─ index.html             前台 SPA 壳
│  ├─ assets/css/app.css     新版主站样式
│  ├─ assets/js/app.js       路由、渲染、主题、SSE
│  ├─ admin/                 后台入口
│  ├─ assets/css/admin.css   后台样式
│  ├─ assets/js/admin.js     后台逻辑
│  ├─ classic/               经典版（原 3D 场景页）
│  ├─ tools/                 可插拔工具模块
│  └─ uploads/               后台上传的图片
├─ data/
│  ├─ site.json              站点内容库
│  ├─ users.json             管理员账号
│  └─ backups/               每次保存自动备份
├─ scripts/
│  ├─ init-admin.js          初始化管理员
│  └─ export-static.js       GitHub Pages / Cloudflare Pages 静态导出
├─ docs/                     后台手册、部署、扩展、模板选型
└─ deploy/                   启动/停止/开机自启脚本与反向代理示例
```

## 双分支

| 分支 | 入口 | 说明 |
|---|---|---|
| 个人主页 | `#/` / `#/work` | Hero、关于、项目、技能、经历、联系 |
| 在线工具 | `#/tools` | 文件转换台（99 条真实路径）+ Markdown、字数、单位、日期四个小工具 |
| 经典版 | `/classic/` | 原版 3D 黑板场景，完整保留 |

顶部导航统一；后台可控制分支显示/隐藏与导航排序。前台路由也会遵守分支隐藏开关。

## 在线工具

`#/tools` 内置文件转换台，全部在浏览器本地完成，不上传文件。当前开放 99 条真实转换路径：

- 图片：PNG / JPG / JPEG / WebP / GIF / BMP / SVG / ICO 转为 PNG、JPG、WebP 或 PDF；GIF 只取首帧，SVG 栅格化。
- 数据：JSON ↔ CSV / TXT / XLSX / XML / YAML / INI / TSV / NDJSON；CSV ↔ JSON / TXT / XLSX / TSV / YAML；YAML / XML / INI / TSV / NDJSON → JSON / TXT；Markdown ↔ HTML / TXT；TXT → HTML；HTML → TXT / Markdown。
- 音频：MP3 / OGG / OGA / M4A / AAC / FLAC / WAV 解码后导出 WAV 或 MP3。
- PDF：PDF → TXT / PNG / JPG；多页转图片会打包成 ZIP。
- Office：DOCX → HTML / TXT / Markdown；XLSX / XLS / ODS → CSV / JSON / HTML / TSV；PPTX → TXT / HTML；CSV / JSON → XLSX。
- 电子书：EPUB / FB2 → HTML / TXT / Markdown；CBZ 漫画 → PDF。
- 3D：STL / OBJ / PLY 三角网格互换。

PDF、Office、电子书、YAML、Markdown 和 PDF 生成使用按需加载的开源库（PDF.js、pdf-lib、Mammoth、SheetJS、JSZip、js-yaml、Turndown、lamejs），打开工具页时不下载。视频转码需要 FFmpeg 引擎，当前不开放；PDF 扫描件没有 OCR，只能提取已有文字层；Office 不提供 DOCX 转 PDF 的版式保真转换；MOBI / AZW3、GLB / GLTF、HEIC / TIFF 等格式暂不开放，也不会伪造转换成功。单文件上限：图片 60 MB、数据 10 MB、音频/PDF 80 MB、Office/电子书/3D 40 MB；PDF 转图片最多 80 页。

## 站内 AI 分身

首页右下角的 `>` 是终端入口，面板标题 `~/sunzhihao $ ask`。前端是 `public/assets/js/ai-dock.js`，在 `app.js` 里初始化；后端不可达或限流时自动回退到站点事实。

线上代理：`https://ai.sunzhihaoai.top/api/chat`（Vercel 项目 `sunzhihaoai-ai`，自定义域名 CNAME 到 Vercel）。线上模型使用 Agnes AI 的 `agnes-3.0-flash`，Base URL 为 `https://apihub.agnes-ai.com/v1`；密钥只放 Vercel 服务端环境变量，浏览器拿不到。

后端是独立的 Next.js 应用 `ai-server/`，只暴露 `POST /api/chat`。完整说明、环境变量和部署步骤见 [ai-server/README.md](ai-server/README.md)。

```powershell
cd ai-server
Copy-Item .env.example .env.local
npm install
npm run dev
```

`public/index.html` 的 `window.SZH_AI_ENDPOINT` 与 `data/site.json` 的 `ai.endpoint` 都指向 `https://ai.sunzhihaoai.top/api/chat`。GitHub Pages 不能运行 Route Handler，AI 代理必须单独部署，或把静态站改成同源 Express 服务。

## 常用命令

```powershell
npm run dev                  # 文件变动自动重启
npm run export               # 导出静态站到 dist/
npm run export -- --base=/repo/   # 导出到 GitHub Pages 子路径
```

导出后，`dist/` 可整体上传到 GitHub Pages、Cloudflare Pages 或任意静态主机。

## 数据与备份

- 内容：`data/site.json`
- 管理员：`data/users.json`（bcrypt 哈希）
- JWT 密钥：`data/.jwt-secret`（首次启动自动生成，**不要提交到公开仓库**）
- 每次保存自动复制到 `data/backups/`，保留最近 30 份；后台「备份恢复」可一键回滚。

## 文档

- [后台使用手册](docs/后台使用手册.md)
- [v4 巡检记录](docs/audit-v4.md)
- [v4 设计说明](docs/design-v4.md)
- [v4 文案稿](docs/copy-v4.md)
- [v4 响应式记录](docs/responsive-v4.md)
- [v4 AI Logo 规范](docs/ai-logo-spec.md)
- [v4 终检清单](docs/checklist-v4.md)
- [架构说明](docs/架构说明.md)
- [内网部署与访问加速](docs/内网部署与访问加速.md)
- [扩展开发指南](docs/扩展开发指南.md)
- [模板选型记录](docs/模板选型.md)

## 安全提醒

1. 上线前必须修改默认管理员密码。
2. 不要把 `data/.jwt-secret`、`data/users.json`、`data/backups/` 提交到公开仓库。
3. 后台只建议在局域网 / Tailscale 内访问；如需公网访问，请加 HTTPS 与反向代理，并限制 `/admin` 来源。
4. 上传白名单已排除 SVG，避免存储型 XSS。
