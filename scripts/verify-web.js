#!/usr/bin/env node
// 验证网页端生成的 engine.js + provinces-bundle.js 能在浏览器同款 shim 下正确运行
global.window = {}
require('../web/engine.js')
require('../web/provinces-bundle.js')

const E = global.window.PensionEngine
const C = global.window.PROVINCE_CONFIGS

function run(label, province, input) {
  const config = C[province]
  if (!config) { console.log('❌', label, '省份配置缺失:', province); return }
  const r = E.calculate(config, input)
  const legal = r.legal, flex = r.flex
  console.log('──', label, '(' + province + ') ──')
  console.log('  法定:', legal.date.year + '-' + String(legal.date.month).padStart(2,'0'),
    '年龄', legal.ageStr, '计发月数', legal.months,
    '| 基础', Math.round(legal.basicPension.amount),
    '个人', Math.round(legal.personalAccount.amount),
    '过渡', Math.round((legal.transitionalPension && legal.transitionalPension.amount) || 0),
    '| 合计', Math.round(legal.total))
  console.log('  弹性提前:', flex.date.year + '-' + String(flex.date.month).padStart(2,'0'),
    '年龄', flex.ageStr,
    '| 合计', Math.round(flex.total),
    '| 可提前', r.comparison.flexAdvance, '个月', '差额', Math.round(r.comparison.amountDiff))
  // 合理性断言
  const ok = legal.total > 0 && flex.total > 0 && isFinite(legal.total) && isFinite(flex.total)
  console.log('  ', ok ? '✅' : '❌', '数值合理')
  return r
}

// 1) 北京 男 1970-06 出生，1995-07 工作，指数1.0，余额自动估算
run('北京男·标准', 'beijing', {
  gender: 'male', genderType: 'male',
  birthYear: 1970, birthMonth: 6, workYear: 1995, workMonth: 7,
  avgIndex: 1.0, personalAccInput: 0, cityType: 'prov'
})

// 2) 广东 企业女(50) 1975-03 出生，1998-01 工作，指数1.0，深圳计发基数
run('广东女50·深圳', 'guangdong', {
  gender: 'female', genderType: 'fw50',
  birthYear: 1975, birthMonth: 3, workYear: 1998, workMonth: 1,
  avgIndex: 1.0, personalAccInput: 0, cityType: 'shenzhen'
})

// 3) 辽宁 男 1968-09 出生，1990-07 工作，指数0.8，沈阳计发基数
run('辽宁男·沈阳', 'liaoning', {
  gender: 'male', genderType: 'male',
  birthYear: 1968, birthMonth: 9, workYear: 1990, workMonth: 7,
  avgIndex: 0.8, personalAccInput: 0, cityType: 'shenyang'
})

// 4) 吉林 女(55) 1972-11 出生，1996-05 工作，指数1.2，长春
run('吉林女55·长春', 'jilin', {
  gender: 'female', genderType: 'fw55',
  birthYear: 1972, birthMonth: 11, workYear: 1996, workMonth: 5,
  avgIndex: 1.2, personalAccInput: 50000, cityType: 'cc'
})

console.log('\n省份配置数量:', Object.keys(C).length)
console.log('引擎导出函数数:', Object.keys(E).length)
