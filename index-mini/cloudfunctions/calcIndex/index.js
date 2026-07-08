// 云函数入口：calcIndex
// 功能：接收前端传入的省份/颗粒度/缴费数据，调用 calcIndex 引擎计算
//   正向：缴费信息 → 平均缴费工资指数 + 个人账户余额
//   反推：已知账户余额 → 反推平均缴费工资指数
const cloud = require('wx-server-sdk')
const { calculateIndex, inferIndexFromBalance } = require('./calcIndex')
const PROVINCES = require('./provinces-data')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const {
    province,
    granularity = 'A',
    contribution,
    mode = 'forward',
    knownBalance
  } = event

  if (!province || !PROVINCES[province]) {
    return { success: false, error: '未知省份或省份缺失: ' + province }
  }
  const provinceConfig = PROVINCES[province]

  try {
    if (mode === 'infer') {
      if (knownBalance === undefined || knownBalance === null) {
        return { success: false, error: '反推模式需要 knownBalance（当前账户余额）' }
      }
      const res = inferIndexFromBalance({
        provinceConfig,
        contribution,
        granularity,
        knownBalance: Number(knownBalance)
      })
      return { success: true, mode: 'infer', data: res }
    }

    const res = calculateIndex({ provinceConfig, contribution, granularity })
    if (res.error) {
      return { success: false, error: res.error }
    }
    return { success: true, mode: 'forward', data: res }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
