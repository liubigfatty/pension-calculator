// 长春 2026 计发基数缺失 → 是否出现「退休越晚、月领越低」的待遇倒退？
// 方法：同一个人（同龄退休、同缴费年限、同个账、同指数），只换退休年份 2025-10 vs 2026-10。
// 出生年同步位移，保证两次都是整 60 岁退休（计发月数同为 139），把变量压到只剩计发基数。
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { calculate } = require(path.join(ROOT, 'engine/pension-engine.js'));
const mod = require(path.join(ROOT, 'cloudfunctions/calculate/provinces/jilin.js'));

function run(retireYear, ccOverride) {
  const config = mod.getEngineConfig();
  if (ccOverride) config.base_rates.cc[retireYear] = ccOverride; // 仅本次调用生效
  const input = {
    name: '对照体', province: 'jilin', gender: 'male', genderType: 'male',
    birthYear: retireYear - 60, birthMonth: 10,
    workYear: 1985, workMonth: 10,   // 锁死参工年月：保证两次的视同缴费年限完全一致
    retireYear, retireMonth: 10,
    retireDateInput: { year: retireYear, month: 10 },
    avgIndex: 1.0, personalAccInput: 140131.16,
    totalYears: 40.0,
    cityType: 'cc',
  };
  const r = calculate(config, input);
  const legal = r.legal || r;
  const g = (k) => (legal[k] && typeof legal[k] === 'object' ? legal[k].amount : legal[k]);
  return {
    year: retireYear,
    basic: g('basicPension') ?? g('basic_pension'),
    extra: g('extraPension') ?? g('extra_pension'),
    trans: g('transitionalPension') ?? g('transitional_pension'),
    pers: g('personalAccount') ?? g('personal_account'),
    total: legal.total,
    months: r.months ?? legal.months,
  };
}

const f = (v) => (v == null ? '—' : Number(v).toFixed(2));
function show(title, o) {
  console.log(`\n【${title}】`);
  console.log(`  基础 ${f(o.basic)} + 增发 ${f(o.extra)} + 过渡 ${f(o.trans)} + 个账 ${f(o.pers)} = 合计 ${f(o.total)}  (计发月数 ${o.months})`);
}

console.log('=== 长春：2025-10 退休 vs 2026-10 退休（其余全部锁死）===');
const a2025 = run(2025);
const b2026 = run(2026);            // 引擎当前行为：长春缺 2026 → 吃全省 7481.5
const c2026 = run(2026, 7978.25);   // 修复后预期：长春按「预发」沿用本市 2025 值
show('2025-10 退休（长春 7978.25 / 全省 7322.08）', a2025);
show('2026-10 退休 · 引擎现状', b2026);
show('2026-10 退休 · 预发沿用长春 2025 值 7978.25', c2026);

const d1 = b2026.total - a2025.total;
const d2 = c2026.total - a2025.total;
console.log('\n=== 判定 ===');
console.log(`引擎现状：2026 比 2025 ${d1 >= 0 ? '+' : ''}${d1.toFixed(2)} 元  => ${d1 < 0 ? '🔴 待遇倒退，不可接受' : '✅ 未倒退'}`);
console.log(`预发口径：2026 比 2025 ${d2 >= 0 ? '+' : ''}${d2.toFixed(2)} 元  => ${d2 < 0 ? '🔴 待遇倒退，不可接受' : '✅ 未倒退'}`);
