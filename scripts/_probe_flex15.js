/**
 * 探查：灵活就业 20% 全自付 · 15 年最低年限 · 60 档 · 2025 年底退休 · 多久回本
 *
 * 口径：
 *   缴费        —— 按项目纪律，参工月 = 7 月（毕业季）。15 年 ⇒ 2010-07 参工，
 *                  2025-12 退休 ⇒ 实缴 15.42 年（2010 年 6 个月 + 2011~2024 各 12 个月
 *                  + 2025 年 11 个月），与 _probe_longevity.js 的计息口径完全一致。
 *   60 档       —— 平均缴费指数 0.6（制度下限）
 *   灵活就业    —— 费率 20%，其中 8% 进个人账户、12% 进统筹，**全部由个人承担**
 *   回本（全口径）= 累计实缴 20% ÷ 退休首月养老金（元/月）⇒ 月数 ⇒ 年 / 年龄
 *
 * 注意：这是「全口径回本」，与前三篇用的「增量提档回本」（多缴÷多领）不是一个概念，
 *      也与「个账自回本」（8% 本金 ÷ 个账月领）不同，三者不可混写。
 */
const path = require('path')
const e = require('../engine/pension-engine.js')
const { getConfig } = require('../cloudfunctions/calculate/provinces-data.js')

/**
 * 累计个人实缴本金（8% 部分，不含利息）。
 * 与 _verify_tiers.js 的 principal() 同口径：退休当年（2025）按 11 个月计，
 * 且基数为**上一年社平** h['2024']（D1 规则：29 省用上年社平）。
 * 吉林 1995-07 建账：参工早于 1995 的部分属视同缴费，个人不缴，故起算年 = 1995。
 */
function principal8(h, idx, sy, sm, accStart = 1995) {
  const y0 = Math.max(sy, accStart)
  let t = h[String(y0)] * idx * 0.08 * (sy < y0 ? 6 : (12 - sm + 1))
  for (let y = y0 + 1; y <= 2024; y++) t += h[String(y)] * idx * 0.08 * 12
  return t + h['2024'] * idx * 0.08 * 11
}

/** 含每年调增时，第 1..n 年的领取总额 / 首年月领 */
function cumWithGrowth(monthly, years, g) {
  // 逐月简化：按年复利，年初月领 = monthly × (1+g)^(k-1)
  let s = 0
  for (let y = 1; y <= years; y++) s += monthly * Math.pow(1 + g, y - 1) * 12
  return s
}

function run(prov, provName, cityType, gender, genderType, by, bm, ry, rm, label) {
  const cfg = getConfig(prov)
  const h = cfg.avg_salary_history
  const sy = 2010, sm = 7
  const L = e.calculate(cfg, {
    gender, genderType, birthYear: by, birthMonth: bm,
    workYear: sy, workMonth: sm,
    avgIndex: 0.6, cityType,
    retireDateInput: { year: ry, month: rm }
  }).legal

  const total = L.total
  const basic = L.basicPension.amount
  const pa = L.personalAccount.amount
  const trans = L.transitionalPension ? L.transitionalPension.amount : 0
  const extra = L.extraPension ? L.extraPension.amount : 0
  const p8 = principal8(h, 0.6, sy, sm)
  const f20 = p8 * 2.5                       // 20% = 8% × 2.5
  const backM = f20 / total                  // 全口径回本月数
  const back1 = p8 / pa                      // 个账自回本
  const poolBack = (f20 - p8) / (total - pa) // 统筹那 12% 单独回本

  // 含 3.2% 调增的回本：逐月累加直到累计 ≥ 总缴费
  const g = 0.032
  let acc = 0, m = 0
  while (acc < f20 && m < 1200) {
    const yIdx = Math.floor(m / 12)
    acc += total * Math.pow(1 + g, yIdx)
    m++
  }

  const spec = L.specialAddition ? L.specialAddition.amount : 0
  console.log(`\n──── ${label} ────`)
  console.log('  退休年龄 / 计发月数 :', L.ageStr, '/', L.months)
  console.log('  实缴年限            :', L.actualYears ? L.actualYears.toFixed(2) : '—', '年')
  console.log('  基础 / 个账 / 过渡 / 增发 :', basic.toFixed(2), '/', pa.toFixed(2), '/',
    trans.toFixed(2), '/', extra.toFixed(2),
    spec ? `【地方补贴 ${spec.toFixed(2)}】` : '')
  console.log('  合计月领            :', total.toFixed(2), '元/月',
    spec ? `（剔地方补贴 ${(total - spec).toFixed(2)}）` : '')
  console.log('  累计实缴 8% / 20%   :', p8.toFixed(0), '/', f20.toFixed(0), '元')
  console.log('  ★ 全口径回本        :', backM.toFixed(1), '个月 =', (backM / 12).toFixed(2), '年 →',
    (L.age + backM / 12).toFixed(2), '岁')
  console.log('    个账自回本(8%÷个账):', back1.toFixed(1), '个月 =', (L.age + back1 / 12).toFixed(2), '岁')
  console.log('    统筹12%单独回本   :', poolBack.toFixed(1), '个月 =', (L.age + poolBack / 12).toFixed(2), '岁')
  console.log('  含3.2%调增的回本    :', m, '个月 =', (m / 12).toFixed(2), '年 →',
    (L.age + m / 12).toFixed(2), '岁')
  return { L, total, p8, f20, backM }
}

console.log('════ 灵活就业 20% 全自付 · 15 年 · 60 档 · 2025-12 退休 · 全口径回本 ════')
console.log('（实缴 15.42 年：2010-07 参工，2025-12 退休）\n')

console.log('============ 吉林（系列基准省）============')
const M = run('jilin', '吉林', 'cc', 'male', 'male', 1965, 9, 2025, 12, '男职工 60岁3个月')
const FW = run('jilin', '吉林', 'cc', 'female', 'fw', 1975, 8, 2025, 12, '女工人 50岁4个月')
const FC = run('jilin', '吉林', 'cc', 'female', 'fc', 1970, 9, 2025, 12, '女干部 55岁3个月')

console.log('\n============ 跨省稳健性（男职工，同口径）============')
const PROVS = [
  ['shanghai', '上海', 'sh'],
  ['zhejiang', '浙江', 'hz'],
  ['hubei', '湖北', 'wh'],
  ['henan', '河南', 'zz'],
  ['sichuan', '四川', 'cd'],
  ['shandong', '山东', 'jn'],
]
for (const [p, n, c] of PROVS) {
  try {
    run(p, n, c, 'male', 'male', 1965, 9, 2025, 12, n + ' 男职工 60岁3个月')
  } catch (err) {
    console.log(`\n──── ${n} ────\n  跳过：${err.message}`)
  }
}
console.log('\n  注：广东 avg_salary_history 序列为空（该省用另一套字段），本脚本不适用。')

console.log('\n============ 吉林男 · 敏感性：档位 × 年限 ============')
const cfg0 = getConfig('jilin')
const H = cfg0.avg_salary_history
console.log('  档位  参工    年限     月领      实缴20%     回本月数   回本年   回本年龄')
for (const idx of [0.6, 1.0, 2.0, 3.0]) {
  for (const sy of [2010, 2005, 1995, 1987]) {
    const L = e.calculate(cfg0, {
      gender: 'male', genderType: 'male', birthYear: 1965, birthMonth: 9,
      workYear: sy, workMonth: 7, avgIndex: idx, cityType: 'cc',
      retireDateInput: { year: 2025, month: 12 }
    }).legal
    const p8 = principal8(H, idx, sy, 7)
    const f20 = p8 * 2.5
    const bm = f20 / L.total
    console.log(`  ${String(idx).padEnd(5)} ${sy}   ${L.actualYears.toFixed(2).padStart(6)}  ` +
      `${L.total.toFixed(2).padStart(9)}  ${f20.toFixed(0).padStart(10)}  ` +
      `${bm.toFixed(1).padStart(9)}  ${(bm / 12).toFixed(2).padStart(6)}  ` +
      `${(L.age + bm / 12).toFixed(2).padStart(7)} 岁`)
  }
}
console.log('\n  ⇒ 注意「回本年数」与「回本年龄」会反向：年限短的人回本**年数**少，')
console.log('    但因为退休晚、月领低，回本**年龄**反而更大。')
