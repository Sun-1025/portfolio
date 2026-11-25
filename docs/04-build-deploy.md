# 构建、发布与同步

## 1. 环境

- Windows 10/11 + PowerShell 7（脚本也兼容 Windows PowerShell 5.1）
- Node.js 18+；当前机器使用 Node 22
- Git 可选：发布脚本可以直接走 GitHub API，不依赖本地 `.git`
- GitHub Pages 使用自定义域名 `sunzhihaoai.top`，仓库根保留 `CNAME`

## 2. 首次运行

```powershell
npm install
copy .env.example .env
npm start
```

默认 `http://localhost:8080`。首次启动会自动创建：

- `data/users.json`：管理员账号；密码只在本地，不进仓库。
- `data/.jwt-secret`：JWT 签名密钥；自动生成，不进仓库。
- `data/backups/`：内容备份；不进仓库。

修改管理员密码：

```powershell
node scripts/init-admin.js admin "你的至少8位新密码"
```

命令里的密码会进入 shell 历史，生产环境建议改用后台“账号设置”，或使用本机的初始化脚本把密码写入 `private/` 后再删除命令历史。

## 3. 构建

```powershell
npm run build
```

等价于：

```powershell
npm run css
node scripts/export-static.js
```

输出目录：`dist/`。

当前构建结果：

- 72 个文件
- 10,197,545 字节（约 9.73 MB）
- 图片优化 26 张，减少 346.6KB
- 总压缩减少约 444.3KB

构建后自检：

```powershell
Test-Path dist/index.html
Test-Path dist/assets/js/threads.js
Test-Path dist/assets/js/dotfield.js   # 应为 False
Get-ChildItem dist -Recurse -File | Measure-Object Length -Sum
Get-Content dist/CNAME
```

## 4. GitHub Pages

### 4.1 仓库结构

- 源码仓库：`Sun-1025/portfolio`
- Pages 仓库：`Sun-1025/Sun-1025.github.io`
- 自定义域名：`sunzhihaoai.top`
- Pages 仓库根目录就是站点根目录，`CNAME` 必须保留。

### 4.2 发布

```powershell
powershell -ExecutionPolicy Bypass -File sync\deploy-v6-pages.ps1
```

> 当前 GitHub 账号下 `Sun-1025/Sun-1025.github.io` 必须保持 **public**，并在仓库 Settings → Pages 中启用 `main` 分支根目录；private 状态下 Pages 不会发布，访问自定义域名会返回 “Site not found”。本次仓库整理发现它被设为 private 且 Pages 关闭，已恢复为 public 并重新启用 Pages。

脚本做三件事：

1. 读取本机 Windows 凭据中的 GitHub token，不把 token 写进仓库。
2. 通过 GitHub API 创建 blob/tree/commit，发布 `dist/` 的内容。
3. 保留 `CNAME`，不覆盖自定义域名。

发布后验证：

```powershell
curl.exe -I https://sunzhihaoai.top/
curl.exe -I https://sunzhihaoai.top/assets/js/threads.js
curl.exe -I https://sunzhihaoai.top/assets/js/dotfield.js
```

预期：

- 首页 200
- `threads.js` 200
- `dotfield.js` 404
- 首页 HTML 含 `<script type="module" src="/assets/js/threads.js"></script>`

### 4.3 源码同步

```powershell
powershell -ExecutionPolicy Bypass -File sync\push-source.ps1
```

该脚本：

- 从 Windows 凭据 `GitHub - https://api.github.com/Sun-1025` 读取 token。
- 按脚本内的路径清单读取源码。
- 用 GitHub Git Data API 创建新 tree 和 commit。
- 不依赖本地 `.git`，所以项目根没有 `.git` 也能更新。

脚本内的路径清单必须排除：

- `node_modules/`、`dist/`、`.next/`
- `.env`、`.env.local`
- `data/users.json`、`data/.jwt-secret`、`data/backups/`、`data/guestbook.json`
- `private/`、`qa/`、`_shots/`、`_backup/`
- 日志、诊断文件、临时截图

## 5. Gitee

Gitee 仓库：`https://gitee.com/SunZHAO1025/portfolio`。

当前同步方式：

1. 浅克隆到一个临时目录。
2. 只复制本次改动涉及的文件，避免 CRLF 造成的假修改。
3. 提交并推送到 `main`。
4. 用 `git ls-remote` 复核 HEAD。

如果 Gitee 仓库已有历史，不要直接覆盖；先 `git status` 确认差异，再提交。不要把 GitHub token 或 Gitee token 写进 `.git/config` 或脚本。

## 6. 发布前检查清单

- [ ] `npm run build` 通过，`dist` 文件数和体积符合预期。
- [ ] `dist` 中没有 `dotfield.js`，首页引用 `threads.js`。
- [ ] 深色/浅色主题都看过；390×844 无横向溢出。
- [ ] 关于页信息栏垂直居中；回顶文字居中；工具台两栏等高；Agent 气泡可见。
- [ ] `/classic`、`/admin`、工具详情、项目详情都能打开。
- [ ] 线上 `threads.js` 200，`dotfield.js` 404。
- [ ] 仓库 tree 中没有 `data/users.json`、`.jwt-secret`、`private/`、`qa/`。
- [ ] 文档中没有管理员密码、token、模型 Key。

## 7. 回滚

### 7.1 回滚源码

从 `_backup/<stage>-<timestamp>/` 取回改动前文件：

```powershell
Copy-Item _backup\a2-20261125-1732\app-v6.css public\assets\css\app-v6.css -Force
```

然后重新构建并发布。备份目录不进仓库。

### 7.2 回滚线上

- GitHub Pages：用上一个 commit 重新发布 `dist`，或 revert 对应 commit。
- 源码：用 GitHub revert / 重新提交旧文件。
- Gitee：用 `git revert` 或按备份文件重新提交。

## 8. 相关文档

- [02-architecture.md](02-architecture.md)
- [05-testing.md](05-testing.md)
- [06-privacy-security.md](06-privacy-security.md)
