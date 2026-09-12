/**
 * verify-index-web.js — 网页端缴费指数计算器「逐省一致」自检验证
 *
 * 用法：node scripts/verify-index-web.js
 * 覆盖维度：D1 分母(上年/当年) · D2 视同年进/不进 · D3 双指数(transIndex) ·
 *          D4 视同指数(浙江替代) · D5 封顶保底(沪/渝/桂) · D6 断缴(GAP_ZERO)
 * 每个用例用真实社平数据反推 baseAvg，预期 avgIndex 由官方公式手算得到。
 */
const Calc = require('../index-engine/calcIndex.js')
const DATA = require('../index-mini/cloudfunctions/calcIndex/provinces-data.js')

const TOL = 1e-4
let pass = 0, fail = 0
const fails = []

function denom(code, year, city) {
  const rule = Calc.PROVINCE_RULES[code]
  const hist = Calc.resolveSalaryHist ? Calc.resolveSalaryHist(DATA[code].avg_salary_history, city || null) : DATA[code].avg_salary_history
  return Calc.getDenominator(rule, hist, year)
}
// 按目标指数构造逐年记录（baseAvg = 分母社平 × 目标指数）
function rec(code, year, targetIdx, months = 12) {
  const d = denom(code, year)
  return { year, months, baseAvg: Math.round(d * targetIdx * 100) / 100 }
}
// 城市感知：广东深圳用独立社平
function recCity(code, year, targetIdx, city, months = 12) {
  const d = denom(code, year, city)
  return { year, months, baseAvg: Math.round(d * targetIdx * 100) / 100 }
}
function gapRec(code, year, months = 12) {
  return { year, months, baseAvg: 0 }
}
function cfg(code) { return { name: DATA[code].name, avg_salary_history: DATA[code].avg_salary_history } }

function check(name, got, exp, extra) {
  const ok = Math.abs(got - exp) <= TOL
  if (ok) { pass++; console.log(`  ✅ ${name}: got=${got.toFixed(4)} exp=${exp.toFixed(4)}`) }
  else { fail++; fails.push(name); console.log(`  ❌ ${name}: got=${got.toFixed(4)} exp=${exp.toFixed(4)} ${extra || ''}`) }
}

console.log('═══ D1 分母口径：上年 vs 当年 ═══')

// 上海：上年社平（2010 denom=2009, 2019=2018, 2020=2019）
// 2010 属 1993-2011 段，分段保底 floor=1.0（raw0.5→1.0）；2019/2020=2.0
{
  const contrib = [rec('shanghai', 2010, 0.5), rec('shanghai', 2019, 2.0), rec('shanghai', 2020, 2.0)]
  const r = Calc.calculateIndex({ provinceConfig: cfg('shanghai'), provinceCode: 'shanghai', contribution: contrib, granularity: 'A' })
  // 2010 idx=1.0(保底); 2019/2020=2.0; avg=(12+24+24)/36=1.6667
  check('上海-上年社平+分段保底(2010 floor1.0)', r.avgIndex, 1.6667)
}

// 陕西：当年社平（2019 denom=2019, 2020=2020）；视同年不进
{
  const contrib = [rec('shaanxi', 2019, 1.5), rec('shaanxi', 2020, 2.0)]
  const r = Calc.calculateIndex({ provinceConfig: cfg('shaanxi'), provinceCode: 'shaanxi', contribution: contrib, granularity: 'A', deemedYears: 5 })
  // 当年社平: 2019 idx=1.5, 2020 idx=2.0; 视同年不进 → (18+24)/24=1.75
  check('陕西-当年社平+视同年不进', r.avgIndex, 1.7500)
}

console.log('═══ D2 视同年进/不进分母（同指数对照）═══')

// 上海：+5 视同年(指数1.0，进分母) → (60 + 60)/96 = 1.25
{
  const contrib = [rec('shanghai', 2010, 0.5), rec('shanghai', 2019, 2.0), rec('shanghai', 2020, 2.0)]
  const r = Calc.calculateIndex({ provinceConfig: cfg('shanghai'), provinceCode: 'shanghai', contribution: contrib, granularity: 'A', deemedYears: 5 })
  check('上海-视同年进分母(+5年)', r.avgIndex, 1.2500)
}

// 山东：视同年不进 → 仍为 1.0，权重不含视同年
{
  const contrib = [rec('shandong', 2019, 1.0), rec('shandong', 2020, 1.0)]
  const r = Calc.calculateIndex({ provinceConfig: cfg('shandong'), provinceCode: 'shandong', contribution: contrib, granularity: 'A', deemedYears: 10 })
  check('山东-视同年不进(权重仍24)', r.avgIndex, 1.0000)
  if (r.totalMonths !== 24) { fail++; fails.push('山东-权重'); console.log(`  ❌ 山东权重: got=${r.totalMonths} exp=24`) }
  else pass++
}

console.log('═══ D3 双指数/双基数：transIndex 输出 ═══')

// 北京：dualIndex=trans → transIndex 非空 ≈ avgIndex
{
  const contrib = [rec('beijing', 2020, 1.0), rec('beijing', 2021, 1.0)]
  const r = Calc.calculateIndex({ provinceConfig: cfg('beijing'), provinceCode: 'beijing', contribution: contrib, granularity: 'A' })
  check('北京-avgIndex', r.avgIndex, 1.0000)
  if (r.transIndex != null) { pass++; console.log(`  ✅ 北京-transIndex 输出: ${r.transIndex}`) }
  else { fail++; fails.push('北京-transIndex'); console.log('  ❌ 北京-transIndex 缺失') }
}

// 吉林：dualBase → transIndex 非空
{
  const contrib = [rec('jilin', 2020, 1.0), rec('jilin', 2021, 1.0)]
  const r = Calc.calculateIndex({ provinceConfig: cfg('jilin'), provinceCode: 'jilin', contribution: contrib, granularity: 'A' })
  if (r.transIndex != null) { pass++; console.log(`  ✅ 吉林-transIndex 输出: ${r.transIndex}`) }
  else { fail++; fails.push('吉林-transIndex'); console.log('  ❌ 吉林-transIndex 缺失') }
}

console.log('═══ D4 视同指数（浙江替代指数 ≈1.279，1992前）═══')

// 浙江：deemedStartYear=1990, deemedYears=3 → 1990/1991/1992 均≤1992 → 1.279
{
  const contrib = [rec('zhejiang', 2020, 1.0), rec('zhejiang', 2021, 1.0)]
  const r = Calc.calculateIndex({ provinceConfig: cfg('zhejiang'), provinceCode: 'zhejiang', contribution: contrib, granularity: 'A', deemedYears: 3, deemedStartYear: 1990 })
  // 实际 sum=24,w=24; 视同 sum=3×12×1.279=46.044,w=36; avg=70.044/60=1.1674
  check('浙江-替代指数1.279(1990起3年)', r.avgIndex, 1.1674)
}
// 浙江：不提供 deemedStartYear → 默认1.0 → (24+36)/60=1.0
{
  const contrib = [rec('zhejiang', 2020, 1.0), rec('zhejiang', 2021, 1.0)]
  const r = Calc.calculateIndex({ provinceConfig: cfg('zhejiang'), provinceCode: 'zhejiang', contribution: contrib, granularity: 'A', deemedYears: 3 })
  check('浙江-无起始年默认1.0', r.avgIndex, 1.0000)
}
// 浙江：分段边界 deemedStartYear=1991, deemedYears=3 → 1991/1992=1.279、1993=1.0
{
  const contrib = [rec('zhejiang', 2020, 1.0), rec('zhejiang', 2021, 1.0)]
  const r = Calc.calculateIndex({ provinceConfig: cfg('zhejiang'), provinceCode: 'zhejiang', contribution: contrib, granularity: 'A', deemedYears: 3, deemedStartYear: 1991 })
  // 实际 sum=24,w24; 视同=12×(1.279+1.279+1.0)=42.696,w36; avg=66.696/60=1.1116
  check('浙江-分段边界(1991起3年)', r.avgIndex, 1.1116)
}

console.log('═══ D4 补完：广东视同缴费指数(D)查表（粤府函〔2021〕294号）═══')

// 广东·深圳：D=1.529，分母用深圳独立社平；deemedYears=5
{
  const contrib = [recCity('guangdong', 2020, 1.0, '深圳'), recCity('guangdong', 2021, 1.0, '深圳')]
  const r = Calc.calculateIndex({ provinceConfig: cfg('guangdong'), provinceCode: 'guangdong', contribution: contrib, granularity: 'A', deemedYears: 5, deemedStartYear: 1990, city: '深圳' })
  // 实际 sum=24,w24; 视同=1.529×60=91.74,w60; avg=115.74/84=1.3779
  check('广东-深圳 D=1.529(分母深圳社平)', r.avgIndex, 1.3779)
}
// 广东·广州：D=1.191（无独立社平键，分母用全省）
{
  const contrib = [recCity('guangdong', 2020, 1.0, '广州'), recCity('guangdong', 2021, 1.0, '广州')]
  const r = Calc.calculateIndex({ provinceConfig: cfg('guangdong'), provinceCode: 'guangdong', contribution: contrib, granularity: 'A', deemedYears: 5, deemedStartYear: 1990, city: '广州' })
  // 实际 sum=24,w24; 视同=1.191×60=71.46,w60; avg=95.46/84=1.1364
  check('广东-广州 D=1.191(分母全省社平)', r.avgIndex, 1.1364)
}
// 广东·全省（未选市）：默认 D=1.000
{
  const contrib = [recCity('guangdong', 2020, 1.0), recCity('guangdong', 2021, 1.0)]
  const r = Calc.calculateIndex({ provinceConfig: cfg('guangdong'), provinceCode: 'guangdong', contribution: contrib, granularity: 'A', deemedYears: 5, deemedStartYear: 1990 })
  check('广东-全省默认 D=1.000', r.avgIndex, 1.0000)
}

console.log('═══ D5 封顶保底（沪分段 / 渝上限分段 / 桂建账前<1按1）═══')

// 重庆：1994(93-97段上限2) vs 1998(上限3)
{
  const contrib = [rec('chongqing', 1994, 3.0), rec('chongqing', 1998, 3.0)]
  const r = Calc.calculateIndex({ provinceConfig: cfg('chongqing'), provinceCode: 'chongqing', contribution: contrib, granularity: 'A' })
  // 1994 idx=3.0→封顶2.0；1998 idx=3.0→封顶3.0；avg=(24+36)/24=2.5
  check('重庆-93-97上限2/98后上限3', r.avgIndex, 2.5000)
}

// 广西：1995(建账前, <1按1) vs 1997(建账后, 保底0.6)
{
  const contrib = [rec('guangxi', 1995, 0.5), rec('guangxi', 1997, 0.5)]
  const r = Calc.calculateIndex({ provinceConfig: cfg('guangxi'), provinceCode: 'guangxi', contribution: contrib, granularity: 'A' })
  // 1995 建账前 raw0.5→1.0；1997 建账后 raw0.5→0.6；avg=(12+7.2)/24=0.8
  check('广西-建账前<1按1/建账后保底0.6', r.avgIndex, 0.8000)
}

console.log('═══ D6 断缴计入分母（GAP_ZERO：云/京/津/陕/浙）═══')

// 云南：2020 断缴计入分母记0；+5视同年(1.0)
{
  const contrib = [rec('yunnan', 2019, 1.0), gapRec('yunnan', 2020), rec('yunnan', 2021, 1.0)]
  const r = Calc.calculateIndex({ provinceConfig: cfg('yunnan'), provinceCode: 'yunnan', contribution: contrib, granularity: 'A', deemedYears: 5 })
  // 实际 sum=24(2019,2021), 2020 gap=0, w=36; 视同 sum=60,w=96; avg=(24+60)/96=0.875
  check('云南-断缴记0+视同年进分母(+5)', r.avgIndex, 0.8750)
}
// 云南：无视同年，断缴记0 → (24+0)/36=0.6667
{
  const contrib = [rec('yunnan', 2019, 1.0), gapRec('yunnan', 2020), rec('yunnan', 2021, 1.0)]
  const r = Calc.calculateIndex({ provinceConfig: cfg('yunnan'), provinceCode: 'yunnan', contribution: contrib, granularity: 'A' })
  check('云南-断缴记0(无视同)', r.avgIndex, 0.6667)
}
// 山东（非GapZero）：断缴跳过 → 仍为 1.0
{
  const contrib = [rec('shandong', 2019, 1.0), gapRec('shandong', 2020), rec('shandong', 2021, 1.0)]
  const r = Calc.calculateIndex({ provinceConfig: cfg('shandong'), provinceCode: 'shandong', contribution: contrib, granularity: 'A' })
  check('山东-断缴跳过(不计入)', r.avgIndex, 1.0000)
}

console.log('═══ D5 补充：上海分段保底边界（2011/2012/2013/2020）═══')

// 上海：raw=0.5 各年保底 → 2011=1.0, 2012=0.85, 2013=0.75, 2020=0.6
{
  const contrib = [rec('shanghai', 2011, 0.5), rec('shanghai', 2012, 0.5), rec('shanghai', 2013, 0.5), rec('shanghai', 2020, 0.5)]
  const r = Calc.calculateIndex({ provinceConfig: cfg('shanghai'), provinceCode: 'shanghai', contribution: contrib, granularity: 'A' })
  // (1.0+0.85+0.75+0.6)×12/48 = 38.4/48 = 0.8
  check('上海-分段保底边界(11/12/13/20)', r.avgIndex, 0.8000)
}

console.log('═══ D6 补充：黑龙江断缴按0.6计入分母（gapFloor）═══')

// 黑龙江：2019+2021 缴费 idx=1.0，2020 断缴 → 按gapFloor=0.6计入
{
  const contrib = [rec('heilongjiang', 2019, 1.0), gapRec('heilongjiang', 2020), rec('heilongjiang', 2021, 1.0)]
  const r = Calc.calculateIndex({ provinceConfig: cfg('heilongjiang'), provinceCode: 'heilongjiang', contribution: contrib, granularity: 'A' })
  // sum=12+0.6×12+12=31.2; w=36; avg=31.2/36=0.8667
  check('黑龙江-断缴按0.6计入(gapFloor)', r.avgIndex, 0.8667)
  if (r.totalMonths !== 36) { fail++; fails.push('黑龙江-权重含断缴'); console.log('  ❌ 黑龙江权重: got=' + r.totalMonths + ' exp=36') }
  else { pass++; console.log('  ✅ 黑龙江-权重含断缴年(36)') }
}
// 黑龙江：视同年不进 + 断缴按0.6 → 传deemedYears=10 应不进
{
  const contrib = [rec('heilongjiang', 2019, 1.0), gapRec('heilongjiang', 2020), rec('heilongjiang', 2021, 1.0)]
  const r = Calc.calculateIndex({ provinceConfig: cfg('heilongjiang'), provinceCode: 'heilongjiang', contribution: contrib, granularity: 'A', deemedYears: 10 })
  // deemedInDenom=false → 视同年不进 → 同上 0.8667
  check('黑龙江-视同年不进+断缴0.6', r.avgIndex, 0.8667)
}

console.log('═══ D2 补充：视同年=0 边界（进分母省不填视同年）═══')

// 上海：deemedYears=0（进分母省但不填视同）→ 只算实际缴费
{
  const contrib = [rec('shanghai', 2010, 1.0), rec('shanghai', 2020, 1.0)]
  const r = Calc.calculateIndex({ provinceConfig: cfg('shanghai'), provinceCode: 'shanghai', contribution: contrib, granularity: 'A', deemedYears: 0 })
  // 无视同年 → (12+12)/24=1.0
  check('上海-视同年=0(不进)边界', r.avgIndex, 1.0000)
}

console.log('═══ 阵营计数自检 ═══')
{
  const rules = Calc.PROVINCE_RULES
  const inDenom = Object.keys(rules).filter(k => rules[k].deemedInDenom).length
  const notIn = Object.keys(rules).filter(k => !rules[k].deemedInDenom).length
  const current = Object.keys(rules).filter(k => rules[k].denom === 'current').length
  const gap = Object.keys(rules).filter(k => rules[k].gapZero).length
  const dual = Object.keys(rules).filter(k => rules[k].dualIndex).length
  console.log(`  视同年进=${inDenom} 不进=${notIn} | 当年社平=${current} | GAP_ZERO=${gap} | 双指数/双基数=${dual}`)
  // 期望：进20 不进11；当年2；GAP_ZERO5；双指数/双基数6(京津晋苏吉+辽)
  const expIn = 20, expNot = 11, expCur = 2, expGap = 5, expDual = 6
  const assertCount = (label, got, exp) => {
    if (got === exp) { pass++; console.log(`  ✅ ${label}=${got}`) }
    else { fail++; fails.push(label); console.log(`  ❌ ${label}: got=${got} exp=${exp}`) }
  }
  assertCount('视同年进', inDenom, expIn)
  assertCount('视同年不进', notIn, expNot)
  assertCount('当年社平', current, expCur)
  assertCount('GAP_ZERO', gap, expGap)
  assertCount('双指数/双基数', dual, expDual)
}

console.log('\n══════════════════════════════')
console.log(`结果：通过 ${pass} / 失败 ${fail}`)
if (fail > 0) {
  console.log('失败项：', fails.join('、'))
  process.exit(1)
} else {
  console.log('🎉 全部自检验证通过（网页端逐省规则匹配官方公式）')
}
