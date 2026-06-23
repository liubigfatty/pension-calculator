// 云函数入口文件
const cloud = require('wx-server-sdk')
const engine = require('./pension-engine.js')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口
exports.main = async (event) => {
  try {
    const { province, cityType, gender, identity, genderType, birthDate, workStartDate, averageIndex, personalAccount, extras, estimateOnly } = event

    // 参数校验（personalAccount 不再必填，不填则引擎自动估算）
    if (!gender || !birthDate || !workStartDate || !averageIndex) {
      return { success: false, message: '参数不完整' }
    }

    // 加载省份配置（require .js 模块，和 verify.js 完全一致）
    let config
    try {
      const provModule = require(`./provinces/${province}.js`)
      // 省份模块导出 { getEngineConfig, MODULES, ... }
      // 需要调用 getEngineConfig() 获取引擎格式的配置
      config = provModule.getEngineConfig()
    } catch (e) {
      console.error('加载省份配置失败：', e.message)
      return { success: false, message: `未找到省份[${province}]的配置：${e.message}` }
    }

    // 构造引擎输入参数（字段名必须和 verify.js buildInput() 完全一致，驼峰命名）
    const input = {
      gender,
      identity,
      genderType: genderType || (gender === "male" ? "male" : "fw50"),
      // 驼峰命名
      birthYear: birthDate.includes('-') ? parseInt(birthDate.split('-')[0]) : parseInt(birthDate),
      birthMonth: birthDate.includes('-') ? parseInt(birthDate.split('-')[1]) : 1,
      workYear: workStartDate.includes('-') ? parseInt(workStartDate.split('-')[0]) : parseInt(workStartDate),
      workMonth: workStartDate.includes('-') ? parseInt(workStartDate.split('-')[1]) : 1,
      avgIndex: parseFloat(averageIndex),
      personalAccInput: parseFloat(personalAccount) || 0,  // 0 或空 → 引擎自动复利估算
      // 加发项（如吉林增发、云南独生子女补贴等）
      extras: extras || {},
      // 城市类型（如 shenyang/dalian/prov），引擎 calculate() 用 data.cityType 匹配城市计发基数
      cityType: cityType || 'prov',
      // 不设置 skipDelay，让引擎自动计算延迟退休
    }

    // 仅估算余额（快速路径，不跑完整测算）
    if (estimateOnly) {
      const result = engine.calculate(config, input)
      const legalBalance = (result.legal && result.legal.personalAccount && result.legal.personalAccount.balance) || 0
      const flexBalance = (result.flex && result.flex.personalAccount && result.flex.personalAccount.balance) || 0
      return {
        success: true,
        data: {
          estimatedBalance: Math.round(Math.max(legalBalance, flexBalance) * 100) / 100
        }
      }
    }

    // 调用真正的计算引擎（和 verify.js 同样的方式）
    const result = engine.calculate(config, input)

    return {
      success: true,
      data: result
    }

  } catch (err) {
    console.error('云函数执行失败：', err)
    return {
      success: false,
      message: err.message,
      stack: err.stack
    }
  }
}
