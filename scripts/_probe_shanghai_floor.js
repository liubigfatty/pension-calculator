// 上海「指数保底」漏算的影响量化
// 沪人社规〔2021〕32号：1993-2011 指数<1 按 1；2012≥0.85；2013≥0.75；2014 起按实际
// 指数计算器（index-engine/calcIndex.js）已实现 shanghaiFloor，但**主程序是手填 avg_index**，
// 直接填档位（0.6）会绕过保底 ⇒ 本脚本量化低估幅度，并验证告警判据。
const path = require('path')
const { calculate } = require(path.resolve('./engine/pension-engine.js'))
const shMod = require(path.resolve('./cloudfunctions/calculate/provinces/shanghai.js'))
const config = shMod.getEngineConfig ? shMod.getEngineConfig() : shMod
const idxMod = require(path.resolve('./index-engine/calcIndex.js'))

const R2 = x => Math.round(x * 100) / 100
const R0 = x => Math.round(x)

// ---- 用指数计算器的保底规则，算出「真实应填的指数」 ----
// 场景：1993-01 参工，全程 60 档（raw=0.6），retireYear 年退休
function trueIndex(fromYear, retireYear, raw = 0.6) {
  const floor = idxMod.shanghaiFloor
  let sum = 0, n = 0
  for (let y = fromYear; y < retireYear; y++) {
    const f = floor(y)
    sum += (f != null ? Math.max(f, raw) : raw)
    n++
  }
  return n ? sum / n : raw
}

const CASES = [
  { tag: '1993 参工 · 2026 退（33年·全程60档）', workYear: 1993, retire: 2026 },
  { tag: '1998 参工 · 2026 退（28年·全程60档）', workYear: 1998, retire: 2026 },
  { tag: '2005 参工 · 2026 退（21年·全程60档）', workYear: 2005, retire: 2026 },
  { tag: '2015 参工 · 2045 退（30年·全程60档）', workYear: 2015, retire: 2045 },
]

console.log('='.repeat(78))
console.log('上海 · 传「未保底档位 0.6」vs 传「保底后真实指数」的差异')
console.log('='.repeat(78))
console.log('  ' + '场景'.padEnd(34) + '应填指数'.padStart(9) + '月领(0.6)'.padStart(11)
  + '月领(真实)'.padStart(11) + '低估'.padStart(9) + '低估%'.padStart(8))

const rows = []
for (const c of CASES) {
  const ti = trueIndex(c.workYear, c.retire)
  const run = (idx) => {
    const r = calculate(config, {
      province: 'shanghai', cityType: 'prov',
      birthYear: c.retire - 33 > 1940 ? 1966 : 1966, birthMonth: 1,
      workYear: c.workYear, workMonth: 1,
      avgIndex: idx,
      retireDateInput: { year: c.retire, month: 1 },
      gender: 'male',
    })
    // ⚠️ 直接 require 引擎时月领在 r.legal.total（云函数返回体才是 {data:{legal:{total}}}）
    return (r && r.legal && r.legal.total) ? r.legal.total : 0
  }
  const a = run(0.6), b = run(ti)
  const d = b - a
  rows.push({ ...c, ti, a, b, d })
  console.log('  ' + c.tag.padEnd(32) + R2(ti).toFixed(4).padStart(10)
    + R0(a).toLocaleString().padStart(12) + R0(b).toLocaleString().padStart(12)
    + R0(d).toLocaleString().padStart(10) + (R2(d / b * 100) + '%').padStart(9))
}

console.log('\n' + '-'.repeat(78))
console.log('告警判据验证：上海 + workYear<=2011 + 传入 avgIndex<0.75 ⇒ 几乎必然是未保底')
console.log('-'.repeat(78))
for (const r of rows) {
  const trig = r.workYear <= 2011 && r.ti >= 0.75
  console.log(`  ${r.tag.slice(0, 30).padEnd(30)} workYear=${r.workYear}  真实=${R2(r.ti)}  触发告警=${trig ? '✅ 是' : '❌ 否（2014 后参工，无保底年份，0.6 合法）'}`)
}

console.log('\n【对照】主程序另一条路径：选「灵活就业 60 档」→ 引擎收到 0.6，同样绕过保底')
console.log('【对照】指数小程序路径：calcIndex 已算保底 ⇒ 填进主程序的是真实值，不会错')
