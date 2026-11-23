/* 工具：日期计算（两个日期相差 / 指定日期加减天数） */

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function parseDate(value) {
  if (!value) return null;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return Number.isNaN(d.getTime()) ? null : d;
}

function weekday(date) {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
}

function dayDiff(a, b) {
  const ms = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  return Math.round(ms / 86400000);
}

function workdays(a, b) {
  const sign = a <= b ? 1 : -1;
  let start = sign > 0 ? a : b;
  const end = sign > 0 ? b : a;
  let count = 0;
  while (start < end) {
    start = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    const day = start.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count * sign;
}

export function render(root, ctx) {
  root.innerHTML = `
    <div class="field" style="max-width:320px">
      <label for="dMode">计算方式</label>
      <select class="select" id="dMode">
        <option value="diff">两个日期相差多久</option>
        <option value="add">从某天起加减天数</option>
      </select>
    </div>

    <div id="diffPane">
      <div class="tool-row">
        <div class="field" style="margin:0;flex:1;min-width:160px">
          <label for="dStart">开始日期</label>
          <input class="input" id="dStart" type="date" value="${today()}">
        </div>
        <div class="field" style="margin:0;flex:1;min-width:160px">
          <label for="dEnd">结束日期</label>
          <input class="input" id="dEnd" type="date" value="${today()}">
        </div>
      </div>
      <div class="stat-grid" id="dStats"></div>
      <p class="hint" id="dNote"></p>
    </div>

    <div id="addPane" hidden>
      <div class="tool-row">
        <div class="field" style="margin:0;flex:1;min-width:160px">
          <label for="dBase">起始日期</label>
          <input class="input" id="dBase" type="date" value="${today()}">
        </div>
        <div class="field" style="margin:0;flex:1;min-width:160px">
          <label for="dOffset">加减天数（负数表示往前）</label>
          <input class="input" id="dOffset" type="number" value="30" step="1">
        </div>
      </div>
      <div class="tool-result" id="dResult">—</div>
      <p class="hint" id="dResultNote"></p>
    </div>`;

  const mode = root.querySelector('#dMode');
  const diffPane = root.querySelector('#diffPane');
  const addPane = root.querySelector('#addPane');

  const startInput = root.querySelector('#dStart');
  const endInput = root.querySelector('#dEnd');
  const statsBox = root.querySelector('#dStats');
  const noteBox = root.querySelector('#dNote');

  function updateDiff() {
    const a = parseDate(startInput.value);
    const b = parseDate(endInput.value);
    if (!a || !b) {
      statsBox.innerHTML = '<p class="hint">请选择两个有效日期</p>';
      noteBox.textContent = '';
      return;
    }
    const days = dayDiff(a, b);
    const absDays = Math.abs(days);
    const months = Math.abs((b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));
    const wd = Math.abs(workdays(a, b));
    const items = [
      ['相差天数', `${days} 天`],
      ['折合周数', `${(absDays / 7).toFixed(1)} 周`],
      ['跨月数', `${months} 个月`],
      ['工作日', `${wd} 天`],
      ['开始', `${a.getFullYear()}-${String(a.getMonth() + 1).padStart(2, '0')}-${String(a.getDate()).padStart(2, '0')} ${weekday(a)}`],
      ['结束', `${b.getFullYear()}-${String(b.getMonth() + 1).padStart(2, '0')}-${String(b.getDate()).padStart(2, '0')} ${weekday(b)}`],
    ];
    statsBox.innerHTML = items.map(([label, value]) => `
      <div class="stat-box"><b style="font-size:20px">${value}</b><span>${label}</span></div>`).join('');
    noteBox.textContent = days === 0 ? '两个日期是同一天。' : days > 0 ? '结束日期在开始日期之后。' : '结束日期在开始日期之前（结果为负）。工作日按周一至周五估算，未扣除法定节假日。';
  }

  const baseInput = root.querySelector('#dBase');
  const offsetInput = root.querySelector('#dOffset');
  const resultBox = root.querySelector('#dResult');
  const resultNote = root.querySelector('#dResultNote');

  function updateAdd() {
    const base = parseDate(baseInput.value);
    const offset = Number(offsetInput.value);
    if (!base || !Number.isFinite(offset)) {
      resultBox.textContent = '—';
      resultNote.textContent = '请填写有效日期与天数';
      return;
    }
    const target = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);
    const text = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    resultBox.textContent = `${text}（${weekday(target)}）`;
    resultNote.textContent = `${baseInput.value} ${offset >= 0 ? '往后' : '往前'} ${Math.abs(offset)} 天 = ${text}`;
  }

  mode.addEventListener('change', () => {
    const isDiff = mode.value === 'diff';
    diffPane.hidden = !isDiff;
    addPane.hidden = isDiff;
    if (isDiff) updateDiff(); else updateAdd();
  });

  [startInput, endInput].forEach((el) => el.addEventListener('change', updateDiff));
  [baseInput, offsetInput].forEach((el) => {
    el.addEventListener('input', updateAdd);
    el.addEventListener('change', updateAdd);
  });

  updateDiff();
  updateAdd();
}
