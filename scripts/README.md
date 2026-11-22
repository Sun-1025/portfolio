# 素材脚本

这些脚本用于生成与压缩站点素材，**运行站点不需要它们**。保留在仓库里是为了让图片可以复现，而不是只能靠手工。

## 依赖

```bash
pip install pillow requests
```

部分脚本依赖本地的原始渲染图与中间文件，仓库里不包含这些大图（见 `.gitignore` 的 `assets/_raw/`）。没有原图时，脚本只能查看逻辑，无法直接跑出结果。

## 脚本清单

| 脚本 | 用途 | 输入 | 输出 |
| --- | --- | --- | --- |
| `compress.py` | 批量把 PNG/JPG 转 WebP 并控制体积 | `assets/_raw/` 下的原图 | `assets/*.webp` |
| `composite.py` | 合成多图层场景（人物 + 背景 + 光效） | 分层 PNG | 合成图 |
| `fetch_scene.py` | 拉取/整理场景渲染结果 | 远程或本地目录 | `assets/scene-*.webp` |
| `fetch_clean.py` | 清理拉取结果中的多余文件与命名 | 素材目录 | 规范命名后的文件 |
| `feather.py` | 给图片边缘做羽化，消除硬边 | 单张图 | 羽化后的图 |
| `make_bg.py` | 生成背景底图与暗态遮罩 | 纯色/纹理参数 | `assets/bg-*.jpg`、`scene-ydim.webp` |
| `make_ydim.py` | 生成暗态场景底图 | 场景原图 | `assets/scene-ydim.webp` |
| `read_resume.py` | 解析简历文本，抽取结构化字段 | 简历文件 | 控制台输出 / JSON 片段 |

## 使用方式

```bash
cd scripts
python compress.py --src ../assets/_raw --dst ../assets --quality 82
```

各脚本的参数以文件头注释为准，执行 `python <script>.py --help` 可查看（部分脚本为一次性任务，未实现完整的参数解析）。

## 约定

- 输出统一放 `assets/`，文件名沿用 `scene-<方向>.webp`、`hero-<方向>.webp` 的既有规则。
- 新增脚本请在本表登记，并写清输入、输出与依赖。
- 脚本里不要硬编码本地绝对路径，用相对路径或命令行参数。
