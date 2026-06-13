/**
 * 调试四川省案例
 */

const { calculate } = require('./engine/pension-engine.js');
const mod = require('./data/provinces/sichuan.js');

console.log('=== 调试四川省案例 ===\n');

// 测试案例1
const testCase = mod.cases[0];
console.log('案例1:', testCase.name);
console.log('input:', JSON.stringify(testCase.input).substring(0, 300));

const engineConfig = mod.getEngineConfig();
console.log('\nengineConfig.base_rates:', JSON.stringify(engineConfig.base_rates).substring(0, 200));
console.log('engineConfig.modules:', JSON.stringify(engineConfig.modules).substring(0, 200));

try {
  const result = calculate(engineConfig, testCase.input);
  console.log('\n✅ 计算成功！');
  console.log('基础养老金:', result.legal.basicPension.amount);
  console.log('总养老金:', result.legal.totalPension.amount);
} catch (e) {
  console.log('\n❌ 计算失败:', e.message);
  console.log('错误堆栈:', e.stack.substring(0, 800));
}
