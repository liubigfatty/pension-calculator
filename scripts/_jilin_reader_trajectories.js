/**
 * 吉林读者案例（1986-09 参工 / 2026-10 退休 / 100%档 / 男 1966-05）
 * 第五节「缴费轨迹波动」实算：
 *   引擎只接受标量 avgIndex，不支持逐年指数 ⇒
 *   先复刻引擎个账算法（校准基准到分），再算各轨迹余额，
 *   把余额回传给引擎 personalAccInput，由引擎出总额。
 *
 * 用法：node scripts/_jilin_reader_trajectories.js
 */
const fs = require('fs');
const path = require('path');
const { calculate } = require(path.resolve('./engine/pension-engine.js'));
const cfgMod = require(path.resolve('./cloudfunctions/calculate/provinces/jilin.js'));
const config = cfgMod.getEngineConfig ? cfgMod.getEngineConfig() : cfgMod;

// ── 从引擎源码提取统一记账利率表（保证与真相源一致）──
const src = fs.readFileSync(path.resolve('./engine/pension-engine.js'), 'utf8');
const blk = src.slice(src.indexOf('const UNIFIED_INTEREST_RATES'), src.indexOf('// ====', src.indexOf('const UNIFIED_INTEREST_RATES')));
const RATES = {};
for (const m of blk.matchAll(/(\d{4}):\s*([\d.]+)/g)) RATES[+m[1]] = parseFloat(m[2]);
const getRate = (y) => (RATES[y] !== undefined ? RATES[y] : (y > 2026 ? RATES[2026] : 0.025));

// ── 社平取数（复刻 getBase(avg_salary_history) 的前向回退）──
const ASH = config.avg_salary_history || {};
const salaryOf = (y) => {
  for (let k = y; k >= 1990; k--) if (ASH[k] > 0) return ASH[k];
  return 0;
};

// ── 复刻引擎个账累计（见 calcPersonalAccountPension）──
// 首年 1995.07 → 6 个月；中间年 1996–2025 全年；末年 2026.10 → lastMonths = 9
function accBalance(idxOf) {
  let total = 0;
  // 首年（部分月，不计当年利息）
  const firstMonths = 12 - 7 + 1; // 6
  total = total * (1 + getRate(1995)) + salaryOf(1995) * idxOf(1995) * 0.08 * firstMonths;
  // 中间年（上年末余额计息 + 本年存入不计息）
  for (let y = 1996; y < 2026; y++) {
    total = total * (1 + getRate(y)) + salaryOf(y) * idxOf(y) * 0.08 * 12;
  }
  // 末年（按实际月数单利 + 本年存入）
  const lastMonths = 10 - 1; // 9
  total = total * Math.pow(1 + getRate(2026), lastMonths / 12) + salaryOf(2026) * idxOf(2026) * 0.08 * lastMonths;
  return Math.round(total * 100) / 100;
}

// ── 引擎调用：给定个账余额，出全套金额 ──
function run(cityType, personalAcc) {
  const input = {
    name: '读者案例', province: 'jilin', gender: 'male', genderType: 'male',
    birthYear: 1966, birthMonth: 5,
    workYear: 1986, workMonth: 9,
    retireYear: 2026, retireMonth: 10,
    retireDateInput: { year: 2026, month: 10 },
    avgIndex: 1.0, personalAccInput: personalAcc,
    // 留言/社保系统「足月核定」口径：40.17 年（视同 8.83 + 实际 31.34）
    // 引擎自算为 40.0833 年（1986.09→2026.10 自然月差），本文按留言原值代入
    totalYears: 40.17, // 视同/实际年限由引擎按建账边界自算（8.8333 / 31.3333），勿覆盖
    cityType,
  };
  const r = calculate(config, input);
  const legal = r.legal || r;
  const g = (k) => (legal[k] && typeof legal[k] === 'object' ? legal[k].amount : legal[k]);
  return {
    basic: g('basicPension') ?? g('basic_pension'),
    extra: g('extraPension') ?? g('extra_pension'),
    trans: g('transitionalPension') ?? g('transitional_pension'),
    pers: g('personalPension') ?? g('personal_pension'),
    total: legal.total,
    months: r.months ?? legal.months,
    balance: (legal.personalAccount && legal.personalAccount.balance) || personalAcc,
  };
}

// ── 轨迹定义：1995–2026 线性过渡，算术平均恒 = (a+b)/2 = 1.0 ──
const Y0 = 1995, Y1 = 2026;
const traj = (a, b) => (y) => a + (b - a) * (y - Y0) / (Y1 - Y0);
const flat = () => 1.0;

const cases = [
  { label: '恒定100%档（基准）', fn: flat },
  { label: '前低后高 0.6→1.4', fn: traj(0.6, 1.4) },
  { label: '前高后低 1.4→0.6', fn: traj(1.4, 0.6) },
  { label: '前低后高 0.4→1.6', fn: traj(0.4, 1.6) },
];

// ── 校准：基准场景引擎自算 vs 复刻 ──
const base0 = run('prov', 0);
const calib = accBalance(flat);
console.log('=== 校准（引擎自算 vs 复刻）===');
console.log('引擎 balance:', base0.balance, '| 复刻 balance:', calib,
  '| 差额:', (calib - base0.balance).toFixed(2));
console.log('引擎 months:', base0.months);
console.log('前三项（引擎）:', base0.basic, '+', base0.extra, '+', base0.trans,
  '=', (base0.basic + base0.extra + base0.trans).toFixed(2));
console.log('基准 total:', base0.total);

console.log('\n=== 各轨迹（非长春 cityType=prov）===');
console.log('轨迹'.padEnd(22), '个账余额'.padStart(10), '个账月领'.padStart(10), '月领合计'.padStart(10), '相对基准'.padStart(10));
for (const c of cases) {
  const bal = c.fn === flat ? base0.balance : accBalance(c.fn);
  const r = run('prov', bal);
  const d = ((r.total - base0.total) / base0.total * 100).toFixed(2);
  console.log(c.label.padEnd(20), String(bal).padStart(10), String(r.pers).padStart(10),
    String(r.total).padStart(10), (d > 0 ? '+' : '') + d + '%');
}

console.log('\n=== 长春（cityType=cc）对照 ===');
const ccBase = run('cc', 0);
console.log('基准 total:', ccBase.total, '| 前三项:', ccBase.basic, '+', ccBase.extra, '+', ccBase.trans,
  '=', (ccBase.basic + ccBase.extra + ccBase.trans).toFixed(2));
for (const c of cases) {
  if (c.fn === flat) continue;
  const bal = accBalance(c.fn);
  const r = run('cc', bal);
  console.log(c.label.padEnd(20), String(r.total).padStart(10));
}
