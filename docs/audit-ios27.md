# iOS 27 日间玻璃巡检记录

日期：2026-11-23  
范围：`portfolio-v2` 主站，浅色 / 日间模式新增玻璃；深色 / 夜间模式回退 v4 原始视觉。  
结论：浅色玻璃、深色原版、三个断点、五个路由、主题切换、移动抽屉、AI 面板均通过结构检查；未部署上线。

## 1. 改动边界

| 文件 | 改动 | 说明 |
|---|---|---|
| `public/assets/css/app-ios27.css` | 新增 | 所有规则作用域 `html[data-theme="light"][data-glass="ios27"]`，深色无任何覆盖 |
| `public/index.html` | 2 处 | `<html data-glass="ios27">` + `<link app-ios27.css>`，放在 v4 之后 |
| `public/assets/js/app.js` / `ai-dock.js` | 未改 | 路由、主题、AI、工具交互原样 |
| `public/data/site.json` | 未改 | 文案、项目、工具、CMS 数据原样 |
| `public/classic/` / `admin/` | 未接 | 经典版与后台保持原样，仍是 v4 视觉 |

没有新增图片、图标、字体或 JS；没有改字号、行高、导航高度、按钮尺寸、栅格间距。

## 2. 断点与路由矩阵

### 1920 × 1080

| 场景 | 主题 | topbar | overflowX | JS/4xx | blur 层 |
|---|---|---:|---|---|---:|
| 首页 | 深色原版 | 72px | false | 0 | 5 |
| 首页，切到浅色 | 浅色玻璃 | 72px | false | 0 | 14 |
| 再切回深色 | 深色原版 | 72px | false | 0 | — |

### 1440 × 1000

| 路由 | 深色 topbar / blur | 浅色 topbar / blur | overflowX | 错误 |
|---|---|---|---|---|
| `#/` 首页 | 72px / 5 | 72px / 14 | false | 0 |
| `#/work` 项目 | 72px / 1 | 72px / 13 | false | 0 |
| `#/work/:id` 详情 | 72px / 2 | 72px / 6 | false | 0 |
| `#/tools` 工具 | 72px / 1 | 72px / 7 | false | 0 |
| `#/tools/:id` 工具详情 | 72px / — | 72px / — | false | 0 |

工具详情另在 1440 / 390 × 深浅四个组合复测：topbar 仍为 72 / 62px，`overflowX=false`，无 JS/4xx；浅色工具面板为 `.68` tint + `22px` 模糊，深色为 v4 实色面板，两者布局尺寸一致。

1440 浅色详情 `detail-meta` 为 `1301.8 × 80.9`，与 v4 的四列 strip 尺寸一致；只把每格材质换成玻璃，`gap` 仍为 `1px`。

### 390 × 844（Chromium viewport 仿真）

| 场景 | 主题 | topbar | overflowX | blur 层 | AI 面板 | 抽屉 |
|---|---|---:|---|---:|---|---|
| 首页 | 深色原版 | 62px | false | 5 | — | — |
| 移动菜单 | 深色原版 | 62px | false | 5 | — | `358 × 244.6` @ `x16 y70` |
| AI 面板 | 深色原版 | 62px | false | 1 | `390 × 392.4` | — |
| 首页 | 浅色玻璃 | 62px | false | 14 | — | — |
| 移动菜单 | 浅色玻璃 | 62px | false | 14 | — | `358 × 244.6` @ `x16 y70` |
| AI 面板 | 浅色玻璃 | 62px | false | 13 | `390 × 393.4` | — |

浅色 AI 面板比深色高 1px，来自浮层 tint 下的 0.5px 边框取整，不是布局变化。

## 3. 移动抽屉

浅色 390 抽屉打开时：

- 父级 `.topbar` 的 `backdrop-filter` 被 `:has(.nav.is-open)` 临时置为 `none`，否则父级会成为 backdrop root，抽屉几乎不模糊。
- 抽屉自身 `blur(22px) saturate(1.38)`，底色 `rgba(255,255,255,.78)`。
- 抽屉矩形 `358 × 244.6`，位置 `x=16, y=70`，与 v4 导航下拉几何一致。
- 关闭后 topbar 恢复玻璃，无 JS 介入。

## 4. 深色原版回归

用 Playwright 在 `dist` 深色下截 1920 首页，与 v4 静态包基线 `qa/dist-home-1080.png` 做像素 diff：

| 指标 | 结果 |
|---|---|
| 平均绝对差 | `1.09 / 255` |
| 差异 > 8 的像素 | `0.6%` |
| 差异 > 32 的像素 | `0.26%` |

差异集中在时钟、AI 轨道动画等动态内容，静态结构、颜色、圆角、边框与 v4 基线一致。深色 1440 同样回到方角 Hero 控制台、原始 topbar，无玻璃圆角与白色描边。

真实 Edge 深色 1920 / 1440 截图见：

- `qa/ios27/agent-final-1920-dark.png`
- `qa/ios27/agent-final-1440-dark.png`

## 5. 真实浏览器验证

用 `agent-desktop` 接管本机 Edge：

| 窗口 | 截图 | 结果 |
|---|---|---|
| 1920 最大化，浅色 | `qa/ios27/agent-final-1920-light.png` | 玻璃导航、Hero 控制台、AI 浮标正常，无横向滚动 |
| 1920 最大化，深色 | `qa/ios27/agent-final-1920-dark.png` | v4 原版，无玻璃 |
| 1440，浅色 | `qa/ios27/agent-final-1440-light.png` | 布局与 1920 一致，栅格不跳 |
| 1440，深色 | `qa/ios27/agent-final-1440-dark.png` | v4 原版 |

Windows Edge 最小外框宽度约 `521px`，无法把真实窗口压到 `390px`。390 截图全部由 Chromium `390 × 844` viewport 仿真完成，已检查：

- `qa/ios27/final-home-390-light.png`
- `qa/ios27/final-menu-390-light.png`
- `qa/ios27/final-ai-390-light.png`
- 对应 `-dark` 版本

## 6. 可访问性对比

浅色玻璃按 `#FAFBF8` 合成，AI 浮层按最不利的纯黑背景上的 `#DBDBDB` 合成。WCAG AA 正文要求 4.5:1，大字号要求 3:1。

| 前景 | 浅色玻璃 | 深色原版 |
|---|---:|---:|
| `--ink` | 18.42 | 16.33 |
| `--ink-2` | 7.68 | 9.93 |
| `--muted` | 5.17 | 4.68 |
| accent 小号文字 | 5.46 | 15.75 |
| `--accent-2` 小号文字 | 4.68 | 13.65 |
| 白字 / `#557000` 实心 | 5.37 | — |
| AI 浮层 `--muted` | 4.89 | — |
| AI 浮层 accent 文字 | 4.85 | — |
| AI 浮层 `--accent-2` | 5.00 | — |

`--muted` 在浅色页面底 `#EFF2E8` 上为 `4.74:1`，仍过 AA；浅色 accent 小号文字在页面底上为 `5.00:1`。浅色为达标只调了文字色与实心填充色：`--muted:#5f6e66`、小号 accent `#557000`、实心按钮 `#557000`；品牌 lime `#698900` 仍留给大标题、描边、光晕和装饰线。

## 7. 性能冒烟

1920 深色、headless Edge、连续 rAF 90 帧：

| 指标 | 值 |
|---|---:|
| 平均帧间隔 | 4.12ms |
| p95 | 4.3ms |
| max | 4.3ms |
| 长卡顿 | 无 |

这是 headless 环境的调度冒烟，不是真实 GPU 帧率结论。玻璃层没有新增动画，也没有对 `backdrop-filter` 做过渡，实际移动端风险主要在同时存在多层 blur 的页面；当前浅色最多 14 层，均为单层容器，无嵌套。

## 8. 遗留与待确认

1. **真实 390 窗口不可测**：Windows Edge 最小外框约 521px；390 结论来自 Chromium viewport 仿真，不是真实移动设备。若要真机结论，需要 iPhone/Android 实机或 DevTools 设备模式。
2. **经典版与后台未接玻璃**：`public/classic/` 与 `admin/` 仍是 v4 原样。若“全站”要包含这两个入口，需要另加 `<link>` 与作用域，属于额外改动。
3. **0.5px 在 DPR1 会取整为 1px**：源码保持 `0.5px`，视觉细边主要靠内白边与顶部柔光；若要求 DPR1 也严格半像素，需要改伪元素渐变 hairline，属于额外实现。
4. **grouped list 形态待验收**：当前项目/实践/兴趣各是一张玻璃容器，内部用分隔线，以严格保持行高和文字坐标；若希望每个项目单独一张玻璃卡，需要改容器与行结构，间距会变。
5. **未部署**：`dist` 已构建，`sync/deploy-api.ps1` 已加入 `app-ios27.css`，但尚未执行任何 Git / GitHub / Gitee 推送。线上 `https://sunzhihaoai.top` 仍是旧版。

## 9. 产物位置

- 样式：`public/assets/css/app-ios27.css`
- 页面：`public/index.html`
- 静态包：`dist/`
- 指标：`qa/ios27/ios27-final-metrics.json`
- 截图：`qa/ios27/final-*`、`agent-final-*`、`lists-top-*`、`hero-console-*`、`dark-original-1920.png`
- 旧基线：`qa/dist-*.png`（v4 静态包，仍可用于深色回归）
