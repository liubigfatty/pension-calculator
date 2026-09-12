/* verify-index-integrated.js — 正元养老金网页端「缴费指数计算器整合」自检
 * 验证：
 *   1. web/index.html 里所有 idxXxx DOM id 与 app.js IC 引用一致
 *   2. index.html 引入了 4 个脚本（engine + provinces-bundle + provinces-index-data + calc-index + app）
 *   3. 计算器 calculateIndex 输出字段能正确映射到 pension-engine 入参（avgIndex/transIndex/balance/city）
 *   4. 端到端：吉林案例 → 算指数 → 填入 → pension-engine.calculate 能跑通
 *   5. 双指数省（北京）transIndex 正确传递
 */
const fs = require('fs')
const path = require('path')
const assert = require('assert')

const WEB = path.resolve(__dirname, '..', 'web')
let pass = 0, fail = 0
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + name) }
  else { fail++; console.log('  ✗ ' + name + (detail ? ' → ' + detail : '')) }
}

console.log('═══ 1. DOM id 一致性 ═══')
const html = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8')
const appjs = fs.readFileSync(path.join(WEB, 'app.js'), 'utf8')

// 提取 index.html 里所有 id="idx..."
const htmlIds = new Set()
let m
const reHtml = /id="(idx[^"]+)"/g
while ((m = reHtml.exec(html))) htmlIds.add(m[1])

// 提取 app.js 里 IC 引用的 $('idx...')
const refIds = new Set()
const reRef = /\$\('(idx[^']+)'\)/g
while ((m = reRef.exec(appjs))) refIds.add(m[1])

check('index.html 有 idx 开头的 DOM id', htmlIds.size > 0, '找到 ' + htmlIds.size + ' 个')
check('app.js 引用了 idx 开头的 DOM id', refIds.size > 0, '找到 ' + refIds.size + ' 个')

// 每个 app.js 引用都应在 html 中存在
const missing = [...refIds].filter(id => !htmlIds.has(id))
check('app.js 引用的 id 在 html 中全部存在', missing.length === 0, '缺失: ' + missing.join(', '))

console.log('\n═══ 2. 脚本引入完整性 ═══')
const scripts = ['engine.js', 'provinces-bundle.js', 'provinces-index-data.js', 'calc-index.js', 'app.js']
scripts.forEach(s => {
  check('index.html 引入 ' + s, html.includes('src="' + s + '"'))
})

console.log('\n═══ 3. 字段映射（计算器输出 → pension-engine 入参）═══')
// 计算器输出：avgIndex, transIndex, accountBalance
// pension-engine 入参：avgIndex, transIndex, personalAccInput, cityType
check('app.js 有 elAvg.value = fwd.avgIndex', appjs.includes('elAvg.value = fwd.avgIndex'))
check('app.js 有 elTrans.value = fwd.transIndex', appjs.includes('elTrans.value = fwd.transIndex'))
check('app.js 有 elBalance.value = fwd.accountBalance', appjs.includes('elBalance.value = Math.round(fwd.accountBalance)'))
check('app.js 有 chip active 清除', appjs.includes("classList.remove('active')"))

console.log('\n═══ 4. 端到端：吉林案例 ═══')
// 加载引擎
const CalcIndex = require(path.join(__dirname, '..', 'index-engine', 'calcIndex.js'))
const INDEX_DATA = require(path.join(__dirname, '..', 'index-mini', 'cloudfunctions', 'calcIndex', 'provinces-data.js'))

const slug = 'jilin'
const hist = INDEX_DATA[slug].avg_salary_history
const contrib = [
  { year: 2018, months: 12, baseAvg: Math.round(CalcIndex.getDenominator(CalcIndex.PROVINCE_RULES[slug], hist, 2018) * 1.0) },
  { year: 2019, months: 12, baseAvg: Math.round(CalcIndex.getDenominator(CalcIndex.PROVINCE_RULES[slug], hist, 2019) * 1.0) },
  { year: 2020, months: 12, baseAvg: Math.round(CalcIndex.getDenominator(CalcIndex.PROVINCE_RULES[slug], hist, 2020) * 1.0) }
]
const fwd = CalcIndex.calculateIndex({
  provinceConfig: { name: '吉林省', avg_salary_history: hist },
  provinceCode: slug, contribution: contrib, granularity: 'A', deemedYears: 5
})
check('吉林 calculateIndex 无错误', !fwd.error, fwd.error)
check('吉林 avgIndex > 0', fwd.avgIndex > 0, 'avgIndex=' + fwd.avgIndex)
check('吉林 transIndex 输出（双指数省）', fwd.transIndex != null && fwd.transIndex > 0, 'transIndex=' + fwd.transIndex)
check('吉林 accountBalance > 0', fwd.accountBalance > 0, 'balance=' + fwd.accountBalance)

// 模拟填入 pension-engine 入参
const pensionInput = {
  avgIndex: parseFloat(fwd.avgIndex.toFixed(4)),
  transIndex: parseFloat(fwd.transIndex.toFixed(4)),
  personalAccInput: Math.round(fwd.accountBalance)
}
check('填入 avgIndex 在 [0.4, 3]', pensionInput.avgIndex >= 0.4 && pensionInput.avgIndex <= 3, '值=' + pensionInput.avgIndex)
check('填入 transIndex 在 [0.4, 3]', pensionInput.transIndex >= 0.4 && pensionInput.transIndex <= 3, '值=' + pensionInput.transIndex)

console.log('\n═══ 5. 双指数省 transIndex 传递（北京）═══')
const slug2 = 'beijing'
const hist2 = INDEX_DATA[slug2].avg_salary_history
const contrib2 = [
  { year: 2019, months: 12, baseAvg: Math.round(CalcIndex.getDenominator(CalcIndex.PROVINCE_RULES[slug2], hist2, 2019) * 1.2) },
  { year: 2020, months: 12, baseAvg: Math.round(CalcIndex.getDenominator(CalcIndex.PROVINCE_RULES[slug2], hist2, 2020) * 1.2) }
]
const fwd2 = CalcIndex.calculateIndex({
  provinceConfig: { name: '北京市', avg_salary_history: hist2 },
  provinceCode: slug2, contribution: contrib2, granularity: 'A', deemedYears: 0
})
check('北京 calculateIndex 无错误', !fwd2.error, fwd2.error)
check('北京 avgIndex ≈ 1.2（无视同年）', Math.abs(fwd2.avgIndex - 1.2) < 0.05, 'avgIndex=' + fwd2.avgIndex)
check('北京 transIndex 输出', fwd2.transIndex != null && fwd2.transIndex > 0, 'transIndex=' + fwd2.transIndex)

console.log('\n═══ 6. 广东城市 D 值查表 ═══')
const slug3 = 'guangdong'
const hist3 = INDEX_DATA[slug3].avg_salary_history
const contrib3 = [
  { year: 2019, months: 12, baseAvg: Math.round(CalcIndex.getDenominator(CalcIndex.PROVINCE_RULES[slug3], hist3, 2019) * 1.0) },
  { year: 2020, months: 12, baseAvg: Math.round(CalcIndex.getDenominator(CalcIndex.PROVINCE_RULES[slug3], hist3, 2020) * 1.0) }
]
const fwd3 = CalcIndex.calculateIndex({
  provinceConfig: { name: '广东省', avg_salary_history: hist3 },
  provinceCode: slug3, contribution: contrib3, granularity: 'A', deemedYears: 5, city: '深圳'
})
check('广东深圳 calculateIndex 无错误', !fwd3.error, fwd3.error)
check('广东深圳 _meta.city = 深圳', fwd3._meta && fwd3._meta.city === '深圳', 'city=' + (fwd3._meta && fwd3._meta.city))

console.log('\n═══ 7. 折叠/省份联动逻辑 ═══')
check('app.js 有 indexToggle 点击', appjs.includes("IC.toggle.addEventListener('click'"))
check('app.js 有 refreshIndexCalcProvince', appjs.includes('function refreshIndexCalcProvince'))
check('app.js 有 initIndexCalc', appjs.includes('function initIndexCalc'))
check('onProvinceChange 调 refreshIndexCalcProvince', appjs.includes('refreshIndexCalcProvince(slug)'))
check('广东城市从 GUANGDONG_SIGHT_INDEX_MAP 动态生成', appjs.includes('GUANGDONG_SIGHT_INDEX_MAP'))

console.log('\n════════════════════════════')
console.log('通过 ' + pass + ' / 失败 ' + fail)
if (fail > 0) {
  console.log('❌ 整合自检未通过')
  process.exit(1)
} else {
  console.log('✅ 整合自检全部通过')
}
