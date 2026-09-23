/**
 * 2026-09-14 引擎两处修复 · 同步到全部副本
 *
 * 修复 1：未来计发基数外推率 —— 由固定 2% 改为「按该省上一年已公布增幅」推断（inferGrowthRate）
 * 修复 2：getMinYears —— 2025-2029 退休应为 15 年（原实现一律判 20 年）
 *
 * 为什么不用「改源→自动同步」：仓库里 6 份引擎副本是手工拷贝的，行号不同
 * （web/engine.js 为 build-web.js 生成的 IIFE 产物，整体 +4 行），
 * 逐份做行级替换最稳。改完必须跑 scripts/_verify_all_copies.js。
 *
 * 用法：node scripts/_sync_engine_20260914.js [--dry]
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const DRY = process.argv.includes('--dry')

// 行级替换目标（与源 engine/pension-engine.js 结构一致的新版副本）
const TARGETS = [
  'engine/pension-engine.js',
  'cloudfunctions/calculate/pension-engine.js',
  'engine.js',
  'docs/网页版/js/pension-engine-browser.js',
]

// 旧版结构副本：getBase 落后（缺预发年规则/城市名归一化），整函数替换为源版本
const FULL_GETBASE_TARGETS = [
  'docs/js/pension-engine.js',
  'docs/js/pension-engine-browser.js',
]

/** 从源文件中提取一个顶层函数（按大括号配平） */
function extractFn(srcLines, name) {
  const start = srcLines.findIndex(l => l.startsWith('function ' + name + '('))
  if (start < 0) return null
  let depth = 0, end = -1
  for (let i = start; i < srcLines.length; i++) {
    const line = srcLines[i]
    for (const ch of line) {
      if (ch === '{') depth++
      else if (ch === '}') { depth--; if (depth === 0 && i > start) { end = i; break } }
    }
    if (end >= 0) break
  }
  if (end < 0) return null
  return { body: srcLines.slice(start, end + 1), start, end }
}

/** 替换目标文件中的同名顶层函数 */
function replaceFn(lines, name, newBody) {
  const start = lines.findIndex(l => l.startsWith('function ' + name + '('))
  if (start < 0) return false
  let depth = 0, end = -1
  for (let i = start; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++
      else if (ch === '}') { depth--; if (depth === 0 && i > start) { end = i; break } }
    }
    if (end >= 0) break
  }
  if (end < 0) return false
  lines.splice(start, end - start + 1, ...newBody)
  return true
}

// ---------- 替换片段 ----------
const MIN_YEARS_NEW = [
  '  // 默认逻辑（政策：《国务院关于渐进式延迟法定退休年龄的办法》第二条 +',
  '  //          人社部《延迟法定退休年龄30问》第11、12条）',
  '  //   2029-12-31 前退休：最低缴费年限仍为 15 年',
  '  //   2030-01-01 起：每年提高 6 个月，15→20 年，2039 年起固定 20 年',
  '  // ⚠️ 修复 2026-09-14：原实现「retireYear >= 2025 一律返回 20」，',
  '  //    使 2025-2029 退休被误判为 20 年、2030-2038 缺失渐变档，仅四川因自带 min_years 表正确。',
  '  if (retireYear <= 2029) return 15',
  '  if (retireYear >= 2039) return 20',
  '  return 15 + (retireYear - 2029) * 0.5',
]

const INFER_FN = [
  '/**',
  ' * 推断「未来计发基数」的年增长率（外推率）',
  ' *',
  ' * 纪律（2026-09-14 立）：**未发布年份不写固定值**，一律按「上一年已公布的增幅」复合外推。',
  ' *   - 取该基数表最近两个已公布年份的增幅（即 rates[last] / rates[prev] - 1）',
  ' *   - 尾部「预发年」（与上一年同值，说明官方尚未公布新基数）不参与计算，往前跳过',
  ' *   - 夹到 [0, 3%]：个别省单年跳变（如新疆 2025 较 2024 +9.01%）不应把远期基数推到离谱',
  ' *   - 历史数据不足或异常 → 回退 config.growth_rate，再回退 0.02',
  ' *',
  ' * @param {Object} rates - 年份→基数 的映射（全省表或城市表）',
  ' * @param {Object} config - 省份配置',
  ' * @returns {number} 年增长率（小数）',
  ' */',
  'function inferGrowthRate(rates, config) {',
  '  const fallback = (config && config.growth_rate != null) ? config.growth_rate : 0.02',
  '  if (!rates || typeof rates !== \'object\') return fallback',
  '  const ks = Object.keys(rates).map(Number)',
  '    .filter(y => y >= 2000 && typeof rates[y] === \'number\' && isFinite(rates[y]) && rates[y] > 0)',
  '    .sort((a, b) => a - b)',
  '  // 跳过尾部预发年（与上一年同值）',
  '  while (ks.length > 2 && rates[ks[ks.length - 1]] === rates[ks[ks.length - 2]]) ks.pop()',
  '  if (ks.length < 2) return fallback',
  '  const last = ks[ks.length - 1]',
  '  const prev = ks[ks.length - 2]',
  '  const g = rates[last] / rates[prev] - 1',
  '  if (!isFinite(g)) return fallback',
  '  return Math.max(0, Math.min(g, 0.03))',
  '}',
  '',
]

// ---------- 行级替换 ----------
function patch(lines, file) {
  const log = []
  const findIdx = (pred, from = 0) => {
    for (let i = from; i < lines.length; i++) if (pred(lines[i])) return i
    return -1
  }

  // 1) getMinYears 默认逻辑
  let i = findIdx(l => l.trim() === 'if (retireYear < 2025) return 15')
  if (i < 0) { log.push('⏭  getMinYears 已修复或形态不符，跳过') }
  else {
    // 上一行是「// 默认逻辑」，下一行是 return 20，再下一行是 }
    const start = lines[i - 1] && lines[i - 1].trim() === '// 默认逻辑' ? i - 1 : i
    let end = i
    while (end < lines.length && lines[end].trim() !== '}') end++
    lines.splice(start, end - start, ...MIN_YEARS_NEW)
    log.push(`✅ getMinYears 已修复（原第 ${start + 1}-${end} 行）`)
  }

  // 2) GROWTH_RATE 定义
  i = findIdx(l => l.includes('const GROWTH_RATE = config.growth_rate != null ? config.growth_rate : 0.02'))
  if (i < 0) { log.push('⏭  GROWTH_RATE 已改造或形态不符，跳过') }
  else {
    const indent = (lines[i].match(/^\s*/) || [''])[0]
    lines.splice(i, 1,
      `${indent}// 外推率按「该省上一年已公布的增幅」推断（见 inferGrowthRate），不再固定 2%`,
      `${indent}const GROWTH_RATE = inferGrowthRate(provRates, config)`,
      `${indent}const CITY_GROWTH_RATE = cityRates ? inferGrowthRate(cityRates, config) : GROWTH_RATE`)
    log.push(`✅ GROWTH_RATE 已改造（原第 ${i + 1} 行）`)
  }

  // 3) 城市表向前找 → 用 CITY_GROWTH_RATE
  i = findIdx(l => l.includes('// 从城市表向前找'))
  if (i >= 0) {
    let j = findIdx(l => l.includes('return diff > 0 ? Math.round(baseVal * Math.pow(1 + GROWTH_RATE, diff)'), i)
    if (j >= 0 && j - i < 8) {
      lines[j] = lines[j].replace('1 + GROWTH_RATE', '1 + CITY_GROWTH_RATE')
      log.push(`✅ 城市表外推改用 CITY_GROWTH_RATE（第 ${j + 1} 行）`)
    }
  }

  // 4) year > lastYear 分支 → 用 useCity 选择增长率
  i = findIdx(l => l.trim() === 'const diff = year - lastYear')
  if (i >= 0 && lines[i + 1] && lines[i + 1].includes('Math.pow(1 + GROWTH_RATE, diff)')) {
    const indent = (lines[i].match(/^\s*/) || [''])[0]
    lines.splice(i + 1, 1,
      `${indent}const g = useCity ? CITY_GROWTH_RATE : GROWTH_RATE`,
      lines[i + 1].replace('1 + GROWTH_RATE', '1 + g'))
    log.push(`✅ 远期外推按 useCity 选增长率（第 ${i + 1} 行）`)
  }

  // 5) 插入 inferGrowthRate 函数
  i = findIdx(l => l.trim() === '* 获取指定年份的计发基数')
  if (i < 0 || lines.some(l => l.includes('function inferGrowthRate'))) {
    log.push('⏭  inferGrowthRate 已存在，跳过')
  } else {
    const docStart = i - 1 // '/**'
    lines.splice(docStart, 0, ...INFER_FN)
    log.push(`✅ inferGrowthRate 已插入（第 ${docStart + 1} 行起）`)
  }

  return log
}

const SRC = path.join(ROOT, 'engine', 'pension-engine.js')
const srcLines = fs.readFileSync(SRC, 'utf8').split(/\r?\n/)
const getBaseFn = extractFn(srcLines, 'getBase')
const inferFn = extractFn(srcLines, 'inferGrowthRate')
if (!getBaseFn || !inferFn) { console.error('❌ 源文件中未找到 getBase / inferGrowthRate'); process.exit(1) }

let fail = 0

// ---- A. 行级替换（新版结构） ----
for (const rel of TARGETS) {
  const abs = path.join(ROOT, rel)
  if (!fs.existsSync(abs)) { console.log('❌ 不存在：' + rel); fail++; continue }
  const raw = fs.readFileSync(abs, 'utf8')
  const eol = raw.includes('\r\n') ? '\r\n' : '\n'
  const lines = raw.split(/\r?\n/)
  const before = lines.length
  const log = patch(lines, rel)
  console.log('\n=== ' + rel + (DRY ? '（dry-run）' : '') + ' ===')
  log.forEach(l => console.log('   ' + l))
  if (!DRY) {
    fs.writeFileSync(abs, lines.join(eol), 'utf8')
    console.log(`   💾 已写入（${before} → ${lines.length} 行）`)
  }
}

// ---- B. 旧版结构：整函数替换 getBase + 插入 inferGrowthRate + 修 getMinYears ----
for (const rel of FULL_GETBASE_TARGETS) {
  const abs = path.join(ROOT, rel)
  if (!fs.existsSync(abs)) { console.log('❌ 不存在：' + rel); fail++; continue }
  const raw = fs.readFileSync(abs, 'utf8')
  const eol = raw.includes('\r\n') ? '\r\n' : '\n'
  const lines = raw.split(/\r?\n/)
  const before = lines.length
  const log = []

  // B1. getMinYears 行级修复
  const mi = lines.findIndex(l => l.trim() === 'if (retireYear < 2025) return 15')
  if (mi >= 0) {
    const start = lines[mi - 1] && lines[mi - 1].trim() === '// 默认逻辑' ? mi - 1 : mi
    let end = mi
    while (end < lines.length && lines[end].trim() !== '}') end++
    lines.splice(start, end - start, ...MIN_YEARS_NEW)
    log.push(`✅ getMinYears 已修复（原第 ${start + 1}-${end} 行）`)
  }

  // B2. getBase 整函数替换为源版本
  if (replaceFn(lines, 'getBase', getBaseFn.body)) {
    log.push(`✅ getBase 整函数替换为源版本（${getBaseFn.body.length} 行，含预发年规则 + 城市名归一化）`)
  } else {
    log.push('❌ getBase 替换失败')
  }

  // B3. 插入 inferGrowthRate（紧跟 getBase 之后）
  const gbIdx = lines.findIndex(l => l.startsWith('function getBase('))
  if (gbIdx >= 0 && !lines.some(l => l.includes('function inferGrowthRate'))) {
    let depth = 0, end = -1
    for (let i = gbIdx; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') depth++
        else if (ch === '}') { depth--; if (depth === 0 && i > gbIdx) { end = i; break } }
      }
      if (end >= 0) break
    }
    lines.splice(end + 1, 0, '', ...inferFn.body)
    log.push(`✅ inferGrowthRate 已插入（第 ${end + 2} 行起）`)
  }

  console.log('\n=== ' + rel + '（旧版结构·整函数同步）' + (DRY ? '（dry-run）' : '') + ' ===')
  log.forEach(l => console.log('   ' + l))
  if (!DRY) {
    fs.writeFileSync(abs, lines.join(eol), 'utf8')
    console.log(`   💾 已写入（${before} → ${lines.length} 行）`)
  }
}

console.log(fail ? `\n❌ ${fail} 个文件缺失` : '\n✨ 全部处理完成')
console.log('ℹ️  web/engine.js 由 scripts/build-web.js 生成，请单独重跑')
console.log('ℹ️  省份配置改动后需重跑 scripts/build-cloud-provinces.js')
