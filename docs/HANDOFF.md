## A 已完成

- taste-gate.md：GATE 末行=`GATE: OPEN`；copy-lint FAIL=0，WARN=0；完整 consistency 未闭环，拆分结果为桌面 FAIL=76/WARN=11、820 FAIL=2/WARN=5、390 FAIL=71/WARN=23；Top3=滚动揭示、320px 文字重叠、移动首屏/区块节奏。
- impeccable.md：总分=23/35，最低两域=动效 2/5；布局与栅格、无障碍与响应式并列 3/5。
- DESIGN.md：已落盘，仅记录现有 V5 token、组件、断点和深浅主题。

## A 未完成 / 风险

- Chrome 未安装，winget 安装因哈希不匹配失败；本阶段使用 Edge 降级，需保留该限制。
- 完整 consistency 命令在 Edge 多宽度巡检中超时；1440、820 存在探针错误。
- layout/check 超时，仅生成 1440 部分截图；shoot 与 perf 均超时，`shots\1440.png` 未生成。
- Impeccable 引擎下载失败，detector 未运行；`impeccable.md` 为单上下文降级评审。
- Taste 的 hash 链接 FAIL 属于 SPA 规则冲突，不能直接当作源码缺陷；IBM Plex Mono 未加载条目与 HTML 字体声明冲突，列为疑似误报。
- 最终“留言”标题、H1“孙志昊”和昵称占位“你的昵称”已在本地源码与 Pages 构建中确认，但源码仓库和交付 zip 仍需后续同步核验。

## 交给 B 的输入

- `docs/audit/taste-gate.md`：优先处理滚动揭示、320px 重叠、移动点击区和表单状态。
- `docs/audit/impeccable.md`：按 Top 10 的收益/成本顺序执行，不先做视觉风格重构。
- `docs/DESIGN.md`：作为阶段 C 唯一视觉依据，不得新增未记录的颜色、字号、圆角或阴影。
- 优先条目 1：让 `.reveal` 在 JS 失效、键盘聚焦、reduced-motion 下保持可读。
- 优先条目 2：修复 320px 项目卡文字重叠，并补 320/390 回归。
- 优先条目 3：补留言表单 `role="status"`，统一移动 44px 点击区，再复核 Hero 与区块节奏。

## B 已完成

- sources.md：11 条（React Bits 4 / Uiverse 1 / Aceternity 1 / Motion 3 / Anime.js 1 / MotionSites 1），逐条含直链、原文摘录、落位指令、对应 A 问题、替代方案；抓取日期 2026-11-24。
- PICK.md：11 条落位，新增依赖=无，预计 +1 KB gzip（全部 CSS + 原生 WAAPI 复刻）。
- 许可已核：React Bits = MIT + Commons Clause（页脚保留声明、不得当组件库售卖）；Uiverse 所选按钮 = MIT（保留署名）；Aceternity 只借思路不复制代码；Anime.js / Motion = MIT（默认不引）；MotionSites 付费 prompt 仅摘要 + 链接。

## B 待确认（已拍板 2026-11-24）

1. Count Up（S4/行4）：✅ 同意仅对公开事实计数启用（工具数、项目 4、兴趣 6、公开照片 25）；旧 GPA / 排名禁用。
2. anime.js：✅ 允许在确需 timeline 时引入，锁 4.x、≤30KB gzip；默认仍用 WAAPI 复刻，非默认依赖。
3. React Bits 页脚声明：✅ 同意页脚加一行「Animations adapted from React Bits (MIT + Commons Clause)」，S1–S4 保留 MIT + Commons Clause 用法。

## 交给 C 的输入

- 施工单：`docs/design/PICK.md`；明细：`docs/design/sources.md`。
- 必须先做的 5 条：
  1. 行1 重做 `.reveal`：默认 opacity:1，focus-within / reduced / 无 JS 直接可见（Taste #1）。
  2. 行11 留言表单补 `role="status"` + aria-live 播报（Taste #6）。
  3. 行5 导航/按钮 `min-height:44px` + :active scale 0.98 微反馈（Taste #5）。
  4. 行2 首屏 h1「孙志昊」逐字入场，y≤12px / 320ms，reduced 直接显示（动效域）。
  5. 行9 移动抽屉进出场 200ms，退场 cubic-bezier(0.4,0,1,1)，reduced 直接显隐（动效/响应式）。
- 约束：不推翻 DESIGN.md token；位移≤12px、缩放 0.98–1.02、模糊≤4px、时长≤400ms；只动 transform/opacity/filter；禁鼠标跟随/粒子/视差大位移/无限循环装饰。

## C 已完成（2026-11-24）

- 按 PICK 落地到 `public/assets/js/app.js` 与 `public/assets/css/app-v5.css`，未新增 npm 依赖、未推翻 token：
  - 行1 `.reveal` 默认 opacity:1，IO 进入仅 translateY 8px→0 / 320ms；focus-within / reduced / 无 JS 直接可见。
  - 行2 hero「孙志昊」逐字 span + WAAPI 320ms / 逐字 60ms / y12px。
  - 行3 工具卡与项目卡错峰 riseIn（delay i*60）。
  - 行4 工具数 `v5-count` rAF 计数 400ms，reduced/无 JS 显终值；仅公开计数。
  - 行5 `.v5-btn`/`.nav a`/`.bar-tool` :active scale 0.98 / 120ms；brand/side-mail/页脚 meta 链接 min-height 44px。
  - 行6 项目/工具/兴趣卡 hover translateY(-4px) / 200ms，无鼠标跟随。
  - 行8 项目编号进入时 opacity 0.35→1 点亮。
  - 行9 移动抽屉 WAAPI 进 200ms (0.2,0,0,1) / 退 (0.4,0,1,1)。
  - 行11 留言表单新增 `#guestStatus role="status" aria-live="polite"`，发送中/成功/失败 120ms 淡入播报。
  - 页脚加许可声明：React Bits (MIT + Commons Clause) · reglobby (Uiverse, MIT)。
  - 附加：≤360px 项目摘要取消 line-clamp，防文字重叠（A #4）。
- 校验：`node --check` 通过；`npm run build` 成功（62 文件 / 9.66 MB）；`/api/health` ok；copy-lint 0 FAIL / 0 WARN。
- 390 快速巡检：70 FAIL / 15 WARN（改前 71 / 23）；focus-hidden、stagger、top-stagger、hero-enter、form-send、a11y-name、font-load 转 PASS。

## C 未完成 / 残留

- 区块节奏类 FAIL 仍在（hero-screen / section-height / section-air / one-section / container-edges / row-lines），对应 A #2/#3；PICK 行10 仅做留白微调，未重构区块高度，留待后续。
- links FAIL 为 SPA hash 路由误报（A #8）；cta / off-grid 为规则冲突（A #10），不改源码。
- focus-visible 仍 FAIL，需后续单独排查焦点环裁切。
- 本地 dist 已重建；源码仓库推送、Pages 部署与 zip 重建未在本轮执行，待用户指示。

## C-2 残留修复（2026-11-24，应用户「下一步」）

- 首屏独占：`.v5-hero` min-height 改 `calc(100svh - var(--bar-h))`（桌面与 ≤960），下一区块不再在首屏露出（hero-fill / hero-screen 由 FAIL 转 WARN/PASS）。
- 品牌换行：`.brand{flex-wrap:nowrap}` + `.brand-text/small{white-space:nowrap}`，桌面 sweep 的 nav 换行 FAIL 消除。
- 移动导航边距：≤640 topbar 左右 padding 统一 16px（container-edges 顶栏部分由 FAIL 转 WARN）。
- 焦点可见：`html{scroll-behavior:auto}` + `a,button,[tabindex]{scroll-margin-top:calc(var(--bar-h)+16px)}` + 卡片 `:focus-visible{outline-offset:-3px}`。根因是平滑滚动使检查器 Tab 到首屏以下控件时元素尚未入视被判「不可见」；改即时滚动后 focus-visible / focus-hidden 均 PASS。
- 揭示静止化：移除 IO 触发的卡片位移与编号淡入（与 Taste SR-1「滚动入视即动画」冲突），`.reveal` 完全静态；scroll-reveal 转 SKIP。动效保留在首屏逐字、抽屉、计数、hover、按压（均非滚动触发）。
- 移动区块间距 52→56px（section-air 间隙带由 FAIL 转 WARN）。
- 校验：node --check 通过；npm run build 成功；390 快速巡检 47 FAIL / 14 WARN（C 前 71/23 → C 后 65/13 → C-2 后 47/14）。

## C-2 残留（规则冲突 / 超范围，不改）

- section-height / one-section / section-air（分隔线）：Taste 要求每区块整屏对齐、不用分隔线，与本站内容驱动的长首页和 0.5px 线语言冲突（A #3）。
- links：SPA hash 路由误报（A #8）。no-visual / text-only / cta：个人档案型极简首页的规则冲突（A #10）。
- off-grid / container-edges（编号缩进、skip-link、背景层）：编号列表与无障碍/背景结构属正常设计。row-lines：标签行不满宽属正常。
- nav（390）：移动抽屉默认隐藏属标准移动模式。assets：图片 srcset/体积（A #7），留待图片专项。

## D 结论

- **GATE: FAIL 100 (round 1 of 3)**，WARN 22；**可上线=否**。consistency 5 宽度 158 FAIL / 43 WARN（390 单宽度 49/12，A 基线 71/23）；layout check 95 条发现；perf 10 FAIL（1440 传输 3.06 MB、字体 1.23 MB/23 文件、11 图缺 width+height、7 图过大、CLS 0.110）。
- Impeccable 降级复评（引擎 0.1.27 下载失败，curl.exe 不可用）：总分 25/35（A 23/35，+2）。

### FAIL 清单（回退 C 时按此处理）

1. `screen-height 5 / screen-short 2 / section-height 2 / hero-fold 1`：`main#view .v5-hero`、各 `.v5-section`。修法方向：hero 精确补足首屏（当前 390 高 756，目标 844；1440 高 828，目标 900）；项目/兴趣/关于区块压到 1–2 屏或明确接受内容驱动高度。
2. `section-air 3 / one-section 3 / neighbour 1 / section-gaps 1`：`.v5-section` 间距与分隔线。修法方向：统一区块间距到 112–420px 带内，减少整宽分隔线（与 DESIGN 线语言冲突需拍板）。
3. `edge-left 42`：`.v5-timeline-body` 的 64/82px 缩进、`.v5-ability` 的 14px 缩进、`.v5-section-head` 150px 编号列。修法方向：若保留编号缩进，需在报告豁免；否则把正文对齐到容器左线。
4. `links 21`：全站 `href="#/..."`。判定：SPA hash 路由误报，建议人工点验后豁免，不改源码。
5. `container-edges 6 / off-grid 1 / row-lines 1`：skip-link、`.site-grid`、header 在 landmark 外；标签行不满宽。多属结构/规则冲突，建议豁免。
6. `no-visual 2 / text-only 1 / cta 1 / moment-none 1`：Hero/关于区。个人档案型极简规则冲突，建议豁免或补真实界面片段（不得装饰性补图）。
7. `card-layout 2 / split-pair 2 / assets 1 / nav 1`：项目卡与图片。交给 C 的卡片/图片专项（srcset、width/height、卡片网格）。
8. `perf 10 FAIL`：字体 23 文件 1.23 MB、传输 3.06 MB、11 图缺尺寸、7 图自然宽 >2.2×、390 字体请求 broken。交给性能专项（字体自托管、图片 srcset/尺寸属性）。

## 遗留

- 需拍板：edge-left（42）与 links（21）是否作为豁免接受？若接受，GATE 的 100 中有 63 条不再回退 C。
- 需拍板：区块是否必须严格按整屏（SR-2/4）？若必须，需允许重构首页为分屏叙事；若不允许，screen 类 FAIL 只能豁免。
- 需拍板：是否接受当前 perf 结果作为上线门槛（传输 3.06 MB / 字体 1.23 MB）？不接受则先做字体与图片专项。
- 流程问题：`change-log.md`、`app-v6.css`、`motion.js`、`_backup\v5-*` 均不存在，回滚只能从 `portfolio-v2-v5-source.zip` 或源码仓库 `3d95814` 手动取回 `app-v5.css` / `app.js`。
- 环境风险：本轮服务曾中途停止，1440 首轮截图是错误页，已废弃并全部重跑；Edge 降级下 consistency/layout 探针多次 INCOMPLETE。
