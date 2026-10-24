// 读者案例（1978-09生／长春／灵活就业）档位全扫描 + 「年限 vs 档位」边际对比
// 要回答的问题：是不是只要是灵活就业，就只有 60 档最合理？
// 关键：区分「每万元产出（效率）」与「月领绝对额（总量）」，并引入「真实成本＝统筹 12%」口径
const path = require('path')
const { calculate, getAccRate, getBase } = require(path.resolve('./engine/pension-engine.js'))
const m = require(path.resolve('./cloudfunctions/calculate/provinces/jilin.js'))
const config = m.getEngineConfig ? m.getEngineConfig() : m
const R2 = x => Math.round(x * 100) / 100
const R0 = x => Math.round(x)

const BASE = { province: 'jilin', cityType: 'cc', name: 'reader', birthYear: 1978, birthMonth: 9, workYear: 2007, workMonth: 4, avgIndex: 0.6 }
const STOP = { year: 2026, month: 9 }
const YEARS_AT_STOP = ((STOP.year - 2007) * 12 + (STOP.month - 4) + 1) / 12   // 19.5

function salaryOf(y) { const b = getBase('prov', y, config); return (b && typeof b === 'object') ? (b.value != null ? b.value : b.base) : b }
function prem(y, gear) { return salaryOf(y) * (gear / 100) * 0.2 * 12 }        // 灵活就业 20% 全自付
function accIn(y, gear) { return salaryOf(y) * (gear / 100) * 0.08 * 12 }      // 8% 进个人账户
function roll(bal, y0, y1) { let b = bal; for (let y = y0 + 1; y <= y1; y++) b *= (1 + getAccRate(y, config)); return b }

const CASES = [
  { g: 'female', gt: 'fc', label: '女（1978-09 生／长春灵活就业）', subStart: 2027 },
  { g: 'male', gt: 'male', label: '男（1978-09 生／长春灵活就业）', subStart: 2029 },
]

for (const C of CASES) {
  const inp = { ...BASE, gender: C.g, genderType: C.gt, personalAcc: 0 }
  const rCont = calculate(config, inp)
  const L = rCont.legal
  const retireY = L.date.year
  const fullYears = L.totalYears

  const rStopNow = calculate(config, { ...inp, retireDateInput: STOP })
  const B0 = rStopNow.legal.personalAccount.balance
  const B0atRetire = roll(B0, STOP.year, retireY)
  const rStop = calculate(config, { ...inp, personalAcc: B0atRetire, totalYears: YEARS_AT_STOP, actualYears: YEARS_AT_STOP })
  const P_STOP = rStop.legal.total

  // 场景：从 fromY 年起按 plan 缴到 toY（含），前 subYears 个缴费年享补贴
  function scenario(plan, subYears) {
    let acc = B0atRetire, cost = 0, sub = 0, accPaid = 0
    let wSum = YEARS_AT_STOP * 0.6
    let n = 0
    for (const seg of plan) {
      for (let y = seg.from; y <= seg.to; y++) {
        if (y > retireY) break
        acc += accIn(y, seg.gear) * roll(1, y, retireY)
        cost += prem(y, seg.gear)
        accPaid += accIn(y, seg.gear)
        wSum += seg.gear / 100
        n++
        const yIdx = y - plan[0].from
        if (yIdx < subYears) sub += Math.min(prem(y, seg.gear) * 0.5, prem(y, 100) * 0.5)
      }
    }
    const avgIdx = wSum / fullYears
    const r = calculate(config, { ...inp, avgIndex: avgIdx, personalAcc: acc, totalYears: fullYears, actualYears: fullYears })
    const P = r.legal.total
    const net = cost - sub
    const gain = P - P_STOP
    return { cost, sub, net, accPaid, P, gain, per10k: gain / net * 10000, back: net / gain,
             per10kPool: gain / (net * 0.6) * 10000,   // 真实成本口径：只算进统筹的 12%
             accPension: r.legal.personalAccount.monthly != null ? r.legal.personalAccount.monthly : r.legal.personalAccount.pension }
  }

  const yrs = []
  for (let y = STOP.year + 1; y <= retireY; y++) yrs.push(y)
  const first = yrs[0], last = yrs[yrs.length - 1]

  // 校准：把「60档全程·无补贴」锚到引擎原生月领
  const S0 = scenario([{ from: first, to: last, gear: 60 }], 0)
  const CAL = L.total - S0.P

  console.log('\n████████████ ' + C.label + ' ████████████')
  console.log(`  法定退休 ${L.date.year}-${String(L.date.month).padStart(2, '0')}（${L.ageStr}）｜已缴 ${R2(YEARS_AT_STOP)} 年，还能缴 ${yrs.length} 年`)
  console.log(`  现在彻底停 → ${R2(P_STOP)} 元/月（年限锁死 ${R2(YEARS_AT_STOP)} 年）`)
  console.log(`  （校准 ${R2(CAL)} 元/月，锚定引擎原生 ${R2(L.total)}）`)

  const GEARS = [60, 70, 80, 100, 150, 200, 300]
  const rows = []
  for (const g of GEARS) {
    const noSub = scenario([{ from: first, to: last, gear: g }], 0)
    const withSub = scenario([{ from: first, to: last, gear: g }], 3)
    for (const s of [noSub, withSub]) { s.P += CAL; s.gain += CAL; s.per10k = s.gain / s.net * 10000; s.back = s.net / s.gain; s.per10kPool = s.gain / (s.net * 0.6) * 10000 }
    rows.push({ g, noSub, withSub })
  }

  console.log('\n  ── 档位全扫描（全程固定档位缴到退休，补贴 3 年）──')
  console.log('  ' + '档位'.padEnd(6) + '首年保费'.padStart(9) + '3年补贴'.padStart(9) + '净自付'.padStart(10) + '月领'.padStart(9) + '较停缴+'.padStart(9) + '每万元(全)'.padStart(11) + '每万元(统筹)'.padStart(12) + '回本年'.padStart(8))
  for (const r of rows) {
    const s = r.withSub
    console.log('  ' + (r.g + '档').padEnd(6) + R0(prem(first, r.g)).toLocaleString().padStart(9)
      + R0(s.sub).toLocaleString().padStart(10) + R0(s.net).toLocaleString().padStart(10)
      + R2(s.P).toLocaleString().padStart(9) + R2(s.gain).toLocaleString().padStart(9)
      + R2(s.per10k).toLocaleString().padStart(11) + R2(s.per10kPool).toLocaleString().padStart(12)
      + R2(s.back / 12).toLocaleString().padStart(8))
  }

  console.log('\n  ── 同一档位：拿不拿补贴的差别（每万元产出）──')
  console.log('  ' + '档位'.padEnd(6) + '无补贴'.padStart(10) + '有补贴3年'.padStart(11) + '倍数'.padStart(8))
  for (const r of rows) {
    console.log('  ' + (r.g + '档').padEnd(6) + R2(r.noSub.per10k).toLocaleString().padStart(10) + R2(r.withSub.per10k).toLocaleString().padStart(11) + R2(r.withSub.per10k / r.noSub.per10k).toLocaleString().padStart(8))
  }

  // ── 边际：每多掏一万，分别在「补贴期提档」和「补贴期外提档」上
  const A = rows.find(r => r.g === 60).withSub
  const B = rows.find(r => r.g === 100).withSub
  const mix = scenario([{ from: first, to: first + 2, gear: 100 }, { from: first + 3, to: last, gear: 60 }], 3)
  mix.P += CAL; mix.gain += CAL; mix.per10k = mix.gain / mix.net * 10000; mix.back = mix.net / mix.gain
  console.log('\n  ── 提档的边际账（相对 60 档+补贴）──')
  const d1 = { net: mix.net - A.net, gain: mix.P - A.P }
  const d2 = { net: B.net - mix.net, gain: B.P - mix.P }
  console.log(`  补贴那 3 年提到 100 档：多掏 ${R0(d1.net).toLocaleString()} → 月领多 ${R2(d1.gain)} ⇒ 每万元 ${R2(d1.gain / d1.net * 10000)} 元/月，回本 ${R2(d1.net / d1.gain / 12)} 年`)
  console.log(`  补贴结束后仍维持 100 档：多掏 ${R0(d2.net).toLocaleString()} → 月领多 ${R2(d2.gain)} ⇒ 每万元 ${R2(d2.gain / d2.net * 10000)} 元/月，回本 ${R2(d2.net / d2.gain / 12)} 年`)

  // ── 年限 vs 档位：同样一笔钱，多缴一年 vs 提档
  console.log('\n  ── 年限 vs 档位（同样一笔钱，先保哪个）──')
  const lastYearPrem60 = prem(last, 60)
  // 多缴最后一年（60档）
  const noLast = scenario([{ from: first, to: last - 1, gear: 60 }], 3)
  noLast.P += CAL; noLast.gain += CAL
  const dLast = { net: A.net - noLast.net, gain: A.P - noLast.P }
  // 多缴第一年（60档）：从 first+1 起缴
  const noFirst = scenario([{ from: first + 1, to: last, gear: 60 }], 3)
  noFirst.P += CAL; noFirst.gain += CAL
  const dFirst = { net: A.net - noFirst.net, gain: A.P - noFirst.P }
  console.log(`  多缴「最早那一年」(${first})：多掏 ${R0(dFirst.net).toLocaleString()} → 月领多 ${R2(dFirst.gain)} ⇒ 每万元 ${R2(dFirst.gain / dFirst.net * 10000)} 元/月`)
  console.log(`  多缴「最后那一年」(${last})：多掏 ${R0(dLast.net).toLocaleString()} → 月领多 ${R2(dLast.gain)} ⇒ 每万元 ${R2(dLast.gain / dLast.net * 10000)} 元/月`)
  console.log(`  ⇒ 年限 vs 档位比值：${R2((dLast.gain / dLast.net) / (d2.gain / d2.net))}（>1 表示同样一笔钱，加年限优于提档）`)
  console.log(`  【对照】60档+补贴 全程每万元 ${R2(A.per10k)}；混合方案 ${R2(mix.per10k)}；纯100档 ${R2(B.per10k)}`)
}

console.log('\n===== 口径 =====')
console.log('· 保费 = 全省社平 × 档位 × 20% × 12（吉林已并轨，缴费基数用全省口径）')
console.log('· 「每万元(全)」= 每万元实际自付（扣补贴后）换回的月领增量；「每万元(统筹)」= 只把进统筹的 12% 当成本（个人账户 8% 是自己的钱，可继承）')
console.log('· 4050 补贴 = 实缴养老保险费 50%，上限＝当年 100% 档次的 1/2 ⇒ ≥100 档后补贴不再增加')
console.log('· 历史 19.5 年固定 0.6 指数；未来按年限加权算平均缴费指数；未来年社平/计发基数为引擎外推值')
