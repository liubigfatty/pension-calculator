// scripts/test-cloud-function.js
// 测试云函数calculate的逻辑是否正确

const pensionEngine = require('../engine/pension-engine.js')
const fs = require('fs')
const path = require('path')

// 模拟云函数输入
const testCases = [
  {
    name: '北京-男性-60岁退休',
    province: 'beijing',
    input: {
      birthYear: 1965,
      birthMonth: 10,
      workYear: 1985,
      workMonth: 7,
      retireYear: 2025,
      retireMonth: 10,
      avgIndex: 1.2,
      personalAcc: 80000,
      sightYears: 10,
      totalYears: 40,
      actualYears: 30,
      months: 480,
      retireType: 'standard',
      cityType: 'prov'
    }
  }
]

console.log('=== 云函数逻辑验证 ===\n')

for (const tc of testCases) {
  console.log(`测试案例：${tc.name}`)
  
  try {
    // 加载省份配置
    const configPath = path.join(__dirname, '../provinces', `${tc.province}.json`)
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    
    // 调用计算引擎
    const result = pensionEngine.calculate(config, tc.input)
    
    // 调试：看看实际返回结构
    console.log('  引擎返回结果（legal）：', JSON.stringify(result.legal, null, 2))
    
    console.log('  基础养老金：', result.legal.basicPension.amount)
    console.log('  个人账户养老金：', result.legal.personalAccount.amount)
    console.log('  过渡性养老金：', result.legal.transitionalPension.amount)
    console.log('  总计：', result.legal.total)
    console.log('  ✅ 计算成功\n')
    
  } catch (error) {
    console.log('  ❌ 计算失败：', error.message, '\n')
  }
}

console.log('=== 验证完成 ===')
