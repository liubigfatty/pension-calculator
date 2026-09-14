/**
 * 给验算脚本注入 --update 模式（一键刷新期望值）
 *
 * 背景：引擎口径修正（如 2026-09-14 计发月数改按月折算）后，
 *       各验算脚本里几十处快照期望值会集体失效。手工改易漏易错，
 *       故给每个脚本的 ok() 注入「用当前实际值回写源码」的能力。
 *
 * 用法：
 *   node scripts/_inject_update_mode.js          # 注入（幂等）
 *   node scripts/_verify_minyears.js --update    # 刷新该脚本的期望值
 *   node scripts/_verify_minyears.js             # 正常校验
 *
 * 原理：ok() 内用 Error().stack 拿调用者行号 → 回写该行第 3 个参数（期望值）。
 * 约束：目标脚本的 ok 签名必须是 ok(name, actual, expected, tol)。
 *       （_verify_base_growth 用布尔 cond 签名，不适用，需手工维护）
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

const TARGETS = [
  'scripts/_verify_minyears.js',
  'scripts/_verify_lever.js',
  'scripts/_verify_tiers.js',
  'scripts/_verify_timing.js',
]

const MARK_BEGIN = '// >>> BEGIN UPDATE-MODE'
const MARK_END = '// <<< END UPDATE-MODE'

const HOOK_LINE = `  if (__UM) { try { const __m = ((new Error().stack || '').split('\\n')[2] || '').match(/:(\\d+):\\d+/); if (__m) __UMREC.push({ line: +__m[1], actual: __A__, expected: __E__, tol: __T__ }) } catch (e) {} }`

function buildWriter(fname) {
  return `
${MARK_BEGIN} — 回写器：把当前实际值写回源码期望值
if (__UM && __UMREC.length) {
  const __fs = require('fs')
  const __p = require('path').join(__dirname, '${fname}')
  const __raw = __fs.readFileSync(__p, 'utf8')
  const __eol = __raw.includes('\\r\\n') ? '\\r\\n' : '\\n'
  const __lines = __raw.split(/\\r?\\n/)
  const __seen = new Set()
  // 同一源码行被调用多次 = 循环内断言（如按档位遍历），
  // 回写只会留下第一次的值并把其余改坏 ⇒ 一律跳过，交人工处理
  const __dup = new Set()
  const __cnt = {}
  for (const r of __UMREC) { __cnt[r.line] = (__cnt[r.line] || 0) + 1; if (__cnt[r.line] > 1) __dup.add(r.line) }
  let __n = 0, __skip = 0
  // 括号/引号感知：找第 3 个参数（期望值）的起止位置
  const thirdArgRange = (L) => {
    const si = L.indexOf('ok(')
    if (si < 0) return null
    let depth = 0, inStr = null, commas = []
    for (let i = si + 3; i < L.length; i++) {
      const c = L[i]
      if (inStr) { if (c === inStr) inStr = null; continue }
      if (c === '"' || c === "'" || c === '\`') { inStr = c; continue }
      if (c === '(' || c === '[') depth++
      else if (c === ')' || c === ']') { if (depth === 0) break; depth-- }
      else if (c === ',' && depth === 0) commas.push(i)
    }
    if (commas.length < 2) return null
    const start = commas[1] + 1
    let end = L.length, d2 = 0, s2 = null
    for (let i = start; i < L.length; i++) {
      const c = L[i]
      if (s2) { if (c === s2) s2 = null; continue }
      if (c === '"' || c === "'" || c === '\`') { s2 = c; continue }
      if (c === '(' || c === '[') d2++
      else if (c === ')' || c === ']') { if (d2 === 0) { end = i; break } d2-- }
      else if (c === ',' && d2 === 0) { end = i; break }
    }
    return { start, end }
  }
  for (const r of __UMREC) {
    if (__seen.has(r.line)) continue
    __seen.add(r.line)
    // 循环行 / 跨行调用 / 非数字期望值：跳过，避免改坏
    if (__dup.has(r.line)) { __skip++; continue }
    const L = __lines[r.line - 1]
    if (!L) continue
    const rg = thirdArgRange(L)
    if (!rg) { __skip++; continue }
    const oldTxt = L.slice(rg.start, rg.end)
    // 注意：本段在模板字符串内，正则里的反斜杠必须写成 \\ 才能原样输出到目标文件
    if (!/^\\s*-?[\\d.]+\\s*$/.test(oldTxt)) { __skip++; continue }
    // 精度自适应容差：tol 越小保留越多小数位，否则下次会因四舍五入再次失败
    const tol = typeof r.tol === 'number' ? r.tol : 0.02
    const digits = tol > 0 ? Math.min(8, Math.max(2, Math.ceil(-Math.log10(tol)) + 1)) : 6
    const nv = String(+r.actual.toFixed(digits))
    if (oldTxt.trim() === nv) continue
    // 只替换第 3 个参数本身；绝不碰 label 文本（label 里的数字由人工维护）
    __lines[r.line - 1] = L.slice(0, rg.start) + ' ' + nv + L.slice(rg.end)
    __n++
  }
  __fs.writeFileSync(__p, __lines.join(__eol), 'utf8')
  console.log('\\n🔄 [UPDATE] 已刷新 ' + __n + ' 处期望值 → ${fname}（跳过 ' + __skip + ' 处：循环行/跨行/非数字，需人工）')
  if (__dup.size) console.log('   ⚠️ 循环内断言行（需人工核对）：' + Array.from(__dup).join(', '))
}
${MARK_END}
`
}

let done = 0, skipped = 0, failed = 0
for (const rel of TARGETS) {
  const abs = path.join(ROOT, rel)
  if (!fs.existsSync(abs)) { console.log('❌ 不存在：' + rel); failed++; continue }
  let src = fs.readFileSync(abs, 'utf8')
  if (src.includes(MARK_BEGIN)) { console.log('⏭  已注入，跳过：' + rel); skipped++; continue }

  // 支持两种写法：const ok = (...) => {   /   function ok(...) {
  const okRe = /^((?:const\s+ok\s*=\s*\([^)]*\)\s*=>\s*\{|function\s+ok\s*\([^)]*\)\s*\{)\r?\n)/m
  const okMatch = src.match(okRe)
  if (!okMatch) { console.log('❌ 找不到 ok 定义：' + rel); failed++; continue }
  const params = okMatch[0].match(/\(([^)]*)\)/)[1]
    .split(',').map(s => s.trim().split('=')[0].trim())
  if (params.length < 3) { console.log('❌ ok 参数少于 3 个：' + rel); failed++; continue }
  // 注意：占位符须用 split/join 全量替换（String.replace 只替换首次出现）
  const hook = HOOK_LINE
    .split('__A__').join(params[1])
    .split('__E__').join(params[2])
    .split('__T__').join(params[3] || 'undefined')

  // 1) ok 定义体首行插入 hook
  src = src.replace(okRe, '$1' + hook + '\n')

  // 2) ok 定义之前插入 __UM 声明
  const umDecl = `\n${MARK_BEGIN}\nconst __UM = typeof process !== 'undefined' && process.argv.includes('--update')\nconst __UMREC = []\n${MARK_END}\n\n`
  const okIdx = src.search(okRe)
  src = src.slice(0, okIdx) + umDecl + src.slice(okIdx)

  // 3) 末尾追加回写器
  src = src.replace(/\s*$/, '\n' + buildWriter(path.basename(rel)))

  // 4) 脚本末尾若有 process.exit()，必须在 --update 时跳过，否则回写器来不及执行
  src = src.replace(/^process\.exit\((.*)\)\s*\r?$/m, 'if (!__UM) process.exit($1)')

  fs.writeFileSync(abs, src, 'utf8')
  console.log(`✅ 已注入：${rel}  (ok 参数: ${params.join(', ')})`)
  done++
}
console.log(`\n✨ 注入完成：新增 ${done} / 跳过 ${skipped} / 失败 ${failed}`)
console.log('下一步：node scripts/_verify_xxx.js --update  然后  node scripts/_verify_xxx.js（正常校验）')
