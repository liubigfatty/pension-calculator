// 导出 31 省「规则卡片」——引擎现行公式/参数的可核对快照
// 用途：拿这张表逐格对各省官网文件核（A 算例反演 + C 可疑点扫描的底稿）
// 只读，不改任何数据。用法：node scripts/_dump_rule_cards.js [省份key...]
const fs = require('fs')
const path = require('path')

const DIR = path.resolve('./cloudfunctions/calculate/provinces')
const files = fs.readdirSync(DIR).filter(f => /^[a-z_]+\.js$/.test(f))
const only = process.argv.slice(2)

const TARGETS = only.length ? only : null

function fmt(v) { return (v == null ? '—' : String(v)) }
function ym(o) { return o && o.year ? o.year + '-' + String(o.month || 1).padStart(2, '0') : '—' }

const rows = []
for (const f of files) {
  const key = f.replace(/\.js$/, '')
  if (TARGETS && !TARGETS.includes(key)) continue
  let mod
  try { mod = require(path.join(DIR, f)) } catch (e) { console.error('加载失败 ' + f + '：' + e.message); continue }
  const c = mod.getEngineConfig ? mod.getEngineConfig() : null
  if (!c) continue
  const m = c.modules || {}
  const b = m.basic_pension || {}
  const e = m.extra_pension || {}
  const t = m.transitional_pension || {}
  const p = m.personal_account || {}

  rows.push({
    key,
    name: c.name || key,
    account_start: ym(c.account_start),
    cutoff: ym(c.cutoff_date),
    usePre: c.usePreAccountYears === true ? '是' : '否',
    baseType: b.formula_type || '通用',
    baseRate: b.rate_per_year != null ? (b.rate_per_year * 100).toFixed(2) + '%' : '—',
    extraOn: e.enabled ? '有' : '无',
    extraTrig: e.trigger ? (e.trigger.type + '>' + e.trigger.threshold) : '—',
    extraBk: (e.brackets || []).map(x => x.from + '-' + (x.to || '+') + ':' + (x.rate * 100).toFixed(2) + '%').join(' / '),
    transOn: t.enabled ? '有' : '无',
    transCoef: t.coefficient_over_20 != null
      ? (t.coefficient_under_20 * 100).toFixed(1) + '%→' + (t.coefficient_over_20 * 100).toFixed(1) + '%'
      : (t.coefficient != null ? (t.coefficient * 100).toFixed(1) + '%' : '—'),
    persOn: p.enabled ? '有' : '无',
    notes: (typeof c.notes === 'string' ? c.notes : Array.isArray(c.notes) ? c.notes.join('；') : '').replace(/\s+/g, ' ').slice(0, 150),
  })
}

// 汇总表
const cols = [
  ['name', '省'], ['account_start', '建账年'], ['cutoff', '视同截止'], ['usePre', '建账前年限入基'],
  ['baseType', '基础式'], ['baseRate', '每年级率'], ['extraOn', '长缴增发'], ['extraTrig', '触发'],
  ['transOn', '过渡性'], ['transCoef', '过渡系数'], ['persOn', '个账'],
]
const w = {}
for (const [k, label] of cols) w[k] = Math.max(label.length * 2, ...rows.map(r => String(r[k]).length))

function line(a) { return '| ' + a.join(' | ') + ' |' }
console.log('# 引擎规则卡片（' + rows.length + ' 省）\n')
console.log(line(cols.map(([k, l]) => l)))
console.log('|' + cols.map(([k]) => '-'.repeat(w[k] + 2)).join('|') + '|')
for (const r of rows.sort((a, b) => a.key.localeCompare(b.key))) {
  console.log(line(cols.map(([k]) => String(r[k]))))
}

// C 扫描：可疑点检测
// ⚠️ 关键：modules 里「没有某个 key」≠ 引擎不启用，是走引擎默认值。
//    实测确认：河南 modules 无 personal_account / basic_pension 无 rate_per_year，
//    但引擎仍算出 personalAccount=585.22、basic 用 1.00% ⇒ 缺省≠关闭，别误报。
//   真正的可疑 = 「enabled:true 但缺 trigger/brackets」（配了却不生效）。
console.log('\n## ⚠️ 可疑点扫描\n')
let n = 0
for (const r of rows) {
  const s = []
  if (r.extraOn === '有' && (r.extraTrig === '—' || !r.extraBk)) s.push('长缴增发 enabled 但 trigger/brackets 为空 ⇒ 可能配了不生效')
  if (r.cutoff === '—') s.push('视同缴费截止缺失')
  if (r.account_start !== '—' && r.cutoff !== '—') {
    const ay = parseInt(r.account_start), cy = parseInt(r.cutoff)
    if (cy - ay > 1) s.push('建账年与视同截止相差 ' + (cy - ay) + ' 年（通常截止=建账前一月）')
  }
  if (r.transCoef === '—') s.push('过渡系数缺失')
  if (s.length) { console.log('- **' + r.name + '**（' + r.key + '）：' + s.join('；')); n++ }
}
if (!n) console.log('（无）')

console.log('\n## 长缴增发档位明细\n')
for (const r of rows) if (r.extraOn === '有') console.log('- **' + r.name + '**（' + r.key + '）触发 ' + r.extraTrig + '：' + r.extraBk)

console.log('\n## 备注/特殊说明（notes 前 150 字）\n')
for (const r of rows) if (r.notes) console.log('- **' + r.name + '**：' + r.notes)
