const { calculate } = require('./engine/pension-engine');
const config = require('./provinces/gansu.json');

// 甘肃案例1（2025-05退休，男，60岁）
const input = {
  birthYear: 1965,
  birthMonth: 5,
  workYear: 1989,
  workMonth: 7,
  gender: 'male',
  genderType: 'male',
  cityType: 'prov',
  personalAcc: 167590.39,
  sightYears: 6.42,
  totalYears: 35.83,
  avgIndex: 1.2458,
  baseRetire: 7594,
  baseProv: 7594,
  retireYear: 2025,
  retireMonth: 5,
  skipDelay: true,
};

const result = calculate(config, input);

console.log('=== 甘肃案例1 引擎验证 ===');
console.log('');

// 从legal对象提取结果
const legal = result.legal;
const basePension = legal.basicPension?.amount;
const personalPension = legal.personalAccount?.amount;
const transPension = legal.transitionalPension?.amount;
const totalPension = legal.total;

console.log('引擎输出:');
console.log('  基础养老金:', basePension);
console.log('  个人账户养老金:', personalPension);
console.log('  过渡性养老金:', transPension);
console.log('  合计:', totalPension);
console.log('');
console.log('官方核定表:');
console.log('  基础养老金: 3055.33');
console.log('  个人账户养老金: 1205.69');
console.log('  过渡性养老金: 728.85');
console.log('  合计: 4989.87');
console.log('');

// 验证
const checks = [
  { name: '基础养老金', engine: basePension, official: 3055.33 },
  { name: '个人账户养老金', engine: personalPension, official: 1205.69 },
  { name: '过渡性养老金', engine: transPension, official: 728.85 },
  { name: '合计', engine: totalPension, official: 4989.87 }
];

let allPass = true;
checks.forEach(c => {
  const diff = Math.abs(c.engine - c.official);
  const pass = diff < 0.01;
  console.log(`${c.name}: 引擎=${c.engine.toFixed(2)}, 官方=${c.official.toFixed(2)}, 差=${diff.toFixed(2)} ${pass ? '✅' : '❌'}`);
  if (!pass) allPass = false;
});

console.log('');
console.log(allPass ? '✅ 全部通过！' : '❌ 有差异，需要调整');
