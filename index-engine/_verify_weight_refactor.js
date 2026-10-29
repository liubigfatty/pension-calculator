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
const UNTOUCHED = ['shanghai', 'guangdong', 'chongqing', 'guangxi', 'guizhou', 'hainan',
  'jiangsu', 'jiangxi', 'shandong', 'shanxi', 'sichuan', 'tianjin', 'xinjiang', 'xizang',
  'zhejiang', 'hubei', 'ningxia', 'anhui', 'yunnan', 'qinghai', 'neimenggu', 'hunan',
  'hebei', 'liaoning', 'jilin', 'gansu', 'henan', 'beijing', 'shaanxi', 'fujian', 'heilongjiang']

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
  const h = pickHist(cfg)
  const rows = []
  for (let y = 2000; y <= 2019; y++) rows.push({ year: y, months: 12, baseAvg: h[y] || h[y + 1] })
  rows.push({ year: 2020, months: 1, baseAvg: (h[2020] || h[2021]) * 3.0 })
  const r = NEW.calculateIndex({ provinceConfig: cfg, provinceCode: 'jilin', contribution: rows, granularity: 'A', retireYear: 2020 })
  const d2020 = r.yearsDetail.find(d => d.year === 2020)
  check('吉林 2020 年指数 = 3.0（不受月数影响）', d2020 && Math.abs(d2020.index - 3.0) < 1e-6,
    '实得 ' + (d2020 && d2020.index))
  check('吉林退休当年(2020)不进指数', d2020 && d2020.excludedFromIndex === true)
  // 20 个 1.0 + 排除 2020 → N=20, Σ=20
  check('吉林 N = 20 年（整年计数）', Math.abs(r._meta.indexDenominatorN - 20) < 1e-6,
    'N=' + r._meta.indexDenominatorN)
  check('吉林 avgIndex = 1.0', Math.abs(r.avgIndex - 1.0) < 1e-6, '实得 ' + r.avgIndex)

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
console.log(`结果：通过 ${pass} / 失败 ${fail}`)
console.log('═'.repeat(72))
process.exit(fail > 0 ? 1 : 0)
