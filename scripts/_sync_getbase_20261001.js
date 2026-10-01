/**
 * 2026-10-01 getBase 防倒退修复 · 同步到结构不同的副本
 *
 * 修复：城市单列、但该年本市未公布而全省已公布时，禁止直接吃全省当年值
 *       （长春 2026 典型案例：直接吃全省会让 2026 退休比 2025 退休少 52.88 元/月）。
 *       正确口径＝按「预发」沿用本市最后一个已公布值，官方公布后重算补差。
 *
 * 用法：node scripts/_sync_getbase_20261001.js [--dry]
 * 说明：
 *   - 与 engine/pension-engine.js **结构完全相同**的副本（仅缺本次改动）走整文件拷贝；
 *   - 结构不同（IIFE 产物，行号有偏移）的副本走「整函数替换」。
 *   - 改完必须跑：node --check → scripts/_verify_all_copies.js → scripts/_audit_all.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const DRY = process.argv.includes('--dry')
const SRC = path.join(ROOT, 'engine/pension-engine.js')

const srcText = fs.readFileSync(SRC, 'utf8')
const NL = (srcText.match(/\r\n/g) || []).length > (srcText.match(/\n/g) || []).length / 2 ? '\r\n' : '\n'

/** 按大括号配平提取顶层函数全文（含签名行） */
function extractFn(lines, name) {
  const start = lines.findIndex(l => l.trim().startsWith('function ' + name + '('))
  if (start < 0) return null
  let depth = 0, end = -1
  for (let i = start; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++
      else if (ch === '}') { depth--; if (depth === 0 && i > start) { end = i; break } }
    }
    if (end >= 0) break
  }
  return end < 0 ? null : { start, end, body: lines.slice(start, end + 1) }
}

const srcLines = srcText.split(/\r?\n/)
const newFn = extractFn(srcLines, 'getBase')
if (!newFn) { console.error('❌ 源引擎未找到 getBase'); process.exit(1) }
if (!/citySeriesLive/.test(newFn.body.join('\n'))) {
  console.error('❌ 源 getBase 不含 citySeriesLive，确认改动已在源里'); process.exit(1)
}

// 结构完全相同 → 整文件拷贝
const COPY_TARGETS = [
  'cloudfunctions/calculate/pension-engine.js',
  'docs/js/pension-engine.js',
  'docs/网页版/js/pension-engine-browser.js',
]
// 结构不同（IIFE 产物）→ 整函数替换
const FN_TARGETS = ['engine.js', 'web/engine.js']

function backup(p) {
  const bak = p.replace(/\.js$/, '.js.bak-' + Date.now())
  fs.copyFileSync(p, bak)
  return bak
}

let n = 0
for (const rel of COPY_TARGETS) {
  const abs = path.join(ROOT, rel)
  if (!fs.existsSync(abs)) { console.log('⏭  不存在，跳过:', rel); continue }
  const cur = fs.readFileSync(abs, 'utf8')
  if (/citySeriesLive/.test(cur)) { console.log('✅ 已含修复:', rel); continue }
  if (DRY) { console.log('[dry] 将整文件覆盖:', rel); n++; continue }
  const bak = backup(abs)
  fs.writeFileSync(abs, srcText, 'utf8')
  console.log('✅ 已覆盖:', rel, '（备份', path.basename(bak), '）')
  n++
}

for (const rel of FN_TARGETS) {
  const abs = path.join(ROOT, rel)
  if (!fs.existsSync(abs)) { console.log('⏭  不存在，跳过:', rel); continue }
  const text = fs.readFileSync(abs, 'utf8')
  if (/citySeriesLive/.test(text)) { console.log('✅ 已含修复:', rel); continue }
  const lines = text.split(/\r?\n/)
  const oldFn = extractFn(lines, 'getBase')
  if (!oldFn) { console.log('⚠️  未找到 getBase，跳过:', rel); continue }
  // ⚠️ 换行符必须用「目标文件自己」的，不能用源的：
  //    根 engine.js 是 CRLF，源是 LF —— 用源的会把整个文件刷成 LF，diff 炸成 4744 行噪音。
  const targetNL = (text.match(/\r\n/g) || []).length > (text.match(/\n/g) || []).length / 2 ? '\r\n' : '\n'
  const out = [...lines.slice(0, oldFn.start), ...newFn.body, ...lines.slice(oldFn.end + 1)].join(targetNL)
  if (DRY) { console.log('[dry] 将替换 getBase:', rel, `（第 ${oldFn.start + 1}–${oldFn.end + 1} 行）`); n++; continue }
  const bak = backup(abs)
  fs.writeFileSync(abs, out, 'utf8')
  console.log('✅ 已替换 getBase:', rel, `（原第 ${oldFn.start + 1}–${oldFn.end + 1} 行 → 新 ${newFn.body.length} 行，备份`, path.basename(bak), '）')
  n++
}

console.log(DRY ? `\n[dry] 待处理 ${n} 个文件` : `\n完成，处理 ${n} 个文件`)
