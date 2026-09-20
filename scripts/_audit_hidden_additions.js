/**
 * 引擎隐患排查 · 第 2 步：31 省"零输入"跑分，揪出无条件加发项
 *
 * 方法：给一个完全中性的画像（男、1965-09 生、1990-07 参工、指数 1.0、2025-12 退休、
 *       cityType='prov'，不勾选任何条件性待遇：oneChild/items/intellectual/regionCategory 全不传）。
 *       跑完后逐省列出所有金额 > 0 的分项。凡是"用户什么都没勾却发钱"的项 = 潜在虚高。
 * 只读，不改任何文件。
 */
const path = require('path');
const root = path.resolve(__dirname, '..');
const data = require(path.join(root, 'cloudfunctions/calculate/provinces-data.js'));
const engine = require(path.join(root, 'cloudfunctions/calculate/pension-engine.js'));

const CODES = data.listProvinces();
const BASE_INPUT = {
  gender: 'male',
  birthYear: 1965, birthMonth: 9,
  workYear: 1990, workMonth: 7,
  avgIndex: 1.0,
  retireDateInput: { year: 2025, month: 12 },
  cityType: 'prov',
};

// 已知"政策性全员发放"（不是 bug，但需备案说明）
const KNOWN_UNCONDITIONAL = {
  xizang: ['specialAddition'],
};

const rows = [];
for (const code of CODES) {
  const cfg = data.getConfig(code);
  if (!cfg) continue;
  let res;
  try {
    res = engine.calculate(cfg, { ...BASE_INPUT });
  } catch (e) {
    rows.push({ code, name: cfg.province_name || cfg.name || code, err: e.message });
    continue;
  }
  const d = res.legal || res;
  const items = [];
  for (const [k, v] of Object.entries(d)) {
    if (!v || typeof v !== 'object') continue;
    if (typeof v.amount === 'number' && v.amount > 0) items.push([k, v.amount, v.description || '']);
  }
  rows.push({ code, name: cfg.province_name || cfg.name || code, total: d.total ?? null, items });
}

console.log('=== 31 省「零输入」跑分：非零分项全清单 ===\n');
const suspicious = [];
for (const r of rows) {
  if (r.err) { console.log(`${r.name}(${r.code}) ❌ 报错: ${r.err}`); continue; }
  // 基础三项 + 过渡性 属正常；其余输出
  const NORMAL = ['basicPension', 'personalAccount', 'transitionalPension', 'transPension', 'basic', 'personal', 'transitional'];
  const extra = r.items.filter(([k]) => !NORMAL.some(n => k.toLowerCase().includes(n.toLowerCase())));
  const totalStr = r.total != null ? (typeof r.total === 'number' ? r.total.toFixed(2) : JSON.stringify(r.total)) : '?';
  console.log(`${r.name}(${r.code}) 合计=${totalStr}`);
  for (const [k, amt, desc] of r.items) {
    const isExtra = extra.some(([ek]) => ek === k);
    console.log(`    ${isExtra ? '⚠️' : '  '} ${k} = ${amt.toFixed(2)}  ${desc.slice(0, 90)}`);
    if (isExtra) suspicious.push({ code: r.code, name: r.name, key: k, amt, desc });
  }
}
console.log('\n=== 汇总：无条件额外项（用户未勾选即发放）===');
const byKey = {};
for (const s of suspicious) { (byKey[s.key] ||= []).push(s); }
for (const [k, list] of Object.entries(byKey)) {
  console.log(`\n[${k}] 命中 ${list.length} 省：`);
  for (const s of list) console.log(`   ${s.name}(${s.code}) ${s.amt.toFixed(2)}元 :: ${s.desc.slice(0, 80)}`);
}
