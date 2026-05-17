// 对比测试：原速算计算器 vs 新引擎
// 使用已从原HTML提取的纯计算函数（orig_calc.js）

const fs = require('fs');
const path = require('path');

// ========== 1. 加载原计算器的纯计算函数 ==========
const origCalcPath = path.join(__dirname, 'orig_calc.js');
if (!fs.existsSync(origCalcPath)) {
  console.error('❌ orig_calc.js 不存在，请先运行提取脚本');
  process.exit(1);
}

global.window = global;
let origCode = fs.readFileSync(origCalcPath, 'utf8');
try {
  eval(origCode);
  console.log('✅ 原计算器纯计算函数加载成功\n');
} catch(e) {
  console.error('❌ 加载原计算器函数失败：', e.message);
  process.exit(1);
}

// ========== 2. 加载新引擎 ==========
const filesToLoad = [
  path.join(__dirname, 'data', 'salary-history.js'),
  path.join(__dirname, 'data', 'interest-rates.js'),
  path.join(__dirname, 'data', 'payment-months.js'),
  path.join(__dirname, 'engine', 'core.js')
];
for (const file of filesToLoad) {
  if (fs.existsSync(file)) {
    const code = fs.readFileSync(file, 'utf8');
    const adaptedCode = code.replace(/window\./g, 'global.');
    try { eval(adaptedCode); } catch(e) {}
  }
}

// ========== 3. 用相同参数跑两边 ==========
const birth = { year: 1971, month: 5 };
const workStart = { year: 1992, month: 7 };
const city = 'cc';
const idx = 1.0;
const genderType = 'male';

console.log('========================================');
console.log('  对比测试：原计算器 vs 新引擎');
console.log('========================================\n');
console.log('【输入参数（与原计算器默认值一致）】');
console.log(`  出生：1971年5月`);
console.log(`  参加工作：1992年7月`);
console.log(`  参保地：长春市，缴费指数：1.00\n`);

// ------ 原计算器：法定退休 ------
const origLegalTotal = getRetireTotalMonths(birth.year, birth.month, 'male');
const origLegalDate = getRetireDate(birth.year, birth.month, origLegalTotal);
const origLegal = calcPension(birth, workStart, origLegalDate, origLegalTotal, 'cc', 1.0, 0);

console.log('【原计算器 - 法定退休】');
console.log(`  退休年龄：${getAgeStr(origLegalTotal)}`);
console.log(`  退休时间：${origLegalDate.year}年${origLegalDate.month}月`);
console.log(`  计发月数：${origLegal.months}`);
console.log(`  基础养老金：¥${origLegal.basicPension.toFixed(2)}`);
console.log(`  增发养老金：¥${origLegal.extraPension.toFixed(2)}`);
console.log(`  个人账户养老金：¥${origLegal.personalPension.toFixed(2)}`);
console.log(`  过渡性养老金：¥${origLegal.transPension.toFixed(2)}`);
console.log(`  替代率：${origLegal.rate.toFixed(1)}%`);
console.log(`  ✅ 合计：¥${origLegal.total.toFixed(2)}/月\n`);

// ------ 新引擎：法定退休 ------
const newLegalTotal = global.getRetireTotalMonths(birth.year, birth.month, genderType);
const newLegalDate = global.getRetireDate(birth.year, birth.month, newLegalTotal);
const newLegal = global.calculatePensionFull({
  birth, workStart, city: 'cc', idx: 1.0, genderType, retireType: 'legal'
});

console.log('【新引擎 - 法定退休】');
console.log(`  退休年龄：${global.getAgeStr(newLegalTotal)}`);
console.log(`  退休时间：${newLegalDate.year}年${newLegalDate.month}月`);
console.log(`  计发月数：${newLegal.months}`);
console.log(`  基础养老金：¥${newLegal.basicPension.toFixed(2)}`);
console.log(`  增发养老金：¥${newLegal.extraPension.toFixed(2)}`);
console.log(`  个人账户养老金：¥${newLegal.personalPension.toFixed(2)}`);
console.log(`  过渡性养老金：¥${newLegal.transPension.toFixed(2)}`);
console.log(`  替代率：${newLegal.rate.toFixed(1)}%`);
console.log(`  ✅ 合计：¥${newLegal.total.toFixed(2)}/月\n`);

// ------ 对比结果 ------
console.log('========================================');
console.log('  对比结果');
console.log('========================================');
const diff = Math.abs(origLegal.total - newLegal.total);
const diffPct = origLegal.total > 0 ? (diff / origLegal.total * 100).toFixed(2) : '0.00';
console.log(`  原计算器合计：¥${origLegal.total.toFixed(2)}`);
console.log(`  新引擎合计：  ¥${newLegal.total.toFixed(2)}`);
console.log(`  差额：          ¥${diff.toFixed(2)}（${diffPct}%）`);

if (diff < 0.5) {
  console.log(`  ✅ 结果一致！（差异 < 0.5元）`);
} else if (diff < 10) {
  console.log(`  ⚠️ 微小差异（可能四舍五入）`);
  console.log('');
  console.log('  逐项对比：');
  console.log(`    基础养老金：原¥${origLegal.basicPension.toFixed(2)} vs 新¥${newLegal.basicPension.toFixed(2)}（差¥${(origLegal.basicPension - newLegal.basicPension).toFixed(2)}）`);
  console.log(`    增发养老金：原¥${origLegal.extraPension.toFixed(2)} vs 新¥${newLegal.extraPension.toFixed(2)}（差¥${(origLegal.extraPension - newLegal.extraPension).toFixed(2)}）`);
  console.log(`    个人账户：  原¥${origLegal.personalPension.toFixed(2)} vs 新¥${newLegal.personalPension.toFixed(2)}（差¥${(origLegal.personalPension - newLegal.personalPension).toFixed(2)}）`);
  console.log(`    过渡性：    原¥${origLegal.transPension.toFixed(2)} vs 新¥${newLegal.transPension.toFixed(2)}（差¥${(origLegal.transPension - newLegal.transPension).toFixed(2)}）`);
} else {
  console.log(`  ❌ 结果不一致！需要核查`);
  console.log('');
  console.log('  逐项对比：');
  console.log(`    基础养老金：原¥${origLegal.basicPension.toFixed(2)} vs 新¥${newLegal.basicPension.toFixed(2)}（差¥${(origLegal.basicPension - newLegal.basicPension).toFixed(2)}）`);
  console.log(`    增发养老金：原¥${origLegal.extraPension.toFixed(2)} vs 新¥${newLegal.extraPension.toFixed(2)}（差¥${(origLegal.extraPension - newLegal.extraPension).toFixed(2)}）`);
  console.log(`    个人账户：  原¥${origLegal.personalPension.toFixed(2)} vs 新¥${newLegal.personalPension.toFixed(2)}（差¥${(origLegal.personalPension - newLegal.personalPension).toFixed(2)}）`);
  console.log(`    过渡性：    原¥${origLegal.transPension.toFixed(2)} vs 新¥${newLegal.transPension.toFixed(2)}（差¥${(origLegal.transPension - newLegal.transPension).toFixed(2)}）`);
}
console.log('========================================');
