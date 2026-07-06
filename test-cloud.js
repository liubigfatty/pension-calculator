// test-cloud.js
// 测试云函数返回值

const cloud = require('wx-server-sdk')
const engine = require('./engine/pension-engine.js')
const jiangxi = require('./data/provinces/jiangxi.js')

console.log('=== 测试引擎估算逻辑（本地） ===')
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
  sightYears: 0,
}

const result = engine.calculate(jiangxi, input)

console.log('个人账户余额:', result.legal.personalAccount.balance, '元')
console.log('计发基数:', result.legal.baseRetire, '元/月')
console.log('')
console.log('=== 关键数据 ===')
console.log('PROV_BASE[1998]:', jiangxi.PROV_BASE[1998])
console.log('PROV_BASE[2025]:', jiangxi.PROV_BASE[2025])
console.log('')
console.log('=== 反向验证 ===')
console.log('如果余额是31.8万，实际缴费指数大约是:', Math.sqrt(318353 / result.legal.personalAccount.balance).toFixed(2))
