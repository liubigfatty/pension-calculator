/**
 * 验算：《吉林 100 档 vs 300 档精确对比（缴满最低年限口径）》全部数字
 * 口径：男 1965-09 生 · 2010-12 参工 · 2025-12 退休(60岁3个月) · 15 年全实缴 · 长春
 * 出钱方式：灵活就业 20%（8% 个人账户 + 12% 统筹）
 *
 * 运行：node scripts/_verify_minyears.js
 */
const path = require('path')
const e = require(path.join(__dirname, '../engine/pension-engine.js'))
const prov = require(path.join(__dirname, '../cloudfunctions/calculate/provinces-data.js'))
const cfg = prov.getConfig('jilin')
const h = cfg.avg_salary_history

let pass = 0, fail = 0
const ok = (name, actual, expected, tol = 0.02) => {
  const good = Math.abs(actual - expected) <= tol
  console.log((good ? '✅ ' : '❌ ') + name + '  实际=' + (typeof actual === 'number' ? actual.toFixed(2) : actual) + ' 期望=' + expected)
  good ? pass++ : fail++
}
const sec = (t) => console.log('\n===== ' + t + ' =====')

// ---------- 缴费分段（2010-12 参工 → 2025-12 退休 = 180 个月）----------
// 2010 年 1 个月 + 2011~2024 各 12 个月 + 2025 年 11 个月（沿用 2024 社平）
const seg = [['2010', 1, h['2010']]]
for (let y = 2011; y <= 2024; y++) seg.push([String(y), 12, h[String(y)]])
seg.push(['2025', 11, h['2024']])
const principal = (idx) => seg.reduce((t, [, m, s]) => t + s * idx * 0.08 * m, 0)

const BASE = {
  gender: 'male', genderType: 'male', birthYear: 1965, birthMonth: 9,
  workYear: 2010, workMonth: 12, cityType: 'cc',
  retireDateInput: { year: 2025, month: 12 }
}
const calc = (idx) => e.calculate(cfg, { ...BASE, avgIndex: idx }).legal
const A = calc(1.0), B = calc(3.0)

sec('1. 口径')
ok('  法定退休年龄 = 60岁3个月', A.age, 60.25, 0.001)
ok('  缴费年限 = 15.00', A.totalYears, 15, 0.001)
ok('  实缴年限 = 15', A.actualYears, 15, 0.001)
ok('  视同年限 = 0', A.sightYears, 0, 0)
ok('  过渡性养老金 = 0', A.transitionalPension.amount, 0, 0)
ok('  长缴增发 = 0（15年<20年阈值）', A.extraPension.amount, 0, 0)
ok('  计发月数 = 139', A.months, 139, 0)

sec('2. 100 档 / 300 档 养老金构成')
ok('  100档 基础养老金', A.basicPension.amount, 1147.52)
ok('  100档 个人账户', A.personalAccount.amount, 742.50)
ok('  100档 月领合计', A.total, 1890.02)
ok('  300档 基础养老金', B.basicPension.amount, 2245.82)
ok('  300档 个人账户', B.personalAccount.amount, 2227.51)
ok('  300档 月领合计', B.total, 4473.33)
ok('  月领差', B.total - A.total, 2583.31)
ok('  基础部分倍数 = 1.96', B.basicPension.amount / A.basicPension.amount, 1.9571, 0.001)
ok('  个人账户部分倍数 = 3.00', B.personalAccount.amount / A.personalAccount.amount, 3.0, 0.001)
ok('  合计倍数 = 2.37', B.total / A.total, 2.3668, 0.001)

sec('3. 双基数公式复算（吉林特有）')
const f = (idx) => (7978.25 + 7322 * idx) / 2 * 15 * 0.01
ok('  100档 基础 = (7978.25+7322×1)/2×15×1%', f(1.0), 1147.52)
ok('  300档 基础 = (7978.25+7322×3)/2×15×1%', f(3.0), 2245.82)

sec('4. 本金与含息（交叉验证）')
const p1 = principal(1.0), p3 = principal(3.0)
ok('  100档 8%本金', p1, 76716.45)
ok('  300档 8%本金', p3, 230149.36)
ok('  本金差', p3 - p1, 153432.91)
ok('  含息倍数 100档', A.personalAccount.balance / p1, 1.3453, 0.0005)
ok('  含息倍数 300档', B.personalAccount.balance / p3, 1.3453, 0.0005)
ok('  两档含息倍数一致（本金口径同源）',
  Math.abs(A.personalAccount.balance / p1 - B.personalAccount.balance / p3) < 1e-6 ? 1 : 0, 1, 0)

sec('5. 灵活就业总缴费（20%）')
ok('  100档 15年总缴', p1 * 2.5, 191791.14)
ok('  300档 15年总缴', p3 * 2.5, 575373.41)
ok('  多交', p3 * 2.5 - p1 * 2.5, 383582.27)
ok('  进个人账户部分', p3 - p1, 153432.91)
ok('  进统筹部分（沉没）', (p3 - p1) * 1.5, 230149.36)

sec('6. 回本三层')
const dTot = B.total - A.total
const dPer = B.personalAccount.amount - A.personalAccount.amount
const dPool = dTot - dPer
ok('  月领差合计', dTot, 2583.31)
ok('  个人账户部分', dPer, 1485.01)
ok('  统筹部分', dPool, 1098.30)
ok('  [整体] 回本 = 383582/2583.31/12 年', (p3 - p1) * 2.5 / dTot / 12, 12.37, 0.01)
ok('  [整体] 临界年龄', 60.25 + (p3 - p1) * 2.5 / dTot / 12, 72.6, 0.1)
ok('  [个人账户] 回本 年', (p3 - p1) / dPer / 12, 8.61, 0.01)
ok('  [个人账户] 临界年龄', 60.25 + (p3 - p1) / dPer / 12, 68.9, 0.1)
ok('  [统筹] 回本 年', (p3 - p1) * 1.5 / dPool / 12, 17.46, 0.01)
ok('  [统筹] 临界年龄', 60.25 + (p3 - p1) * 1.5 / dPool / 12, 77.7, 0.1)
ok('  [企业职工] 回本 年', (p3 - p1) / dTot / 12, 4.95, 0.01)
ok('  [企业职工] 临界年龄', 60.25 + (p3 - p1) / dTot / 12, 65.2, 0.1)

sec('7. 六档全表与斜率')
const tiers = [60, 80, 100, 150, 200, 300]
const expTotal = { 60: 1373.36, 80: 1631.69, 100: 1890.02, 150: 2535.84, 200: 3181.67, 300: 4473.33 }
const rows = tiers.map((t) => {
  const L = calc(t / 100)
  const pb = Math.round(7322 * t / 100)
  ok('  ' + t + '档 月领', L.total, expTotal[t])
  return { t, payBase: pb, total: L.total }
})
for (let i = 1; i < rows.length; i++) {
  const a = rows[i - 1], b = rows[i]
  ok('  ' + a.t + '→' + b.t + '档 斜率 = 0.1764', (b.total - a.total) / (b.payBase - a.payBase), 0.1764, 0.0005)
}
ok('  60→300 缴基倍数 = 5.00', rows[5].payBase / rows[0].payBase, 5.0, 0.01)
ok('  60→300 月领倍数 = 3.26', rows[5].total / rows[0].total, 3.26, 0.01)

sec('8. 真实替代率')
ok('  100档 替代率 = 1890.02/7322', A.total / 7322 * 100, 25.81, 0.01)
ok('  300档 替代率 = 4473.33/21966', B.total / 21966 * 100, 20.36, 0.01)

sec('9. 制度边界')
ok('  60档 缴基/社平 = 0.6000', rows[0].payBase / 7322, 0.6, 0.001)
ok('  300档 缴基/社平 = 3.0000', rows[5].payBase / 7322, 3.0, 0.001)

sec('10. 现金流（按 2024 社平 7,322）')
ok('  100档 月缴(20%)', 7322 * 0.20, 1464.40)
ok('  300档 月缴(20%)', 7322 * 3 * 0.20, 4393.20)
ok('  300档 年缴', 7322 * 3 * 0.20 * 12, 52718.40)
ok('  300档比100档每年多掏', 7322 * 2 * 0.20 * 12, 35145.60)

sec('11. 【已知缺陷】最低缴费年限（不计入失败，仅作红灯标记）')
const my = A.minYears
if (my === 15) {
  console.log('✅  引擎 minYears = 15（已修复）')
} else {
  console.log('🚩  引擎 minYears = ' + my + '，政策应为 15（2029-12-31 前不调整）—— 待修复')
  console.log('    getMinYears() 默认：retireYear>=2025 → return 20，与国办发〔2025〕5号不符。')
  console.log('    仅四川配了正确的 min_years（2025-2029:15 / 2030:15.5 / … / 2039:20），其余 30 省走默认。')
  console.log('    影响：web/app.js:314 会标红显示「最低缴费年限要求 20 年 ✗ 不足」。')
}

console.log('\n===== 汇总：' + pass + ' 通过 / ' + fail + ' 失败 =====')
process.exit(fail > 0 ? 1 : 0)
