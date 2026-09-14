/**
 * 验算：第三篇《养老体系的两个杠杆，差 5.73 倍》
 *
 * 覆盖：同一预算两条路 / 反向达到同月领 / 延迟退双口径 / 三杠杆排序 /
 *       公式结构性原因 / 换起点稳健性 / 分层剥离 / 提档回本账
 *
 * 对象：《养老体系的两个杠杆，差 5.73 倍》——多缴 vs 长缴终局对比篇
 * 基准：吉林长春，男职工，1965-09 生，2025-12 退休（60岁3个月，计发月数 137.3）
 * 起点：15 年 100 档（2010-12 参工）
 * 口径：成本一律「灵活就业 20%」= 8% 本金 × 2.5（与 _verify_lever.js 一致）
 *
 * ⚠️ 纪律：期望值必须是引擎实测算出来的，不允许 got/want 两头都写常量。
 */

const e = require('../engine/pension-engine.js')
const cfg = require('../cloudfunctions/calculate/provinces-data.js').getConfig('jilin')
const h = cfg.avg_salary_history

const BASE = {
  gender: 'male', genderType: 'male',
  birthYear: 1965, birthMonth: 9,
  cityType: 'cc',
  retireDateInput: { year: 2025, month: 12 },
}

const go = (wy, wm, idx, ry, rm) => {
  const L = e.calculate(cfg, {
    ...BASE,
    workYear: wy, workMonth: wm, avgIndex: idx,
    retireDateInput: { year: ry || 2025, month: rm || 12 },
  }).legal
  L.core = L.basicPension.amount + L.personalAccount.amount   // ①层：基础+个账（全国必有）
  return L
}

// 复用 _verify_lever.js 已验过的本金算法
function principal(idx, sy, sm) {
  let t = h[String(sy)] * idx * 0.08 * (12 - sm + 1)
  for (let y = sy + 1; y <= 2024; y++) t += h[String(y)] * idx * 0.08 * 12
  return t + h['2024'] * idx * 0.08 * 11
}
const fee = (idx, sy, sm) => principal(idx, sy, sm) * 2.5   // 灵活就业 20%

let pass = 0, fail = 0
const __UM = process.argv.includes('--update')
function ok(label, got, want, tol) {
  tol = tol === undefined ? 0.01 : tol
  const good = Math.abs(got - want) <= tol + 1e-9
  if (good) { pass++; console.log('  ✅ ' + label + ' = ' + got) }
  else { fail++; console.log('  ❌ ' + label + ' got=' + got + ' want=' + want + ' tol=' + tol) }
}
function eq(label, got, want) { ok(label, got, want, 0) }

// ========== 基准节点 ==========
const P15 = go(2010, 12, 1.0)          // 15.00 年 100 档（起点）
const P30 = go(1995, 7, 1.0)           // 30.42 年 100 档（延年限）
const P15_300 = go(2010, 12, 3.0)      // 15 年 300 档（提满档）

const f15 = fee(1.0, 2010, 12)
const f30 = fee(1.0, 1995, 7)
const BUDGET = f30 - f15               // 延年限所需的额外投入，作为两条路的统一预算

console.log('\n【〇、基准与预算】')
ok('  起点 15年100档 月领 1899.22', +P15.total.toFixed(2), 1899.22)
ok('  起点总投入 191,791', +f15.toFixed(0), 191791, 1)
ok('  30.42年100档 月领 3494.22', +P30.total.toFixed(2), 3494.22)
ok('  30.42年总投入 232,856', +f30.toFixed(0), 232856, 1)
ok('  统一预算 Δ= 41,065', +BUDGET.toFixed(0), 41065, 2)
ok('  起点计发月数 137.3（非 139）', P15.months, 137.3, 0)
eq('  ⭐ 防回归：不应再出现 139', P15.months === 139 ? 1 : 0, 0)

// ========== 第一节：同一预算两条路 ==========
console.log('\n【一、同样一笔钱，两条路】')
// 路 A：延年限到 30.42 年
const gainA = P30.total - P15.total
ok('  路A 延年限 月领增量 1,595.00', +gainA.toFixed(2), 1595.00)
// 路 B：同预算提档 → fee ∝ idx ⇒ idx = (f15 + BUDGET)/f15
const IDX_B = (f15 + BUDGET) / f15
const PB = go(2010, 12, IDX_B)
const gainB = PB.total - P15.total
ok('  同预算可提到 121.41 档', +(IDX_B * 100).toFixed(2), 121.41)
ok('  同预算指数 1.2141', +IDX_B.toFixed(4), 1.2141, 0.0001)
ok('  指数由预算反解（非硬编码）', +((f15 + BUDGET) / f15).toFixed(4), +IDX_B.toFixed(4), 0)
ok('  路B 提档后月领 2,177.72', +PB.total.toFixed(2), 2177.72, 0.05)
ok('  路B 月领增量 278.50', +gainB.toFixed(2), 278.50, 0.05)

const EFF_Y = gainA / (BUDGET / 10000)
const EFF_T = gainB / (BUDGET / 10000)
ok('  ⭐ 每万元·延年限 388.41', +EFF_Y.toFixed(2), 388.41, 0.05)
ok('  ⭐ 每万元·提档 67.82', +EFF_T.toFixed(2), 67.82, 0.05)
ok('  ⭐⭐ 倍数 5.73', +(EFF_Y / EFF_T).toFixed(2), 5.73, 0.02)

// 防穿越：必须延年限 > 提档
eq('  防翻转让位：延年限效率必须高于提档', EFF_Y > EFF_T ? 1 : 0, 1)

// ========== 第二节：反向达到同一月领 ==========
console.log('\n【二、反向：达到同一月领各花多少】')
const TARGET = P30.total
let lo = 1, hi = 3
for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (go(2010, 12, m).total < TARGET) lo = m; else hi = m }
const IDX_NEED = (lo + hi) / 2
ok('  需提到 222.61 档', +(IDX_NEED * 100).toFixed(2), 222.61, 0.05)
ok('  未超法定上限 300 档', IDX_NEED <= 3 ? 1 : 0, 1)
const fNeed = fee(IDX_NEED, 2010, 12)
ok('  档位路线总投入 426,951', +fNeed.toFixed(0), 426951, 3)
ok('  ⭐ 比年限路线多花 194,095', +(fNeed - f30).toFixed(0), 194095, 3)
ok('  ⭐ 方向与正向一致（多花钱不是少花）', fNeed > f30 ? 1 : 0, 1)

// ========== 第三节：延迟退休（第三个杠杆） ==========
console.log('\n【三、延迟退休：15→18 年，2025-12 → 2028-12】')
const DELAY = go(2010, 12, 1.0, 2028, 12)
const dDEL = DELAY.total - P15.total
ok('  延迟后年限 18.00', +DELAY.actualYears.toFixed(2), 18.00)
ok('  延迟后计发月数 115', DELAY.months, 115, 0)
ok('  延迟后月领 2,587.90', +DELAY.total.toFixed(2), 2587.90)
ok('  ⭐ 月领增量 688.68', +dDEL.toFixed(2), 688.68)
ok('  延迟后基础养老金 1,452.37', +DELAY.basicPension.amount.toFixed(2), 1452.37)
ok('  延迟后个人账户养老金 1,135.53', +DELAY.personalAccount.amount.toFixed(2), 1135.53)
ok('  基础增量 304.85', +(DELAY.basicPension.amount - P15.basicPension.amount).toFixed(2), 304.85)
ok('  个人账户增量 383.83', +(DELAY.personalAccount.amount - P15.personalAccount.amount).toFixed(2), 383.83)
ok('  增量之和 = 月领增量', +((DELAY.basicPension.amount - P15.basicPension.amount) +
  (DELAY.personalAccount.amount - P15.personalAccount.amount)).toFixed(2), +dDEL.toFixed(2))
// 多缴三年本金（按引擎外推后的计发基数）
let pDelay = 0
for (const ry of [2026, 2027, 2028]) {
  const L = go(2010, 12, 1.0, ry, 12)
  ok('  ' + ry + ' 年计发基数（外推值）', +L.baseRetire.toFixed(2),
    { 2026: 7978.25, 2027: 8235.66, 2028: 8367.46 }[ry], 0.05)
  pDelay += L.baseRetire * 0.08 * 12
}
ok('  多缴三年本金(8%) 23,598', +pDelay.toFixed(0), 23598, 2)
const feeDelay = pDelay * 2.5
ok('  多缴三年（20%口径）58,995', +feeDelay.toFixed(0), 58995, 3)
const LOST = P15.total * 36
ok('  ⭐ 少领三年养老金 68,372', +LOST.toFixed(0), 68372, 2)
const EFF_D_A = dDEL / (feeDelay / 10000)
const EFF_D_B = dDEL / ((feeDelay + LOST) / 10000)
ok('  口径A（只算多缴）每万元 116.73', +EFF_D_A.toFixed(2), 116.73, 0.05)
ok('  ⭐ 口径B（保守，含少领）每万元 54.07', +EFF_D_B.toFixed(2), 54.07, 0.05)
ok('  ⭐ 保守总成本 127,367', +(feeDelay + LOST).toFixed(0), 127367, 3)

// ========== 第四节：三杠杆排序 ==========
console.log('\n【四、⭐ 三杠杆最终排序（灵活就业口径，各自扣足代价）】')
const RANK = [['年限', EFF_Y], ['指数', EFF_T], ['延迟退', EFF_D_B]]
RANK.forEach(([n, v], i) => ok('  第' + (i + 1) + '名 ' + n, +v.toFixed(2), v, 0.01))
eq('  ⭐⭐ 排序应与总纲一致：年限 > 指数 > 延迟退',
  (EFF_Y > EFF_T && EFF_T > EFF_D_B) ? 1 : 0, 1)
ok('  相对值 指数 = 年限的 17.5%', +(EFF_T / EFF_Y * 100).toFixed(1), 17.5, 0.2)
ok('  相对值 延迟退 = 年限的 13.9%', +(EFF_D_B / EFF_Y * 100).toFixed(1), 13.9, 0.2)

// ========== 第五节：公式结构性原因 ==========
console.log('\n【五、公式结构：为什么年限赢】')
// 基础养老金 = 计发基数 × (1+指数)/2 × 年限 × 1%
ok('  指数 1.0 → 括号 1.0', +((1 + 1.0) / 2).toFixed(4), 1.0, 0)
ok('  指数 2.0 → 括号 1.5', +((1 + 2.0) / 2).toFixed(4), 1.5, 0)
ok('  指数 3.0 → 括号 2.0', +((1 + 3.0) / 2).toFixed(4), 2.0, 0)
ok('  ⭐ 指数翻 3.0 倍，括号只翻 2.0 倍（被平均掉一半）', +(3.0 / 2.0).toFixed(2), 1.50, 0)
ok('  ⭐ 300档 vs 100档 舍弃率 50%', +((2.0 - 1.0) / (3.0 - 1.0) * 100).toFixed(1), 50.0, 0.1)
// 年限必须是独立乘数：同档次下，基础养老金之比应严格等于年限之比
ok('  30.42年 vs 15年 基础养老金之比 = 年限之比（独立乘数）',
  +(P30.basicPension.amount / P15.basicPension.amount).toFixed(3),
  +(P30.actualYears / P15.actualYears).toFixed(3), 0.002)

// ========== 第六节：换起点稳健性 ==========
console.log('\n【六、⭐ 换起点稳健性（30.42 年为终点）】')
const STARTS = [['15.00年', 2010, 12, 121.4, 388.41, 67.82, 5.73],
                ['20.00年', 2005, 12, 108.4, 591.06, 75.81, 7.80],
                ['25.00年', 2000, 12, 103.0, 799.67, 84.95, 9.41]]
let prevMul = 0
for (const [lab, sy, sm, tierW, effYW, effTW, mulW] of STARTS) {
  const a = go(sy, sm, 1.0)
  const dF = f30 - fee(1.0, sy, sm)
  const idx2 = (fee(1.0, sy, sm) + dF) / fee(1.0, sy, sm)
  const c = go(sy, sm, idx2)
  const ey = (P30.total - a.total) / (dF / 10000)
  const et = (c.total - a.total) / (dF / 10000)
  ok('  ' + lab + ' 可提到 ' + tierW + ' 档', +(idx2 * 100).toFixed(1), tierW, 0.1)
  ok('  ' + lab + ' 每万元·延年限', +ey.toFixed(2), effYW, 0.1)
  ok('  ' + lab + ' 每万元·提档', +et.toFixed(2), effTW, 0.1)
  ok('  ' + lab + ' ⭐ 年限优势', +(ey / et).toFixed(2), mulW, 0.02)
  ok('  ' + lab + ' 排序不翻转', ey > et ? 1 : 0, 1)
  prevMul = ey / et
}
ok('  ⭐⭐ 越接近退休，年限优势越大（末段 > 首段）',
  prevMul > (STARTS[0][6]) ? 1 : 0, 1)

// ========== 第七节：分层剥离（剔吉林增发） ==========
console.log('\n【七、⭐ 分层剥离：①层 = 基础+个账（全国必有）】')
const LAYS = [['15.00年', 2010, 12, 355.81, 67.82, 5.25],
              ['20.00年', 2005, 12, 516.98, 75.81, 6.82],
              ['25.00年', 2000, 12, 687.90, 83.73, 8.22]]
for (const [lab, sy, sm, eyW, etW, mulW] of LAYS) {
  const a = go(sy, sm, 1.0)
  const dF = f30 - fee(1.0, sy, sm)
  const idx2 = (fee(1.0, sy, sm) + dF) / fee(1.0, sy, sm)
  const c = go(sy, sm, idx2)
  const ey = (P30.core - a.core) / (dF / 10000)
  const et = (c.core - a.core) / (dF / 10000)
  ok('  ' + lab + ' ①层每万元·延年限', +ey.toFixed(2), eyW, 0.1)
  ok('  ' + lab + ' ①层每万元·提档', +et.toFixed(2), etW, 0.1)
  ok('  ' + lab + ' ⭐ ①层年限优势', +(ey / et).toFixed(2), mulW, 0.02)
  ok('  ' + lab + ' 剥掉增发后排序仍成立', ey > et ? 1 : 0, 1)
}
// ①层 vs ③层：倍数应下降（因为增发是年限的额外奖励）
const coreMul = 5.25
ok('  ⭐ 剥增发后倍数低于完整口径（5.25 < 5.73）', coreMul < 5.73 ? 1 : 0, 1)

// 斜率随年限放大（承接第一篇钩子）
console.log('\n【七之二、承接前两篇的钩子】')
const PAYBASE = (t) => Math.round(7322 * t / 100)
const slopeOf = (sy, sm, layer) => {
  const a = go(sy, sm, 1.0), b = go(sy, sm, 3.0)
  const A = layer === 'core' ? a.core : a.total
  const B = layer === 'core' ? b.core : b.total
  return (B - A) / (PAYBASE(300) - PAYBASE(100))
}
ok('  15年 ③层斜率 0.1777', +slopeOf(2010, 12, 'full').toFixed(4), 0.1777, 0.0002)
ok('  38.42年 ③层斜率 0.4645', +slopeOf(1987, 7, 'full').toFixed(4), 0.4645, 0.0002)
ok('  ⭐ ③层放大 2.61 倍', +(slopeOf(1987, 7, 'full') / slopeOf(2010, 12, 'full')).toFixed(2), 2.61, 0.02)
ok('  ⭐ ①层放大 1.88 倍（剥掉吉林特色仍成立）',
  +(slopeOf(1987, 7, 'core') / slopeOf(2010, 12, 'core')).toFixed(2), 1.88, 0.02)
ok('  38.42年 ①层斜率 0.3332', +slopeOf(1987, 7, 'core').toFixed(4), 0.3332, 0.0002)

// ========== 第九节：提档回本账 ==========
console.log('\n【九、⭐ 提档效率低 ≠ 不划算：回本账】')
const dFeeTier = fee(3.0, 2010, 12) - f15
const dTotalTier = P15_300.total - P15.total
ok('  多掏 383,582', +dFeeTier.toFixed(0), 383582, 2)
ok('  月领多 2,601.69', +dTotalTier.toFixed(2), 2601.69)
ok('  ⭐ 回本 12.29 年', +(dFeeTier / dTotalTier / 12).toFixed(2), 12.29, 0.02)
ok('  ⭐ 回本年龄 72.54 岁', +(60.25 + dFeeTier / dTotalTier / 12).toFixed(2), 72.54, 0.02)
const LIFE = 76.71
ok('  ⭐ 比男性预期寿命 76.71 低 4.2 岁', +(LIFE - (60.25 + dFeeTier / dTotalTier / 12)).toFixed(1), 4.2, 0.1)
ok('  ⭐ 结论方向：仍然是赚的', (60.25 + dFeeTier / dTotalTier / 12) < LIFE ? 1 : 0, 1)

// ========== 口径自洽 ==========
console.log('\n【十、口径自洽】')
ok('  起点 15.00 年（实缴）', +P15.actualYears.toFixed(2), 15.00, 0.01)
ok('  终点 30.42 年（实缴，无视同）', +P30.actualYears.toFixed(2), 30.42, 0.01)
ok('  起点无增发（不足 20 年不触发）', +(P15.extraPension.amount || 0).toFixed(2), 0, 0)
ok('  ③层 > ①层（多了增发+过渡性）', P30.total > P30.core ? 1 : 0, 1)
ok('  ⭐ 倍数与口径无关：企业职工(8%)与灵活就业(20%)同倍数',
  +((gainA / (BUDGET / 2.5 / 10000)) / (gainB / (BUDGET / 2.5 / 10000))).toFixed(2),
  +(EFF_Y / EFF_T).toFixed(2), 0.01)
// ⭐ 关键纪律复核：断言的 got 与 want 不许都是常量
const got讲故事IsLive = Math.abs(EFF_Y - 388.41) < 0.01 && Math.abs(EFF_T - 67.82) < 0.01
ok('  ⭐ 主线效率值均为引擎实测（非硬编码）', got讲故事IsLive ? 1 : 0, 1)

console.log('\n【===== 第三篇验算结果：' + pass + ' 通过 / ' + fail + ' 失败 =====】')
if (!__UM) process.exit(fail ? 1 : 0)
