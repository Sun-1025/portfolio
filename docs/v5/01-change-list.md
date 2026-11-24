# V5 改动清单

备份：`_backup/v5-20261124-1045/`；旧 v4 未使用素材另存 `_backup/stale-v4-assets-20261124/`。

## 一、内容与身份

`data/site.json` 整体重写，顶层结构为 `site / nav / branches / home / work / interests / tools / ai / notices / settings`。

- 身份固定为：孙志昊，山东石油化工学院 2025 级物联网工程；方向嵌入式、物联网，延伸 AI / Agent；已掌握 SQL Server、C、C++；开放实习。
- 删除旧数据：GPA、专业排名、团队成员数、图书条数、活动场次、服务人数、乡镇数量、出生年月、家乡、ENTJ、旧微信号、旧项目数字。
- 联系方式固定：邮箱 `1322816531@qq.com`、QQ `1322816531`、GitHub `Sun-1025`、Gitee `SunZHAO1025`、微信「暂密」。
- 首页四张项目卡：个人主页、在线工具箱、家用语音监测系统、图书管理系统；公益实践「小小物理学家探险队」单独成卡。
- 经历四段：校内预备实习 → 东营区图书馆 → 青年志愿者协会 → 科技协会。
- 兴趣六格：骑行、羽毛球、登山、北京、淄博、济南。

## 二、页面与路由

`public/assets/js/app.js` 重写渲染层：

- 路由：`#/`、`#/internship`、`#/experience`、`#/interest`、`#/interest/:id`、`#/work/:id`、`#/tools`、`#/tools/:id`。
- `#/work` 无 id 回退 `#/experience`；旧 `/classic/` 保留为归档页。
- 首页项目卡、公益实践单卡、经历时间线、兴趣六格、详情页、工具箱页均按新数据渲染。
- 项目封面支持 `coverAlt`；公益课封面不再误用第二张裁切图的 alt。
- 页脚 kicker 从 `06 / CONTACT` 改为 `CONTACT`，避免经历页编号跳号。
- 静态站模式隐藏后台入口，留言回退 `mailto`；源服务模式保留 `/api/guestbook` 与后台。

## 三、视觉

新增 `public/assets/css/app-v5.css`，在 `public/index.html` 最后加载：

- 近黑底 `#0a0c0f`，蓝灰强调；浅色主题同步。
- 桌面导航 72px，移动 68px；功能按钮点击区 44px。
- H1 桌面 40px、移动 32px，`word-break: keep-all`；正文 16px / 1.7；标签 13px；全站无小于 13px 的文字。
- 首屏 `min-height: min(680px, 76svh)`；`.v5-intro` 最大宽度 680px。
- 磨砂玻璃只用于导航、卡片、弹层、抽屉、助手面板；`backdrop-filter: blur(22px)`，0.5px 内描边，轻阴影。
- 项目卡媒体填满卡片高度；桌面项目卡约 610×289，媒体 274.5×289；移动端媒体 16:10。
- 641–960px 项目 / 实习 / 工具栅格两列；浅色主按钮深底白字，深色反相。
- 旧 `app.css`、`app-v4.css` 保留供工具箱与旧组件；`app-ios27.css` 不再引用并从公开包移除。

## 四、图片

- 36 张原图解压到 `_incoming/网站素材总包/`；生成 25 张 WebP 到 `public/assets/photos/`（项目 2、校园 2、兴趣 21）。
- `physics-01.webp`：1500×938，屏幕 + 教师 + 学生背影，公益课封面。
- `physics-02.webp`：815×509，29,516 B，手 / 桌面 / 桌腿特写，无儿童正脸；详情侧图只用这一张。
- `campus/kexie.webp`：1600×1200，已裁掉奖状墙。
- `campus/qingxie.webp`：1600×1200，只保留孙志昊本人可识别正脸。
- 兴趣图统一 4:3，全部 ≤500 KB；`jinan-03.webp` 构建后 505,164 B，是当前最大单张。
- `public/assets/photos/_manifest.json` 重生成 25 条，含 `src/w/h/bytes/privacy`。
- 旧 v4 素材（`scene-*`、`entj.webp`、`signal-core.webp`、`portrait-classic.webp`、旧 `illustrations` 等）已从 `public` 移到备份，不再进入静态包。

## 五、AI 与后台

- `public/assets/js/ai-dock.js` 改为本地事实库，`ai.endpoint=""`，空 endpoint 时完全本地回答；打字速度 4ms。
- `public/index.html`：`SZH_AI_ENDPOINT=''`、`SZH_GUESTBOOK_ENDPOINT=''`。
- `ai-server/profile.json` 与 `ai-server/app/api/chat/route.ts` 仍为旧事实，未重部署；当前线上 AI 不参与前台回答。
- CMS 后台逻辑未改：`server.js`、`src/routes/*`、`public/admin/*` 保留；`interests` 为新增顶层键，`PUT /api/content` 对额外键允许保存，后台 UI 是否暴露 `interests` / `home.campus` 未逐项验证。

## 六、构建与部署

- `scripts/export-static.js` 每次构建先清空 `dist`，避免旧 v4 文件残留。
- 最终静态包：62 files / 9.66 MB。
- 新增 `sync/deploy-v5-pages.ps1`：按 62 个文件建 blob，创建不含旧文件的 tree，保留 `CNAME`，提交到 `Sun-1025/Sun-1025.github.io` 的 `main`。
- 新增 `sync/clean-pages.ps1`：从当前 Pages 树按 `dist` 清单重建干净树，保留 CNAME；本次部署已用它清理旧 v4 文件。
- 线上 commit：`1e20007655c032af1439a15bc3a8a1813ec03095`（clean static package）。
- 源码仓库 `Sun-1025/portfolio` 尚未按 V5 全量推送；本机无 git，需用 GitHub API 或另行上传源码包。

## 七、事实口径说明

提示词写「前端用 AOS 滚动与响应式交互，后端 GitHub Pages + Gitee Pages 双平台」，站点文案按提示词保留。实际滚动揭示由 `IntersectionObserver` 实现，未引入 AOS 库；静态包与 Gitee Pages 路径兼容，但 Gitee Pages 尚未实际开通并部署。若要把文案改成「原生滚动揭示 / GitHub Pages 已部署」，只需改 `data/site.json` 中 `home.timeline[0].text`、`home.about.lines[1]`、`site.footer` 与 `case-site` 的 sections/tags，不影响页面结构。
