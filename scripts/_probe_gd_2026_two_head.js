/**
 * 广东 2026「两头亏」真实算例反演
 * 来源：广州市 1976-05 生女职工，1997-08 参工，2026-05 退休，累计缴费 26 年半，
 *       个人账户本息 75825.65，平均缴费指数 0.4343，1998-06 前缴费 11 个月（有视同缴费权益）。
 *       官方核定表：基础 1456.68 / 个人 388.85 / 过渡性 150.08（= 新办法 50.08 + 加发100）/ 合计 1995.61
 *       ⇒ 年限津贴（26×4=104）被停发，加发100 保留。
 * 用法：node scripts/_probe_gd_2026_two_head.js
 */
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const engine = require(path.join(ROOT, 'engine/pension-engine.js'));
const gd = require(path.join(ROOT, 'cloudfunctions/calculate/provinces/guangdong.js')).getEngineConfig();

const input = {
  gender: 'female', genderType: 'fw50',
  birthYear: 1976, birthMonth: 5,
  workYear: 1997, workMonth: 8,
  retireDateInput: { year: 2026, month: 5 },
  avgIndex: 0.4343,
  personalAcc: 75825.65,
  baseRetire: 9493, baseProv: 9493,
  months: 195,
  cityType: 'prov',
};

const r = engine.calculate(gd, input);
const L = r.legal;
console.log('退休时点:', L.date.year + '-' + L.date.month, '| 总年限:', L.totalYears);
console.log('基础养老金  :', L.basicPension.amount, ' (官方 1456.68)');
console.log('个人账户    :', L.personalAccount.amount, ' (官方 388.85)');
console.log('过渡性养老金:', L.transitionalPension.amount, ' (官方 150.08)');
console.log('   desc:', L.transitionalPension.description);
console.log('  _allowance:', L.transitionalPension._allowance);
console.log('合计        :', L.total, ' (官方 1995.61)');

// 对照：若视同权益判据失效（旧逻辑），过渡性应为 新办法+100+104
const rOld = engine.calculate(gd, Object.assign({}, input, { workYear: 2000, workMonth: 1 }));
console.log('\n[对照] 无视同权益版本过渡性:', rOld.legal.transitionalPension.amount,
            rOld.legal.transitionalPension.description);
