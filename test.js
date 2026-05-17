// 养老金计算引擎 - Node.js 验证测试
// 与原养老金速算计算器用相同输入，对比结果

const fs = require('fs');
const path = require('path');

// ========== 模拟 window 全局对象 ==========
global.window = global;

// ========== 加载数据文件和核心引擎 ==========
const baseDir = __dirname;
const filesToLoad = [
  path.join(baseDir, 'data', 'salary-history.js'),
  path.join(baseDir, 'data', 'interest-rates.js'),
  path.join(baseDir, 'data', 'payment-months.js'),
  path.join(baseDir, 'engine', 'core.js')
];

for (const file of filesToLoad) {
  if (fs.existsSync(file)) {
    const code = fs.readFileSync(file, 'utf8');
    // 去掉 'window.' 前缀，让代码在 Node.js 里也能运行
    const adaptedCode = code.replace(/window\./g, 'global.');
    try {
      eval(adaptedCode);
      console.log(`✅ 已加载：${path.basename(file)}`);
    } catch(e) {
      console.log(`❌ 加载失败 ${path.basename(file)}: ${e.message}`);
    }
  } else {
    console.log(`❌ 文件不存在：${file}`);
  }
}

console.log('\n========================================');
console.log('  验证测试：与原速算计算器对比');
console.log('========================================\n');

// ========== 原计算器默认参数 ==========
const birth = { year: 1971, month: 5 };    // 1971年5月生
const workStart = { year: 1992, month: 7 }; // 1992年7月参加工作
const city = 'cc';                        // 长春市
const idx = 1.0;                        // 100%档次
const genderType = 'male';               // 男职工

console.log('【输入参数（与原计算器默认值一致）】');
console.log(`  出生：${birth.year}年${birth.month}月`);
console.log(`  参加工作：${workStart.year}年${workStart.month}月`);
console.log(`  参保地：长春市`);
console.log(`  人员类型：男职工`);
console.log(`  平均缴费指数：${idx.toFixed(2)}\n`);

// ========== 1. 法定退休计算 ==========
const legalTotalMonths = global.getRetireTotalMonths(birth.year, birth.month, genderType);
const legalDate = global.getRetireDate(birth.year, birth.month, legalTotalMonths);

console.log('【1. 法定退休】');
console.log(`  退休年龄：${global.getAgeStr(legalTotalMonths)}`);
console.log(`  退休时间：${legalDate.year}年${legalDate.month}月`);
console.log(`  计发月数：${global.getMonths(legalTotalMonths / 12)}`);

const legalResult = global.calculatePensionFull({
  birth,
  workStart,
  city,
  idx,
  genderType,
  retireType: 'legal'
});

console.log(`  基础养老金：¥${legalResult.basicPension.toFixed(2)}/月`);
console.log(`  增发养老金：¥${legalResult.extraPension.toFixed(2)}/月`);
console.log(`  个人账户养老金：¥${legalResult.personalPension.toFixed(2)}/月`);
console.log(`  过渡性养老金：¥${legalResult.transPension.toFixed(2)}/月`);
console.log(`  替代率：${legalResult.rate.toFixed(1)}%`);
console.log(`  ✅ 合计养老金：¥${legalResult.total.toFixed(2)}/月\n`);

// ========== 2. 弹性提前退休计算 ==========
const originalAge = global.getOriginalRetireAge(genderType);
const flexTotalMonths = Math.max(originalAge * 12, legalTotalMonths - 36);
const flexDate = global.getRetireDate(birth.year, birth.month, flexTotalMonths);
const canFlex = flexTotalMonths < legalTotalMonths;

console.log('【2. 弹性提前退休】');
if (canFlex) {
  console.log(`  最早提前到：${global.getAgeStr(flexTotalMonths)}`);
  console.log(`  提前退休时间：${flexDate.year}年${flexDate.month}月`);
  console.log(`  计发月数：${global.getMonths(flexTotalMonths / 12)}`);

  const flexResult = global.calculatePensionFull({
    birth,
    workStart,
    city,
    idx,
    genderType,
    retireType: 'flex'
  });

  console.log(`  基础养老金：¥${flexResult.basicPension.toFixed(2)}/月`);
  console.log(`  增发养老金：¥${flexResult.extraPension.toFixed(2)}/月`);
  console.log(`  个人账户养老金：¥${flexResult.personalPension.toFixed(2)}/月`);
  console.log(`  过渡性养老金：¥${flexResult.transPension.toFixed(2)}/月`);
  console.log(`  替代率：${flexResult.rate.toFixed(1)}%`);
  console.log(`  ✅ 合计养老金：¥${flexResult.total.toFixed(2)}/月`);
  console.log(`  与法定退休差额：¥${(legalResult.total - flexResult.total).toFixed(2)}/月\n`);
} else {
  console.log(`  不适用（法定退休年龄已等于或低于原法定年龄）\n`);
}

// ========== 3. 系列七案例 ==========
console.log('========================================');
console.log('【3. 系列七案例验证】');
console.log('========================================');
const birth2 = { year: 1976, month: 2 };
const workStart2 = { year: 1998, month: 7 };
const endMonth2 = { year: 2026, month: 3 }; // 协解时间
const genderType2 = 'male';

// 系列七案例：法定退休年龄
const legalTotal2 = global.getRetireTotalMonths(birth2.year, birth2.month, genderType2);
const legalDate2 = global.getRetireDate(birth2.year, birth2.month, legalTotal2);

console.log(`  出生：1976年2月`);
console.log(`  参保：1998年7月`);
console.log(`  法定退休：${global.getAgeStr(legalTotal2)}（${legalDate2.year}年${legalDate2.month}月）`);

const legalResult2 = global.calculatePensionFull({
  birth: birth2,
  workStart: workStart2,
  city: 'cc',
  idx: 1.0,
  genderType: genderType2,
  retireType: 'legal'
});

console.log(`  ✅ 法定退休养老金：¥${legalResult2.total.toFixed(2)}/月`);
console.log(`     基础：¥${legalResult2.basicPension.toFixed(2)}`);
console.log(`     增发：¥${legalResult2.extraPension.toFixed(2)}`);
console.log(`     个人账户：¥${legalResult2.personalPension.toFixed(2)}`);
console.log(`     过渡性：¥${legalResult2.transPension.toFixed(2)}`);
console.log(`     替代率：${legalResult2.rate.toFixed(1)}%\n`);

// ========== 4. 与原计算器对比提示 ==========
console.log('========================================');
console.log('  对比验证方法：');
console.log('  1. 用浏览器打开原计算器：');
console.log('    20260418104502/养老金速算计算器.html');
console.log('  2. 确认默认参数：1971年5月生，1992年7月参加工作');
console.log('  3. 点击"开始计算"，记录结果');
console.log('  4. 与上述"验证测试"结果对比');
console.log('========================================');
