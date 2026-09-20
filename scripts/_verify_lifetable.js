/**
 * 验算：《第四套生命表来了，但你的养老金不按它算》
 *
 * 对象：第四套生命表 / 长寿风险篇（系列第四篇）
 * 基准：吉林长春，100 档，2025-12 退休
 *   - 男职工 1965-09 生 → 60 岁 3 个月，计发月数 137.3
 *   - 女干部 1970-09 生 → 55 岁 3 个月，计发月数 168.5
 *
 * ⚠️ 纪律：
 *   1. 期望值必须是引擎实测算出来的，不允许 got/want 两头都写常量
 *      （除外部 cite 常数：经验生命表余命、139/170/195、75.21、4%、政策文件值）
 *   2. 引擎接线 dictation ：
 *      legal.personalAccount.balance / .amount、legal.transitionalPension.amount、
 *      legal.extraPension.amount、legal.basicPension.amount、legal.months、legal.age
 */

const e = require('../engine/pension-engine.js')
const cfg = require('../cloudfunctions/calculate/provinces-data.js').getConfig('jilin')
const h = cfg.avg_salary_history

// ── 外部 cite 常数（非引擎，逐条注明出处）──
const LIFE = { m60: 23.34, f55: 31.32, f50: 36.08 }   // 《中国社会保险经验生命表（2020）》中国社会保险学会
const DIVISOR_STD = { 60: 139, 55: 170, 50: 195 }       // 国发〔2005〕38号 附表
const CENSUS_E0 = 75.21                                  // 2000 年五普 0 岁预期寿命
const CENSUS_RATE = 0.04                                 // 计发月数推导时采用的固定利率
const RAISE = 0.032                                      // 2026 年全国总体调整水平 3.2%

const BASE_M = {
  gender: 'male', genderType: 'male',
  birthYear: 1965, birthMonth: 9,
  workYear: 1987, workMonth: 7,
  avgIndex: 1.0, cityType: 'cc',
  retireDateInput: { year: 2025, month: 12 },
}
const BASE_F = {
  gender: 'female', genderType: 'fc',
  birthYear: 1970, birthMonth: 9,
  workYear: 1992, workMonth: 7,
  avgIndex: 1.0, cityType: 'cc',
  retireDateInput: { year: 2025, month: 12 },
}
const calc = (o) => e.calculate(cfg, o).legal

const M = calc(BASE_M)
const F = calc(BASE_F)

/** 8% 本金（个人缴费累计，不含利息）：吉林 1995-07 建账，此前为视同缴费 */
function principal8(idx) {
  let t = h['1995'] * idx * 0.08 * 6
  for (let y = 1996; y <= 2024; y++) t += h[String(y)] * idx * 0.08 * 12
  return t + h['2024'] * idx * 0.08 * 11
}
const P8 = principal8(1.0)
const F20 = P8 * 2.5                 // 灵活就业 20% = 8% 本金 × 2.5

const grow = (g, n) => (Math.pow(1 + g, n) - 1) / g

let pass = 0, fail = 0, __line = 0
function ok(label, got, want, tol) {
  const t = tol === undefined ? 0.01 : tol
  const good = Math.abs(got - want) <= t
  good ? pass++ : fail++
  if (!good) console.log(`  ❌   ${label}  got=${got} want=${want} tol=${t}`)
}
function okEq(label, got, want) {
  const good = got === want
  good ? pass++ : fail++
  if (!good) console.log(`  ❌   ${label}  got=${got} want=${want}`)
}

console.log('\n════ 〇、引擎利率表订正后的回归防错 ════')
const rates = require('../cloudfunctions/calculate/pension-engine.js')
// 计发月数不受记账利率影响，单独防回归
okEq('  层1：60岁3个月计发月数', M.months, 137.3)
okEq('  层1：55岁3个月计发月数', F.months, 168.5)
okEq('  37.3 不等于整岁表 139', M.months === 139 ? 0 : 1, 1)

console.log('\n════ 一、计发月数 139 的来历（五普减法 + 4%）════')
const n601 = CENSUS_E0 - 60
const N = n601 * 12
const derived = (1 - Math.pow(1 + CENSUS_RATE / 12, -N)) / (CENSUS_RATE / 12)
ok('  75.21 − 60 = 15.21 年', +(CENSUS_E0 - 60).toFixed(2), 15.21)
ok('  按月折现近似推导 ~136.6', +derived.toFixed(1), 136.6, 1.0)
ok('  官方推导值 138.76 → 取整 139', Math.round(138.76), DIVISOR_STD[60])

console.log('\n════ 二、真实余命 vs 计发月数：覆盖率 ════')
const cov = (d, y) => d / (y * 12)
ok('  60岁男 余命 23.34 年 = 280.1 个月', +(LIFE.m60 * 12).toFixed(1), 280.1)
ok('  55岁女 余命 31.32 年 = 375.8 个月', +(LIFE.f55 * 12).toFixed(1), 375.8)
ok('  50岁女 余命 36.08 年 = 433.0 个月', +(LIFE.f50 * 12).toFixed(1), 433.0)
ok('  139 覆盖率 49.6%', +(cov(139, LIFE.m60) * 100).toFixed(1), 49.6)
ok('  195 覆盖率 45.0%', +(cov(195, LIFE.f50) * 100).toFixed(1), 45.0)

console.log('\n════ 三、吉林样本分项（引擎实测）════')
ok('  男 基础养老金 2938.92', +M.basicPension.amount.toFixed(2), 2938.92)
ok('  男 个人账户 957.28', +M.personalAccount.amount.toFixed(2), 957.28)
ok('  男 个账储存额 131434', +M.personalAccount.balance.toFixed(0), 131434)
ok('  男 过渡性 820.06', +M.transitionalPension.amount.toFixed(2), 820.06)
ok('  男 吉林增发 294.85', +M.extraPension.amount.toFixed(2), 294.85)
ok('  男 合计 5011.11', +M.total.toFixed(2), 5011.11)
ok('  女 合计 3843.19', +F.total.toFixed(2), 3843.19)
ok('  女 个人账户 780.03', +F.personalAccount.amount.toFixed(2), 780.03)
ok('  ⭐ 两人个账储存额相同（都是实缴30.42年）', +F.personalAccount.balance.toFixed(0), +M.personalAccount.balance.toFixed(0), 1)

console.log('\n════ 四、个账什么时候领完 ════')
const buyOut = (L) => L.age + L.months / 12
ok('  男 个账领完 71.69 岁', +buyOut(M).toFixed(2), 71.69)
ok('  女 个账领完 69.29 岁', +buyOut(F).toFixed(2), 69.29)
ok('  男 之后还活 142.8 个月', +(LIFE.m60 * 12 - M.months).toFixed(1), 142.8)
ok('  女 之后还活 207.3 个月', +(LIFE.f55 * 12 - F.months).toFixed(1), 207.3)
ok('  男 之后还活 11.90 年', +((LIFE.m60 * 12 - M.months) / 12).toFixed(2), 11.90)
ok('  女 之后还活 17.28 年', +((LIFE.f55 * 12 - F.months) / 12).toFixed(2), 17.28)
ok('  男 统筹替个账支付 136680', +(M.personalAccount.amount * (LIFE.m60 * 12 - M.months)).toFixed(0), 136680, 2)
ok('  女 统筹替个账支付 161731', +(F.personalAccount.amount * (LIFE.f55 * 12 - F.months)).toFixed(0), 161731, 2)

console.log('\n════ 五、三种回本口径（分子分母必须配套）════')
const backMRaw = P8 / M.personalAccount.amount
const backFRaw = P8 / F.personalAccount.amount
const backAllM = F20 / M.total
const backAllF = F20 / F.total
const backPoolM = (F20 - P8) / (M.total - M.personalAccount.amount)
ok('  8% 本金 86341', +P8.toFixed(0), 86341, 2)
ok('  20% 全口径 215854', +F20.toFixed(0), 215854, 2)
ok('  ① 男 个账自回本 67.77 岁', +(M.age + backMRaw / 12).toFixed(2), 67.77)
ok('  ① 女 个账自回本 64.47 岁', +(F.age + backFRaw / 12).toFixed(2), 64.47)
ok('  ③ 男 全口径回本 63.84 岁', +(M.age + backAllM / 12).toFixed(2), 63.84)
ok('  ③ 女 全口径回本 59.93 岁', +(F.age + backAllF / 12).toFixed(2), 59.93)
ok('  ③ 男 全口径 43.1 个月', +backAllM.toFixed(1), 43.1)
ok('  统筹那 12% 单独回本 62.91 岁', +(M.age + backPoolM / 12).toFixed(2), 62.91)
ok('  ⭐ 反直觉：全口径回本早于个账自回本', backAllM < backMRaw ? 1 : 0, 1)

console.log('\n════ 六、静态 vs 含上调 ════')
const sumStatic = (L, y) => L.total * y * 12
const sumRaise = (L, y) => L.total * 12 * grow(RAISE, y)
ok('  男 静态 1403512', +sumStatic(M, LIFE.m60).toFixed(0), 1403512, 5)
ok('  女 静态 1444425', +sumStatic(F, LIFE.f55).toFixed(0), 1444425, 5)
ok('  男 含3.2%上调 2040502', +sumRaise(M, LIFE.m60).toFixed(0), 2040502, 5)
ok('  女 含3.2%上调 2423997', +sumRaise(F, LIFE.f55).toFixed(0), 2423997, 5)
ok('  男 倍数 ×1.454', +(sumRaise(M, LIFE.m60) / sumStatic(M, LIFE.m60)).toFixed(3), 1.454)
ok('  女 倍数 ×1.678', +(sumRaise(F, LIFE.f55) / sumStatic(F, LIFE.f55)).toFixed(3), 1.678)

console.log('\n════ 七、男女对比（三种口径）════')
ok('  女月领比男低 23.3%', +((1 - F.total / M.total) * 100).toFixed(1), 23.3)
ok('  ⭐ 终身静态 女只多 2.9%', +((sumStatic(F, LIFE.f55) / sumStatic(M, LIFE.m60) - 1) * 100).toFixed(1), 2.9)
ok('  ⭐ 终身含上调 女多 18.8%', +((sumRaise(F, LIFE.f55) / sumRaise(M, LIFE.m60) - 1) * 100).toFixed(1), 18.8)
// 原文口径：都只缴 15 / 20 年
for (const yrs of [15, 20]) {
  const sy = 2025 - yrs + 1
  const A = calc({ ...BASE_M, workYear: sy, workMonth: 1 })
  const B = calc({ ...BASE_F, workYear: sy, workMonth: 1 })
  const a = sumStatic(A, LIFE.m60), b = sumStatic(B, LIFE.f55)
  const EXP = { 15: 25.0, 20: 25.6 }[yrs]
  ok(`  都缴 ${yrs} 年 女多 ${EXP}%`, +((b / a - 1) * 100).toFixed(1), EXP)
}

console.log('\n════ 八、防错：三种回本口径不可混用 ════')
ok('  ⭐ 本文率口径 = 全部投入 vs 全部待遇（不是增量提档）', backAllM < 60 ? 1 : 0, 1)
ok('  ⭐ 137.3 ≠ 139（延迟退休必须按月折算）', M.months < 139 ? 1 : 0, 1)

console.log(`\n【===== 生命表篇验算结果：${pass} 通过 / ${fail} 失败 =====】\n`)
