// 云函数入口：calcIndex
// 统一入口：用户填什么信息就出什么结果，不暴露颗粒度/正反向概念
//   填了缴费基数（月均或逐年）→ 正向算平均指数 + 账户余额 + 逐年明细
//   填了账户余额 → 反推平均指数
//   都填 → 两者都给，互为校验
const cloud = require('wx-server-sdk')
const { calculateIndex, inferIndexFromBalance } = require('./calcIndex')
const PROVINCES = require('./provinces-data')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 用「月均基数 + 起止时间 + 总月数」铺成逐年记录（A 结构）
 * 例：startYear=2020, startMonth=1, totalMonths=35, base=5000
 *  → [{2020,12,5000},{2021,12,5000},{2022,11,5000}]
 */
function buildUniformContribution(startYear, startMonth, totalMonths, base) {
  let remaining = totalMonths
  let y = startYear
  let m = startMonth
  const out = []
  while (remaining > 0) {
    const monthsThisYear = 13 - m
    const mm = Math.min(remaining, monthsThisYear > 0 ? monthsThisYear : 12)
    out.push({ year: y, months: mm, baseAvg: base })
    remaining -= mm
    y += 1
    m = 1
  }
  return out
}

exports.main = async (event, context) => {
  const {
    province,
    startYear,
    startMonth,
    totalMonths,
    monthlyBase,          // 月均缴费基数（统一值）
    yearlyData,           // 逐年明细数组 [{year,months,baseAvg}]
    knownBalance          // 当前账户余额（反推用）
  } = event

  if (!province || !PROVINCES[province]) {
    return { success: false, error: '未知省份或省份缺失: ' + province }
  }
  const provinceConfig = PROVINCES[province]

  const sy = Number(startYear) || 0
  const sm = Number(startMonth) || 1
  const tm = Number(totalMonths) || 0
  const mb = Number(monthlyBase) || 0
  const kb = Number(knownBalance) || 0
  const hasDetail = Array.isArray(yearlyData) && yearlyData.length > 0

  const result = { mode: null, data: {} }

  // ── 正向：有基数信息（月均 或 逐年明细）──
  if (mb > 0 || hasDetail) {
    let contribution
    let source
    if (hasDetail) {
      contribution = yearlyData
      source = 'yearly'
    } else {
      if (tm <= 0) {
        return { success: false, error: '已填写月均缴费基数，请同时填写累计缴费月数' }
      }
      contribution = buildUniformContribution(sy, sm, tm, mb)
      source = 'uniform'
    }
    const fwd = calculateIndex({ provinceConfig, contribution, granularity: 'A' })
    if (fwd.error) return { success: false, error: fwd.error }
    fwd._source = source
    result.data.forward = fwd
    result.mode = 'forward'
  }

  // ── 反推：有账户余额 ──
  if (kb > 0) {
    if (tm <= 0) {
      return { success: false, error: '已填写账户余额，请同时填写累计缴费月数' }
    }
    const inf = inferIndexFromBalance({
      provinceConfig,
      contribution: { startYear: sy, startMonth: sm, totalMonths: tm },
      granularity: 'C',
      knownBalance: kb
    })
    if (inf.error) return { success: false, error: inf.error }
    result.data.infer = inf
    result.mode = result.mode === 'forward' ? 'both' : 'infer'
  }

  if (!result.mode) {
    return { success: false, error: '请至少填写「月均缴费基数」或「账户余额」中的一项' }
  }

  return { success: true, mode: result.mode, data: result.data }
}
