const engine = require('./engine/pension-engine');
const config = require('./provinces/yunnan.json');

// 云南案例5：1973-12女，2023-12退休，50岁（核定表）
const input = {
  birthYear: 1973,
  birthMonth: 12,
  workYear: 1992,
  workMonth: 7,
  // 退休时间让引擎自动算（50岁=2023-12）
  genderType: 'fw',      // 女工人50岁退休
  userType: 'standard',  // 企业职工
  cityType: 'prov',
  sightYears: 0.5,       // 视同0年6月
  totalYears: 31.5,      // 累计31年6月
  personalAccInput: 127070.82,  // 个人账户累计本息
  avgIndex: 0.9726,      // 反推的平均缴费指数
  baseRetireInput: 8023, // 2023年计发基数
  baseProvInput: 8023,   // 全省统一
  monthsInput: 195,      // 50岁计发月数
  preAccountYearsInput: 3.25,  // 建账前缴费年限（1992-07至1995-10）
  skipDelay: true        // 2023年退休，跳过延迟退休计算
};

console.log('========== 云南案例5 引擎验证 ==========');
console.log('基本信息：1973-12女，1992-07参工，2023-12退休，50岁');
console.log('');

const result = engine.calculate(config, input);

const legal = result.legal;

console.log('--- 引擎计算结果 ---');
console.log(`退休日期: ${legal.date.year}-${String(legal.date.month).padStart(2,'0')}`);
console.log(`退休年龄: ${legal.ageStr} (${legal.age.toFixed(2)}岁)`);
console.log(`计发月数: ${legal.months}`);
console.log(`计发基数: ${legal.baseRetire}`);
console.log(`累计缴费年限: ${legal.totalYears.toFixed(2)}年`);
console.log(`视同缴费年限: ${legal.sightYears.toFixed(2)}年`);
console.log(`实际缴费年限: ${legal.actualYears.toFixed(2)}年`);
console.log('');
console.log(`基础养老金: ${legal.basicPension.amount.toFixed(2)}  (${legal.basicPension.description})`);
console.log(`个人账户养老金: ${legal.personalAccount.amount.toFixed(2)}  (${legal.personalAccount.description})`);
console.log(`过渡性养老金: ${legal.transitionalPension.amount.toFixed(2)}  (${legal.transitionalPension.description})`);
console.log(`增发养老金: ${legal.extraPension.amount.toFixed(2)}  (${legal.extraPension.description})`);
console.log(`特殊增发: ${legal.specialAddition.amount.toFixed(2)}  (${legal.specialAddition.description})`);
console.log(`小计（不含独生）: ${legal.total.toFixed(2)}`);
console.log('');

// 独生子女补贴单独计算
const oneChildSubsidy = Math.round(3293 * 0.05 * 100) / 100;
console.log(`独生子女补贴: ${oneChildSubsidy.toFixed(2)}  (3293×5%)`);
console.log(`合计（含独生）: ${(legal.total + oneChildSubsidy).toFixed(2)}`);
console.log('');

console.log('--- 官方核定表数据 ---');
console.log('基础养老金: 2492.62');
console.log('个人账户养老金: 651.65');
console.log('过渡性养老金: 329.68');
console.log('小计: 3473.95');
console.log('独生子女补贴: 164.65');
console.log('合计: 3638.60');
console.log('');

console.log('--- 对比 ---');
const compare = [
  { item: '基础养老金', engine: legal.basicPension.amount, official: 2492.62 },
  { item: '个人账户养老金', engine: legal.personalAccount.amount, official: 651.65 },
  { item: '过渡性养老金', engine: legal.transitionalPension.amount, official: 329.68 },
  { item: '小计', engine: legal.total, official: 3473.95 },
  { item: '独生子女补贴', engine: oneChildSubsidy, official: 164.65 },
  { item: '合计', engine: legal.total + oneChildSubsidy, official: 3638.60 }
];

let allPass = true;
for (const c of compare) {
  const diff = Math.abs(c.engine - c.official);
  const pass = diff < 0.02;
  if (!pass) allPass = false;
  console.log(`${c.item}: 引擎=${c.engine.toFixed(2)} 官方=${c.official.toFixed(2)} 差=${diff.toFixed(2)} ${pass ? '✅' : '❌'}`);
}

console.log('');
console.log(allPass ? '✅ 全部通过！' : '❌ 存在差异，需排查');
