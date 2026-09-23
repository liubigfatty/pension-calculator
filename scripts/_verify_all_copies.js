/**
 * 2026-09-12 延迟退休修复 · 逐副本验证
 *
 * 【为什么需要这个】
 * 首轮只验证了 engine/ 与 cloudfunctions/ 两份，结果根目录 engine.js（线上那份）
 * 根本没同步。教训：每份副本都必须单独跑一遍政策附表，不能靠"源改了产物就会同步"的假设。
 *
 * 政策基准来自 _assess_delay.js 的 TABLE（已通过自洽性检查）。
 */
const path = require('path')

const TARGETS = [
  { file: 'engine.js', browser: true, note: '★线上（Pages 发布根目录）' },
  { file: 'docs/js/pension-engine.js', browser: false, note: 'docs 文档站' },
  { file: 'docs/js/pension-engine-browser.js', browser: false, note: 'docs 浏览器版' },
  { file: 'docs/网页版/js/pension-engine-browser.js', browser: false, note: 'docs 网页版' },
  { file: 'engine/pension-engine.js', browser: false, note: '源（云函数/构建源）' },
  { file: 'cloudfunctions/calculate/pension-engine.js', browser: false, note: '云函数' },
  { file: 'web/engine.js', browser: true, note: 'web/ 构建产物（IIFE）' },
]

// 政策附表硬编码（与 _assess_delay.js 同源，已验证自洽）
// [出生年, 出生月, 延迟月数, 退休时间]
const CASES = {
  male: { gt: 'male', baseAge: 60, cases: [
    [1965, 1, 1, '2025-02'], [1965, 4, 1, '2025-05'], [1965, 5, 2, '2025-07'],
    [1965, 9, 3, '2025-12'], [1965, 12, 3, '2026-03'], [1966, 1, 4, '2026-05'],
    [1966, 9, 6, '2027-03'], [1968, 5, 11, '2029-04'], [1973, 1, 25, '2035-02'],
    [1976, 9, 36, '2039-09'], [1977, 1, 36, '2040-01'],
  ]},
  fc: { gt: 'fc', baseAge: 55, cases: [
    [1970, 1, 1, '2025-02'], [1970, 5, 2, '2025-07'], [1970, 9, 3, '2025-12'],
    [1971, 5, 5, '2026-10'], [1981, 9, 36, '2039-09'],
  ]},
  fw55: { gt: 'fw55', baseAge: 55, cases: [
    [1970, 1, 1, '2025-02'], [1970, 5, 2, '2025-07'], [1970, 9, 3, '2025-12'],
    [1976, 1, 19, '2032-08'], [1981, 9, 36, '2039-09'],
  ]},
}

// fw（原50岁女职工）为 P3 未修项，单独列为「已知偏差」不计入失败
const FW_KNOWN = [
  [1975, 1, 1, '2025-02'], [1984, 12, 60, '2039-12'],
]

const ROOT = path.join(__dirname, '..')
const { getConfig } = require(ROOT + '/cloudfunctions/calculate/provinces-data.js')
const cfg = getConfig('jilin')

function loadEngine(rel, browser) {
  const abs = path.join(ROOT, rel)
  delete require.cache[require.resolve(abs)]
  if (browser) {
    // 根 engine.js / web/engine.js 是 IIFE，末尾 `window.PensionEngine = module.exports`
    global.window = {}
    global.document = global.document || { getElementById: () => null, querySelector: () => null }
    require(abs)
    return global.window.PensionEngine
  }
  const m = require(abs)
  return m.calculate ? m : (m.default || m)
}

function runOne(eng, gt, by, bm, baseAge) {
  const r = eng.calculate(cfg, {
    gender: gt === 'male' ? 'male' : 'female', genderType: gt,
    birthYear: by, birthMonth: bm,
    workYear: 2000, workMonth: 7, avgIndex: 1, cityType: null,
  }).legal
  const delay = Math.round((r.age - baseAge) * 12)
  const date = `${r.date.year}-${String(r.date.month).padStart(2, '0')}`
  return { delay, date }
}

let totalPass = 0, totalFail = 0
const summary = []

console.log('═════ 逐副本政策附表验证 ═════\n')

for (const t of TARGETS) {
  let eng
  try {
    eng = loadEngine(t.file, t.browser)
  } catch (e) {
    console.log(`【${t.file}】 ${t.note}\n  ❌ 加载失败: ${e.message.split('\n')[0].slice(0, 90)}\n`)
    totalFail++
    summary.push([t.file, '加载失败'])
    continue
  }
  if (typeof eng.calculate !== 'function') {
    console.log(`【${t.file}】 ${t.note}\n  ⚠️ 无 calculate 导出，跳过\n`)
    continue
  }

  let pass = 0, fail = 0
  const bad = []
  for (const key of Object.keys(CASES)) {
    const g = CASES[key]
    for (const [by, bm, expDelay, expDate] of g.cases) {
      const got = runOne(eng, g.gt, by, bm, g.baseAge)
      const ok = got.delay === expDelay && got.date === expDate
      if (ok) pass++
      else {
        fail++
        bad.push(`${g.gt} ${by}-${String(bm).padStart(2, '0')} 期望${expDelay}/${expDate} 实得${got.delay}/${got.date}`)
      }
    }
  }
  // P3 已知偏差：只记录，不计入失败
  let knownDiff = 0
  for (const [by, bm, expDelay, expDate] of FW_KNOWN) {
    const got = runOne(eng, 'fw', by, bm, 50)
    if (got.delay !== expDelay || got.date !== expDate) knownDiff++
  }

  totalPass += pass
  totalFail += fail
  const flag = fail === 0 ? '✅' : '❌'
  console.log(`【${t.file}】 ${t.note}`)
  console.log(`  政策附表：${pass} 通过 / ${fail} 失败  ${flag}    （fw 已知未修偏差 ${knownDiff}/${FW_KNOWN.length}）`)
  if (bad.length) bad.slice(0, 4).forEach(b => console.log(`    ❌ ${b}`))
  summary.push([t.file, fail === 0 ? 'PASS' : 'FAIL'])
  console.log('')
}

console.log('═════ 汇总 ═════')
summary.forEach(([f, s]) => console.log(`  ${s === 'PASS' ? '✅' : '❌'}  ${f}`))
console.log(`\n合计：${totalPass} 通过 / ${totalFail} 失败（不含 fw 的 P3 已知偏差）`)
