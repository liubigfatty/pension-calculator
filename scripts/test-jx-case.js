/**
 * 测试江西案例：女职工50岁退休
 * 出生: 1976-02, 工作: 1998-07, 平均缴费指数: 1.0
 * 退休: 2026-02 (50岁)
 */

const engine = require('../engine/pension-engine');
const configModule = require('../data/provinces/jiangxi.js');
const config = configModule.getEngineConfig();

const inputData = {
  birthYear: 1976,
  birthMonth: 2,
  workYear: 1998,
  workMonth: 7,
  genderType: 'fw',   // 女职工 50岁退休
  avgIndex: 1.0,
  cityType: 'prov',    // 全省统一（非长春/沈阳等）
  sightYears: 0,        // 无视同缴费年限
};

console.log('=== 输入数据 ===');
console.log(JSON.stringify(inputData, null, 2));
console.log('\n=== 省份配置 ===');
console.log('account_start:', config.account_start);
console.log('has avg_salary_history:', !!config.avg_salary_history);

console.log('\n=== 开始计算 ===');
try {
  const result = engine.calculate(config, inputData);
  
  console.log('\n=== 关键结果 ===');
  console.log('退休日期:', result.legal.date);
  console.log('计发月数:', result.legal.months);
  console.log('个人账户余额 (balance):', result.legal.personalAccount.balance);
  console.log('个人账户养老金 (amount):', result.legal.personalAccount.amount);
  console.log('基础养老金:', result.legal.basicPension.amount);
  console.log('过渡性养老金:', result.legal.transitionalPension.amount);
  console.log('总养老金:', result.legal.total);
  
  console.log('\n=== 缴费信息 ===');
  console.log('缴费年限(legal):', result.legal.totalYears, '年');
  console.log('实际缴费(legal):', result.legal.actualYears, '年');
  console.log('视同缴费(legal):', result.legal.sightYears, '年');
  console.log('个人账户描述:', result.legal.personalAccount.description);
  console.log('基础养老金描述:', result.legal.basicPension.description);
} catch(e) {
  console.error('\n=== 计算报错 ===');
  console.error(e.stack || e);
}
