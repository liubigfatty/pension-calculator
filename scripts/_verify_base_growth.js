/**
 * 2026-09-14 两项引擎修复 · 专项验算
 *
 * 修复 1：未来计发基数不再写死，一律按「该省上一年已公布增幅」复合外推
 *         （吉林 2027-2035 / 四川 2026-2035 / 黑龙江 2027 的写死值已删除）
 * 修复 2：getMinYears 默认表修正（2029 前 15 年、2030 起每年 +0.5、2039 起 20 年）
 *
 * 用法：node scripts/_verify_base_growth.js
 */
const engine = require('../engine/pension-engine.js')
const prov = require('../cloudfunctions/calculate/provinces-data.js')

let pass = 0, fail = 0
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('✅ ' + name + (extra ? '  ' + extra : '')) }
  else { fail++; console.log('❌ ' + name + (extra ? '  ' + extra : '')) }
}
const near = (a, b, tol = 0.51) => Math.abs(a - b) <= tol

const NAMES = ['beijing', 'tianjin', 'hebei', 'shanxi', 'neimenggu', 'liaoning', 'jilin', 'heilongjiang',
  'shanghai', 'jiangsu', 'zhejiang', 'anhui', 'fujian', 'jiangxi', 'shandong', 'henan', 'hubei', 'hunan',
  'guangdong', 'guangxi', 'hainan', 'chongqing', 'sichuan', 'guizhou', 'yunnan', 'xizang', 'shaanxi',
  'gansu', 'qinghai', 'ningxia', 'xinjiang']

const CUR_PUBLISHED = 2025 // 已完整公布计发基数的年份（2026 仅个别省有官方值/预发值）

console.log('\n===== 1. 未来年份写死值已清除 =====')
const FUTURE_CLEAN = { jilin: 2035, sichuan: 2035, heilongjiang: 2027 }
for (const [p, maxYear] of Object.entries(FUTURE_CLEAN)) {
  const c = prov.getConfig(p)
  const b = c.PROV_BASE || (c.base_rates && c.base_rates.prov) || {}
  const ks = Object.keys(b).map(Number).sort((a, b) => a - b)
  const future = ks.filter(y => y > CUR_PUBLISHED + 1)
  ok(`${p} 无 ${CUR_PUBLISHED + 2}+ 写死值`, future.length === 0,
    `（最大年份 ${ks[ks.length - 1]}，修复前到 ${maxYear}）`)
}
// 云南：计发基数表本身合规（2026-2030 的预测值在人均养老金表里，已一并删除）
{
  const c = prov.getConfig('yunnan')
  const b = c.PROV_BASE || (c.base_rates && c.base_rates.prov) || {}
  const ks = Object.keys(b).map(Number).sort((a, b) => a - b)
  ok('yunnan 计发基数表最大年份 ≤ 2026', ks[ks.length - 1] <= 2026, `（实际 ${ks[ks.length - 1]}）`)
  const pensionTbl = (c.modules && c.modules.special_addition && c.modules.special_addition.avgPensionData) || {}
  const futurePension = Object.keys(pensionTbl).map(Number).filter(y => y > 2025)
  ok('yunnan 人均养老金表无 2026+ 预测值', futurePension.length === 0,
    `（剩余年份 ${Object.keys(pensionTbl).join(',')}）`)
}

console.log('\n===== 2. 外推率 = 该省上一年已公布增幅（31 省） =====')
const growthRows = []
for (const n of NAMES) {
  const c = prov.getConfig(n)
  const b = c.PROV_BASE || (c.base_rates && c.base_rates.prov) || {}
  const ks = Object.keys(b).map(Number).filter(y => y >= 2000).sort((a, b) => a - b)
  // 复刻引擎逻辑：跳过尾部预发年
  const k2 = ks.slice()
  while (k2.length > 2 && b[k2[k2.length - 1]] === b[k2[k2.length - 2]]) k2.pop()
  const last = k2[k2.length - 1], prev = k2[k2.length - 2]
  const raw = last && prev ? b[last] / b[prev] - 1 : null
  const expect = raw == null ? 0.02 : Math.max(0, Math.min(raw, 0.03))
  // 用引擎实测：lastYear+2 年应等于 last * (1+g)^2
  const lastYear = ks[ks.length - 1]
  const base = b[lastYear]
  const actual = engine.getBase('prov', lastYear + 2, c)
  const implied = Math.pow(actual / base, 1 / 2) - 1
  growthRows.push({ n, lastYear, base, raw, expect, actual, implied })
}
let allOk = true
for (const r of growthRows) {
  const good = near(r.implied, r.expect, 0.0006)
  if (!good) { allOk = false; console.log(`   ⚠️  ${r.n}: 期望 ${(r.expect * 100).toFixed(2)}% 实测 ${(r.implied * 100).toFixed(2)}%`) }
}
ok('31 省外推率均等于各自「上一年已公布增幅」（夹 0~3%）', allOk)
console.log('   参考：' + growthRows.filter(r => ['jilin', 'sichuan', 'heilongjiang', 'henan', 'guizhou', 'xinjiang'].includes(r.n))
  .map(r => `${r.n} ${(r.expect * 100).toFixed(2)}%`).join(' / '))

console.log('\n===== 3. 预发年规则仍生效（lastYear+1 用上年原值，不上浮） =====')
for (const n of ['jilin', 'sichuan', 'heilongjiang', 'beijing']) {
  const c = prov.getConfig(n)
  const b = c.PROV_BASE || (c.base_rates && c.base_rates.prov) || {}
  const ks = Object.keys(b).map(Number).sort((a, b) => a - b)
  const lastYear = ks[ks.length - 1]
  const v0 = engine.getBase('prov', lastYear, c)
  const v1 = engine.getBase('prov', lastYear + 1, c)
  ok(`${n} ${lastYear + 1} 年 = ${lastYear} 年原值`, v0 === v1, `（${v1}）`)
}

console.log('\n===== 4. 吉林远期退休基数变化（本次修复的实质影响） =====')
{
  const c = prov.getConfig('jilin')
  const provOld = { 2027: 7977.54, 2028: 8326.96, 2030: 9072.37, 2035: 10314.73 }
  for (const [y, old] of Object.entries(provOld)) {
    const now = engine.getBase('prov', Number(y), c)
    const d = now - old
    console.log(`   ${y} 年：修复前(写死) ${old} → 修复后(2.00% 复合) ${now}   ${d >= 0 ? '+' : ''}${d.toFixed(2)}（${(d / old * 100).toFixed(1)}%）`)
  }
  const now28 = engine.getBase('prov', 2028, c)
  ok('吉林 2028 基数已低于原写死值（口径转为保守估算）', now28 < 8326.96, `（${now28} < 8326.96）`)
  ok('吉林 2028 基数仍高于 2025 已公布值（外推方向合理）', now28 > 7322, `（${now28} > 7322）`)
}

console.log('\n===== 5. 最低缴费年限政策表（31 省） =====')
const MIN_TABLE = [[2024, 15], [2025, 15], [2029, 15], [2030, 15.5], [2031, 16], [2035, 18], [2038, 19.5], [2039, 20], [2045, 20]]
for (const [y, expect] of MIN_TABLE) {
  let bad = []
  for (const n of NAMES) {
    const c = prov.getConfig(n)
    // 通过引擎外部暴露的入口间接验证：minYears 未直接导出，用 calculate 的 legal 结果
    const r = engine.calculate(c, {
      gender: 'male', genderType: 'male', birthYear: y - 60, birthMonth: 6,
      workYear: y - 15, workMonth: 7, cityType: 'prov', avgIndex: 1,
      retireDateInput: { year: y, month: 12 },
    })
    const got = r.legal && r.legal.minYears
    if (got !== expect) bad.push(`${n}=${got}`)
  }
  ok(`${y} 年退休 → 最低缴费年限 ${expect} 年`, bad.length === 0, bad.length ? '（不符：' + bad.slice(0, 5).join(',') + '）' : `（31/31 省一致）`)
}

console.log('\n===== 6. 已公布年份零回归（吉林 2025-12 退休基准值） =====')
{
  const c = prov.getConfig('jilin')
  const run = (idx) => engine.calculate(c, {
    gender: 'male', genderType: 'male', birthYear: 1965, birthMonth: 9,
    workYear: 2010, workMonth: 12, cityType: 'cc', avgIndex: idx / 100,
    retireDateInput: { year: 2025, month: 12 },
  }).legal
  const a = run(100), b = run(300)
  ok('100 档 15 年月领 = 1899.22', near(a.total, 1899.22), `（实际 ${a.total.toFixed(2)}）`)
  ok('300 档 15 年月领 = 4500.91', near(b.total, 4500.91), `（实际 ${b.total.toFixed(2)}）`)
}

console.log(`\n===== 汇总：${pass} 通过 / ${fail} 失败 =====`)
process.exit(fail ? 1 : 0)
