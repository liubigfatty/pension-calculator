// 读者案例（1978-09生／长春／灵活就业）档位决策：60 档 vs 100 档，配 4050 补贴
// 问题：补贴按实缴 50%、上限=100%档次1/2 ⇒ 缴 100 档正好吃满封顶。"用足补贴"值不值？
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
  { g: 'female', gt: 'fc', label: '女（灵活就业 55 档）', subStart: 2027 },
  { g: 'male', gt: 'male', label: '男（60 档）', subStart: 2029 },
]

for (const C of CASES) {
  const inp = { ...BASE, gender: C.g, genderType: C.gt, personalAcc: 0 }
  const rCont = calculate(config, inp)
  const L = rCont.legal
  const retireY = L.date.year
  const fullYears = L.totalYears
  const futureYears = fullYears - YEARS_AT_STOP

  // 停缴时点余额 → 滚到退休
  const rStopNow = calculate(config, { ...inp, retireDateInput: STOP })
  const B0 = rStopNow.legal.personalAccount.balance
  const B0atRetire = roll(B0, STOP.year, retireY)
  // 彻底停缴的月领（年限锁在 19.5）
  const rStop = calculate(config, { ...inp, personalAcc: B0atRetire, totalYears: YEARS_AT_STOP, actualYears: YEARS_AT_STOP })
  const P_STOP = rStop.legal.total

  console.log('\n████████████ ' + C.label + ' ████████████')
  console.log(`  法定退休 ${L.date.year}-${String(L.date.month).padStart(2, '0')}（${L.ageStr}）｜已满 ${R2(YEARS_AT_STOP)} 年，还能缴 ${R2(futureYears)} 年`)
  console.log(`  现在彻底停 → ${R2(P_STOP)} 元/月`)

  // 场景：未来每年按给定档位缴（plan = [{from,to,gear}]），前 subYears 年享受补贴
  function scenario(name, plan, subYears) {
    let acc = B0atRetire, cost = 0, sub = 0
    let wSum = YEARS_AT_STOP * 0.6            // 指数加权分子（历史 19.5 年按 0.6）
    for (const seg of plan) {
      for (let y = seg.from; y <= seg.to; y++) {
        if (y > retireY) break
        acc += accIn(y, seg.gear) * roll(1, y, retireY)
        cost += prem(y, seg.gear)
        wSum += seg.gear / 100
        const yIdx = y - plan[0].from
        if (yIdx < subYears) sub += Math.min(prem(y, seg.gear) * 0.5, prem(y, 100) * 0.5)
      }
    }
    const avgIdx = wSum / fullYears
    const r = calculate(config, { ...inp, avgIndex: avgIdx, personalAcc: acc, totalYears: fullYears, actualYears: fullYears })
    const P = r.legal.total
    const net = cost - sub
    const gain = P - P_STOP
    return { name, cost, sub, net, P, gain, per10k: gain / net * 10000, back: net / gain }
  }

  const yrs = []
  for (let y = STOP.year + 1; y <= retireY; y++) yrs.push(y)
  const last = yrs[yrs.length - 1]
  const S = []
  S.push(scenario('60档·无补贴', [{ from: yrs[0], to: last, gear: 60 }], 0))
  S.push(scenario('60档+补贴3年', [{ from: yrs[0], to: last, gear: 60 }], 3))
  S.push(scenario('100档·无补贴', [{ from: yrs[0], to: last, gear: 100 }], 0))
  S.push(scenario('100档+补贴3年', [{ from: yrs[0], to: last, gear: 100 }], 3))
  S.push(scenario('混合:前3年100档(补贴)+之后60档', [{ from: yrs[0], to: yrs[2], gear: 100 }, { from: yrs[3], to: last, gear: 60 }], 3))

  // 校准：把「60档·无补贴」锚定到引擎原生月领 L.total（手工按年滚存 vs 引擎按月滚存有小幅差）
  const CAL = L.total - S[0].P
  for (const s of S) { s.P += CAL; s.gain += CAL; s.per10k = s.gain / s.net * 10000; s.back = s.net / s.gain }
  console.log(`  （校准量 ${R2(CAL)} 元/月：手工按年滚存 → 锚定到引擎原生 ${R2(L.total)}）`)

  console.log('\n  ' + '场景'.padEnd(34) + '自付(净)'.padStart(10) + '其中补贴'.padStart(10) + '月领'.padStart(10) + '较停缴+'.padStart(10) + '每万元'.padStart(9) + '回本(年)'.padStart(9))
  for (const s of S) {
    console.log('  ' + s.name.padEnd(30) + R0(s.net).toLocaleString().padStart(11) + R0(s.sub).toLocaleString().padStart(11) + R2(s.P).toLocaleString().padStart(11) + R2(s.gain).toLocaleString().padStart(11) + R2(s.per10k).toLocaleString().padStart(10) + R2(s.back / 12).toLocaleString().padStart(10))
  }

  // ── 关键对比：提档的增量账
  const A = S[1], B = S[4], C2 = S[3]
  function delta(x, y, tag) {
    const dNet = y.net - x.net, dP = y.P - x.P
    console.log(`\n  【${tag}】多掏 ${R0(dNet).toLocaleString()} 元（政府多补 ${R0(y.sub - x.sub).toLocaleString()}），月领多 ${R2(dP)}`)
    console.log(`     ⇒ 每万元产出 ${R2(dP / dNet * 10000)} 元/月，回本 ${R2(dNet / dP / 12)} 年`)
  }
  delta(A, B, '只在补贴那3年提到100档，之后回落60档')
  delta(B, C2, '补贴期结束后继续维持100档（即"补贴外用"的部分）')
  delta(A, C2, '全程都提到100档')
  console.log(`\n  【参照】60档拿到补贴后继续缴：每万元产出 ${R2(A.per10k)} 元/月，回本 ${R2(A.back / 12)} 年`)
  console.log(`  【参照】混合方案整体：每万元产出 ${R2(B.per10k)} 元/月，回本 ${R2(B.back / 12)} 年`)
  console.log(`  【补贴绝对额】3年补贴：60档 ${R0(A.sub).toLocaleString()} 元 vs 100档 ${R0(C2.sub).toLocaleString()} 元 ⇒ 政府多给 ${R0(C2.sub - A.sub).toLocaleString()} 元`)
  console.log(`  【年自付】补贴那3年：60档 ${R0(A.sub / 3).toLocaleString()} 元/年 vs 100档 ${R0(C2.sub / 3).toLocaleString()} 元/年 ⇒ 自己多掏 ${R0((C2.sub - A.sub) / 3).toLocaleString()} 元/年`)
}

console.log('\n===== 口径 =====')
console.log('· 保费 = 全省社平 × 档位 × 20% × 12（吉林已并轨）；个人账户按 8% 计入，按职工记账利率滚存')
console.log('· 4050 补贴 = 实缴养老保险费的 50%，上限＝当年 100% 档次的 1/2 ⇒ 100 档正好吃满封顶；期限 3 年')
console.log('· 历史 19.5 年固定按 0.6 指数，未来档位变化后按年限加权算平均缴费指数')
console.log('· 未来年社平/计发基数为引擎外推值（吉林社平数组止于 2026）')
