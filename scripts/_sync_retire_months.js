/**
 * 同步 getRetireMonths（2026-09-14 按月线性折算口径）
 *
 * 背景：原实现「四舍五入到整岁再查表」，60岁3个月取 139（应 137.3），
 *       延迟退休人群个人账户养老金被系统性低估约 1.3%。
 * 新实现：整岁基准表（国发〔2005〕38号）+ 非整岁按月线性折算（保留1位小数）
 *        + 精细表优先（总月数键 "723" / 岁月键 "60.3"）
 *
 * 用法：node scripts/_sync_retire_months.js [--dry]
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const DRY = process.argv.includes('--dry')

const SRC = 'engine/pension-engine.js'
const TARGETS = [
  'cloudfunctions/calculate/pension-engine.js',
  'engine.js',
  'docs/js/pension-engine.js',
  'docs/js/pension-engine-browser.js',
  'docs/网页版/js/pension-engine-browser.js',
  'web/engine.js',
]

// 从源码抽取 getRetireMonths 整函数（含其上方 JSDoc 注释块）
function extract(src) {
  const marker = 'function getRetireMonths(ageExact, config) {'
  const idx = src.indexOf(marker)
  if (idx < 0) throw new Error('源码中找不到 getRetireMonths')
  // 找函数起始的 `{`，做括号匹配
  const open = src.indexOf('{', idx)
  let depth = 0, end = -1
  for (let i = open; i < src.length; i++) {
    const ch = src[i]
    if (ch === '{') depth++
    else if (ch === '}') { depth--; if (depth === 0) { end = i + 1; break } }
  }
  if (end < 0) throw new Error('括号匹配失败')
  // 向上吸收紧邻的 JSDoc 注释块
  let start = idx
  const before = src.slice(0, idx).replace(/\s+$/, '')
  const docEnd = before.lastIndexOf('*/')
  if (docEnd >= 0) {
    const docStart = before.lastIndexOf('/**', docEnd)
    if (docStart >= 0) start = docStart
  }
  return src.slice(start, end)
}

// 用新函数替换目标文件中的同名函数（含其 JSDoc）
function replace(target, newFn) {
  const marker = 'function getRetireMonths(ageExact, config)'
  const idx = target.indexOf(marker)
  if (idx < 0) return { ok: false, msg: '未找到 getRetireMonths' }
  const open = target.indexOf('{', idx)
  let depth = 0, end = -1
  for (let i = open; i < target.length; i++) {
    const ch = target[i]
    if (ch === '{') depth++
    else if (ch === '}') { depth--; if (depth === 0) { end = i + 1; break } }
  }
  if (end < 0) return { ok: false, msg: '括号匹配失败' }
  let start = idx
  const before = target.slice(0, idx).replace(/\s+$/, '')
  const docEnd = before.lastIndexOf('*/')
  if (docEnd >= 0) {
    const docStart = before.lastIndexOf('/**', docEnd)
    if (docStart >= 0) start = docStart
  }
  return { ok: true, out: target.slice(0, start) + newFn + target.slice(end) }
}

const srcPath = path.join(ROOT, SRC)
const newFn = extract(fs.readFileSync(srcPath, 'utf8'))
console.log('📤 源码函数（engine/pension-engine.js）：' + newFn.split('\n').length + ' 行\n')

let fail = 0
for (const rel of TARGETS) {
  const abs = path.join(ROOT, rel)
  if (!fs.existsSync(abs)) { console.log('❌ 不存在：' + rel); fail++; continue }
  const raw = fs.readFileSync(abs, 'utf8')
  if (raw.includes('非整岁：按月线性折算')) {
    console.log('⏭  已是新版，跳过：' + rel)
    continue
  }
  const r = replace(raw, newFn)
  if (!r.ok) { console.log('❌ ' + rel + ' — ' + r.msg); fail++; continue }
  if (!DRY) {
    const eol = raw.includes('\r\n') ? '\r\n' : '\n'
    fs.writeFileSync(abs, r.out.split(/\r?\n/).join(eol), 'utf8')
  }
  console.log('✅ ' + rel + (DRY ? '（dry-run）' : ' 已写入'))
}
console.log(fail ? `\n❌ ${fail} 个文件失败` : '\n✨ 同步完成')
