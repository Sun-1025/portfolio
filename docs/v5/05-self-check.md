# V5 自检报告

日期：2026-11-24；环境：Windows、Edge 158、本地静态站 `dist`（Python `http.server:8090`）与源服务 `:8080`。

## 1. 构建与体积

- 命令：`npm run build`（Tailwind + 静态导出）
- 结果：**62 files / 9.66 MB**
- 核心 HTML + CSS + JS：**约 177 KB**（`index.html`、`tailwind.css`、`app.css`、`app-v4.css`、`app-v5.css`、`app.js`、`ai-dock.js`）
- 图片：25 张公开 WebP；最大 `interests/jinan-03.webp` **479.7 KB**，其余 ≤489 KB；单张均 ≤500 KB。
- `tools/vendor` 体积最大（PDF worker、pdf-lib、xlsx、mammoth 等），只在打开对应工具时按需加载；首页不加载 vendor。
- `dist` 每次构建前整体清空，避免旧 v4 文件残留；公开资源中已无 `scene-*`、`entj.webp`、`signal-core.webp`、旧 `illustrations/`、`app-ios27.css`。

## 2. 断点

| 断点 | 视口 | 文档宽度 | 横向溢出 | H1 | 关键布局 |
|---|---:|---:|---|---:|---|
| 1920 | 1920×1080 | 1920 | 无 | 40px | 内容 1240，项目卡 610×289.6 |
| 1440 | 1440×900 | 1440 | 无 | 40px | 内容 1240，项目卡 610×289.6 |
| 768 | 768×1024 | 768 | 无 | 36px | 两列，项目卡 335.6×501 |
| 390 | 390×844 | 390 | 无 | 32px | 单列，hero 354×795，项目卡 354×510 |

- 移动端菜单：390 下抽屉 `x=16, y=76, w=358, h=189.4`，三个一级链接「实习 / 经历 / 兴趣」，文档宽度仍 390。
- 390 下 H1 在逗号处断行，`word-break: keep-all`，不拆「嵌入式」。
- 641–960px 项目 / 实习 / 工具栅格两列；768 下项目卡保持两列。

## 3. 双主题与对比度

| 组合 | 对比度 |
|---|---:|
| 深色正文 `#edf2f6` / `#0a0c0f` | 16.59:1 |
| 深色辅助 `#93a0ac` / `#0a0c0f` | 7.88:1 |
| 浅色正文 `#111820` / `#f3f5f7` | 13.24:1 |
| 浅色辅助 `#4f5d69` / `#f3f5f7` | 4.79:1 |
| 浅色正文二级 `#34424e` / `#f3f5f7` | 7.02:1 |
| 浅色主按钮 `#35566b` / `#f8fbfd` | 5.70:1 |

- 浅色主题辅助色从 `#5e6c79` 调到 `#4f5d69`，避免 13px 标签低于 4.5。
- 深/浅主按钮计算值：深色 `rgb(180,204,222)` 底 / `rgb(10,12,15)` 字；浅色 `rgb(53,86,107)` 底 / `rgb(248,251,253)` 字。

## 4. 字号

- 桌面 H1 40px、H2 28–31px、H3 23–24px、正文 16–17px / 1.7、辅助 14px、标签 13px。
- 全站站点自身 DOM 扫描：**无小于 13px 的可见文字**（深浅两套、首页 / 经历 / 工具 / 兴趣 / 项目详情）。
- 旧 `app.css`、`app-v4.css` 里的 10 / 10.5 / 11 / 11.5 / 12 / 12.5px 统一抬到 13px；工具转换台、留言区的微标签不再出现 12px。
- 磨砂只用于导航、卡片、弹层、抽屉、助手面板，`backdrop-filter: blur(22px)`；无全屏液态玻璃。

## 5. 功能与路由

- 路由自测：`#/`、`#/internship`、`#/experience`、`#/interest`、`#/interest/cycling`、`#/work/case-site`、`#/work/case-physics`、`#/tools`；`#/work` 无 id 回退 `#/experience`。
- `/classic/` 归档页返回 200，文案为「经典版已归档」，无 GPA / ENTJ / 出生年月 / 家乡 / 旧微信。
- 主题切换：按钮可切深 / 浅，`localStorage` 保留；两套截图均生成。
- 移动抽屉：390 可打开，三个一级链接；工具箱入口仍在顶栏。
- 留言：源服务模式 `/api/guestbook` 可用；静态包 `SZH_GUESTBOOK_ENDPOINT=''`，提交回退 `mailto:1322816531@qq.com`。
- 工具箱：5 个入口；文件转换台、Markdown、字数、单位、日期均本地运行；vendor 按需加载。
- AI 助手：`ai.endpoint=''`，本地事实库回答；打开面板、快捷问题、本地流式输出均可用；打字速度 4ms。

## 6. 图片与隐私

- 25 张公开：项目 2、校园 2、兴趣 21；`_manifest.json` 25 条尺寸 / 字节 / 隐私说明。
- 公益课封面 `physics-01.webp` 1500×938，屏幕 + 教师 + 学生背影；`physics-02.webp` 815×509，29,516 B，只留手 / 桌面 / 桌腿，无儿童正脸。
- `campus/kexie.webp` 奖状墙已裁掉；`campus/qingxie.webp` 只保留孙志昊本人可识别正脸。
- 理财 11 张未复制、未公开；`_incoming` 原图不部署。
- 兴趣图统一 4:3；项目 16:10；校园 4:3；无拉伸变形，不叠文字水印。

## 7. 线上验收

- 自定义域名：`https://sunzhihaoai.top`，CNAME `sunzhihaoai.top` 保留。
- 最新 Pages commit：`1e20007655c032af1439a15bc3a8a1813ec03095`（干净树：62 files + CNAME）；此前 `92214cfc...` 已含全量 dist。
- 线上 `index.html` 引用 `app-v5.css`；`data/site.json` 标题为「孙志昊，做嵌入式与物联网」；`physics-02.webp` 200 / 29,516 B；`classic/` 归档页 200。
- 旧 v4 路径已从仓库树移除；如个别旧 URL 仍因 CDN 缓存短暂 200，不影响站内引用，等待缓存过期即可。

## 8. 已知限制 / 待确认

1. 提示词写「AOS 滚动 + GitHub Pages / Gitee Pages 双平台」。实际滚动揭示用原生 `IntersectionObserver`，未引入 AOS；Gitee Pages 未实际开通。文案按提示词保留，若要求严格一致，需要改文案或补 AOS / 开通 Gitee Pages。
2. 项目封面 `site/tools/voice/library` 仍是极简线稿 SVG，不是真实页面截图；适合当前视觉，但不算「真实截图」。
3. CMS 后台 `PUT /api/content` 允许额外 `interests` 键；后台表单是否已暴露 `interests` / `home.campus` 未逐项验证，改内容优先直接编辑 `data/site.json`。
4. `ai-server/profile.json` 已更新为 V5 事实，但线上 `https://ai.sunzhihaoai.top/api/chat` 未重部署；前台 endpoint 为空，当前不依赖远程 AI。
5. 源码仓库 `Sun-1025/portfolio` 已按 V5 全量推送（99 files）；本机无 git，使用 GitHub API。
6. GitLab 推送仍未完成：无 Token、`glab` 未安装、API 403、SSH 22 超时。

## 9. 验收清单

- [x] 导航 72 / 68px，菜单 16.5px，点击区 44px。
- [x] 正文 16–17px / 1.7，全站无小于 13px 文字。
- [x] 磨砂只在导航 / 卡片 / 弹层 / 抽屉 / 助手面板，`blur(22px)`。
- [x] 深浅主题正文对比度 ≥4.5:1（最低浅色辅助 4.79:1）。
- [x] 科普课无儿童正脸；理财截图未公开；奖状墙已裁。
- [x] 图片等比裁切，无拉伸变形；单张 ≤500 KB。
- [x] 文案无夸大词、无编造、无 AI 腔；旧数据已移除。
- [x] 1920 / 1440 / 768 / 390 四个断点无横向溢出。
- [x] 路由、主题切换、留言、工具箱、移动抽屉可用。
