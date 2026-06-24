// test-estimate.js
// 直接调用引擎，看估算逻辑

const engine = require('./engine/pension-engine.js')
const jiangxi = require('./data/provinces/jiangxi.js')

console.log('=== 测试江西案例 ===')
console.log('参数:')
console.log('  出生: 1976-02')
console.log('  工作: 1998-07')
console.log('  指数: 1.0')
console.log('  性别: 女, 身份: 企业, 退休年龄: 50岁')
console.log('')

// 构造输入参数（与云函数格式一致）
const input = {
  province: 'jiangxi',
  cityType: 'prov',
  gender: 'female',
  identity: 'enterprise',
  genderType: 'ent50',  // 企业女工人50岁退休
  birthDate: '1976-02',
  workStartDate: '1998-07',
  averageIndex: 1.0,
  personalAccount: 0,  // 0 → 引擎自动估算
  extras: {},
  estimateOnly: true
}

// 直接调用引擎
try {
  const result = engine.calculate(input)
  
  console.log('引擎返回结果:')
  console.log(JSON.stringify(result, null, 2))
  
  if (result.success && result.data) {
    console.log('')
    console.log('=== 关键信息 ===')
    console.log('个人账户余额:', result.data.personalAccount, '元')
    console.log('累计缴费年限:', result.data.totalYears, '年')
    console.log('实际缴费年限:', result.data.actualYears, '年')
    console.log('视同缴费年限:', result.data.sightYears, '年')
    console.log('')
    
    // 打印各模块金额
    if (result.data.pensionAmounts) {
      console.log('=== 养老金构成 ===')
      Object.entries(result.data.pensionAmounts).forEach(([k, v]) => {
        console.log(`  ${k}: ${v} 元`)
      })
    }
  }
} catch (err) {
  console.error('错误:', err.message)
  console.error(err.stack)
}
