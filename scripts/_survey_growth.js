// 调研：31 省 PROV_BASE 最近年份增幅，用于确定未来基数外推口径
const prov = require('../cloudfunctions/calculate/provinces-data.js')

const names = ['beijing', 'tianjin', 'hebei', 'shanxi', 'neimenggu', 'liaoning', 'jilin', 'heilongjiang',
  'shanghai', 'jiangsu', 'zhejiang', 'anhui', 'fujian', 'jiangxi', 'shandong', 'henan', 'hubei', 'hunan',
  'guangdong', 'guangxi', 'hainan', 'chongqing', 'sichuan', 'guizhou', 'yunnan', 'xizang', 'shaanxi',
  'gansu', 'qinghai', 'ningxia', 'xinjiang']

const rows = []
for (const n of names) {
  const c = prov.getConfig(n)
  if (!c) { console.log(n, 'NO CFG'); continue }
  const b = c.PROV_BASE || (c.base_rates && c.base_rates.prov) || {}
  const ks = Object.keys(b).map(Number).filter(y => y >= 2000).sort((a, b) => a - b)
  const last = ks[ks.length - 1], prev = ks[ks.length - 2], y3 = ks[ks.length - 4]
  let g = null, g3 = null, future = []
  if (last && prev) g = b[last] / b[prev] - 1
  if (last && y3) g3 = Math.pow(b[last] / b[y3], 1 / 3) - 1
  // 找出 >= 2026 的未来年份写死值（假定当前已公布到 2025）
  future = ks.filter(y => y > 2025)
  rows.push({ n, last, prev, v1: b[last], v0: b[prev], g, g3, growth_rate: c.growth_rate, future })
}

console.log('省'.padEnd(12), '最后年  上一年  最后值     上年值     年增幅   近3年CAGR  cfg.growth_rate  未来年份写死值')
for (const r of rows) {
  console.log(
    r.n.padEnd(14),
    String(r.last).padEnd(7),
    String(r.prev).padEnd(7),
    String(r.v1).padEnd(10),
    String(r.v0).padEnd(10),
    (r.g == null ? '--' : (r.g * 100).toFixed(2) + '%').padEnd(8),
    (r.g3 == null ? '--' : (r.g3 * 100).toFixed(2) + '%').padEnd(10),
    String(r.growth_rate == null ? '--' : r.growth_rate).padEnd(16),
    r.future.length ? r.future.join(',') : '-'
  )
}

const gs = rows.filter(r => r.g != null).map(r => r.g).sort((a, b) => a - b)
console.log('\n年增幅 min/median/max: ' + (gs[0] * 100).toFixed(2) + '% / ' +
  (gs[Math.floor(gs.length / 2)] * 100).toFixed(2) + '% / ' + (gs[gs.length - 1] * 100).toFixed(2) + '%')
console.log('负增长省: ' + (rows.filter(r => r.g != null && r.g <= 0).map(r => r.n + '(' + r.last + '=' + r.v1 + ' vs ' + r.prev + '=' + r.v0 + ')').join(', ') || '无'))
console.log('>8% 省: ' + (rows.filter(r => r.g != null && r.g > 0.08).map(r => r.n + ' ' + (r.g * 100).toFixed(2) + '%').join(', ') || '无'))
console.log('\n未来年份写死值省份: ' + (rows.filter(r => r.future.length).map(r => r.n + '[' + r.future.join(',') + ']').join('  ') || '无'))
