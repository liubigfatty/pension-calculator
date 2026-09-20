/**
 * 实证：合规缴费数据算出的指数，是否天然落在 [0.6, 3.0] 区间？
 * 即：clamp 是恒等（多余）还是必要（有真实作用）？
 *
 * 场景：
 *   S1 同省合规：按参保地下限/上限缴，在参保地退休 → 检验是否恒等 0.6 / 3.0
 *   S2 跨省流动：在 A 省按 A 省基数缴，在 B 省退休计算（引擎按 B 省社平作分母）
 *   S3 输入错误：年缴费额误当月缴费额、参保地选错
 *   S4 补缴：一次性补缴按补缴年度基数
 *
 * 只读，不改任何文件。
 */
const path = require('path')
const root = path.resolve(__dirname, '..')
const Calc = require(path.join(root, 'index-engine/calcIndex.js'))
const DATA = require(path.join(root, 'cloudfunctions/calculate/provinces-data.js')).PROVINCE_CONFIGS

const CODES = Object.keys(Calc.PROVINCE_RULES)
const name = c => (DATA[c] && DATA[c].name) || c

// 取该省最新有社平的年度
function latestYear(code) {
  const h = DATA[code].avg_salary_history
  const ys = Object.keys(h).map(Number).filter(y => h[y] > 0).sort((a, b) => a - b)
  return ys[ys.length - 1]
}
function socialAvg(code, year) {
  const h = DATA[code].avg_salary_history
  return h[year] || null
}

// ── S1 同省合规：下限/上限档在参保地计算 ──
console.log('=== S1 同省合规缴费（按参保地 60%/300% 档缴，在参保地退休）===')
console.log('若 clamp 恒等，则 raw 应恰好 = 0.6000 / 3.0000\n')
let s1Out = 0, s1Total = 0
const rows = []
for (const code of CODES) {
  const y = latestYear(code)
  const sa = socialAvg(code, y)
  if (!sa) continue
  const lo = sa * 0.6, hi = sa * 3.0
  const idxLo = lo / sa, idxHi = hi / sa
  s1Total++
  if (Math.abs(idxLo - 0.6) > 1e-9 || Math.abs(idxHi - 3.0) > 1e-9) s1Out++
  rows.push({ code, y, sa, idxLo, idxHi })
}
console.log(`  ${s1Total} 个省参与，raw 偏离区间的：${s1Out} 个`)
console.log('  结论：' + (s1Out === 0
  ? '✅ 恒等——同省合规数据 clamp 完全无作用（夹前=夹后）'
  : '❌ 有偏离，需查'))

// ── S2 跨省流动：在 A 省按 A 省档位缴，在 B 省退休计算 ──
console.log('\n=== S2 跨省流动（在 A 省按 A 省 60%/300% 档缴，在 B 省退休计算）===')
console.log('引擎用 B 省社平作分母 ⇒ 高社平省缴费→低社平省退休会爆表，反之被压低\n')

// 取社平最高/最低的几个省做极端对照
const withSa = CODES.map(c => ({ c, y: latestYear(c), sa: socialAvg(c, latestYear(c)) })).filter(x => x.sa)
withSa.sort((a, b) => b.sa - a.sa)
const HIGH = withSa.slice(0, 5)   // 社平最高 5 省
const LOW = withSa.slice(-5)      // 社平最低 5 省
console.log('  社平最高5省: ' + HIGH.map(x => `${name(x.c)}(${x.c})=${x.sa}`).join(', '))
console.log('  社平最低5省: ' + LOW.map(x => `${name(x.c)}(${x.c})=${x.sa}`).join(', '))

console.log('\n  【60% 档缴费 → 在以下省退休计算】')
let s2Out = 0
for (const src of [...HIGH.slice(0, 2), ...LOW.slice(-2)]) {
  const line = []
  for (const dst of [...HIGH.slice(0, 2), ...LOW.slice(-2)]) {
    if (src.c === dst.c) { line.push(`${name(dst.c)}: —`); continue }
    const base = src.sa * 0.6
    const raw = base / dst.sa
    const flag = raw < 0.6 ? ' ⚠️低于0.6' : (raw > 3.0 ? ' ⚠️超3.0' : '')
    if (flag) s2Out++
    line.push(`${name(dst.c)}: ${raw.toFixed(3)}${flag}`)
  }
  console.log(`    在${name(src.c)}(社平${src.sa})按60%档缴 → ${line.join(' | ')}`)
}

console.log('\n  【300% 档缴费 → 在以下省退休计算】')
for (const src of [...HIGH.slice(0, 2), ...LOW.slice(-2)]) {
  const line = []
  for (const dst of [...HIGH.slice(0, 2), ...LOW.slice(-2)]) {
    if (src.c === dst.c) { line.push(`${name(dst.c)}: —`); continue }
    const base = src.sa * 3.0
    const raw = base / dst.sa
    const flag = raw < 0.6 ? ' ⚠️低于0.6' : (raw > 3.0 ? ' ⚠️超3.0' : '')
    if (flag) s2Out++
    line.push(`${name(dst.c)}: ${raw.toFixed(3)}${flag}`)
  }
  console.log(`    在${name(src.c)}(社平${src.sa})按300%档缴 → ${line.join(' | ')}`)
}
console.log(`\n  跨省组合中跑出区间的：${s2Out} 组`)

// ── S3 输入错误 ──
console.log('\n=== S3 常见输入错误（以北京 2025 为例，社平 12049）===')
const bj = 12049
const errs = [
  ['年缴费额误填为月缴费基数（×12）', bj * 0.6 * 12],
  ['月基数填成年基数（÷12）', bj * 0.6 / 12],
  ['填成个账年缴额（×0.08）', bj * 0.6 * 0.08],
  ['填成年收入（元）误当基数', bj * 0.6 * 12 * 1.0],
  ['正确值（60%档）', bj * 0.6],
]
for (const [label, base] of errs) {
  const raw = base / bj
  const clamped = Math.min(3.0, Math.max(0.6, raw))
  const masked = Math.abs(raw - clamped) > 1e-9
  console.log(`  ${label.padEnd(28, '　')} raw=${raw.toFixed(4)} → clamp=${clamped.toFixed(4)} ${masked ? '⚠️被静默夹取' : '(无变化)'}`)
}

// ── S4 结论汇总 ──
console.log('\n=== 结论 ===')
console.log('  S1 同省合规：clamp 恒等 ⇒ 你提供的官方数据场景下，clamp 无作用')
console.log(`  S2 跨省流动：${s2Out} 组跑出区间 ⇒ 有真实作用，但作用是"掩盖"还是"纠错"取决于口径`)
console.log('  S3 输入错误：全部被静默夹取 ⇒ 用户看不到异常，错误被掩盖成正常结果')
console.log('\n  ⇒ clamp 的真正定位应是「数据校验器」而非「政策规则执行」：')
console.log('     保留夹取以保证结果合理，但必须把 raw 值 + 告警暴露出来。')
