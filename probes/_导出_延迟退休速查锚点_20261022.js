// 导出「延迟退休月数」单一事实源锚点表（供倒查引用篇用，只读不出库）
const path = require('path')
const eng = require(path.join(__dirname, '../cloudfunctions/calculate/pension-engine.js'))
const jl = require(path.join(__dirname, '../cloudfunctions/calculate/provinces/jilin.js'))
const cfg = jl.default || jl

const getDelay = eng.getDelayMonths

const TYPES = [
  ['male', '男职工(原60)'],
  ['fc', '女干部(原55)'],
  ['fw50', '女工人(原50)'],
]

function fmtYM(y, m) { return `${y}-${String(m).padStart(2, '0')}` }

function addMonths(y, m, n) {
  let t = y * 12 + (m - 1) + n
  return [Math.floor(t / 12), (t % 12) + 1]
}

console.log('== 延迟退休速查锚点（引擎 getDelayMonths 实跑，config=吉林）==')
console.log('config.delay_retirement =', JSON.stringify(cfg.delay_retirement || {}))
console.log('')

for (const [type, label] of TYPES) {
  console.log(`--- ${label} [type=${type}] ---`)
  // 1) 找封顶起点
  let capBirth = null, capVal = 0
  for (let y = 1960; y <= 1990; y++) {
    for (let m = 1; m <= 12; m++) {
      const d = getDelay(y, m, type, cfg)
      if (d > capVal) { capVal = d; capBirth = [y, m] }
    }
  }
  // 第一个达到 capVal 的出生月
  let firstCap = null
  for (let y = 1960; y <= 1990; y++) {
    for (let m = 1; m <= 12; m++) {
      if (getDelay(y, m, type, cfg) === capVal) { firstCap = [y, m]; break }
    }
    if (firstCap) break
  }
  // 第一个 >0 的出生月
  let firstNonZero = null
  for (let y = 1960; y <= 1990; y++) {
    for (let m = 1; m <= 12; m++) {
      if (getDelay(y, m, type, cfg) > 0) { firstNonZero = [y, m]; break }
    }
    if (firstNonZero) break
  }
  console.log(`  起延出生月=${fmtYM(...firstNonZero)}  封顶值=${capVal}个月  封顶起点=${fmtYM(...firstCap)}`)

  // 2) 采样表：每 6 个月一个采样点
  const rows = []
  for (let y = 1965; y <= 1986; y++) {
    for (const m of [1, 7]) {
      const d = getDelay(y, m, type, cfg)
      const baseAge = type === 'male' ? 60 : (type === 'fc' ? 55 : 50)
      const [ry, rm] = addMonths(y, m, baseAge * 12 + d)
      rows.push(`  ${fmtYM(y, m)}  延迟 ${String(d).padStart(2)} 月  法定退休 ${fmtYM(ry, rm)}（${(((baseAge * 12 + d) / 12)).toFixed(1)}岁）`)
    }
  }
  console.log(rows.join('\n'))
  console.log('')
}

// 3) 已知文章锚点复核
console.log('--- 文章锚点复核 ---')
const anchors = [
  ['1976-02', 1976, 2, 'male', 'MEMORY 锚点：应 34 个月/62岁10个月/2038-12'],
  ['1970-05', 1970, 5, 'male', '052/053 争点'],
  ['1976-01', 1976, 1, 'male', '055 vs 056 争点（055写33、056写34）'],
  ['1972-08', 1972, 8, 'fc', '075（文写 2027-08 退休）'],
  ['1981-xx', 1981, 6, 'male', '066'],
  ['1975-06', 1975, 6, 'fw50', '069 张叔'],
]
for (const [tag, y, m, t, note] of anchors) {
  const d = getDelay(y, m, t, cfg)
  const baseAge = t === 'male' ? 60 : (t === 'fc' ? 55 : 50)
  const [ry, rm] = addMonths(y, m, baseAge * 12 + d)
  console.log(`  ${tag} [${t}] 延迟=${d} 月  法定退休=${fmtYM(ry, rm)}  ← ${note}`)
}
