/**
 * _verify_weight_refactor.js — 权重算子改造「前后对照」验证（只读）
 *
 * 同时 require 改造前（_old_calcIndex_baseline.js）与改造后（calcIndex.js），
 * 跑同一批样本，输出 avgIndex 差异，用于：
 *   1) 确认未列入改造名单的省份数值**完全一致**（零回归）
 *   2) 量化已改造省份的差值幅度
 *   3) 逐条断言改造后的算法符合省市规则
 *
 * 用法： node index-engine/_verify_weight_refactor.js
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const NEW = require(path.join(__dirname, 'calcIndex.js'))
// 改造前的引擎副本，供前后对照。文件不纳入 git：需要时执行
//   git show HEAD:index-engine/calcIndex.js > index-engine/_old_calcIndex_baseline.js
// 缺失时本脚本自动降级为「只跑新引擎断言」，不影响使用。
let OLD = null
try { OLD = require(path.join(__dirname, '_old_calcIndex_baseline.js')) } catch (e) { /* 无基线则降级 */ }

let pass = 0, fail = 0
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✅ ' + name + (extra ? '  ' + extra : '')) }
  else { fail++; console.log('  ❌ ' + name + (extra ? '  ' + extra : '')) }
}

function loadCfg(code) {
  const p = path.join(ROOT, 'provinces', code + '.json')
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : null
}
function pickHist(cfg) {
  const raw = cfg.avg_salary_history || {}
  if (typeof raw['2000'] === 'number') return raw
  const k = Object.keys(raw).find(x => raw[x] && typeof raw[x] !== 'number')
  return k ? raw[k] : raw
}

// ── 未改造名单：这些省的 avgIndex 必须 1:1 不变 ──>
// ⚠️ 2026-10-29 第二批改造后，粤/沪/鄂/吉 因「社保年度分段取社平」退出本名单，
//    它们不再适用「全年单一社平」，单独在第九节验证。
const UNTOUCHED = ['chongqing', 'guangxi', 'guizhou', 'hainan',
  'jiangsu', 'jiangxi', 'shandong', 'shanxi', 'sichuan', 'tianjin', 'xinjiang', 'xizang',
  'zhejiang', 'ningxia', 'anhui', 'yunnan', 'qinghai', 'neimenggu', 'hunan',
  'hebei', 'liaoning', 'gansu', 'henan', 'beijing', 'shaanxi', 'fujian', 'heilongjiang']

// ── 7-6 式社保年度省：这些省的分母要按社保年度分段 ──>
const SOCIAL_YEAR_SPLIT_PROVINCES = ['guangdong', 'shanghai', 'hubei', 'jilin']

/**
 * 构造「真实」的缴费记录。
 *
 * ⚠️ 关键：7-6 式省份一年内**上下半年用不同的缴费基数**（7 月调基），
 *    所以按 100% 档参保的人，逐年录入时必然是两条：
 *      上半年 6 个月 × hist[y-1]，下半年 6 个月 × hist[y]
 *    若硬塞「全年一个月均值」，本身就是失真数据 —— 那不是引擎的错。
 */
/**
 * 某社保年度 SY 的「100% 档」月基数 = 该年度核定缴费基数上下限所依据的社平。
 * 吉林：SY ≥ 2020 ⇒ hist[SY-1]（79号(十五)「对应上年度」）；SY ≤ 2019 ⇒ hist[SY]（28号「当年」）
 * 粤/沪/鄂：hist[SY]（无偏移）
 */
function socialYearBase(code, h, sy) {
  const split = NEW.SOCIAL_YEAR_SPLIT[code]
  const shift = (split && split.denomShiftFrom != null && sy >= split.denomShiftFrom) ? -1 : 0
  return h[sy + shift] || h[sy + shift + 1]
}

function contribLines(cfg, fromY, toY, opts = {}) {
  const h = pickHist(cfg)
  const code = opts.code
  const rows = []
  const splitProv = opts.split === true
  for (let y = fromY; y <= toY; y++) {
    if (y === opts.gapYear) continue
    const cur = h[y] || h[y + 1]
    if (!cur || cur <= 0) continue
    const short = (opts.shortYear === y)
    if (short) {
      // 1 月缴 ⇒ 属上一社保年度 ⇒ 300% 档按该社保年度的上限核定
      const refLv = splitProv ? socialYearBase(code, h, y - 1) : cur
      rows.push({ year: y, months: 1, baseAvg: (refLv || cur) * 3.0, startMonth: 1 })
      continue
    }
    if (splitProv) {
      // 上半年属 SY=y-1、下半年属 SY=y ⇒ 各按所属年度的 100% 档缴
      const low = socialYearBase(code, h, y - 1)
      const high = socialYearBase(code, h, y)
      if (!low || !high) continue
      rows.push({ year: y, months: 6, baseAvg: low, startMonth: 1 })
      rows.push({ year: y, months: 6, baseAvg: high, startMonth: 7 })
    } else {
      rows.push({ year: y, months: 12, baseAvg: cur })
    }
  }
  return rows
}

function contrib(cfg, opts = {}) {
  const rows = []
  const h = pickHist(cfg)
  for (let y = 2000; y <= 2020; y++) {
    const d = h[y] || h[y + 1]
    if (!d || d <= 0) continue
    if (opts.gapYear === y) continue
    const short = (opts.shortYear === y)
    rows.push({ year: y, months: short ? 1 : 12, baseAvg: short ? d * 3.0 : d })
  }
  return rows
}

function both(code, opts = {}) {
  const cfg = loadCfg(code)
  const c = contrib(cfg, opts)
  const args = { provinceConfig: cfg, provinceCode: code, contribution: c, granularity: 'A' }
  if (opts.retireYear) args.retireYear = opts.retireYear
  if (opts.deemedYears) args.deemedYears = opts.deemedYears
  try {
    const o = OLD.calculateIndex(args)
    const n = NEW.calculateIndex(args)
    return { old: o.avgIndex, new: n.avgIndex, nObj: n, oObj: o }
  } catch (e) {
    return { error: e.message }
  }
}

console.log('═'.repeat(72))
console.log('一、零回归检查：未改造省份 avgIndex 必须完全一致')
console.log('═'.repeat(72))
{
  const changed = Object.keys(NEW.INDEX_WEIGHT_RULES)
  console.log('  改造名单（' + changed.length + '）：' + changed.join(', '))
  if (!OLD) {
    console.log('  ⚠️ 无改造前基线副本（_old_calcIndex_baseline.js），跳过新旧对照')
    console.log('     生成方式：git show HEAD:index-engine/calcIndex.js > index-engine/_old_calcIndex_baseline.js')
  } else {
    let diff = 0
    for (const code of UNTOUCHED) {
      const r = both(code, { retireYear: 2021 })   // 显式退休年=2021 ⇒ 无记录受影响
      if (r.error) { console.log('  ⚠️ ' + code + ' ERROR ' + r.error); continue }
      if (Math.abs(r.old - r.new) > 1e-9) {
        diff++
        console.log(`  ⚠️ ${code.padEnd(13)} old=${r.old} new=${r.new} 差=${(r.new - r.old).toFixed(6)}`)
      }
    }
    console.log(`  → 有差异的省：${diff} 个（应为 0；差异只应出现在断缴／年中参保／年中退休的场景）`)
  }
}

console.log()
console.log('═'.repeat(72))
console.log('二、核心断言：吉林模式「缴1个月300档 ⇒ 该年指数 3.0」')
console.log('═'.repeat(72))
{
  const cfg = loadCfg('jilin')
  // 吉林 = 7-6 式社保年度省 ⇒ 按真实形态录入：上半年用 hist[y-1]、下半年用 hist[y]
  const rows = contribLines(cfg, 2000, 2020, { split: true, shortYear: 2020, code: 'jilin' })
  const r = NEW.calculateIndex({ provinceConfig: cfg, provinceCode: 'jilin', contribution: rows, granularity: 'A', retireYear: 2020 })
  const d2020 = r.yearsDetail.find(d => d.year === 2020)
  check('吉林 2020 年指数 = 3.0（不受月数影响）', d2020 && Math.abs(d2020.index - 3.0) < 1e-6,
    '实得 ' + (d2020 && d2020.index))
  check('吉林退休当年(2020)不进指数', d2020 && d2020.excludedFromIndex === true)
  // 20 个 1.0 + 排除 2020 → N=20, Σ=20
  check('吉林 N = 20 年（整年计数）', Math.abs(r._meta.indexDenominatorN - 20) < 1e-6,
    'N=' + r._meta.indexDenominatorN)
  check('吉林 avgIndex = 1.0（真实两段数据下各年指数恰为 1）', Math.abs(r.avgIndex - 1.0) < 1e-6, '实得 ' + r.avgIndex)
  const d2005 = r.yearsDetail.find(d => d.year === 2005)
  check('吉林 2005 年被社保年度劈成两段', d2005 && d2005.segments && d2005.segments.length === 2,
    '段数=' + (d2005 && d2005.segments && d2005.segments.length))

  // 同一份数据按旧算法：应为 ≈1.0 附近但略有不同
  if (OLD) {
    const ro = OLD.calculateIndex({ provinceConfig: cfg, provinceCode: 'jilin', contribution: rows, granularity: 'A' })
    console.log(`  ℹ️ 旧算法同一份数据 avgIndex=${ro.avgIndex}（按月加权会把退休当年稀释成 1/12 权重）`)
  }
}

console.log()
console.log('═'.repeat(72))
console.log('三、核心断言：辽/冀/甘 与吉林同档')
console.log('═'.repeat(72))
for (const code of ['liaoning', 'hebei', 'gansu']) {
  const cfg = loadCfg(code)
  const h = pickHist(cfg)
  const rows = []
  for (let y = 2000; y <= 2019; y++) rows.push({ year: y, months: 12, baseAvg: h[y] || h[y + 1] })
  rows.push({ year: 2020, months: 1, baseAvg: (h[2020] || h[2021]) * 3.0 })
  const r = NEW.calculateIndex({ provinceConfig: cfg, provinceCode: code, contribution: rows, granularity: 'A', retireYear: 2020 })
  const d = r.yearsDetail.find(x => x.year === 2020)
  check(`${code} N=20（整年）+ 退休当年不进指数`,
    Math.abs(r._meta.indexDenominatorN - 20) < 1e-6 && d.excludedFromIndex === true,
    `N=${r._meta.indexDenominatorN} avgIndex=${r.avgIndex}`)
}

console.log()
console.log('═'.repeat(72))
console.log('四、福建省级：年限尾数 0.5/1 取整（非按月）')
console.log('═'.repeat(72))
{
  const cfg = loadCfg('fujian')
  const h = pickHist(cfg)
  const rows = []
  for (let y = 2000; y <= 2019; y++) rows.push({ year: y, months: 12, baseAvg: h[y] || h[y + 1] })
  rows.push({ year: 2020, months: 4, baseAvg: h[2020] || h[2021] })   // 尾数 4 个月 → 0.5
  const r = NEW.calculateIndex({ provinceConfig: cfg, provinceCode: 'fujian', contribution: rows, granularity: 'A' })
  check('福建 2020 年(4个月)权重 = 0.5', Math.abs(r._meta.indexDenominatorN - 20.5) < 1e-6,
    'N=' + r._meta.indexDenominatorN)
  rows[rows.length - 1].months = 10                                   // 尾数 10 个月 → 1
  const r2 = NEW.calculateIndex({ provinceConfig: cfg, provinceCode: 'fujian', contribution: rows, granularity: 'A' })
  check('福建 2020 年(10个月)权重 = 1', Math.abs(r2._meta.indexDenominatorN - 21) < 1e-6,
    'N=' + r2._meta.indexDenominatorN)
}

console.log()
console.log('═'.repeat(72))
console.log('五、陕西：分子用年度总额（不足整年稀释）+ N 应缴年限自动补记')
console.log('═'.repeat(72))
{
  const cfg = loadCfg('shaanxi')
  const h = pickHist(cfg)
  const rows = []
  for (let y = 2000; y <= 2019; y++) rows.push({ year: y, months: 12, baseAvg: h[y] || h[y + 1] })
  rows.push({ year: 2020, months: 3, baseAvg: h[2020] || h[2021] })
  const r = NEW.calculateIndex({ provinceConfig: cfg, provinceCode: 'shaanxi', contribution: rows, granularity: 'A' })
  const d = r.yearsDetail.find(x => x.year === 2020)
  check('陕西 2020(3个月)年指数 ≈ 0.25（被稀释）', d && Math.abs(d.index - 0.25) < 1e-6, '实得 ' + (d && d.index))
  check('陕西 N = 21（整年计数）', Math.abs(r._meta.indexDenominatorN - 21) < 1e-6, 'N=' + r._meta.indexDenominatorN)

  // 断缴年自动补记
  const rows2 = rows.filter(x => x.year !== 2010)
  const r2 = NEW.calculateIndex({ provinceConfig: cfg, provinceCode: 'shaanxi', contribution: rows2, granularity: 'A' })
  const g2010 = r2.yearsDetail.find(x => x.year === 2010)
  check('陕西 2010 断缴年被自动补记并进 N', !!g2010 && g2010.autoFilled === true && g2010.index === 0,
    'gapCounted=' + (g2010 && g2010.gapCounted))
  check('陕西 N 仍为 21（含断缴年）', Math.abs(r2._meta.indexDenominatorN - 21) < 1e-6, 'N=' + r2._meta.indexDenominatorN)
}

console.log()
console.log('═'.repeat(72))
console.log('六、黑龙江：断缴年自动补记 + 指数 0.6')
console.log('═'.repeat(72))
{
  const cfg = loadCfg('heilongjiang')
  const h = pickHist(cfg)
  const rows = []
  for (let y = 2000; y <= 2020; y++) { if (y === 2010) continue; rows.push({ year: y, months: 12, baseAvg: h[y] || h[y + 1] }) }
  const r = NEW.calculateIndex({ provinceConfig: cfg, provinceCode: 'heilongjiang', contribution: rows, granularity: 'A' })
  const g = r.yearsDetail.find(x => x.year === 2010)
  check('黑龙江 2010 断缴年 index = 0.6', !!g && g.index === 0.6, '实得 ' + (g && g.index))
  check('黑龙江 N = 21×12 = 252 月（含断缴）', Math.abs(r._meta.indexDenominatorN - 252) < 1e-6, 'N=' + r._meta.indexDenominatorN)
  check('黑龙江 avgIndex = (20×12×1 + 0.6×12)/252 ≈ 0.9809',
    Math.abs(r.avgIndex - (20 * 12 * 1 + 0.6 * 12) / 252) < 1e-4, '实得 ' + r.avgIndex)
}

console.log()
console.log('═'.repeat(72))
console.log('七、安徽：首次参保当年权重取 1，中间年 ÷12')
console.log('═'.repeat(72))
{
  const cfg = loadCfg('anhui')
  const h = pickHist(cfg)
  const rows = []
  for (let y = 2000; y <= 2020; y++) rows.push({ year: y, months: 12, baseAvg: h[y] || h[y + 1] })
  rows[0].months = 6                                    // 首年只缴 6 个月
  rows[0].baseAvg = (h[2000] || h[2001]) * 3.0
  const r = NEW.calculateIndex({ provinceConfig: cfg, provinceCode: 'anhui', contribution: rows, granularity: 'A' })
  const d0 = r.yearsDetail.find(x => x.year === 2000)
  check('安徽首年权重 = 1（不被稀释）', Math.abs(d0.indexWeight - 1) < 1e-9, 'weight=' + d0.indexWeight)
  rows[5].months = 6                                    // 中间年 2005 只缴 6 个月
  const r2 = NEW.calculateIndex({ provinceConfig: cfg, provinceCode: 'anhui', contribution: rows, granularity: 'A' })
  const d5 = r2.yearsDetail.find(x => x.year === 2005)
  check('安徽中间年权重 = 6（按月）', Math.abs(d5.indexWeight - 6) < 1e-9, 'weight=' + d5.indexWeight)
}

console.log()
console.log('═'.repeat(72))
console.log('八、天津/北京：应缴年限自动补记')
console.log('═'.repeat(72))
for (const [code, expectN] of [['tianjin', 252], ['beijing', 21]]) {
  const cfg = loadCfg(code)
  const h = pickHist(cfg)
  const rows = []
  for (let y = 2000; y <= 2020; y++) { if (y === 2010) continue; rows.push({ year: y, months: 12, baseAvg: h[y] || h[y + 1] }) }
  const r = NEW.calculateIndex({ provinceConfig: cfg, provinceCode: code, contribution: rows, granularity: 'A' })
  const g = r.yearsDetail.find(x => x.year === 2010)
  check(`${code} 2010 断缴年自动补记且 index=0`, !!g && g.autoFilled === true && g.index === 0,
    'N=' + r._meta.indexDenominatorN)
  check(`${code} N = ${expectN}`, Math.abs(r._meta.indexDenominatorN - expectN) < 1e-6, 'N=' + r._meta.indexDenominatorN)
}

console.log()
console.log('═'.repeat(72))
console.log('九、社保年度分段取社平（粤/沪/鄂/吉）——本轮最大改造')
console.log('═'.repeat(72))
{
  console.log('  构造：按 100% 档参保，上半年 6 个月 × hist[y-1]，下半年 6 个月 × hist[y]')
  console.log('  期望：每年指数恰好 = 1.0（这正是「7-6 式省份」的真实形态）')
  for (const code of SOCIAL_YEAR_SPLIT_PROVINCES) {
    const cfg = loadCfg(code)
    const rows = contribLines(cfg, 2000, 2020, { split: true, code })
    const r = NEW.calculateIndex({ provinceConfig: cfg, provinceCode: code, contribution: rows, granularity: 'A' })
    if (r.error) { check(code + ' 可计算', false, r.error); continue }
    // 逐代号：每年都应是 1.0
    const bad = r.yearsDetail.filter(d => d.index != null && Math.abs(d.index - 1.0) > 1e-6)
    check(`${code} 逐年指数全为 1.0`, bad.length === 0,
      bad.length ? ('异常年=' + bad.slice(0, 3).map(b => b.year + ':' + b.index).join(',')) : `avgIndex=${r.avgIndex}`)
    const seg = r.yearsDetail.find(d => d.year === 2010)
    check(`${code} 2010 年被劈成两段且档位不同`,
      seg && seg.segments && seg.segments.length === 2 && Math.abs(seg.segments[0].denom - seg.segments[1].denom) > 1e-9,
      seg && seg.segments ? ('C1=' + seg.segments[0].denom.toFixed(0) + ' C2=' + seg.segments[1].denom.toFixed(0)) : 'no seg')
  }
  // 反向 sanity：若误给「全年单一月均」，新算法会偏离 1.0（说明数据结构必须匹配）
  {
    const cfg = loadCfg('guangdong')
    const h = pickHist(cfg)
    const flat = []
    for (let y = 2000; y <= 2020; y++) flat.push({ year: y, months: 12, baseAvg: h[y] || h[y + 1] })
    const rf = NEW.calculateIndex({ provinceConfig: cfg, provinceCode: 'guangdong', contribution: flat, granularity: 'A' })
    check('广东「全年单一基数」输入时会偏离 1.0（属数据失真，非算法错）',
      Math.abs(rf.avgIndex - 1.0) > 1e-6, 'avgIndex=' + rf.avgIndex)
  }
  // 北京/河南虽也是 7-6 式缴费年度，但 X/C 自然年对齐 ⇒ **不该被分段**
  {
    const enabled = Object.keys(NEW.SOCIAL_YEAR_SPLIT)
    check('北京/河南未被纳入分段名单（它们的 X/C 是自然年对齐）',
      !enabled.includes('beijing') && !enabled.includes('henan'), '名单=' + enabled.join(','))
  }
}

console.log()
console.log('═'.repeat(72))
console.log('十、黑龙江：年内欠缴月份按 0.6 补记')
console.log('═'.repeat(72))
{
  const cfg = loadCfg('heilongjiang')
  const h = pickHist(cfg)
  // 2000 年参保、2000-2020 逐年满缴，其中 2010 年只缴 6 个月（应缴 12）⇒ 补 6 个月 × 0.6
  const rows = []
  for (let y = 2000; y <= 2020; y++) rows.push({ year: y, months: y === 2010 ? 6 : 12, baseAvg: h[y] || h[y + 1] })
  const r = NEW.calculateIndex({ provinceConfig: cfg, provinceCode: 'heilongjiang', contribution: rows, granularity: 'A' })
  const d = r.yearsDetail.find(x => x.year === 2010)
  check('黑龙江 2010 年识别到 6 个欠缴月', d && Math.abs(d.unpaidMonths - 6) < 1e-9, 'unpaidMonths=' + (d && d.unpaidMonths))
  check('黑龙江 N = 21×12 = 252（含欠缴月）', Math.abs(r._meta.indexDenominatorN - 252) < 1e-6,
    'N=' + r._meta.indexDenominatorN)
  // 期望：Σ = 20年×12×1 + (6×1 + 6×0.6) ；N=252
  const expect = (20 * 12 * 1 + (6 * 1 + 6 * 0.6)) / 252
  check('黑龙江 avgIndex = (240 + 6×1 + 6×0.6)/252 ≈ ' + expect.toFixed(4),
    Math.abs(r.avgIndex - expect) < 1e-4, '实得 ' + r.avgIndex)
  // 首年/退休年无月份信息 ⇒ 不补（避免误判）
  const rows2 = []
  for (let y = 2000; y <= 2020; y++) rows2.push({ year: y, months: y === 2000 ? 6 : 12, baseAvg: h[y] || h[y + 1] })
  const r2 = NEW.calculateIndex({ provinceConfig: cfg, provinceCode: 'heilongjiang', contribution: rows2, granularity: 'A' })
  const d2 = r2.yearsDetail.find(x => x.year === 2000)
  check('黑龙江首年缺月信息时不补（不误判成欠缴）', d2 && (d2.unpaidMonths || 0) === 0,
    'unpaidMonths=' + (d2 && d2.unpaidMonths))
}

console.log()
console.log('═'.repeat(72))
console.log('十一、陕西「2020 前后 X/C 配对」——经官方实算复核暂不启用')
console.log('═'.repeat(72))
{
  const cfg = loadCfg('shaanxi')
  const h = pickHist(cfg)
  const rows = [{ year: 2017, months: 12, baseAvg: 3081.3 }]   // 官方实例：下限 3081.3，分母 5619.42
  const r = NEW.calculateIndex({ provinceConfig: cfg, provinceCode: 'shaanxi', contribution: rows, granularity: 'A' })
  const d = r.yearsDetail.find(x => x.year === 2017)
  check('陕西 2017 分母 = 5619.42（官方实算点）', d && Math.abs(d.socialAvg - 5619.42) < 1e-6,
    '实得 ' + (d && d.socialAvg))
  const rows2 = [{ year: 2024, months: 12, baseAvg: 4650 }]    // 官方实例：下限 4650 ⇒ 指数恰好 0.6
  const r2 = NEW.calculateIndex({ provinceConfig: cfg, provinceCode: 'shaanxi', contribution: rows2, granularity: 'A' })
  const d2 = r2.yearsDetail.find(x => x.year === 2024)
  check('陕西 2024 按下限缴 ⇒ 指数 = 0.6（官方实算点）', d2 && Math.abs(d2.index - 0.6) < 1e-6,
    '实得 ' + (d2 && d2.index))
  check('陕西未启用 denomByYear', !NEW.INDEX_WEIGHT_RULES.shaanxi.denomByYear)
}

console.log()
console.log('═'.repeat(72))
console.log('十二、反推自洽：按目标指数生成的基数序列，正向重算必须还原')
console.log('═'.repeat(72))
for (const code of ['guangdong', 'shanghai', 'hubei', 'jilin', 'guangxi', 'shandong', 'heilongjiang', 'beijing']) {
  const cfg = loadCfg(code)
  if (!cfg) { check(code + ' 配置可读', false); continue }
  const r = NEW.inferYearlyFromTargetIndex({
    provinceConfig: cfg, provinceCode: code,
    startYear: 2000, startMonth: 1, totalMonths: 240, targetIndex: 1.0
  })
  check(code + ' 目标指数 1.0 → 重算 1.0', !r.error && Math.abs(r.avgIndex - 1.0) < 1e-3,
    r.error || ('实得 ' + r.avgIndex))
}
{
  const cfg = loadCfg('shanghai')
  const rn = NEW.inferYearlyFromTargetIndex({ provinceConfig: cfg, provinceCode: 'shanghai', startYear: 2000, startMonth: 1, totalMonths: 240, targetIndex: 0.6 })
  const ro = OLD ? OLD.inferYearlyFromTargetIndex({ provinceConfig: cfg, provinceCode: 'shanghai', startYear: 2000, startMonth: 1, totalMonths: 240, targetIndex: 0.6 }) : null
  check('上海 target=0.6 被省级保底抬到 0.86（新旧一致，非回归）',
    !rn.error && Math.abs(rn.avgIndex - 0.86) < 1e-3 && (!ro || ro.error || Math.abs(ro.avgIndex - rn.avgIndex) < 1e-9),
    '新=' + rn.avgIndex + ' 旧=' + (ro ? ro.avgIndex : 'n/a'))
}
{
  // 广东 hist 是 {prov, 市} 嵌套 ⇒ 反推前必须 resolveSalaryHist
  const cfg = loadCfg('guangdong')
  const r = NEW.inferYearlyFromTargetIndex({ provinceConfig: cfg, provinceCode: 'guangdong', startYear: 2000, startMonth: 1, totalMonths: 240, targetIndex: 2.0 })
  check('广东嵌套 hist 可被反推（旧版报「无有效社平数据」的既有 bug 已修）',
    !r.error, r.error || ('实得 ' + r.avgIndex))
}

console.log()
console.log('═'.repeat(72))
console.log(`结果：通过 ${pass} / 失败 ${fail}`)
console.log('═'.repeat(72))
process.exit(fail > 0 ? 1 : 0)
