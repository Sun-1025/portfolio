# v6 UI/UX 三合一 · 验收报告

日期：2026-11-25  
范围：P1 动态点阵背景 DotField、P2 圆形回到顶部、P3 Tooltip / Focus Cards / Glare，以及 reduced-motion、触屏与性能降级。  
结论：代码完成，本地 Edge 实测通过；`dist` 已按最终源码重建。**尚未部署 GitHub Pages、尚未推送源码。**

## 1. 落地内容

- **P1 DotField**：新增 `public/assets/js/dotfield.js`。固定 Canvas 层、DPR≤2、离屏静态层烘焙；按 218° 梯度计算点亮度；透镜区每帧重置后按径向位移重绘，保留底图 + 轻量重影，避免叠帧累积；intro 400ms；长按 500ms 将 bulge 0.6 拉到 1.2；静止 500ms 停帧；`data-theme` 变化重烘；移动端/触屏不挂载并恢复 `.site-grid`；reduced-motion 只画静态点阵；连续 3 秒平均帧时 >20ms 时把 spacing 改为 16、关闭辉光并打印 `[dotfield] degraded`。
- **P2 回到顶部**：新增 `public/assets/js/backtop.js`。`.pf-top` 50px 圆形，`scrollY>600` 显形，平滑回顶，键盘可触发；hover 展开 140px 胶囊，`Back to Top` 保持英文；Uiverse 归属注释保留；触屏不展开。
- **P3 三层交互**：新增 `public/assets/js/ui-fx.js`。
  - Tooltip：页脚四头像胶囊、项目 chip 与详情页 `.v5-skill` 标签；跟随 PointerBus 横向移动，邻位让位，触屏点按 2s 自动收起。
  - Focus：仅项目网格与兴趣网格；hover 卡片清晰，同组其余 `blur(6px) + opacity .55`；390/触屏完全不模糊。
  - Glare：仅 `.v5-project-card` 封面与 `.v5-interest-cover`；倾斜上限 ±3deg；hover 时写入 `--gx/--gy/--rx/--ry`；背景图与数字编号层级不冲突。
- **指针总线**：新增 `public/assets/js/pointer-bus.js`。全站唯一 `window pointermove`，rAF 合并广播，静止 500ms 停 rAF 并发 idle；`pointerleave/blur` 广播 `x=-9999`。
- **旧光标改造**：`pointer.js` 删除独立 `pointermove`，改为订阅 PointerBus；光标与探针循环按需启停；原点击/读数/tooltip/竖括号逻辑保留。
- **内容挂载**：`app.js` 增加 chips 说明、项目/兴趣 Focus+Glare 类、页脚头像组；`index.html` 按 `pointer-bus → app → pointer → dotfield → backtop → ui-fx` 顺序加载；`app-v6.css` 追加所需样式。另把可见联系信息里的邮箱改为“点击发送”，并同步给静态留言提示与 AI 助手联系提示脱敏。
- **头像素材**：`sharp` 从站内真实照片裁 88×88 WebP 至 `public/uploads/avatars/`，四张均避开正脸。

## 2. 参数与观感取舍

- 施工单参数全部保留在 `CONFIG`：`dotRadius 2`、`dotSpacing 12`、`cursorRadius 240`、`bulgeStrength 0.6`、`glowRadius 160`、`glowColor #6366f1`、`gradientAngle 218`、`glowIntensity 0.8`、`baseOpacity 0.55`、`interactive/holdToZoom/intro true`、`lightMode false`。
- 实际点亮度按可读性压到 `0.05 + 0.17t`（参数表 32%→100% 仅作为梯度形状保留）；辉光 alpha 为 `glowIntensity × 0.10`；浅色点色 `rgb(32,36,42)`、alpha scale `0.38`。原因是 12px 间距在 1440/2K 画布上非常密，按原亮度会压过正文与卡片。
- Glare 的 `::after` 最高 `opacity .32`，径向高光 `rgba(255,255,255,.42)`，低于施工单 0.38 上限；默认不显示，只在 hover 出现。
- `glowColor` 默认保留 `#6366f1`；同时修正了 `rgba()` 形式的 CSS 变量解析（此前会把 alpha 一起透传，导致 accent 变实心圆盘）。对比图见 `09-glow-indigo.png` / `10-glow-accent.png`。

## 3. 关键文件

新增：
- `public/assets/js/pointer-bus.js`
- `public/assets/js/dotfield.js`
- `public/assets/js/backtop.js`
- `public/assets/js/ui-fx.js`
- `public/uploads/avatars/school.webp`、`kexie.webp`、`physics.webp`、`cycling.webp`

修改：
- `public/assets/js/pointer.js`
- `public/assets/js/app.js`
- `public/assets/js/ai-dock.js`（联系提示脱敏）
- `public/assets/css/app-v6.css`
- `public/index.html`
- `sync/push-source.ps1`（放行 `public/uploads/avatars/`，并加入本报告）

备份：
- `_backup/v6-uiux-20261125-0858/`：`index.html`、`app-v5.css`、`app.js`、`ai-dock.js`

构建：
- `dist/` 已于最终源码后重建：72 个文件、9.72 MB；`dist/uploads/avatars/` 四张头像齐全。

## 4. 浏览器验收

环境：Windows / Edge，1440×1000 与 390×844；外部字体请求 abort；Playwright 驱动。

桌面：
- `canvas=1`、`.site-grid display:none`、`cursor=1`、`.pf-top=1`、头像 4、Focus 组 2、Glare 封面 10。
- Focus：另一张项目卡 `filter=blur(6px)`、`opacity=.55`；兴趣页同样生效。
- Glare：`is-glare=true`、`--gx=51.00%`、`::after opacity=.32`；封面倾斜生效。
- 回顶：顶部隐藏；滚动后 `is-on`；hover 宽 140px，`::before` 内容 `"Back to Top"`；点击/键盘回车均回顶。
- 头像 tip 文本为“孙志昊 | 山东石油化工学院 | 2025 级 · 物联网工程”，不含 `@` / 微信号；跟随 PointerBus 移动。
- chip tip 文本为“HTML / CSS · 用在《个人主页》：页面结构与响应式样式”。
- 控制台无 JS pageerror；仅外部字体请求被主动 abort。

移动/触屏：
- `canvas=0`、`data-dotfield=off`、`.site-grid display:block`、横向溢出 0。
- Focus 不模糊（`filter:none`）。
- `.pf-top` 50×50 @ `(324,706)`；`.ai-fab` 52×52 @ `(322,775.25)`；间距 19.25px，不重叠。
- 触屏点按头像后 tip 显示，2.1s 后自动收起。
- 无 pageerror。

reduced-motion：
- Canvas 存在且只画静态点阵；移动鼠标前后 `canvas.toDataURL()` 完全一致。
- Glare 不倾斜（`transform:none`），静态对角光 `opacity=.08`。

降级：
- 用 24ms 延迟包装 `requestAnimationFrame`，连续移动 5s，控制台出现 `[dotfield] degraded`；`data-dotfield` 仍为 `on`。

隐私：
- 页脚与关于侧邮箱显示改为“邮箱 · 点击发送 / 点击发送”，`mailto:` href 仍可点击；页脚联系行同理。留言静态提示与 AI 助手的联系提示也不再输出邮箱明文。
- 桌面与移动正文 `innerText` 均不再包含 `1322816531@qq.com` 与 `chgh740905`。QQ 号仍按原联系行显示。
- `dist` 静态构建冒烟：72 文件 / 9.72 MB；canvas、回顶按钮、4 个头像均存在；控制台无 pageerror；正文无邮箱明文。

## 5. 性能

| 指标 | DPR 1 | DPR 2 |
|---|---|---|
| 采样帧数 | 3748 | 3848 |
| 平均帧时 | 2.14 ms | 2.08 ms |
| P95 | 4.2 ms | 4.2 ms |
| P99 | 4.3 ms | 4.3 ms |
| 最长帧 | 120.9 ms（单次调度尖峰） | 4.4 ms |
| 静止 1s rAF 增量 | 0 | 0 |
| `window pointermove` 监听 | 1 | 1 |

说明：DPR1 的 120.9ms 是单次浏览器调度异常，P99 仍为 4.3ms，未出现连续 3 秒 >20ms；DPR2 全程最长帧 4.4ms。三次运行结果一致。新增 JS gzip 合计约 8.1 KB（pointer-bus 0.9、dotfield 3.7、backtop 0.9、ui-fx 2.3），`app-v6.css` gzip 4.6 KB，均在预算内。

## 6. Lint / 结构检查

- `copy-lint.mjs public/index.html --kind software`：`0 FAIL, 0 WARN`。注意页面正文由 JS 从 `data/site.json` 渲染，脚本只看到 7 个静态词，结果不能替代正文文案复核。
- `consistency.mjs http://localhost:8080/ --quick --widths 1440,390 --rhythm-widths 1440,390`：
  - 首屏 1440/1280/1152/1024/896/768：`0 FAIL 0 WARN`；320×640 边界遍历：`0 FAIL`。
  - 全页汇总：`61 FAIL / 21 WARN`。失败集中在 taste-skill 2.5 的“公司站一屏一节 / 每节必须有视觉 / 页脚 split-pair / hash 路由 links”等结构性规则，与既有人作品集的信息架构冲突，不是 P1–P3 引入的组件缺陷。
  - 与本阶段直接相关的检查均为 PASS：`nav-covers`、`overlap-text`、`tap-size`、`collide`、`off-viewport`、`hidden-visual`、`a11y-name`、`img-alt`、`focus-visible`、`motion-layer`。`reduced-motion` 在该 quick 模式 SKIP，已用单独浏览器测试覆盖。
  - 建议将站点级 consistency 清理单独立项；本轮不以它作为 P1–P3 的通过门槛。

## 7. 截图清单

目录：`shots/v6-uiux/`

- `01-hero-dotfield.png`：1440 首屏 + 活动透镜
- `01b-hero-idle.png`：指针移开后静止点阵
- `02-focus-glare.png`：项目卡 Focus + 封面 Glare
- `02b-interest-glare.png`：兴趣卡 Focus
- `03-backtop-hover.png`：回顶按钮 hover 140px 胶囊
- `03b-backtop-default.png`：回顶默认 50px 圆形
- `04-avatar-tooltip.png`：页脚头像胶囊（邮箱已脱敏）
- `05-light-top.png`：浅色首屏
- `05b-light-top-hover.png`：浅色回顶 hover
- `06-mobile-390.png`：390 首屏（无 canvas、无横向溢出）
- `07-mobile-avatar-tip.png`：390 触屏头像 tip
- `08-chip-tooltip.png`：项目 chip tip
- `09-glow-indigo.png` / `10-glow-accent.png`：同机位 `#6366f1` 与 accent 对比
- `11-reduced-motion.png`：reduced-motion 静态点阵
- `12-keyboard-focus.png`：键盘 Focus 态

## 8. 待拍板 / 已知边界

1. **glowColor**：默认 `#6366f1`（与站点冷灰紫玻璃更协调）；accent `rgba(215,255,79,.8)` 更贴品牌色，但对比图中偏黄绿。建议保留默认，若想统一品牌再切 accent。
2. **浅色主题**：DotField 保留，但透明度很低；如果觉得多余，可以在 `html[data-theme="light"]` 下直接关闭 canvas、恢复 `.site-grid`。
3. **点阵亮度**：当前是“可读性压低版”。若要严格按施工单 32%→100%，把 `lum` 一行改回即可，但会明显更吵。
4. **邮箱脱敏**：为满足施工单隐私红线，页脚/关于侧不再显示明文邮箱；QQ 号未脱敏。若更看重直接联系，可恢复 `esc(email.value)`。
5. **未发布**：远端 Pages 仍是旧版本；`dist` 已就绪，等确认后再跑 `sync/deploy-v6-pages.ps1` 与 `sync/push-source.ps1`。

## 9. 回滚

1. 用 `_backup/v6-uiux-20261125-0858/` 覆盖 `public/index.html`、`public/assets/js/app.js`、`public/assets/js/ai-dock.js`（`app-v5.css` 本轮未改，可按需保留）。
2. 删除 `public/assets/js/pointer-bus.js`、`dotfield.js`、`backtop.js`、`ui-fx.js`，以及 `public/uploads/avatars/`。
3. 从 `app-v6.css` 删除 `P1/P2/P3/头像 tooltip` 追加段；`app.js` 去掉 chips/Focus/Glare/头像组；`index.html` 去掉四个模块标签。
4. 重新 `npm run build`。

无新增 npm 依赖，`package.json` / `package-lock.json` 未变。
