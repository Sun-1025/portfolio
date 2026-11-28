# iOS 27 日间玻璃材质说明

版本：2026-11-23  
适用范围：**仅浅色 / 日间模式**。深色 / 夜间模式保持 v4 原始 Signal 控制台视觉，不套用本材质。  
样式文件：`public/assets/css/app-ios27.css`  
页面钩子：`<html data-glass="ios27">`，加载顺序 `tailwind.css → app.css → app-v4.css → app-ios27.css`。

## 1. 材质参数

所有参数集中在该文件顶部的 `html[data-theme="light"][data-glass="ios27"]` 里，改这里即可全站生效。

| Token | 值 | 用途 |
|---|---|---|
| `--ios27-blur` | `22px` | 全站统一背景模糊半径 |
| `--ios27-saturate` | `138%` | 保留背景色彩，不发灰 |
| `--ios27-brightness` | `1.01` | 轻微提亮，避免玻璃糊成实色 |
| `--ios27-tint` | `rgba(255,255,255,.68)` | 导航、卡片、列表、工具面板、Hero 控制台主材质 |
| `--ios27-tint-raised` | `.78` | 导航滚动态、抽屉、悬停态 |
| `--ios27-tint-float` | `.86` | AI 助手浮层（需要压在任意深色封面之上） |
| `--ios27-tint-soft` | `.56` | 次级按钮、导航激活底、小面积高光 |
| `--ios27-tint-faint` | `.44` | 标签、输入框、分隔条、极小面积控件 |
| `--ios27-edge` | `rgba(255,255,255,.55)` | 0.5px 外描边 |
| `--ios27-edge-strong` | `rgba(255,255,255,.78)` | 悬停/滚动态外描边 |
| `--ios27-separator` | `rgba(16,24,19,.12)` | 列表行分隔线 |
| `--ios27-inner` | `rgba(255,255,255,.72)` | `inset 0 0 0 .5px` 内白边 |
| `--ios27-inner-top` | `rgba(255,255,255,.9)` | 顶部 1px 柔光 |
| `--ios27-outer-hairline` | `rgba(16,24,19,.07)` | 最外层极细暗边，防止白玻璃融进白底 |
| `--ios27-shadow` | `0 1px 2px rgba(20,30,24,.04), 0 12px 30px rgba(20,30,24,.08)` | 轻落影，不使用厚重黑阴影 |
| `--ios27-shadow-hover` | `0 2px 6px …05, 0 18px 42px …10` | 悬停落影 |
| `--ios27-fallback` | `rgba(252,251,246,.95)` | 浏览器不支持 `backdrop-filter` 时的实色兜底 |

材质叠加写法：

```css
background: var(--ios27-sheen), var(--ios27-tint);
border: 0.5px solid var(--ios27-edge);
box-shadow:
  inset 0 0 0 0.5px var(--ios27-inner),
  inset 0 1px 0 var(--ios27-inner-top),
  0 0 0 0.5px var(--ios27-outer-hairline),
  var(--ios27-shadow);
backdrop-filter: blur(22px) saturate(138%) brightness(1.01);
```

## 2. 组件分层

| 组件 | 使用的 tint | 备注 |
|---|---|---|
| 顶部导航 | `--ios27-tint` | 滚动后切 `--ios27-tint-raised` |
| 移动端抽屉 `#nav.is-open` | `--ios27-tint-raised` | 独立玻璃片，`22px` 模糊 |
| AI 助手面板 | `--ios27-tint-float` (.86) | 压在任意封面/深色图上仍保证文字可读 |
| AI 浮标 | `--ios27-tint` | 56×56，桌面/移动一致 |
| Hero 控制台 / 终端 | `--ios27-tint` | Hero 核心标识同材质 |
| 项目 / 实践 / 兴趣列表 | `--ios27-tint` | 整段一张 grouped glass 容器，内部用分隔线，不改行高与文字坐标 |
| 项目卡片、工具卡片、工具面板、详情侧栏 | `--ios27-tint` | 单层模糊，不嵌套 |
| 详情 meta 条 | `--ios27-tint` | 保留原 1px gap 四列 strip，只换材质 |
| 标签 / 输入框 / 统计盒 | `--ios27-tint-faint` | 小面积控件不再叠加模糊，避免性能浪费 |

### grouped list 的几何

为了“只改材质、不改间距”，列表容器向页面 gutter 外扩，文字坐标保持 v4 原值：

- 桌面：`margin-inline:-20px; padding-inline:19px;`，圆角 `18px`
- 移动（≤760px）：`margin-inline:-10px; padding-inline:9px;`
- 行内 padding 沿用 v4：项目 `26px 0`、实践 `26px 0 28px`、兴趣 `24px 0`
- 行分隔线用 `--ios27-separator`，最后一行去掉 `border-bottom`

## 3. 移动端抽屉的关键处理

`#nav` 位于 `.topbar` 内部，而 `.topbar` 自身有 `backdrop-filter`。有模糊的祖先会成为子元素的 backdrop root，导致抽屉的 22px 模糊看不到页面。

处理方式：只在抽屉打开时关掉父级 topbar 的模糊，抽屉立即拿到真实页面背景作为 backdrop：

```css
html[data-theme="light"][data-glass="ios27"] .topbar:has(.nav.is-open) {
  background: var(--ios27-tint-raised);
  backdrop-filter: none;
}
```

关闭抽屉后 topbar 自动恢复玻璃。无新增 JS。

## 4. 无障碍文字色

浅色玻璃把背景亮度抬高，原 v4 的部分辅助灰在玻璃上会掉到 4.5:1 以下。只调文字色，不改字号、字重、字距、位置：

| Token | 值 | 用途 |
|---|---|---|
| `--muted`（浅色主题内） | `#5f6e66` | 全站辅助文字；在玻璃上 5.17:1，在页面底上 4.74:1 |
| `--ios27-accent-text` | `#557000` | 浅色玻璃上的小号 accent 标签（导航激活、栏号、项目号等） |
| `--ios27-accent-fill` | `#557000` | 浅色实心按钮底色，白字 5.37:1 |
| `--ios27-accent-text-strong` | `#4c6400` | AI 浮层内小号 accent 文字 |
| `--ios27-accent2-text-strong` | `#05655f` | AI 浮层内 teal 标签 |
| `--ios27-muted-strong` | `#4f5f55` | AI 浮层内辅助文字，压在纯黑背景时仍 ≥4.8:1 |

品牌 lime `#698900` 仍保留在大标题强调字、描边、光晕和装饰线；只有小号正文级 accent 文字换深一档的橄榄色。

## 5. 0.5px 边框说明

源码写的是 `0.5px`。在 DPR=1 的 Edge 中会落到 1 物理像素；在 DPR=2 的手机上才是真正的 0.5 设备像素。视觉上的“细白边”主要由 `inset 0 0 0 0.5px` 与顶部柔光共同构成，因此 DPR=1 下仍不会出现粗白边。

## 6. 降级与性能

- 不支持 `backdrop-filter` 时，`@supports not (...)` 会把所有玻璃面切到 `--ios27-fallback` 实色，文字与布局不变。
- 每个容器只做一层模糊；标签、输入框、统计盒只用半透明 tint + 细边，不再叠加模糊。
- 不新增 keyframes，不动画 `backdrop-filter`；只保留原有 hover/active 过渡。
- `prefers-reduced-motion: reduce` 下关闭项目行、案例卡、工具卡、AI 浮标的过渡。
- 实测 blur 层数量：浅色首页 14 层，项目页 13 层，详情页 6 层，工具页 7 层；深色原版 1–5 层。没有嵌套玻璃导致的重复模糊。

## 7. 微调建议

- **想更透**：把 `--ios27-tint` 从 `.68` 降到 `.64`，不要低于 `.62`，否则浅色辅助文字会接近 4.5:1 临界。
- **想更实**：升到 `.74`，视觉更接近 iOS 设置页的 regular material。
- **AI 浮层不要低于 `.80`**：它可能压在纯黑封面上，`.86` 是为 12px 辅助文字保留的安全余量。
- **想更冷/更暖**：只改 tint 的 RGB，保持 alpha；不要同时改 `--ios27-saturate` 和 tint，否则很难复现。
- **边框太重**：优先调低 `--ios27-inner`（内白边），不要把 `--ios27-edge` 直接设成透明，否则外轮廓会消失。
