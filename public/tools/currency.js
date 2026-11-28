/* 工具：汇率计算（人民币与常用外币互转，在线取参考价，失败时用内置参考值） */

const CURRENCIES = {
  CNY: { name: '人民币', symbol: '¥', short: 'CNY' },
  USD: { name: '美元', symbol: '$', short: 'USD' },
  EUR: { name: '欧元', symbol: '€', short: 'EUR' },
  GBP: { name: '英镑', symbol: '£', short: 'GBP' },
  JPY: { name: '日元', symbol: '¥', short: 'JPY' },
  HKD: { name: '港币', symbol: 'HK$', short: 'HKD' },
  KRW: { name: '韩元', symbol: '₩', short: 'KRW' },
  AUD: { name: '澳元', symbol: 'A$', short: 'AUD' },
  CAD: { name: '加元', symbol: 'C$', short: 'CAD' },
  SGD: { name: '新加坡元', symbol: 'S$', short: 'SGD' },
  CHF: { name: '瑞士法郎', symbol: 'Fr', short: 'CHF' },
  THB: { name: '泰铢', symbol: '฿', short: 'THB' },
  MYR: { name: '马来西亚林吉特', symbol: 'RM', short: 'MYR' },
  INR: { name: '印度卢比', symbol: '₹', short: 'INR' },
};

const CODES = Object.keys(CURRENCIES);
const QUICK = ['USD', 'EUR', 'JPY', 'HKD', 'GBP', 'KRW'];
const FALLBACK_DATE = '2026-11-27';
const API_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/cny.json';

/* 1 单位外币 = 多少人民币。数值来自 2026-11-27 欧洲央行参考价，断网时兜底。 */
const FALLBACK_RATES = {
  CNY: 1,
  USD: 6.6548,
  EUR: 7.2913,
  GBP: 8.7314,
  JPY: 0.04171,
  HKD: 0.8500,
  KRW: 0.004985,
  AUD: 4.4375,
  CAD: 4.6713,
  SGD: 5.1594,
  CHF: 7.9612,
  THB: 0.19612,
  MYR: 1.6142,
  INR: 0.07155,
};

let rates = { ...FALLBACK_RATES };
let rateDate = FALLBACK_DATE;

function parseAmount(value) {
  const cleaned = String(value || '').replace(/[,\s，]/g, '');
  const number = Number(cleaned);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function money(value) {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const digits = abs > 0 && abs < 0.01 ? 6 : abs < 1 ? 4 : 2;
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

function convert(amount, from, to) {
  return amount * (rates[from] / rates[to]);
}

export function render(root, ctx) {
  root.innerHTML = `
    <div class="fx-board">
      <div class="fx-top">
        <div class="field fx-amount-field">
          <label for="fxAmount">金额</label>
          <div class="fx-amount-box">
            <span id="fxSymbol" aria-hidden="true">¥</span>
            <input class="input" id="fxAmount" type="text" inputmode="decimal" value="1000" autocomplete="off" aria-label="要换算的金额">
          </div>
        </div>
        <div class="fx-pickers">
          <div class="field">
            <label for="fxFrom">从</label>
            <select class="select" id="fxFrom">
              ${CODES.map((code) => `<option value="${code}">${CURRENCIES[code].name} ${code}</option>`).join('')}
            </select>
          </div>
          <button class="fx-swap" type="button" id="fxSwap" aria-label="交换货币" title="交换货币">⇄</button>
          <div class="field">
            <label for="fxTo">到</label>
            <select class="select" id="fxTo">
              ${CODES.map((code) => `<option value="${code}">${CURRENCIES[code].name} ${code}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <div class="fx-result-card">
        <span class="fx-result-label">换算结果</span>
        <div class="fx-result" id="fxResult" aria-live="polite">—</div>
        <p class="fx-rate" id="fxRate"></p>
      </div>

      <div class="fx-quick-head"><span>100 元大约能换</span><span>点击卡片可切换目标货币</span></div>
      <div class="fx-quick" id="fxQuick"></div>

      <div class="fx-meta">
        <span class="fx-status" id="fxStatus" data-live="0">正在获取参考汇率…</span>
        <button class="mini-btn" type="button" id="fxRefresh">刷新汇率</button>
      </div>
      <p class="hint">参考汇率来自公开汇率数据（经 jsDelivr 获取），实际以银行或支付平台成交价为准。</p>
    </div>`;

  const amountInput = root.querySelector('#fxAmount');
  const fromSel = root.querySelector('#fxFrom');
  const toSel = root.querySelector('#fxTo');
  const symbol = root.querySelector('#fxSymbol');
  const resultBox = root.querySelector('#fxResult');
  const rateBox = root.querySelector('#fxRate');
  const quickBox = root.querySelector('#fxQuick');
  const status = root.querySelector('#fxStatus');
  const refreshBtn = root.querySelector('#fxRefresh');

  function update() {
    const amount = parseAmount(amountInput.value);
    const from = fromSel.value;
    const to = toSel.value;
    symbol.textContent = CURRENCIES[from].symbol;

    if (amount === null) {
      resultBox.textContent = '—';
      rateBox.textContent = '请输入一个有效数字';
      return;
    }

    const value = convert(amount, from, to);
    resultBox.innerHTML = `<span class="fx-result-symbol">${CURRENCIES[to].symbol}</span>${money(value)} <small>${to}</small>`;
    rateBox.textContent = `1 ${from} = ${money(rates[from] / rates[to])} ${to}　·　1 ${to} = ${money(rates[to] / rates[from])} ${from}`;
    updateQuick();
  }

  function updateQuick() {
    quickBox.innerHTML = QUICK.map((code) => {
      const value = convert(100, 'CNY', code);
      return `<button type="button" class="fx-quick-card" data-code="${code}">
        <span>${CURRENCIES[code].name} ${code}</span>
        <b>${CURRENCIES[code].symbol}${money(value)}</b>
      </button>`;
    }).join('');
  }

  function setStatus(text, live) {
    status.textContent = text;
    status.dataset.live = live ? '1' : '0';
  }

  async function refresh(manual = false) {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '更新中…';
    if (manual) setStatus('正在获取最新参考汇率…', false);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(API_URL, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data || !data.cny) throw new Error('汇率数据格式异常');
      const next = { CNY: 1 };
      CODES.forEach((code) => {
        if (code === 'CNY') return;
        const cnyTo = Number(data.cny[code.toLowerCase()]);
        if (Number.isFinite(cnyTo) && cnyTo > 0) next[code] = 1 / cnyTo;
      });
      rates = next;
      rateDate = data.date || new Date().toISOString().slice(0, 10);
      setStatus(`参考汇率 · ${rateDate} · 公开数据`, true);
      if (manual && ctx && typeof ctx.toast === 'function') ctx.toast('汇率已更新');
    } catch (err) {
      setStatus(`离线参考汇率 · ${FALLBACK_DATE}${manual ? ' · 更新失败' : ''}`, false);
      if (manual && ctx && typeof ctx.toast === 'function') ctx.toast('暂时连不上汇率服务，已用内置参考值');
    } finally {
      clearTimeout(timer);
      refreshBtn.disabled = false;
      refreshBtn.textContent = '刷新汇率';
      update();
    }
  }

  [amountInput, fromSel, toSel].forEach((el) => {
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  });

  root.querySelector('#fxSwap').addEventListener('click', () => {
    const tmp = fromSel.value;
    fromSel.value = toSel.value;
    toSel.value = tmp;
    update();
  });

  quickBox.addEventListener('click', (event) => {
    const card = event.target.closest('.fx-quick-card');
    if (!card) return;
    toSel.value = card.dataset.code;
    update();
  });

  refreshBtn.addEventListener('click', () => refresh(true));

  fromSel.value = 'CNY';
  toSel.value = 'USD';
  update();
  refresh(false);
}
