const path = require('path');
const { calculate } = require('./engine/pension-engine.js');
const { getEngineConfig } = require('./data/provinces/sichuan.js');

// 获取四川省引擎配置（从 data/provinces/sichuan.js 模块）
const config = getEngineConfig();

console.log('========== 四川省案例测试 ==========\n');

// 案例1：2024年退休，女，50岁，无视同缴费
console.log('--- 案例1：2024-04退休，女，50岁，无视同缴费 ---');
const case1 = calculate(config, {
  gender: 'female',
  birthYear: 1974,
  birthMonth: 1,
  workYear: 2007,
  workMonth: 1,
  retireType: 'standard',
  totalYears: 17.33,
  sightYears: 0,
  avgIndex: 0.84,
  personalAcc: 91147.87,
  baseRetire: 8079,
  baseProv: 8079,
  months: 195
});
const r1 = case1.legal;
console.log('基础养老金:', r1.basicPension?.amount, '| 官方: 1288.08 | 差:', (r1.basicPension?.amount - 1288.08)?.toFixed(2));
console.log('个人账户:', r1.personalAccount?.amount, '| 官方: 467.42 | 差:', (r1.personalAccount?.amount - 467.42)?.toFixed(2));
console.log('过渡性养老金:', r1.transitionalPension?.amount, '| 官方: 0 | 差:', (r1.transitionalPension?.amount - 0)?.toFixed(2));
console.log('增发养老金:', r1.extraPension?.amount, '| 官方: 117.61 | 差:', (r1.extraPension?.amount - 117.61)?.toFixed(2));
console.log('合计:', r1.total, '| 官方: 1873.11 | 差:', (r1.total - 1873.11)?.toFixed(2));
console.log('');

// 案例2：2025年退休，男，60岁1个月，有过渡性养老金
console.log('--- 案例2：2025-12退休，男，60岁1个月，有过渡性养老金 ---');
const case3 = calculate(config, {
  gender: 'male',
  birthYear: 1965,
  birthMonth: 11,
  workYear: 1982,
  workMonth: 12,
  retireType: 'standard',
  totalYears: 43.08,
  sightYears: 10.83,
  avgIndex: 0.872,
  personalAcc: 111640.05,
  baseRetire: 8462,
  baseProv: 8462,
  months: 138.4,
  preAccountYearsInput: 13.08
});
const r3 = case3.legal;
console.log('基础养老金:', r3.basicPension?.amount, '| 官方: 3412.12 | 差:', (r3.basicPension?.amount - 3412.12)?.toFixed(2));
console.log('个人账户:', r3.personalAccount?.amount, '| 官方: 806.65 | 差:', (r3.personalAccount?.amount - 806.65)?.toFixed(2));
console.log('过渡性养老金:', r3.transitionalPension?.amount, '| 官方: 1346.79 | 差:', (r3.transitionalPension?.amount - 1346.79)?.toFixed(2));
console.log('增发养老金:', r3.extraPension?.amount, '| 官方: 317.92 | 差:', (r3.extraPension?.amount - 317.92)?.toFixed(2));
console.log('合计:', r3.total, '| 官方: 5883.44 | 差:', (r3.total - 5883.44)?.toFixed(2));
console.log('');

// 案例3：2024年退休，女，50岁，有预核定→核定过程
console.log('--- 案例3：2024-06退休，女，50岁，有过渡性养老金（预核定→核定） ---');
const case4 = calculate(config, {
  gender: 'female',
  birthYear: 1974,
  birthMonth: 6,
  workYear: 1992,
  workMonth: 9,
  retireType: 'standard',
  totalYears: 31.83,
  sightYears: 0,
  avgIndex: 0.935,
  personalAcc: 150397.22,
  baseRetire: 8321,
  baseProv: 8321,
  months: 195,
  preAccountYearsInput: 3.33
});
const r4 = case4.legal;
console.log('基础养老金:', r4.basicPension?.amount, '| 官方: 2562.50 | 差:', (r4.basicPension?.amount - 2562.50)?.toFixed(2));
console.log('个人账户:', r4.personalAccount?.amount, '| 官方: 771.27 | 差:', (r4.personalAccount?.amount - 771.27)?.toFixed(2));
console.log('过渡性养老金:', r4.transitionalPension?.amount, '| 官方: 348.51 | 差:', (r4.transitionalPension?.amount - 348.51)?.toFixed(2));
console.log('增发养老金:', r4.extraPension?.amount, '| 官方: 247.64 | 差:', (r4.extraPension?.amount - 247.64)?.toFixed(2));
console.log('合计:', r4.total, '| 官方: 3929.92 | 差:', (r4.total - 3929.92)?.toFixed(2));
console.log('');

// 案例4：2024年退休，男，55岁，政策性提前退，增发0.4%
console.log('--- 案例4：2024-03退休，男，55岁，政策性提前退，增发0.4% ---');
const case5 = calculate(config, {
  gender: 'male',
  birthYear: 1969,
  birthMonth: 3,
  workYear: 1986,
  workMonth: 11,
  retireType: 'standard',
  totalYears: 37.08,
  sightYears: 5.08,
  avgIndex: 0.726,
  personalAcc: 88960.59,
  baseRetire: 8079,
  baseProv: 8079,
  months: 170,
  preAccountYearsInput: 8.83,
  extraRate: 0.004
});
const r5 = case5.legal;
console.log('基础养老金:', r5.basicPension?.amount, '| 官方: 2585.28 | 差:', (r5.basicPension?.amount - 2585.28)?.toFixed(2));
console.log('个人账户:', r5.personalAccount?.amount, '| 官方: 523.30 | 差:', (r5.personalAccount?.amount - 523.30)?.toFixed(2));
console.log('过渡性养老金:', r5.transitionalPension?.amount, '| 官方: 800.34 | 差:', (r5.transitionalPension?.amount - 800.34)?.toFixed(2));
console.log('增发养老金:', r5.extraPension?.amount, '| 官方: 869.95 | 差:', (r5.extraPension?.amount - 869.95)?.toFixed(2));
console.log('合计:', r5.total, '| 官方: 4778.87 | 差:', (r5.total - 4778.87)?.toFixed(2));
console.log('');

// 案例5：2025年退休，男，60岁，正常退休，增发0.1%
console.log('--- 案例5：2025-12退休，男，60岁，正常退休，增发0.1% ---');
const case6 = calculate(config, {
  gender: 'male',
  birthYear: 1965,
  birthMonth: 11,
  workYear: 1982,
  workMonth: 12,
  retireType: 'standard',
  totalYears: 43.08,
  sightYears: 10.83,
  avgIndex: 0.872,
  personalAcc: 111640.05,
  baseRetire: 8462,
  baseProv: 8462,
  months: 138.4,
  preAccountYearsInput: 13.08,
  extraRate: 0.001
});
const r6 = case6.legal;
console.log('基础养老金:', r6.basicPension?.amount, '| 官方: 3412.12 | 差:', (r6.basicPension?.amount - 3412.12)?.toFixed(2));
console.log('个人账户:', r6.personalAccount?.amount, '| 官方: 806.65 | 差:', (r6.personalAccount?.amount - 806.65)?.toFixed(2));
console.log('过渡性养老金:', r6.transitionalPension?.amount, '| 官方: 1346.79 | 差:', (r6.transitionalPension?.amount - 1346.79)?.toFixed(2));
console.log('增发养老金:', r6.extraPension?.amount, '| 官方: 317.88 | 差:', (r6.extraPension?.amount - 317.88)?.toFixed(2));
console.log('合计:', r6.total, '| 官方: 5883.44 | 差:', (r6.total - 5883.44)?.toFixed(2));
