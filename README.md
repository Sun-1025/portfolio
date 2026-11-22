# 孙志昊 · 个人作品集

> 一个零依赖、单文件驱动的个人作品集网站：六条成长分支、随视线转动的场景、可可视化维护的内容后台。

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)
![Sveltia CMS](https://img.shields.io/badge/Sveltia_CMS-0.270.1-2E7D32)
![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub_Pages-222222?logo=github)
![License](https://img.shields.io/badge/License-MIT-cdd96b)

---

## 项目简介

这是孙志昊的个人作品集站点（[sunzhihaoai.top](https://sunzhihaoai.top)）。

站点没有使用任何前端框架，也没有构建步骤：所有结构、样式、交互都收在一个 `index.html` 里，文案与案例数据抽到 `site.json`。访客进入页面后看到的是一张暗色场景与六条分支，鼠标移动时人物视线跟随，点击分支展开对应面板；内容维护者则通过 `/admin/` 的可视化后台改文案、传图片、发布上线，不需要碰源码。

项目按开源项目规范组织：文档、许可证、变更记录、素材脚本、部署说明齐备，可直接 fork 后替换 `site.json` 变成自己的主页。

### 在线访问

- 主站：<https://sunzhihaoai.top>
- 后台：<https://sunzhihaoai.top/admin/>（需 GitHub 账号授权）

---

## 功能特性

| 模块 | 说明 |
| --- | --- |
| 六条成长分支 | 个人简介、校园经历、项目经历、实习经历、兴趣爱好、其他方向，节点带轻微旋转与错位，避免整齐到呆板 |
| 场景视线追踪 | 鼠标位移驱动 12 方向场景图切换（30°/60° 斜角），带滞回与 260ms 步进，避免来回抖动 |
| 分支连线 | 根据椭圆边缘交点实时计算贝塞尔曲线，节点悬停时对应连线高亮 |
| 详情面板 | 点击节点展开，支持小节正文、标签、外链、配图轮播与阅读进度条 |
| 双击问候 | 双击场景空白处弹出问候气泡，`Esc` 或再次双击关闭 |
| 明暗主题 | 默认深色，可切换浅色；选择写入 `localStorage`，刷新保持 |
| 访客留言 | 基于 giscus + GitHub Discussions 的悬浮留言板，按需加载，不拖慢首屏 |
| 可视化后台 | Sveltia CMS（Decap 兼容），GitHub OAuth 登录，字段化编辑 `site.json` |
| SEO | canonical、Open Graph、Twitter Card、JSON-LD 人物结构化数据、`sitemap.xml`、`robots.txt` |
| 访问统计 | 页脚 hits.sh 徽章计数，零后端 |
| 响应式 | 移动端折叠为纵向布局，隐藏连线与部分装饰，尊重 `prefers-reduced-motion` |

---

## 技术栈

| 层次 | 选型 | 说明 |
| --- | --- | --- |
| 页面结构 | HTML5 | 语义化标签、ARIA 标注、内联 SVG 图标 |
| 样式 | CSS3 | 自定义属性做设计令牌、Grid/Flex 布局、`backdrop-filter` 玻璃质感、`clamp()` 流体字号 |
| 交互 | 原生 JavaScript（ES6+） | 无框架、无打包、无第三方运行时依赖 |
| 数据 | JSON + `fetch` | `site.json` 异步覆盖内联兜底数据，接口失败也不白屏 |
| 内容后台 | Sveltia CMS 0.270.1 | Decap CMS 的现代替代，`config.yml` 语法兼容 |
| 后台鉴权 | Netlify Functions | 自建 GitHub OAuth proxy，绕过 SaaS 依赖 |
| 评论系统 | giscus | 数据存放在仓库 Discussions，无第三方数据库 |
| 托管 | GitHub Pages | `main` 分支根目录直接发布 |
| 域名与证书 | 阿里云 DNS + GitHub 免费 HTTPS | 4 条 A 记录 + `www` CNAME |
| 访问统计 | hits.sh | 徽章式计数，无脚本侵入 |

---

## 项目结构

```text
.
├── index.html                 # 主站入口：结构 + 样式 + 交互全部内联
├── site.json                  # 全站内容数据（后台读写的数据源）
├── sitemap.xml                # 搜索引擎站点地图
├── robots.txt                 # 爬虫规则
├── CNAME                      # GitHub Pages 自定义域名
├── admin/
│   ├── index.html             # Sveltia CMS 挂载页
│   └── config.yml             # 后台字段、集合与发布配置
├── assets/                    # 场景图与配图（webp 为主）
│   ├── scene-front.webp       # 正视角
│   ├── scene-left/right/up.webp
│   ├── scene-{rb30,lb30,rt30,rt60,lt30,lt60}.webp
│   ├── scene-ydim.webp        # 暗态场景底图
│   ├── entj.webp              # 性格卡片配图
│   ├── library-shot.webp      # 项目详情配图
│   ├── portrait-dark.webp     # 结构化数据头像
│   └── _raw/                  # 原始大图，仅本地保留，已被 .gitignore 排除
├── oauth-proxy/               # Netlify Functions 版 GitHub OAuth 代理
│   ├── api/                   # /api/auth、/api/callback
│   ├── netlify/functions/     # 函数实现（与 api/ 同源）
│   ├── public/index.html      # 代理落地页
│   ├── netlify.toml
│   └── package.json
├── scripts/                   # 素材处理脚本（可选，运行站点不需要）
├── docs/
│   ├── 使用手册.md
│   ├── 功能介绍.md
│   ├── 后台管理.md
│   ├── 部署文档.md
│   ├── deploy/                # DNS zone 参考文件
│   └── archive/               # 历史版本文档
├── CHANGELOG.md
├── LICENSE
└── README.md
```

---

## 本地启动

站点是纯静态文件，两种方式都能看：

**方式一：直接打开**

双击 `index.html` 即可。此时浏览器以 `file://` 协议加载，`fetch('site.json')` 会被同源策略拦截，页面使用 `index.html` 内联的兜底数据，样式与交互完全正常。

**方式二：起一个本地服务（推荐）**

需要看到 `site.json` 的真实内容时，用任意静态服务器：

```bash
# Python 3
python -m http.server 8000

# 或 Node.js
npx serve .
```

然后访问 <http://localhost:8000>。后台 `/admin/` 在本地同样可用，但它提交的是线上仓库，调试时请勿误发布。

**环境要求**

- 现代浏览器（Chrome / Edge / Safari 16+ / Firefox）
- 可选的 Python 3.9+（仅素材脚本与本地服务器需要）

---

## 使用教程

### 访客侧

1. 打开首页，移动鼠标：场景会随视线方向切换到对应角度。
2. 点击左右六个分支节点：展开对应面板，面板顶部有阅读进度条。
3. 在项目/实习详情里，可查看配图轮播、标签与小节正文，外链在新标签页打开。
4. 双击场景空白处：弹出问候气泡。
5. 按 `Esc`：依次关闭详情、面板与气泡。
6. 右下角「留言」按钮：展开 giscus 留言板，需 GitHub 账号登录后发言。
7. 顶部主题按钮：在深色与浅色之间切换，选择会记住。

### 维护者侧

1. 进入 `/admin/`，用 GitHub 账号登录。
2. 在 `Site` 集合里修改文案、案例、联系方式与留言板说明。
3. 点 `Publish` 提交，GitHub Pages 会在 1 分钟左右重建。
4. 需要换图时，在媒体库上传到 `assets/uploads/`，再把字段指向该路径。

字段含义与逐项说明见 [docs/后台管理.md](docs/后台管理.md)。

---

## 后台登录与使用

| 项目 | 值 |
| --- | --- |
| 后台地址 | `https://sunzhihaoai.top/admin/` |
| 登录方式 | GitHub OAuth（首次需授权一次） |
| 数据仓库 | `Sun-1025/Sun-1025.github.io`，分支 `main` |
| 数据文件 | `site.json` |
| 媒体目录 | `assets/uploads/` |
| 发布模式 | 简单模式（保存即提交，无草稿队列） |
| 授权代理 | `https://sunzhihao-cms-auth.netlify.app` |

**登录步骤**

1. 打开后台，点 `Login with GitHub`。
2. 首次进入会跳到 GitHub 授权页，确认 `Sun-1025/Sun-1025.github.io` 的读写权限。
3. 授权后自动回到后台，左侧出现 `Site` 集合。
4. 编辑完成点右上角 `Publish`，等待 Pages 重建即可。

**注意事项**

- Token 默认有效期约 8 小时，过期后后台提示重新登录，属正常现象。
- 后台只允许仓库协作者登录；新增维护者需先在 GitHub 仓库 `Settings → Collaborators` 授权。
- 误发布可在仓库提交历史里回滚，`site.json` 每次发布都有独立 commit。

---

## 功能分支说明

当前仓库为单分支 `main`，直接对应线上站点。后续迭代按下面的分支约定推进，互不干扰：

| 分支 | 用途 | 合并目标 |
| --- | --- | --- |
| `main` | 线上稳定版，GitHub Pages 发布源 | — |
| `feature/admin-crud` | 自建可视化后台（登录、增删改、媒体管理） | `main` |
| `feature/tools` | 在线工具分支（文档转换、信息查询） | `main` |
| `feature/ui-refresh` | 新 UI 模板替换，旧页面保留为独立入口 | `main` |
| `legacy/classic-ui` | 现行单页版本的存档分支 | 只读保留 |

约定：功能分支从 `main` 切出，完成后提交 Pull Request；`main` 始终保持可发布状态。

---

## 部署方式

### 方案一：GitHub Pages（当前线上方案）

1. 仓库 `Settings → Pages`，Source 选择 `Deploy from a branch`，分支 `main`、目录 `/ (root)`。
2. 自定义域名填 `sunzhihaoai.top`，仓库根目录保留 `CNAME` 文件。
3. 勾选 `Enforce HTTPS`，等待证书签发（通常几分钟到半小时）。
4. DNS 侧配置：

| 类型 | 主机记录 | 记录值 |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `sun-1025.github.io` |

### 方案二：任意静态托管

项目没有构建产物，把仓库根目录整个上传到 Netlify / Vercel / Cloudflare Pages / 对象存储均可。若使用自定义域名，记得把 `CNAME` 文件按平台规则处理。

### 后台 OAuth 代理部署

`oauth-proxy/` 是 Netlify Functions 实现，部署步骤：

```bash
cd oauth-proxy
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

在 Netlify 站点环境变量里配置：

| 变量 | 说明 |
| --- | --- |
| `GITHUB_CLIENT_ID` | GitHub OAuth App 的 Client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App 的 Client Secret |

GitHub OAuth App 的回调地址填 `https://<你的代理域名>/api/callback`，再把 `admin/config.yml` 的 `base_url` 指向该域名。

完整的部署、迁移与排错步骤见 [docs/部署文档.md](docs/部署文档.md)。

---

## 开发过程

| 阶段 | 内容 |
| --- | --- |
| 一 | 单页原型：场景图、六节点、详情面板，先跑通交互 |
| 二 | 接入专属域名与 HTTPS，处理 `www` 跳转与证书覆盖 |
| 三 | 接入 Sveltia CMS 与自建 OAuth 代理，内容与代码分离 |
| 四 | 接入 giscus 留言板，评论存进仓库 Discussions |
| 五 | 性能与体验：webp 替换、SEO 元信息、站点地图、访问计数、响应式、明暗主题 |
| 六 | 开源规范化：目录整理、文档体系、许可证、变更记录 |

设计上刻意保持「单文件」形态：没有构建链，任何一台电脑打开就能改；代价是 `index.html` 体积偏大（约 115 KB），因此用分区注释把 CSS 与 JS 划成可检索的模块。

---

## 已知问题

1. **`file://` 下数据不生效**：直接双击打开时 `site.json` 被同源策略拦截，只显示内联兜底数据，属预期行为。
2. **后台 Token 会过期**：GitHub OAuth App 默认签发 8 小时令牌，超时需重新登录。
3. **拦截器可能挡住留言板**：AdGuard 等工具会破坏 `giscus.app` 的压缩响应，表现为 `ERR_CONTENT_DECODING_FAILED`，将本站与 `giscus.app` 加入白名单即可。
4. **首屏素材偏重**：场景图合计约 3 MB，弱网或移动端首屏会有等待；后续可做按方向懒加载。
5. **单一数据文件**：所有内容集中在一个 `site.json`，多人同时编辑容易冲突。
6. **无草稿工作流**：当前为简单模式，发布即上线，没有预览环境。
7. **国内访问速度一般**：GitHub Pages 边缘节点在境外，电信/联通晚高峰偶有卡顿。

---

## 后续迭代计划

按优先级排列，均以「不改动现有交互与视觉」为前提增量实施：

1. **自建可视化后台**
   - 管理员登录（OAuth + 会话保持）
   - 内容增删改查、媒体库、发布前预览
   - 解决 token 过期与草稿缺失问题
2. **架构拆分**
   - 个人形象主页与在线工具拆成两个入口
   - 工具区预留文档转换（PDF/Word/Markdown）、信息查询（IP/域名/汇率）扩展位
   - 共用一套 `site.json` 数据与设计令牌
3. **内网部署方案**
   - 提供 Docker Compose + Nginx 一键起站
   - 内网镜像与外网版本共用仓库，按环境变量切换数据源
   - 解决外网访问卡顿，保留公网入口
4. **开源 UI 模板替换**
   - 筛选高质量开源模板，重做主站视觉
   - 现行页面保留为 `legacy/classic-ui` 独立分支与入口
   - 新旧 UI 共用同一后台与数据文件

---

## 许可

本项目基于 [MIT License](LICENSE) 开源，可自由使用、修改与分发，请保留版权声明。

站点内的个人经历、照片与案例内容归作者本人所有，仅用于展示，不代表授权商用。
