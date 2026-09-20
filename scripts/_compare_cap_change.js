/**
 * 双跑对照：2026-09-20 两项改造前后的差异
 *
 * 改造 1：D1 分母 31 省统一（陕西/西藏 current → prev）
 * 改造 2：D5 保底封顶限定自 2019-05-01 起生效（此前按实际比值）
 *
 * ⚠️ 做法说明（2026-09-20 踩坑）：**不能**用 `git show HEAD:` 取旧引擎来对比。
 *   HEAD 是「社平语义统一」之前的版本（prev 取 hist[year-1]），而现有数据已右移，
 *   旧代码 + 新数据 = 错位一年，会得出虚假的巨大偏差（四川 100% 档 1.1087）。
 *   正确做法：用**当前数据**内联复刻改造前的规则（只复刻分母与 clamp），
 *   与主引擎逐省逐档对比。
 */
'use strict'
const path = require('path')

const root = path.resolve(__dirname, '..')
const New = require(path.join(root, 'index-engine/calcIndex.js'))
const DATA = require(path.join(root, 'cloudfunctions/calculate/provinces-data.js')).PROVINCE_CONFIGS

const PROVS = Object.keys(New.PROVINCE_RULES).filter(k => DATA[k] && DATA[k].avg_salary_history)

// ── 改造前规则复刻 ──
const CURRENT_PROVS = ['shaanxi', 'xizang'] // 改造前用「当年统计年社平」的两个省

function oldDenom(code, hist, year) {
  const g = y => hist[y] || hist[String(y)]
  if (CURRENT_PROVS.includes(code)) return g(year + 1) || g(year)
  return g(year) || g(year + 1)
}

function oldCap(code, raw, year, accountStartYear) {
  const rule = New.PROVINCE_RULES[code]
  if (rule.cap === 'shanghai') {
    let floor = 0.6
    if (year >= 1993 && year <= 2011) floor = 1.0
    else if (year === 2012) floor = 0.85
    else if (year === 2013) floor = 0.75
    return Math.min(3.0, Math.max(floor, raw))
  }
  if (rule.cap === 'chongqing') {
    const max = (year >= 1993 && year <= 1997) ? 2.0 : 3.0
    return Math.min(max, Math.max(0.6, raw))
  }
  if (rule.cap === 'guangxi') {
    if (year < accountStartYear && raw < 1) return Math.min(3.0, Math.max(1.0, raw))
    return Math.min(3.0, Math.max(0.6, raw))
  }
  return Math.min(3.0, Math.max(0.6, raw))
}

function accountStartYear(code) {
  const s = New.PROVINCE_RULES[code].accountStart || '1996-01'
  return parseInt(String(s).split('-')[0], 10)
}

/** 复刻改造前的平均指数（不传视同年，逐年 12 个月） */
function oldAvgIndex(code, tier, years) {
  const hist = DATA[code].avg_salary_history
  const asy = accountStartYear(code)
  let sum = 0, w = 0
  for (const y of years) {
    const social = hist[y] || hist[String(y)]
    if (!social) continue
    const base = social * tier
    const d = oldDenom(code, hist, y)
    if (!d) continue
    const idx = oldCap(code, base / d, y, asy)
    sum += idx * 12
    w += 12
  }
  return w ? sum / w : null
}

function newAvgIndex(code, tier, years) {
  const hist = DATA[code].avg_salary_history
  const contrib = years.map(y => {
    const s = hist[y] || hist[String(y)]
    return s ? { year: y, months: 12, baseAvg: Math.round(s * tier * 100) / 100 } : null
  }).filter(Boolean)
  if (!contrib.length) return null
  const r = New.calculateIndex({
    provinceConfig: { name: DATA[code].name, avg_salary_history: hist },
    provinceCode: code, contribution: contrib, granularity: 'A'
  })
  return r && r.avgIndex != null ? r.avgIndex : null
}

const YEARS = []
for (let y = 2000; y <= 2025; y++) YEARS.push(y)
const tiers = [[0.6, '60%档'], [1.0, '100%档'], [3.0, '300%档']]

console.log('=== 改造前后平均指数对照（缴费 2000-2025，缴费工资 = 当年使用基数 × 档位）===\n')
console.log('省份        档位      旧指数    新指数     变化    幅度')
console.log('-'.repeat(62))

const changed = []
for (const code of PROVS) {
  for (const [tier, label] of tiers) {
    const o = oldAvgIndex(code, tier, YEARS)
    const n = newAvgIndex(code, tier, YEARS)
    if (o == null || n == null) continue
    const diff = n - o
    if (Math.abs(diff) < 1e-4) continue
    const pct = (n / o - 1) * 100
    console.log(
      String(DATA[code].name || code).padEnd(10) + '  ' + label.padEnd(8) +
      o.toFixed(4).padStart(7) + n.toFixed(4).padStart(10) +
      (diff > 0 ? '+' : '') + diff.toFixed(4).padStart(9) +
      (pct > 0 ? '+' : '') + pct.toFixed(2).padStart(7) + '%'
    )
    changed.push({ code, tier, diff, pct })
  }
}

console.log('\n=== 汇总 ===')
console.log('  受影响组合：' + changed.length + ' / ' + (PROVS.length * tiers.length))
for (const [tier, label] of tiers) {
  const arr = changed.filter(c => c.tier === tier)
  if (!arr.length) { console.log('  ' + label + '：无变化'); continue }
  const avg = arr.reduce((s, c) => s + c.diff, 0) / arr.length
  const names = arr.map(c => DATA[c.code].name || c.code).slice(0, 5).join('、')
  console.log('  ' + label + '：' + arr.length + ' 省受影响，平均变化 ' + (avg > 0 ? '+' : '') + avg.toFixed(4) + '（' + names + (arr.length > 5 ? ' 等' : '') + '）')
}

const nm = c => DATA[c].name || c

console.log('\n=== 陕西/西藏（改造 1 单独影响）===')
for (const code of ['shaanxi', 'xizang']) {
  for (const [tier, label] of tiers) {
    const o = oldAvgIndex(code, tier, YEARS)
    const n = newAvgIndex(code, tier, YEARS)
    if (o == null || n == null) continue
    console.log('  ' + nm(code) + ' ' + label + ': 旧 ' + o.toFixed(4) + ' → 新 ' + n.toFixed(4) + '（' + ((n / o - 1) * 100).toFixed(2) + '%）')
  }
}

// 改造 2 只在指数越界时显形：补测低于 60% 与高于 300% 的档位
console.log('\n=== 改造 2 单独影响：低档 40% / 超高档 500%（其余省份代表）===')
console.log('省份        档位      旧指数    新指数     变化    幅度')
console.log('-'.repeat(62))
for (const code of ['beijing', 'sichuan', 'shandong', 'henan', 'shaanxi']) {
  for (const [tier, label] of [[0.4, '40%档'], [5.0, '500%档']]) {
    const o = oldAvgIndex(code, tier, YEARS)
    const n = newAvgIndex(code, tier, YEARS)
    if (o == null || n == null) continue
    const pct = (n / o - 1) * 100
    console.log(
      nm(code).padEnd(10) + '  ' + label.padEnd(8) +
      o.toFixed(4).padStart(7) + n.toFixed(4).padStart(10) +
      (n - o > 0 ? '+' : '') + (n - o).toFixed(4).padStart(9) +
      (pct > 0 ? '+' : '') + pct.toFixed(2).padStart(7) + '%'
    )
  }
}
