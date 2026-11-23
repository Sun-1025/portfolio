# 更新记录

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
