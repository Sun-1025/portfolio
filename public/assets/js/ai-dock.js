/* AI dock：右下角助手 / 流式问答 / 本地事实降级 */
const CONTACT_TEXT = '邮箱见页脚「点击发送」 ｜ QQ 1322816531 ｜ GitHub github.com/Sun-1025 ｜ Gitee gitee.com/SunZHAO1025 ｜ 微信 暂密。GitHub 或 Gitee 仓库开 Issue 也能联系。';
const CONTACT_LOCAL_RE = /联系|邮箱|邮件|QQ|微信|github|gitee|issue|合作|找我|实习|工作|招聘|岗位|入职|offer/i;

const FALLBACKS = [
  {
    test: /联系|邮箱|邮件|QQ|微信|github|gitee|issue|合作|找我/i,
    answer: CONTACT_TEXT
  },
  {
    test: /项目|作品|做过|开发|系统|语音|图书|工具箱|主页|网站/i,
    answer: '现在在做个人主页、在线工具箱、家用语音监测系统和图书管理系统，还有一门「小小物理学家探险队」公益课。本站和工具箱是我自己写的；语音监测主要做整体串联和调试；图书管理用 C 语言，数据放在 SQL Server。'
  },
  {
    test: /技术|技能|会什么|栈|嵌入式|物联网|sql|c\+\+|c 语言|python|ai|agent/i,
    answer: '已掌握 SQL Server、C 语言、C++，其余在学。方向是嵌入式、物联网系统，也在学 AI / Agent 应用。没写进「已掌握」的东西，就是还在补。'
  },
  {
    test: /实习|工作|招聘|岗位|入职|offer/i,
    answer: '开放实习，方向偏嵌入式、物联网，也愿意做 AI / Agent 应用。具体时间、地点和岗位可以邮件聊；' + CONTACT_TEXT
  },
  {
    test: /学校|专业|年级|绩点|成绩|排名|哪里人|坐标/i,
    answer: '山东石油化工学院，2025 级物联网工程，现在在东营。绩点和排名不在公开页写，想了解可以邮件问。'
  },
  {
    test: /你是谁|介绍|孙志昊|本人|经历|特点/i,
    answer: '我是孙志昊，山东石油化工学院 2025 级物联网工程。对外只说三个特点：踏实、进步、真诚。座右铭是「无限进步」。'
  },
  {
    test: /兴趣|骑行|羽毛球|登山|北京|淄博|济南|照片/i,
    answer: '兴趣页有骑行、羽毛球、登山，还有北京、淄博、济南三组照片。骑行有公路和绿道，羽毛球偏爱双打，登山走到山顶就下。'
  }
];

const UNKNOWN_ANSWER = '我只回答这个站上公开的事实。项目、技术栈、实习安排、兴趣照片都能问；要直接联系，' + CONTACT_TEXT;
const RATE_LIMIT_TEXT = '问得有点快，休息一下再来。需要直接联系的话，' + CONTACT_TEXT;

function fallbackAnswer(question) {
  const found = FALLBACKS.find((item) => item.test.test(question));
  return found ? found.answer : UNKNOWN_ANSWER;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const LOGO_SVG = `<svg viewBox="0 0 56 56" aria-hidden="true">
  <rect x="8" y="9" width="40" height="34" rx="10" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".9"/>
  <path d="M17 43v6l8-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" opacity=".9"/>
  <circle cx="21" cy="26" r="2.4" fill="currentColor" opacity=".7"/>
  <circle cx="28" cy="26" r="2.4" fill="currentColor" opacity=".7"/>
  <circle cx="35" cy="26" r="2.4" fill="var(--accent, #a9c2d6)"/>
  <path d="M18 35c5 4 15 4 20 0" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>
</svg>`;

function makeDock(contacts, facts, quick) {
  const contactLine = contacts.map((c) => {
    const label = String(c.label || '');
    const value = String(c.value || '');
    const masked = label.includes('邮箱') || value.includes('@');
    return `${escapeHtml(label)} ${masked ? '见页脚 · 点击发送' : escapeHtml(value)}`;
  }).join(' ｜ ');
  const quickItems = quick.length ? quick : ['你在做什么项目', '会哪些技术', '能实习吗'];

  const dock = document.createElement('div');
  dock.className = 'ai-dock';
  dock.innerHTML = `
    <section class="ai-panel" id="aiPanel" role="dialog" aria-label="孙志昊的 AI 助手" hidden>
      <header class="ai-panel-head">
        <span class="ai-panel-id">
          <span class="ai-panel-mark">${LOGO_SVG}</span>
          <span><strong>SZH</strong> / ASK</span>
        </span>
        <span class="ai-status" id="aiStatus"><i></i><span>READY</span></span>
        <button class="ai-close" type="button" aria-label="关闭 AI 面板">×</button>
      </header>
      <div class="ai-log" id="aiLog" role="log" aria-live="polite">
        <article class="ai-msg ai-msg--bot">
          <span class="ai-msg-label">孙志昊 / AI</span>
          <p>我是孙志昊，这个站上的 AI 助手。项目、技术栈、实习安排都能问；不确定的我会直说。</p>
        </article>
      </div>
      <div class="ai-quick">
        ${quickItems.map((q) => `<button type="button" data-question="${escapeHtml(q)}">${escapeHtml(q)}</button>`).join('')}
      </div>
      <form class="ai-form" id="aiForm">
        <span class="ai-form-prompt" aria-hidden="true">›</span>
        <input class="ai-input" id="aiInput" type="text" maxlength="300" autocomplete="off" placeholder="输入问题，回车发送" aria-label="输入问题" />
        <button class="ai-send" type="submit" aria-label="发送">↵</button>
      </form>
      <div class="ai-hint">${contactLine || CONTACT_TEXT}<br>回答只来自站上公开信息；不确定的问题会直接说不确定。</div>
    </section>
    <span class="ai-fab-bubble" aria-hidden="true">我是此站 <b>Agent</b>，<br>有什么问题都可以问我～</span>
    <button class="ai-fab" id="aiFab" type="button" aria-label="打开 AI 助手" aria-expanded="false" aria-controls="aiPanel">
      <span class="ai-fab-ring" aria-hidden="true"></span>
      <span class="ai-fab-mark">${LOGO_SVG}</span>
      <span class="sr-only">AI 助手</span>
    </button>`;

  document.body.appendChild(dock);

  const panel = dock.querySelector('#aiPanel');
  const fab = dock.querySelector('#aiFab');
  const close = dock.querySelector('.ai-close');
  const log = dock.querySelector('#aiLog');
  const form = dock.querySelector('#aiForm');
  const input = dock.querySelector('#aiInput');
  const send = dock.querySelector('.ai-send');
  const status = dock.querySelector('#aiStatus');
  const quickButtons = Array.from(dock.querySelectorAll('.ai-quick button'));

  const history = [];
  let busy = false;

  function setOpen(open) {
    panel.hidden = !open;
    dock.classList.toggle('is-open', open);
    fab.setAttribute('aria-expanded', String(open));
    if (open) { setTimeout(() => input.focus(), 30); scrollToEnd(); }
  }

  function scrollToEnd() { log.scrollTop = log.scrollHeight; }

  function appendMessage(role, text) {
    const article = document.createElement('article');
    article.className = `ai-msg ai-msg--${role === 'user' ? 'user' : 'bot'}`;
    const label = document.createElement('span');
    label.className = 'ai-msg-label';
    label.textContent = role === 'user' ? 'YOU' : 'SZH';
    const body = document.createElement('p');
    body.textContent = text || '';
    article.append(label, body);
    log.appendChild(article);
    scrollToEnd();
    return body;
  }

  async function typeText(node, text, speed = 4) {
    const chars = Array.from(String(text || ''));
    for (let i = 0; i < chars.length; i += 1) {
      node.textContent += chars[i];
      if (i % 8 === 0) scrollToEnd();
      await wait(speed);
    }
    scrollToEnd();
  }

  function setStatus(mode, label) {
    status.classList.toggle('is-live', mode === 'live');
    status.classList.toggle('is-busy', mode === 'busy');
    status.querySelector('span').textContent = label;
  }

  async function readSse(response, onText) {
    if (!response.body) throw new Error('No response body');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || '';
      for (const event of events) {
        for (const line of event.split(/\r?\n/)) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data) continue;
          if (data === '[DONE]') return;
          let payload;
          try { payload = JSON.parse(data); } catch { continue; }
          if (payload.error) throw new Error(payload.error);
          if (payload.text) onText(payload.text);
        }
      }
    }
  }

  function endpointUrl() {
    const raw = String(dock.dataset.endpoint || '').trim().replace(/\/+$/, '');
    if (!raw) return '';
    return raw.endsWith('/api/chat') ? raw : `${raw}/api/chat`;
  }

  async function ask(question) {
    if (busy) return;
    const text = String(question || input.value || '').trim();
    if (!text) return;
    busy = true;
    send.disabled = true;
    input.value = '';
    appendMessage('user', text);
    history.push({ role: 'user', content: text });

    const answerNode = appendMessage('assistant', '');
    let answer = '';
    const push = (chunk) => { answer += chunk; answerNode.textContent = answer; scrollToEnd(); };

    const endpoint = endpointUrl();
    setStatus('busy', endpoint ? 'THINKING' : 'LOCAL');

    try {
      if (!endpoint || CONTACT_LOCAL_RE.test(text)) {
        const reply = fallbackAnswer(text);
        await typeText(answerNode, reply);
        answer = reply;
        setStatus('live', 'LOCAL');
      } else {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history.slice(-20) })
        });

        if (response.status === 429) {
          const data = await response.json().catch(() => ({}));
          const reply = data.message || RATE_LIMIT_TEXT;
          await typeText(answerNode, reply);
          answer = reply;
        } else if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        } else {
          await readSse(response, push);
          if (!answer) throw new Error('Empty response');
          setStatus('live', 'ONLINE');
        }
      }
    } catch (error) {
      const reply = fallbackAnswer(text);
      if (!answer) {
        answer = '';
        await typeText(answerNode, '后端暂时没连上，我先按站上事实回答。\n\n' + reply, 10);
        answer = reply;
      } else {
        push('\n\n（输出中断，可以再问一次。）');
      }
      setStatus('live', 'LOCAL');
    } finally {
      history.push({ role: 'assistant', content: answer });
      if (history.length > 20) history.splice(0, history.length - 20);
      busy = false;
      send.disabled = false;
      input.focus();
    }
  }

  fab.addEventListener('click', () => setOpen(panel.hidden));
  close.addEventListener('click', () => setOpen(false));
  form.addEventListener('submit', (event) => { event.preventDefault(); ask(input.value); });
  quickButtons.forEach((button) => button.addEventListener('click', () => ask(button.dataset.question || '')));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !panel.hidden) setOpen(false); });
  document.addEventListener('click', (event) => {
    if (panel.hidden) return;
    if (dock.contains(event.target)) return;
    if (window.matchMedia('(max-width: 760px)').matches) return;
    setOpen(false);
  });

  return dock;
}

export function initAiDock({ contacts = [], facts = [], endpoint = '', quick = [] } = {}) {
  if (window.__szhAiDock) return window.__szhAiDock;
  const dock = makeDock(contacts, facts, quick);
  dock.dataset.endpoint = endpoint || '';
  window.__szhAiDock = dock;
  return dock;
}
