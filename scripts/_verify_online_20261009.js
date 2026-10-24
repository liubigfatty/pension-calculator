/**
 * 验证「线上已部署的 calculate 云函数」是否真的生效（2026-10-09 部署后）
 *   前置：python scripts/_download_online_20261009.py <port>  拉回代码到 _tmp_download
 *   做法：① 源码特征断言（改的代码在不在） ② 用线上代码实算（改的行为对不对）
 *   ⚠️ 断言对象 = _tmp_download/（线上拉回版），不是本地 cloudfunctions/calculate/
 */
const fs = require('fs')
const path = require('path')

const D = (p) => path.resolve('./_tmp_download', p)
let pass = 0, fail = 0
function chk(tag, actual, expected, tol) {
  const ok = Math.abs(actual - expected) <= (tol == null ? 0.01 : tol)
  console.log((ok ? '  ✅ ' : '  ❌ ') + tag + ' 实算=' + actual + ' 期望=' + expected)
  ok ? pass++ : fail++
}
function has(tag, file, needle) {
  const t = fs.readFileSync(D(file), 'utf8')
  const ok = t.indexOf(needle) !== -1
  console.log((ok ? '  ✅ ' : '  ❌ ') + tag + '  [' + file + '] 含 "' + needle + '"')
  ok ? pass++ : fail++
  return t
}

console.log('══ 一、源码特征（线上代码确已更新）══')
has('上海·见分进角 jiaoCeil', 'pension-engine.js', 'function jiaoCeil')
has('上海·16号文口径（不保留历史分支）', 'pension-engine.js', '沪人社规〔2026〕16号')
has('江苏·三年过渡期已打开', 'provinces/jiangsu.js', "formula_type: 'jiangsu'")
has('福建·半段进整', 'provinces/fujian.js', 'years_half_step')
has('广东·2026 条件停发津贴', 'pension-engine.js', 'hasSightEntitlement')
has('重庆·1996前参工门槛', 'pension-engine.js', '1996-01-01前参保门槛')
has('黑龙江·御寒津贴已关闭', 'provinces/heilongjiang.js', "modules.special_addition = { enabled: false")

console.log('\n══ 二、用线上代码实算 ══')
const { calculate } = require(D('pension-engine.js'))
function cfg(p) {
  const m = require(D('provinces/' + p + '.js'))
  return m.getEngineConfig ? m.getEngineConfig() : m
}
function run(prov, input) {
  const r = calculate(cfg(prov), Object.assign({ province: prov, cityType: 'prov', retireType: 'standard' }, input))
  return r.legal || r
}

// ① 黑龙江：御寒津贴 45 不再计入
{
  const L = run('heilongjiang', {
    gender: 'male', birthYear: 1965, birthMonth: 1,
    workYear: 1982, workMonth: 8,
    retireDateInput: { year: 2025, month: 2 },
    avgIndex: 0.9705, personalAcc: 109716.46,
    baseRetire: 7570, baseProv: 7570,
    sightYears: 13.92, totalYears: 42.58, actualYears: 28.67, months: 138.4,
  })
  const sum3 = L.basicPension.amount + L.personalAccount.amount + L.transitionalPension.amount
  chk('黑龙江·specialAddition = 0（御寒津贴已移除）', L.specialAddition.amount, 0)
  chk('黑龙江·total = 三项之和（核定表口径）', L.total, Math.round(sum3 * 100) / 100, 0.01)
}

// ② 重庆：1996 前参工 + 持证 ⇒ 3%；1996 后 ⇒ 0；无视同仍给
{
  const base = {
    gender: 'male', birthYear: 1964, birthMonth: 12,
    retireDateInput: { year: 2025, month: 1 },
    avgIndex: 0.6270, personalAcc: 0,
    baseRetire: 8240, baseProv: 8240,
    sightYears: 13, totalYears: 40.8333, actualYears: 27.8333, months: 170,
    oneChild: true,
  }
  const a = run('chongqing', Object.assign({}, base, { workYear: 1983, workMonth: 1 }))
  const b3 = a.basicPension.amount + a.personalAccount.amount + a.transitionalPension.amount
  chk('重庆·1983参工+持证 ⇒ 3%', a.specialAddition.amount, Math.round(b3 * 0.03 * 100) / 100)
  const b = run('chongqing', Object.assign({}, base, { workYear: 2000, workMonth: 3 }))
  chk('重庆·2000参工+持证 ⇒ 0（1996门槛生效）', b.specialAddition.amount, 0)
  const c = run('chongqing', Object.assign({}, base, { workYear: 1983, workMonth: 1, sightYears: 0 }))
  chk('重庆·无视同缴费(过渡性=0)仍给 3%', c.specialAddition.amount > 0 ? 1 : 0, 1)
}

// ③ 上海：见分进角 + 16号文口径
{
  const L = run('shanghai', {
    gender: 'female', genderType: 'fw50',
    birthYear: 1976, birthMonth: 2,
    workYear: 2001, workMonth: 4,
    retireDateInput: { year: 2026, month: 2 },
    avgIndex: 1.5231, personalAcc: 307242,
    baseRetire: 12434, baseProv: 12434,
    totalYears: 23.9167, months: 195,
  })
  // 基础养老金应为"角"且为进位值
  const bp = L.basicPension.amount
  chk('上海·基础养老金已归到角', Math.round(bp * 10) / 10, bp, 0.0001)
  console.log('     基础=', bp, '| 个人=', L.personalAccount.amount, '| 合计=', L.total)
  console.log('     ' + (L.basicPension.description || '').slice(0, 120))
}

// ④ 江苏：三年过渡期（2024 发 40%）
{
  const L = run('jiangsu', {
    gender: 'female', genderType: 'fw50',
    birthYear: 1974, birthMonth: 6,
    workYear: 1992, workMonth: 10,
    retireDateInput: { year: 2024, month: 6 },
    avgIndex: 0.6238, transIndex: 0.9061, personalAcc: 70013.05,
    baseRetire: 8613, baseProv: 8613,
    pre1996Years: 2, sightYears: 2, totalYears: 20.3333, months: 195,
    transPensionOld: 80.88,
  })
  chk('江苏·2024年过渡性按40%折算 ≈123.45', L.transitionalPension.amount, 123.45, 0.1)
}

console.log('\n=== ' + pass + ' / ' + (pass + fail) + ' ===')
if (fail) process.exit(1)
