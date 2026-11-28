# V7 四模块改造说明与验收清单

> 站点：`https://sunzhihaoai.top`  
> 源码：`C:\Users\sun\OneDrive\Desktop\实习\portfolio-v2`  
> 本轮发布提交：`fccbb85aeb8408063c7361c272cedffb84717a5e`  
> 缓存版本：`szh-t1-m1-v24`

## 1. 修改文件

| 文件 | 作用 |
| --- | --- |
| `public/assets/js/app.js` | 四学段时间线、相册筛选、统一图片查看器、工具重排、渐进图片、文案读取 |
| `public/assets/js/site-text.js` | 全站展示文案统一配置 |
| `public/assets/css/app-v7.css` | 时间线、工具主卡/五格、相册筛选、图片占位与查看器样式 |
| `public/index.html` | 挂载 `app-v7.css` |
| `public/sw.js` | 缓存版本升至 v24，CORE 纳入 v7 CSS 与 `site-text.js` |
| `public/assets/js/admin.js` | 时间线后台字段：学段、时间、说明、3–6 图、按钮文案、弹窗补充说明 |
| `public/admin/index.html` | 后台资源版本 `20261128-1` |
| `scripts/make-thumbs.js` | 生成 360px / q42 WebP 缩略图，覆盖 uploads、photos、covers |
| `scripts/export-static.js` | 导出前自动生成缩略图 |
| `src/routes/upload.js` | 上传生成缩略图，删除媒体时同步删除 |
| `data/site.json` | 小学/初中/高中/大学四节点及照片数据 |

## 2. 模块 1：成长时间线

- 固定四节点：小学 → 初中 → 高中 → 大学，按 `order` 线性排列；仅取前 4 条可见时间线。
- 桌面端轴线居中，01/03 左、02/04 右交替；≤900px 轴线左移，卡片统一右侧。
- 每卡包含学段、时间跨度、说明、右下角照片按钮；说明区按正文行高预留，可随文字撑高。
- 点击照片按钮打开居中弹窗：学段标题 + 时间跨度、3–6 图轮播、左右按钮、页码点、caption、补充说明。
- 弹窗打开先渲染 `var(--bg)` 纯色舞台与轻量 spinner，同时加载首图；图片 `object-fit: contain`，不拉伸。
- 遮罩、右上角关闭、ESC 均可关闭；关闭后保持时间线滚动位置。
- 小学当前 0 张照片，按钮自动 `disabled` 并显示“照片还在整理”；后台上传照片后自动恢复可点。
- 后台字段：`label`、`meta`、`text`、`photos`、`photoLabel`、`modalNote`。

## 3. 模块 2：工具中心

- 总数固定为 6 个展示位：顶部「文件转换台」通栏主卡 + 下方 5 个常用工具。
- 主卡：大图标、名称、简介、「立即使用」；hover 与跳转逻辑沿用原工具卡。
- 常用区：桌面 3 列，第二行 2 个通过 6 列网格的 `nth-child(4)/(5)` 居中；≤960px 2 列；≤640px 单列。
- 原 `word-to-pdf` 保留直达路由，不占六格；转换台覆盖 PDF/Word 常用转换入口。
- 8 个展示字段全部读取 `site-text.js` 的 `tools` 分组。

## 4. 模块 3：相册与加载黑屏治理

### 交互修复

- 分类条：全部 + 各顶级相册；选中态复用主色按钮；切换时图区淡入。
- 相册图改为按钮，点击打开统一查看器；支持左右按钮、页码点、键盘方向键、横向滑动阈值。
- 移动端横向滑动阈值大于纵向翻页阈值，减少上下滑误触切图。
- 查看器 `90vw × 90vh`，图片最大不超过视口 90%；`object-fit: contain`。
- ESC 关闭、方向键切图；关闭后回到触发缩略图焦点，页面不跳顶。

### 黑屏治理

- 所有图片容器 `.v5-img-frame` 强制 `background: var(--bg)`，不使用透明底。
- 缩略图 `.v5-img-thumb` 先以低透明度 + `blur(16px)` 渲染；原图 `.v5-img-full` 加载后加 `.is-loaded`，以 0.34s opacity / 0.46s filter 过渡替换。
- 首屏前 4 张 `loading="eager"`，其余 `loading="lazy"`。
- 查看器先色块 + spinner，再加载目标图；相邻上一张/下一张预加载。
- 缩略图优先 WebP；缺失或失败时缩略图透明、原图兜底，不会出现空黑容器。
- 原图格式保持 JPG/PNG/WebP 均可；容器裁剪用 `object-fit: cover`，查看器用 `contain`。

### 性能收益（按当前资源测算）

- 已生成 120 张缩略图，默认 360px / q42；此前 116 张总计约 1231.4 KB，平均约 10.6 KB/张。
- 首屏 4 张缩略图约 40–50 KB；原图通常为数百 KB 至数 MB，首屏图片传输预期下降约 80%–95%，具体随原图大小变化。
- 构建阶段图片优化 30 张，减少 522.5 KB；缩略图不替代原图，不压缩原图画质。
- 验证方式：DevTools Network 勾选 Disable cache，筛选 Img，首屏只应优先请求 4 张缩略图；滚动后其余缩略图才出现；查看器打开时先出现底色与 spinner，无纯黑空窗。

## 5. 模块 4：文案配置

### 文件

`public/assets/js/site-text.js`

### 完整结构

```js
export const SITE_TEXT = {
  common: { backHome, backInterest, backExperience, backTools, close, prev, next,
            open, viewOriginal, originalTag, photoUnit, photosUnit, all, loading,
            empty, privateNote, expand, backTop, backPrefix, adminEntry,
            themeToLight, themeToDark, anonymous, updated, localRun, separator,
            brandFallback, projectFallbackTitle, interestFallbackTitle, coverSuffix },
  nav: { home, internship, experience, interest, work, tools },
  project: { metaProject, metaPractice, read, readPractice, practiceNote,
             locked, empty, photoAltSuffix },
  tagNotes: { 标签名: 说明, fallback, pattern },
  skillFrom: { 技能名: 出处 },
  home: { kicker, title, lead, heroNote, actions, projectsNo, projectsTitle,
          projectsLead, moreProjects, practiceNo, practiceTitle, practiceLead,
          timelineNo, timelineTitle, timelineLead, interestsNo, interestsTitle,
          interestsLead, moreInterests, aboutNo, aboutTitle, aboutLead, motto,
          quoteFallback, profileLabel, skillsLabel, emailLabel, profileKicker,
          profileOpen, signalLabel, localLabel, emailFallback },
  timeline: { kicker, title, lead, axisLabel, photoButton, noPhotoButton,
              emptyPhotos, emptyNote, modalKicker, modalNoteLabel },
  interest: { indexKicker, indexTitle, indexLead, filterLabel, filterAll,
              openAlbum, photoCount, photoCountTree, treeRootKicker, treePlaces,
              treeGroupSuffix, relatedLabel, emptyGallery, camera, travelKicker },
  tools: { kicker, title, lead, statusReady, statusCount, statusTip, unit,
           unitSuffix, statusLocal, featuredKicker, featuredTitle, featuredLead,
           featuredAction, utilitiesKicker, utilitiesTitle, utilitiesLead,
           cardAction, cardPrereq, cardTool, cardConvert, cardQuery, empty,
           loadingConverter, loadingModule, missing, problem, detailKicker },
  experience: { kicker, title, lead, empty },
  internship: { kicker, title, lead, cardLink, cards: [{ no, meta, title,
                paragraphs, tags, href }] },
  case: { ... },
  footer: { ... , avatars: [{ name, role, sub, label, image }] },
  modal: { kicker, close, prev, next, counter, empty, loading },
  errors: { data, dataHint, loadData, missingAlbum, missingTool, converter,
            tool, missingRender, update },
  branchClosed: { kicker, title, titleSuffix, fallbackName, lead, action },
};
```

说明：`tagNotes` 的键为标签原文；`pattern` 支持 `{tag}`、`{title}`、`{note}` 变量。`footer.guestMailSubject` 支持 `{name}`，`guestMailBody` 支持 `{name}`、`{text}`，`guestCount` 支持 `{count}`。

### 修改步骤

1. 打开 `public/assets/js/site-text.js`，按分组找到对应文案字段。
2. 只改单引号内文字，保留键名、逗号、引号；需要换行时使用 `\n`。
3. 本地保存后刷新 `http://localhost:8080`，无需重新构建即可看到变化。
4. 线上生效：进入 `/admin` → 右上角「发布上线」或「系统 → 立即发布」，等待“发布完成”；Service Worker 已升 v24，必要时 `Ctrl+Shift+R` 两次。
5. 时间线照片、学段名称、时间跨度、个人说明、按钮文案、弹窗补充说明：`/admin` → 成长时间线 → 编辑 → 保存；保存提示“已保存，前台立即生效”。

### 排版规则

- 标题/正文不改变原字号、行高、对齐；超长自动换行并撑高容器。
- 按钮文案过长时按原有 `max-width` 换行；工具卡简介超长按原卡片规则截断/换行。
- 支持空格与 `\n`；空文案不会导致页面报错，但建议填写。

## 6. 三端适配

### 桌面端（>1180px）

- 时间线：轴线居中，四节点左右交替；卡片最大宽度约 580px。
- 工具：主卡通栏；常用 3 列，第二行 2 个居中。
- 相册：筛选条单行；查看器 90vw/90vh。

### 平板端（641–960px）

- 时间线 ≤900px：轴线左移，所有卡片右侧。
- 工具 ≤960px：2 列，5 个工具自然换行；主卡图标与文字并排。
- 相册：筛选条可换行；查看器保持 90vw/90vh。

### 移动端（≤640px）

- 时间线：左侧轴线，卡片单列右侧，按钮可全宽。
- 工具：主卡单列，图标在上、按钮全宽；常用工具单列。
- 相册：筛选条横向滚动；查看器 90vw/90vh；触控区不小于 42px。

## 7. 验收清单

- [x] 时间线固定小学/初中/高中/大学四节点，顺序正确
- [x] 桌面左右交替，移动端左轴右排
- [x] 每节点有学段、时间跨度、说明、照片按钮
- [x] 3–6 张照片轮播、左右按钮、页码点、caption、补充说明
- [x] 弹窗底色占位 + spinner + 首图预加载
- [x] 遮罩/关闭按钮/ESC 关闭，关闭后不跳顶
- [x] 小学 0 图按钮禁用并提示，不打开空弹窗
- [x] 工具主卡通栏，5 个常用工具桌面 3 列、第二行居中
- [x] 移动端工具单列、主卡按钮全宽
- [x] 相册分类选中高亮、切换淡入
- [x] 相册列表/大图/时间线弹窗统一底色占位
- [x] 缩略图模糊垫底 + 原图淡入
- [x] 首屏 4 张 eager，其余 lazy
- [x] 相邻图预加载
- [x] 大图 90% 视口限制，`object-fit` 统一
- [x] 方向键/ESC、横向滑动阈值
- [x] 全站展示文案统一到 `site-text.js`，主要模块无硬编码
- [x] 后台时间线照片/按钮/补充说明可编辑，保存成功
- [x] `node --check` 全部通过
- [x] `npm run build` 成功，`dist` 已更新
- [x] 线上 `sw.js` 为 v24，`app-v7.css` 与 `site-text.js` 可访问
- [x] 发布提交 `fccbb85aeb8408063c7361c272cedffb84717a5e`

## 8. 已知取舍

- 小学暂无真实照片，按钮禁用；后台上传 3–6 张后自动恢复。
- 初中/高中照片使用北京旅行相册，大学使用校园/公益课照片；可在后台逐张替换。
- 展示工具固定 6 格；`word-to-pdf` 保留直达路由，不占格。
- 文案配置是独立 JS 配置层，线上修改后需点一次「发布上线」；本地刷新即时生效。
