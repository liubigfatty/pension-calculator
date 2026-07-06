const engine = require('./engine/pension-engine.js');
const heilongjiang = require('./cloudfunctions/calculate/provinces/heilongjiang.js');

console.log('=== 测试黑龙江省计算结果 ===\n');

const cases = heilongjiang.cases || [];

if (cases.length === 0) {
  console.log('❌ 没有验证案例');
  process.exit(1);
}

let pass = 0, fail = 0;

cases.forEach((c, i) => {
  console.log(`\n案例 ${i + 1}: ${c.name || '未命名'}`);
  
  try {
    const config = heilongjiang.getEngineConfig();
    const result = engine.calculate(config, c.input);
    
    // 引擎返回值格式：result.legal.basicPension.amount
    const legal = result.legal;
    
    console.log('  计算结果：');
    console.log(`    基础养老金：${legal.basicPension.amount}（期望：${c.expected.base}）`);
    console.log(`    个人账户养老金：${legal.personalAccount.amount}（期望：${c.expected.personal}）`);
    console.log(`    过渡性养老金：${legal.transitionalPension.amount}（期望：${c.expected.transition}）`);
    console.log(`    总养老金：${legal.total}（期望：${c.expected.total}）`);
    
    // 验证
    const tolerance = 1.0;  // 容忍度：1元
    let casePass = true;
    
    if (Math.abs(legal.basicPension.amount - c.expected.base) > tolerance) {
      console.log(`  ❌ 基础养老金差异：${(legal.basicPension.amount - c.expected.base).toFixed(2)}`);
      casePass = false;
    }
    if (Math.abs(legal.personalAccount.amount - c.expected.personal) > tolerance) {
      console.log(`  ❌ 个人账户养老金差异：${(legal.personalAccount.amount - c.expected.personal).toFixed(2)}`);
      casePass = false;
    }
    if (Math.abs(legal.transitionalPension.amount - c.expected.transition) > tolerance) {
      console.log(`  ❌ 过渡性养老金差异：${(legal.transitionalPension.amount - c.expected.transition).toFixed(2)}`);
      casePass = false;
    }
    if (Math.abs(legal.total - c.expected.total) > tolerance) {
      console.log(`  ❌ 总养老金差异：${(legal.total - c.expected.total).toFixed(2)}`);
      casePass = false;
    }
    
    if (casePass) {
      console.log('  ✅ 通过');
      pass++;
    } else {
      fail++;
    }
  } catch (e) {
    console.log(`  ❌ 计算失败：${e.message}`);
    fail++;
  }
});

console.log(`\n=== 结果：${pass}通过，${fail}失败 ===`);
