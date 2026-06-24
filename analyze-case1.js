const engine = require('./engine/pension-engine.js');
const heilongjiang = require('./cloudfunctions/calculate/provinces/heilongjiang.js');

console.log('=== 详细分析案例1 ===\n');

const c = heilongjiang.cases[0];
console.log('案例参数：', JSON.stringify(c.input, null, 2));
console.log('期望结果：', JSON.stringify(c.expected, null, 2));

const config = heilongjiang.getEngineConfig();
const result = engine.calculate(config, c.input);

console.log('\n=== 计算结果 ===');
console.log('退休日期：', result.legal.date);
console.log('计发月数：', result.legal.months);
console.log('总缴费年限：', result.legal.totalYears);
console.log('视同缴费年限：', result.legal.sightYears);
console.log('实际缴费年限：', result.legal.actualYears);
console.log('平均缴费指数：', result.legal.avgIndex);
console.log('计发基数（退休时）：', result.legal.baseRetire);
console.log('计发基数（全省）：', result.legal.baseProv);

console.log('\n=== 基础养老金计算 ===');
const B = result.legal.baseRetire;
const I = result.legal.avgIndex;
const T = result.legal.totalYears;
console.log(`公式：(计发基数 + 计发基数 × 指数) / 2 × 缴费年限 × 1%`);
console.log(`计算：${B} + ${B} × ${I} = ${B * (1 + I)}`);
console.log(`除以2：${B * (1 + I) / 2}`);
console.log(`乘以缴费年限${T}：${B * (1 + I) / 2 * T}`);
console.log(`乘以1%：${B * (1 + I) / 2 * T * 0.01}`);
console.log(`实际结果：${result.legal.basicPension.amount}`);

console.log('\n=== 期望反推 ===');
const expectedBase = c.expected.base;
console.log(`期望基础养老金：${expectedBase}`);
console.log(`反推计发基数：${expectedBase / (T * 0.01 * (1 + I) / 2)}`);

console.log('\n=== 过渡性养老金计算 ===');
console.log('视同缴费年限：', result.legal.sightYears);
console.log('过渡系数：', config.modules.transitional_pension.coefficient);
console.log('计算结果：', result.legal.transitionalPension.amount);

console.log('\n=== 检查 avg_salary_history ===');
const avgSalary = config.avg_salary_history;
console.log('2023年社平：', avgSalary['2023']);
console.log('2024年社平：', avgSalary['2024']);
console.log('2025年社平：', avgSalary['2025']);
console.log('2026年社平：', avgSalary['2026']);

console.log('\n=== 检查 base_rates ===');
const baseRates = config.base_rates.prov;
console.log('2023年计发基数：', baseRates[2023]);
console.log('2024年计发基数：', baseRates[2024]);
console.log('2025年计发基数：', baseRates[2025]);
