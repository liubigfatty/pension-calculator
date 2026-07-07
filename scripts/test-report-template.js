// 验证 report-template.js 能被正常渲染（不依赖 wx）
const path = require('path')
const tpl = require(path.join(__dirname, '..', 'miniprogram', 'pages', 'report', 'report-template.js'))

const data = {
  province: '广东省', city: '', identity: '企业职工男',
  legalAge: '63岁', legalDate: '2048年3月', legalYears: '35年2个月', avgIndex: '1.00',
  balance: '128,500', base: '10,325',
  legalTotal: '¥8,000.00', flexTotal: '¥6,500.00',
  legalAnnual: '¥96,000', flexAnnual: '¥78,000',
  legalMonthsShow: '117', flexMonthsShow: '139',
  legalAgeShow: '63岁', flexAgeShow: '60岁',
  legalDateShow: '2048年3月', flexDateShow: '2045年3月',
  legalYearsShow: '35年2个月', flexYearsShow: '32年2个月',
  hasEarly: true,
  cumulativeItems: [
    { age: 60, legalTotal: '0.0万', flexTotal: '0.0万', diff: '+0.0万', isBreakEven: false, isNormalStart: false },
    { age: 63, legalTotal: '0.0万', flexTotal: '19.5万', diff: '+19.5万', isBreakEven: false, isNormalStart: true },
    { age: 65, legalTotal: '19.2万', flexTotal: '39.0万', diff: '+19.8万', isBreakEven: false, isNormalStart: false },
    { age: 80, legalTotal: '163.2万', flexTotal: '156.0万', diff: '追平', isBreakEven: true, isNormalStart: false },
    { age: 90, legalTotal: '259.2万', flexTotal: '234.0万', diff: '-25.2万', isBreakEven: false, isNormalStart: false }
  ],
  breakEvenAge: 80,
  adviceType: 'worker',
  salary3year: '341,964', fund3year: '89,208', medicareLabel: '男', medicareYears: 35,
  earlyMonths: 36, savePremium: '74,340', earlyPension: '234,000',
  totalEarlyBenefit: '308,340', diffMonthly: 1500, paybackYears: 17,
  replaceRate: 78, baseRetireStr: '10,325', estPreRetireSalary: '10,325',
  replaceRateDesc: '替代率≥70%，达到世界银行建议的"维持退休前生活水平"标准（70%+），养老保障充足，一般无需额外补充。',
  indexOpts: [
    { label: '0.6', pension: '¥5,000', inc: '--', isCurrent: false },
    { label: '1.00（当前）', pension: '¥8,000.00', inc: '+¥2,000', isCurrent: true },
    { label: '1.5', pension: '¥10,000', inc: '+¥2,000', isCurrent: false }
  ],
  basicPension: '¥5,200.00', basicDesc: '基础养老金说明', personalPension: '¥2,800.00', personalDesc: '个人账户说明',
  extraPension: '', extraDetails: [], totalPension: '¥8,000.00',
  consultImg: null
}

try {
  const out = tpl.build(data)
  console.log('✅ build() 执行成功，wxml 长度 =', out.wxml.length)
  const checks = [
    ['弹性提前退休（60岁起领）', out.wxml.indexOf('弹性提前退休（60岁起领）') >= 0],
    ['正常退休（63岁起领）', out.wxml.indexOf('正常退休（63岁起领）') >= 0],
    ['正常起领标记', out.wxml.indexOf('（正常起领）') >= 0],
    ['退休前工资用推算值', out.wxml.indexOf('约¥10,325') >= 0],
    ['动态替代率文案', out.wxml.indexOf('达到世界银行建议') >= 0],
    ['工资收入修正值', out.wxml.indexOf('341,964') >= 0],
    ['不再含写死的40-45%', out.wxml.indexOf('40-45%') < 0]
  ]
  let ok = true
  checks.forEach(c => { console.log((c[1] ? '✅' : '❌') + ' ' + c[0]); if (!c[1]) ok = false })
  console.log(ok ? '\n全部通过 ✅' : '\n存在失败项 ❌')
  process.exit(ok ? 0 : 1)
} catch (e) {
  console.error('❌ build() 抛错:', e)
  process.exit(1)
}
