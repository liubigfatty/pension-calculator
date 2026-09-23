/**
 * _verify_p0.js — P0 修复验证（四川延迟退休配置漏删）
 *
 * 验证四件事：
 *   1. 四川 config 里已无 delay_retirement
 *   2. 四川退休时间与其余 30 省完全一致
 *   3. 量化影响面：哪些出生年月的人退休时点发生了变化
 *   4. 31 省冒烟：确认没有省份因本次改动而报错
 */
const path = require('path')
const ROOT = path.resolve(__dirname, '..')
const engine = require(path.join(ROOT, 'cloudfunctions/calculate/pension-engine.js'))
const { getConfig } = require(path.join(ROOT, 'cloudfunctions/calculate/provinces-data.js'))

let pass = 0, fail = 0
const ok = (label, a, b) => {
  const same = String(a) === String(b)
  if (same) pass++; else { fail++; console.log(`  ❌ ${label}: 实际 ${a} / 期望 ${b}`) }
  return same
}

// 修复前那份配置（用于对照）
const BEFORE = {
  effective_date: '2026-01-01',
  male: { base_year: 1965, step: 4, cap_months: 36 },
  fc: { base_year: 1970, step: 4, cap_months: 36 },
  fw55: { base_year: 1975, step: 2, cap_months: 60 },
}

const retireOf = (cfg, birthYear, birthMonth, genderType) => {
  const r = engine.calculate(cfg, {
    gender: genderType === 'male' ? 'male' : 'female',
    genderType,
    birthYear, birthMonth,
    workYear: 2000, workMonth: 7,
    avgIndex: 1, cityType: null,
  }).legal
  const d = r.date || {}
  return (d.year || '?') + '-' + String(d.month || '?').padStart(2, '0')
}

console.log('【一、四川 config 已无 delay_retirement】')
const sc = getConfig('sichuan')
ok('  sichuan.delay_retirement', sc.delay_retirement === undefined ? 'undefined' : JSON.stringify(sc.delay_retirement), 'undefined')

console.log('\n【二、四川与其余省份完全一致（男职工，1965 年逐月）】')
const jl = getConfig('jilin'), ah = getConfig('anhui')
let sameAll = true
for (let m = 1; m <= 12; m++) {
  const a = retireOf(sc, 1965, m, 'male')
  const b = retireOf(jl, 1965, m, 'male')
  const c = retireOf(ah, 1965, m, 'male')
  if (a !== b || a !== c) { sameAll = false; console.log(`  ❌ 1965-${m}: 四川 ${a} / 吉林 ${b} / 安徽 ${c}`) }
}
ok('  四川 == 吉林 == 安徽（12 个月份）', sameAll ? 'true' : 'false', 'true')

console.log('\n【三、影响面量化：修复前后退休时点变化】')
const variants = [
  { name: 'male', type: 'male', years: [1963, 1964, 1965, 1966], from: 1965 },
  { name: 'fc  ', type: 'fc', years: [1968, 1969, 1970, 1971], from: 1970 },
  { name: 'fw55', type: 'fw55', years: [1973, 1974, 1975, 1976], from: 1975 },
]
let changed = 0, total = 0
for (const v of variants) {
  const cfgBefore = Object.assign({}, sc, { delay_retirement: BEFORE })
  const diffs = []
  for (const y of v.years) {
    for (let m = 1; m <= 12; m++) {
      total++
      const before = retireOf(cfgBefore, y, m, v.type)
      const after = retireOf(sc, y, m, v.type)
      if (before !== after) { changed++; diffs.push(`${y}-${String(m).padStart(2, '0')}: ${before} → ${after}`) }
    }
  }
  console.log(`  ${v.name}: 变化 ${diffs.length} 个`)
  diffs.slice(0, 6).forEach(d => console.log(`      ${d}`))
  if (diffs.length > 6) console.log(`      ...（共 ${diffs.length} 个）`)
}
console.log(`  ⇒ 合计 ${changed}/${total} 个出生年月受影响`)

console.log('\n【四、31 省冒烟（每省 1 个案例）】')
const PROVS = ['anhui','beijing','chongqing','fujian','gansu','guangdong','guangxi','guizhou','hainan','hebei',
  'heilongjiang','henan','hubei','hunan','jiangsu','jiangxi','jilin','liaoning','neimenggu','ningxia',
  'qinghai','shaanxi','shandong','shanghai','shanxi','sichuan','tianjin','xinjiang','xizang','yunnan','zhejiang']
let smokeFail = 0
for (const p of PROVS) {
  try {
    const cfg = getConfig(p)
    const r = engine.calculate(cfg, {
      gender: 'male', genderType: 'male',
      birthYear: 1965, birthMonth: 7,
      workYear: 1990, workMonth: 7,
      avgIndex: 1, cityType: null,
    }).legal
    if (!(r.total > 0)) { smokeFail++; console.log(`  ❌ ${p}: total=${r.total}`) }
  } catch (e) { smokeFail++; console.log(`  ❌ ${p}: ${e.message}`) }
}
ok('  31 省全部可算', smokeFail === 0 ? 'true' : `false(${smokeFail} 省失败)`, 'true')

console.log(`\n${fail === 0 ? '✅ 全部通过' : '❌ 有失败项'} — ${pass} 通过 / ${fail} 失败`)
