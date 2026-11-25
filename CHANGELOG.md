# 更新记录

## 2026-11-25 — T1 M1：PDF ↔ Word 工具增量

- 新增 `public/tools/pdf-to-word.js`：pdf.js 逐页取文字层、按 y/x 重建行与段落，JSZip 手写最小 OOXML；支持扫描件判定、局部无文字页斜体提示、XML 转义与 `<w:br w:type="page"/>` 分页。
- 新增 `public/tools/word-to-pdf.js`：mammoth 转 HTML，隐藏 iframe（`position:fixed; left:-9999px`）写入完整文档并调系统打印面板；按钮文案为「打印 / 保存为 PDF」，明确提示不是直接下载。
- 新增 `public/tools/lib/download.js`、`file-drop.js`、`pdf-text.js`、`docx-write.js`、`pdf-to-docx.js`、`word-print.js`：下载/文件名清洗、共用拖拽区、PDF 文字提取、OOXML、打印流程。
- 转换台新增 `PDF → DOCX`、`DOCX → PDF`；`DOCX → PDF` 复用打印流程，成功后标记“已打开打印面板”，不伪造下载文件。
- 新增 `public/tools/vendor/cmaps/` 五个中文 CMap 文件，解决 pdf.js 对 `UniGB-UTF16-H` 中文 PDF 的提取；worker 改为 `/tools/vendor/pdf.worker.min.mjs` 绝对路径。
- 新增 `public/sw.js` 并在首页注册：首次在线访问后预缓存前台壳、工具模块、pdf.js/mammoth 等 vendor 与中文 CMap，DevTools offline 下可打开 `#/tools/pdf-to-word` 并完成转换；只缓存本域资源，不上传文件。
- `data/site.json` 新增 `pdf-to-word`、`word-to-pdf` 两条，`tools.routes` 由 5 改为 7；现有 5 个工具、导航、视觉 token、后台和路由结构未改。
- M1 实测：10 页纯文字 PDF → 59 段落 + 9 个分页符；双栏文字齐全（版式丢失提示保留）；扫描件/局部扫描件按规则处理；含图片/表格 DOCX 打印预览 A4；100MB PDF 被 80MB 上限拦截；390×844 无横向溢出；offline 转换通过。
- 构建：`npm run build` 通过，`dist` 86 文件 / 10,344,116B（约 9.86MB）；截图在 `_shots/t1/`。

## 2026-11-25 — A2 Threads / A3 布局收口 / 仓库文档重建

- A2：首页背景从 DotField 全面替换为原生 WebGL2 Threads；删除 `public/assets/js/dotfield.js`，新增 `public/assets/js/threads.js`，`public/index.html` 改引新脚本，`app-v6.css` 的 `.v6-dotfield` 改为 `.v6-threads`。
- A2 保留三段 GLSL、`MAX_RENDER_DIM` 语义、`buildStrip` 的 96–640 分段、`uCurve = 2 / brightness`、`blendFunc(ONE, ONE_MINUS_SRC_ALPHA)`；全屏跟随，无禁区、无遮罩、无冻结，指针只走 `PointerBus`。
- A2 卡片 hover 增加 scoped 规则：threads 模式下四类卡片保持 `background: var(--glass-tint)`，`backdrop-filter` 降为 `blur(2px) saturate(1.35)`，默认卡面 token 未改。
- A3：关于页右侧信息栏与主栏垂直居中；回顶按钮 `Back to Top` 文字水平/垂直居中；工具台左右两栏等高、等宽；右侧投放区占上方 2/3、空队列占下方 1/3，`∅` 随空状态高度等比缩放并紧贴“队列为空”上方；站内 Agent 增加气泡提示，文案末尾带全角波浪号，打开面板后自动隐藏。
- 文档：README 重建；新增 `docs/00-overview.md` 到 `docs/09-credits.md`；清理 GitHub 上 `docs/??????.md` 等乱码文件名，统一使用 ASCII 文件名与 UTF-8 正文。
- 隐私：移除文档中的管理员明文密码；本机完成管理员密码轮换，新密码写入 `private/admin-password.txt`（`.gitignore` 已忽略），仓库不提供默认密码。
- 构建：`npm run build` 通过，`dist` 72 文件 / 10,199,202B；`dist/assets/js/threads.js` 14,263B；`dist/assets/js/dotfield.js` 不存在。

## 4.0.1 — 2026-11-23（iOS 27 日间玻璃，未发布）

- 新增 `public/assets/css/app-ios27.css`：所有规则限定 `html[data-theme="light"][data-glass="ios27"]`，只覆盖浅色/日间模式；深色/夜间模式不加载任何 iOS27 规则，保持 v4 原版。
- 材质：`blur(22px)` + `saturate(138%)` + `brightness(1.01)`，低饱和白 tint `.68`（浮层 `.86`、抽屉/滚动态 `.78`、小控件 `.44–.56`），0.5px 白内描边、极细暗外沿、双层柔和落影。
- 顶部导航、移动抽屉、Hero 控制台、AI 浮标与面板、项目/实践/兴趣 grouped list、详情 meta 条、项目卡片、工具卡片与工具面板统一玻璃材质。
- 移动抽屉用 `.topbar:has(.nav.is-open)` 临时关闭父级 `backdrop-filter`，解决 backdrop root 导致的模糊失效。
- 浅色为 WCAG AA 微调文字色与实心填充：`--muted:#5f6e66`、小号 accent `#557000`、实心按钮 `#557000`（白字 5.37:1）；品牌 lime 保留在大标题与装饰。
- 未改 JS、路由、文案、`data/site.json`、AI 逻辑、工具业务、CMS/后台 API；未改字号、行高、导航高度、按钮尺寸、栅格间距。
- 新增 `docs/material-ios27-light-glass.md`、`docs/audit-ios27.md`；`dist` 已重建 56 个文件 5.93MB，`sync/deploy-api.ps1` 已补 `app-ios27.css`。
- 待办：等待部署指令后推送 GitHub / GitHub Pages / Gitee；`/classic/` 与 `/admin/` 未接玻璃覆盖层。

## 4.0.0 — 2026-11-23（全量视觉重构 + 文案优化）

- 视觉方向从 HUD 小字密度改为「工程仪表 + 编辑式排版」：IBM Plex Sans / IBM Plex Mono / Noto Sans SC，酸性信号绿 + 冰青，建立六级信息层级 + 首页展示级。
- 桌面顶栏 72px、菜单 16.5px / 500、导航点击 48.7–50.4px、操作按钮 44–46px；移动端 62px，菜单 15.5px / 48px 行高。
- 首页 Hero 改为左文右图，新增磨砂玻璃信号核心 `signal-core.webp`；三个核心项目封面统一为同一摄影棚、同一材质的 1200×800 WebP。
- 新增 Tailwind v4 构建链：`src/tailwind.css` → `public/assets/css/tailwind.css`；页面样式以 `app-v4.css` 覆盖旧层，保留旧路由、主题、工具与 AI 功能。
- 右下角 AI 助手改为 56×56 SVG「终端提示符 + 信号脉冲」，双主题、状态环、悬停与点击反馈；面板 420px，移动端底部抽屉。
- 捆绑文案重写：Hero A/B、三个核心项目、三段实践、四项兴趣、三条工作原则、关于九段；删除夸大表述，补事实边界。
- 建立 12px 字号硬下限；1920 / 1440 / 390 三档 × 四条路由叶子文本 0 处 <12px。
- 静态导出 55 个文件 5.91MB；新增 `docs/audit-v4.md`、`design-v4.md`、`copy-v4.md`、`responsive-v4.md`、`ai-logo-spec.md`、`checklist-v4.md`。
- 待办：推送 GitHub / GitHub Pages / Gitee 后线上才切换为 v4。

## 3.4.0 — 2026-11-23（文案重写 + 站内 AI 分身）

- 首页主标改为「舍我其谁」，移除 hero 首段；字距 0.15em，四字整体淡入，不再单独强调第二行。
- 关于我重排为 9 段正文 + 3 段未来方向，共 12 段；保留承德/东营、ENTJ 的急、C 语言笨办法与凌晨两点、申报书四遍、语音监测、图书系统、公益课、爱好、Plan-Do-Done、短板与理念。
- 联系渠道补上 GitHub，固定四条：邮箱、GitHub、Gitee、微信；页脚、关于我侧栏、经典版、AI 话术都提示仓库开 Issue。
- 新增 `public/assets/js/ai-dock.js`：右下角 `>` 浮标、终端面板、三个快捷问题、SSE 流式输出、移动端底部抽屉、后端不可用时本地事实降级。
- 新增独立 `ai-server/`：Next.js Route Handler、IP 10 次/小时限流、`max_tokens 600`、`temperature 0.4`、10 轮截断、CORS、SSE、系统提示词与事实表。
- 新增 `profile.json`、`.env.example`、`ai-server/README.md`；部署时密钥只留在服务端。
- AI 代理已部署到 Vercel 项目 `sunzhihaoai-ai`，通过自定义域名 `https://ai.sunzhihaoai.top/api/chat` 对国内访问；模型为 Agnes AI `agnes-3.0-flash`。
- 静态导出提升到 46 个文件，新增 AI 前端模块；`GitHub Pages` 只承载静态站，AI 代理独立部署。`window.SZH_AI_ENDPOINT` 与 `ai.endpoint` 已指向自定义域名。

### 验证

- `npm run export` 通过，`dist` 46 文件 5.73 MB。
- 桌面 1440×1000、移动端 390×844 无横向溢出；主标、四条联系方式、AI 面板均正常。
- 本地 mock 上游端到端验证：浏览器 SSE 收到 `ONLINE`，错误时回退 `LOCAL`，无控制台异常。
- 线上代理实测 200 并流式返回；CORS 预检 204；首页 AI 终端状态切到 `ONLINE`，回答「你在做什么项目」时返回语音监测项目与图书管理系统。
- 代理实测 10 次/小时后返回 429 固定话术；`ai.sunzhihaoai.top` 的 HTTPS 与自定义域名已验证。

## 3.3.0 — 2026-11-23（全格式扩展，视频除外）

- 转换台从 44 条路径扩展到 99 条，输入扩展到 30 类，仍全部在浏览器本地完成，不上传文件。
- 图片：新增 BMP / SVG / ICO 输入，均可转 PNG / JPG / WebP / PDF；SVG 走 Image 栅格化回退，透明底转 JPG 补白。
- 数据：新增 XML / YAML / INI / TSV / NDJSON 输入，新增 JSON → XML / YAML / INI / TSV / NDJSON，CSV → TSV / YAML，HTML → Markdown；新建 `data-core.js` 承载结构化文本互转。
- Office：新增 ODS 读取，DOCX → Markdown，XLSX/XLS/ODS → TSV，PPTX → HTML。
- 电子书：新增 FB2 → HTML/TXT/Markdown，CBZ 漫画 → PDF（按文件名自然排序，最多 100 页）。
- 3D：新增 PLY（ASCII / 二进制）解析与导出，STL / OBJ / PLY 三者可互换。
- 音频：新增 WAV 输入与 MP3 输出；MP3 使用 lamejs 在浏览器内编码。
- 新增按需库：`js-yaml.min.js`、`turndown.js`、`lame.min.js`；`docs-core.js` 增加 YAML、HTML→Markdown、MP3、FB2、CBZ 实现。
- 站点文案、工具计数、README、测试脚本同步到 99 条；`qa/test-all-formats.cjs` 覆盖全部新增输入与代表目标。

### 验证

- 浏览器 85 文件批量实测全部完成，无控制台错误：PDF→TXT、DOCX→MD/HTML/TXT、XLSX→TSV/CSV/JSON/HTML、PPTX→HTML/TXT、ODS→CSV/JSON/HTML/TSV、EPUB→MD/HTML/TXT、FB2→HTML/TXT/MD、CBZ→PDF、BMP/SVG/ICO→PNG/JPG/WEBP/PDF、PNG/JPG/WEBP/GIF 图片矩阵、YAML/JSON/XML/INI/TSV/NDJSON/CSV/MD/TXT/HTML 数据矩阵、STL/OBJ/PLY 3D 互换、WAV→MP3、MP3→WAV、PNG→PDF。
- `convert-core`（99 条路由、30 行矩阵、CSV/Markdown）与 `model-core`（STL/OBJ/PLY）单元测试通过。
- 移动端 390×844 检查无横向溢出；桌面 1440×1050 截图正常。

### 边界

- 视频、MOBI/AZW3、GLB/GLTF、HEIC/TIFF、扫描件 OCR、DOCX→PDF 版式保真、旧版 DOC/PPT 仍不开放；不伪造成功结果。

## 3.2.0 — 2026-11-23（PDF / Office / 电子书 / 3D 扩展）

- 转换台从 18 条路径扩展到 44 条：图片可转 PDF；JSON/CSV 可写 XLSX；新增 PDF、Office、EPUB、STL/OBJ 分类。
- PDF：PDF → TXT / PNG / JPG；多页转图片自动打包 ZIP，最多 80 页；扫描件没有 OCR，只提取已有文字层。
- Office：DOCX → HTML/TXT；XLSX/XLS → CSV/JSON/HTML；PPTX → TXT；CSV/JSON → XLSX。不提供 DOCX→PDF 版式保真转换，旧版 DOC/PPT 暂不支持。
- 电子书：EPUB → HTML/TXT，按 OPF spine 顺序合并章节，HTML 版内嵌 EPUB 图片并移除脚本。
- 3D：STL（ASCII/二进制）↔ OBJ，只处理三角网格几何，不保留材质。
- PDF.js、pdf-lib、Mammoth、SheetJS、JSZip 全部放在 `public/tools/vendor`，按需加载，工具页首屏不下载。
- 新增 `qa/test-model-core.mjs`、`qa/test-docs-ui.cjs` 和文档测试夹具生成脚本。

### 验证

- 浏览器批量实测 10 个文件全部完成：PDF→TXT、PDF→PNG（ZIP）、DOCX→HTML、XLSX→CSV、PPTX→TXT、EPUB→HTML、STL→OBJ、OBJ→STL、JSON→XLSX、PNG→PDF；无控制台错误。
- `convert-core` 与 `model-core` 单元测试通过；44 条路径计数与实际扩展名映射一致。

## 3.1.0 — 2026-11-23（文件转换台）

- `#/tools` 新增浏览器本地文件转换台：拖拽/选择、格式搜索、分类过滤、批量队列、目标格式选择、全部转换、下载全部、转换历史。
- 开放 18 条真实转换路径：图片 PNG/JPG/JPEG/WebP/GIF → PNG/JPG/WebP（GIF 取首帧）；JSON ↔ CSV/TXT；CSV ↔ JSON/TXT；Markdown ↔ HTML/TXT；TXT → HTML；音频 MP3/OGG/OGA/M4A/AAC/FLAC → WAV。
- 转换全部在本机完成，不上传文件；不提供视频、Office、PDF、电子书、3D 转换，也不伪造成功结果。
- 原 Markdown、字数、单位、日期四个小工具保留，工具页改为「转换台 + 常用小工具」结构。
- 新增 `qa/test-convert-core.mjs` 核心单测与 `qa/test-converter-ui.cjs` 批量 UI 测试。

### 验证

- 核心单测覆盖 18 条路由计数、扩展名归一化、JSON↔CSV、带引号/换行 CSV、Markdown→HTML、TXT→HTML、HTML→TXT。
- 浏览器批量实测：JSON→CSV、Markdown→HTML、PNG→WebP、MP3（WAV 数据）→WAV 四个文件全部完成，历史记录写入，无控制台错误。
- 桌面 1440×1050 与移动 390×844 均无横向溢出。

## 3.0.0 — 2026-11-23（奶白身份照补丁）

- 首页 HUD 肖像替换为独立奶白底身份照 `portrait-id-cream.webp`：保留经典版 3D 动漫人物的黑发、圆框眼镜与黑色 T 恤，去掉黑板、文字、电脑和桌面。
- 头像框移除暗角渐变与扫描线叠加，保留 HUD 边框、`PROFILE / 001` 编号与在线读数；字幕改为 `IDENTITY / 2026`。
- 原 `portrait-classic.webp`、`portrait-dark.webp` 保留不删，`/classic/` 入口与路由结构不变。

## 3.0.0 — 2026-11-23（经典肖像补丁）

- 首页 HUD 肖像由 `portrait-dark.webp` 切换为经典版场景裁切 `portrait-classic.webp`：黑板、白色毛笔字背景、戴眼镜的 3D 动漫男生与笔记本。
- 肖像滤镜改为保留经典版的绿色黑板与暖色皮肤，悬停时轻微提高饱和度；字幕改为 `CLASSIC / 2026`。
- 原 `portrait-dark.webp` 保留不删，`/classic/` 入口、后台与 hash 路由结构不变。

## 3.0.0 — 2026-11-23

### 视觉重构

- 从「纸张 + 衬线标题 + 荧光绿」2.0 视觉，升级为 **Signal / Control Room** 深空控制台方向。
- 新配色：`#060809` 近黑底、`#d7ff4f` 酸性信号绿、`#6ff5e4` 冰青遥测色；亮色主题同步适配。
- 新字体层级：Space Grotesk（标题）/ Inter（正文）/ JetBrains Mono（标签与数据），统一 Google Fonts 加载。
- 新增固定坐标网格、指针跟随信号光晕、扫描线噪点、顶部阅读进度条。
- 首页重构：大字号分行动画标题、LIVE 状态、终端式 PROFILE.LOG、HUD 档案卡、轨道环、SIGNAL / FOCUS / LOCAL 读数。
- 项目页重构：`DATABASE / WORK` 数据条、编号记录卡、指针光晕、首条项目跨栏大卡。
- 详情页重构：数据化元信息栏、`ASSET / LOG` 侧栏、终端截图资产与标签面板。
- 工具页与页脚同步重构；页脚加入 `04 / CONTACT` 数据条与信号色标题。

### 内容与结构

- 保持 `data/site.json` 数据契约、hash 路由、后台、`/classic/` 旧版入口不变。
- `site.json` 配色元信息同步为 3.0 信号色；站点描述更新为「嵌入式与 AI Agent 方向」。
- 新增 `README.md` 视觉系统说明与本更新记录。

### 验证

- 桌面 1440×1000 与移动 390×844 均无横向溢出。
- 7 条主路由（首页、项目、项目详情、工具、Markdown、单位、日期）控制台无报错。
- 本地首页 `load` 约 276 ms，首屏绘制约 148 ms；静态导出 29 个文件、1.66 MB。
- 经典版、后台与旧版分支资源保持不变。
