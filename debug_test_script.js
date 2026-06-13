/**
 * 完全模拟测试脚本 - 四川省案例1
 */

const { calculate } = require('./engine/pension-engine.js');
const mod = require('./data/provinces/sichuan.js');

console.log('=== 完全模拟测试脚本 - 四川省案例1 ===\n');

const testCase = mod.cases[0];
console.log('testCase.name:', testCase.name);
console.log('testCase.input:', testCase.input);

// 模拟测试脚本的逻辑
const engineConfig = (typeof mod.getEngineConfig === 'function') 
  ? mod.getEngineConfig() 
  : mod;

console.log('\nengineConfig.base_rates:', typeof engineConfig.base_rates);
console.log('engineConfig.base_rates.prov:', typeof engineConfig.base_rates.prov);
console.log('engineConfig.base_rates.prov[2024]:', engineConfig.base_rates.prov['2024']);

// 准备输入数据（兼容两种格式）
const input = testCase.input ? { ...testCase.input } : { ...testCase };
delete input.name;
delete input.results;
delete input.officialDocument;
delete input.note;
delete input.expected;

console.log('\ninput:', JSON.stringify(input).substring(0, 200));

// 调用引擎
console.log('\n开始计算...');
try {
  const result = calculate(engineConfig, input);
  console.log('✅ 计算成功！');
  console.log('result.legal:', typeof result.legal);
  console.log('基础养老金:', result.legal.basicPension.amount);
  console.log('总养老金:', result.legal.total);
} catch (e) {
  console.log('❌ 计算失败:', e.message);
  console.log('错误堆栈:', e.stack.substring(0, 1500));
}
