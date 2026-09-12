// 云函数入口文件
// 纯计算函数：不依赖 wx-server-sdk。
//   本函数不使用云数据库 / 云存储 / OpenID 等任何云服务，只需接收 event 返回计算结果，
//   因此无需 cloud.init()。此前 package.json 声明 wx-server-sdk 但 CLI 部署不装依赖
//   （云端运行时为 node16，SDK 不再内置），导致 "Cannot find module 'wx-server-sdk'" 报错。
//   若将来需要云服务，再恢复：const cloud = require('wx-server-sdk') + cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const engine = require('./pension-engine.js')

// 云函数入口
exports.main = async (event) => {
  try {
    const { province, cityType, gender, identity, genderType, birthDate, workStartDate, averageIndex, personalAccount, extras, estimateOnly } = event

    // 参数校验（personalAccount 不再必填，不填则引擎自动估算）
    // 逐个点名缺失字段，便于前端直接定位（曾因只回"参数不完整"无法排查）
    const missing = []
    if (!province) missing.push('province')
    if (!gender) missing.push('gender')
    if (!birthDate) missing.push('birthDate')
    if (!workStartDate) missing.push('workStartDate')
    if (!averageIndex) missing.push('averageIndex')
    if (missing.length) {
      return { success: false, message: `参数不完整：${missing.join('、')}`, missing }
    }

    // 加载省份配置
    // 【必须走单文件】微信开发者工具 CLI 部署云函数时不上传子目录，
    //   云端 require('./provinces/xx.js') 会报 Cannot find module（2026-09-09 线上事故）。
    //   故优先读构建产物 provinces-data.js（31 省内联，由 scripts/build-cloud-provinces.js 生成），
    //   仅在单文件缺失时回退到子目录（本地调试场景）。
    let config
    try {
      let single = null
      try { single = require('./provinces-data.js') } catch (_) { /* 单文件不存在，走回退 */ }

      if (single && typeof single.getConfig === 'function') {
        config = single.getConfig(province)
        if (!config) {
          return { success: false, message: `未找到省份[${province}]的配置（单文件 provinces-data.js 中无此省）` }
        }
      } else {
        // 回退：子目录（仅限本地；云端无此目录）
        const provModule = require(`./provinces/${province}.js`)
        config = provModule.getEngineConfig()
      }
    } catch (e) {
      console.error('加载省份配置失败：', e.message)
      return { success: false, message: `未找到省份[${province}]的配置：${e.message}` }
    }

    // 构造引擎输入参数（字段名必须与引擎 calculate() 入参一致，驼峰命名）
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
      // 城市类型（如 shenyang/dalian/prov），引擎 calculate() 用 data.cityType 匹配城市计发基数
      cityType: cityType || 'prov',
      // 不设置 skipDelay，让引擎自动计算延迟退休
    }

    // 加发项拆包：前端 step3 把加发项收集成 extras 对象（键名=引擎扁平字段，如 extraRate/oneChild/intellectual/
    // regionCategory/tibetWorkYears/oneChildType/oneChildAvgPension），引擎只认扁平字段、不读 input.extras，
    // 故必须在此逐键摊平到 input 顶层，否则小程序加发项一律算 0。
    const extrasIn = extras || {}
    for (const k of Object.keys(extrasIn)) {
      const v = extrasIn[k]
      if (v !== undefined && v !== null && v !== '') input[k] = v
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

    // 调用真正的计算引擎
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
