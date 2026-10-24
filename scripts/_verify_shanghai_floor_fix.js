// 验证「上海指数保底」修复：云函数两次调用方案能否复现 MEMORY 记录的基准
//   MEMORY D7：1993 参工 / 2026 退 / 全程 60 档
//   传档位 0.6  → 月领 4,744（系统性低估）
//   真实保底后  → 月领 5,823（差 1,078 元，18.5%）
const path = require('path')
const engine = require(path.resolve('./cloudfunctions/calculate/pension-engine.js'))
const single = require(path.resolve('./cloudfunctions/calculate/provinces-data.js'))

const config = single.getConfig('shanghai')
if (!config) throw new Error('未取到 shanghai 配置')

// 与 cloudfunctions/calculate/index.js 内实现保持一致
function shanghaiFloor(year) {
  if (year >= 1993 && year <= 2011) return 1.0
  if (year === 2012) return 0.85
  if (year === 2013) return 0.75
  return null
}
function avgIndexWithFloor(level, startYear, endYear) {
  if (!(startYear > 0) || !(endYear >= startYear)) return level
  let sum = 0, n = 0
  for (let y = startYear; y <= endYear; y++) {
    const f = shanghaiFloor(y)
    sum += (f != null ? Math.max(f, level) : level)
    n++
  }
  return n ? Math.round((sum / n) * 10000) / 10000 : level
}

const CASES = [
  // ⚠️ 出生年需使「法定退休年」落在 2026，才能与 MEMORY 的基准对照
  //    （1963 生男 60 岁在 2023-01、早于延迟退休 2025-01-01 施行 ⇒ 不被延迟，退休年=2023，对不上基准）
  { tag: '基准：1993参工/1966生男(2026退)/60档', gender: 'male', genderType: 'male', birthYear: 1966, birthMonth: 1, workYear: 1993, workMonth: 1, level: 0.6 },
  { tag: '对照：1993参工/1966生男(2026退)/100档', gender: 'male', genderType: 'male', birthYear: 1966, birthMonth: 1, workYear: 1993, workMonth: 1, level: 1.0 },
  { tag: '晚参工：2015参工/1966生男(2026退)/60档（2014后无明文，应不触发）', gender: 'male', genderType: 'male', birthYear: 1966, birthMonth: 1, workYear: 2015, workMonth: 1, level: 0.6 },
]

for (const c of CASES) {
  const base = {
    gender: c.gender, genderType: c.genderType, identity: 'worker',
    birthYear: c.birthYear, birthMonth: c.birthMonth,
    workYear: c.workYear, workMonth: c.workMonth,
    personalAccInput: 0, cityType: 'prov',
  }
  const probe = engine.calculate(config, Object.assign({}, base, { avgIndex: c.level }))
  const retireYear = probe.legal.date.year
  const before = probe.legal.total
  const floored = avgIndexWithFloor(c.level, c.workYear, retireYear)
  const after = engine.calculate(config, Object.assign({}, base, { avgIndex: floored })).legal.total

  console.log('\n【' + c.tag + '】')
  console.log('  法定退休 ' + retireYear + '-' + probe.legal.date.month + '，档位 ' + c.level)
  console.log('  保底前 指数 ' + c.level + ' → 月领 ' + before.toFixed(2))
  console.log('  保底后 指数 ' + floored + ' → 月领 ' + after.toFixed(2))
  console.log('  差额 ' + (after - before).toFixed(2) + ' 元/月（' + ((after / before - 1) * 100).toFixed(1) + '%）' + (floored > c.level ? '  ✅ 已触发保底' : '  ⏸ 未触发（符合预期）'))
}

console.log('\n参照 MEMORY D7 基准：1993参工/2026退/60档 ⇒ 4,744 → 5,823（+1,078，18.5%）')
