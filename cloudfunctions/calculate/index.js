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

    // ── 上海指数保底（沪人社规〔2021〕32号）──
    // 背景：主程序 step2 让用户「选缴费档次」（60档→0.6）或手填平均缴费指数。
    //   上海明文规则：1993-2011 年实际缴费指数低于 1 的按 1 计；2012 年 ≥0.85；2013 年 ≥0.75；
    //   2014 年起无省级明文 ⇒ 按实际比值。
    //   ⇒ 全程按最低档缴的真实平均指数约 0.84，而不是 0.6；直接把档位比例当平均指数传进来，
    //     会系统性低估约 18.5%（1993参工/2026退休实测：4,744 vs 真实 5,823，差 1,078 元/月）。
    // 触发条件（缺一不可，严防误伤）：
    //   ① province === 'shanghai'
    //   ② 调用方显式传了 indexLevel（= 全程按该档位缴纳的档位比例）
    //   ⇒ 手填的 averageIndex 本身就是"平均值"，对它再保底 = 二次保底，会高估，故绝不重算。
    //   ⇒ 参工年晚（2014 后）的上海用户逐年 floor 全为 null，重算结果 = 原档位，自动不触发。
    let shanghaiFloorNote = null
    if (province === 'shanghai' && event.indexLevel) {
      const level = parseFloat(event.indexLevel)
      if (!isNaN(level) && level > 0) {
        try {
          // 退休年只有引擎知道（延迟退休在引擎内算），先跑一次拿 legal.date.year
          const probe = engine.calculate(config, input)
          const retireYear = probe && probe.legal && probe.legal.date && probe.legal.date.year
          const startYear = input.workYear
          if (retireYear && startYear && retireYear >= startYear) {
            let sum = 0, n = 0
            for (let y = startYear; y <= retireYear; y++) {
              let f = null
              if (y >= 1993 && y <= 2011) f = 1.0
              else if (y === 2012) f = 0.85
              else if (y === 2013) f = 0.75
              sum += (f != null ? Math.max(f, level) : level)
              n++
            }
            const floored = n ? Math.round((sum / n) * 10000) / 10000 : level
            const before = input.avgIndex
            if (floored > before) {
              input.avgIndex = floored
              shanghaiFloorNote = { from: before, to: floored, level, startYear, retireYear }
            }
          }
        } catch (e) {
          console.error('上海保底重算失败，沿用原指数：', e.message)
        }
      }
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
      data: result,
      // 上海保底生效时回传（前端可据此提示"已按上海保底规则修正"）；未触发为 null
      shanghaiFloor: shanghaiFloorNote
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
