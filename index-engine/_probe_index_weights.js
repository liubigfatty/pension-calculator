/**
 * _probe_index_weights.js — 指数权重算子探针（只读，不改引擎）
 *
 * 用途：对 31 省跑同一组标准缴费序列，输出平均缴费指数 avgIndex，
 *       用于「改造前 vs 改造后」的差值量化。
 *
 * 用法： node index-engine/_probe_index_weights.js [--save=basename]
 *
 * 三个用例：
 *   U1 满缴      2000-2020 每年 12 个月，baseAvg = 该年分母社平 × 1.0  → 指数恒 1
 *   U2 短年      同 U1，但 2010 年只缴 1 个月且按 300% 档            → 看是否被稀释
 *   U3 短年+断缴 U2 基础上，2015 年整年未缴（不传记录）
 *
 * ⚠️ 只读脚本：不修改引擎、不写省份配置。
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const { calculateIndex, UNIFIED_RATES } = require(path.join(__dirname, 'calcIndex.js'))

const arg = process.argv.slice(2).find(a => a.startsWith('--save='))
const SAVE_AS = arg ? arg.split('=')[1] : null

function loadCfg(code) {
  const p = path.join(ROOT, 'provinces', code + '.json')
  if (!fs.existsSync(p)) return null
  return JSON.parse(fs.readFileSync(p, 'utf-8'))
}

/** 取该省实际使用的社平表（广东等按城市分组，需落到一个具体城市） */
function pickHist(cfg) {
  const raw = cfg.avg_salary_history || {}
  if (typeof raw['2000'] === 'number') return raw
  const cityKey = Object.keys(raw).find(k => raw[k] && typeof raw[k] !== 'number')
  return cityKey ? raw[cityKey] : raw
}

/** denom='prev' 省：year 年的分母 = salaryHist[year] */
function denomOf(cfg, year) {
  const h = pickHist(cfg)
  return h[year] || h[year + 1] || null
}

function buildContrib(cfg, { shortYear, gapYear }) {
  const rows = []
  for (let y = 2000; y <= 2020; y++) {
    const d = denomOf(cfg, y)
    if (!d || d <= 0) continue
    if (gapYear && y === gapYear) continue          // 断缴：完全不传
    const months = (shortYear && y === shortYear) ? 1 : 12
    const baseAvg = (shortYear && y === shortYear) ? d * 3.0 : d * 1.0
    rows.push({ year: y, months, baseAvg })
  }
  return rows
}

function run(cfg, code, contrib) {
  try {
    const r = calculateIndex({
      provinceConfig: cfg,
      provinceCode: code,
      contribution: contrib,
      granularity: 'A'
    })
    if (r.error) return { error: r.error }
    return {
      avgIndex: r.avgIndex,
      totalYears: r.totalYears
    }
  } catch (e) {
    return { error: e.message }
  }
}

const CODES = fs.readdirSync(path.join(ROOT, 'provinces'))
  .filter(f => f.endsWith('.json'))
  .map(f => f.replace('.json', ''))

const out = {}
console.log('省码'.padEnd(14), 'U1基准'.padStart(9), 'U2短年300'.padStart(10), 'U3+断缴'.padStart(10))
console.log('-'.repeat(48))

for (const code of CODES) {
  const cfg = loadCfg(code)
  if (!cfg) continue
  const u1 = run(cfg, code, buildContrib(cfg, {}))
  const u2 = run(cfg, code, buildContrib(cfg, { shortYear: 2010 }))
  const u3 = run(cfg, code, buildContrib(cfg, { shortYear: 2010, gapYear: 2015 }))
  out[code] = { U1: u1, U2: u2, U3: u3 }
  const f = (o) => (o && o.avgIndex != null) ? o.avgIndex.toFixed(4) : (o && o.error ? 'ERR' : '-')
  console.log(
    code.padEnd(14),
    f(u1).padStart(9),
    f(u2).padStart(10),
    f(u3).padStart(10)
  )
}

if (SAVE_AS) {
  const p = path.join(__dirname, '_probe_' + SAVE_AS + '.json')
  fs.writeFileSync(p, JSON.stringify({ generatedAt: new Date().toISOString(), data: out }, null, 2), 'utf-8')
  console.log('\n已保存 → ' + p)
}
