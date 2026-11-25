# 孙志昊 · 个人站 portfolio-v2

> 技术名片、成长档案和自研工具，放在同一个长期维护的个人站点里。
>
> 线上站点：<https://sunzhihaoai.top>  
> 经典版归档：<https://sunzhihaoai.top/classic/>  
> GitHub：<https://github.com/Sun-1025/portfolio>  
> Gitee：<https://gitee.com/SunZHAO1025/portfolio>

这是一个可以直接运行、构建和部署的完整源码仓库，不只是页面截图。前台、后台、内容数据、在线工具、构建脚本和部署脚本都在这里；管理员密码、JWT 密钥、用户数据和私密素材不在仓库里。

## 当前状态

- 站点版本：v5.0 主体 + v6 UI/UX + A2 Threads 动态背景 + A3 布局收口。
- 页面：首页、经历/项目、项目详情、工具箱、工具详情、关于、留言板、后台、经典版归档。
- 主题：深色 / 浅色双主题；桌面、平板、390px 手机已做过回归。
- 后台：`/admin` 可视化内容管理，支持条目编辑、排序、公开/私密/草稿、回收站、媒体库、备份和发布。
- 工具：文件转换台、Markdown 转 HTML、字数统计、单位换算、日期计算；工具逻辑全部在浏览器本地运行。
- 最新本地构建：`72` 个文件，`10,199,202` 字节（约 9.73 MB）。
- A2 验收：`dist` 构建通过；深色对比度 17.14:1，浅色 15.75:1；60s 桌面 rAF 平均 4.166ms；390×844 无横向溢出；WebGL2 不可用、页面隐藏、`prefers-reduced-motion` 均有降级路径。
- A3 收口：关于页右侧信息栏与主栏垂直居中；回到顶部按钮文字上下居中；工具台左右两栏等高、等宽，右侧投放区与空队列约 2:1；站内 Agent 增加气泡提示。

## 这个仓库包含什么

| 目录/文件 | 作用 |
|---|---|
| `public/` | 前台 SPA、经典版、后台、工具模块、CSS、公开图片等静态资源 |
| `src/` | Express 服务、鉴权、内容过滤、内容读写、上传、留言、发布、SSE |
| `scripts/` | 静态导出、管理员初始化、内容迁移等构建/运维脚本 |
| `ai-server/` | 可选的 Next.js AI 代理，负责服务端持有模型密钥、限流、SSE 转发 |
| `data/site.json` | 站点公开内容的唯一数据源；真实私密数据不进入仓库 |
| `docs/` | 架构、数据、部署、测试、隐私和版本过程文档 |
| `sync/` | GitHub Pages 发布与源码同步脚本；脚本从本机凭据读取密钥，不保存 token |
| `CHANGELOG.md` | 版本演进记录 |

`dist/` 是构建产物，不提交；执行 `npm run build` 可随时重建。

## 技术栈

- 前端：原生 HTML / CSS / JavaScript，SPA hash 路由，无前端框架运行时。
- 服务：Node.js 18+、Express 4、JWT + HttpOnly Cookie、SSE。
- 内容：JSON 文件 + 原子写入 + 自动备份；后台做字段白名单和可见性过滤。
- 样式：CSS 自定义属性 + Tailwind CLI 只负责工具类产物；视觉主体在 `app.css`、`app-v5.css`、`app-v6.css`。
- 动效：React Bits Threads 思路的 WebGL2 线束背景（`public/assets/js/threads.js`），原生 ESM、零依赖、单 `pointermove` 监听。
- 工具：浏览器端原生模块，动态 `import()` 加载；不把用户文件上传到服务器。
- AI：可选的 Next.js 代理；没有配置模型环境变量时，前端仍可正常显示，不阻塞主站。
- 部署：静态导出到 GitHub Pages；源码同时同步 GitHub 与 Gitee；`sunzhihaoai.top` 自定义域名与 CNAME 保留。

## 快速启动

```powershell
git clone https://github.com/Sun-1025/portfolio.git
cd portfolio
npm install
copy .env.example .env
npm start
```

打开 `http://localhost:8080`。首次启动会在本机生成 `data/users.json` 与 `data/.jwt-secret`，两者都被 `.gitignore` 忽略。

后台地址：`http://localhost:8080/admin`。账号与密码只在本机配置中维护；仓库不提供默认密码。

## 构建

```powershell
npm run build
```

构建会先压缩 Tailwind CSS，再由 `scripts/export-static.js` 导出 `dist/`。当前配置导出到站点根路径；部署到子路径时使用对应的 `--base` 参数重新导出。

构建后应检查：

- `dist/index.html` 存在，且 `/assets/js/threads.js` 被引用。
- `dist/assets/js/dotfield.js` 不存在。
- `dist` 文件数和总体积与本次构建一致。
- `dist/CNAME` 保留自定义域名。

## 目录地图

```text
portfolio-v2/
├─ public/
│  ├─ index.html                 # 前台入口
│  ├─ classic/index.html         # 经典版归档
│  ├─ admin/                     # 可视化后台
│  ├─ assets/
│  │  ├─ css/                    # app.css / app-v5.css / app-v6.css / tailwind.css
│  │  ├─ js/                     # app.js / admin.js / threads.js / ai-dock.js / backtop.js
│  │  ├─ photos/                 # 站点公开照片与 manifest
│  │  └─ covers/                 # 项目封面
│  └─ tools/                     # 工具模块与转换逻辑
├─ src/
│  ├─ auth.js                    # JWT、Cookie、限流、会话
│  ├─ content-filter.js          # 可见性、私密占位、静态导出过滤
│  ├─ store.js                   # JSON 原子读写、备份、用户
│  └─ routes/                    # auth/content/events/guestbook/publish/upload
├─ scripts/
│  ├─ export-static.js           # dist 导出
│  ├─ init-admin.js              # 本机管理员初始化/重置
│  └─ migrate-content.js         # 内容迁移
├─ ai-server/                    # 可选 Next.js AI 代理
├─ data/site.json                # 公开内容源
├─ docs/                         # 详细文档
├─ sync/                         # Pages 发布与源码同步
├─ server.js
└─ package.json
```

## 页面与路由

- `#/`：首屏、精选项目、经历时间线、关于、联系方式、校园照片。
- `#/work`：项目/实习/校园/兴趣案例列表。
- `#/work/:id`：项目详情。
- `#/tools`：工具箱列表。
- `#/tools/:id`：工具详情，按 `module` 动态加载。
- `#/about`：关于与完整经历。
- `#/guestbook`：留言板；后端未配置时静态版自动回退。
- `/classic/`：经典版静态归档，保留旧入口。
- `/admin`：本机后台，只在 Node 服务模式可用，GitHub Pages 不提供后台与 API。

## 内容与后台

`data/site.json` 是唯一内容源，主要包含：

- `site`：站点标题、品牌、描述、主题色、页脚、版本。
- `nav` / `branches`：导航入口和 SPA 分支开关。
- `home`：首屏、精选项目、时间线、关于、联系方式、校园照片。
- `work.cases`：项目、实习、校园、兴趣案例。
- `interests`：兴趣相册。
- `tools.items`：工具条目与模块映射。
- `ai`：站内 AI 开关、接口地址、快捷问题。
- `notices` / `settings`：公告和运行设置。

后台支持三种可见性：`published`、`private`、`draft`。私密内容在 API 和静态导出两层都只保留占位，不会把真实内容带进公开页面。详细字段、接口和操作流程见 [docs/03-data-and-cms.md](docs/03-data-and-cms.md) 与 [docs/08-admin-guide.md](docs/08-admin-guide.md)。

## 设计与交互

- 深色是默认主视觉，浅色主题使用独立的玻璃材质；两套 token 都在 CSS 自定义属性里。
- 首页背景从 v6 的 DotField 迁移到 Threads：全屏跟随指针、没有卡片冻结区、没有遮罩；指针离开后用 260ms 时间常数回中。
- 卡片 hover 时使用 scoped 规则把 `backdrop-filter` 从 22px 降到 2px，保证线束能穿过卡面；默认卡面 token 不变。
- 回到顶部按钮 hover 时展开显示 `Back to Top`，文字在按钮内水平、垂直居中。
- 站内 Agent 使用流式 SSE，气泡提示在按钮左侧，打开面板后自动隐藏；所有指针交互只走 `PointerBus`，全站只保留一个 `pointermove` 监听。
- 移动端 390×844、桌面 1440×900、1920×1080、2560×1440 都已做过布局和溢出检查。

## 开发过程

这个站不是一次性成型的。它经历了经典版、v3 工具与 AI、v4 视觉重构、v5 极简导航、v6 UI 层、A1 点阵、A2 Threads、A3 布局收口等多个阶段；每一轮都保留了可回滚备份和验收记录。

完整施工过程、设计取舍、遇到的问题和修复方式见 [docs/01-build-story.md](docs/01-build-story.md)。版本节点见 [docs/07-version-history.md](docs/07-version-history.md)。

## 文档索引

- [docs/00-overview.md](docs/00-overview.md)：项目总览和阅读顺序
- [docs/01-build-story.md](docs/01-build-story.md)：从经典版到 A3 的完整施工过程
- [docs/02-architecture.md](docs/02-architecture.md)：分层、模块边界、请求与数据流
- [docs/03-data-and-cms.md](docs/03-data-and-cms.md)：内容模型、可见性、后台接口
- [docs/04-build-deploy.md](docs/04-build-deploy.md)：构建、GitHub Pages、自定义域名、同步
- [docs/05-testing.md](docs/05-testing.md)：测试矩阵、A2/A3 指标、已知边界
- [docs/06-privacy-security.md](docs/06-privacy-security.md)：仓库隐私边界、密钥管理、泄露处置
- [docs/07-version-history.md](docs/07-version-history.md)：版本表
- [docs/08-admin-guide.md](docs/08-admin-guide.md)：后台使用手册（不含密码）
- [docs/09-credits.md](docs/09-credits.md)：第三方素材与许可

## 隐私与安全

这个仓库是公开源码仓库，遵循以下边界：

- 不提交 `.env`、`.env.local`、`data/users.json`、`data/.jwt-secret`、`data/backups/`、`data/guestbook.json`、`private/`、`qa/`、`_shots/`、`_backup/`。
- 不提交管理员密码、GitHub/Gitee token、模型 API Key、JWT 签名密钥。
- 后台密码只在本机 `.env` 或后台账号设置中维护；文档不记录明文密码。
- 私密内容在内容层和导出层都会被过滤；私密照片不复制到 `dist/`。
- 站点公开的联系方式属于站点内容，不在 README 和 docs 里重复；如要撤下，直接在后台把对应条目设为私密。
- 如果密码曾经出现在某个提交中，应立即在后台修改密码，并清理对应文档；不要只删除当前文件而继续使用旧密码。

具体清单和处置步骤见 [docs/06-privacy-security.md](docs/06-privacy-security.md)。

## 第三方与许可

页面使用 React Bits Threads 的结构思路，工具台的部分交互参考 Uiverse 的开源按钮与表单；字体、图标和照片的授权与出处记录在 [docs/09-credits.md](docs/09-credits.md)。没有把第三方整包依赖直接塞进页面运行时。

## 维护约定

- 先改 `public/` 与 `src/` 的源码，再执行 `npm run build`；不要直接编辑 `dist/`。
- 任何视觉改动都要保留默认 token 与移动端回退，先量测再上线。
- 不把临时截图、QA 日志、备份目录、密钥文件加入 Git。
- 同步脚本只从 Windows 凭据管理器读取 token，token 不写入仓库。
- 远端推送前先检查 `git status` / tree 清单，确认没有密码、用户数据和私密素材。
