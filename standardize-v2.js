/**
 * 批量转换案例文件为标准测试格式（简化版）
 * 用法：node standardize-v2.js
 */

const fs = require('fs')
const path = require('path')

const CASES_DIR = path.join(__dirname, 'cases')

function standardizeFile(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  
  // 新格式
  const out = {
    case_id: raw.case_id || path.basename(filePath, '.json'),
    province: raw.province || raw.region || '',
    city: raw.city || '',
    gender: raw.gender || raw.性别 || '',
    birth_year: 0,
    birth_month: 0,
    work_year: 0,
    work_month: 0,
    retire_year: 0,
    retire_month: 0,
    retire_type: raw.retirement_type || '',
    sight_years: raw.deemed_years || raw.sight_years || raw.pre92_continuous_years || 0,
    actual_years: raw.actual_years || 0,
    total_years: raw.total_years || raw.totalYears || 0,
    avg_index: raw.avg_index || raw.average_wage_index || 0,
    base_number: raw.base_number || raw.pension_base || 0,
    personal_account: raw.personal_account || raw.personal_account_balance || 0,
    months: raw.months || raw.payment_months || 0,
    expected: {
      basic_pension: raw.basic_pension || 0,
      personal_pension: raw.personal_pension || 0,
      transition_pension: raw.transition_pension || 0,
      extra_pension: raw.extra_pension || raw.basic_pension_increase_by_tenure || 0,
      total: raw.total || raw.monthly_basic_pension_total || 0
    },
    verified: raw.verified || false,
    notes: raw.notes || ''
  }
  
  // 尝试从日期字符串提取年月（支持多种格式）
  function extractDate(dateStr) {
    if (!dateStr) return null
    const s = String(dateStr).trim()
    
    // 格式：1970年09月 或 1992年08月
    let m = s.match(/(\d{4})年(\d{1,2})月/)
    if (m) return { year: parseInt(m[1]), month: parseInt(m[2]) }
    
    // 格式：1964-11-01 或 2024-11-10
    m = s.match(/^(\d{4})-(\d{1,2})-/)
    if (m) return { year: parseInt(m[1]), month: parseInt(m[2]) }
    
    // 格式：2025年10月 或 2024年11月
    m = s.match(/(\d{4})年(\d{1,2})月/)
    if (m) return { year: parseInt(m[1]), month: parseInt(m[2]) }
    
    // 通用格式：任意4位数字+非数字+1-2位数字
    m = s.match(/(\d{4})[^\d]*(\d{1,2})/)
    if (m) return { year: parseInt(m[1]), month: parseInt(m[2]) }
    
    return null
  }
  
  // 出生年月
  let d = extractDate(raw.birth || raw.birth_date || raw['出生年'])
  if (d) { out.birth_year = d.year; out.birth_month = d.month }
  
  // 参工时间
  d = extractDate(raw.work_start || raw.work_start_date || raw.employment_start_date)
  if (d) { out.work_year = d.year; out.work_month = d.month }
  
  // 退休时间
  d = extractDate(raw.retirement_date || raw['退休时间'])
  if (d) { out.retire_year = d.year; out.retire_month = d.month }
  
  // 从嵌套结构提取（吉林格式）
  if (raw.calculation_parameters) {
    if (!out.avg_index) out.avg_index = raw.calculation_parameters.average_wage_index || 0
    if (!out.base_number) out.base_number = raw.calculation_parameters.pension_base || 0
    if (!out.personal_account) out.personal_account = raw.calculation_parameters.personal_account_balance || 0
    if (!out.months) out.months = raw.calculation_parameters.payment_months || 0
  }
  if (raw.pension_breakdown) {
    if (!out.expected.basic_pension) out.expected.basic_pension = raw.pension_breakdown.basic_pension || 0
    if (!out.expected.personal_pension) out.expected.personal_pension = raw.pension_breakdown.personal_account_pension || 0
    if (!out.expected.transition_pension) out.expected.transition_pension = raw.pension_breakdown.transitional_pension || 0
    if (!out.expected.total) out.expected.total = raw.pension_breakdown.monthly_basic_pension_total || 0
  }
  
  return out
}

function processProvince(provinceDir) {
  const dirPath = path.join(CASES_DIR, provinceDir)
  if (!fs.existsSync(dirPath)) return
  
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'))
  console.log(`\n处理 ${provinceDir} (${files.length} 个文件)...`)
  
  for (const file of files) {
    const filePath = path.join(dirPath, file)
    try {
      const standardized = standardizeFile(filePath)
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
for (const p of provinces) {
  processProvince(p)
}
console.log('\n✅ 标准化完成！')
