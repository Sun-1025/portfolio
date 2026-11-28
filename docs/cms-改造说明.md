# CMS 改造说明（2026-11-25）

## 一句话

把 `/admin` 从「只能整包保存 JSON」改造成可视化内容后台：每条内容一张卡，可新建、编辑、删除、排序、一键切换公开/私密/草稿；私密内容在接口和静态导出两层都只留占位；顶栏保留「发布上线」。

## 入口

- 本地：`http://localhost:8080/admin`（账号 `admin`；密码只在本地 `.env` / 后台设置中维护，不写入仓库）
- 线上：GitHub Pages 不含后台与 API，改完内容点后台「发布上线」即可同步

## 改动清单

| 文件 | 变化 |
|---|---|
| `src/content-filter.js` | 新增。内容类型白名单 → site.json 路径、公开过滤（draft/deleted 剔除，private 换占位）、私密图片引用收集；接口、前台、导出三处共用一套语义 |
| `src/routes/content.js` | 重写。公开 `/api/content` 支持 10 分钟预览令牌；后台全量读取；按类型新增/修改/删除/恢复/彻底删除/可见性/排序/预览令牌；字段白名单 + 长度/URL/颜色校验；审计 `data/audit.json`（100 条）；写限速 60 次/分/IP；写操作必须 `X-Requested-With: fetch` |
| `src/routes/publish.js` | 新增。`POST /api/publish` 构建并推送 Pages，`GET /api/publish/status` 供界面轮询日志 |
| `src/auth.js` | 新增 `signPreview / verifyPreview`（scope=preview，10 分钟） |
| `src/routes/auth.js` | `/api/auth/me` 未登录时返回 `{user:null}`（不再 401 红字），后台据此进登录页 |
| `src/store.js` | `saveContent(next, meta)` 透传变更事件；导出 `backupSite` |
| `src/routes/upload.js` | 支持 `?scope=private` 上传到 `uploads/private/`；普通上传不变 |
| `server.js` | 挂载 publish；`/uploads/private/*` 必须带会话或预览令牌，否则 404 |
| `public/assets/js/admin.js` | 全量重写为卡片式 CMS（类型分栏、筛选、搜索、批量、拖拽与 Alt+↑/↓、抽屉编辑器、行级增删/排序、图片上传、Markdown 工具条、Ctrl+S、5s 本地草稿、预览、回收站、首页精选、发布面板、备份/审计/媒体、改密） |
| `public/assets/css/admin.css` | 全量重写（纸感浅色工作台，桌面三栏 / 390 单列、抽屉全屏） |
| `public/assets/js/app.js` | 前台支持 `?preview=type:id&token=`；占位卡与占位详情页；联系方式/邮箱占位不泄露；工具页仍按 enabled 控制 |
| `public/assets/css/app-v6.css` | 占位卡样式（锁图标、灰底） |
| `scripts/export-static.js` | 导出前用同一过滤函数；私密专属图片不进 dist；`uploads/private` 整体跳过；打印过滤条数 |
| `scripts/migrate-content.js` | 新增一次性迁移：37 条内容补 `id/title/status/visible/order/updatedAt`，先备份 |
| `public/admin/index.html` | 后台 CSS/JS 加版本参数，避免 immutable 缓存读到旧版 |
| `docs/后台使用手册.md` | 重写为 CMS 用法（可见性、草稿、排序、回收站、发布、回滚） |

## 接口一览（均需登录，除公开 `/api/content`）

- `GET /api/content`（公开，支持 `preview` + `token`）
- `GET /api/admin/content`、`GET /api/admin/audit`
- `POST /api/admin/content/:type`　`PATCH/DELETE /api/admin/content/:type/:id`
- `POST /api/admin/content/:type/:id/restore`　`PATCH .../visibility`　`POST .../preview-token`
- `POST /api/admin/content/:type/reorder`　`PUT /api/admin/selected`
- `GET /api/backups`　`POST /api/backups/:name/restore`
- `POST /api/publish`　`GET /api/publish/status`

## 验收结果

接口层（Node 脚本，22 项全过）：
新建默认草稿不可见 → 设公开可见 → 设私密只剩占位（正文/摘要不出现）→ 预览令牌可看全文、伪造令牌仍是占位 → 排序持久化 → 软删除 → 恢复 → 备份/审计 → 未登录 401 / 缺写头 403 / 私密图片 404 → 彻底删除。

界面层（Playwright + Edge，17 项全过）：
登录进入卡片网格、私密开关 toast、抽屉、私密条目预览、Esc/Enter 键盘、5 秒本地草稿、Ctrl+S 保存、Alt+↑ 排序、访客详情占位、访客列表锁卡、回收站、SSE 前台自动重载、390 无横向滚动、390 抽屉全屏、无 JS 异常、无 401 红字。

构建：`npm run build` 通过。`dist/data/site.json` 搜不到私密正文；只被私密内容引用的图片不会出现在 `dist`；公开图片保留；`dist` 无 `admin.js`。

截图：`shots/admin/`（01 网格、02 开关 toast、03 编辑器、03 预览、04 私密访客详情、04 首页锁卡、05 回收站、06 390 列表、07 390 抽屉）。

## 已知边界

- 后台只在本地 Node 服务可用（GitHub Pages 无写接口）；线上更新靠「发布上线」。
- 内容写入是单文件原子写 + 备份，适合单人维护；多人同时编辑会以后保存者为准。
- 审计只保留最近 100 条；本地草稿只存未保存字段增量，不存整包数据。
- 私密图片走 `/uploads/private` 时线上无法显示（本来也不该给访客看）；正式内容图片仍建议传普通 `/uploads`，导出时会按引用关系过滤。

## 回滚

见「后台使用手册 → 9. 回滚这次改造」。备份目录 `_backup\admin-<时间戳>\` 保留改造前的 6 个文件。
