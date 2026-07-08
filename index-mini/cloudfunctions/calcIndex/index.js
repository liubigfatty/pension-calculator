// 云函数入口：calcIndex
// 简化版（v2）：只服务「有逐年缴费明细」的人
//   前端只传：province + startYear/startMonth（信息用）+ yearlyData（逐年明细）
//   返回：正向计算结果（平均指数 + 个人账户余额 + 逐年明细）
//   不再处理「当前月缴费基数」和「账户余额反推」（那是无明细人群用的，本次未做）
const cloud = require('wx-server-sdk')
const { calculateIndex } = require('./calcIndex')
const PROVINCES = require('./provinces-data')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const {
    province,
    startYear,
    startMonth,
    yearlyData           // 逐年明细数组 [{year, months, baseAvg}]
  } = event

  if (!province || !PROVINCES[province]) {
    return { success: false, error: '未知省份或省份缺失: ' + province }
  }
  const provinceConfig = PROVINCES[province]

  // 只支持逐年明细（A 颗粒度）
  const hasDetail = Array.isArray(yearlyData) && yearlyData.length > 0
  if (!hasDetail) {
    return { success: false, error: '请填写逐年缴费明细（每年月均缴费基数）' }
  }

  const fwd = calculateIndex({ provinceConfig, contribution: yearlyData, granularity: 'A' })
  if (fwd.error) return { success: false, error: fwd.error }

  return {
    success: true,
    mode: 'forward',
    data: { forward: fwd }
  }
}
