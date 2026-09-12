/**
 * _verify_delay.js — 延迟退休修复综合验证（2026-09-12）
 *
 * 覆盖四块：
 *   一、政策附表节点：国办发〔2025〕5号附件对照表关键节点逐条核对
 *   二、独立实现交叉：引擎 vs scripts/cohort.js（按政策原文独立实现）
 *   三、影响面量化：本次修复（阶梯公式 + 日期进位）改变了多少人的结果
 *   四、31 省冒烟
 */
const path = require('path')
const ROOT = path.resolve(__dirname, '..')
const engine = require(path.join(ROOT, 'cloudfunctions/calculate/pension-engine.js'))
const { getConfig } = require(path.join(ROOT, 'cloudfunctions/calculate/provinces-data.js'))
const { delayPolicy } = require('./cohort.js')

const cfg = getConfig('jilin')   // 无 delay_retirement，走引擎默认参数
let pass = 0, fail = 0
const ok = (label, got, want) => {
  if (String(got) === String(want)) { pass++ }
  else { fail++; console.log(`  ❌ ${label}\n     实际 ${got} / 期望 ${want}`) }
}

const week = (gt, by, bm) => {
  const r = engine.calculate(cfg, {
    gender: gt === 'male' ? 'male' : 'female', genderType: gt,
    birthYear: by, birthMonth: bm,
    workYear: 2000, workMonth: 7, avgIndex: 1, cityType: null,
  }).legal
  const d = r.date
  return {
    date: d,
    ageMonths: (d.year - by) * 12 + (d.month - bm),
    ageStr: r.ageStr,
  }
}

// ---------- 一、政策附表节点 ----------
console.log('【一、国办发〔2025〕5号附表节点核对】')
const POLICY = [
  ['male', 1964, 12, 60 * 12, '男 1964-12 → 不延迟（2024 年退休）'],
  ['male', 1965, 1, 60 * 12 + 1, '男 1965-01 → 60岁1个月'],
  ['male', 1965, 4, 60 * 12 + 1, '男 1965-04 → 60岁1个月'],
  ['male', 1965, 5, 60 * 12 + 2, '男 1965-05 → 60岁2个月'],
  ['male', 1965, 8, 60 * 12 + 2, '男 1965-08 → 60岁2个月'],
  ['male', 1965, 9, 60 * 12 + 3, '男 1965-09 → 60岁3个月'],
  ['male', 1965, 12, 60 * 12 + 3, '男 1965-12 → 60岁3个月'],
  ['male', 1966, 1, 60 * 12 + 4, '男 1966-01 → 60岁4个月'],
  ['male', 1976, 8, 62 * 12 + 11, '男 1976-08 → 62岁11个月'],
  ['male', 1976, 9, 63 * 12, '男 1976-09 → 63岁（封顶）'],
  ['male', 1980, 1, 63 * 12, '男 1980-01 → 63岁（封顶）'],
  ['fc', 1970, 1, 55 * 12 + 1, '女干部 1970-01 → 55岁1个月'],
  ['fc', 1970, 5, 55 * 12 + 2, '女干部 1970-05 → 55岁2个月'],
  ['fc', 1981, 9, 58 * 12, '女干部 1981-09 → 58岁（封顶）'],
  ['fw55', 1970, 1, 55 * 12 + 1, '灵活就业女 1970-01 → 55岁1个月'],
  ['fw55', 1981, 9, 58 * 12, '灵活就业女 1981-09 → 58岁（封顶）'],
]
for (const [gt, by, bm, want, desc] of POLICY) {
  const w = week(gt, by, bm)
  ok(`  ${desc}（引擎 ${w.date.year}-${String(w.date.month).padStart(2, '0')} / ${w.ageStr}）`, w.ageMonths, want)
}

// ---------- 二、与 cohort.js 独立实现交叉 ----------
console.log('\n【二、引擎 vs cohort.js（独立按政策原文实现）交叉核对】')
const CROSS = [
  { gt: 'male', baseAge: 60, key: 'male' },
  { gt: 'fc', baseAge: 55, key: 'fc' },
  { gt: 'fw55', baseAge: 55, key: 'fc' },   // 参数与女干部相同
]
let crossMismatch = 0, crossTotal = 0
for (const c of CROSS) {
  for (let by = 1960; by <= 1995; by++) {
    for (let bm = 1; bm <= 12; bm++) {
      crossTotal++
      const w = week(c.gt, by, bm)
      const wantDelay = delayPolicy(c.key, by, bm)
      const gotDelay = w.ageMonths - c.baseAge * 12
      if (gotDelay !== wantDelay) {
        crossMismatch++
        if (crossMismatch <= 5) console.log(`  ❌ ${c.gt} ${by}-${bm}: 引擎 ${gotDelay} / cohort ${wantDelay}`)
      }
    }
  }
}
ok(`  ${crossTotal} 个出生年月全部一致`, crossMismatch, 0)

// ---------- 三、影响面量化 ----------
console.log('\n【三、影响面：本次修复改变了多少结果】')
// 旧逻辑（修复前）
const oldDelay = (by, bm, baseYear, step, cap) => {
  const diff = (by - baseYear) * 12 + (bm - 1)
  if (by < baseYear) return 0
  if (diff <= 0) return 0
  return Math.min(Math.floor((diff - 1) / step) + 1, cap)
}
const oldDate = (by, bm, totalMonths) => {
  const year = by + Math.floor(totalMonths / 12)
  const month = bm + (totalMonths % 12)
  return { year, month: month > 12 ? month - 12 : month }
}
const GROUPS = [
  { gt: 'male', baseAge: 60, baseYear: 1965, step: 4, cap: 36 },
  { gt: 'fc', baseAge: 55, baseYear: 1970, step: 4, cap: 36 },
  // fw55「修复前」用的是错误参数 1975/2/60（原 50 岁女工人的），用于量化本次修复的影响
  { gt: 'fw55', baseAge: 55, baseYear: 1975, step: 2, cap: 60 },
]
for (const g of GROUPS) {
  let diffCount = 0, total = 0
  const samples = []
  for (let by = 1960; by <= 1995; by++) {
    for (let bm = 1; bm <= 12; bm++) {
      total++
      const od = oldDate(by, bm, g.baseAge * 12 + oldDelay(by, bm, g.baseYear, g.step, g.cap))
      const w = week(g.gt, by, bm)
      if (od.year !== w.date.year || od.month !== w.date.month) {
        diffCount++
        if (samples.length < 3) samples.push(`${by}-${String(bm).padStart(2, '0')}: ${od.year}-${String(od.month).padStart(2, '0')} → ${w.date.year}-${String(w.date.month).padStart(2, '0')}`)
      }
    }
  }
  console.log(`  ${g.gt.padEnd(6)}: ${diffCount}/${total} 个出生年月结果变化 (${(diffCount / total * 100).toFixed(1)}%)`)
  samples.forEach(s => console.log(`      ${s}`))
}

// ---------- 四、31 省冒烟 ----------
console.log('\n【四、31 省冒烟】')
const PROVS = ['anhui','beijing','chongqing','fujian','gansu','guangdong','guangxi','guizhou','hainan','hebei',
  'heilongjiang','henan','hubei','hunan','jiangsu','jiangxi','jilin','liaoning','neimenggu','ningxia',
  'qinghai','shaanxi','shandong','shanghai','shanxi','sichuan','tianjin','xinjiang','xizang','yunnan','zhejiang']
let smokeFail = 0
for (const p of PROVS) {
  try {
    const c = getConfig(p)
    const r = engine.calculate(c, {
      gender: 'male', genderType: 'male', birthYear: 1968, birthMonth: 5,
      workYear: 1990, workMonth: 7, avgIndex: 1, cityType: null,
    }).legal
    if (!(r.total > 0) || !r.date || !r.date.year) { smokeFail++; console.log(`  ❌ ${p}: ${JSON.stringify(r.date)} total=${r.total}`) }
  } catch (e) { smokeFail++; console.log(`  ❌ ${p}: ${e.message}`) }
}
ok('  31 省全部可算且日期有效', smokeFail, 0)

console.log(`\n${fail === 0 ? '✅ 全部通过' : '❌ 有失败项'} — ${pass} 通过 / ${fail} 失败`)
