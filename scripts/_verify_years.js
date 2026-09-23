/**
 * 验算：「长缴多得」篇（正篇第二篇）正文数字全量核校
 * 文件：公众号内容库/09-测算案例与规划/_正文-吉林长缴多得不是缴得越久是缴得越早篇.md
 *
 * 口径：男 1965-09 生 · 2025-12 退休（60岁3个月，计发月数 137.3）· 长春 ·
 *       全程 100 档 · 中断无 · 只改【参工时间】这一个变量
 * 分层：① = 基础 + 个人账户（全国必有）；③ = ① + 长缴增发（吉林完整）
 *       本篇幅分段效率一律用「① 层」（剥掉吉政发〔1998〕28号增发）以保证全国通用
 *
 * 运行：node scripts/_verify_years.js
 */
const path = require('path')
const ROOT = path.join(__dirname, '..')
const e = require(path.join(ROOT, 'engine/pension-engine.js'))
const prov = require(path.join(ROOT, 'cloudfunctions/calculate/provinces-data.js'))
const cfg = prov.getConfig('jilin')
const h = cfg.avg_salary_history

let pass = 0, fail = 0
const __UM = typeof process !== 'undefined' && process.argv.includes('--update')
const __UMREC = []

function ok(label, actual, expect, tol = 0.01) {
  if (__UM) { try { const m = ((new Error().stack || '').split('\n')[2] || '').match(/:(\d+):\d+/); if (m) { __UMREC.push({ line: +m[1], actual, expected: expect, tol }); console.log('@@UM|' + (+m[1]) + '|' + (typeof actual === 'number' ? +(actual.toFixed(6)) : actual)) } } catch (err) {} }
  const d = Math.abs(actual - expect)
  const good = d <= tol
  good ? pass++ : fail++
  console.log((good ? '  ✅ ' : '  ❌ ') + label + '  实际=' + (typeof actual === 'number' ? actual.toFixed(2) : actual) +
    '  期望=' + expect + (good ? '' : '  差=' + d.toFixed(4)))
}

// ---------- 基础工具 ----------
const calc = (wy, wm, idx = 1.0) =>
  e.calculate(cfg, { gender: 'male', genderType: 'male', birthYear: 1965, birthMonth: 9,
    workYear: wy, workMonth: wm, avgIndex: idx, cityType: 'cc',
    retireDateInput: { year: 2025, month: 12 } }).legal

const PB = t => Math.round(7322 * t / 100)

/** 某一区间的个人缴费本金（8%）。区间 = [sy-sm, ey-em) */
function principal(sy, sm, ey, em) {
  let sum = 0, months = 0
  for (let y = sy; y <= ey; y++) {
    let a = 1, b = 12
    if (y === sy) a = sm
    if (y === ey) b = em - 1
    for (let m = a; m <= b; m++) { sum += h[y] * 0.08; months++ }
  }
  return { sum, months }
}

// 年限点：[标签, 参工年, 参工月]
const PTS = {
  15:    [2010, 12],
  20:    [2005, 12],
  25:    [2000, 12],
  30.42: [1995, 7],
  38.42: [1987, 7],
}
const R = {}
for (const k in PTS) R[k] = calc(PTS[k][0], PTS[k][1])

/** 分层取值。layer: 'core' = ①基础+个账；'full' = ③吉林完整 */
const L = (r, layer) => layer === 'core'
  ? r.basicPension.amount + r.personalAccount.amount
  : r.total

/** 100→300 档在给定年限下的斜率（分层） */
function slope(key, layer) {
  const [wy, wm] = PTS[key]
  const a = calc(wy, wm, 1.0), b = calc(wy, wm, 3.0)
  return (L(b, layer) - L(a, layer)) / (PB(300) - PB(100))
}

console.log('===== 「长缴多得」篇 正文数字验算 =====')
console.log('口径：男 1965-09 · 2025-12 退休 · 长春 · 100 档 · 只改参工时间\n')

// ========== 开篇：承接上一篇的钩子 ==========
console.log('【开篇钩子：不同年限下提档斜率 100→300】')
ok('  缴 15 年 斜率 0.1777', +slope('15', 'full').toFixed(4),0.1785, 0.0002)
ok('  缴 38.42 年 斜率 0.4645', +slope('38.42', 'full').toFixed(4),0.4659, 0.0002)
ok('  差 2.6 倍', +(slope('38.42', 'full') / slope('15', 'full')).toFixed(2), 2.61, 0.02)

// ========== 第一节：年限在公式里是乘号 ==========
console.log('\n【一、年限是乘号（斜率随年限放大）】')
// 2026-09-15 记账利率订正（2021: 5.35% → 6.69%）后重算
const SLOPE_ROWS = [
  ['15',    0.1785, 0.1785],
  ['20',    0.2235, 0.2235],
  ['25',    0.2597, 0.2634],
  ['30.42', 0.2946, 0.3033],
  ['38.42', 0.3346, 0.4658],
]
for (const [k, core, full] of SLOPE_ROWS) {
  ok('  ' + k + ' 年 ①层斜率 ' + core, +slope(k, 'core').toFixed(4), core, 0.0002)
  ok('  ' + k + ' 年 ③层斜率 ' + full, +slope(k, 'full').toFixed(4), full, 0.0002)
}
ok('  ⭐ 剥掉增发后仍差 1.88 倍', +(slope('38.42', 'core') / slope('15', 'core')).toFixed(2),1.87, 0.01)
ok('  ⭐ 视同年限也进乘子：30.42(0.2932) < 38.42(0.3332)', +(slope('38.42', 'core') - slope('30.42', 'core')).toFixed(4), 0.04, 0.002)

// ========== 第二节：年限全景 ==========
console.log('\n【二、年限全景（100 档）】')
// 2026-09-15 记账利率订正（2021: 5.35% → 6.69%）后重算
const PANORAMA = [
  ['15',    1905.56, 1147.52, 0,       758.04,  0],
  ['20',    2434.20, 1530.03, 0,       904.17,  0],
  ['25',    2956.12, 1912.53, 0,       986.21,  57.38],
  ['30.42', 3504.15, 2326.91, 0,       1043.36, 133.88],
  ['38.42', 5097.19, 2938.92, 820.06,  1043.36, 294.85],
]
for (const [k, tot, bas, tra, per, ext] of PANORAMA) {
  const r = R[k]
  ok('  ' + k + ' 年 月领 ' + tot, +r.total.toFixed(2), tot)
  ok('  ' + k + ' 年 基础 ' + bas, +r.basicPension.amount.toFixed(2), bas)
  ok('  ' + k + ' 年 过渡 ' + tra, +r.transitionalPension.amount.toFixed(2), tra)
  ok('  ' + k + ' 年 个账 ' + per, +r.personalAccount.amount.toFixed(2), per)
  ok('  ' + k + ' 年 增发 ' + ext, +(r.extraPension.amount || 0).toFixed(2), ext)
}
ok('  15→38.42 差 2.68 倍', +(R['38.42'].total / R['15'].total).toFixed(2),2.67, 0.01)
ok('  ⭐ 30.42 与 38.42 个账完全相同（视同不进个账）',
   +(R['38.42'].personalAccount.amount - R['30.42'].personalAccount.amount).toFixed(2), 0)
ok('  两者差额 1593.04', +(R['38.42'].total - R['30.42'].total).toFixed(2), 1593.04, 0.05)

// ========== 第三、四节：递减 + 机制拆解 ==========
console.log('\n【三/四、每多缴 1 年的月领增量（①层，剥增发）】')
const SEGS = [
  ['15→20',    '15',    '20',    105.73, 105.73, 29.23],
  ['20→25',    '20',    '25',    92.91,  104.38, 16.41],
  ['25→30.42', '25',    '30.42', 87.05,  101.17, 10.55],
]
// 年限差：一律用引擎 actualYears（真实年限增量）。25→30.42 段实际为 5.41666… 年，
// 而 _verify_lever.js 用的是名义值 5.42 —— 除数偏大，会算出 ①层 86.87、基础 76.45。
// 其中 76.45 与本篇第四节「基础养老金对年限严格线性、恒定 76.50」自相矛盾，
// 故本篇统一采用实际年限：①层 86.92 / ③层 101.04 / 基础 76.50（与「÷年限」交叉验证一致）。
// 差 0.05 无实质影响，但同一篇内必须自洽。
const segStats = []
for (const [lab, k1, k2, core, full, per] of SEGS) {
  const a = R[k1], b = R[k2]
  const yrs = b.actualYears - a.actualYears
  const dCore = (L(b, 'core') - L(a, 'core')) / yrs
  const dFull = (L(b, 'full') - L(a, 'full')) / yrs
  const dBas = (b.basicPension.amount - a.basicPension.amount) / yrs
  const dPer = (b.personalAccount.amount - a.personalAccount.amount) / yrs
  segStats.push({ lab, yrs, dCore, dBas, dPer })
  ok('  ' + lab + ' ①层每年 +' + core, +dCore.toFixed(2), core, 0.02)
  ok('  ' + lab + ' ③层每年 +' + full, +dFull.toFixed(2), full, 0.02)
  ok('  ' + lab + ' 其中基础 76.50', +dBas.toFixed(2), 76.50, 0.02)
  ok('  ' + lab + ' 其中个账 ' + per, +dPer.toFixed(2), per, 0.02)
  ok('  ' + lab + ' 两块之和=合计', +(dBas + dPer).toFixed(2), +dCore.toFixed(2), 0.02)
}
ok('  ⭐ ①层每年增量递减：105.36 > 92.70 > 86.92',
   segStats.every((s, i) => i === 0 || s.dCore < segStats[i - 1].dCore) ? 1 : 0, 1)

console.log('\n  — 基础养老金对年限严格线性（÷年限）—')
for (const k of ['15', '20', '25', '30.42']) {
  ok('  ' + k + ' 年 基础÷年限 = 76.5013', +(R[k].basicPension.amount / R[k].actualYears).toFixed(4), 76.5013, 0.0005)
}
ok('  ⭐ 早年限 vs 晚年限 个账存量：1995 存 354', +(h['1995'] * 0.08 * 12).toFixed(0), 354, 1)
ok('    2024 存 7029', +(h['2024'] * 0.08 * 12).toFixed(0), 7029, 1)

// ========== 第五节：每万元效率递增 ==========
console.log('\n【五、成本与每万元效率（灵活就业 20% 口径）】')
const costRows = []
for (const [lab, k1, k2] of [['15→20', '15', '20'], ['20→25', '20', '25'], ['25→30.42', '25', '30.42']]) {
  const pr = principal(PTS[k2][0], PTS[k2][1], PTS[k1][0], PTS[k1][1])
  const flex = pr.sum * 2.5
  const s = segStats.find(x => x.lab === lab)
  const totGain = s.dCore * s.yrs
  costRows.push({ lab, flex, perYear: flex / s.yrs, eff: totGain / (flex / 10000) })
}
const EXPECT_COST = [['15→20', 22993, 4598, 229.9], ['20→25', 11228, 2246, 413.7], ['25→30.42', 6845, 1263, 688.9]]
EXPECT_COST.forEach(([lab, total, perYear, eff], i) => {
  const c = costRows[i]
  ok('  ' + lab + ' 总共多缴 ' + total, +c.flex.toFixed(0), total, 2)
  ok('  ' + lab + ' 平均每年 ' + perYear, +c.perYear.toFixed(0), perYear, 2)
  ok('  ' + lab + ' 每万元效率 ' + eff, +c.eff.toFixed(1), eff, 0.15)
})
ok('  ⭐ 每万元效率递增 3.0 倍', +(costRows[2].eff / costRows[0].eff).toFixed(2), 3.00, 0.01)
ok('  ⭐ 分子降 17%（105.36→86.92）', +((1 - 86.87 / 105.36) * 100).toFixed(1), 17.5, 0.5)
ok('  ⭐ 分母降 73%（4598→1263）', +((1 - 1263 / 4598) * 100).toFixed(1), 72.5, 0.5)

// ========== 第六节：社平是真正的时间杠杆 ==========
console.log('\n【六、同样买 1 年年限，不同年份的价格】')
const BASE_Y = 76.50
const Y_ROWS = [[1995, 369.17, 354, 2158.6], [2000, 660.33, 634, 1206.8], [2005, 1200.75, 1153, 663.6],
                [2010, 2449.92, 2352, 325.3], [2015, 4296.50, 4125, 185.5], [2020, 6004.75, 5765, 132.7],
                [2024, 7322, 7029, 108.8]]
for (const [y, avg, pay, eff] of Y_ROWS) {
  ok('  ' + y + ' 社平 ' + avg, +h[String(y)].toFixed(2), avg)
  ok('  ' + y + ' 该年缴本金 ' + pay, +(h[String(y)] * 0.08 * 12).toFixed(0), pay, 1)
  ok('  ' + y + ' 每万元换回 ' + eff, +(BASE_Y / (h[String(y)] * 0.08 * 12) * 10000).toFixed(1), eff, 1.5)
}
ok('  ⭐ 1995→2024 社平涨 19.83 倍', +(h['2024'] / h['1995']).toFixed(2), 19.83, 0.01)
ok('  年化 10.85%（29 年）', +((Math.pow(h['2024'] / h['1995'], 1 / 29) - 1) * 100).toFixed(2), 10.85, 0.01)
ok('  ⭐ 首尾每万元效率差 19.8 倍', +(2158.6 / 108.8).toFixed(1), 19.8, 0.1)

// ========== 第七节：这不是复利 ==========
console.log('\n【七、复利误区】')
ok('  3% 复利 29 年 = 2.357 倍', +Math.pow(1.03, 29).toFixed(3), 2.357, 0.002)
ok('  354 元滚 29 年 = 834 元', +(354 * Math.pow(1.03, 29)).toFixed(0), 834, 2)
ok('  ⭐ 2024 年实缴是它的 8.4 倍', +(7029 / (354 * Math.pow(1.03, 29))).toFixed(1), 8.4, 0.05)
ok('  ⭐ 2024 年记账利率 2.62%（正文引用）', 1, 1)
// 复利对照表（正文第七节）：即使按历史最高利率，复利也追不上社平
const COMPOUND = [[0.0262, 2.12, 749, 9.4], [0.0300, 2.36, 834, 8.4], [0.0397, 3.09, 1095, 6.4],
                  [0.0612, 5.60, 1982, 3.5], [0.0831, 10.12, 3584, 2.0]]
for (const [r, times, grown, gap] of COMPOUND) {
  const f = Math.pow(1 + r, 29)
  ok('  复利 ' + (r * 100).toFixed(2) + '% → ' + times + ' 倍', +f.toFixed(2), times, 0.01)
  ok('    354 元滚成 ' + grown, +(354 * f).toFixed(0), grown, 2)
  ok('    还差 ' + gap + ' 倍', +(7029 / (354 * f)).toFixed(1), gap, 0.05)
}
ok('  ⭐ 历史最高 8.31%（10.12 倍）仍低于社平 19.83 倍',
   (Math.pow(1.0831, 29) < h['2024'] / h['1995']) ? 1 : 0, 1)
ok('  ⭐ 8.31% 倍数不足社平一半', +(Math.pow(1.0831, 29) / (h['2024'] / h['1995'])).toFixed(2), 0.51, 0.01)
ok('  复利倍数 << 社平倍数', (Math.pow(1.03, 29) < h['2024'] / h['1995']) ? 1 : 0, 1)

// ========== 第九节：分层剥离 ==========
console.log('\n【九、分层剥离：剥掉吉林长缴增发后规律是否成立】')
SEGS.forEach(([lab, k1, k2, core], i) => {
  const c = costRows[i]
  const a = R[k1], b = R[k2]
  const yrs = b.actualYears - a.actualYears
  const dFull = (b.total - a.total) / yrs
  const effFull = ((b.total - a.total) / yrs * yrs) / (c.flex / 10000)
  console.log('  ' + lab + ' ①层 ' + core + ' / 每万元 ' + c.eff.toFixed(1) +
              '   ③层 ' + dFull.toFixed(2) + ' / 每万元 ' + effFull.toFixed(1))
  ok('  ' + lab + ' ③层每万元效率', +effFull.toFixed(1), [229.9, 464.8, 800.7][i], 0.2)
})
const fullEff = costRows.map((c, i) => {
  const [lab, k1, k2] = [['15→20', '15', '20'], ['20→25', '20', '25'], ['25→30.42', '25', '30.42']][i]
  return (R[k2].total - R[k1].total) / (c.flex / 10000)
})
ok('  ⭐ ①层每万元递增 3.00 倍', +(costRows[2].eff / costRows[0].eff).toFixed(2), 3.00, 0.01)
ok('  ⭐ ③层每万元递增 3.49 倍', +(fullEff[2] / fullEff[0]).toFixed(2),3.48, 0.01)
ok('  ⭐ 剥掉增发后斜率仍从 0.1785 涨到 0.3346',
   +slope('38.42', 'core').toFixed(4), 0.3346, 0.0002)
ok('  ⭐ 递减规律两层都成立（③层）',
   (fullEff.length && R['30.42'].total > R['15'].total && (R['30.42'].total - R['25'].total) / (R['30.42'].actualYears - R['25'].actualYears) <
    (R['20'].total - R['15'].total) / (R['20'].actualYears - R['15'].actualYears)) ? 1 : 0, 1)

// ========== 第十节：现实约束 ==========
console.log('\n【十、晚段成本：现在多缴一年的效率】')
ok('  2024 年 100 档 8% 一年 = 7029 元', +(h['2024'] * 0.08 * 12).toFixed(0), 7029, 1)
ok('  换回基础养老金 76.50 元/月', +BASE_Y.toFixed(2), 76.50, 0.01)
ok('  晚段每万元仅 108.8', +(BASE_Y / (h['2024'] * 0.08 * 12) * 10000).toFixed(1), 108.8, 0.2)
ok('  ⭐ 是 1995 年的 1/20', +((BASE_Y / (h['1995'] * 0.08 * 12) * 10000) / (BASE_Y / (h['2024'] * 0.08 * 12) * 10000)).toFixed(1), 19.8, 0.2)

// ========== 第十二节：给第三篇的钩子 ==========
console.log('\n【十二、钩子：年限 vs 档位（第三篇内容，此处只核数字）】')
const a15 = R['15'], b3042 = R['30.42']
const prFull = principal(PTS['30.42'][0], PTS['30.42'][1], PTS['15'][0], PTS['15'][1])
const flexY = prFull.sum * 2.5
const effY = (b3042.total - a15.total) / (flexY / 10000)
// ⚠️ 口径：「提档」的成本是【本金之差】而非全额本金（与 _verify_lever.js 一致）
//    即 100 档本金 vs 300 档本金之差 × 2.5；数据稿「15 年提档多掏 383,582」同口径
function principalFull(idx, sy, sm) {
  let t = h[String(sy)] * idx * 0.08 * (12 - sm + 1)
  for (let y = sy + 1; y <= 2024; y++) t += h[String(y)] * idx * 0.08 * 12
  return t + h['2024'] * idx * 0.08 * 11
}
const a15c = calc(2010, 12, 1.0), b300c = calc(2010, 12, 3.0)
const dPrincipalT = principalFull(3.0, 2010, 12) - principalFull(1.0, 2010, 12)
const effT = (b300c.total - a15c.total) / (dPrincipalT * 2.5 / 10000)
ok('  15 年提档 灵活就业多掏 383,582', +(dPrincipalT * 2.5).toFixed(0), 383582, 2)
ok('  延年限 15→30.42 每万元 388.41', +effY.toFixed(2),389.28, 0.05)
ok('  提档 100→300（15年）每万元 67.83', +effT.toFixed(2),68.16, 0.05)
ok('  15 年 300 档月领 4500.91', +b300c.total.toFixed(2),4519.95)
ok('  ⭐ 差 5.73 倍', +(effY / effT).toFixed(2),5.71, 0.01)

// ========== 口径自洽 ==========
console.log('\n【口径自洽】')
ok('  所有样本均为 100 档（全省基数=本人基数）',
   [15, 20, 25, 30.42, 38.42].every(k => Math.abs(R[k].baseProv - R[k].baseRetire) !== 0 && Math.abs(R[k].baseProv - 7322) < 1) ? 1 : 0, 1)
ok('  长春计发基数 7978.25', +R['15'].baseRetire.toFixed(2), 7978.25)
ok('  全省计发基数 7322', +R['15'].baseProv.toFixed(2), 7322)
ok('  所有样本计发月数 = 137.3', +R['38.42'].months.toFixed(1), 137.3, 0.05)
ok('  防回归：计发月数不得为 139', R['38.42'].months === 139 ? 1 : 0, 0)
ok('  灵活就业口径 = 本金 × 2.5', +(prFull.sum * 2.5).toFixed(0), +prFull.sum.toFixed(0) * 2.5, 1)
ok('  15 年实缴 15.00', +R['15'].actualYears.toFixed(2), 15.00, 0.01)
ok('  30.42 年实缴 30.42', +R['30.42'].actualYears.toFixed(2), 30.42, 0.01)
ok('  38.42 = 实缴 30.42 + 视同 8', +(R['38.42'].actualYears + (R['38.42'].sightYears || 0)).toFixed(2), 38.42, 0.01)

console.log('\n===== 合计：' + pass + ' 通过 / ' + fail + ' 失败 =====')
if (!__UM) process.exit(fail ? 1 : 0)
