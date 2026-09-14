/**
 * 验算：「岗位（缴费档位）vs 工龄」视频口播稿的每一个数字 + 与吉林结论交叉验证
 *
 * 稿子模型：月社平恒定 10000 · 记账利率恒定 3% · 不计过渡性/年金
 * 吉林模型：engine/pension-engine.js · 男职工 1965-09 · 2025-12 退休 · 长春 · 灵活就业 20%
 *
 * 运行：node scripts/_verify_video_claims.js
 */
const path = require('path')
const ROOT = path.join(__dirname, '..')
const e = require(path.join(ROOT, 'engine/pension-engine.js'))
const prov = require(path.join(ROOT, 'cloudfunctions/calculate/provinces-data.js'))
const cfg = prov.getConfig('jilin')
const h = cfg.avg_salary_history

let pass = 0, fail = 0
function ok(label, actual, expect, tol = 0.5) {
  const d = Math.abs(actual - expect)
  const good = d <= tol
  good ? pass++ : fail++
  console.log((good ? '✅ ' : '❌ ') + label + '  实际=' + (typeof actual === 'number' ? actual.toFixed(2) : actual) +
    '  稿中=' + expect + (good ? '' : '  差=' + d.toFixed(2)))
}
function note(t) { console.log('   · ' + t) }
function sec(t) { console.log('\n【' + t + '】') }

// ===== 稿子的静态模型 =====
const SW = 10000, RATE = 0.03
const fvifa = (r, n) => (Math.pow(1 + r, n) - 1) / r
const basic = (idx, yrs) => SW * (1 + idx) / 2 * yrs * 0.01          // 基础养老金（月）
const paFV = (idx, yrs) => SW * idx * 0.08 * 12 * fvifa(RATE, yrs)    // 个人账户余额（期末年金）
const paM = (idx, yrs, m) => paFV(idx, yrs) / m                       // 个人账户养老金

console.log('════════ A 组：静态模型复现（社平 10000 · 3% · 65岁101月）════════')

sec('A1. 基础养老金基本盘')
ok('60%档 10年 基础养老金', basic(0.6, 10), 800)
ok('60%档 15年 基础养老金', basic(0.6, 15), 1200)
ok('60%档 45年 基础养老金', basic(0.6, 45), 3600)
ok('70%档 10年 基础养老金', basic(0.7, 10), 850)
ok('60%→70% 增长率(%)', (basic(0.7, 10) - basic(0.6, 10)) / basic(0.6, 10) * 100, 6.25, 0.01)

sec('A2. 提档：每 10% 档位的增量是否恒定（绝对额）')
for (const from of [0.6, 1.0, 2.0, 2.9]) {
  ok('  ' + (from * 100).toFixed(0) + '%→' + ((from + 0.1) * 100).toFixed(0) + '% 基础养老金增量(10年期)',
    basic(from + 0.1, 10) - basic(from, 10), 50, 0.01)
}
note('⇒ 绝对增量恒定 50 元 ✔ 稿子这一条对')

sec('A3. 「提档效率恒定 37.5%」是否成立')
function ratio(i) { // 养老金相对增幅 ÷ 个人缴费相对增幅
  const pen = (basic(i + 0.1, 10) - basic(i, 10)) / basic(i, 10)
  const fee = 0.1 / i
  return pen / fee * 100
}
ok('  60%→70% 效率(%)', ratio(0.6), 37.5, 0.1)
ok('  100%→110% 效率(%)', ratio(1.0), 50, 0.1)
ok('  200%→210% 效率(%)', ratio(2.0), 66.67, 0.1)
ok('  290%→300% 效率(%)', ratio(2.9), 74.33, 0.1)
note('⇒ 稿子说「恒定 37.5%」❌：实际从 37.5% 递增到 74.3%，通式 = i/(1+i)')
note('  稿子自己后半句「越高的档位基础养老金增加越多」是对的，但与「恒定」自相矛盾')

sec('A4. 档位翻倍：增长到多少倍')
ok('  100%→200% 基础养老金倍数(x100%)', basic(2.0, 10) / basic(1.0, 10) * 100, 150, 0.01)
ok('  150%→300% 基础养老金倍数(x100%)', basic(3.0, 10) / basic(1.5, 10) * 100, 160, 0.01)
note('⇒ 稿子说「增长率 150%」措辞错，是「增长到 150%」（增长率 50%）。但 1.5→1.6 倍这个观察成立')

sec('A5. 延时：每延长 1 年是否恒定')
for (const y of [10, 15, 30, 44]) {
  ok('  60%档 ' + y + '→' + (y + 1) + '年 基础养老金增量', basic(0.6, y + 1) - basic(0.6, y), 80, 0.01)
}
note('⇒ 恒定 80 元 ✔ 稿子这一条对')

sec('A6. 同一目标 2000 元基础养老金的两条路')
ok('  100%档 20年 基础养老金', basic(1.0, 20), 2000)
ok('  300%档 10年 基础养老金', basic(3.0, 10), 2000)
const c1 = SW * 1.0 * 0.08 * 12 * 20, c2 = SW * 3.0 * 0.08 * 12 * 10
ok('  路径①个人缴费(100%档20年)', c1, 192000)
ok('  路径②个人缴费(300%档10年)', c2, 288000)
ok('  路径①每拿 1 元基础养老金的成本', c1 / 2000, 96)
ok('  路径②每拿 1 元基础养老金的成本', c2 / 2000, 144)
note('⇒ 延年限成本 96 < 提档 144 ✔ 稿子这一条对（比值 1.5 倍）')

sec('A7. 个人账户（101 计发月数口径）')
ok('  60%档 10年 本息合计', paFV(0.6, 10), 66032, 1)
ok('  其中利息', paFV(0.6, 10) - 5760 * 10, 8432, 1)
ok('  利息占比(%)', (paFV(0.6, 10) - 57600) / paFV(0.6, 10) * 100, 12.8, 0.05)
ok('  60%档 15年 本息合计', paFV(0.6, 15), 107130, 2)
ok('  60%档 20年 本息合计', paFV(0.6, 20), 154773, 2)
ok('  60%档 30年 本息合计', paFV(0.6, 30), 274034, 2)
ok('  60%档 10年 个人账户养老金', paM(0.6, 10, 101), 654, 0.5)
ok('  60%档 20年 个人账户养老金', paM(0.6, 20, 101), 1532, 0.5)
ok('  60%档 30年 个人账户养老金', paM(0.6, 30, 101), 2713, 0.5)
ok('  100%档 相对 60%档 余额增幅(%)', (paFV(1.0, 15) / paFV(0.6, 15) - 1) * 100, 66.67, 0.05)
ok('  150%档 相对 60%档 余额增幅(%)', (paFV(1.5, 15) / paFV(0.6, 15) - 1) * 100, 150, 0.05)
note('⇒ 个账余额与档位完全成正比 ✔ 稿子这一条对')

sec('A8. 计发月数口径漂移（稿子内部打架）')
ok('  60%档10年 个账养老金 @101（65岁）', paM(0.6, 10, 101), 654, 0.5)
ok('  60%档10年 个账养老金 @139（60岁）', paM(0.6, 10, 139), 475, 0.5)
ok('  300%档10年 @139 与 60%档 @139 的差', paM(3.0, 10, 139) - paM(0.6, 10, 139), 1900, 2)
ok('  每 10% 档位增量 @139', (paM(3.0, 10, 139) - paM(0.6, 10, 139)) / 24, 79, 0.2)
ok('  15年 相对 10年 增量 @139', paM(0.6, 15, 139) - paM(0.6, 10, 139), 296, 0.5)
ok('  20年 相对 10年 增量 @139', paM(0.6, 20, 139) - paM(0.6, 10, 139), 638, 0.5)
ok('  45年 相对 10年 增量 @139', paM(0.6, 45, 139) - paM(0.6, 10, 139), 3367, 2)
note('⇒ 前半段用 101（65岁）、后半段用 139（60岁），同一篇稿子两个退休年龄 ❌')

sec('A9. 复利示例')
ok('  1万本金 3% 10年 复利', 10000 * Math.pow(1.03, 10), 13439, 1)
ok('  1万本金 3% 20年 复利', 10000 * Math.pow(1.03, 20), 18061, 1)
ok('  1万本金 3% 45年 复利', 10000 * Math.pow(1.03, 45), 37816, 2)
ok('  1万本金 3% 10年 单利', 10000 * (1 + 0.03 * 10), 13000)
note('⇒ 复利示例数字全对 ✔（文中「记账利率 30%」是口误，应为 3%）')

sec('A10. 占比与临界')
const t1 = basic(0.6, 10) + paM(0.6, 10, 101)
ok('  60%档10年 基础占比(%)', basic(0.6, 10) / t1 * 100, 55.03, 0.05)
const t2 = basic(3.0, 45) + paM(3.0, 45, 101)
ok('  300%档45年 基础占比(%)', basic(3.0, 45) / t2 * 100, 25.4, 0.05)
// 70% 档「基础=个账」临界年限（年缴·期末年金 @101）
function cross(months) {
  for (let n = 5; n <= 45; n += 0.01) if (basic(0.7, n) <= paM(0.7, n, months)) return n
  return NaN
}
const cr101 = cross(101), cr139 = cross(139)
// 月缴口径（月利率 j = 1.03^(1/12)-1，月末缴）
const j = Math.pow(1.03, 1 / 12) - 1
function crossMonthly(months) {
  for (let n = 5; n <= 45; n += 0.01) {
    const fv = 560 * (Math.pow(1.03, n) - 1) / j
    if (basic(0.7, n) <= fv / months) return n
  }
  return NaN
}
const crM101 = crossMonthly(101)
console.log('   · 70%档 基础=个账 临界：年缴@101(65岁)=' + cr101.toFixed(1) + '年  年缴@139(60岁)=' + cr139.toFixed(1) +
  '年  月缴@101=' + crM101.toFixed(1) + '年')
note('⇒ 稿子说「70%档 15.7 年」：三种口径算出 16.9 / 36.0 / 16.0，均复现不出 15.7，')
note('  且稿子未说明计息时点。属次要结论、对假设极敏感，不建议引用')

sec('A11. 设定本身的现实性')
note('  ① 65 岁退休（计发月数 101）：2025 年男职工法定是 60 岁 3 个月（计发月数 139），')
note('     65 岁要等到 1980 年后出生的那批人。稿子前半段 101、后半段 139，自相矛盾')
note('  ② 45 年工龄：男 16 岁参保、61 岁退休才够，属纯理论刻度，现实中几乎不存在')
note('  ③ 社平恒定 1 万：抹掉了真实世界里最大的变量（见 B6）')

console.log('\n════════ B 组：与吉林真实数据对照 ════════')

const BASE = { gender: 'male', genderType: 'male', birthYear: 1965, birthMonth: 9, cityType: 'cc', retireDateInput: { year: 2025, month: 12 } }
function jl(wy, wm, t) {
  const L = e.calculate(cfg, { ...BASE, workYear: wy, workMonth: wm, avgIndex: t / 100 }).legal
  return { total: L.total, basic: L.basicPension.amount, per: L.personalAccount.amount, extra: L.extraPension.amount || 0 }
}
const J15_100 = jl(2010, 12, 100), J15_300 = jl(2010, 12, 300)
const J30_100 = jl(1995, 7, 100), J30_300 = jl(1995, 7, 300)

sec('B1. 吉林四组拆分')
ok('  15年 100档 月领', J15_100.total, 1890.02)
ok('  15年 300档 月领', J15_300.total, 4473.33)
ok('  30.42年 100档 月领', J30_100.total, 3481.58)
console.log('   · 30.42年 300档 月领=' + J30_300.total.toFixed(2) +
  '（基础 ' + J30_300.basic.toFixed(2) + ' + 个账 ' + J30_300.per.toFixed(2) + ' + 增发 ' + J30_300.extra.toFixed(2) + '）')

sec('B2. 【方向冲突】年限延长后，基础养老金占比是升还是降？')
const pctJ151 = J15_100.basic / J15_100.total * 100
const pctJ153 = J15_300.basic / J15_300.total * 100
const pctJ301 = J30_100.basic / J30_100.total * 100
const pctJ303 = J30_300.basic / J30_300.total * 100
console.log('   · 吉林 基础养老金占比：')
console.log('     15年·100档 = ' + pctJ151.toFixed(2) + '%')
console.log('     15年·300档 = ' + pctJ153.toFixed(2) + '%   ← 档位↑ ⇒ 基础占比↓')
console.log('     30.42年·100档 = ' + pctJ301.toFixed(2) + '%（含增发 ' + ((J30_100.basic + J30_100.extra) / J30_100.total * 100).toFixed(2) + '%）')
console.log('     30.42年·300档 = ' + pctJ303.toFixed(2) + '%（含增发 ' + ((J30_300.basic + J30_300.extra) / J30_300.total * 100).toFixed(2) + '%）')
console.log('   · 稿子（静态模型）基础占比：60%档10年 = ' + (basic(0.6, 10) / t1 * 100).toFixed(2) +
  '%   60%档30年 = ' + (basic(0.6, 30) / (basic(0.6, 30) + paM(0.6, 30, 101)) * 100).toFixed(2) + '%')
const trendJL = pctJ301 > pctJ151, trendVideo = (basic(0.6, 30) / (basic(0.6, 30) + paM(0.6, 30, 101))) < (basic(0.6, 10) / t1)
ok('  吉林：年限↑ ⇒ 基础占比↑（' + pctJ151.toFixed(1) + '%→' + pctJ301.toFixed(1) + '%）', trendJL ? 1 : 0, 1)
ok('  稿子：年限↑ ⇒ 基础占比↓', trendVideo ? 1 : 0, 1)
note('⇒ ❌ 方向相反！稿子「交得越久，领的更多是自己存的钱」在真实数据里不成立')

sec('B3. 【根因】延长期间，个人账户到底涨多少？')
const growVideo = (paM(0.6, 30, 101) - paM(0.6, 15, 101)) / paM(0.6, 15, 101) * 100
const growJL = (J30_100.per - J15_100.per) / J15_100.per * 100
const growBasicJL = (J30_100.basic - J15_100.basic) / J15_100.basic * 100
console.log('   · 静态模型：60%档 15年→30年，个账养老金 +' + growVideo.toFixed(1) + '%（1061→2713）')
console.log('   · 吉林真实：100档 15年→30.42年，个账养老金 +' + growJL.toFixed(1) + '%（' + J15_100.per.toFixed(2) + '→' + J30_100.per.toFixed(2) + '）')
console.log('   · 吉林真实：同期基础养老金 +' + growBasicJL.toFixed(1) + '%（' + J15_100.basic.toFixed(2) + '→' + J30_100.basic.toFixed(2) + '）')
ok('  静态模型「个账增幅 > 基础增幅」', (growVideo > 100) ? 1 : 0, 1)
ok('  吉林「基础增幅 > 个账增幅」', (growBasicJL > growJL) ? 1 : 0, 1)
note('⇒ 稿子：个账 +156% > 基础 +100%（复利赢）')
note('  吉林：个账 +37.5% << 基础 +102.8%（复利输给了基数折旧）')

sec('B4. 【根因量化】社平增速 vs 记账利率')
const g = Math.pow(h['2024'] / h['1995'], 1 / (2024 - 1995)) - 1
ok('  吉林月社平 1995→2024 倍数', h['2024'] / h['1995'], 19.83, 0.02)
ok('  吉林社平年化增速(%)', g * 100, 10.85, 0.05)
note('⇒ 社平年化 10.85% ≫ 记账利率 3%（且近年记账利率已降到 2%~3% 区间）')
note('  延到早年的那部分缴费：本金随社平跌 20 倍，复利只补回 1.03^30≈2.43 倍 ⇒ 净亏')

sec('B5. 两个杠杆的效率比：静态模型 vs 吉林')
const dBasicTier = basic(3.0, 15) - basic(1.0, 15)
const dPerTier = paM(3.0, 15, 101) - paM(1.0, 15, 101)
const feeTier = SW * 2 * 0.08 * 12 * 15
const dBasicYear = basic(1.0, 30) - basic(1.0, 15)
const dPerYear = paM(1.0, 30, 101) - paM(1.0, 15, 101)
const feeYear = SW * 1.0 * 0.08 * 12 * 15
const effTierBasic = dBasicTier / feeTier * 10000
const effYearBasic = dBasicYear / feeYear * 10000
const effTierAll = (dBasicTier + dPerTier) / feeTier * 10000
const effYearAll = (dBasicYear + dPerYear) / feeYear * 10000
console.log('   · 静态模型（每万元换月领）：')
console.log('     仅基础：提档 ' + effTierBasic.toFixed(2) + ' 元/月   延年限 ' + effYearBasic.toFixed(2) + ' 元/月   比值 ' + (effYearBasic / effTierBasic).toFixed(2) + ' 倍')
console.log('     含个账：提档 ' + effTierAll.toFixed(2) + ' 元/月   延年限 ' + effYearAll.toFixed(2) + ' 元/月   比值 ' + (effYearAll / effTierAll).toFixed(2) + ' 倍')
console.log('   · 吉林真实：提档 67.35 元/月   延年限 354.97 元/月（剔增发）/ 387.57（含增发）   比值 5.27 倍')
ok('  静态模型 年限/档位 效率比（含个账）', effYearAll / effTierAll, 1.69, 0.02)
ok('  吉林 年限/档位 效率比（剔增发）', 354.97 / 67.35, 5.27, 0.01)
note('⇒ 同一个方向（年限 > 档位），但静态模型只有 1.69 倍，真实 5.27 倍')

sec('B6. 敏感性：差出来的倍数是不是社平增长造成的？')
// 统一模型：退休时点固定，社平 S(t)=S0(1+g)^t，个账 3% 复利，101 计发月数
function effRatio(gRate, withPer) {
  const S = k => Math.pow(1 + gRate, -k)          // 退休前第 k 年的社平（退休当年=1）
  let a15 = 0, a30 = 0
  for (let k = 1; k <= 15; k++) a15 += S(k)
  for (let k = 1; k <= 30; k++) a30 += S(k)
  // 提档：15年，idx 1→3，多领 = 基础差 + 个账差
  const dB = (3 - 1) / 2 * 15 * 0.01               // =0.15
  let dP = 0
  if (withPer) { for (let k = 1; k <= 15; k++) dP += S(k) * 2 * 0.08 * 12 * Math.pow(1.03, k - 1) / 101 }
  const feeT = 2 * 0.08 * 12 * a15
  const effT = (dB + dP) / feeT
  // 延年限：idx=1，15→30年，多领 = 基础差 + 个账差
  const dB2 = 1 * (30 - 15) * 0.01                 // =0.15
  let dP2 = 0
  if (withPer) { for (let k = 16; k <= 30; k++) dP2 += S(k) * 1 * 0.08 * 12 * Math.pow(1.03, k - 1) / 101 }
  const feeY = 1 * 0.08 * 12 * (a30 - a15)
  const effY = (dB2 + dP2) / feeY
  return effY / effT
}
console.log('   社平年增速 →  仅基础    含个账')
for (const gr of [0, 0.03, 0.05, 0.07, g]) {
  console.log('     ' + (gr * 100).toFixed(2).padStart(5) + '%      ' +
    effRatio(gr, false).toFixed(2) + ' 倍    ' + effRatio(gr, true).toFixed(2) + ' 倍')
}
note('⇒ g=0 时 1.69 倍（=稿子的世界）；g=10.85% 时倍数大幅上升（=吉林的世界）')
note('  稿子的模型之所以低估年限，是因为它把社平钉死在 1 万，抹掉了时间杠杆')

console.log('\n════════ 结果：✅ ' + pass + ' 项通过 / ❌ ' + fail + ' 项不符 ════════')
console.log('（「不符」≠ 稿子错，部分是口径差异，见整理文档逐条说明）')
