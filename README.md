# 孙志昊 · 个人站 3.0

个人主页 + 在线工具 + 可视化后台，保留原版 3D 场景页作为「经典版」。
3.0 采用 **Signal / Control Room** 视觉方向：近黑深空底、酸性绿与冰青信号色、坐标网格、HUD 数据面板、等宽字标签与克制动效。

## 视觉系统

- 主色：`#060809` 近黑 / `#d7ff4f` 酸性信号绿 / `#6ff5e4` 冰青遥测色
- 字体：Space Grotesk（标题）+ Inter（正文）+ JetBrains Mono（标签与数据）
- 间距：以 8px 为基础节奏；卡片、面板、导航均统一圆角与边框层级
- 原则：不超过 3 个主色；标题层级不超过 3 级；动效只用于状态反馈、信号脉冲和卡片光晕
- 首页肖像：使用奶白底身份照 `portrait-id-cream.webp`，保留经典版 3D 动漫人物的黑发、圆框眼镜与黑色 T 恤；`/classic/` 原场景入口仍保留

## 快速启动

```powershell
cd C:\Users\sun\OneDrive\Desktop\实习\portfolio-v2
npm install
npm start           # 默认 http://localhost:8080
```

首次启动会自动生成默认管理员 `admin` / `Admin@12345`。如需重置密码：

```powershell
npm run init -- admin 你的新密码
```

默认管理员：`admin` / `Admin@12345`。首次登录后，请立即到「账号设置」修改密码。

## 目录结构

```
portfolio-v2/
├─ server.js                 Express 入口
├─ src/
│  ├─ auth.js                JWT / Cookie / 登录限流 / 会话过期
│  ├─ store.js               JSON 内容库、原子写入、自动备份
│  └─ routes/
│     ├─ auth.js             登录、退出、会话信息、改密
│     ├─ content.js          内容读取 / 保存 / 备份恢复
│     ├─ upload.js           图片上传与媒体库
│     └─ events.js           SSE 内容更新推送
├─ public/
│  ├─ index.html             前台 SPA 壳
│  ├─ assets/css/app.css     新版主站样式
│  ├─ assets/js/app.js       路由、渲染、主题、SSE
│  ├─ admin/                 后台入口
│  ├─ assets/css/admin.css   后台样式
│  ├─ assets/js/admin.js     后台逻辑
│  ├─ classic/               经典版（原 3D 场景页）
│  ├─ tools/                 可插拔工具模块
│  └─ uploads/               后台上传的图片
├─ data/
│  ├─ site.json              站点内容库
│  ├─ users.json             管理员账号
│  └─ backups/               每次保存自动备份
├─ scripts/
│  ├─ init-admin.js          初始化管理员
│  └─ export-static.js       GitHub Pages / Cloudflare Pages 静态导出
├─ docs/                     后台手册、部署、扩展、模板选型
└─ deploy/                   启动/停止/开机自启脚本与反向代理示例
```

## 双分支

| 分支 | 入口 | 说明 |
|---|---|---|
| 个人主页 | `#/` / `#/work` | Hero、关于、项目、技能、经历、联系 |
| 在线工具 | `#/tools` | Markdown、字数、单位、日期四个工具 |
| 经典版 | `/classic/` | 原版 3D 黑板场景，完整保留 |

顶部导航统一；后台可控制分支显示/隐藏与导航排序。前台路由也会遵守分支隐藏开关。

## 常用命令

```powershell
npm run dev                  # 文件变动自动重启
npm run export               # 导出静态站到 dist/
npm run export -- --base=/repo/   # 导出到 GitHub Pages 子路径
```

导出后，`dist/` 可整体上传到 GitHub Pages、Cloudflare Pages 或任意静态主机。

## 数据与备份

- 内容：`data/site.json`
- 管理员：`data/users.json`（bcrypt 哈希）
- JWT 密钥：`data/.jwt-secret`（首次启动自动生成，**不要提交到公开仓库**）
- 每次保存自动复制到 `data/backups/`，保留最近 30 份；后台「备份恢复」可一键回滚。

## 文档

- [后台使用手册](docs/后台使用手册.md)
- [架构说明](docs/架构说明.md)
- [内网部署与访问加速](docs/内网部署与访问加速.md)
- [扩展开发指南](docs/扩展开发指南.md)
- [模板选型记录](docs/模板选型.md)

## 安全提醒

1. 上线前必须修改默认管理员密码。
2. 不要把 `data/.jwt-secret`、`data/users.json`、`data/backups/` 提交到公开仓库。
3. 后台只建议在局域网 / Tailscale 内访问；如需公网访问，请加 HTTPS 与反向代理，并限制 `/admin` 来源。
4. 上传白名单已排除 SVG，避免存储型 XSS。
