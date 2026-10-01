// 吉林读者案例 · 2026 年新计发基数（吉人社联〔2026〕74号 7481.5）重算
// 用途：核定 2026-10 退休案例在「全省新基数」下的四分项，并给出长春两种口径对照
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { calculate } = require(path.join(ROOT, 'engine/pension-engine.js'));
const mod = require(path.join(ROOT, 'cloudfunctions/calculate/provinces/jilin.js'));

function run(cityType, cc2026) {
  const config = mod.getEngineConfig();
  if (cc2026) config.base_rates.cc[2026] = cc2026; // mutate：仅本次调用生效
  const input = {
    name: '读者案例', province: 'jilin', gender: 'male', genderType: 'male',
    birthYear: 1966, birthMonth: 5,
    workYear: 1986, workMonth: 9,
    retireYear: 2026, retireMonth: 10,
    retireDateInput: { year: 2026, month: 10 },
    avgIndex: 1.0, personalAccInput: 140131.16,
    totalYears: 40.17,
    cityType,
  };
  const r = calculate(config, input);
  const legal = r.legal || r;
  const g = (k) => (legal[k] && typeof legal[k] === 'object' ? legal[k].amount : legal[k]);
  return {
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
  console.log(`  基础 ${f(o.basic)} + 增发 ${f(o.extra)} + 过渡 ${f(o.trans)} + 个账 ${f(o.pers)} = 合计 ${f(o.total)}`);
  console.log(`  计发月数 ${o.months} | 前三项合计 ${f(+(o.basic + o.extra + o.trans).toFixed(2))} | 个账占比 ${((o.pers / o.total) * 100).toFixed(2)}%`);
}

console.log('=== 吉林读者案例 · 2026 新基数重算（退休 2026-10）===');
show('全省（不含长春/农垦）· 7481.5', run('prov'));
show('长春 · 并轨 7481.5（引擎当前行为）', run('cc'));
show('长春 · 假设仍单列=2025值7978.25（演示，非官方）', run('cc', 7978.25));
