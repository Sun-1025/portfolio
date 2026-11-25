# 隐私与安全边界

## 1. 一句话原则

**公开仓库只放公开代码和公开素材；密码、密钥、用户数据、私密内容一律不进 Git。**

## 2. 绝对不提交的文件

| 路径 | 原因 |
|---|---|
| `.env`、`.env.local` | 管理员密码、JWT secret、模型密钥 |
| `data/users.json` | 管理员账号与 bcrypt 密码哈希 |
| `data/.jwt-secret` | 会话签名密钥 |
| `data/backups/` | 内容历史备份，可能包含私密内容 |
| `data/guestbook.json` | 访客留言与个人信息 |
| `private/` | 本机私密备份、证书、密码文件 |
| `qa/` | 浏览器 QA 产物，可能含页面和个人信息 |
| `_shots/`、`_backup/` | 截图和回滚备份，不是源码 |
| `node_modules/`、`dist/`、`.next/` | 依赖和构建产物，可重建 |
| 任意 `*.log`、诊断文件、token 文件 | 可能含路径、请求头或凭据 |

`.gitignore` 已覆盖这些路径；同步脚本还会再做一层白名单/黑名单过滤。

## 3. 管理员密码

- 仓库和 docs **不记录明文密码**。
- 后台密码只在本机 `.env` 或后台“系统 → 账号”里维护。
- `data/users.json` 只保存 bcrypt 哈希，且被 `.gitignore` 忽略。
- `scripts/init-admin.js` 输出只显示“已重置/已新增”，不打印密码。
- 如果密码曾经出现在公开提交：
  1. 立即在后台修改密码；
  2. 从当前 tree 删除含密码的文档；
  3. 如果仓库是公开的，优先轮换密码，再评估是否需要重写历史；
  4. 不要把旧密码继续用于任何环境。

本轮仓库整理发现旧版后台手册里出现过明文密码，已经做了两件事：

- 文档改为“密码只在本机配置中维护”，不再写具体值；
- 在本机完成一次管理员密码轮换，新密码放在 `private/admin-password.txt`，不进入仓库。

登录后台后建议立即在“系统 → 账号”改成自己记得住的强密码，并删除 `private/admin-password.txt`。

## 4. Token 与密钥

- GitHub token 只从 Windows 凭据管理器读取；`sync/push-source.ps1` 不包含 token 字面量。
- Gitee token 只在本机凭据中使用；不要把 token 写入 `.git/config`、README 或 issue。
- `ai-server` 的模型 Key 只在服务端环境变量 `LLM_API_KEY` 中；前端永远拿不到。
- JWT secret 自动生成到 `data/.jwt-secret`，不提交。
- 任何截图、日志、命令行历史里如果出现 token，按泄露处理并立即轮换。

## 5. 个人隐私

- README 和 docs 不复制邮箱、QQ、微信、手机号、住址等联系方式；需要联系时走站点页脚或仓库 Issue。
- 站点公开的联系方式由 `data/site.json` 管理；不想公开时在后台把对应条目设为 `private`。
- 公开照片只放 `public/assets/photos/`；私密照片、儿童正脸、证件、财务截图不放入公开目录。
- 后台账号、访客留言、审计日志属于私密数据，不进入 `dist`，也不进入源码仓库。
- 截图中如出现个人信息，发布前要裁掉或打码，不把原始截图提交。

## 6. 私密内容的双层过滤

`src/content-filter.js` 在两层生效：

1. API：公开接口只返回 `published` 且 `visible` 的内容；`private` 返回占位，`draft`/`deleted` 不返回。
2. 静态导出：`scripts/export-static.js` 复用同一套过滤，私密内容和私密图片引用不会写入 `dist`。

只在接口过滤是不够的；只在导出过滤也不够。两层必须用同一套语义，避免“页面看不见但文件里还在”。

## 7. 上传与后台

- 上传只允许位图格式，排除 SVG。
- 上传大小上限 8MB；文件名重写，避免路径穿越。
- 后台使用 JWT + HttpOnly Cookie；前端 JS 读不到 token。
- 登录失败限流；会话有时长。
- 后台建议只在本机/局域网/Tailscale 使用；公网必须加 HTTPS 和额外访问控制。
- GitHub Pages 是纯静态，不含后台与 API；不要把后台部署到公开无鉴权的地址。

## 8. 发布前安全检查

```powershell
# 仓库候选文件里不应出现明文密码或真实 token
Get-ChildItem docs,README.md,CHANGELOG.md -Recurse -File |
  Select-String -Pattern 'ADMIN_PASSWORD=.+[^r]|LLM_API_KEY=sk-|Bearer [A-Za-z0-9]'

# 不应被加入 tree 的目录
Test-Path data/users.json
Test-Path data/.jwt-secret
Test-Path private
Test-Path qa
```

预期：文档中无明文密码；敏感路径即使存在，也不在同步清单里。

## 9. 如果发生泄露

1. **先轮换**：改管理员密码、轮换 JWT secret、撤销并重建 token/API Key。
2. **再移除**：从当前 tree 删除泄露文件，提交说明写清楚。
3. **再评估历史**：公开仓库的历史 commit 仍可能被检索；必要时重建仓库历史或联系平台清理缓存。
4. **最后复盘**：把“为什么写进文档/脚本/日志”写进流程，避免下次重复。

## 10. 相关文档

- [04-build-deploy.md](04-build-deploy.md)
- [05-testing.md](05-testing.md)
- [08-admin-guide.md](08-admin-guide.md)
