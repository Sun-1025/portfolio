# 孙志昊的站内 AI 分身

独立 Next.js 代理，只做两件事：

1. 在服务端持有 `LLM_API_KEY`，浏览器永远拿不到密钥。
2. 把 OpenAI 兼容接口的流式响应转成标准 SSE，供 `sunzhihaoai.top` 的终端浮标消费。

## 目录

```text
ai-server/
  app/
    api/chat/route.ts   # POST /api/chat，SSE、CORS、限流、错误降级
    layout.tsx
    page.tsx
  profile.json          # 事实表，contact 含 email / github / gitee / wechat
  .env.example
  package.json
  tsconfig.json
```

## 本地运行

```powershell
cd C:\Users\sun\OneDrive\Desktop\实习\portfolio-v2\ai-server
Copy-Item .env.example .env.local
# 编辑 .env.local，填 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL
npm install
npm run dev
```

打开 `http://localhost:3000` 能看到占位页；接口是：

```text
POST http://localhost:3000/api/chat
Content-Type: application/json

{"messages":[{"role":"user","content":"你在做什么项目"}]}
```

返回 `text/event-stream`，每条数据形如：

```text
data: {"text":"我最近在"}
```

## 接到静态站

在 `public/index.html` 里把 `window.SZH_AI_ENDPOINT` 改成代理地址，例如：

```html
<script>
  window.SZH_AI_ENDPOINT = 'https://szh-ai.vercel.app';
</script>
```

或者在 `data/site.json` 的 `ai.endpoint` 里填同一个地址。两者留空时，终端使用 `profile.json` 同源的本地事实降级回答，不会白屏。

## 部署

### 方案 A：Vercel（推荐，能跑 Route Handler）

```powershell
cd ai-server
npm install
npx vercel
npx vercel env add LLM_BASE_URL production
npx vercel env add LLM_API_KEY production
npx vercel env add LLM_MODEL production
npx vercel --prod
```

部署后得到一个 `https://xxx.vercel.app`，把它写进 `window.SZH_AI_ENDPOINT`，重新导出并部署 `sunzhihaoai.top`。

### 方案 B：已有 Express

`GitHub Pages` 是纯静态托管，跑不了 Next Route Handler。若不想上 Vercel，需要在现有 `server.js` 里增加等价的 `/api/chat` 路由，并把静态站改为同源部署。代码结构可照 `app/api/chat/route.ts` 的限流和 SSE 段落移植，但不要把 `LLM_API_KEY` 放进前端。

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `LLM_BASE_URL` | 是 | OpenAI 兼容接口根地址，如 `https://api.example.com/v1`；以 `/chat/completions` 结尾也可以 |
| `LLM_API_KEY` | 是 | 只放服务端，不提交到 Git，不写进前端 |
| `LLM_MODEL` | 是 | 模型名 |
| `ALLOWED_ORIGINS` | 否 | 允许跨域的前端来源，逗号分隔 |

## 防护与降级

- 按 `x-forwarded-for` / `x-real-ip` 限流 10 次/小时，进程内存计数；多实例部署时换成 Redis/Upstash。
- 超过 10 次返回 429 和固定话术，仍带四条联系方式。
- 上游不可达、未配置、空响应都返回 5xx；前端捕获后使用本地事实回答。
- `messages` 只保留最近 20 条（10 轮），单条截断到 800 字。
- `max_tokens: 600`，`temperature: 0.4`。

## 扩展位

- **RAG**：在 `route.ts` 里把 `SYSTEM_PROMPT` 下方的事实表换成检索结果，保持“只答站点事实”的约束。
- **Function calling**：在 `route.ts` 的 upstream body 增加 `tools`，前端仍只消费 `{ text }` 事件；工具调用结果必须先经过服务端事实校验，再进入流。
- **持久限流**：把 `buckets` 替换为 Upstash Redis 或 Vercel KV。
