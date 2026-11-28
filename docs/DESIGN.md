---
name: portfolio-v5
description: 极简科技、成长档案与自研工具个人站
colors:
  bg: "#0a0c0f"
  bg-2: "#0d1115"
  surface: "#11161b"
  surface-2: "#151b21"
  ink: "#edf2f6"
  ink-2: "#c2ccd6"
  muted: "#93a0ac"
  line: "rgba(226, 234, 242, 0.12)"
  line-strong: "rgba(226, 234, 242, 0.24)"
  accent: "#b4ccde"
  accent-2: "#91afc5"
  accent-ink: "#0a0c0f"
  accent-soft: "rgba(180, 204, 222, 0.10)"
  glass-tint: "rgba(28, 28, 30, 0.72)"
  glass-strong: "rgba(28, 28, 30, 0.86)"
  light-bg: "#f3f5f7"
  light-surface: "#ffffff"
  light-ink: "#111820"
  light-accent: "#35566b"
  light-glass-tint: "rgba(255, 255, 255, 0.68)"
typography:
  display:
    fontFamily: "IBM Plex Sans, Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "clamp(36px, 4vw, 40px)"
    fontWeight: 700
    lineHeight: 1.2
  heading:
    fontFamily: "IBM Plex Sans, Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "clamp(28px, 3vw, 31px)"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "IBM Plex Sans, Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "IBM Plex Mono, SFMono-Regular, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "7px"
  md: "10px"
  lg: "12px"
  xl: "16px"
spacing:
  bar: "72px"
  mobile-bar: "68px"
  wrap-max: "1240px"
  section-mobile: "52px"
  section-desktop: "clamp(58px, 8vh, 92px)"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "44px"
  button-ghost:
    backgroundColor: "rgba(255,255,255,0.035)"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "44px"
  card:
    backgroundColor: "{colors.glass-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "20px"
  input:
    backgroundColor: "rgba(255,255,255,0.035)"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "11px 12px"
---

# Design System: portfolio-v5

## Overview

当前视觉系统是“极简科技 + 成长档案 + 自研工具”。界面以冷灰深色为默认底色，使用低饱和蓝灰强调色、半透明玻璃表面和细描边表达技术感，同时保留个人成长记录所需的留白与可读性。

默认主题为深色；浅色主题通过同一组 CSS 变量切换。页面不使用强发光、粒子、扫描线或夸张动效，`.site-glow`、`.site-noise`、`.site-scan` 在 V5 中停用。

**Key Characteristics:**
- 低饱和冷灰配色
- 22px 玻璃模糊
- 0.5px 细描边
- 原生 ESM 与无框架组件
- 内容事实优先，不使用夸张宣传语

## Colors

深色背景使用 `#0a0c0f` 与 `#0d1115`，表面层使用 `#11161b`、`#151b21`。主文字为 `#edf2f6`，次级文字为 `#c2ccd6`，弱文字为 `#93a0ac`。

强调色为 `#b4ccde` 和 `#91afc5`，用于焦点、状态点、选中态和少量强调背景。玻璃底色使用 `rgba(28,28,30,.72)`，滚动后加强为 `rgba(28,28,30,.86)`。

浅色主题背景为 `#f3f5f7`，表面为 `#ffffff`，文字为 `#111820`，强调色为 `#35566b`，玻璃底色为 `rgba(255,255,255,.68)`。

## Typography

**Display Font:** IBM Plex Sans，搭配 Noto Sans SC、PingFang SC、Microsoft YaHei。

**Body Font:** IBM Plex Sans，搭配 Noto Sans SC、PingFang SC、Microsoft YaHei。

**Label/Mono Font:** IBM Plex Mono，搭配 SFMono-Regular、Consolas。

### Hierarchy

- **H1 / Display**：700，`clamp(36px, 4vw, 40px)`，行高 1.2；移动端为 32px。
- **H2 / Section Heading**：600，`clamp(28px, 3vw, 31px)`，行高 1.3；移动端为 29px。
- **Card Title**：21–23px，600，行高 1.35–1.4。
- **Body**：16–17px，400，行高 1.7–1.8。
- **Label**：13px，400–500，行高 1.4–1.5。

## Layout

主容器最大宽度为 1240px，使用 `width: min(var(--wrap-max), calc(100% - 2 * clamp(24px, 5vw, 72px)))` 居中。移动端容器左右边距为 18px，即宽度 `calc(100% - 36px)`。

桌面导航高度为 72px，移动端为 68px。桌面导航链接保持 44px 最小高度；960px 以下导航转为固定抽屉，移动菜单项高度为 52px。

当前代码中的主要响应式分界为 1180px、960px、640px；项目巡检基准还包括 1920px、1440px、768px、390px。

## Elevation & Depth

系统以半透明表面、细描边和柔和阴影表达层级，不使用强投影。默认阴影为 `0 12px 36px rgba(0,0,0,.18)`，抬升状态为 `0 18px 48px rgba(0,0,0,.24)`。

玻璃表面统一使用 `backdrop-filter: blur(22px)`，多数容器同时使用 `saturate(130%–140%)`。描边使用 0.5px，常规描边为 `rgba(226,234,242,.12)`，玻璃边缘为 `rgba(255,255,255,.16)`。

## Shapes

主要圆角为 16px，次级表面为 12px，按钮和导航项为 10px，小标签为 7–8px。圆形仅用于状态点、图标点和部分小型指示元素。

所有主要卡片保持连续圆角、半透明底色和 0.5px 内描边。图片容器使用 `overflow:hidden` 与同一圆角体系。

## Components

### Buttons

- 主按钮：44px 高，16px 圆角体系内的 10px 按钮圆角，使用强调色背景和深色文字。
- 幽灵按钮：44px 高，半透明背景、0.5px 描边和次级文字。
- 焦点态：2px 强调色 outline，4px offset。

### Cards / Containers

- 卡片：16px 圆角，玻璃底色，22px blur，0.5px 描边。
- 常规内边距：20px；移动端部分卡片为 18px。
- 项目卡桌面采用横向图文结构，960px 以下改为单列。

### Inputs / Fields

- 输入框：10px 圆角，11–12px 内边距，16px 字号，半透明背景。
- 文本域：最小高度 116px，可垂直调整。
- 表单当前需要在后续阶段补 `role="status"` 状态播报。

### Navigation

- 顶部导航为玻璃表面，72px 高，使用 22px blur。
- 960px 以下导航隐藏为抽屉，由菜单按钮控制，`aria-expanded` 与 `aria-controls` 已存在。
- 品牌标识由 40px 方形标记和文字组成；移动端标记为 36px。

### Signature Component

工具箱、项目卡、成长时间线和 AI 面板共同构成站点的识别组件。它们共享同一玻璃表面、0.5px 描边、16px 圆角和低饱和蓝灰焦点色。

## Do's and Don'ts

### Do:

- Do 保持 22px 玻璃模糊和 0.5px 细描边。
- Do 使用现有 CSS 变量处理深浅主题。
- Do 保持正文 16–17px、标签不低于 13px。
- Do 保持事实性文案，不写未获得的奖项、名次、合作企业或服务规模。
- Do 在移动端优先保证内容可读、按钮可点、表单状态可播报。

### Don't:

- Don't 新增强发光、粒子、扫描线或高饱和装饰。
- Don't 使用“精通、顶级、行业领先、颠覆、赋能、闭环、极致体验、震撼”等夸大词。
- Don't 在首屏或页脚明文展示旧微信；当前微信口径为“暂密”。
- Don't 恢复旧 GPA、专业排名、ENTJ、出生年月、家乡等已下线身份信息。
- Don't 发明新的颜色、字号、圆角或阴影；阶段 C 只能以本文件记录的现状为依据。
