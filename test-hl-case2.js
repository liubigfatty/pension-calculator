/**
 * 黑龙江案例2验证 - 有视同缴费的男性案例
 * 来源：官方核定表（2024年2月退休）
 */

const engine = require('./engine/pension-engine');
const hlConfig = require('./provinces/heilongjiang.json');

// ========== 案例数据 ==========
const input = {
  birthYear: 1964,
  birthMonth: 2,
  workYear: 1980,
  workMonth: 9,
  cityType: 'prov',
  gender: 'male',
  personalAccInput: 150471.35,
  avgIndex: 1.2416,
  totalYears: 522 / 12,
  sightYears: 190 / 12,
  baseRetireInput: 7010,
  baseProvInput: 7010,
  monthsInput: 139,
};

const result = engine.calculate(hlConfig, input);
const legal = result.legal;

// ========== 官方核定表数据 ==========
const official = {
  basic: 3417.71,
  personal: 1082.53,
  transition: 1653.69,
  total: 6153.93,
};

// ========== 对比输出 ==========
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║    黑龙江案例2 - 有视同缴费男性（1964年2月生/2024年2月退休）    ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log();

console.log('【输入参数】');
console.log(`  出生：1964年2月  参工：1980年9月  退休：2024年2月`);
console.log(`  性别：男  城市：全省统一`);
console.log(`  视同缴费：190个月(15.83年)  实际缴费：332个月(27.67年)`);
console.log(`  平均指数：1.2416  个人账户：150,471.35元`);
console.log(`  计发基数（2023年）：7010元/月`);
console.log();

const calcBasic = legal.basicPension.amount;
const calcPersonal = legal.personalAccount.amount;
const calcTransition = legal.transitionalPension.amount;
const calcTotal = legal.total;

console.log('【计算结果对比】');
console.log('┌─────────────────┬────────────┬────────────┬──────────┐');
console.log('│ 项目            │ 引擎计算   │ 官方核定   │ 差异     │');
console.log('├─────────────────┼────────────┼────────────┼──────────┤');

const rows = [
  { name: '基础养老金', calc: calcBasic, off: official.basic },
  { name: '个人账户养老金', calc: calcPersonal, off: official.personal },
  { name: '过渡性养老金', calc: calcTransition, off: official.transition },
  { name: '合计', calc: calcTotal, off: official.total },
];

let allPass = true;
rows.forEach(r => {
  const diff = Math.abs(r.calc - r.off);
  const pass = diff < 0.5;
  if (!pass) allPass = false;
  const mark = pass ? '✅' : '❌';
  console.log(`│ ${r.name.padEnd(15)} │ ${r.calc.toFixed(2).padStart(10)} │ ${r.off.toFixed(2).padStart(10)} │ ${mark}${diff.toFixed(2).padStart(6)} │`);
});

console.log('└─────────────────┴────────────┴────────────┴──────────┘');
console.log();

if (allPass) {
  console.log('🎉 全部吻合！差异均在允许范围内（<0.5元）');
} else {
  console.log('⚠️ 存在差异，需要排查');
}

console.log();
console.log('【引擎中间值】');
console.log(`  视同年限(自动)：${legal.sightYears?.toFixed(2) || 'N/A'}年`);
console.log(`  实际年限：${legal.actualYears?.toFixed(2) || 'N/A'}年`);
console.log(`  累计年限：${legal.totalYears?.toFixed(2) || 'N/A'}年`);
console.log();
console.log('【详细说明】');
console.log(`  基础：${legal.basicPension.description}`);
console.log(`  过渡：${legal.transitionalPension.description}`);
console.log(`  个人：${legal.personalAccount.description}`);
