// 退休地选择实证：固定缴费历史（在参保地按当地社平 100% 缴），只换退休地
//
// 两种「换个省」混在一起会算错，必须分开：
//   换法一（现有 31 省横评）：连人带缴费一起换 —— 指数恒为 1.0，只有计发基数变
//   换法二（真实退休地选择）：缴费留在参保地，只换退休地 —— 计发基数变，
//          指数按国办发〔2009〕66号重算 = 参保地缴费工资 ÷ 退休地社平（反向变）
// 两者的差 = 指数对冲。本脚本量化这个对冲。
const path = require('path')
const ROOT = path.join(__dirname, '..')
const engine = require(path.join(ROOT, 'cloudfunctions', 'calculate', 'pension-engine.js'))
const { getConfig } = require(path.join(ROOT, 'cloudfunctions', 'calculate', 'provinces-data.js'))
const CI = require(path.join(ROOT, 'index-engine', 'calcIndex.js'))

const F = (n, p = 2) => Number(n).toLocaleString('en-US', { minimumFractionDigits: p, maximumFractionDigits: p })

// 参保地：河南；退休地候选
const CONTRIB_PROV = 'henan'
const RETIRE_PROVS = [
  ['henan', '河南'], ['jilin', '吉林'], ['shandong', '山东'], ['guangdong', '广东'],
  ['xizang', '西藏'], ['beijing', '北京'], ['shanghai', '上海'],
]
const TIERS = [[1.0, '100%档'], [0.6, '60%档'], [3.0, '300%档']]

const cfgC = getConfig(CONTRIB_PROV)
const histC = cfgC.avg_salary_history
const START = 1995 // 河南建账 1995-01，此前为视同
const END = 2025

function buildContrib(tier) {
  const out = []
  for (let y = START; y <= END; y++) {
    const s = histC[y]
    if (!s || s <= 0) continue
    out.push({ year: y, months: y === END ? 11 : 12, baseAvg: Math.round(s * tier * 100) / 100 })
  }
  return out
}

function calcRetire(code, avgIndex) {
  const r = engine.calculate(getConfig(code), {
    gender: 'male', genderType: 'male', birthYear: 1965, birthMonth: 9,
    workYear: 1987, workMonth: 7, avgIndex, cityType: 'prov',
    retireDateInput: { year: 2025, month: 12 },
  }).legal
  const tp = r.transitionalPension || {}
  return {
    base: r.basicPension ? r.basicPension.amount : 0,
    pers: r.personalAccount ? r.personalAccount.amount : 0,
    trans: (tp.amount || 0) + (tp._adjustment || 0),
    total: r.total,
    sight: r.sightYears,
  }
}

console.log('='.repeat(78))
console.log('退休地选择实证：参保地固定为河南，只换退休地（2025-12 退休，男职工 1987-07 参工）')
console.log('='.repeat(78))

for (const [tier, tierLabel] of TIERS) {
  const contrib = buildContrib(tier)
  console.log(`\n\n${'='.repeat(78)}\n参保地河南 · ${tierLabel}（${contrib.length} 个缴费年）\n${'='.repeat(78)}`)
  console.log('退休地   | 计发基数 | 重算指数 | 换法一(指数=1) | 换法二(真实) | 差额    | 对冲幅度')
  console.log('---------|---------|---------|---------------|-------------|--------|--------')

  const rows = []
  for (const [code, name] of RETIRE_PROVS) {
    const cfgR = getConfig(code)
    const base = cfgR.base_params ? (cfgR.base_params.PROV_2025 || cfgR.base_params.PROV_2024) : null

    // 换法二：指数按退休地社平重算
    const idxRes = CI.calculateIndex({
      provinceConfig: cfgR, provinceCode: code, contribution: contrib, granularity: 'A',
    })
    const idx = idxRes.avgIndex

    const m1 = calcRetire(code, tier)      // 换法一：指数恒 = 档位（连人带缴费一起换）
    const m2 = calcRetire(code, idx)       // 换法二：指数按退休地重算
    const gap = m1.total - m2.total
    const hedge = m1.total > 0 ? (gap / m1.total * 100) : 0
    rows.push({ name, base, idx, m1, m2, gap, hedge })
    console.log(
      `${name.padEnd(6)} | ${String(F(base, 0)).padStart(7)} | ${F(idx, 4)} | ${String(F(m1.total)).padStart(11)} | ${String(F(m2.total)).padStart(10)} | ${String(F(gap)).padStart(7)} | ${hedge.toFixed(1)}%`
    )
  }

  // 参保地自身为基准，看换退休地的真实收益
  const self = rows.find(r => r.name === '河南')
  console.log('\n以「在河南退休」为基准，换退休地的真实收益（换法二）：')
  for (const r of rows) {
    if (r.name === '河南') continue
    const d = r.m2.total - self.m2.total
    const pct = (d / self.m2.total * 100)
    const d1 = r.m1.total - self.m1.total
    console.log(
      `  → ${r.name.padEnd(4)}：真实 ${F(d)} 元/月（${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%）` +
      `  | 若按换法一算会得出 ${F(d1)} 元/月 —— 高估 ${F(d1 - d)} 元`
    )
  }
}
