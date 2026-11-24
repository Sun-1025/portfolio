# V5 部署与代码说明

## 1. 运行环境

- Node.js ≥ 18；Windows / macOS / Linux 均可。
- 静态站无需 Node，构建时用 Node + npm。
- 依赖已锁定在 `package-lock.json`；运行 `npm ci` 可复现。

## 2. 源站（带后台 / 留言 API）

```powershell
cd C:\Users\sun\OneDrive\Desktop\实习\portfolio-v2
Copy-Item .env.example .env
npm ci
npm start
```

默认 `http://localhost:8080`。`.env` 可改：

```ini
PORT=8080
HOST=0.0.0.0
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-a-strong-password
JWT_SECRET=
SESSION_HOURS=4
```

首次启动生成 `data/users.json` 与 `data/.jwt-secret`；`ADMIN_PASSWORD` 必须自行设置为至少 8 位，仓库不提供默认密码。后台 `/admin/` 登录后可在账号设置里改密码。不要把 `data/users.json`、`data/.jwt-secret`、`data/backups/` 推到公开仓库。

## 3. 静态构建

```powershell
npm run build
```

等价于：

```powershell
npm run css
npm run export
```

- `npm run css`：Tailwind 输出 `public/assets/css/tailwind.css`。
- `npm run export`：清空 `dist/`，复制 `public/`（不含 `admin`）、`data/site.json`、`tools/`、`classic/`，压缩图片 / CSS / JS，写入 `.nojekyll` 和 `404.html`。
- 构建结果：62 files / 9.66 MB。
- 子路径部署（如 `https://example.com/portfolio/`）：

```powershell
npm run export -- --base=/portfolio/
```

## 4. GitHub Pages（当前线上）

仓库：`Sun-1025/Sun-1025.github.io`，分支 `main`，根目录发布；自定义域名 `sunzhihaoai.top`，CNAME 文件内容为 `sunzhihaoai.top`。

### 方式 A：普通上传

把 `dist/` 里的全部文件覆盖到 Pages 仓库根目录，保留仓库原有 `CNAME`，提交后等待 Pages 构建。不要只上传 `index.html`，否则 `data/site.json`、照片、`tools/vendor` 会缺。

### 方式 B：本机脚本（本次使用）

```powershell
cd C:\Users\sun\OneDrive\Desktop\实习\portfolio-v2
powershell -ExecutionPolicy Bypass -File .\sync\deploy-v5-pages.ps1
```

脚本从 Windows 凭据 target `GitHub - https://api.github.com/Sun-1025` 读取 Token；对 `dist` 全量文件建 blob，创建**不含旧文件**的 tree，保留 CNAME，提交 `main`。如果凭据不存在，先在 Git 凭据管理器或系统凭据里保存一个带 `repo` 权限的 GitHub Token。

`sync/clean-pages.ps1` 用于已有 Pages 仓库残留旧文件时清理：按当前 `dist` 清单重建树，保留 CNAME，不动源码仓库。

线上验收：

```powershell
Invoke-WebRequest https://sunzhihaoai.top/ -UseBasicParsing
Invoke-WebRequest https://sunzhihaoai.top/data/site.json -UseBasicParsing
Invoke-WebRequest https://sunzhihaoai.top/classic/ -UseBasicParsing
```

应看到 `app-v5.css`、`孙志昊，做嵌入式与物联网`、`经典版已归档`。

## 5. Gitee Pages

`dist/` 是纯静态、无绝对 API 依赖的包，路径与 GitHub Pages 一致，可原样上传到 Gitee Pages。当前**未实际开通 Gitee Pages**；页面文案里的「Gitee Pages 双平台」是部署兼容性描述，不是已上线状态。开通后在 Gitee 仓库 Settings → Pages 选择分支根目录即可；自定义域名与 HTTPS 按 Gitee 当前政策配置。

## 6. 留言

- 源服务：前台 `POST /api/guestbook`；后台可看公开留言。
- 静态站：`public/index.html` 与 `data/site.json` 的 endpoint 都为空；`app.js` 回退到 `mailto:1322816531@qq.com`，不把留言写进任何第三方。
- 若以后要接静态留言服务，只需在 `public/index.html` 设置 `window.SZH_GUESTBOOK_ENDPOINT`，并在 `data/site.json` 设置 `site.guestbookEndpoint`；前台会自动切回 API 模式。

## 7. AI 助手

当前 `ai.endpoint=""`，`ai-dock.js` 用内置事实库回答，完全离线可用；不需要部署 AI 服务端。

若要接远程模型：

1. 部署 `ai-server/`（Next.js，单路由 `POST /api/chat`），配置服务端环境变量；密钥只放服务端。
2. 把 `public/index.html` 的 `window.SZH_AI_ENDPOINT` 和 `data/site.json` 的 `ai.endpoint` 改成远程地址（如 `https://ai.sunzhihaoai.top/api/chat`）。
3. 服务端不可达时，`ai-dock.js` 仍会回退本地事实。
4. `ai-server/profile.json` 仍是旧事实，接远程前必须先更新，否则会答旧身份 / 旧项目。当前线上 `https://ai.sunzhihaoai.top/api/chat` 未重部署。

## 8. CMS 后台

- 入口：`/admin/`（仅源服务）。
- API：`/api/auth/*`、`/api/content`、`/api/upload`、`/api/events`。
- 内容保存：`data/site.json`；自动备份 `data/backups/`，保留最近 30 份。
- 新增 `interests` 顶层键可保存；后台表单是否已暴露 `interests`、`home.campus` 未逐项验证，改内容优先直接编辑 `data/site.json` 后重启 / 重新构建。
- 上传白名单不含 SVG；图片上传到 `public/uploads/`，静态构建会带上 `uploads/`。

## 9. 回滚

- 源码整体备份：`_backup/v5-20261124-1045/`。
- 旧 v4 素材：`_backup/stale-v4-assets-20261124/`。
- Pages 历史 commit 可在 GitHub 仓库的 commit 记录里回退；本次新 commit 为 `1e20007655c032af1439a15bc3a8a1813ec03095`。
