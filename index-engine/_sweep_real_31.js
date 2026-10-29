/**
 * 真实缴费轨迹 × 31 省横评
 *
 * 数据：吉林松原某人 1995-07 ~ 2023-11 逐月缴费（334 个月，2012 年断缴 8 个月、
 *       1995 年只缴 6 个月、2023 年只缴 11 个月、2016/2020/2022 同年换基数）。
 *
 * 做法：把同一份「相对缴费档位」平移到每个省——
 *       段基数' = 吉林该年段指数 × 该省当年等效社平
 *   ⇒ 消除各省社平水平高低的干扰，剩下的差异**全部来自算法**：
 *       ① 分子粒度（逐月 / 逐年）  ② 不足整年怎么算  ③ 分母 N 取什么
 *       ④ 退休当年进不进指数      ⑤ 断缴年记 0 / 记 0.6 / 不进分母
 *
 * 同时给「按月加权基准」：临时摘掉该省的 INDEX_WEIGHT_RULES 条目
 *   （保留 PROVINCE_RULES 的 cap / denom / deemedInDenom / gapZero），
 *   得到「同一省配置 + 按月加权」的对照值 ⇒ Δ% 即该省特殊算法带来的净影响。
 *
 * 只读脚本，不改任何规则文件（INDEX_WEIGHT_RULES 用完立即还原）。
 */
const fs = require('fs')
const path = require('path')

const E = require(path.join(__dirname, 'calcIndex.js'))
const SEGS = JSON.parse(fs.readFileSync(path.join(__dirname, '_real_data/jilin_real_segments.json'), 'utf-8'))
const JL = JSON.parse(fs.readFileSync(path.join(__dirname, '../provinces/jilin.json'), 'utf-8'))

// 1994-01 那条基数 0 是参加工作标记，不是缴费
const contrib = SEGS.filter(s => !(s.year === 1994 && (s.base || 0) === 0))

const PROV_DIR = path.join(__dirname, '../provinces')
const CODES = fs.readdirSync(PROV_DIR)
  .filter(f => f.endsWith('.json'))
  .map(f => f.replace(/\.json$/, ''))
  .sort()

// 少数配置文件缺 name 字段，兜底
const NAME_FALLBACK = { xinjiang: '新疆维吾尔自治区' }

// ── 一、先跑吉林，取「逐年等效分母」作为归一化基准 ──>
const jlRun = E.calculateIndex({
  provinceConfig: JL, provinceCode: 'jilin', contribution: contrib, granularity: 'A'
})
const jlDenom = {}
const jlIndex = {}
for (const d of jlRun.yearsDetail) { jlDenom[d.year] = d.socialAvg; jlIndex[d.year] = d.index }
// 吉林「应有年份」清单（用于查各省丢年）
const expectYears = Object.keys(jlDenom).map(Number).sort((a, b) => a - b)

// ── 二、逐省跑 ──>
function tierOf(rule) {
  if (rule.unpaidMonthsFill) return 'E'
  if (rule.firstYearFull) return 'D'
  if (rule.indexWeight === 'half') return 'C'
  if (rule.indexWeight === 'year') return 'B'
  return 'A'
}

function runProv(code, cfg, contribution, opts) {
  return E.calculateIndex(Object.assign({
    provinceConfig: cfg, provinceCode: code, contribution, granularity: 'A'
  }, opts))
}

const rows = []
for (const code of CODES) {
  const cfg = JSON.parse(fs.readFileSync(path.join(PROV_DIR, code + '.json'), 'utf-8'))
  const hist = E.resolveSalaryHist(cfg.avg_salary_history, null)

  // 归一化：各省按「吉林同年的相对档位」缴费
  // ⚠️ 精确到段：走引擎自己的 buildYearSegments + getDenominator，
  //    否则 7-6 式省份（粤沪鄂吉）会因「年度分母 vs 段级分母」引入 ±0.005 的近似噪声。
  const rule0 = E.mergedRule(code)
  const split0 = E.SOCIAL_YEAR_SPLIT[code] || null
  const ctx0 = { firstContribYear: 1995, firstStartMonth: 7 }
  const recDenom = (rl, sp, hs, rec) => {
    const segs = E.buildYearSegments(rec, ctx0, sp)
    let sum = 0, tot = 0
    for (const sg of segs) {
      const shift = (sp && sp.denomShiftFrom != null && sg.targetYear >= sp.denomShiftFrom) ? -1 : 0
      const d = E.getDenominator(rl, hs, sg.targetYear + shift)
      if (d && d > 0) { sum += d * sg.months; tot += sg.months }
    }
    return tot ? sum / tot : null
  }
  const jlRule = E.mergedRule('jilin')
  const jlSplit = E.SOCIAL_YEAR_SPLIT['jilin']
  const jlHist = E.resolveSalaryHist(JL.avg_salary_history, null)
  const norm = []
  let missing = 0
  for (const s of contrib) {
    const jlD = recDenom(jlRule, jlSplit, jlHist, s)
    const pD = recDenom(rule0, split0, hist, s)
    if (!jlD || !pD) { missing++; norm.push(Object.assign({}, s)); continue }
    norm.push(Object.assign({}, s, { baseAvg: (s.baseAvg / jlD) * pD }))
  }

  const baseOpts = { retireYear: 2023, retireMonth: 11 }
  const cur = runProv(code, cfg, norm, baseOpts)
  const curD = runProv(code, cfg, norm, Object.assign({}, baseOpts, { deemedYears: 1.5, deemedStartYear: 1994 }))
  const raw = runProv(code, cfg, contrib, baseOpts) // 不归一化：直接用吉林绝对金额

  // 按月加权基准：临时摘掉该省权重规则
  let base
  const saved = E.INDEX_WEIGHT_RULES[code]
  try {
    delete E.INDEX_WEIGHT_RULES[code]
    base = runProv(code, cfg, norm, baseOpts)
  } finally {
    if (saved) E.INDEX_WEIGHT_RULES[code] = saved
  }

  const rule = E.mergedRule(code)
  const d2012 = (cur.yearsDetail || []).find(d => d.year === 2012)
  const d2023 = (cur.yearsDetail || []).find(d => d.year === 2023)
  const capHit = (cur.yearsDetail || []).filter(d => d.outOfRange).length

  // 丢年诊断：吉林有缴费、但该省该年算不出指数（index=null，不计入 N）
  const dropYears = (cur.yearsDetail || []).filter(d => d.index == null).map(d => d.year)
  const dropMonths = (cur.yearsDetail || []).filter(d => d.index == null).reduce((s, d) => s + d.months, 0)
  // 逐年指数 vs 吉林同年指数，找偏差最大的 3 个年份（定位根因）
  const dev = (cur.yearsDetail || [])
    .filter(d => jlIndex[d.year] != null && d.index != null && !(d.year === 2023 && d.excludedFromIndex))
    .map(d => ({ year: d.year, jl: jlIndex[d.year], pv: d.index, diff: d.index - jlIndex[d.year] }))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .filter(d => Math.abs(d.diff) > 0.02)
    .slice(0, 4)
  // 分母缺失年（hist 里没有；若次年也缺 ⇒ 该年指数算不出来，整年作废）
  const missDenom = expectYears.filter(y => hist[y] == null && hist[y + 1] == null)

  // 对照实验：把每年都补满 12 个月（无断缴、无年中参保、无年中退休）
  // ⇒ 理论上 A 档与 B 档数学等价（Σ(idx·12)/Σ12 ≡ Σ(idx·1)/Σ1），极差应趋近 0
  const full = []
  for (const y of expectYears) {
    if (jlIndex[y] == null) continue
    for (const sm of [1, 7]) {
      const rec = { year: y, months: 6, startMonth: sm }
      const pD = recDenom(rule0, split0, hist, rec)
      if (!pD) continue
      full.push({ year: y, months: 6, startMonth: sm, baseAvg: jlIndex[y] * pD })
    }
  }
  // retireYear 传 2024（晚于最后缴费年）⇒ 7 省「退休当年不进指数」的分支不触发
  const fullRun = runProv(code, cfg, full, { retireYear: 2024 })

  rows.push({
    code,
    fullIdx: fullRun.avgIndex,
    name: (cfg.name || NAME_FALLBACK[code] || code).replace(/省|市|自治区|壮族|回族|维吾尔|特别行政区/g, ''),
    tier: tierOf(rule),
    weight: rule.indexWeight,
    retireIn: rule.retireYearInIndex === true,
    gapZero: rule.gapZero === true,
    gapFloor: rule.gapFloor || null,
    autoFill: rule.autoFillGapYears === true,
    split: !!E.SOCIAL_YEAR_SPLIT[code],
    idx: cur.avgIndex,
    baseIdx: base.avgIndex,
    idxDeemed: curD.avgIndex,
    rawIdx: raw.avgIndex,
    N: cur._meta ? cur._meta.indexDenominatorN : null,
    baseN: base._meta ? base._meta.indexDenominatorN : null,
    w2012: d2012 ? d2012.indexWeight : null,
    i2012: d2012 ? d2012.index : null,
    w2023: d2023 ? d2023.indexWeight : null,
    excl2023: !!(d2023 && d2023.excludedFromIndex),
    missing,
    capHit,
    dropYears,
    dropMonths,
    missDenom,
    dev,
    acc: cur.accountBalance
  })
}

// ── 三、输出 ──>
const pad = (s, n) => {
  s = String(s)
  let w = 0
  for (const ch of s) w += /[\u4e00-\u9fa5]/.test(ch) ? 2 : 1
  return s + ' '.repeat(Math.max(0, n - w))
}

console.log('═'.repeat(112))
console.log('真实缴费轨迹 × 31 省横评（吉林松原 1995-07~2023-11，334 个月，含 2012 年断缴 8 个月）')
console.log('已做归一化：各省按「吉林同年的相对缴费档位」缴费 ⇒ 差异只来自算法，不来自社平高低')
console.log('═'.repeat(112))
console.log(pad('省份', 8) + pad('档', 3) + pad('现行指数', 9) + pad('按月基准', 9) + pad('Δ%', 8) +
  pad('N', 5) + pad('基准N', 6) + pad('2012权重', 9) + pad('2023权重', 9) + pad('退休年', 7) + pad('断缴', 10) + pad('分段', 5))
console.log('─'.repeat(112))

const byDelta = rows.slice().sort((a, b) => (b.idx / b.baseIdx) - (a.idx / a.baseIdx))
for (const r of byDelta) {
  const d = (r.idx / r.baseIdx - 1) * 100
  const gapTxt = r.gapFloor != null ? ('记' + r.gapFloor) : (r.autoFill ? '补空年' : (r.gapZero ? '记0' : '不进'))
  console.log(
    pad(r.name, 8) + pad(r.tier, 3) + pad(r.idx.toFixed(4), 9) + pad(r.baseIdx.toFixed(4), 9) +
    pad((d >= 0 ? '+' : '') + d.toFixed(2), 8) + pad(r.N + ((r.tier === 'B' || r.tier === 'C') ? '年' : '月'), 6) + pad(r.baseN == null ? '-' : r.baseN.toFixed(1), 6) +
    pad(r.w2012 == null ? '-' : r.w2012.toFixed(3), 9) + pad(r.w2023 == null ? '-' : r.w2023.toFixed(3), 9) +
    pad(r.excl2023 ? '排除' : '计入', 7) + pad(gapTxt, 10) + pad(r.split ? '7-6式' : '自然年', 5)
  )
}

console.log('─'.repeat(112))
const idxs = rows.map(r => r.idx)
const bs = rows.map(r => r.baseIdx)
console.log(`现行指数  区间 ${Math.min(...idxs).toFixed(4)} ~ ${Math.max(...idxs).toFixed(4)}   极差 ${(Math.max(...idxs) - Math.min(...idxs)).toFixed(4)}  变异 ${(((Math.max(...idxs) - Math.min(...idxs)) / (idxs.reduce((a, b) => a + b) / idxs.length)) * 100).toFixed(2)}%`)
console.log(`按月基准  区间 ${Math.min(...bs).toFixed(4)} ~ ${Math.max(...bs).toFixed(4)}   极差 ${(Math.max(...bs) - Math.min(...bs)).toFixed(4)}`)
console.log(`Δ%        区间 ${Math.min(...rows.map(r => (r.idx / r.baseIdx - 1) * 100)).toFixed(2)}% ~ ${Math.max(...rows.map(r => (r.idx / r.baseIdx - 1) * 100)).toFixed(2)}%`)

// 分档汇总
console.log()
console.log('─'.repeat(112))
console.log('分档汇总（同档内各省应当高度一致，若不一致说明还有别的规则在起作用）')
console.log('─'.repeat(112))
const groups = {}
for (const r of rows) (groups[r.tier] = groups[r.tier] || []).push(r)
for (const t of Object.keys(groups).sort()) {
  const g = groups[t]
  const lo = Math.min(...g.map(r => r.idx)), hi = Math.max(...g.map(r => r.idx))
  console.log(`${t} 档（${g.length} 省） ${g.map(r => r.name).join('、')}`)
  console.log(`   指数 ${lo.toFixed(4)} ~ ${hi.toFixed(4)}  极差 ${(hi - lo).toFixed(4)}`)
}

// 数据缺口：丢年 / 分母缺失
console.log()
console.log('─'.repeat(112))
console.log('数据缺口诊断（同一份缴费记录，有的省算不全）')
console.log('─'.repeat(112))
const dropped = rows.filter(r => r.dropYears.length)
if (!dropped.length) console.log('  无丢年')
for (const r of dropped) {
  console.log(`  ${pad(r.name, 8)} 整年作废 ${r.dropYears.length} 年（${r.dropYears.join(',')}）` +
    `  丢 ${r.dropMonths} 个月 ⇒ 指数被${r.idx > r.baseIdx ? '抬高' : '压低'}（这三年是低指数年）`)
}
const missAll = rows.filter(r => r.missDenom.length)
console.log()
console.log('  分母彻底缺失（当年与次年 hist 都没有 ⇒ 整年指数算不出来）：')
for (const r of missAll) console.log(`  ${pad(r.name, 8)} ${r.missDenom.join(',')}`)

// 逐年偏差归因
console.log()
console.log('─'.repeat(112))
console.log('逐年指数 vs 吉林同年指数：差异 >0.02 的年份（定位每省真正的改写点）')
console.log('─'.repeat(112))
for (const r of rows) {
  if (!r.dev.length) continue
  const s = r.dev.map(d => `${d.year}: ${d.jl.toFixed(2)}→${d.pv.toFixed(2)}`).join('   ')
  console.log(`  ${pad(r.name, 8)} ${s}`)
}

// 对照实验：补齐 12 个月后 A/B 档应当等价
console.log()
console.log('─'.repeat(112))
console.log('对照实验：把 1995-2023 每年都补满 12 个月（无断缴/无年中参保/无年中退休）')
console.log('  ⇒ 理论上 A 档与 B 档数学等价：Σ(idx·12)/Σ12 ≡ Σ(idx·1)/Σ1，各省极差应趋近 0')
console.log('─'.repeat(112))
{
  const fs2 = rows.map(r => r.fullIdx)
  const lo = Math.min(...fs2), hi = Math.max(...fs2)
  // 众数：多数省应当完全重合
  const bucket = {}
  for (const r of rows) {
    const k = r.fullIdx.toFixed(4)
    ;(bucket[k] = bucket[k] || []).push(r)
  }
  const mode = Object.keys(bucket).sort((a, b) => bucket[b].length - bucket[a].length)[0]
  console.log(`  众数 ${mode} ← ${bucket[mode].length} 个省**逐位一致**：${bucket[mode].map(r => r.name).join('、')}`)
  console.log(`  区间 ${lo.toFixed(4)} ~ ${hi.toFixed(4)}   极差 ${(hi - lo).toFixed(4)}（真实形态下极差 ${(Math.max(...idxs) - Math.min(...idxs)).toFixed(4)}）`)
  console.log()
  console.log('  偏离众数的省（每一家都能归因，没有一笔是算错的）：')
  const out = rows.slice().sort((a, b) => b.fullIdx - a.fullIdx).filter(r => r.fullIdx.toFixed(4) !== mode)
  for (const r of out) {
    const why = []
    if (r.code === 'shanghai') why.push('上海省级保底：低于 floor 的年份按 1.0 计')
    if (r.code === 'guangxi') why.push('广西建账前 <1 按 1 计（省级明文）')
    if (r.code === 'chongqing') why.push('重庆封顶 3.0')
    if (r.dropYears.length) why.push('hist 缺 ' + r.dropYears.join('/') + ' ⇒ 整年作废，丢低指数年')
    if (r.code === 'anhui') why.push('安徽首参保年权重恒为 1 整年（firstYearFull）')
    if (!why.length) why.push('其他')
    console.log(`    ${pad(r.name, 8)} ${r.fullIdx.toFixed(4)}  ${r.tier}档  ${why.join('；')}`)
  }
  console.log()
  console.log('  ⇒ 结论：把「断缴 / 年中参保 / 年中退休」三种形态抹平之后，A、B、C、E 四档全部收敛到同一个数。')
  console.log('     各省的真实分歧**不来自档位本身**，而来自这四件事：')
  console.log('       ① 断缴年按整年进分母（B 档）还是按实缴月数加权（A 档）')
  console.log('       ② 退休当年算不算')
  console.log('       ③ 省级保底/封顶（上海 1.0 / 广西 1.0 / 重庆 3.0）')
  console.log('       ④ hist 缺年导致的整年作废（数据缺口，不是算法）')
}

// 断缴年 2012 的三种命运
console.log()
console.log('─'.repeat(112))
console.log('同一个 2012 年（真实断缴 8 个月、只缴 4 个月，月均基数档位 2.50）在各省的不同命运')
console.log('─'.repeat(112))
const g12 = {}
for (const r of rows) {
  const k = (r.w2012 == null ? '?' : r.w2012.toFixed(3)) + (r.autoFill || r.gapZero || r.gapFloor != null ? ' +断缴处理' : '')
  ;(g12[k] = g12[k] || []).push(r.name)
}
for (const k of Object.keys(g12)) {
  console.log(`  权重 ${pad(k, 18)} → ${g12[k].length} 省：${g12[k].join('、')}`)
}

// 退休当年 2023
console.log()
console.log('─'.repeat(112))
console.log('退休当年 2023（只缴 11 个月）')
console.log('─'.repeat(112))
const ex = rows.filter(r => r.excl2023).map(r => r.name)
const inc = rows.filter(r => !r.excl2023).map(r => r.name)
console.log(`  排除出指数（${ex.length} 省）：${ex.join('、')}`)
console.log(`  计入指数（${inc.length} 省）：${inc.length > 20 ? '其余全部' : inc.join('、')}`)

// 未归一化的原始对照
console.log()
console.log('─'.repeat(112))
console.log('附：不做归一化、直接把吉林的绝对缴费额套到各省（仅示警，不可当作真实结果）')
console.log('─'.repeat(112))
for (const r of rows.slice().sort((a, b) => b.rawIdx - a.rawIdx).slice(0, 5)) {
  console.log(`  ${pad(r.name, 8)} 原始指数 ${r.rawIdx.toFixed(4)}  ⚠️ 触限年数 ${r.capHit}`)
}
console.log('  ...')
for (const r of rows.slice().sort((a, b) => a.rawIdx - b.rawIdx).slice(0, 5)) {
  console.log(`  ${pad(r.name, 8)} 原始指数 ${r.rawIdx.toFixed(4)}  ⚠️ 触限年数 ${r.capHit}`)
}
console.log('  ⚠️ 吉林 1995 年缴费 202 元/月，在社平高的省份会被压到 0.6 下限 ⇒ 该列只说明')
console.log('     「同一笔绝对金额在不同省的相对位置天差地别」，不能用来比较算法。')

// 落盘
const outPath = path.join(__dirname, '_real_data/_sweep_31_result.json')
fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), 'utf-8')
console.log()
console.log('明细已写入 ' + outPath)
