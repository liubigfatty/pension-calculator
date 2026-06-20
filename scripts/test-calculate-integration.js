// scripts/test-calculate-integration.js
// 集成测试：验证云函数调用逻辑是否正确

const pensionEngine = require('../engine/pension-engine.js')
const fs = require('fs')
const path = require('path')

// 模拟 wx.cloud.callFunction 的返回结构
function mockCloudCallFunction(params) {
  try {
    // 加载省份配置
    const configPath = path.join(__dirname, '../provinces', `${params.province}.json`)
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    
    // 构造引擎输入
    const input = {
      province: params.province,
      gender: params.gender,
      genderType: params.genderType,
      birthYear: parseInt(params.birthDate.split('-')[0]),
      birthMonth: parseInt(params.birthDate.split('-')[1]),
      workYear: parseInt(params.workStartDate.split('-')[0]),
      workMonth: parseInt(params.workStartDate.split('-')[1]),
      avgIndex: params.averageIndex,
      personalAcc: params.personalAccount,
      sightYears: 0, // 简化处理
      totalYears: 40, // 简化处理
      actualYears: 30, // 简化处理
      months: 480, // 简化处理
      retireType: 'standard',
      cityType: params.cityType || 'prov'
    }
    
    // 调用计算引擎
    const result = pensionEngine.calculate(config, input)
    
    // 模拟云函数返回结构
    return {
      result: {
        success: true,
        data: {
          legal: result.legal,
          metaData: result.metaData
        }
      }
    }
  } catch (error) {
    return {
      result: {
        success: false,
        message: error.message
      }
    }
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
      identity: 'employee',
      genderType: 'male',
      birthDate: '1965-10',
      workStartDate: '1985-07',
      averageIndex: 1.2,
      personalAccount: 80000
    }
  }
]

console.log('=== 集成测试：云函数调用逻辑验证 ===\n')

for (const tc of testCases) {
  console.log(`测试案例：${tc.name}`)
  
  const res = mockCloudCallFunction(tc.params)
    
  if (res.result.success) {
    const legal = res.result.data.legal
    console.log('  ✅ 调用成功')
    console.log(`    总计：${legal.total}`)
    console.log(`    基础养老金：${legal.basicPension.amount}`)
    console.log(`    个人账户养老金：${legal.personalAccount.amount}`)
    console.log(`    过渡性养老金：${legal.transitionalPension.amount}`)
  } else {
    console.log('  ❌ 调用失败：', res.result.message)
  }
    
  console.log()
}

console.log('=== 验证完成 ===')
console.log('')
console.log('建议：')
console.log('1. 在微信开发者工具里运行测试页面（pages/test/test）')
console.log('2. 检查wx.cloud.callFunction是否能正常调用')
console.log('3. 对比命令行结果和微信开发者工具结果是否一致')
