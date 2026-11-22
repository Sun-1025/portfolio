# 更新记录

本文件记录站点的功能演进与结构性变更。版本号遵循 `主版本.次版本.修订号`。

## v1.0.0 — 2026-11-22

### 新增

- 完整的开源项目文档体系：`README.md`、`docs/使用手册.md`、`docs/功能介绍.md`、`docs/后台管理.md`、`docs/部署文档.md`
- MIT 许可证与版权声明
- `scripts/README.md`，说明素材处理脚本的用途与依赖
- 根目录 `CNAME` 文件，确保 GitHub Pages 自定义域名在每次部署后保留

### 变更

- 目录规范化：素材脚本移入 `scripts/`，DNS 参考文件移入 `docs/deploy/`，历史说明归档到 `docs/archive/`
- 原始大图（`hero-*`、`portrait-dark.jpg`、`bg-wall.jpg`、`head-turn.mp4` 等）移入 `assets/_raw/`，不再纳入版本控制
- 重写 `.gitignore`，区分「未上线原始素材」与「依赖/系统文件」
- `index.html` 增加文件级说明注释与 JS 模块地图，便于二次开发

### 移除

- 临时调试脚本 `_extract_data.js`、`_dump_structure.js`、`_verify_syntax.js`
- 过时的 `使用说明.md`（由 README 与 docs 体系取代，旧版归档保留）

## v0.5.0 — 2026-11-20

### 新增

- SEO 元信息：canonical、Open Graph、Twitter Card、JSON-LD 人物结构化数据
- `sitemap.xml` 与 `robots.txt`
- 页脚 hits.sh 访问计数
- 明暗主题切换，选择写入 `localStorage`
- 移动端响应式布局

### 变更

- 场景图由 PNG 全面替换为 WebP，总体积从约 30 MB 降到约 3 MB
- 暗态场景底图与性格卡片图改用 WebP

### 修复

- `www` 子域证书未覆盖导致的「不安全」提示，改为统一 301 跳转主域

## v0.4.0 — 2026-11-19

### 新增

- giscus 留言板：右下角悬浮入口，评论存入仓库 Discussions
- 双击场景问候气泡

## v0.3.0 — 2026-11-18

### 新增

- Sveltia CMS 可视化后台（`/admin/`）
- 自建 Netlify Functions OAuth 代理，替代第三方鉴权服务
- `site.json` 数据层，前端异步加载并以失败兜底

## v0.2.0 — 2026-11-17

### 新增

- 专属域名 `sunzhihaoai.top` 与 GitHub Pages 免费 HTTPS

## v0.1.0 — 2026-11-16

### 新增

- 单页原型：场景图、六条分支节点、详情面板、贝塞尔连线
- 鼠标视线追踪与多方向场景切换
