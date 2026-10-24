/**
 * 吉林「长缴增发」分段口径实证：累计缴费年限 vs 实际缴费年限
 *
 * 背景：论点抽取批 6 出现内部口径冲突——036 卡片判"分段应按实际缴费年限"，
 *       引擎 calcExtraPension 用 totalYears（累计），吉政办明电〔2015〕11号原文写
 *       "本人实际缴费年限累计超过20年……累计缴费年限21—25年部分…"
 *       ⇒ 本脚本拿 cases/jilin/ 的真实案例（含官方核定表/预核定表数值）做双口径复算，谁对谁错用数字说话。
 *
 * 用法： node probes/_verify_jilin_extra_口径_20261022.js
 */
const fs = require('fs')
const path = require('path')

const DIR = path.join(__dirname, '../cases/jilin')
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json'))
// 个别案例未写 base_number/base_prov（如 2.json 四平 2023），用重标定说明里的官方值兜底
const BASE_FALLBACK = { '2.json': 6655.33 } // 吉人社联〔2023〕158号：四平等多数地区 79864元/年=6655.33元/月

/**
 * 分段增发（吉林 吉政办明电〔2015〕11号 第一条）
 * @param {number} avgBase  "原计发标准"的基数均值 = (退休地计发基数 + 全省计发基数×平均指数)/2
 * @param {number} y        用于分段的年数（累计 或 实际）
 * @returns {number} 月增发额
 */
function extraByYears(avgBase, y) {
  // 21—25年部分 0.15%；26—30年部分 0.2%；31年及以上部分 0.25%
  // 段宽按"虚年"：21-25 段满 5 年；31+ 段 = y - 31 + 1（含 31 这一年）
  const seg1 = Math.max(Math.min(y - 21 + 1, 5), 0)
  const seg2 = Math.max(Math.min(y - 26 + 1, 5), 0)
  const seg3 = Math.max(y - 31 + 1, 0)
  return avgBase * (seg1 * 0.0015 + seg2 * 0.002 + seg3 * 0.0025)
}

const rows = []
for (const f of files) {
  const c = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
  const idx = c.avg_index
  const fb = BASE_FALLBACK[f]
  const retireBase = c.base_number != null ? c.base_number : (c.base_prov != null ? c.base_prov : (fb || 0))
  const provBase = c.base_prov != null ? c.base_prov : (fb || retireBase)
  const avgBase = (retireBase + provBase * idx) / 2

  const totalY = c.total_years
  const actualY = c.actual_years
  const expected = c.expected && c.expected.extra_pension

  const byTotal = extraByYears(avgBase, totalY)
  const byActual = extraByYears(avgBase, actualY)

  rows.push({
    case: `${f}｜${c.city || ''}${c.gender || ''}${c.birth_year}.${c.birth_month}生 ${c.retire_year}.${c.retire_month}退`,
    actualY, sightY: c.sight_years, totalY,
    avgBase: +avgBase.toFixed(2),
    byTotal: +byTotal.toFixed(2),
    byActual: +byActual.toFixed(2),
    expected,
    hitTotal: expected != null && Math.abs(byTotal - expected) < 1,
    hitActual: expected != null && Math.abs(byActual - expected) < 1,
    verified: c.verified !== false,
    src: (c.notes || '').includes('预核定表') ? '预核定表' : (c.verified === false ? '推算值' : '核定表')
  })
}

console.log('\n=== 吉林长缴增发：分段用「累计」还是「实际」？双口径复算 ===\n')
console.log('案例'.padEnd(46), '实际', ' 视同', ' 累计', '  基数均值', ' 累计口径', ' 实际口径', ' 案例值', ' 命中')
for (const r of rows) {
  console.log(
    r.case.slice(0, 44).padEnd(46),
    String(r.actualY).padStart(5),
    String(r.sightY).padStart(5),
    String(r.totalY).padStart(5),
    String(r.avgBase).padStart(9),
    String(r.byTotal).padStart(9),
    String(r.byActual).padStart(9),
    String(r.expected).padStart(8),
    ' ' + (r.hitTotal ? '✅累计' : (r.hitActual ? '❌实际' : '—'))
  )
}

const nT = rows.filter(r => r.hitTotal).length
const nA = rows.filter(r => r.hitActual).length
console.log(`\n结论：累计口径命中 ${nT}/${rows.length}，实际口径命中 ${nA}/${rows.length}`)
console.log('（案例值来源：' + rows.map(r => `${r.case.split('｜')[0]}=${r.src}`).join('，') + '）\n')

// 边界演示：实际≤20 但累计>20（长视同、短实缴）
console.log('=== 边界：触发看「实际」（>20），分段看「累计」 ===')
for (const [a, s] of [[8, 15], [19, 10], [20.5, 5], [21, 0], [25, 10]]) {
  const total = a + s
  const trig = a > 20
  console.log(
    `实际${String(a).padStart(5)}年 + 视同${String(s).padStart(3)}年 = 累计${String(total).padStart(5)}年 ⇒ 触发:${trig ? '是' : '否'}`,
    trig ? `增发(按累计)=${extraByYears(6000, total).toFixed(2)}元/月` : '增发=0（实际未超20年，不触发）'
  )
}
console.log()
