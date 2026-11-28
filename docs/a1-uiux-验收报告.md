# A1 点阵交互修订 · 验收报告

- 日期：2026-11-25
- 范围：首页点阵透镜 / 卡片禁区 / 彗尾 / 顶栏管理员入口
- 结论：本地静态站点与 `npm run build` 通过；A1 尚未部署，远端仍是 v6。
- 环境：Windows / Edge / 1440×900 与 390×844；测试机为 240Hz 高刷屏。

## 改了什么

只改以下 3 个文件，`app-v6.css`、`pointer-bus.js`、`app.js`、Focus、Glare、回顶参数均未改动。

### 1. `public/assets/js/dotfield.js`

- 新增 `LENS` 参数并锁定：
  - `radius 300` / `strength 1.35` / `gain 2.6` / `falloff 1.6`
  - `dotGrow 0.5` / `glowRadius 220` / `glowAlpha 0.18`
  - 点阵本体的 `gradientAngle`、`dotSpacing`、`dotRadius`、`pattern`、`baseOpacity` 未动。
- 新增 `LENS_OFF` 禁区清单，订阅 PointerBus 的 `target` 后用 `closest` 判断；命中卡片/面板/顶栏/页脚等区域时 `gateTarget=0`，否则 `1`。
- `gate` 使用时间归一化插值（`1 - 0.88^(dt/16.7)`），在 240Hz 下也接近 180ms；`gate<0.02` 且没有拖尾时只执行一次 `clearAndBase()` 并停止 rAF。
- 透镜透明度、位移、辉光 alpha、拖尾 alpha 均乘以 `gate`；位移改为 `pow(t,1.6)*bulge*spacing*2.6*gate`，点半径 `2*(1+0.5t)`，理论最大位移约 `1.35*12*2.6≈42.1px`。
- `holdToZoom` 的 `bulgeTarget` 改为 `2.2`；卡片区按住直接 return。
- 新增 0.5 倍分辨率离屏拖尾缓冲；`destination-out` 按真实时间归一，不随刷新率瞬间消失。
- 彗头半径 30（缓冲像素）；高速移动按 6px 步长补插值；指针静止 400ms 后连跑 10 帧只淡出不画头，然后清空；`pointerleave` 同样收尾。
- 性能降级链：平均帧时 >20ms 先关拖尾，再 `spacing=16` 并关辉光；静止后 rAF 归零。
- 调试钩子 `window.__a1TrailDebug` 已删除，未留在源码。

拖尾视觉参数最终为：彗头 alpha `0.22 / 0.08`，淡出基准 `0.88`。这是对施工单原值 `0.35 / 0.12 / 0.93` 的主动调低，原因见「未决」。

### 2. `public/index.html`

- 删除顶栏品牌右侧的 `.admin-entry` 整段（含 `<span>管理员登录</span>`）。
- 纯图标 `.admin-entry` 移入 `.bar-actions`，位于 `themeBtn` 之后、`menuBtn` 之前；SVG 改为 18×18，保留 `aria-label="管理员登录"` 和 `title`。
- 桌面端 `menuBtn` 隐藏，admin 成为最右；390 下 admin 位于汉堡左侧。

### 3. `public/assets/css/app-v5.css`

- `.admin-entry` 改为 44×44，`margin-left:6px`，取消 gap / padding / font-size / letter-spacing，透明边框与背景。
- 保留 hover / active / focus-visible 规则及浅色 hover；增加 `box-shadow: inset 0.5px 0 0 var(--line)` 作为与左侧图标的细分隔线。
- 删除 `@media (max-width:640px)` 中的 `.admin-entry span{display:none}`，保留 44px 宽度规则。
- 未改 `.v6-dotfield`、Focus `blur(6px)/opacity .55`、Glare `±3deg/0.32`、回顶尺寸与位置。

## 实测

| 验收项 | 结果 |
| --- | --- |
| 首屏 canvas | 存在，`data-dotfield` 正常 |
| `pointermove` 监听 | `pointermoveListeners=1` |
| 控制台错误 | desktop / mobile 均为 `none` |
| 透镜差异（600×580 区域） | `inside600=4.60`，半径外 `outside=0` |
| 卡片禁区 | 两次 `toDataURL` 完全一致；卡内 200×150 像素差均值 `0` |
| Focus / Glare 未回归 | Glare `true`；邻卡 `blur(6px)`、`opacity 0.55` |
| 彗尾 | 848px/s 横扫中途可看到向左渐隐尾迹；截图见证据 |
| 静止清尾 | 静止 1.3s 后无残留，canvas 与基线一致 |
| 10s 连续移动性能 | `n=2396`，`avg=4.17ms`，`p95=4.3`，`p99=4.3`，`max=4.4` |
| 静止 rAF | 1s 内新注册 `0` |
| 1440 顶栏 admin | `x=1296, y=13.5, w=44, h=44`；`textContent=""`、无 span、aria/title 均为「管理员登录」、SVG 18、桌面菜单隐藏、位于 `.bar-actions` 最右 |
| 390 顶栏 | admin `x=282,w=44,h=44`；menu `x=330,w=44,h=44`，不重叠；canvas=0、`data-dotfield=off`、`.site-grid display:block`、无横向溢出 |
| reduced-motion | canvas 存在，移动前后 dataURL 完全一致，透镜/拖尾未触发 |
| `npm start` | 本地服务正常，`/api/health` 200，`/assets/js/dotfield.js` 200 |
| `npm run build` | 通过，72 个文件、9.72MB，`dist` 已更新为 A1 版本 |

补充：10s 性能测试使用 240Hz 屏幕，`avg 4.17ms` 对应约 240fps；拖尾淡出按真实时间归一，避免高刷下尾巴瞬间消失。

## 证据

主截图目录：`_shots/a1/`

- `01-hero-lens.png`：首屏透镜最终态，边缘与中心位移明显。
- `01b-hero-strength0.png`：同位置 `strength=0` 对照，只剩辉光、无位移，用于证明差异来自透镜。
- `02-card-p1.png`：指针在首张项目卡左上角，卡内点阵静止。
- `03-card-p2.png`：指针在首张项目卡右下角，卡内点阵仍静止。
- `04-trail.png`：约 848px/s 横扫中途，彗尾可见；当前尾迹仍偏宽、偏亮，视觉未最终定稿。
- `04b-trail-idle.png`：静止 1.3s 后无残留。
- `05-topbar-1440.png`：桌面顶栏，admin 纯图标在最右。
- `06-topbar-390.png`：390 顶栏，admin 在汉堡左侧。
- `results.json`：最终测试 JSON，包含上述数值。

构建产物：`dist/`（72 文件 / 9.72MB），`dist/index.html`、`dist/assets/js/dotfield.js`、`dist/assets/css/app-v5.css` 均已更新。

## 回滚

改动前备份在：

`_backup/a1-20261125-1308/`

含 `index.html`、`dotfield.js`、`app-v5.css`、`app-v6.css` 四个文件。恢复并重新构建：

```powershell
Set-Location "C:\Users\sun\OneDrive\Desktop\实习\portfolio-v2"
Copy-Item "_backup\a1-20261125-1308\index.html" "public\index.html" -Force
Copy-Item "_backup\a1-20261125-1308\dotfield.js" "public\assets\js\dotfield.js" -Force
Copy-Item "_backup\a1-20261125-1308\app-v5.css" "public\assets\css\app-v5.css" -Force
Copy-Item "_backup\a1-20261125-1308\app-v6.css" "public\assets\css\app-v6.css" -Force
npm run build
```

A1 没有部署、没有推送源码；线上 `https://sunzhihaoai.top` 仍是 v6，因此回滚只需处理本地文件与 `dist`，不需要回滚远端。

## 未决

1. **拖尾数值偏离施工单**：施工单写 `0.35 / 0.12 / 0.93`，当前是 `0.22 / 0.08 / 0.88`。原因是原值在 240Hz 下呈一条很宽的高亮带，且尾迹拖到约 0.8s；调低后仍有 700px 左右的尾迹，截图中仍偏宽。是否需要继续收窄、恢复原值，请你拍板。
2. **透镜指标不是纯位移测量**：`inside600=4.60` 包含辉光贡献；半径外为 0，肉眼位移差明显，但没有单独测出 42px 的几何峰值。若需要严格像素峰值，需另写检测脚本。
3. **180ms 为时间归一等效**：`gate` 不是字面每帧减 0.12，而是按 60Hz 的 0.12 做时间归一；在 240Hz 下才接近 180ms，尚未做毫秒级计时采样。
