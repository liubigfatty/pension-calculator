// 测试案例2（淮安-男-1964-03）— 用正确的官方数据
const path = require('path');

// 读取引擎（使用require）
const engine = require('./engine/pension-engine.js');

// 读取江苏配置
const config = require('./provinces/jiangsu.json');

// 测试用例2：淮安-男-1964-03（用正确的官方数据）
const case2 = {
  name: '江苏-淮安-案例2（男60岁退休·过渡性养老金新老办法并存）',
  birthYear: 1964, birthMonth: 3,
  workYear: 1981, workMonth: 3,
  retireYear: 2024, retireMonth: 3,
  gender: 'male',
  personalAcc: 67874.03,  // 官方核定表：个人账户储存额
  totalYears: 43.08,  // 官方核定表：累计缴费年限 43年1个月
  sightYears: 14.83,  // 1981-03到1996-01 = 14年10个月
  avgIndex: 0.3246,  // 官方核定表：平均缴费工资指数
  transIndex: 0.8634,  // 官方核定表：过渡性养老金平均缴费工资指数
  pre1996Years: 14.83,  // 官方核定表：14年10个月
  transPensionOld: 479.83,  // 备注：按原办法计算的过渡性养老金
  baseRetire: 8613,  // 官方核定表：计发基数
  baseProv: 8613,
  months: 139,  // 60岁退休
  expectBase: 2457.64,
  expectPersonal: 488.3,
  expectTrans: 817.43,
  expectTotal: 3763.4
};

console.log('=== 测试案例2：江苏淮安-男-1964-03（用正确数据）===');
console.log('');

// 执行计算
const result = engine.calculate(config, case2);

if (result && result.legal) {
  const legal = result.legal;
  
  console.log('【计算结果】');
  console.log('基础养老金: ' + legal.basicPension.amount + '元');
  console.log('个人账户养老金: ' + legal.personalAccount.amount + '元');
  console.log('过渡性养老金: ' + legal.transitionalPension.amount + '元');
  if (legal.transitionalPension.description) {
    console.log('  说明: ' + legal.transitionalPension.description);
  }
  console.log('合计: ' + legal.total + '元');
  console.log('');
  
  console.log('【官方核定表】');
  console.log('基础养老金: ' + case2.expectBase + '元');
  console.log('个人账户养老金: ' + case2.expectPersonal + '元');
  console.log('过渡性养老金: ' + case2.expectTrans + '元');
  console.log('合计: ' + case2.expectTotal + '元');
  console.log('');
  
  const diffBase = legal.basicPension.amount - case2.expectBase;
  const diffPersonal = legal.personalAccount.amount - case2.expectPersonal;
  const diffTrans = legal.transitionalPension.amount - case2.expectTrans;
  const diffTotal = legal.total - case2.expectTotal;
  
  console.log('【差异】');
  console.log('基础养老金: ' + (diffBase >= 0 ? '+' : '') + diffBase.toFixed(2) + '元');
  console.log('个人账户养老金: ' + (diffPersonal >= 0 ? '+' : '') + diffPersonal.toFixed(2) + '元');
  console.log('过渡性养老金: ' + (diffTrans >= 0 ? '+' : '') + diffTrans.toFixed(2) + '元');
  console.log('合计: ' + (diffTotal >= 0 ? '+' : '') + diffTotal.toFixed(2) + '元');
  console.log('');
  
  if (Math.abs(diffTotal) <= 1) {
    console.log('✅ 案例2 通过！差异' + Math.abs(diffTotal).toFixed(2) + '元 < 1元');
  } else {
    console.log('❌ 案例2 失败！差异' + Math.abs(diffTotal).toFixed(2) + '元 >= 1元');
  }
} else {
  console.log('计算失败，结果为空');
  console.log('result:', result);
}
