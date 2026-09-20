/**
 * 按订正后引擎重算 _verify_years.js 里的数组常量，打印成可直接粘贴的字面量。
 * 用途：记账利率订正（2021: 5.35% → 6.69%）后同步脚本期望值 + 正文数字。
 */
const e = require('../engine/pension-engine.js')
const cfg = require('../cloudfunctions/calculate/provinces-data.js').getConfig('jilin')
const h = cfg.avg_salary_history

const calc = (wy, wm, idx = 1.0) =>
  e.calculate(cfg, {
    gender: 'male', genderType: 'male', birthYear: 1965, birthMonth: 9,
    workYear: wy, workMonth: wm, avgIndex: idx, cityType: 'cc',
    retireDateInput: { year: 2025, month: 12 }
  }).legal

// 参工时间 → 年限标签
const START = { '15': [2010, 12], '20': [2005, 12], '25': [2000, 12], '30.42': [1995, 7], '38.42': [1987, 7] }
const R = {}
for (const k of Object.keys(START)) R[k] = calc(START[k][0], START[k][1])

const PB = t => Math.round(7322 * t / 100)
const X = { 15: PB(100), 38.42: PB(100) }

// slope: 60 档 vs 100 档的差商（分 core / full 两层）
// 分母 = 缴费基数差（PB(100) − PB(60) = 7322 − 4393 = 2929），不是计发基数
function slope(k, layer) {
  const a = calc(START[k][0], START[k][1], 0.6)
  const b = calc(START[k][0], START[k][1], 1.0)
  const pick = L => layer === 'core'
    ? L.basicPension.amount + L.personalAccount.amount
    : L.total
  return (pick(b) - pick(a)) / (PB(100) - PB(60))
}
const core = L => L.basicPension.amount + L.personalAccount.amount

const n2 = v => +v.toFixed(2)
const n4 = v => +v.toFixed(4)

console.log('===== SLOPE_ROWS（core, full）=====')
console.log('const SLOPE_ROWS = [')
for (const k of ['15', '20', '25', '30.42', '38.42']) {
  console.log(`  ['${k}',`.padEnd(14) + ` ${n4(slope(k, 'core'))}, ${n4(slope(k, 'full'))}],`)
}
console.log(']')

console.log('\n===== PANORAMA（月领, 基础, 过渡, 个账, 增发）=====')
console.log('const PANORAMA = [')
for (const k of ['15', '20', '25', '30.42', '38.42']) {
  const r = R[k]
  console.log(`  ['${k}',`.padEnd(14) +
    ` ${n2(r.total)}, ${n2(r.basicPension.amount)}, ${n2(r.transitionalPension.amount)}, ` +
    `${n2(r.personalAccount.amount)}, ${n2(r.extraPension ? r.extraPension.amount : 0)}],`)
}
console.log(']')

console.log('\n===== 年限全景派生值 =====')
console.log('  15→38.42 月领倍数      :', (R['38.42'].total / R['15'].total).toFixed(2))
console.log('  38.42−30.42 月领差     :', (R['38.42'].total - R['30.42'].total).toFixed(2))
console.log('  剥增发后 38.42/15 倍   :', (slope('38.42', 'core') / slope('15', 'core')).toFixed(2))
console.log('  38.42−30.42 ①层斜率差  :', (slope('38.42', 'core') - slope('30.42', 'core')).toFixed(4))
console.log('  基础÷年限（各年限）    :')
for (const k of ['15', '20', '25', '30.42', '38.42']) {
  console.log(`    ${k.padStart(5)} 年: ${(R[k].basicPension.amount / R[k].totalYears).toFixed(4)}` +
    `（基础 ${R[k].basicPension.amount.toFixed(2)} ÷ ${R[k].totalYears.toFixed(2)}）`)
}

/** 区间个人缴费本金（8%） */
function pr8(idx, sy, sm, ey, em, accStart = 1995) {
  const y0 = Math.max(sy, accStart)
  let t = 0
  if (y0 === sy) t += h[String(y0)] * idx * 0.08 * (12 - sm + 1)
  else t += h[String(y0)] * idx * 0.08 * 12
  for (let y = y0 + 1; y < ey; y++) t += h[String(y)] * idx * 0.08 * 12
  if (ey > y0) t += h[String(ey)] * idx * 0.08 * (em - 1)
  return t
}

console.log('\n===== 分段增量（①层 core，剥吉林增发，100 档）=====')
console.log('  区间          年数   月领增量  每年增量  年均缴费20%  每万元每年月领')
const SEGS = [['15', '20'], ['20', '25'], ['25', '30.42']]
for (const [a, b] of SEGS) {
  const d = core(R[b]) - core(R[a])
  const mm = ym => ym[0] * 12 + ym[1]
  const months = mm(START[a]) - mm(START[b])       // 少缴的月数
  const p = pr8(1.0, START[b][0], START[b][1], START[a][0], START[a][1])
  const fee = p * 2.5
  const yr = months / 12
  const perYear = d / yr
  const feePerYear = fee / yr
  const eff = perYear / (feePerYear / 10000)
  console.log(`  ${a.padStart(5)}→${b.padEnd(6)} ${yr.toFixed(2).padStart(6)} ${d.toFixed(2).padStart(10)} ` +
    `${perYear.toFixed(2).padStart(9)} ${feePerYear.toFixed(0).padStart(11)} ${eff.toFixed(2).padStart(14)}`)
}
console.log('\n  注：30.42→38.42 是视同年限段（吉林 1995-07 建账），个人不缴费、')
console.log('      月领增量 1593.04 元全部来自过渡性养老金，不参与"每万元"效率对比。')
