/**
 * 批量转换案例文件为标准测试格式
 * 用法：node standardize-cases.js
 */

const fs = require('fs')
const path = require('path')

const CASES_DIR = path.join(__dirname, 'cases')

// 标准格式模板
function toStandardFormat(raw, province, filename) {
  // 尝试从多种格式中提取字段
  const get = (obj, keys) => {
    for (const k of keys) {
      if (obj[k] !== undefined) return obj[k]
    }
    return undefined
  }

  // 性别
  let gender = get(raw, ['gender', '性别'])
  if (gender === 'male') gender = '男'
  if (gender === 'female') gender = '女'

  // 出生年月
  let birthYear, birthMonth
  const birthRaw = get(raw, ['birth', 'birth_date', '出生年'])
  if (birthRaw) {
    const m = String(birthRaw).match(/(\d{4})[^\d]*(\d{1,2})/)
    if (m) { birthYear = parseInt(m[1]); birthMonth = parseInt(m[2]) }
  }
  if (!birthYear) {
    birthYear = get(raw, ['birthYear', 'birth_year'])
    birthMonth = get(raw, ['birthMonth', 'birth_month'])
  }

  // 参工时间
  let workYear, workMonth
  const workRaw = get(raw, ['work_start', 'work_start_date', 'employment_start_date', '参工时间'])
  if (workRaw) {
    const m = String(workRaw).match(/(\d{4})[^\d]*(\d{1,2})/)
    if (m) { workYear = parseInt(m[1]); workMonth = parseInt(m[2]) }
  }
  if (!workYear) {
    workYear = get(raw, ['workYear', 'work_year'])
    workMonth = get(raw, ['workMonth', 'work_month'])
  }

  // 退休时间
  let retireYear, retireMonth
  const retireRaw = get(raw, ['retirement_date', '退休时间'])
  if (retireRaw) {
    const m = String(retireRaw).match(/(\d{4})[^\d]*(\d{1,2})/)
    if (m) { retireYear = parseInt(m[1]); retireMonth = parseInt(m[2]) }
  }
  if (!retireYear) {
    retireYear = get(raw, ['retireYear', 'retire_year'])
    retireMonth = get(raw, ['retireMonth', 'retire_month'])
  }

  // 缴费年限
  const sightYears = get(raw, ['deemed_years', 'sight_years', '视同缴费年限', 'pre92_continuous_years'])
  const actualYears = get(raw, ['actual_years', '实际缴费年限'])
  const totalYears = get(raw, ['total_years', 'totalYears', '累计缴费年限'])

  // 指数和基数
  const avgIndex = get(raw, ['avg_index', 'average_wage_index', '平均缴费工资指数'])
  const baseNumber = get(raw, ['base_number', 'pension_base', '计发基数'])

  // 个人账户
  const personalAccount = get(raw, ['personal_account', 'personal_account_balance', '个人账户累计储存额'])

  // 计发月数
  const months = get(raw, ['months', 'payment_months', '计发月数'])

  // 期望输出
  const expected = {
    basic_pension: get(raw, ['basic_pension', '基础养老金']) || 0,
    personal_pension: get(raw, ['personal_pension', '个人账户养老金']) || 0,
    transition_pension: get(raw, ['transition_pension', '过渡性养老金']) || 0,
    extra_pension: get(raw, ['extra_pension', '月增加基础养老金', 'basic_pension_increase_by_tenure']) || 0,
    total: get(raw, ['total', 'monthly_basic_pension_total', '月基本养老金合计']) || 0
  }

  // 从嵌套结构中提取
  if (raw.calculation_parameters) {
    if (!avgIndex) avgIndex = raw.calculation_parameters.average_wage_index
    if (!baseNumber) baseNumber = raw.calculation_parameters.pension_base
    if (!personalAccount) personalAccount = raw.calculation_parameters.personal_account_balance
    if (!months) months = raw.calculation_parameters.payment_months
  }
  if (raw.pension_breakdown) {
    if (!expected.basic_pension) expected.basic_pension = raw.pension_breakdown.basic_pension || 0
    if (!expected.personal_pension) expected.personal_pension = raw.pension_breakdown.personal_account_pension || 0
    if (!expected.transition_pension) expected.transition_pension = raw.pension_breakdown.transitional_pension || 0
    if (!expected.extra_pension) expected.extra_pension = raw.pension_breakdown.basic_pension_increase_by_tenure || raw.pension_breakdown.extra_pension || 0
    if (!expected.total) expected.total = raw.pension_breakdown.monthly_basic_pension_total || 0
  }

  const caseId = raw.case_id || filename.replace('.json', '')

  return {
    case_id: caseId,
    province: raw.province || raw.region || province,
    city: raw.city || '',
    gender: gender || '',
    birth_year: birthYear || 0,
    birth_month: birthMonth || 0,
    work_year: workYear || 0,
    work_month: workMonth || 0,
    retire_year: retireYear || 0,
    retire_month: retireMonth || 0,
    retire_type: raw.retirement_type || '',
    sight_years: sightYears || 0,
    actual_years: actualYears || 0,
    total_years: totalYears || 0,
    avg_index: avgIndex || 0,
    base_number: baseNumber || 0,
    personal_account: personalAccount || 0,
    months: months || 0,
    expected,
    verified: raw.verified || false,
    notes: raw.notes || ''
  }
}

function standardizeProvince(provinceDir) {
  const dirPath = path.join(CASES_DIR, provinceDir)
  if (!fs.existsSync(dirPath)) return

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'))
  console.log(`\n处理 ${provinceDir} (${files.length} 个文件)...`)

  for (const file of files) {
    const filePath = path.join(dirPath, file)
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      const standardized = toStandardFormat(raw, provinceDir, file)
      fs.writeFileSync(filePath, JSON.stringify(standardized, null, 2), 'utf8')
      console.log(`  ✅ ${file}`)
    } catch (e) {
      console.log(`  ❌ ${file}: ${e.message}`)
    }
  }
}

// 主流程
const provinces = fs.readdirSync(CASES_DIR)
  .filter(f => fs.statSync(path.join(CASES_DIR, f)).isDirectory())
  .filter(f => !['skip', 'extracted', 'other'].includes(f))

console.log('开始标准化案例文件...')
console.log('省份目录:', provinces.join(', '))

for (const p of provinces) {
  standardizeProvince(p)
}

console.log('\n✅ 标准化完成！')
