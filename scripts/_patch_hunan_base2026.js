/**
 * 湖南镜像 .json：删除 `base_rates.prov["2026"] = 6843`（4 个副本）
 *   6843 = 湘人社规〔2026〕14号的「2026年社会保险缴费基准值」（=2025全口径社平），
 *   原文只用于调整"缴费工资指数"，**不是计发基数**；2026 真实核定表用 7694/7699 实证。
 *   ⇒ 删键后引擎自动回退上年（2025=7694）。
 * ⚠️ 只在 `base_rates.prov` 段内操作，**绝不动 `avg_salary_history`**（那里 2026 也是 6843，语义不同）。
 * ⚠️ 按行处理，保留各行原始行尾。
 */
const fs = require('fs')
const path = require('path')

const FILES = [
  'provinces/hunan.json',
  'cloudfunctions/calculate/provinces/hunan.json',
  'docs/js/provinces/hunan.json',
  'docs/网页版/provinces/hunan.json',
]

const ROOT = path.resolve(__dirname, '..')

for (const rel of FILES) {
  const p = path.join(ROOT, rel)
  if (!fs.existsSync(p)) { console.log('⏭  (缺) ' + rel); continue }
  const t = fs.readFileSync(p, 'utf8')
  const lines = t.split('\n')

  // 定位 base_rates.prov 段
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*"base_rates"\s*:\s*\{/.test(lines[i])) { start = i; break }
  }
  if (start < 0) { console.log('❌ 未找到 base_rates：' + rel); continue }
  // 段结束：从 start 之后遇到的第一个与 "base_rates" 同缩进的 `}`（即 2 空格 + }）
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^ {2}\}/.test(lines[i])) { end = i; break }
  }

  // 在段内找 "2026": 6843
  let hit = -1
  for (let i = start; i < end; i++) {
    if (/^\s*"2026"\s*:\s*6843\s*,?\s*$/.test(lines[i])) { hit = i; break }
  }
  if (hit < 0) { console.log('✅ 无 2026 键（已处理过）：' + rel); continue }

  // 前一行若以逗号结尾 ⇒ 去掉（因为它成了最后一个键）
  const prev = lines[hit - 1]
  if (/,\s*$/.test(prev.replace(/\r$/, ''))) {
    lines[hit - 1] = prev.replace(/\r$/, '').replace(/,\s*$/, '') + (/\r$/.test(prev) ? '\r' : '')
  }
  lines.splice(hit, 1)
  fs.writeFileSync(p, lines.join('\n'))

  // 校验
  const m = JSON.parse(fs.readFileSync(p, 'utf8'))
  const br = m.base_rates.prov || m.base_rates
  const keys = Object.keys(br)
  console.log('✅ 已删 ' + rel + '  base 末3: ' + keys.slice(-3).map(k => k + '=' + br[k]).join(' ')
    + ' | ash[2026]=' + (m.avg_salary_history && m.avg_salary_history['2026']))
}
