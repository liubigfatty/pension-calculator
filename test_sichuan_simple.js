/**
 * 简化测试 - 只测试四川省案例1
 */

const { calculate } = require('./engine/pension-engine.js');
const mod = require('./data/provinces/sichuan.js');

console.log('=== 简化测试 - 四川省案例1 ===\n');

const testCase = mod.cases[0];
console.log('案例:', testCase.name);

// 准备输入数据（兼容两种格式）
const input = testCase.input ? { ...testCase.input } : { ...testCase };
delete input.name;
delete input.results;
delete input.officialDocument;
delete input.note;

console.log('input:', JSON.stringify(input).substring(0, 200));

// 获取引擎配置
const engineConfig = mod.getEngineConfig();
console.log('\nengineConfig.base_rates.prov 2024:', engineConfig.base_rates.prov['2024']);

// 调用引擎
console.log('\n开始计算...');
try {
  const result = calculate(engineConfig, input);
  console.log('✅ 计算成功！');
  console.log('基础养老金:', result.legal.basicPension.amount);
  console.log('总养老金:', result.legal.totalPension.amount);
} catch (e) {
  console.log('❌ 计算失败:', e.message);
  console.log('错误堆栈:', e.stack.substring(0, 1000));
}
