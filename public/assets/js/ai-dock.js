/* ============================================================
   AI dock：右下角终端浮标 / 流式问答 / 本地事实降级
   后端地址由 window.SZH_AI_ENDPOINT 或 site.json 的 ai.endpoint 注入
   ============================================================ */

const CONTACT_TEXT = '邮箱 1322816531@qq.com ｜ GitHub github.com/Sun-1025 ｜ Gitee gitee.com/SunZHAO1025 ｜ 微信 chgh740905。GitHub 或 Gitee 仓库开 Issue 也能联系。';

const FALLBACKS = [
  {
    test: /联系|邮箱|邮件|微信|github|gitee|issue|合作|找我/i,
    answer: CONTACT_TEXT
  },
  {
    test: /项目|作品|做过|开发|系统|语音|图书/i,
    answer: '我最近在做家用智能语音监测项目的 APP 端和联调，也在维护这个站点和转换工具台。图书管理系统是我独立写的，从需求到测试交付都自己走了一遍。想看细节，可以翻项目页。'
  },
  {
    test: /技术|技能|会什么|栈|嵌入式|esp32|c\+\+|python|sql/i,
    answer: '我常用 C 和 C++，做 ESP32 和嵌入式；Python 用来处理数据和画图，SQL Server 用来建库查询。Git 和 AI 工具也在用，遇到新芯片会先翻手册。'
  },
  {
    test: /实习|工作|招聘|岗位|入职|offer/i,
    answer: '我是学院预备实习，开放实习，方向偏嵌入式、ESP32 和 AI 应用。具体时间、地点和岗位可以邮件聊；' + CONTACT_TEXT
  },
  {
    test: /学校|专业|绩点|年级|成绩|排名/i,
    answer: '我在山东石油化工学院读物联网工程，2025 级大二，绩点 3.83/5.0，专业前 20%。'
  },
  {
    test: /你是谁|介绍|孙志昊|本人|经历/i,
    answer: '我是孙志昊，河北承德人，在山东石油化工学院读物联网工程。这个站放我的项目、工具和记录。'
  }
];

const UNKNOWN_ANSWER = '我只答这个站点上的事。你可以问我项目、技术栈或实习安排；要联系我，' + CONTACT_TEXT;

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

function makeDock(contacts, facts, quick) {
  const contactLine = contacts.map((c) => `${escapeHtml(c.label)} ${escapeHtml(c.value)}`).join(' ｜ ');
  const quickItems = quick.length
    ? quick
    : ['你在做什么项目', '会哪些技术', '能实习吗'];

  const dock = document.createElement('div');
  dock.className = 'ai-dock';
  dock.innerHTML = `
    <section class="ai-panel" id="aiPanel" role="dialog" aria-label="孙志昊的 AI 分身" hidden>
      <header class="ai-panel-head">
        <span>~/sunzhihao <strong>$</strong> ask</span>
        <span class="ai-status" id="aiStatus"><i></i><span>READY</span></span>
        <button class="ai-close" type="button" aria-label="关闭 AI 面板">×</button>
      </header>
      <div class="ai-log" id="aiLog" role="log" aria-live="polite">
        <article class="ai-msg ai-msg--bot">
          <span class="ai-msg-label">SZH</span>
          <p>我是孙志昊的 AI 分身。项目、技术栈、实习安排，问我就行。我只答这个站点上的事，不编造。</p>
        </article>
      </div>
      <div class="ai-quick">
        ${quickItems.map((q) => `<button type="button" data-question="${escapeHtml(q)}">${escapeHtml(q)}</button>`).join('')}
      </div>
      <form class="ai-form" id="aiForm">
        <span class="ai-form-prompt" aria-hidden="true">&gt;</span>
        <input class="ai-input" id="aiInput" type="text" maxlength="300" autocomplete="off" placeholder="输入问题，回车发送" aria-label="输入问题" />
        <button class="ai-send" type="submit" aria-label="发送">↵</button>
      </form>
      <div class="ai-hint">
        ${contactLine || CONTACT_TEXT}<br>
        仓库开 Issue 也能联系。回答只来自本站公开信息。
      </div>
    </section>
    <button class="ai-fab" id="aiFab" type="button" aria-label="打开 AI 分身" aria-expanded="false" aria-controls="aiPanel">
      <span class="ai-fab-mark" aria-hidden="true">&gt;</span>
    </button>
  `;

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
  let openedOnce = false;

  function setOpen(open) {
    panel.hidden = !open;
    fab.setAttribute('aria-expanded', String(open));
    if (open) {
      openedOnce = true;
      setTimeout(() => input.focus(), 30);
      scrollToEnd();
    }
  }

  function scrollToEnd() {
    log.scrollTop = log.scrollHeight;
  }

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

  async function typeText(node, text, speed = 16) {
    const chars = Array.from(String(text || ''));
    for (let i = 0; i < chars.length; i += 1) {
      node.textContent += chars[i];
      if (i % 6 === 0) scrollToEnd();
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
          try {
            payload = JSON.parse(data);
          } catch {
            continue;
          }
          if (payload.error) throw new Error(payload.error);
          if (payload.text) onText(payload.text);
        }
      }
    }
  }

  function endpointUrl() {
    const raw = String(dock.dataset.endpoint || '').trim().replace(/\/+$/, '');
    return raw ? `${raw}/api/chat` : '';
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
    const push = (chunk) => {
      answer += chunk;
      answerNode.textContent = answer;
      scrollToEnd();
    };

    const endpoint = endpointUrl();
    setStatus('busy', endpoint ? 'THINKING' : 'LOCAL');

    try {
      if (!endpoint) {
        const reply = fallbackAnswer(text);
        await typeText(answerNode, reply);
        answer = reply;
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
        await typeText(answerNode, '后端暂时没连上，我先按站点事实回答。\n\n' + reply, 14);
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
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    ask(input.value);
  });
  quickButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (openedOnce) ask(button.dataset.question || '');
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) setOpen(false);
  });

  // 点击面板外部收起；移动端保留抽屉，不因误触关闭
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
  dock.dataset.endpoint = endpoint || window.SZH_AI_ENDPOINT || '';
  window.__szhAiDock = dock;
  return dock;
}
