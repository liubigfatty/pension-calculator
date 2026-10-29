/**
 * _probe_social_year_split.js — 社保年度分段取社平（粤/沪/鄂/吉）探针（只读）
 *
 * 背景：7-6 式省份一个自然年被劈成两个社保年度，上下半年用的缴费基数本就不同。
 *      但用户的录入通常是「某年 1 个月平均缴费基数」，而这个值到底代表什么，
 *      直接决定了新算法是改善还是恶化。本探针把四种组合全部跑出来。
 *
 * 场景（对同一个「一直按 100% 档参保」的人）：
 *   S1 真实录入    ：上半年 6 月 × 上年社平，下半年 6 月 × 本年社平  ← 真值
 *   S2 录入全年月均：一条记录，baseAvg = (上年社平 + 本年社平)/2     ← 最贴合 UI 语义
 *   S3 录入下半年值：一条记录，baseAvg = 本年社平                    ← 常见的"系统里查到的基数"
 *
 * 期望：
 *   S1 新/旧        → 新算法 = 1.0000（精确）
 *   S2 新 → 接近 1.0；旧 → 系统性偏低约 g/2
 *   S3 新 → 偏高约 g/2；旧 → = 1.0（旧算法恰好假设的就是这个形态）
 *
 * 用法： node index-engine/_probe_social_year_split.js
 */

const fs = require('fs')
const path = require('path')
const NEW = require(path.join(__dirname, 'calcIndex.js'))

const ROOT = path.join(__dirname, '..')
let OLD = null
try { OLD = require(path.join(__dirname, '_old_calcIndex_baseline.js')) } catch (e) { /* 无基线 */ }

const TARGETS = ['guangdong', 'shanghai', 'hubei', 'jilin']
const FROM = 2000, TO = 2020

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

function buildRows(h, mode) {
  const rows = []
  for (let y = FROM; y <= TO; y++) {
    const prev = h[y - 1] || h[y]
    const cur = h[y] || h[y + 1]
    if (!cur || cur <= 0) continue
    if (mode === 'S1') {
      if (prev && prev > 0) {
        rows.push({ year: y, months: 6, baseAvg: prev, startMonth: 1 })
        rows.push({ year: y, months: 6, baseAvg: cur, startMonth: 7 })
      } else {
        rows.push({ year: y, months: 12, baseAvg: cur })
      }
    } else if (mode === 'S2') {
      const avg = (prev && prev > 0) ? (prev + cur) / 2 : cur
      rows.push({ year: y, months: 12, baseAvg: avg })
    } else {
      rows.push({ year: y, months: 12, baseAvg: cur })
    }
  }
  return rows
}

function run(code, engine, rows) {
  const cfg = loadCfg(code)
  const r = engine.calculateIndex({ provinceConfig: cfg, provinceCode: code, contribution: rows, granularity: 'A' })
  if (r.error) return null
  return r.avgIndex
}

console.log('═'.repeat(96))
console.log('社保年度分段取社平 —— 三种录入口径 × 新旧算法对照')
console.log('═'.repeat(96))
console.log('省         S1真实(新)  S1(旧)  | S2月均(新)  S2(旧)  | S3下半年(新) S3(旧)  | 社平年均增幅')
console.log('─'.repeat(96))

const summary = []
for (const code of TARGETS) {
  const cfg = loadCfg(code)
  const h = pickHist(cfg)
  const s1 = buildRows(h, 'S1'), s2 = buildRows(h, 'S2'), s3 = buildRows(h, 'S3')
  const n1 = run(code, NEW, s1), o1 = OLD ? run(code, OLD, s1) : null
  const n2 = run(code, NEW, s2), o2 = OLD ? run(code, OLD, s2) : null
  const n3 = run(code, NEW, s3), o3 = OLD ? run(code, OLD, s3) : null
  // 平均年增幅（2000-2020）
  let gs = [], n = 0
  for (let y = FROM + 1; y <= TO; y++) {
    const a = h[y - 1], b = h[y]
    if (a && b && a > 0) { gs.push(b / a - 1); n++ }
  }
  const gAvg = gs.reduce((s, x) => s + x, 0) / (n || 1)
  const f = (x) => (x == null ? '  n/a  ' : x.toFixed(4).padStart(7))
  console.log(
    code.padEnd(12) +
    f(n1) + ' ' + f(o1) + '  |' +
    f(n2) + ' ' + f(o2) + '  |' +
    f(n3) + ' ' + f(o3) + '  | ' +
    (gAvg * 100).toFixed(2) + '%'
  )
  summary.push({ code, n1, o1, n2, o2, n3, o3, gAvg })
}

console.log('─'.repeat(96))
console.log('读法：')
console.log('  S1 = 真值。新算法应恰为 1.0000；旧算法会偏离。')
console.log('  S2 = 用户按「全年月平均基数」录入（UI 最常见的语义）。')
console.log('       ⇒ 新算法几乎精确，旧算法系统性**偏低**约 增幅/2 ⇒ **改造是改善**。')
console.log('  S3 = 用户按「下半年/系统显示基数」录入。')
console.log('       ⇒ 旧算法恰为 1.0，新算法偏高约 增幅/2 ⇒ 这种录入口径下改造会推高。')
console.log()
console.log('结论（自动判定）：')
for (const s of summary) {
  if (s.o2 == null) continue
  const gainS2 = Math.abs(s.n2 - 1) < Math.abs(s.o2 - 1)
  console.log(`  ${s.code.padEnd(12)} 月均口径(S2)：新偏离 ${((s.n2 - 1) * 100).toFixed(2)}% vs 旧偏离 ${((s.o2 - 1) * 100).toFixed(2)}% ⇒ ${gainS2 ? '✅ 新算法更准' : '⚠️ 旧算法更准'}`)
}
console.log()
console.log('⚠️ 给使用者的提示：7-6 式省份（粤/沪/鄂/吉）应尽量按**上下半年两条**录入；')
console.log('   若只能给一个值，应填「全年月平均」而不是「12 月当月的基数」。')
