# A2 · Threads 背景替换验收报告

施工单：`A2 · Threads 全面替换 DotField（A1 基线 / 全屏可交互 / 浅色深线）`
项目：`C:\Users\sun\OneDrive\Desktop\实习\portfolio-v2`
本地地址：`http://localhost:8080`
完成时间：2026-11-25

## 完成

- 删除 `public/assets/js/dotfield.js`；A2 备份 `_backup/a2-20261125-1732/dotfield.js` 仅作回滚，不恢复为备选。
- 新增 `public/assets/js/threads.js`（原生 ESM，零依赖，WebGL2；public 约 22.5KB，dist 压缩后 14,263B）。
  - 三段 GLSL `LINE_VERTEX` / `LINE_FRAGMENT` / `SCREEN_VERTEX` / `SCREEN_FRAGMENT` 原样保留。
  - `MAX_RENDER_DIM` 语义保留（默认 1920；移动端 1280；降级 1440）。
  - `buildStrip` 的 `clamp(round(width/3), 96, 640)`、`uCurve = 2 / brightness`、`blendFunc(ONE, ONE_MINUS_SRC_ALPHA)` 未改。
  - React `useRef` 改为模块闭包；导出 `mountThreads()` / `unmountThreads()`，自动挂载。
- 参数 20 项按施工单表：`color #ffffff`、`accentColor` 未设置、`lineCount 90`、`thickness .6`、`softness 1.3`、`amplitude 1.7`、`distance .4`、`waves 1.05`、`speed .6`、`split .04`、`fray .5`、`angle 25`、`taper .85`、`brightness 1.4`、`parting 0`、`enableMouseInteraction true`、`fade 0`、`opacity 1`、`seed 0`、`paused false`。
- `public/index.html`：`/assets/js/dotfield.js` → `/assets/js/threads.js`；未保留旧 canvas。
- `public/assets/css/app-v6.css`：`.v6-dotfield` 段替换为 `.v6-threads` / `.v6-threads-canvas` / `html[data-bg="threads"] .site-grid`；`html[data-dotfield="on"]` 已删。
- 交互：全屏跟随，无 `FREEZE_ZONES`、无 `closest` 判断、无遮罩/冻结；指针只经 `PointerBus.subscribe`，`p.x === -9999` 视为离开；`pointerleave` / `blur` 用 260ms 时间常数向 `[.5,.5]` 逼近（约 780ms 收敛）；跟随 `follow = 1 - exp(-dt*2.2)`（原 3，约 450ms）。
- 主题：深色 `#ffffff / brightness 1.4`；浅色 `#1c1c1e / brightness 1.0`；`opacity` 均为 1；`MutationObserver` 监听 `data-theme` 后重设 uniform 并 `render()`。
- 降级：`getContext('webgl2')` 或 shader 失败时 `data-bg=fallback`，移除 `.v6-threads`，恢复 `.site-grid`，只输出 `[threads] fallback: no webgl2`，不报红。
- 主题/尺寸：移动端 <768 挂载但降档（`lineCount 48`、`renderDim 1280`、30fps、`enableMouseInteraction false`）；`prefers-reduced-motion` 只渲染静态帧；`document.hidden` 停 rAF。
- 代码区 `dotfield` / `v6-dotfield` / `--dotfield-glow` / `--dotfield-trail` 零残留；`app.js`、`ai-dock.js`、`ui-fx.js` 均无引用。历史 docs、`_backup`、旧 sync 日志仍保留历史字样，不属于运行代码。
- `npm run build` 通过：72 文件 / 9.73MB；`dist/index.html` 指向 `/assets/js/threads.js`，`dist/assets/js/threads.js` 存在，`dist/assets/css/app-v6.css` 已含 `.v6-threads`。

### 需要你知道的一处追加样式

为满足施工单 §6 与 §10.4 的「卡面必须看得见」，在 `app-v6.css` 末尾对 `threads` 模式追加了 scoped hover 规则：

```css
html[data-bg="threads"] .v5-project-card:hover,
html[data-bg="threads"] .v5-practice:hover,
html[data-bg="threads"] .v5-interest-card:hover,
html[data-bg="threads"] .v5-tool-card:hover {
  background: var(--glass-tint);
  -webkit-backdrop-filter: blur(2px) saturate(1.35);
  backdrop-filter: blur(2px) saturate(1.35);
}
```

原因：卡片 hover 原本会升到 `--glass-strong .86`，且 `backdrop-filter: blur(22px)` 会把 1px 线束糊平；实测 22px 下卡面看不到线，背景 .72 也不够。改为 `--glass-tint` + 2px 背模糊后，卡内可见线束（证据见 `06-card-left/right`）。没有改 token、没有改默认卡面，但这确实改动了卡片的 hover 背模糊，超出「只动背景层」的字面边界，需你确认是否接受；不接受可只回滚这几行，卡面线束会重新变得不可见。

## 实测

测试环境：Edge + Playwright core，视口 1440×900，DPR 1；本地 `node` 服务。

| 项目 | 结果 |
| --- | --- |
| 首屏 | `data-bg=threads`；canvas CSS 1440×900；`.site-grid display:none`；`pointermove` 监听数 **1**；控制台 errors `[]` |
| 跟随延迟 | 截图实际时间 **0 / 304 / 904ms**（文件按 0/300/900 命名）；`state.mouse.x` = 0.4251 / 0.5972 / 0.7295，target 0.7778；约 450ms 内追到目标附近，停住后无抖动 |
| 卡面 | 第四张项目卡 `C语言图书管理系统`，rect `left 734.57 / top 501.28 / 600.85×285.28`；指针左/右相差 400px；`targetMouse.x` 0.5587 / 0.8365，两处 `inside=true`；左右截图整页灰阶平均差 **12.50** |
| 浅色 | `data-theme=light`、`data-bg=threads`、`settings.color #1c1c1e`、`brightness 1.0`；无 errors |
| 隐藏停帧 | 隐藏前 frames 1348，隐藏 500ms 后仍 1348，`rafActive=false`；恢复可见后 frames 1421，`rafActive=true` |
| 60s 桌面 | 14,402 个 rAF 间隔：avg 4.166ms / p95 4.3 / p99 4.4 / **max 7.7ms**；渲染耗时 avg 0.0318ms / max 0.3ms；无降级触发 `degradeLog=[]` |
| 390×844 | `lineCount 48`、`renderDim 1280`、`fpsCap 33`、`enableMouseInteraction=false`；10s 内 320 帧（约 32fps）；渲染耗时 avg 0.0684ms / max 0.2ms；无横向溢出 |
| fallback | `bg=fallback`、无 `.v6-threads`、`.site-grid display:block`、`stats=null`；仅 info `[threads] fallback: no webgl2`，无 errors |
| reduced-motion | `paused=true`、`rafActive=false`、`frames=0`、errors `[]` |
| 回归 | Glare 在 `.v5-project-media` 上正常加 `is-glare`；头像 Tooltip `v6-avatar-tip is-on`；回到顶部 `pf-top is-on`；`/classic` 200、`/admin` 200；主页面 `pointermove` 监听仍为 1 |
| 对比度 | 深色 hero：文字 `#edf2f6`，相邻背景截图采样均值 `rgb(12,14,18)`，**17.14:1**；浅色 hero：文字 `#111820`，背景均值 `rgb(238,241,243)`，**15.75:1** |
| 构建 | `npm run build` 通过；72 文件 / 9.73MB；dist 中 `threads.js` 与 `.v6-threads` 规则已落盘 |

说明：

- 浅色实际 `brightness = 1.0`，按施工单 §7 的明确要求；报告模板写的 `1.05` 未采用，避免把浅底深线再压暗。
- 60s 测试未触发降级链；`lineCount 90 → 64`、`renderDim 1920 → 1440`、30fps 封顶均未记录触发时间点，因此 `degradeLog` 为空。
- 移动端仅模拟 390×844 的桌面浏览器视口，不是真机触屏；`hover:none` 的 PointerBus 输入忽略逻辑在代码中已处理。
- `06-card-freeze.png` 是右侧同一指针位置晚约 0.9s 的第二帧，用于证明卡片内背景没有冻结，不是另一个冻结状态；文件名沿用施工单模板。

## 证据

- `_shots/a2/01-hero.png`：1440×900 深色首屏，线束从左上斜入，`split 0.04` 后开始分离，外围线 `taper 0.85` 递减。
- `_shots/a2/02-lines-closeup.png`：线束局部裁图 1350×930。
- `_shots/a2/03-lag-0.png`、`04-lag-300.png`、`05-lag-900.png`：跟随三帧，实际 0 / 304 / 904ms。
- `_shots/a2/06-card-left.png`、`06-card-right.png`：第四张项目卡内指针左/右 400px，线束在卡面下可见且随指针移动。
- `_shots/a2/06-card-freeze.png`：同位置晚 0.9s 的第二帧，线束继续运动。
- `_shots/a2/07-light.png`：浅色主题，深色线束，1440×900。
- `_shots/a2/08-390.png`：390×844，48 线，无横向溢出。
- `_shots/a2/09-fallback.png`：WebGL2 不可用，`.site-grid` 恢复显示。
- `_shots/a2/results.json`：本轮测试原始数据。

## 回滚

1. 从 `_backup/a2-20261125-1732/index.html`、`_backup/a2-20261125-1732/app-v6.css` 还原到 `public/`。
2. 删除 `public/assets/js/threads.js`。
3. `dotfield.js` 不恢复（A2 回滚目标是回到 A1 基线，不是回到 A1.1）。
4. `npm run build` 重新生成 `dist`。

回滚后运行代码不再包含 Threads，`.site-grid` 与旧 A1 背景依赖会按备份恢复。
