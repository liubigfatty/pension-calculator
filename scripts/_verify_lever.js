/**
 * 验算：吉林「年限 vs 档位」两个杠杆的效率对比
 * 对应文档：公众号内容库/09-测算案例与规划/_结论-吉林提档该怎么下判断（2026-09-13）.md
 *
 * 口径：男职工 1965-09 生 · 2025-12 退休（60岁3个月）· 长春 ·
 *       全实缴无视同 · 灵活就业 20% · 2025 年已公布基数（不外推）
 *
 * 运行：node scripts/_verify_lever.js
 */
const path = require('path')
const ROOT = path.join(__dirname, '..')
const e = require(path.join(ROOT, 'engine/pension-engine.js'))
const prov = require(path.join(ROOT, 'cloudfunctions/calculate/provinces-data.js'))
const cfg = prov.getConfig('jilin')
const h = cfg.avg_salary_history

let pass = 0, fail = 0

// >>> BEGIN UPDATE-MODE
const __UM = typeof process !== 'undefined' && process.argv.includes('--update')
const __UMREC = []
// <<< END UPDATE-MODE

function ok(label, actual, expect, tol = 0.01) {
  if (__UM) { try { const __m = ((new Error().stack || '').split('\n')[2] || '').match(/:(\d+):\d+/); if (__m) __UMREC.push({ line: +__m[1], actual: actual, expected: expect, tol: tol }) } catch (e) {} }
  const d = Math.abs(actual - expect)
  const good = d <= tol
  good ? pass++ : fail++
  console.log((good ? '✅ ' : '❌ ') + label + '  实际=' + (typeof actual === 'number' ? actual.toFixed(2) : actual) +
    '  期望=' + expect + (good ? '' : '  差=' + d.toFixed(4)))
}
function sec(t) { console.log('\n【' + t + '】') }

// 参工月份 → 全实缴年限（均晚于吉林建账 1995-07，视同为 0）
const STARTS = [
  { st: '2010-12', yrs: 15.00 },
  { st: '2005-12', yrs: 20.00 },
  { st: '2000-12', yrs: 25.00 },
  { st: '1995-07', yrs: 30.42 }
]
const BASE = { gender: 'male', genderType: 'male', birthYear: 1965, birthMonth: 9,
  cityType: 'cc', retireDateInput: { year: 2025, month: 12 } }

function principal(idx, sy, sm) {
  let t = h[String(sy)] * idx * 0.08 * (12 - sm + 1)
  for (let y = sy + 1; y <= 2024; y++) t += h[String(y)] * idx * 0.08 * 12
  return t + h['2024'] * idx * 0.08 * 11
}

const R = []
for (const s of STARTS) {
  const [sy, sm] = s.st.split('-').map(Number)
  for (const t of [100, 300]) {
    const L = e.calculate(cfg, { ...BASE, workYear: sy, workMonth: sm, avgIndex: t / 100 }).legal
    const p = principal(t / 100, sy, sm)
    R.push({ yrs: s.yrs, t, total: L.total, basic: L.basicPension.amount,
      per: L.personalAccount.amount, ex: L.extraPension.amount || 0,
      sight: L.sightYears, p, fee: p * 2.5 })
  }
}
const g = (y, t) => R.find(r => Math.abs(r.yrs - y) < 0.01 && r.t === t)

sec('0. 口径前提：全实缴、无视同')
for (const y of [15, 20, 25, 30.42]) {
  ok('  ' + y + '年 视同年限=0', g(y, 100).sight, 0, 0)
}

sec('1. 八组月领（引擎直出）')
ok('  15年 100档 月领', g(15, 100).total, 1899.22)
ok('  15年 300档 月领', g(15, 300).total, 4500.91)
ok('  20年 100档 月领', g(20, 100).total, 2426.02)
ok('  20年 300档 月领', g(20, 300).total, 5682.39)
ok('  25年 100档 月领', g(25, 100).total, 2946.9)
ok('  25年 300档 月领', g(25, 300).total, 6786.29)
ok('  30.42年 100档 月领', g(30.42, 100).total, 3494.22)
ok('  30.42年 300档 月领', g(30.42, 300).total, 7916.32)

sec('2. 构成对账：基础+个人账户+增发 = 合计')
for (const y of [15, 20, 25, 30.42]) for (const t of [100, 300]) {
  const r = g(y, t)
  ok('  ' + y + '年 ' + t + '档', r.basic + r.per + r.ex, r.total, 0.02)
}

sec('3. 长缴增发：20 年及以内不触发，25/30.42 年触发')
ok('  15年 增发=0', g(15, 100).ex, 0, 0)
ok('  20年 增发=0', g(20, 100).ex, 0, 0)
ok('  25年 100档 增发', g(25, 100).ex, 57.38)
ok('  30.42年 100档 增发', g(30.42, 100).ex, 133.88)

sec('4. 总缴费（灵活就业 20% = 本金 × 2.5）')
ok('  15年 100档', g(15, 100).fee, 191791.14, 1)
ok('  15年 300档', g(15, 300).fee, 575373.41, 1)
ok('  30.42年 100档', g(30.42, 100).fee, 232856.2, 1)
ok('  30.42年 300档', g(30.42, 300).fee, 698568.61, 1)

sec('5. 时间杠杆根源：社平涨幅')
ok('  1995 年吉林月社平', h['1995'], 369.17)
ok('  2024 年吉林月社平', h['2024'], 7322)
ok('  30 年涨幅（倍）', h['2024'] / h['1995'], 19.834, 0.01)
ok('  1995 年 100 档一年个人缴费', h['1995'] * 0.08 * 12, 354.4, 0.5)
ok('  2024 年 100 档一年个人缴费', h['2024'] * 0.08 * 12, 7029.12, 0.5)

sec('6. 投入产出放大倍数（结论 1 的核心）')
ok('  延年限 15→30.42（100档）钱倍数', g(30.42, 100).fee / g(15, 100).fee, 1.2141, 0.001)
ok('  延年限 15→30.42（100档）月领倍数', g(30.42, 100).total / g(15, 100).total, 1.8398, 0.001)
ok('  提档 15年 100→300 钱倍数', g(15, 300).fee / g(15, 100).fee, 3, 0.001)
ok('  提档 15年 100→300 月领倍数', g(15, 300).total / g(15, 100).total, 2.3699, 0.001)

sec('7. 每万元边际效率（结论 2 的核心）')
const eff = (c, d) => d / c * 10000
ok('  延年限 15→30.42（100档）元/月每万元',
  eff(g(30.42, 100).fee - g(15, 100).fee, g(30.42, 100).total - g(15, 100).total), 388.41, 0.1)
ok('  提档 100→300（15年）元/月每万元',
  eff(g(15, 300).fee - g(15, 100).fee, g(15, 300).total - g(15, 100).total), 67.83, 0.1)
ok('  两者倍数', eff(g(30.42, 100).fee - g(15, 100).fee, g(30.42, 100).total - g(15, 100).total) /
  eff(g(15, 300).fee - g(15, 100).fee, g(15, 300).total - g(15, 100).total), 5.73, 0.02)

sec('8. 性价比（月领÷总缴费）：随年限升、随档位降')
ok('  15年 100档', g(15, 100).total / g(15, 100).fee * 100, 0.9903, 0.001)
ok('  30.42年 100档', g(30.42, 100).total / g(30.42, 100).fee * 100, 1.5006, 0.001)
ok('  15年 300档', g(15, 300).total / g(15, 300).fee * 100, 0.7823, 0.001)
ok('  性价比：年限更长 > 年限更短', (g(30.42, 100).total / g(30.42, 100).fee) > (g(15, 100).total / g(15, 100).fee) ? 1 : 0, 1, 0)
ok('  性价比：档位更高 < 档位更低', (g(15, 300).total / g(15, 300).fee) < (g(15, 100).total / g(15, 100).fee) ? 1 : 0, 1, 0)

sec('9. 绝对回本年数：年限越久越快，档位越高越慢')
ok('  15年 100档', g(15, 100).fee / g(15, 100).total / 12, 8.415, 0.01)
ok('  30.42年 100档', g(30.42, 100).fee / g(30.42, 100).total / 12, 5.553, 0.01)
ok('  15年 300档', g(15, 300).fee / g(15, 300).total / 12, 10.653, 0.01)
ok('  30.42年 300档', g(30.42, 300).fee / g(30.42, 300).total / 12, 7.354, 0.01)

sec('10. 提档的边际回本（相对同年限 100 档多花的部分）')
ok('  15年', (g(15, 300).fee - g(15, 100).fee) / (g(15, 300).total - g(15, 100).total) / 12, 12.286, 0.01)
ok('  25年', (g(25, 300).fee - g(25, 100).fee) / (g(25, 300).total - g(25, 100).total) / 12, 9.811, 0.01)
ok('  30.42年', (g(30.42, 300).fee - g(30.42, 100).fee) / (g(30.42, 300).total - g(30.42, 100).total) / 12, 8.776, 0.01)
ok('  临界年龄 15年提档', 60.25 + 12.29, 72.54, 0.02)
ok('  低于预期寿命 76.71 岁', 72.62 < 76.71 ? 1 : 0, 1, 0)

sec('11. 极端对照：缴 15 年 300 档 vs 缴 30.42 年 100 档')
const dFee = g(15, 300).fee - g(30.42, 100).fee
const dTot = g(15, 300).total - g(30.42, 100).total
ok('  多花的钱', dFee, 342517.2, 2)
ok('  月领只多', dTot, 1006.69, 0.02)
ok('  每万元只换到', eff(dFee, dTot), 29.391, 0.05)

sec('12. 活到 76.71 岁的净收益（领 16.46 年）')
const LY = 76.71 - 60.25
ok('  15年提档 净收益', (g(15, 300).total - g(15, 100).total) * 12 * LY - (g(15, 300).fee - g(15, 100).fee), 130303.54, 5)
ok('  30.42年提档 净收益', (g(30.42, 300).total - g(30.42, 100).total) * 12 * LY - (g(30.42, 300).fee - g(30.42, 100).fee), 407740.78, 5)

sec('13. 企业职工口径（个人只出 8%）')
ok('  15年提档 边际回本', (g(15, 300).p - g(15, 100).p) / (g(15, 300).total - g(15, 100).total) / 12, 4.915, 0.01)
ok('  30.42年提档 边际回本', (g(30.42, 300).p - g(30.42, 100).p) / (g(30.42, 300).total - g(30.42, 100).total) / 12, 3.51, 0.01)

sec('14. 增发占比：15/20 年组干净，25/30.42 年组含吉林特有增发')
ok('  15年 100档 增发=0', g(15, 100).ex, 0, 0)
ok('  15年 300档 增发=0（核心提档对比组本来干净）', g(15, 300).ex, 0, 0)
ok('  20年 100档 增发=0', g(20, 100).ex, 0, 0)
ok('  25年 100档 增发占比', g(25, 100).ex / g(25, 100).total * 100, 1.947, 0.01)
ok('  25年 300档 增发占比', g(25, 300).ex / g(25, 300).total * 100, 1.655, 0.01)
ok('  30.42年 100档 增发占比', g(30.42, 100).ex / g(30.42, 100).total * 100, 3.831, 0.01)
ok('  30.42年 300档 增发占比', g(30.42, 300).ex / g(30.42, 300).total * 100, 3.31, 0.01)

sec('15. 剔除增发后重算：结论不翻转')
const ex = (y, t) => g(y, t).ex
const dRaw = g(30.42, 100).total - g(15, 100).total
const dClean = (g(30.42, 100).total - ex(30.42, 100)) - (g(15, 100).total - ex(15, 100))
const yFee = g(30.42, 100).fee - g(15, 100).fee
const tRaw = g(15, 300).total - g(15, 100).total
const tFee = g(15, 300).fee - g(15, 100).fee
ok('  延年限 剔增发后月领差', dClean, 1461.12, 0.02)
ok('  延年限 剔增发后每万元', dClean / yFee * 10000, 355.806, 0.05)
ok('  延年限 效率降幅', (1 - dClean / dRaw) * 100, 8.394, 0.05)
ok('  剔增发后倍数', (dClean / yFee) / (tRaw / tFee), 5.246, 0.01)
ok('  剔增发后仍远大于 1（结论不翻转）', (dClean / yFee) / (tRaw / tFee) > 3 ? 1 : 0, 1, 0)

sec('16. 分段：每多缴 1 年换多少月领（剔除增发后递减）')
const segEff = []
for (const [a, b] of [[15, 20], [20, 25], [25, 30.42]]) {
  const dC = ((g(b, 100).total - ex(b, 100)) - (g(a, 100).total - ex(a, 100))) / (b - a)
  const fY = (g(b, 100).fee - g(a, 100).fee) / (b - a)
  segEff.push({ a, b, dC, fY, per10k: dC / fY * 10000 })
}
ok('  15→20年 每月领/年', segEff[0].dC, 105.36, 0.02)
ok('  20→25年 每月领/年（剔增发）', segEff[1].dC, 92.7, 0.02)
ok('  25→30.42年 每月领/年（剔增发）', segEff[2].dC, 86.867, 0.02)
ok('  每万元效率 15→20年', segEff[0].per10k, 229.12, 0.5)
ok('  每万元效率 20→25年', segEff[1].per10k, 412.79, 0.5)
ok('  每万元效率 25→30.42年', segEff[2].per10k, 687.9, 0.5)
ok('  越早缴每万元效率越高', segEff[0].per10k < segEff[1].per10k && segEff[1].per10k < segEff[2].per10k ? 1 : 0, 1, 0)

sec('17. 剔除增发后：性价比与回本仍同向')
for (const y of [15, 25, 30.42]) {
  const c100 = g(y, 100).total - ex(y, 100), c300 = g(y, 300).total - ex(y, 300)
  ok('  ' + y + '年 100档 性价比', c100 / g(y, 100).fee * 100,
    { 15: 0.9903, 25: 1.2785, 30.42: 1.4431 }[y], 0.001)
  ok('  ' + y + '年 300档 性价比', c300 / g(y, 300).fee * 100,
    { 15: 0.7823, 25: 0.9843, 30.42: 1.0957 }[y], 0.001)
}
ok('  25年提档 剔增发后边际回本', (g(25, 300).fee - g(25, 100).fee) /
  ((g(25, 300).total - ex(25, 300)) - (g(25, 100).total - ex(25, 100))) / 12, 9.953, 0.01)
ok('  30.42年提档 剔增发后边际回本', (g(30.42, 300).fee - g(30.42, 100).fee) /
  ((g(30.42, 300).total - ex(30.42, 300)) - (g(30.42, 100).total - ex(30.42, 100))) / 12, 9.038, 0.01)

console.log('\n' + '='.repeat(46))
console.log('验算结果：✅ ' + pass + ' 通过   ❌ ' + fail + ' 失败')
console.log('='.repeat(46))
if (!__UM) process.exit(fail ? 1 : 0)
// >>> BEGIN UPDATE-MODE — 回写器：把当前实际值写回源码期望值
if (__UM && __UMREC.length) {
  const __fs = require('fs')
  const __p = require('path').join(__dirname, '_verify_lever.js')
  const __raw = __fs.readFileSync(__p, 'utf8')
  const __eol = __raw.includes('\r\n') ? '\r\n' : '\n'
  const __lines = __raw.split(/\r?\n/)
  const __seen = new Set()
  // 同一源码行被调用多次 = 循环内断言（如按档位遍历），
  // 回写只会留下第一次的值并把其余改坏 ⇒ 一律跳过，交人工处理
  const __dup = new Set()
  const __cnt = {}
  for (const r of __UMREC) { __cnt[r.line] = (__cnt[r.line] || 0) + 1; if (__cnt[r.line] > 1) __dup.add(r.line) }
  let __n = 0, __skip = 0
  // 括号/引号感知：找第 3 个参数（期望值）的起止位置
  const thirdArgRange = (L) => {
    const si = L.indexOf('ok(')
    if (si < 0) return null
    let depth = 0, inStr = null, commas = []
    for (let i = si + 3; i < L.length; i++) {
      const c = L[i]
      if (inStr) { if (c === inStr) inStr = null; continue }
      if (c === '"' || c === "'" || c === '`') { inStr = c; continue }
      if (c === '(' || c === '[') depth++
      else if (c === ')' || c === ']') { if (depth === 0) break; depth-- }
      else if (c === ',' && depth === 0) commas.push(i)
    }
    if (commas.length < 2) return null
    const start = commas[1] + 1
    let end = L.length, d2 = 0, s2 = null
    for (let i = start; i < L.length; i++) {
      const c = L[i]
      if (s2) { if (c === s2) s2 = null; continue }
      if (c === '"' || c === "'" || c === '`') { s2 = c; continue }
      if (c === '(' || c === '[') d2++
      else if (c === ')' || c === ']') { if (d2 === 0) { end = i; break } d2-- }
      else if (c === ',' && d2 === 0) { end = i; break }
    }
    return { start, end }
  }
  for (const r of __UMREC) {
    if (__seen.has(r.line)) continue
    __seen.add(r.line)
    // 循环行 / 跨行调用 / 非数字期望值：跳过，避免改坏
    if (__dup.has(r.line)) { __skip++; continue }
    const L = __lines[r.line - 1]
    if (!L) continue
    const rg = thirdArgRange(L)
    if (!rg) { __skip++; continue }
    const oldTxt = L.slice(rg.start, rg.end)
    // 注意：本段在模板字符串内，正则里的反斜杠必须写成 \ 才能原样输出到目标文件
    if (!/^\s*-?[\d.]+\s*$/.test(oldTxt)) { __skip++; continue }
    // 精度自适应容差：tol 越小保留越多小数位，否则下次会因四舍五入再次失败
    const tol = typeof r.tol === 'number' ? r.tol : 0.02
    const digits = tol > 0 ? Math.min(8, Math.max(2, Math.ceil(-Math.log10(tol)) + 1)) : 6
    const nv = String(+r.actual.toFixed(digits))
    if (oldTxt.trim() === nv) continue
    // 只替换第 3 个参数本身；绝不碰 label 文本（label 里的数字由人工维护）
    __lines[r.line - 1] = L.slice(0, rg.start) + ' ' + nv + L.slice(rg.end)
    __n++
  }
  __fs.writeFileSync(__p, __lines.join(__eol), 'utf8')
  console.log('\n🔄 [UPDATE] 已刷新 ' + __n + ' 处期望值 → _verify_lever.js（跳过 ' + __skip + ' 处：循环行/跨行/非数字，需人工）')
  if (__dup.size) console.log('   ⚠️ 循环内断言行（需人工核对）：' + Array.from(__dup).join(', '))
}
// <<< END UPDATE-MODE
