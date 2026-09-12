const fs = require('fs'), path = require('path')
const ROOT = path.resolve(__dirname, '..')
const REPORTS = path.join(ROOT, 'reports')
// 取最新 verify-report-*.json
const f = fs.readdirSync(REPORTS)
  .filter(x => /^verify-report-.*\.json$/.test(x))
  .sort().reverse()[0]
const r = JSON.parse(fs.readFileSync(path.join(REPORTS, f), 'utf8'))
console.log('报告:', f)
console.log('案例总数', r.total, '| 汇总', JSON.stringify(r.summary))

function markOf(prov, file) {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'cases', prov, file), 'utf8'))
    if (c.verified === true) return 'T'
    if (c.verified === false) return 'F'
    if (c.status === '正式核准') return '核准'
    return '无'
  } catch { return '无' }
}

const tab = { T: { pass: 0, fail: 0 }, F: { pass: 0, fail: 0 }, 核准: { pass: 0, fail: 0 }, 无: { pass: 0, fail: 0 } }
const vtFail = []
for (const x of r.results) {
  const m = markOf(x.province, x.file)
  if (x.status === 'pass') tab[m].pass++
  else if (x.status === 'fail') { tab[m].fail++; if (m === 'T') vtFail.push(x) }
  else tab[m][x.status] = (tab[m][x.status] || 0) + 1
}
console.log('\n=== 校准标记 × 验证结果 ===')
console.log('标记        | PASS | FAIL')
for (const m of ['T', 'F', '核准', '无']) console.log(`${m.padEnd(10)} | ${tab[m].pass} | ${tab[m].fail}`)

console.log('\n=== verified:true 但仍 FAIL 的 (' + vtFail.length + ' 个，这才是真问题：引擎 vs 官方核定表) ===')
// 分类：按出错组分 + 量级
const cat = { basic_only: [], extra: [], trans: [], big: [] }
for (const x of vtFail) {
  const labels = (x.diffs || []).map(d => d.label)
  const hasExtra = labels.some(l => /增发/.test(l))
  const hasTrans = labels.some(l => /过渡/.test(l))
  const hasBasic = labels.some(l => /基础/.test(l))
  const maxD = Math.max(...(x.diffs || []).map(d => d.diff || 0))
  if (maxD >= 300) cat.big.push(x)
  else if (hasExtra) cat.extra.push(x)
  else if (hasTrans) cat.trans.push(x)
  else if (hasBasic) cat.basic_only.push(x)
  else cat.basic_only.push(x)
}
console.log(`\n[量级≥300元·疑似缺项/口径严重错] ${cat.big.length} 个:`)
for (const x of cat.big) console.log(`  [${x.province}/${x.file}] 最大差 ${(Math.max(...(x.diffs||[]).map(d=>d.diff||0))).toFixed(0)} | ` + (x.diffs||[]).map(d=>d.label).join(','))
console.log(`\n[仅基础养老金偏差·疑似社平/计发基数/指数口径] ${cat.basic_only.length} 个`)
console.log(`[含增发养老金偏差·疑似增发项未算/算错] ${cat.extra.length} 个:`)
for (const x of cat.extra) console.log(`  [${x.province}/${x.file}] ` + (x.diffs||[]).map(d=>`${d.label}差${d.diff?.toFixed(0)}`).join(','))
console.log(`[含过渡养老金偏差·疑似过渡性公式] ${cat.trans.length} 个:`)
for (const x of cat.trans) console.log(`  [${x.province}/${x.file}] ` + (x.diffs||[]).map(d=>`${d.label}差${d.diff?.toFixed(0)}`).join(','))
// 城市专项
const city = vtFail.filter(x => /shenzhen|深圳|zz|郑州|chengdu|成都|zhongshan|中山|huizhou|惠州|jiangmen|江门/.test(x.province+'/'+x.file))
console.log(`\n[城市专项(shenzhen/zz/chengdu等) ${city.length} 个]: ` + city.map(x=>`${x.province}/${x.file}`).join(', '))
