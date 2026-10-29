#!/usr/bin/env node
/**
 * 个账记账比例对账 v2（2026-10-30）
 *
 * 目的：引擎个账按「缴费基数 × 8%」一刀切记账，但吉林省级明文是三段：
 *   ① 1995-07-01 ~ 1998-06-30  16%   吉政发〔1998〕22号《吉林省统一企业职工基本养老保险制度实施办法》四(一)3
 *   ② 1998-07-01 ~ 2003-12-31  11%   同上
 *   ③ 2004-01-01 起            8%    吉政发〔2004〕28号 二（国函〔2004〕35号试点，比全国 2006-01-01 早两年）
 *
 * ⚠️ 分界点精确到月：1998 年 1-6 月仍按 16%、7-12 月按 11%。
 *
 * 本脚本只读，不改任何引擎文件。
 * ⛔ 47,053.04 已由用户判定为「个人随手写的，不作任何依据」，本脚本不引用、不比对。
 */
const fs = require('fs')
const path = require('path')
const E = require('../calcIndex.js')

const SEGS = JSON.parse(fs.readFileSync(path.join(__dirname, 'jilin_real_segments.json'), 'utf-8'))
const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, '../../provinces/jilin.json'), 'utf-8'))
const contrib = SEGS.filter(s => !(s.year === 1994 && (s.base || 0) === 0))

const RATES = E.UNIFIED_RATES || {}
const rateOf = y => (RATES[y] != null ? RATES[y] : (y > 2025 ? RATES[2025] : 0.025))

/** 吉林个人账户记账比例（按月，省级明文三段） */
function jilinRate(y, m) {
  if (y < 1998 || (y === 1998 && m < 7)) return 0.16   // 1995-07 ~ 1998-06
  if (y < 2004) return 0.11                            // 1998-07 ~ 2003-12
  return 0.08                                          // 2004-01 起
}

/** 把一段（startMonth 起连续 months 个月）按月拆开，逐月取记账比例 */
function segmentPay(seg) {
  const sm = seg.startMonth || 1
  let sum = 0
  for (let i = 0; i < seg.months; i++) {
    const m = sm + i
    const y = seg.year + Math.floor((m - 1) / 12)
    const mm = ((m - 1) % 12) + 1
    sum += (seg.baseAvg || 0) * jilinRate(y, mm)
  }
  return sum
}

// ── 1. 引擎现状（一刀切 8%，走引擎自己算）──>
const eng = E.calculateIndex({
  provinceConfig: CFG, provinceCode: 'jilin', contribution: contrib, granularity: 'A'
})

// ── 2. 两种口径逐年记入额 ──>
const byYear = {}
for (const s of contrib) {
  byYear[s.year] = byYear[s.year] || { months: 0, base: 0, pay8: 0, payJl: 0 }
  const b = byYear[s.year]
  b.months += s.months
  b.base += (s.baseAvg || 0) * s.months
  b.pay8 += (s.baseAvg || 0) * s.months * 0.08
  b.payJl += segmentPay(s)
}
// 尾部补记（2023-12 之后）：无基数明细，按 8%
const TAIL = [
  { year: 2023, pay: 1168.0 },
  { year: 2024, pay: 18214.08 },
  { year: 2025, pay: 1193.28 }
]
for (const t of TAIL) {
  byYear[t.year] = byYear[t.year] || { months: 0, base: 0, pay8: 0, payJl: 0 }
  byYear[t.year].pay8 += t.pay
  byYear[t.year].payJl += t.pay
}

// ── 3. 滚存（与引擎一致：balance = balance*(1+r) + 当年记入额）──>
function roll(field) {
  let bal = 0
  const trace = []
  for (const y of Object.keys(byYear).map(Number).sort((a, b) => a - b)) {
    const r = rateOf(y)
    bal = bal * (1 + r) + byYear[y][field]
    trace.push({ year: y, pay: byYear[y][field], rate: r, bal })
  }
  return { bal, trace }
}
const r8 = roll('pay8')
const rJl = roll('payJl')

const pad = (s, n) => String(s).padStart(n)
const f = (x, n = 2) => Number(x).toFixed(n).padStart(11)

console.log('════ 吉林个人账户记账比例对账（真实轨迹 1995-07 ~ 2023-11）════')
console.log()
console.log('  ⛔ 47,053.04 不作任何依据（用户 2026-10-30 判定：疑似个人随手填写）')
console.log('  ⚠️ 171,463.29 是 xlsx「个人应缴金额」本金合计，不是账户储存额，不参与本次对账')
console.log()
console.log('── 一、逐年记账比例与记入额 ──')
console.log('  年     月数    缴费基数   吉林比例   吉林记入     8%记入        差')
let s8 = 0, sJl = 0, sBase = 0
for (const y of Object.keys(byYear).map(Number).sort((a, b) => a - b)) {
  const b = byYear[y]
  s8 += b.pay8; sJl += b.payJl; sBase += b.base
  const rr = y <= 1998 ? '16/11%' : (y < 2004 ? '11%' : '8%')
  console.log(`  ${y}  ${pad(b.months, 5)}  ${f(b.base)}   ${rr.padStart(7)}  ${f(b.payJl)}  ${f(b.pay8)}  ${f(b.payJl - b.pay8)}`)
}
console.log(`  ${'合计'.padEnd(6)}${' '.repeat(5)}  ${f(sBase)}  ${' '.repeat(7)}  ${f(sJl)}  ${f(s8)}  ${f(sJl - s8)}`)

console.log()
console.log('── 二、滚存到 2025 年（引擎同款利率表 UNIFIED_RATES）──')
console.log('  口径                          记入本金      滚存后余额')
console.log(`  引擎现口径（一刀切 8%）      ${f(s8)}  ${f(r8.bal)}`)
console.log(`  吉林省级明文（16/11/8%）     ${f(sJl)}  ${f(rJl.bal)}`)
console.log(`  差额                          ${f(sJl - s8)}  ${f(rJl.bal - r8.bal)}`)
console.log()
console.log(`  相对偏差 = ${((rJl.bal - r8.bal) / r8.bal * 100).toFixed(2)}%`)
console.log(`  引擎 calculateIndex 实跑值 = ${(eng.accountBalance || 0).toFixed(2)}（含尾部补记口径略有差异）`)

// 折算到月养老金（60 岁计发月数 139；此人 2023-11 已到 2025-01，用 139 作参照）
const PM = 139
console.log()
console.log('── 三、折算影响 ──')
console.log(`  按 60 岁计发月数 ${PM} 折算：`)
console.log(`    引擎现口径个账养老金 = ${(r8.bal / PM).toFixed(2)} 元/月`)
console.log(`    吉林明文口径个账养老金 = ${(rJl.bal / PM).toFixed(2)} 元/月`)
console.log(`    差 = ${((rJl.bal - r8.bal) / PM).toFixed(2)} 元/月`)
console.log()
console.log('── 四、结论 ──')
console.log('  · 引擎一刀切 8% 对吉林是【低估】，方向与先前判断相反')
console.log('  · 低估量级：本金 ' + (sJl - s8).toFixed(2) + ' 元，滚存后 ' + (rJl.bal - r8.bal).toFixed(2) + ' 元')
console.log('  · 根因：吉林 2004-01-01 就降到 8%（试点省），但 1995-07~1998-06 记 16%、1998-07~2003-12 记 11%')
console.log('  · 1998 年必须按月切开：1-6 月 16%、7-12 月 11%')
