# 架构与代码地图

## 1. 分层

```
浏览器
  │
  ├─ 前台 SPA
  │    public/index.html
  │    public/assets/js/app.js
  │    public/assets/css/app.css + app-v5.css + app-v6.css
  │      ├─ 首页 / 经历 / 项目详情
  │      ├─ 工具箱 / 工具详情
  │      ├─ 关于 / 留言板
  │      └─ 主题、滚动、AI 入口、回到顶部
  │
  ├─ 经典版
  │    public/classic/index.html（独立静态归档）
  │
  └─ 后台
       public/admin/index.html + assets/js/admin.js
         │
         └─ Express API
              ├─ /api/auth
              ├─ /api/content
              ├─ /api/events
              ├─ /api/guestbook
              ├─ /api/publish
              └─ /api/upload
                   │
                   └─ data/site.json（唯一内容源）
```

静态发布时，Express 不参与：`scripts/export-static.js` 把 `public/` 和 `data/site.json` 的公开部分导出为 `dist/`，再推到 GitHub Pages。

## 2. 关键模块

| 模块 | 职责 | 不负责 |
|---|---|---|
| `src/store.js` | JSON 读写、原子写入、自动备份、用户持久化 | HTTP 参数校验、页面渲染 |
| `src/auth.js` | JWT 签名/校验、HttpOnly Cookie、限流、会话时长 | 用户界面、内容结构 |
| `src/content-filter.js` | 内容白名单、公开过滤、私密占位、图片引用收集 | 页面排版、上传 |
| `src/routes/*` | HTTP 路由、参数校验、调用 store/auth | 直接改 DOM |
| `public/assets/js/app.js` | SPA 路由、渲染、主题、SSE、AI 入口 | 直接读写文件 |
| `public/assets/js/admin.js` | 后台卡片、表单、保存、媒体、备份 | 服务端鉴权 |
| `public/tools/*.js` | 单个工具的 `render(root, ctx)` | 主站路由和账户 |
| `scripts/export-static.js` | 构建静态 `dist/` | 运行时 API |
| `ai-server/` | 可选的服务端模型代理、限流、SSE 转发 | 主站内容存储 |

## 3. 请求与数据流

### 3.1 前台读取内容

```
GET /api/content
  → src/routes/content.js
  → content-filter（按可见性过滤）
  → data/site.json
  → 返回 JSON
  → app.js 渲染
```

静态版没有 API 时，`app.js` 回退读取 `/data/site.json`；如果连这个文件也没有，就显示空状态而不是红字。

### 3.2 后台保存

```
后台表单
  → state.content（内存）
  → PUT /api/content
  → 字段白名单 + 长度/URL/颜色校验
  → store.writeAtomic()（临时文件 + rename）
  → 自动备份到 data/backups/
  → SSE 广播 content
  → 前台重新拉取并重渲染
```

### 3.3 静态发布

```
data/site.json
  → scripts/export-static.js
  → content-filter（私密内容只留占位）
  → dist/（无后台、无 API）
  → GitHub Pages
```

`dist` 里不会出现 `data/users.json`、`data/.jwt-secret`、`data/backups/`、`private/`。

### 3.4 AI 请求

```
public/assets/js/ai-dock.js
  → POST ai-server /api/chat
  → 服务端读取 LLM_API_KEY
  → 上游 OpenAI-compatible endpoint
  → SSE 流回前端
```

密钥只在 `ai-server` 的服务端环境变量中，前端永远拿不到 `LLM_API_KEY`。

## 4. 路由

| 路由 | 内容 | 说明 |
|---|---|---|
| `#/` | 首页 | hero、精选项目、时间线、关于、联系方式、校园照片 |
| `#/work` | 经历/项目列表 | 支持分类和详情 |
| `#/work/:id` | 项目详情 | 项目、实习、校园、兴趣案例 |
| `#/tools` | 工具箱 | 文件转换、Markdown、字数、单位、日期 |
| `#/tools/:id` | 工具详情 | 动态 import 对应模块 |
| `#/about` | 关于 | 完整经历与说明 |
| `#/guestbook` | 留言板 | 后端不可用时回退静态状态 |
| `/classic/` | 经典版 | 独立静态页，不走 SPA |
| `/admin` | 后台 | 只在 Node 服务模式可用 |

导航与分支是两套开关：`nav.visible` 控制入口是否显示，`branches.visible` 控制 SPA 路由是否允许访问。经典版是独立页面，不经过 SPA 分支。

## 5. 视觉层

- `app.css`：基础 token、布局、通用组件、工具台和 AI 面板。
- `app-v5.css`：v5 极简科技主体、项目卡、时间线、关于页、相册。
- `app-v6.css`：v6 交互层、回到顶部、Tooltip、Focus Cards、Glare 和 Threads scoped 修正。
- `public/assets/js/threads.js`：WebGL2 线束背景；只依赖 `PointerBus`，不直接监听全局指针。
- `public/assets/js/backtop.js`：滚动阈值与按钮状态。
- `public/assets/js/ai-dock.js`：助手面板、气泡、消息流和错误状态。

主题切换写在 `<html data-theme="dark|light">` 上，CSS 变量分别定义深色和浅色。浅色不是深色反色，而是单独一套玻璃、边框、文字和阴影。

## 6. 目录与扩展点

```text
public/tools/
  converter.js       # 文件转换台
  docs-core.js       # Markdown / 文档
  data-core.js       # 字数、单位、日期
```

新增工具只需要：

1. 在 `public/tools/` 新建模块，导出 `render(root, ctx)`。
2. 在 `data/site.json` 的 `tools.items` 注册 `id`、`module`、名称、分类和排序。
3. 不改 `app.js`，由动态 `import()` 加载。
4. 用浏览器本地逻辑，不把用户文件发到服务端。

新增项目、时间线、相册、导航、公告都走后台内容编辑，不新增页面代码。

## 7. 故障与降级

| 故障 | 行为 |
|---|---|
| WebGL2 不可用 | 不初始化 Threads，恢复 `.site-grid` |
| 页面隐藏 | 暂停渲染，避免后台耗电 |
| `prefers-reduced-motion` | 不播放动态背景 |
| `/api/content` 不可用 | 回退 `/data/site.json` |
| AI 未配置 | 前端提示未配置，不阻塞浏览 |
| 上传格式不允许 | 服务端拒绝，前端提示 |
| 私密内容 | API 和导出两层都替换为占位 |
| 静态站后台入口 | 页面存在但 API 不可用，提示只在本地使用 |

## 8. 安全边界

- JWT 使用 HttpOnly Cookie，前端 JS 不读取 token。
- 登录失败限流；会话有时长。
- 上传使用 multer + 后缀/类型白名单，排除 SVG。
- 所有用户内容输出走转义；外链走 URL 白名单。
- 后台建议只在本机/局域网/Tailscale 访问；公网部署必须加 HTTPS 与访问控制。
- 仓库不保存管理员密码、JWT secret、用户数据、模型密钥。

## 9. 相关文档

- [03-data-and-cms.md](03-data-and-cms.md)
- [04-build-deploy.md](04-build-deploy.md)
- [05-testing.md](05-testing.md)
- [06-privacy-security.md](06-privacy-security.md)
