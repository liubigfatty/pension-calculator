/**
 * 验证 getAccRate() 全国统一利率表
 * 用法：node verify-interest-rates.js
 */

const engine = require('./engine/pension-engine.js')

let pass = 0, fail = 0

function test(desc, actual, expected) {
  if (Math.abs(actual - expected) < 0.0001) {
    console.log(`  ✅ ${desc}: ${actual}`)
    pass++
  } else {
    console.log(`  ❌ ${desc}: 期望 ${expected}, 实际 ${actual}`)
    fail++
  }
}

console.log('=== 2016+ 全国统一利率 ===')
test('2016', engine.getAccRate(2016, {}), 0.0831)
test('2017', engine.getAccRate(2017, {}), 0.0712)
test('2018', engine.getAccRate(2018, {}), 0.0829)
test('2019', engine.getAccRate(2019, {}), 0.0761)
test('2020', engine.getAccRate(2020, {}), 0.0604)
test('2021', engine.getAccRate(2021, {}), 0.0535)
test('2022', engine.getAccRate(2022, {}), 0.0612)
test('2023', engine.getAccRate(2023, {}), 0.0397)
test('2024', engine.getAccRate(2024, {}), 0.0262)
test('2025', engine.getAccRate(2025, {}), 0.0150)

console.log('\n=== 2026+ 回退（最近已知=2025年1.5%）===')
test('2026', engine.getAccRate(2026, {}), 0.0150)
test('2030', engine.getAccRate(2030, {}), 0.0150)

console.log('\n=== 2016年前：省份配置优先 ===')
const config = { interest_rates: { 2015: 0.025, 2008: 0.0393 } }
test('2015（配置有）', engine.getAccRate(2015, config), 0.025)
test('2008（配置有）', engine.getAccRate(2008, config), 0.0393)

console.log('\n=== 2016年前：配置无则默认2.5% ===')
test('1995（无配置）', engine.getAccRate(1995, {}), 0.025)

console.log(`\n结果：${pass} 通过，${fail} 失败`)
process.exit(fail > 0 ? 1 : 0)
