/**
 * 三份官方核定表逐项反演（用户 2026-10-09 提供的 3 张截图）
 *  ① 黑龙江 2024-11 退休 55岁女（黑人社函〔2023〕625号 计发基数 7010）
 *  ② 江苏南京 2024-06 退休 50岁女（1992-10 参工，20年4个月，指数 0.6238，备注：原办法过渡性 80.88）
 *  ③ 江苏南京 2024-06 退休 50岁女（2002-07 参工，22年0个月，指数 0.5341）
 * 目的：① 复核全国统一基础养老金公式无附加系数；② 实证江苏 2024 年 40% 过渡期规则。
 */
const path = require('path')
const { calculate } = require(path.resolve('./engine/pension-engine.js'))

function cfg(p) {
  const m = require(path.resolve('./cloudfunctions/calculate/provinces/' + p + '.js'))
  return m.getEngineConfig ? m.getEngineConfig() : m
}
let pass = 0, fail = 0
function chk(tag, actual, expected, tol) {
  const ok = Math.abs(actual - expected) <= (tol == null ? 1 : tol)
  console.log((ok ? '  ✅ ' : '  ❌ ') + tag + ' 实算=' + actual + ' 官方=' + expected)
  ok ? pass++ : fail++
}

// ============ ① 黑龙江 ============
console.log('① 黑龙江 2024-11 退休（55岁女，参工1992-02，视同71月/实际323月）')
{
  const r = calculate(cfg('heilongjiang'), {
    province: 'heilongjiang', gender: 'female', genderType: 'fw55',
    birthYear: 1969, birthMonth: 11,
    workYear: 1992, workMonth: 2,
    retireDateInput: { year: 2024, month: 11 },
    retireType: 'standard',
    baseRetire: 7010, baseProv: 7010,
    avgIndex: 2.8421,
    sightYears: 71 / 12, totalYears: 394 / 12, actualYears: 323 / 12,
    months: 170, personalAcc: 343270.80,
  })
  const l = r.legal || r
  console.log('   描述:', l.basicPension && l.basicPension.description)
  chk('基础养老金', l.basicPension.amount, 4421.52)
  chk('个人账户养老金', l.personalAccount.amount, 2019.24, 0.01)
  chk('过渡性养老金', l.transitionalPension.amount, 1414.54, 0.02)
  // ✅ 2026-10-09 已裁决：核定表「核定基本养老金合计」7855.30 = 三项之和，**不含御寒津贴 45 元**。
  //    用户拍板移除该项（heilongjiang.js 的 modules.special_addition 改为 enabled:false）
  //    ⇒ 实算 7855.30 与核定表口径一致。45 元仍按月发放，只是不并入"月基本养老金"计。
  chk('合计（核定表口径，不含御寒津贴45）', l.total, 7855.30, 0.02)
}

// ============ ② 江苏南京（有视同年限 + 原办法）============
console.log('② 江苏南京 2024-06 退休（50岁女，参工1992-10，20年4个月，指数 0.6238；备注原办法 80.88）')
{
  const r = calculate(cfg('jiangsu'), {
    province: 'jiangsu', gender: 'female', genderType: 'fw50',
    birthYear: 1974, birthMonth: 6,
    workYear: 1992, workMonth: 10,
    retireDateInput: { year: 2024, month: 6 },
    retireType: 'standard',
    baseRetire: 8613, baseProv: 8613,
    avgIndex: 0.6238,
    transIndex: 0.9061,
    pre1996Years: 2.0,
    sightYears: 2.0,
    totalYears: 244 / 12, actualYears: 244 / 12,
    months: 195, personalAcc: 70013.05,
    transPensionOld: 80.88,
  })
  const l = r.legal || r
  console.log('   描述:', l.transitionalPension && l.transitionalPension.description)
  chk('基础养老金', l.basicPension.amount, 1421.89)
  chk('个人账户养老金', l.personalAccount.amount, 359.04, 0.01)
  chk('过渡性养老金（40%折算后）', l.transitionalPension.amount, 123.48, 0.1)
  chk('合计', l.total, 1904.50)
}

// ============ ③ 江苏南京（无视同年限）============
console.log('③ 江苏南京 2024-06 退休（50岁女，参工2002-07，22年0个月，指数 0.5341）')
{
  const r = calculate(cfg('jiangsu'), {
    province: 'jiangsu', gender: 'female', genderType: 'fw50',
    birthYear: 1974, birthMonth: 6,
    workYear: 2002, workMonth: 7,
    retireDateInput: { year: 2024, month: 6 },
    retireType: 'standard',
    baseRetire: 8613, baseProv: 8613,
    avgIndex: 0.5341,
    pre1996Years: 0, sightYears: 0,
    totalYears: 22, actualYears: 22,
    months: 195, personalAcc: 77892.16,
  })
  const l = r.legal || r
  chk('基础养老金', l.basicPension.amount, 1453.45, 0.01)
  chk('个人账户养老金', l.personalAccount.amount, 399.45, 0.01)
  chk('过渡性养老金', l.transitionalPension.amount, 0, 0.01)
  chk('合计', l.total, 1852.90)
}

console.log('\n=== ' + pass + ' / ' + (pass + fail) + ' ===')
if (fail) process.exit(1)
