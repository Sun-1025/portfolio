# 项目总览

## 一句话

这是一个“可以长期住下去”的个人站：用原生 HTML/CSS/JS 做前台，用 JSON 做内容源，用 Express 做本机后台，用静态导出把成品发布到 GitHub Pages，同时把源码同步到 GitHub 与 Gitee。

## 先看什么

如果你第一次打开这个仓库，建议按下面的顺序阅读：

1. `README.md`：项目是什么、怎么跑、仓库包含什么、隐私边界。
2. 本文：当前状态与阅读路线。
3. [01-build-story.md](01-build-story.md)：从经典版到 A3 的完整施工过程，解释为什么长成现在这样。
4. [02-architecture.md](02-architecture.md)：代码分层、请求流和数据流。
5. [03-data-and-cms.md](03-data-and-cms.md)：内容模型、可见性和后台。
6. [04-build-deploy.md](04-build-deploy.md)：构建、发布和同步。
7. [05-testing.md](05-testing.md)：验收指标、测试矩阵和边界。
8. [06-privacy-security.md](06-privacy-security.md)：哪些内容绝对不该进仓库。

## 当前状态

| 项目 | 状态 |
|---|---|
| 线上站点 | `https://sunzhihaoai.top`，GitHub Pages + 自定义域名 |
| 前台 | 原生 SPA，路由、主题、留言、工具箱、后台入口都保留 |
| 视觉 | v5 极简科技主体，v6 UI/UX 层，A2 Threads 背景 |
| 后台 | 本机 Express + 可视化内容管理；静态站不含后台/API |
| 工具 | 文件转换台、Markdown、字数统计、单位换算、日期计算 |
| AI | 可选 Next.js 代理；未配置时不影响主站 |
| 构建 | `npm run build`，当前 72 个文件 / 约 9.73 MB |
| 源码同步 | GitHub `Sun-1025/portfolio`、Gitee `SunZHAO1025/portfolio` |

## 阅读时的三个约定

- **源码优先**：以 `public/`、`src/`、`scripts/` 为准，不把 `dist/` 当成源码。
- **数据与代码分开**：页面结构在代码里，内容在 `data/site.json` 里，私密内容在过滤层处理。
- **密码不写进文档**：后台账号密码只在本机 `.env` 或后台设置中维护；仓库和文档只写“如何配置”，不写具体值。

## 当前版本边界

- 静态版没有后台和 API，内容更新需要重新构建、发布。
- 后台是单管理员、桌面优先；多人协作和高频并发不在当前范围。
- 工具默认只在浏览器本地处理文件，不承诺服务端批处理。
- AI 代理需要单独部署和模型密钥；没有配置时会返回友好错误，不阻塞主站。
- 公开仓库只保留公开素材；私密照片、用户数据、审计日志、备份不在仓库中。
