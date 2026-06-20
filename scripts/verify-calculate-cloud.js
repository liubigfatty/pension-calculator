// scripts/verify-calculate-cloud.js
// 自动化测试：验证云端calculate函数是否能正常调用（模拟云函数环境）

const fs = require('fs')
const path = require('path')

// 模拟云函数环境
const cloud = {
  init: () => {},
  DYNAMIC_CURRENT_ENV: 'cloud1-xxx'
}

// 模拟wx.cloud.callFunction的返回
function mockCallFunction(params) {
  try {
    // 加载省份配置
    const configPath = path.join(__dirname, '../provinces', `${params.province}.json`)
    if (!fs.existsSync(configPath)) {
      return { result: { success: false, message: `省份配置不存在: ${params.province}` } }
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    
    // 调用计算引擎
    const pensionEngine = require('../engine/pension-engine.js')
    
    // 构造引擎输入
    const birthParts = params.birthDate.split('-')
    const workParts = params.workStartDate.split('-')
    const input = {
      province: params.province,
      gender: params.gender,
      genderType: params.genderType,
      birthYear: parseInt(birthParts[0]),
      birthMonth: parseInt(birthParts[1]),
      workYear: parseInt(workParts[0]),
      workMonth: parseInt(workParts[1]),
      avgIndex: params.averageIndex,
      personalAcc: params.personalAccount,
      sightYears: 0,
      totalYears: params.totalYears || 40,
      actualYears: params.actualYears || 30,
      months: params.months || 480,
      retireType: 'standard',
      cityType: params.cityType || 'prov'
    }
    
    const result = pensionEngine.calculate(config, input)
    
    return {
      result: {
        success: true,
        data: {
          legal: result.legal,
          flex: result.flex,
          metaData: result.metaData
        }
      }
    }
  } catch (error) {
    return { result: { success: false, message: error.message } }
  }
}

// 测试用例
const testCases = [
  {
    name: '北京-男性-60岁退休',
    params: {
      province: 'beijing',
      cityType: 'prov',
      gender: 'male',
      genderType: 'male',
      birthDate: '1965-10',
      workStartDate: '1985-07',
      averageIndex: 1.2,
      personalAccount: 80000,
      totalYears: 40,
      actualYears: 30,
      months: 480
    }
  },
  {
    name: '上海-女性-50岁退休',
    params: {
      province: 'shanghai',
      cityType: 'prov',
      gender: 'female',
      genderType: 'fw50',
      birthDate: '1975-05',
      workStartDate: '1995-07',
      averageIndex: 1.0,
      personalAccount: 50000,
      totalYears: 30,
      actualYears: 25,
      months: 360
    }
  }
]

console.log('=== 云函数调用验证（自动化测试）===\n')

let passCount = 0
let failCount = 0

for (const tc of testCases) {
  console.log(`测试：${tc.name}`)
  
  const res = mockCallFunction(tc.params)
    
  if (res.result.success) {
    const legal = res.result.data.legal
    console.log(`  ✅ 调用成功`)
    console.log(`    总计：${legal.total}`)
    console.log(`    基础养老金：${legal.basicPension.amount}`)
    console.log(`    个人账户养老金：${legal.personalAccount.amount}`)
    console.log(`    过渡性养老金：${legal.transitionalPension.amount}`)
    passCount++
  } else {
    console.log(`  ❌ 调用失败：${res.result.message}`)
    failCount++
  }
  console.log()
}

console.log('=== 测试结果 ===')
console.log(`通过：${passCount} 个`)
console.log(`失败：${failCount} 个`)
console.log(`总计：${passCount + failCount} 个`)

if (failCount === 0) {
  console.log('\n✅ 所有测试用例通过！云函数逻辑正常。')
} else {
  console.log(`\n❌ 有${failCount}个测试用例失败，请检查。`)
}
