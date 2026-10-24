// 扫描 31 省真相源：AVG_SALARY_HISTORY（社平/指数分母）与 base_rates（计发基数）的 2024-2027 现状
// 只读，不写任何文件
const fs = require('fs')
const path = require('path')

const dir = path.resolve('./cloudfunctions/calculate/provinces')
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && !f.startsWith('_') && f !== 'index.js')

const rows = []
for (const f of files) {
  const p = path.join(dir, f)
  const key = f.replace(/\.js$/, '')
  let m
  try { m = require(p) } catch (e) { rows.push({ key, err: String(e.message).slice(0, 60) }); continue }
  const cfg = (typeof m.getEngineConfig === 'function') ? m.getEngineConfig() : m
  const avg = cfg.AVG_SALARY_HISTORY || cfg.avg_salary_history || {}
  const brRaw = cfg.BASE_RATE || cfg.base_rates || cfg.PROV_BASE || {}
  // base_rates 可能是 { prov:{...}, cc:{...} } 也可能是扁平 { YYYY: v }
  const brProv = (brRaw && (brRaw.prov || brRaw.PROV)) || brRaw || {}
  const years = o => Object.keys(o || {}).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b)
  const ay = years(avg), by = years(brProv)
  rows.push({
    key,
    avgMax: ay.length ? ay[ay.length - 1] : null,
    avg2024: avg[2024], avg2025: avg[2025], avg2026: avg[2026], avg2027: avg[2027],
    brMax: by.length ? by[by.length - 1] : null,
    br2025: brProv[2025], br2026: brProv[2026], br2027: brProv[2027],
  })
}

const pad = (v, n) => String(v == null ? '-' : v).padEnd(n)
console.log('省'.padEnd(12) + '社平max  社平2024   2025      2026      2027   | 基数max 基数2025  2026      2027')
console.log('-'.repeat(100))
rows.sort((a, b) => (a.avg2026 == null ? 1 : 0) - (b.avg2026 == null ? 1 : 0) || a.key.localeCompare(b.key))
for (const r of rows) {
  if (r.err) { console.log(pad(r.key, 12) + 'ERR ' + r.err); continue }
  console.log(
    pad(r.key, 12) +
    pad(r.avgMax, 8) + pad(r.avg2024, 9) + pad(r.avg2025, 9) + pad(r.avg2026, 9) + pad(r.avg2027, 7) + ' | ' +
    pad(r.brMax, 7) + pad(r.br2025, 9) + pad(r.br2026, 9) + pad(r.br2027, 8)
  )
}
const missAvg = rows.filter(r => !r.err && r.avg2026 == null).map(r => r.key)
const missBr = rows.filter(r => !r.err && r.br2026 == null).map(r => r.key)
console.log('\n共 ' + rows.length + ' 省')
console.log('⚠️ 社平[2026] 缺失 (' + missAvg.length + '): ' + missAvg.join(', '))
console.log('⚠️ 基数[2026] 缺失 (' + missBr.length + '): ' + missBr.join(', '))
