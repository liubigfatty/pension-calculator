// 用江西案例参数跑所有省份，检查偏离
// 案例：50岁女职工，1976年2月出生，1998年7月参加工作，指数1.0

const engine = require('./engine/pension-engine')
const fs = require('fs')
const path = require('path')

// 省份配置目录（云函数用的.js文件）
const PROV_DIR = path.join(__dirname, 'cloudfunctions/calculate/provinces')
const PROV_JSON_DIR = path.join(__dirname, 'provinces')  // 本地.json文件

// 江西案例输入参数
const INPUT = {
  birthYear: 1976,
  birthMonth: 2,
  workYear: 1998,
  workMonth: 7,
  gender: '女',
  cityType: 'prov',   // 先用全省基数
  avgIndex: 1.0,
  // 不传 personalAcc，让引擎估算
}

// 获取所有省份列表（从.js文件）
function getProvinceList() {
  const files = fs.readdirSync(PROV_DIR)
  const provinces = []

  for (const f of files) {
    if (f.endsWith('.js') && !f.endsWith('.json')) {
      const name = f.replace('.js', '')
      provinces.push(name)
    }
  }

  return provinces.sort()
}

// 计算单个省份
function calcOneProvince(provName) {
  let config

  try {
    // 尝试加载 .js 配置（云函数格式）
    delete require.cache[require.resolve(path.join(PROV_DIR, provName + '.js'))]
    config = require(path.join(PROV_DIR, provName + '.js'))
  } catch (e) {
    return { error: `加载配置失败: ${e.message}` }
  }

  // 获取引擎配置
  let engineConfig
  if (typeof config.getEngineConfig === 'function') {
    engineConfig = config.getEngineConfig()
  } else if (config.getEngineConfig) {
    engineConfig = config.getEngineConfig
  } else {
    return { error: '配置缺少 getEngineConfig' }
  }

  // 计算
  let result
  try {
    result = engine.calculate(engineConfig, INPUT)
  } catch (e) {
    return { error: `计算失败: ${e.message}` }
  }

  // 提取关键结果
  const legal = result.legal || result
  const pa = legal.personalAccount || {}
  const bp = legal.basicPension || {}
  const tp = legal.transitionalPension || {}
  const ep = legal.extraPension || {}
  return {
    province: provName,
    personalAccBalance: pa.balance || null,    // 累计余额（关键！）
    personalAccAmount: pa.amount || null,       // 月领金额
    basicPension: bp.amount || null,
    transPension: tp.amount || null,
    extraPension: ep.amount || null,
    total: legal.total || null,
    age: legal.age || null,
    months: legal.months || null,
    error: null
  }
}

// 主函数
function main() {
  const provinces = getProvinceList()

  console.log('='.repeat(100))
  console.log('用江西案例参数跑所有省份')
  console.log('案例：50岁女职工，1976年2月出生，1998年7月参加工作，指数1.0')
  console.log('退休时间：2026年2月（50岁）')
  console.log('='.repeat(100))
  console.log()

  console.log('省份        累计余额(元)    月领养老金(元)    基础养老金(元)    过渡性养老金(元)    增发养老金(元)    合计(元)    计发月数')
  console.log('-'.repeat(150))

  const results = []

  for (const prov of provinces) {
    const r = calcOneProvince(prov)
    results.push(r)

    if (r.error) {
      console.log(`${prov.padEnd(12)} ERROR: ${r.error}`)
    } else {
      const bal = r.personalAccBalance !== null ? r.personalAccBalance.toFixed(2) : 'N/A'
      const amt = r.personalAccAmount !== null ? r.personalAccAmount.toFixed(2) : 'N/A'
      const bp = r.basicPension !== null ? r.basicPension.toFixed(2) : 'N/A'
      const tp = r.transPension !== null ? r.transPension.toFixed(2) : 'N/A'
      const ep = r.extraPension !== null ? r.extraPension.toFixed(2) : 'N/A'
      const total = r.total !== null ? r.total.toFixed(2) : 'N/A'
      const months = r.months !== null ? r.months.toString() : 'N/A'

      console.log(`${prov.padEnd(12)} ${bal.padStart(16)} ${amt.padStart(16)} ${bp.padStart(16)} ${tp.padStart(18)} ${ep.padStart(16)} ${total.padStart(12)} ${months.padStart(8)}`)
    }
  }

  console.log('-'.repeat(120))
  console.log()

  // 分析偏离：找出个人账户余额偏离过大的省份
  console.log('========== 个人账户累计余额分析 ==========')
  const validResults = results.filter(r => !r.error && r.personalAccBalance !== null)

  // 以江西为基准（已知正确值约13.4万）
  const jiangxiResult = validResults.find(r => r.province === 'jiangxi')
  if (jiangxiResult) {
    console.log(`江西基准值: ${jiangxiResult.personalAccBalance.toFixed(2)} 元 (月领 ${jiangxiResult.personalAccAmount.toFixed(2)} 元)`)
    console.log()

    console.log('偏离超过20%的省份：')
    let bigDiffCount = 0
    for (const r of validResults) {
      const diff = Math.abs(r.personalAccBalance - jiangxiResult.personalAccBalance)
      const pct = jiangxiResult.personalAccBalance > 0 ? (diff / jiangxiResult.personalAccBalance * 100) : 0
      if (pct > 20) {
        console.log(`  ${r.province.padEnd(12)} ${r.personalAccBalance.toFixed(2).padStart(12)} 元    偏离: +${pct.toFixed(1)}%`)
        bigDiffCount++
      }
    }
    if (bigDiffCount === 0) {
      console.log('  （无，所有省份偏离在20%以内）')
    }
    console.log()

    console.log('所有省份个人账户累计余额排序（从高到低）：')
    validResults.sort((a, b) => b.personalAccBalance - a.personalAccBalance)
    for (const r of validResults) {
      const diff = r.personalAccBalance - jiangxiResult.personalAccBalance
      const pct = (diff / jiangxiResult.personalAccBalance * 100)
      const sign = diff >= 0 ? '+' : ''
      console.log(`  ${r.province.padEnd(12)} ${r.personalAccBalance.toFixed(2).padStart(12)} 元    ${sign}${pct.toFixed(1)}%`)
    }
  }

  console.log()
  console.log('========== 总养老金分析 ==========')
  const validTotals = results.filter(r => !r.error && r.total !== null)
  if (validTotals.length > 0) {
    validTotals.sort((a, b) => b.total - a.total)
    console.log('总养老金范围：')
    console.log(`  最高: ${validTotals[0].province} ${validTotals[0].total.toFixed(2)} 元`)
    console.log(`  最低: ${validTotals[validTotals.length - 1].province} ${validTotals[validTotals.length - 1].total.toFixed(2)} 元`)
    console.log(`  差值: ${(validTotals[0].total - validTotals[validTotals.length - 1].total).toFixed(2)} 元`)
  }

  console.log()
  console.log('='.repeat(100))
  console.log(`共测试 ${provinces.length} 个省份，成功 ${results.filter(r => !r.error).length} 个，失败 ${results.filter(r => r.error).length} 个`)
  console.log('='.repeat(100))
}

main()
