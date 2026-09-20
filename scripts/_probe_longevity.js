/**
 * 探查：第四套生命表 / 长寿风险 主题所需的引擎实测数字
 *
 * 基准沿用三篇系列：吉林长春，100 档，2025-12 退休
 *
 * 外部常数（非引擎，需注明出处）：
 *   《中国社会保险经验生命表（2020）》中国社会保险学会
 *     60 岁男性平均余命 23.34 年 / 55 岁女性 31.32 年 / 50 岁女性 36.08 年
 *   国发〔2005〕38号：计发月数 60 岁 139、55 岁 170、50 岁 195
 *   推导口径：五普 0 岁预期寿命 75.21 岁 + 4% 利率 → 60 岁 138.76 → 取整 139
 */
const e = require('../engine/pension-engine.js')
const cfg = require('../cloudfunctions/calculate/provinces-data.js').getConfig('jilin')
const h = cfg.avg_salary_history

const LIFE = { m60: 23.34, f55: 31.32, f50: 36.08 }

function calc(o) {
  return e.calculate(cfg, o).legal
}

/**
 * 8% 本金（个人缴费累计，不含利息）。
 * 吉林 1995-07 建账，之前为视同缴费（个人不缴），故一律从 1995 年 7 月起算 6 个月。
 * 与 _verify_tiers.js / _verify_compare.js 口径一致。
 */
function principal8(idx) {
  let t = h['1995'] * idx * 0.08 * 6
  for (let y = 1996; y <= 2024; y++) t += h[String(y)] * idx * 0.08 * 12
  return t + h['2024'] * idx * 0.08 * 11
}
const fee20 = (idx, sy, sm) => principal8(idx, sy, sm) * 2.5   // 灵活就业 20% 口径

function report(label, L, lifeYears, idx, sy, sm) {
  const months = L.months
  const pa = L.personalAccount.amount
  const basic = L.basicPension.amount
  const trans = L.transitionalPension.amount
  const extra = L.extraPension ? L.extraPension.amount : 0
  const total = L.total
  const balance = L.personalAccount.balance
  const lifeM = lifeYears * 12
  const gap = lifeM - months
  const covered = months / lifeM
  const ageBuyOut = L.age + months / 12

  const p8 = principal8(idx)
  const f20 = fee20(idx)
  // 三种回本口径，分子分母必须配套，不能混搭：
  //   ① 个账自回本：8% 本金 ÷ 个账月领            —— "我存的钱多久领回来"
  //   ② 个账清零  ：含息储存额 ÷ 个账月领 = 计发月数 —— 制度设计值，恒等于 months
  //   ③ 全口径总投入：灵活就业 20% ÷ 全部月领      —— "我这辈子掏的钱多久领回来"
  const back1 = p8 / pa
  const back3 = f20 / total
  const backPool = (f20 - p8) / (total - pa)   // 统筹那 12% 单独回本（交叉校验收台账用）
  const grow = (g, n) => (Math.pow(1 + g, n) - 1) / g
  const staticSum = total * lifeM
  const s32 = total * 12 * grow(0.032, lifeYears)
  const s20 = total * 12 * grow(0.02, lifeYears)

  console.log('\n================ ' + label + ' ================')
  console.log('年龄 / 计发月数       :', L.ageStr, '/', months)
  console.log('基础 元/月            :', basic.toFixed(2))
  console.log('个人账户 元/月        :', pa.toFixed(2), '（储存额', balance.toFixed(0), '元）')
  console.log('过渡性 / 吉林增发     :', trans.toFixed(2), '/', extra.toFixed(2))
  console.log('合计 元/月            :', total.toFixed(2))
  console.log('---- 长寿账 ----')
  console.log('生命表余命            :', lifeYears, '年 =', lifeM.toFixed(1), '个月')
  console.log('计发月数只覆盖        :', (covered * 100).toFixed(1) + '%')
  console.log('个账领完时年龄        :', ageBuyOut.toFixed(2), '岁')
  console.log('此后还领              :', gap.toFixed(1), '个月 =', (gap / 12).toFixed(2), '年')
  console.log('统筹替个账继续发      :', (pa * gap).toFixed(0), '元')
  console.log('---- 回本 ----')
  console.log('① 个账自回本（8%本金÷个账月领）:', p8.toFixed(0), '元 →', back1.toFixed(1), '个月 =',
    (L.age + back1 / 12).toFixed(2), '岁')
  console.log('② 个账清零（恒=计发月数）      :', (balance / pa).toFixed(1), '个月 =',
    (L.age + balance / pa / 12).toFixed(2), '岁')
  console.log('③ 全口径（灵活就业20%÷全部月领）:', f20.toFixed(0), '元 →', back3.toFixed(1), '个月 =',
    (L.age + back3 / 12).toFixed(2), '岁')
  console.log('   其中统筹那 12% 单独回本     :', (f20 - p8).toFixed(0), '元 →', backPool.toFixed(1), '个月 =',
    (L.age + backPool / 12).toFixed(2), '岁')
  console.log('---- 终身领取 ----')
  console.log('静态（无调增）        :', staticSum.toFixed(0), '元')
  console.log('含 3.2%/年 调增       :', s32.toFixed(0), '元（×', (s32 / staticSum).toFixed(3), '）')
  console.log('含 2.0%/年 调增       :', s20.toFixed(0), '元（×', (s20 / staticSum).toFixed(3), '）')
  return { L, months, pa, total, lifeM, gap, covered, staticSum, s32, balance, ageBuyOut }
}

console.log('吉林长春 · 100 档 · 2025-12 退休 · 余命取自《中国社会保险经验生命表（2020）》')

const M = report('男职工 60岁3个月 · 缴38.42年',
  calc({ gender: 'male', genderType: 'male', birthYear: 1965, birthMonth: 9, workYear: 1987, workMonth: 7, avgIndex: 1.0, cityType: 'cc', retireDateInput: { year: 2025, month: 12 } }),
  LIFE.m60, 1.0, 1987, 7)

const F = report('女干部 55岁3个月 · 缴33.50年',
  calc({ gender: 'female', genderType: 'fc', birthYear: 1970, birthMonth: 9, workYear: 1992, workMonth: 7, avgIndex: 1.0, cityType: 'cc', retireDateInput: { year: 2025, month: 12 } }),
  LIFE.f55, 1.0, 1992, 7)

console.log('\n================ 男女对比（各自满工龄、同 100 档）================')
console.log('月领   男 / 女        :', M.total.toFixed(2), '/', F.total.toFixed(2),
  ' → 女比男低', ((1 - F.total / M.total) * 100).toFixed(1) + '%')
console.log('终身(静态) 男 / 女    :', M.staticSum.toFixed(0), '/', F.staticSum.toFixed(0),
  ' → 女比男多', ((F.staticSum / M.staticSum - 1) * 100).toFixed(1) + '%')
console.log('终身(3.2%调增) 男 / 女:', M.s32.toFixed(0), '/', F.s32.toFixed(0),
  ' → 女比男多', ((F.s32 / M.s32 - 1) * 100).toFixed(1) + '%')
console.log('计发月数覆盖率 男/女  :', (M.covered * 100).toFixed(1) + '% /', (F.covered * 100).toFixed(1) + '%')
console.log('统筹兜底金额 男 / 女  :', (M.pa * M.gap).toFixed(0), '/', (F.pa * F.gap).toFixed(0))

console.log('\n================ 与原视频口径对齐：都缴 15 年 / 20 年 ================')
for (const yrs of [15, 20]) {
  const sy = 2025 - yrs + 1, sm = 1
  const A = calc({ gender: 'male', genderType: 'male', birthYear: 1965, birthMonth: 9, workYear: sy, workMonth: sm, avgIndex: 1.0, cityType: 'cc', retireDateInput: { year: 2025, month: 12 } })
  const B = calc({ gender: 'female', genderType: 'fc', birthYear: 1970, birthMonth: 9, workYear: sy, workMonth: sm, avgIndex: 1.0, cityType: 'cc', retireDateInput: { year: 2025, month: 12 } })
  const a = A.total * LIFE.m60 * 12, b = B.total * LIFE.f55 * 12
  console.log(`缴 ${yrs} 年 → 男 ${A.total.toFixed(2)} 元/月 / 女 ${B.total.toFixed(2)} 元/月；` +
    `终身 男 ${a.toFixed(0)} / 女 ${b.toFixed(0)}，女比男多 ${((b / a - 1) * 100).toFixed(1)}%`)
}

console.log('\n================ 计发月数 139 的来历（校验）================')
const e0 = 75.21, r = 0.04, n = e0 - 60, i = r / 12, N = n * 12
console.log('五普 0 岁预期寿命     :', e0, '→ 75.21 − 60 =', n.toFixed(2), '年 =', N.toFixed(1), '个月')
console.log('按月折现近似推导      :', ((1 - Math.pow(1 + i, -N)) / i).toFixed(2),
  '（官方推导值 138.76 → 取整 139，差异来自计息时点假设）')
console.log('60 岁男真实余命       :', LIFE.m60, '年 =', (LIFE.m60 * 12).toFixed(1), '个月')
console.log('⇒ 139 只覆盖          :', (139 / (LIFE.m60 * 12) * 100).toFixed(1) + '%')
console.log('⇒ 50 岁女工人 195 覆盖:', (195 / (LIFE.f50 * 12) * 100).toFixed(1) + '%（余命 36.08 年 = 433 个月）')
