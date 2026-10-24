/**
 * 【核查专项】广东「两头亏」算例的年限/基数口径
 *
 * 官方核定表（广州市 1976-05 生女职工，1997-08 参工，2026-05 退休）：
 *   基础 1456.68 / 个人 388.85 / 过渡性 150.08（= 新办法 50.08 + 加发100）/ 合计 1995.61
 *   累计缴费年限 26 年 6 个月；1998-06 前缴费 11 个月（有视同缴费权益）
 *
 * 已知现象：引擎算 基础 1580.41 / 过渡性 145.35 / 合计 2114.61
 *   ⇒ 个人账户 388.85 精确命中，差异只在「年限」与「过渡性新办法金额」。
 *
 * 本脚本目的：定位差异到底来自 ①基数 ②总年限 ③过渡性年限 中的哪一个（或几个），
 *   并验证：把官方口径的年限注入后，三项是否全部命中。
 *
 * 用法：node scripts/_verify_gd_years_20261009.js
 */
const path = require('path')
const ROOT = path.resolve(__dirname, '..')
const { calculate } = require(path.join(ROOT, 'engine/pension-engine.js'))
const gd = require(path.join(ROOT, 'cloudfunctions/calculate/provinces/guangdong.js')).getEngineConfig()

const BASE_INPUT = {
  gender: 'female', genderType: 'fw50',
  birthYear: 1976, birthMonth: 5,
  workYear: 1997, workMonth: 8,
  retireDateInput: { year: 2026, month: 5 },
  avgIndex: 0.4343,
  personalAcc: 75825.65,
  months: 195,
  cityType: 'prov',
  city: '广州',
}

let pass = 0, fail = 0
function chk(tag, actual, expected, tol) {
  const ok = Math.abs(actual - expected) <= (tol == null ? 1 : tol)
  console.log((ok ? '  ✅ ' : '  ❌ ') + tag + '  实算=' + actual + '  官方=' + expected)
  ok ? pass++ : fail++
  return ok
}

function run(input, tag) {
  const r = calculate(gd, input)
  const L = r.legal || r
  console.log('\n--- ' + tag + ' ---')
  console.log('  退休: ' + L.date.year + '-' + L.date.month + ' | 总年限: ' + L.totalYears + ' | 实际年限: ' + L.actualYears)
  console.log('  基础: ' + L.basicPension.amount + '  「' + L.basicPension.description + '」')
  console.log('  个人: ' + L.personalAccount.amount)
  console.log('  过渡: ' + L.transitionalPension.amount + '  「' + L.transitionalPension.description + '」')
  console.log('  合计: ' + L.total)
  return L
}

console.log('################ ① 现状：不注入任何年限（引擎按参工连续推算） ################')
const a = run(Object.assign({}, BASE_INPUT, { baseRetire: 9493, baseProv: 9493 }), '引擎默认')

console.log('\n################ ② 注入官方「累计缴费年限 26.5 年」后 ################')
const b = run(Object.assign({}, BASE_INPUT, {
  baseRetire: 9493, baseProv: 9493,
  totalYears: 26.5, actualYears: 26.5,
}), '注入 totalYears=26.5')

console.log('\n################ ③ 反解：官方基础 1456.68 需要什么基数 ################')
{
  // 基础 = (B + B*idx)/2 * Y * 1%  ⇒  B = 基础 / (0.01 * Y * (1+idx)/2)
  const idx = 0.4343
  for (const Y of [26.5, 28.75, 28.8333]) {
    const B = 1456.68 / (0.01 * Y * (1 + idx) / 2)
    console.log('  若年限 Y=' + Y.toFixed(4) + ' ⇒ 需基数 B=' + B.toFixed(2))
  }
  console.log('  引擎实际用的基数（由 1580.41/28.75 反解）= ' + (1580.41 / (0.01 * 28.75 * (1 + idx) / 2)).toFixed(2))
}

console.log('\n################ ④ 过渡性：新办法加权年数反解 ################')
{
  // 过渡性新办法 = provBase * newYears * 0.012
  for (const B of [9493, 7665.3]) {
    console.log('  基数 ' + B + '：官方新办法 50.08 ⇒ newYears=' + (50.08 / (B * 0.012)).toFixed(4) +
                '；引擎 45.35 ⇒ newYears=' + (45.35 / (B * 0.012)).toFixed(4))
  }
  console.log('  视同权益月数 11 个月 = ' + (11 / 12).toFixed(4) + ' 年；引擎推算的 effectiveYears 见上方 desc')
}

console.log('\n################ ⑤ 官方口径全注入验证 ################')
{
  // 用官方年限 26.5 + 让 newMethodYears 命中官方新办法 50.08
  const B = 9493
  const newMethodYears = 50.08 / (B * 0.012)
  const c = run(Object.assign({}, BASE_INPUT, {
    baseRetire: B, baseProv: B,
    totalYears: 26.5, actualYears: 26.5,
    newMethodYears: newMethodYears,
  }), 'totalYears=26.5 + newMethodYears=' + newMethodYears.toFixed(4))
  console.log('  → 官方 基础1456.68 / 个人388.85 / 过渡150.08 / 合计1995.61')
  chk('基础养老金', c.basicPension.amount, 1456.68, 0.5)
  chk('个人账户养老金', c.personalAccount.amount, 388.85, 0.01)
  chk('过渡性养老金', c.transitionalPension.amount, 150.08, 0.5)
  chk('合计', c.total, 1995.61, 1)
}

console.log('\n=== ' + pass + ' / ' + (pass + fail) + ' ===')
if (fail) process.exit(1)
