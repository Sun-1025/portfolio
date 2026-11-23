/* 工具：常用单位换算（长度 / 重量 / 温度 / 面积 / 速度 / 数据 / 时间） */

const GROUPS = {
  length: {
    label: '长度',
    base: 'm',
    units: {
      mm: { label: '毫米 mm', factor: 0.001 },
      cm: { label: '厘米 cm', factor: 0.01 },
      m: { label: '米 m', factor: 1 },
      km: { label: '千米 km', factor: 1000 },
      li: { label: '里', factor: 500 },
      ft: { label: '英尺 ft', factor: 0.3048 },
      in: { label: '英寸 in', factor: 0.0254 },
      yd: { label: '码 yd', factor: 0.9144 },
      mile: { label: '英里 mile', factor: 1609.344 },
      nmi: { label: '海里 nmi', factor: 1852 },
    },
  },
  weight: {
    label: '重量',
    base: 'kg',
    units: {
      g: { label: '克 g', factor: 0.001 },
      liang: { label: '两', factor: 0.05 },
      jin: { label: '斤', factor: 0.5 },
      kg: { label: '千克 kg', factor: 1 },
      t: { label: '吨 t', factor: 1000 },
      lb: { label: '磅 lb', factor: 0.45359237 },
      oz: { label: '盎司 oz', factor: 0.028349523125 },
    },
  },
  temperature: {
    label: '温度',
    units: {
      C: { label: '摄氏度 °C' },
      F: { label: '华氏度 °F' },
      K: { label: '开尔文 K' },
    },
  },
  area: {
    label: '面积',
    base: 'm2',
    units: {
      cm2: { label: '平方厘米 cm²', factor: 0.0001 },
      m2: { label: '平方米 m²', factor: 1 },
      mu: { label: '亩', factor: 666.6666667 },
      ha: { label: '公顷 ha', factor: 10000 },
      km2: { label: '平方千米 km²', factor: 1000000 },
      ft2: { label: '平方英尺 ft²', factor: 0.09290304 },
      acre: { label: '英亩 acre', factor: 4046.8564224 },
    },
  },
  speed: {
    label: '速度',
    base: 'm/s',
    units: {
      'm/s': { label: '米/秒 m/s', factor: 1 },
      'km/h': { label: '千米/时 km/h', factor: 1 / 3.6 },
      mph: { label: '英里/时 mph', factor: 0.44704 },
      knot: { label: '节 kn', factor: 0.514444 },
    },
  },
  data: {
    label: '数据',
    base: 'B',
    units: {
      bit: { label: '比特 bit', factor: 0.125 },
      B: { label: '字节 B', factor: 1 },
      KB: { label: '千字节 KB', factor: 1024 },
      MB: { label: '兆字节 MB', factor: 1024 ** 2 },
      GB: { label: '吉字节 GB', factor: 1024 ** 3 },
      TB: { label: '太字节 TB', factor: 1024 ** 4 },
    },
  },
  time: {
    label: '时间',
    base: 's',
    units: {
      ms: { label: '毫秒 ms', factor: 0.001 },
      s: { label: '秒 s', factor: 1 },
      min: { label: '分钟 min', factor: 60 },
      h: { label: '小时 h', factor: 3600 },
      d: { label: '天 d', factor: 86400 },
      week: { label: '周 week', factor: 604800 },
    },
  },
};

function toCelsius(value, unit) {
  if (unit === 'C') return value;
  if (unit === 'F') return (value - 32) * 5 / 9;
  return value - 273.15;
}

function fromCelsius(value, unit) {
  if (unit === 'C') return value;
  if (unit === 'F') return value * 9 / 5 + 32;
  return value + 273.15;
}

function convert(value, groupKey, from, to) {
  const group = GROUPS[groupKey];
  if (groupKey === 'temperature') return fromCelsius(toCelsius(value, from), to);
  return value * group.units[from].factor / group.units[to].factor;
}

function format(value) {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e12 || abs < 1e-6)) return value.toExponential(6);
  return String(Number(value.toFixed(8)));
}

export function render(root, ctx) {
  root.innerHTML = `
    <div class="tool-row">
      <div class="field" style="margin:0;flex:1;min-width:160px">
        <label for="uGroup">换算类型</label>
        <select class="select" id="uGroup">
          ${Object.entries(GROUPS).map(([k, g]) => `<option value="${k}">${g.label}</option>`).join('')}
        </select>
      </div>
      <div class="field" style="margin:0;flex:2;min-width:180px">
        <label for="uValue">数值</label>
        <input class="input" id="uValue" type="text" inputmode="decimal" value="1" autocomplete="off">
      </div>
    </div>
    <div class="tool-row" style="align-items:flex-end">
      <div class="field" style="margin:0;flex:1;min-width:140px">
        <label for="uFrom">从</label>
        <select class="select" id="uFrom"></select>
      </div>
      <button class="mini-btn" type="button" id="uSwap" title="交换单位" style="margin-bottom:2px">⇄</button>
      <div class="field" style="margin:0;flex:1;min-width:140px">
        <label for="uTo">到</label>
        <select class="select" id="uTo"></select>
      </div>
    </div>
    <div class="tool-result" id="uResult">—</div>
    <p class="hint" id="uFormula"></p>`;

  const groupSel = root.querySelector('#uGroup');
  const valueInput = root.querySelector('#uValue');
  const fromSel = root.querySelector('#uFrom');
  const toSel = root.querySelector('#uTo');
  const resultBox = root.querySelector('#uResult');
  const formulaBox = root.querySelector('#uFormula');

  function fillUnits() {
    const group = GROUPS[groupSel.value];
    const keys = Object.keys(group.units);
    const options = keys.map((k) => `<option value="${k}">${group.units[k].label}</option>`).join('');
    fromSel.innerHTML = options;
    toSel.innerHTML = options;
    fromSel.value = keys[0];
    toSel.value = keys[Math.min(1, keys.length - 1)];
  }

  function update() {
    const raw = valueInput.value.trim().replace(',', '.');
    const value = Number(raw);
    if (!raw || !Number.isFinite(value)) {
      resultBox.textContent = '—';
      formulaBox.textContent = '请输入一个有效数字';
      return;
    }
    const group = GROUPS[groupSel.value];
    const result = convert(value, groupSel.value, fromSel.value, toSel.value);
    const fromLabel = group.units[fromSel.value].label.split(' ')[0];
    const toLabel = group.units[toSel.value].label.split(' ')[0];
    resultBox.textContent = `${format(result)} ${toLabel}`;
    formulaBox.textContent = `${raw} ${fromLabel} = ${format(result)} ${toLabel}`;
  }

  groupSel.addEventListener('change', () => { fillUnits(); update(); });
  [valueInput, fromSel, toSel].forEach((el) => {
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  });
  root.querySelector('#uSwap').addEventListener('click', () => {
    const tmp = fromSel.value;
    fromSel.value = toSel.value;
    toSel.value = tmp;
    update();
  });

  fillUnits();
  update();
}
