/**
 * verify-index-mini.js — 小程序引擎 ↔ 网页引擎 一致性校验
 * 目的：确认 index-mini 云函数已与 index-engine(v2.1.0) 完全同步（同一份省份数据下输出一致）。
 * 用法：node scripts/verify-index-mini.js
 */
const Web = require('../index-engine/calcIndex.js')        // 网页端源引擎 v2.1.0
const Mini = require('../index-mini/cloudfunctions/calcIndex/calcIndex.js') // 小程序同步后引擎
const DATA = require('../index-mini/cloudfunctions/calcIndex/provinces-data.js')

let pass = 0, fail = 0
const fails = []
const TOL = 1e-9

function denom(engine, code, year, city) {
  const rule = engine.PROVINCE_RULES[code]
  const hist = engine.resolveSalaryHist ? engine.resolveSalaryHist(DATA[code].avg_salary_history, city || null) : DATA[code].avg_salary_history
  return engine.getDenominator(rule, hist, year)
}
function rec(engine, code, year, idx, city) {
  return { year, months: 12, baseAvg: Math.round(denom(engine, code, year, city) * idx * 100) / 100 }
}
function cfg(code) { return { name: DATA[code].name, avg_salary_history: DATA[code].avg_salary_history } }

// 同一组入参，分别跑两套引擎，断言 avgIndex 与 transIndex 一致
function cmp(name, params) {
  const pWeb = Object.assign({ provinceConfig: cfg(params.provinceCode), contribution: params.contrib }, params.opt)
  const pMini = Object.assign({ provinceConfig: cfg(params.provinceCode), contribution: params.contrib }, params.opt)
  const rW = Web.calculateIndex(pWeb)
  const rM = Mini.calculateIndex(pMini)
  let ok = true, msg = ''
  if (rW.error || rM.error) { ok = false; msg = 'err W=' + rW.error + ' M=' + rM.error }
  else {
    if (Math.abs(rW.avgIndex - rM.avgIndex) > TOL) { ok = false; msg = `avgIndex W=${rW.avgIndex} M=${rM.avgIndex}` }
    const tW = rW.transIndex == null ? null : rW.transIndex
    const tM = rM.transIndex == null ? null : rM.transIndex
    if ((tW === null) !== (tM === null) || (tW != null && Math.abs(tW - tM) > TOL)) { ok = false; msg += ` transIndex W=${tW} M=${tM}` }
  }
  if (ok) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; fails.push(name); console.log(`  ❌ ${name}: ${msg}`) }
}

console.log('═══ 小程序引擎 ↔ 网页引擎 一致性（逐省）═══')

// 上海：上年社平+分段保底+视同年进
cmp('上海-分段保底+视同年进', { provinceCode: 'shanghai', contrib: [rec(Web,'shanghai',2010,0.5),rec(Web,'shanghai',2019,2.0),rec(Web,'shanghai',2020,2.0)], opt: { granularity:'A', deemedYears:5 } })
// 陕西：当年社平+视同年不进
cmp('陕西-当年社平+视同年不进', { provinceCode: 'shaanxi', contrib: [rec(Web,'shaanxi',2019,1.5),rec(Web,'shaanxi',2020,2.0)], opt: { granularity:'A', deemedYears:5 } })
// 山东：视同年不进
cmp('山东-视同年不进', { provinceCode: 'shandong', contrib: [rec(Web,'shandong',2019,1.0),rec(Web,'shandong',2020,1.0)], opt: { granularity:'A', deemedYears:10 } })
// 北京：双指数 transIndex
cmp('北京-transIndex', { provinceCode: 'beijing', contrib: [rec(Web,'beijing',2020,1.0),rec(Web,'beijing',2021,1.0)], opt: { granularity:'A' } })
// 吉林：双基数 transIndex
cmp('吉林-transIndex', { provinceCode: 'jilin', contrib: [rec(Web,'jilin',2020,1.0),rec(Web,'jilin',2021,1.0)], opt: { granularity:'A' } })
// 浙江：替代指数1.279（1990起3年）
cmp('浙江-替代1.279', { provinceCode: 'zhejiang', contrib: [rec(Web,'zhejiang',2020,1.0),rec(Web,'zhejiang',2021,1.0)], opt: { granularity:'A', deemedYears:3, deemedStartYear:1990 } })
// 浙江：分段边界（1991起3年）
cmp('浙江-分段边界', { provinceCode: 'zhejiang', contrib: [rec(Web,'zhejiang',2020,1.0),rec(Web,'zhejiang',2021,1.0)], opt: { granularity:'A', deemedYears:3, deemedStartYear:1991 } })
// 广东·深圳：D=1.529 + 独立社平
cmp('广东-深圳D1.529', { provinceCode: 'guangdong', contrib: [rec(Web,'guangdong',2020,1.0,'深圳'),rec(Web,'guangdong',2021,1.0,'深圳')], opt: { granularity:'A', deemedYears:5, deemedStartYear:1990, city:'深圳' } })
// 广东·广州：D=1.191
cmp('广东-广州D1.191', { provinceCode: 'guangdong', contrib: [rec(Web,'guangdong',2020,1.0,'广州'),rec(Web,'guangdong',2021,1.0,'广州')], opt: { granularity:'A', deemedYears:5, deemedStartYear:1990, city:'广州' } })
// 广东·全省：默认1.0
cmp('广东-全省默认1.0', { provinceCode: 'guangdong', contrib: [rec(Web,'guangdong',2020,1.0),rec(Web,'guangdong',2021,1.0)], opt: { granularity:'A', deemedYears:5, deemedStartYear:1990 } })
// 重庆：93-97上限2/98后上限3
cmp('重庆-上限分段', { provinceCode: 'chongqing', contrib: [rec(Web,'chongqing',1994,3.0),rec(Web,'chongqing',1998,3.0)], opt: { granularity:'A' } })
// 广西：建账前<1按1
cmp('广西-建账前保底1', { provinceCode: 'guangxi', contrib: [rec(Web,'guangxi',1995,0.5),rec(Web,'guangxi',1997,0.5)], opt: { granularity:'A' } })
// 云南：断缴记0+视同年进
cmp('云南-断缴记0+视同进', { provinceCode: 'yunnan', contrib: [rec(Web,'yunnan',2019,1.0),{year:2020,months:12,baseAvg:0},rec(Web,'yunnan',2021,1.0)], opt: { granularity:'A', deemedYears:5 } })
// 山东：断缴跳过
cmp('山东-断缴跳过', { provinceCode: 'shandong', contrib: [rec(Web,'shandong',2019,1.0),{year:2020,months:12,baseAvg:0},rec(Web,'shandong',2021,1.0)], opt: { granularity:'A' } })

console.log('\n════════════════════════════')
console.log(`结果：通过 ${pass} / 失败 ${fail}`)
if (fail > 0) { console.log('失败项：', fails.join('、')); process.exit(1) }
else { console.log('🎉 小程序引擎与网页引擎逐省输出完全一致（同步成功）') }
