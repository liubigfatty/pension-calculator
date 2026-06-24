// test-estimate2.js
// 用正确格式调用引擎

const engine = require('./engine/pension-engine.js')
const jiangxi = require('./data/provinces/jiangxi.js')

console.log('=== 测试江西案例 ===')
console.log('')

const input = {
  name: '测试',
  gender: 'female',
  birthYear: 1976,
  birthMonth: 2,
  workYear: 1998,
  workMonth: 7,
  avgIndex: 1.0,
  personalAcc: 0,  // 0 → 引擎自动估算
  retireType: 'standard',
  cityType: 'prov',
  province: 'jiangxi',
  sightYears: 0,  // 1998年后工作，无视同缴费
}

try {
  const result = engine.calculate(jiangxi, input)
  
  console.log('引擎返回完整结果:')
  console.log(JSON.stringify(result, null, 2))
  console.log('')
  
  // 尝试不同的返回值格式
  if (result.success && result.data) {
    console.log('=== 关键信息 ===')
    console.log('个人账户余额:', result.data.personalAccount, '元')
    console.log('累计缴费年限:', result.data.totalYears, '年')
    console.log('实际缴费年限:', result.data.actualYears, '年')
  } else if (result.personalAccount !== undefined) {
    // 可能直接返回数据对象
    console.log('=== 关键信息 ===')
    console.log('个人账户余额:', result.personalAccount, '元')
    console.log('累计缴费年限:', result.totalYears, '年')
    console.log('实际缴费年限:', result.actualYears, '年')
  } else {
    console.log('计算失败:', result.message || result.error)
  }
} catch (err) {
  console.error('错误:', err.message)
  console.error(err.stack)
}
