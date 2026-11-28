# portfolio-v2 v6 验收报告

验收日期：2026-11-24。角色：验收员（只读；未改任何代码、CSS、文案）。

## 0. 结论

`GATE: FAIL 100 (round 1 of 3)`；FAIL=100，WARN=22；**是否可上线=否**。理由：GATE 明确 FAIL 100，其中 screen-height / screen-short / hero-fold / section-height 属真实版式问题；consistency 5 宽度合计 158 FAIL / 43 WARN；perf 10 FAIL（1440 传输 3.06 MB、字体 1.23 MB / 23 个文件、11 张图缺 width+height、7 张图过大）。另有大量 edge-left（42）与 links（21）属缩进设计与 SPA hash 规则冲突，需人工裁定，不能当作已通过。

## 1. 环境

- Node：v22.23.2；`npm run build` 成功（62 文件 / 9.66 MB）；`npm start` 常驻，`/api/health` ok、首页 HTTP 200。
- 浏览器：本机无 Chrome，按约定降级 Edge（`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`）；`icons.mjs` / `moments.mjs` 未参与本轮验收。
- 重要环境事件：首次批量截图/检查期间本地服务曾停止，1440 截图实为 Edge「localhost 拒绝连接」错误页（已留证并废弃）。重启服务后 consistency / layout / perf / 四档截图全部重跑；本报告只采用重跑后的数据。
- Impeccable：引擎下载失败（`impeccable: cannot download engine 0.1.27; curl.exe is unavailable`，exit 127），按技能「Launcher unavailable」路径改读现有 DESIGN.md 与源码，未伪造 PRODUCT.md / DESIGN.md，评分为降级复评。

## 2. Taste 前后对照

| 项 | A 基线 | D 复验 | 变化 |
|---|---|---|---|
| GATE | GATE: OPEN（A 记录；当时未形成 PASS/FAIL 判定） | GATE: FAIL 100 (round 1 of 3)，WARN 22 | 由未判定 → 明确 FAIL |
| consistency FAIL 数 | 完整 5 宽度未完成；拆分：桌面 76、820 2、390 71 | 5 宽度合计 **158 FAIL / 43 WARN**；单宽度 390 **49 FAIL / 12 WARN** | 390：71→49（−22）；WARN 23→12（−11） |
| check FAIL 数 | layout check `check: timed out`，未完成 | layout check 完成，**95 条发现**（edge-left 39、hero-fold 14、screen-short 12、neighbour 11、sparse 10、screen-height 9） | 由未完成 → 有量化结果 |
| copy-lint FAIL/WARN | 0 / 0 | **0 / 0** | 持平 |
| perf：LCP / CLS / 长任务数 | 未跑（超时） | 1440：LCP 4180 ms / CLS 0.110 / 长任务 0；390：LCP 10728 ms / CLS 0.000 / 长任务 0；SUMMARY 10 FAIL / 10 WARN | 由未跑 → 有数据，且 FAIL |

补充：`--start` 只负责布防（源码 `gate.mjs` 在布防分支 `process.exit(0)`），真正的判定跑的是不带 `--start` 的 gate；本报告采用后者输出的末行。

## 3. Impeccable 前后对照

⚠️ DEGRADED：引擎不可用，D 分数依据源码、Taste 输出、perf 与截图复评，非引擎 detector。

| 域 | A 分数 | D 分数 | 变化 |
|---|---:|---:|---|
| 排版 | 4 | 4 | 0：H1/正文/标签层级保持稳定 |
| 配色 | 4 | 4 | 0：冷灰玻璃与浅色主题未变 |
| 布局与栅格 | 3 | 3 | 0：hero 已独占首屏，但区块仍 2.8–3.4 屏、390 有 x32 缩进溢出 |
| 动效 | 2 | 4 | +2：揭示静止、首屏逐字、抽屉、计数、hover、按压均克制；已无滚动触发动画 |
| 文案与基调 | 4 | 4 | 0：无夸大词、无奖项名次 |
| 性能 | 3 | 2 | −1：3.06 MB 传输、1.23 MB 字体、11 图缺尺寸、7 图过大、CLS 0.110 |
| 无障碍与响应式 | 3 | 4 | +1：focus-visible / focus-hidden / reduced-motion / ui-fit 均 PASS，留言有 role=status、点击区 44px |
| **总分** | **23/35** | **25/35** | **+2** |

## 4. 交互交付核对

| # | 交互 | 实现位置（文件+函数） | 佐证截图 | 状态 |
|---|---|---|---|---|
| 1 | 区块揭示静止可见 | `app.js` `revealIn()`；`app-v5.css` `.reveal` | `shots\v6\1440.png`、`390.png` | 完成 |
| 2 | 首屏「孙志昊」逐字入场 | `app.js` `splitChars()` + `render()`；`app-v5.css` `.v5-h1-ch` | `shots\v6\1440.png` | 完成 |
| 3 | 工具箱列表错峰入场 | `app.js` `renderTools()` | — | 未完成（为通过 Taste SR-1 已移除 IO 滚动动画） |
| 4 | 公开计数（工具数等） | `app.js` `renderTools()` + `countUp()` | `shots\v6\390.png` | 完成 |
| 5 | 导航/按钮按压 + 44px 点击区 | `app-v5.css` `.v5-btn:active`、`.nav a`、`.brand` | `shots\v6\390.png` | 完成 |
| 6 | 卡片 hover 抬升 −4px | `app-v5.css` `.v5-project-card:hover` 等 | `shots\v6\1440.png` | 完成 |
| 7 | 项目编号点亮 | — | — | 未完成（同 SR-1 冲突，已移除） |
| 8 | 移动抽屉进出场 | `app.js` `boot()` 的 `#menuBtn` / `#nav` 监听 | `shots\v6\390.png` | 完成 |
| 9 | 留言 `role="status"` 播报 | `app.js` `bindGuestbook()` + `say()`；`.guest-status` | `shots\v6\1440.png` | 完成 |
| 10 | 页脚许可声明 | `app.js` `renderFoot()` `.foot-credit` | `shots\v6\1440.png` | 完成 |

## 5. 人工检查

- **reduced-motion**：脚本 `reduced-motion = PASS`；区块在 reduced 下静态可见，无残留 `opacity: 0`。
- **键盘**：脚本 Tab 走查 `focus-visible = PASS`、`focus-hidden = PASS`；配合 `scroll-margin-top` 与即时滚动，焦点不被顶栏遮挡（未额外做人工手动 Tab 复述）。
- **390 宽度**：`ui-fit = PASS`、`right-edge = PASS`、`tab-wrap = PASS`，无横向滚动条；菜单按钮与主要控件 CSS 已设 ≥44px；AI dock 遮挡正文未单独采样。

## 6. 未做项与风险

- `docs/change-log.md`、`public/assets/css/app-v6.css`、`public/assets/js/motion.js`、`_backup\v5-*` 均不存在 → 无法按骨架核对「change-log 未做项」，也无本地备份。建议交给：项目负责人补 change-log 与备份流程。
- GATE 100 FAIL 中，**edge-left 42 + links 21 = 63 条属缩进设计/SPA hash 规则冲突**；`no-visual 2 / text-only 1 / cta 1 / moment-none 1 / off-grid 1` 属个人档案型首页规则冲突。建议交给：验收人/用户裁定，不宜由 C 盲改。
- 真实版式问题：`screen-height 5 / screen-short 2 / section-height 2 / hero-fold 1 / section-air 3 / one-section 3 / neighbour 1 / section-gaps 1`（区块未按整屏对齐、hero 仍差 20px、390 hero 756/844）。建议交给：阶段 C 版式专项。
- `card-layout 2 / split-pair 2 / assets 1 / nav 1`：卡片与图片资产问题。建议交给：阶段 C（图片专项）。
- perf：1440 传输 3.06 MB、字体 23 文件 1.23 MB、11 图缺 `width+height`、7 图自然宽 >2.2× 展示宽；390 字体请求 `fonts.googleapis.com` broken 导致 FCP/LCP 10s。建议交给：性能专项（字体自托管 + 图片 srcset/尺寸属性）。
- 服务在本轮中途停止过一次，已重启并重跑；若再跑长任务，建议先确认 `npm start` 存活。建议交给：执行人。
- Edge 降级下 consistency 曾多次 INCOMPLETE / layout `r.sections is not iterable`；已改用重跑结果，仍有探针不稳定风险。

## 7. 回滚

本次没有 `app-v6.css`、`motion.js` 或 `_backup\v5-*`（C 阶段直接改的是 `public/assets/css/app-v5.css` 与 `public/assets/js/app.js`）。实际回滚：

1. 从 `portfolio-v2-v5-source.zip` 或源码仓库提交 `3d95814` 取回 `public/assets/css/app-v5.css`、`public/assets/js/app.js`（及本次未改的 `index.html`、`ai-dock.js` 保持原样）。
2. 覆盖后执行 `npm run build`。
3. 本机无 `git`、无本地 `_backup`，回滚需手动取回文件；建议后续补一份 `_backup\v5-*`。

## 8. 证据

`shots\v6\`：
- 整页截图：`1440.png`（1440×6397，8 屏）、`1024.png`（1024×6049）、`768.png`（768×8535）、`390.png`（390×11058）
- 首屏：`first-1440.png`、`first-1024.png`、`first-820.png`、`first-768.png`、`first-390.png`
- 分段：`screen-1440-1..5.png`、`screen-1024-1..5.png`、`screen-768-1..5.png`、`screen-820-1..5.png`、`screen-390-1..5.png`

`shots\` 原始输出：
- `v6-gate.txt`（布防输出）、`v6-gate-verdict.txt`（GATE: FAIL 100）
- `v6-consistency.txt`（5 宽度 158/43）、`v6-consistency-390.txt`（390：49/12）
- `v6-layout.txt`（95 条发现）、`v6-perf.txt`（10 FAIL / 10 WARN）
