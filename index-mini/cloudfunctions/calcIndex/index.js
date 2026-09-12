// 云函数入口：calcIndex
// 逐省一致版 v2.1.0：只服务「有逐年缴费明细」的人
//   前端传：province + startYear/startMonth（信息用）+ yearlyData（逐年明细）
//          + deemedYears（视同年限）+ deemedStartYear（浙苏赣分段起始年）+ city（广东城市）
//   返回：正向计算结果（平均指数 + 个人账户余额 + 逐年明细 + transIndex）
//   逐省规则（分母口径/视同年/双指数/封顶/断缴）全部由 calcIndex 引擎 PROVINCE_RULES 驱动，
//   不再在入口硬编码（旧版 GAP_ZERO_PROVINCES 已废弃，改用引擎 rule.gapZero）。
// 纯计算函数：不依赖 wx-server-sdk（不使用云数据库 / 存储 / OpenID）。
//   CLI 部署不安装依赖，云端 node16 运行时又不内置该 SDK，会报 Cannot find module 'wx-server-sdk'。
//   若将来需要云服务，再恢复：const cloud = require('wx-server-sdk') + cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const { calculateIndex } = require('./calcIndex')
const PROVINCES = require('./provinces-data')

// 广东省 21 地市（D值查表用，粤府函〔2021〕294号）
const GD_CITIES = ['全省', '广州', '深圳', '珠海', '汕头', '韶关', '河源', '梅州', '惠州', '汕尾',
  '东莞', '中山', '江门', '佛山', '阳江', '湛江', '茂名', '肇庆', '云浮', '清远', '潮州', '揭阳']

exports.main = async (event, context) => {
  const {
    province,
    startYear,
    startMonth,
    yearlyData,           // 逐年明细数组 [{year, months, baseAvg}]
    deemedYears,          // 视同缴费年限（年）
    deemedStartYear,      // 视同起始年（浙/苏/赣分段取值）
    city                  // 广东参保城市
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

  // 广东：校验并归一化城市（首位为"全省"→null，使用默认 D=1.000）
  let gdCity = null
  if (province === 'guangdong') {
    gdCity = (city && city !== '全省' && GD_CITIES.includes(city)) ? city : null
  }

  const fwd = calculateIndex({
    provinceConfig,
    provinceCode: province,
    contribution: yearlyData,
    granularity: 'A',
    deemedYears: Number(deemedYears) || 0,
    deemedStartYear: deemedStartYear ? Number(deemedStartYear) : null,
    city: gdCity
  })
  if (fwd.error) return { success: false, error: fwd.error }

  return {
    success: true,
    mode: 'forward',
    data: { forward: fwd }
  }
}
