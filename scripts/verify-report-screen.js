// 验证报告屏显回归修复：A1/A2/B1
// A1: report.wxml 不再写死"40-45%"，改用动态 {{replaceRateDesc}}
// A2: report.wxml 退休前工资改用 {{estPreRetireSalary}}（非 baseRetireStr）
// B1: report.js 的 setData 顶层须含 medicareRequirement（WXML 医保行引用）
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const wxml = fs.readFileSync(path.join(root, 'miniprogram/pages/report/report.wxml'), 'utf8')
const js = fs.readFileSync(path.join(root, 'miniprogram/pages/report/report.js'), 'utf8')

let pass = 0, fail = 0
function assert(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg) }
  else { fail++; console.log('  ✗ ' + msg) }
}

// --- A1: WXML 不再写死 40-45% ---
assert(!/40-45%|40—45%|全国平均水平（40/.test(wxml), 'A1: WXML 已移除写死的"40-45%"')
assert(/\{\{\s*replaceRateDesc\s*\}\}/.test(wxml), 'A1: WXML 替代率说明使用动态 {{replaceRateDesc}}')

// --- A2: WXML 退休前工资用 estPreRetireSalary ---
assert(/\{\{\s*estPreRetireSalary\s*\}\}/.test(wxml), 'A2: WXML 退休前工资引用 {{estPreRetireSalary}}')
assert(!/rate-value[^>]*>约¥\{\{baseRetireStr\}\}/.test(wxml), 'A2: WXML 退休前工资不再误用 {{baseRetireStr}}')

// --- B1: report.js setData 顶层含 medicareRequirement ---
const m = js.match(/this\.setData\(\{([\s\S]*?)\n    \}\)/)
const setDataBlock = m ? m[1] : ''
// 顶层 key：缩进 6 空格、行形如 key, 或 key:
const topKeys = new Set()
setDataBlock.split('\n').forEach(line => {
  const mm = line.match(/^      ([a-zA-Z_$][\w$]*)\s*[:,]/)
  if (mm) topKeys.add(mm[1])
})
assert(topKeys.has('medicareRequirement'), 'B1: setData 顶层含 medicareRequirement（WXML 医保行需引用）')
assert(topKeys.has('replaceRateDesc'), 'A1: setData 含 replaceRateDesc')
assert(topKeys.has('estPreRetireSalary'), 'A2: setData 含 estPreRetireSalary')
assert(topKeys.has('medicareLabel') && topKeys.has('medicareYears') && topKeys.has('medicareMet'),
  'B1: setData 含其余医保字段(medicareLabel/Years/Met)')

// WXML 医保行引用 medicareRequirement 的位置（127/163）仍存在
assert(/medicareRequirement/.test(wxml), 'B1: WXML 医保建议行引用 {{medicareRequirement}}')

console.log('\n结果: ' + pass + ' passed, ' + fail + ' failed')
process.exit(fail > 0 ? 1 : 0)
