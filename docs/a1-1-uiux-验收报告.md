# A1.1 · 点阵手感返工验收报告

MODEL-HINT: 层=A1.1；负载=改手感；症状=无

## 改了什么

- **删除**：`trailCv` / `trailCtx` / `trailHas` / `trailQuiet` / `idleFade` 全部离屏拖尾状态；`clearAndBase()` 里的拖尾合成；`gate` / `gateTarget` / `gateStep` 整层淡出；`trailOn` 降级分支。
- **新增**：`FEEL` 振幅包络 + 弹簧主峰 + 2 个历史影子峰。
  - 起峰 `attackMs = 120`，回落 `releaseMs = 780`；指数逼近，误差 `<0.004` 归位。
  - 主峰中心：`followHz = 3.2`、`followZeta = 0.72`，按真实 `dt` 积分，内部 8ms 子步进。
  - 影子峰：`90ms / 0.42 / 0.92` 与 `190ms / 0.16 / 0.80`；`hist` 保留 260ms，按时间取最近点；刚入场没历史就只画主峰，不补假点。
- **禁区语义**：指针进入 `LENS_OFF`（作品卡、兴趣卡、工具卡、Focus、Glare、顶栏等）时，`ampTarget = 0`、`headLive = false`。主峰中心冻结在进入前的最后位置，振幅按 780ms 沉降；不再调用 `clearAndBase()` 立即抹掉。
- **重新入场**：指针与冻结中心距离 `>240px` 时直接落位并清空 `hist`；否则继续弹簧跟随。
- **亮度收敛**：点 alpha 采用绝对上限 `Math.min(0.22, alpha * (d.a / scale + 0.14 * maxT))`；辉光 `0.10`、半径 `240`，并随 `amp` 一起暗。
- **帧与降级**：帧循环条件 `ampAnim || headAnim || zoomAnim`；静止后 `clearAndBase()` 一次并停帧。降级链固定为「先删第二个影子峰（wakeCount=1）→ 再关辉光 → 最后 spacing=16 + rebuild」，`perfStage` 上限 3。
- **保留**：`LENS` 半径 300 / 强度 1.35 / 增益 2.6 / falloff 1.6 / dotGrow 0.5；`LENS_OFF`；`intro`；`holdToZoom`（`bulgeTarget = 2.2`）；`bake()`；resize / 主题 / 移动端 / reduced-motion。
- **未改**：`app-v6.css` 保持原样（16781B，`--dotfield-glow: #6366f1`）。施工单提到“外加两行变量”，但 A1.1 删除贴图拖尾后原文件已没有 `--dotfield-trail` 可改；不新增无用变量。顶栏管理员图标沿用上一版，本轮未碰。

## 实测

测试环境：本地 `http://localhost:8080`，Edge headless（Playwright），1440×900 / 390×844，外部字体 abort；数据与截图在 `_shots/a1-1/`。

1. **起峰**：空白处 `pointermove` 后约 120ms 读取 `amp = 0.9765`，`ampTarget = 1`，`headLive = true`，`frameActive = true`。满足“升得快”。
2. **回落**：进入作品卡后，主峰中心冻结在 `head = (37.1, 455.7)`；三张状态实际抓取时刻约 `237 / 506 / 905ms`，`amp = 0.4013 / 0.1415 / 0.0304`。900ms 时仍有余量但已基本压平，没有“第一帧消失”。
3. **禁区**：卡片中心 `elementFromPoint` 落在 `.v5-project-no`，`inCard = true`；Glare 仍为 `true`，邻卡仍 `blur(6px) / opacity 0.55`。
4. **尾迹**：指针以约 `802px/s` 横扫 700px（活跃 873ms，总 959ms，截图暂停 86ms）。扫过中段时三峰实测：
   - 主峰 `(621.3, 740)`，`r = 300`，`w = 1`
   - 影子 1 `(548.5, 740)`，`r = 276`，`w = 0.42`
   - 影子 2 `(465.4, 740)`，`r = 240`，`w = 0.16`
   - 主峰到最远影子峰 155.9px，与 `190ms × 802px/s ≈ 152px` 吻合；尾迹由点位移形成，不是离屏贴图。
5. **过曝**：canvas 600×460 区域按 `#090b0e` 合成后，`over240 = 0`（0%），`maxLuma = 66.3`，`avgLuma = 16.7`。白核过曝已消失。
6. **性能**：干净页面连续移动 10 秒，`n = 2391`，`avg 4.17ms`，`p95 4.3ms`，`p99 4.3ms`，`max 4.4ms`；均低于 12/20ms 目标。
7. **静止**：空白处 2.5 秒后 `amp = 0`、`frameActive = false`、canvas 与静态基线一致、`idleRaf1s = 0`。
8. **回归**：`pointermove` 监听仍为 1 个；桌面/mobile 报错均为 none；390 宽度下 admin 在 `x=282`、44×44，menu 在 `x=330`、44×44，不重叠；`canvas = 0`、`data-dotfield = off`、`.site-grid display: block`、无横向溢出；`prefers-reduced-motion` 下 canvas 存在且移动前后 dataURL 完全一致。

截图：`_shots/a1-1/01-rise.png`、`02-settle-200.png`、`03-settle-500.png`、`04-settle-900.png`、`05-wake.png`、`06-idle-clean.png`；数据：`_shots/a1-1/results.json`。

**视觉备注**：全页看透镜仍偏弱；裁图能看清点被推开、中心形成暗洞/边缘密环。`05-wake` 的尾巴已由点位移形成，但在 802px/s 下偏窄偏弱，是否再增强需你拍板。

## 回滚

从 `_backup/a1-1-20261125-1351/` 还原（备份在改代码前生成，`dotfield.js 17767B`、`app-v6.css 16781B`）：

```powershell
Set-Location "C:\Users\sun\OneDrive\Desktop\实习\portfolio-v2"
Copy-Item _backup\a1-1-20261125-1351\dotfield.js public\assets\js\dotfield.js -Force
Copy-Item _backup\a1-1-20261125-1351\app-v6.css public\assets\css\app-v6.css -Force
npm run build
```

如需回到 A1（不是 A1.1），用 `_backup/a1-20261125-1308/` 四文件还原后重新 `npm run build`。

## 构建与发布状态

- A1.1 已执行 `npm run build`：`dist` 72 文件 / 9.72MB（10,190,148B），`dist/assets/js/dotfield.js` 已含 `FEEL` 的 `attackMs 120 / releaseMs 780 / followHz 3.2 / followZeta 0.72`，不含 `trailCv` / `gateStep` / `idleFade`。
- 未部署、未推 GitHub/Gitee；远端仍是 v6。
