# 第三方素材与许可

> 这里记录的是“参考了什么”，不是把整个第三方项目打包进站点。具体许可证以各上游仓库的最新 LICENSE 为准。

## 1. 背景与交互参考

| 来源 | 用途 | 说明 |
|---|---|---|
| React Bits — Threads | 首页 WebGL2 线束背景的结构与参数思路 | `public/assets/js/threads.js` 是本站按施工单重写的原生 ESM 版本；未直接引入 React 运行时 |
| Uiverse | 回到顶部、按钮、表单的部分交互参考 | 具体组件在上游以各自许可证发布；本站只保留必要的 CSS/DOM 结构 |
| 经典版模板参考 | 早期页面结构与排版 | 只参考结构和组件组织，不套用整包依赖 |

## 2. 字体

站点优先使用系统字体和本地可用的无衬线字体；外部字体请求失败时会回退，不影响阅读。

如果后续引入具体字体文件，应在本文件补充：

- 字体名称
- 上游地址
- 许可证
- 是否允许商用/嵌入

## 3. 图标与插画

- 站点 Logo、封面、AI 助手标识为本站自制或 AI 辅助生成。
- 项目封面 `public/assets/covers/*.svg` 为本站资产。
- 个人照片与校园照片是站点公开素材；私密照片不进入 `public/`，也不进入仓库。
- 不把来源不明的图片、截图、字体、图标放入公开仓库。

## 4. 代码依赖

运行依赖和版本见 `package.json` / `package-lock.json`。主要依赖：

- Express
- bcryptjs
- jsonwebtoken
- multer
- sharp
- tailwindcss
- Next.js（仅 `ai-server` 可选部分）

这些依赖的许可证以各自包内的 LICENSE 为准；不在本仓库重复全文。

## 5. 不使用的内容

- 不把第三方整站模板直接改成个人站。
- 不把未授权的商业字体、图库图片、付费组件放进公开仓库。
- 不把包含个人信息的截图当作“演示素材”。
- 不把模型 API Key、GitHub token、Gitee token 写进任何示例。

## 6. 相关文档

- [01-build-story.md](01-build-story.md)
- [06-privacy-security.md](06-privacy-security.md)
