// 验证「退休地选择的收益 = 连人带缴费换省收益的 1/(1+档位)」
//
// 推导（参保地社平 A，退休地社平 B，按参保地 k 档缴，年限 Y，1%/年）：
//   在参保地退休:  基础 = A × (1+k)/2 × Y
//   换法一(连人带缴费一起换，指数仍 k):  基础 = B × (1+k)/2 × Y   → 收益 (B-A)(1+k)/2 × Y
//   换法二(缴费留原地，只换退休地，指数重算为 kA/B):
//                   基础 = B × (1 + kA/B)/2 × Y = (B + kA)/2 × Y
//                   → 收益 [(B+kA)/2 - A(1+k)/2] × Y = (B-A)/2 × Y   ← 与 k 无关！
//   ⇒ 比值 = [(B-A)/2] / [(B-A)(1+k)/2] = 1/(1+k)
//      60% 档 62.5% | 100% 档 50% | 300% 档 25%
//
// 为排除干扰，本验证构造「无视同缴费」场景（1996-01 参保），
// 且退休地限定无保底规则的省份。
const path = require('path')
const ROOT = path.join(__dirname, '..')
const engine = require(path.join(ROOT, 'cloudfunctions', 'calculate', 'pension-engine.js'))
const { getConfig } = require(path.join(ROOT, 'cloudfunctions', 'calculate', 'provinces-data.js'))
const CI = require(path.join(ROOT, 'index-engine', 'calcIndex.js'))

const F = (n, p = 2) => Number(n).toLocaleString('en-US', { minimumFractionDigits: p, maximumFractionDigits: p })

const CONTRIB = 'henan'                 // 参保地
const RETIRE = [['shandong', '山东'], ['jiangsu', '江苏'], ['hubei', '湖北'], ['sichuan', '四川']]
const TIERS = [[0.6, '60%档', 0.625], [1.0, '100%档', 0.5], [3.0, '300%档', 0.25]]
const START = 1996, END = 2025

const histC = getConfig(CONTRIB).avg_salary_history

function buildContrib(tier) {
  const out = []
  for (let y = START; y <= END; y++) {
    const s = histC[y]
    if (!s || s <= 0) continue
    out.push({ year: y, months: y === END ? 11 : 12, baseAvg: Math.round(s * tier * 100) / 100 })
  }
  return out
}

// 只取基础养老金（排除个账/过渡性/地方项的干扰）
function basicOnly(code, avgIndex) {
  const r = engine.calculate(getConfig(code), {
    gender: 'male', genderType: 'male', birthYear: 1965, birthMonth: 9,
    workYear: 1996, workMonth: 1, avgIndex, cityType: 'prov',
    retireDateInput: { year: 2025, month: 12 },
  }).legal
  return r.basicPension ? r.basicPension.amount : 0
}

let pass = 0, fail = 0
console.log('='.repeat(84))
console.log('退休地收益对冲验证：参保地河南（1996-01 参保，无视同），只换退休地')
console.log('理论比值 = 1/(1+档位)：60%档 62.5% | 100%档 50.0% | 300%档 25.0%')
console.log('='.repeat(84))

for (const [tier, tLabel, expRatio] of TIERS) {
  const contrib = buildContrib(tier)
  console.log(`\n--- ${tLabel} ---`)
  console.log('退休地 | 计发基数 | 重算指数 | 换法一收益 | 换法二收益 | 实际比值 | 理论 | 偏差')
  console.log('-------|---------|---------|-----------|-----------|---------|------|-----')
  const baseSelf = basicOnly(CONTRIB, tier)
  for (const [code, name] of RETIRE) {
    const cfgR = getConfig(code)
    const idx = CI.calculateIndex({ provinceConfig: cfgR, provinceCode: code, contribution: contrib, granularity: 'A' }).avgIndex
    const g1 = basicOnly(code, tier) - baseSelf     // 连人带缴费一起换
    const g2 = basicOnly(code, idx) - baseSelf      // 只换退休地
    const ratio = g1 !== 0 ? g2 / g1 : NaN
    const dev = Math.abs(ratio - expRatio)
    const ok = dev <= 0.02
    ok ? pass++ : fail++
    console.log(
      `${name.padEnd(4)} | ${String(F(cfgR.base_params ? (cfgR.base_params.PROV_2025 || 0) : 0, 0)).padStart(8)} | ${F(idx, 4)} | ${String(F(g1)).padStart(10)} | ${String(F(g2)).padStart(10)} | ${(ratio * 100).toFixed(1)}% | ${(expRatio * 100).toFixed(1)}% | ${ok ? '✅' : '❌ ' + (dev * 100).toFixed(1) + 'pt'}`
    )
  }
}
console.log(`\n结果：通过 ${pass}，失败 ${fail}`)
if (fail) process.exitCode = 1
