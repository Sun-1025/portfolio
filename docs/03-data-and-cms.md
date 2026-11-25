# 数据模型与后台

## 1. `data/site.json` 顶层

```json
{
  "site": {},
  "nav": [],
  "branches": [],
  "home": {},
  "work": { "cases": [] },
  "interests": [],
  "tools": { "items": [] },
  "ai": {},
  "notices": [],
  "settings": {}
}
```

| 字段 | 含义 |
|---|---|
| `site` | 站点标题、品牌、描述、主题色、页脚、版本 |
| `nav` | 一级导航入口顺序与可见性 |
| `branches` | SPA 分支开关与排序 |
| `home` | 首屏、精选项目、时间线、关于、联系方式、校园照片 |
| `work.cases` | 项目/实习/校园/兴趣案例 |
| `interests` | 兴趣相册分组 |
| `tools.items` | 工具条目、模块文件、分类、排序 |
| `ai` | 站内 AI 开关、接口地址、快捷问题 |
| `notices` | 公告 |
| `settings` | 会话时长、空闲时长、经典版入口显示 |

## 2. 常见条目字段

### 2.1 项目案例

```json
{
  "id": "example-project",
  "title": "示例项目",
  "summary": "一句话说明",
  "category": "project",
  "status": "published",
  "cover": "/assets/covers/site.svg",
  "images": ["/assets/photos/projects/example.webp"],
  "sections": [{ "title": "做了什么", "body": "..." }],
  "links": [{ "label": "源码", "url": "https://example.com" }],
  "order": 1
}
```

`category` 支持 `project`、`internship`、`campus`、`hobby`。`id` 同时是详情页地址的一部分，必须唯一。

### 2.2 工具条目

```json
{
  "id": "converter",
  "name": "文件转换台",
  "desc": "浏览器本地转换",
  "category": "convert",
  "module": "converter.js",
  "icon": "CV",
  "enabled": true,
  "order": 1
}
```

`module` 对应 `public/tools/<module>`；工具模块必须导出 `render(root, ctx)`。

### 2.3 联系方式

联系方式也是内容条目，有自己的 `visible`、`status`、`order` 和 `url`。公开站点只显示 `published` 且 `visible` 的条目；私密内容在接口和导出两层都不会出现真实值。

> 仓库文档不复制真实邮箱、QQ、微信等信息。需要修改时，在后台“联系方式”里改，或直接编辑本机 `data/site.json`。

## 3. 三种可见性

| 状态 | API | 静态导出 | 用途 |
|---|---|---|---|
| `published` | 返回真实内容 | 写入 | 公开内容 |
| `private` | 返回占位对象 | 写占位或省略 | 只在本机预览，不公开 |
| `draft` | 后台可见，公开接口不返回 | 不写入 | 未完成内容 |
| `deleted` | 回收站 | 不写入 | 可恢复的删除 |

`src/content-filter.js` 是唯一语义来源；接口、前台和导出都复用它，避免“接口过滤了但静态文件没过滤”。

## 4. 后台能做什么

- 按类型浏览内容卡片。
- 新建、编辑、删除、排序、恢复、彻底删除。
- 切换 `published / private / draft`。
- 给私密内容生成短期预览令牌（默认 10 分钟）。
- 管理媒体库、查看操作记录、创建备份。
- 点击“发布上线”，触发构建并推送 Pages。

后台不能：

- 读取管理员密码明文。
- 修改 JWT secret。
- 读取模型 API Key。
- 直接访问 `private/`。

## 5. 数据写入与备份

`src/store.js` 的写入流程：

1. 校验对象类型和大小（上限 8MB）。
2. 写临时文件 `site.json.<timestamp>.tmp`。
3. 原子 `rename` 替换正式文件。
4. 每次保存前复制一份到 `data/backups/site-<timestamp>.json`。
5. 只保留最近 30 份备份。

`data/backups/` 被 `.gitignore` 忽略，不能提交。

## 6. 静态导出

`scripts/export-static.js` 做四件事：

1. 复制 `public/` 到 `dist/`。
2. 用 `content-filter` 读取公开内容，写 `dist/data/site.json`。
3. 压缩图片、CSS、JS，保留 `CNAME`。
4. 跳过后台 API、私密内容、`data/users.json`、`data/.jwt-secret`、备份和 `private/`。

导出完成后，`dist` 是一个纯静态站点：没有登录、没有写入接口、没有服务端密钥。

## 7. 数据维护建议

- 修改内容前先备份 `data/site.json`。
- 不要把 `data/users.json`、`.jwt-secret`、`audit.json`、`backups/` 放进任何公开仓库。
- 图片先压缩再上传；公开照片放 `public/assets/photos/`，私密照片不要放。
- 工具模块和内容条目分开管理：代码变更走 Git，内容变更走后台。
- 大改前用 `_backup/<stage>-<timestamp>/` 保留旧文件，出问题可原样回滚。

## 8. 相关文档

- [02-architecture.md](02-architecture.md)
- [04-build-deploy.md](04-build-deploy.md)
- [08-admin-guide.md](08-admin-guide.md)
