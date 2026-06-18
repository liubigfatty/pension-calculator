/**
 * 自动化测试脚本 - 基于案例库批量验证
 * 功能：
 *   1. 读取 cases/ 下所有案例
 *   2. 调用本地引擎计算
 *   3. 对比 expected 值
 *   4. 生成详细报告（JSON + Markdown）
 * 
 * 用法：
 *   node scripts/auto-test.js                 # 测试所有案例
 *   node scripts/auto-test.js --province shanxi  # 只测山西省
 *   node scripts/auto-test.js --gender female    # 只测女性案例
 *   node scripts/auto-test.js --tolerance 1.0    # 容忍度1元（默认0.5）
 */

const fs = require('fs')
const path = require('path')

// 加载引擎
const ENGINE_PATH = path.join(__dirname, '../engine/pension-engine.js')
const engine = require(ENGINE_PATH)

// 加载省份配置
const PROVINCES_DIR = path.join(__dirname, '../provinces')
const CASES_DIR = path.join(__dirname, '../cases')
const REPORTS_DIR = path.join(__dirname, '../reports')

// 容忍度（元）
const TOLERANCE = parseFloat(process.argv.find(a => a.startsWith('--tolerance'))?.split('=')[1]) || 0.5

// 过滤条件
const filterProvince = process.argv.find(a => a.startsWith('--province'))?.split('=')[1]
const filterGender = process.argv.find(a => a.startsWith('--gender'))?.split('=')[1]

// ═══════════════════════════════════════════════════════
//  工具函数
// ═══════════════════════════════════════════════════════

function loadProvinceConfig(provCode) {
  const filePath = path.join(PROVINCES_DIR, `${provCode}.json`)
  if (!fs.existsSync(filePath)) {
    throw new Error(`省份配置文件不存在: ${filePath}`)
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function getGenderType(gender, identity, femaleEmployeeAge) {
  if (gender === 'male') return 'male'
  if (identity === 'flexible') return 'fw55'
  if (gender === 'female' && identity === 'employee' && femaleEmployeeAge === '55') return 'fc'
  return 'fw50'
}

function mapCaseToEngineInput(caseData, provinceConfig) {
  const gender = caseData.gender === '男' ? 'male' : 'female'
  const identity = caseData.identity || 'employee'  // 默认企业职工
  const femaleEmployeeAge = caseData.female_employee_age || '50'
  
  const genderType = getGenderType(gender, identity, femaleEmployeeAge)
  
  return {
    province: caseData.province,
    genderType: genderType,
    birthYear: caseData.birth_year,
    birthMonth: caseData.birth_month,
    workStartYear: caseData.work_year,
    workStartMonth: caseData.work_month,
    averageIndex: caseData.avg_index,
    transIndex: caseData.trans_index,
    personalAccount: caseData.personal_account,
    provinceConfig: provinceConfig
  }
}

function calculateCase(caseData, provinceConfig) {
  try {
    const input = mapCaseToEngineInput(caseData, provinceConfig)
    
    // 调用引擎
    const result = engine.calculate(input)
    
    return {
      success: true,
      result: result,
      input: input
    }
  } catch (err) {
    return {
      success: false,
      error: err.message,
      stack: err.stack
    }
  }
}

function compareResult(actual, expected, tolerance) {
  const issues = []
  
  const fields = [
    { key: 'basic_pension', label: '基础养老金' },
    { key: 'personal_pension', label: '个人账户养老金' },
    { key: 'transitional_pension', label: '过渡性养老金' },
    { key: 'total', label: '合计' }
  ]
  
  for (const field of fields) {
    const actualVal = actual[field.key]
    const expectedVal = expected[field.key]
    
    if (expectedVal == null) continue
    
    const diff = Math.abs(actualVal - expectedVal)
    if (diff > tolerance) {
      issues.push({
        field: field.label,
        expected: expectedVal,
        actual: actualVal,
        diff: diff,
        pass: false
      })
    } else {
      issues.push({
        field: field.label,
        expected: expectedVal,
        actual: actualVal,
        diff: diff,
        pass: true
      })
    }
  }
  
  const allPass = issues.every(i => i.pass)
  return { allPass, issues }
}

// ═══════════════════════════════════════════════════════
//  主逻辑
// ═══════════════════════════════════════════════════════

function loadAllCases() {
  const cases = []
  const provinces = fs.readdirSync(CASES_DIR).filter(f => {
    return fs.statSync(path.join(CASES_DIR, f)).isDirectory()
  })
  
  for (const prov of provinces) {
    if (filterProvince && prov !== filterProvince) continue
    
    const provDir = path.join(CASES_DIR, prov)
    const files = fs.readdirSync(provDir).filter(f => f.endsWith('.json'))
    
    for (const file of files) {
      const caseData = JSON.parse(fs.readFileSync(path.join(provDir, file), 'utf8'))
      
      // 性别过滤
      if (filterGender) {
        const gender = caseData.gender === '男' ? 'male' : 'female'
        if (gender !== filterGender) continue
      }
      
      cases.push({
        province: prov,
        caseFile: file,
        data: caseData
      })
    }
  }
  
  return cases
}

function runTests() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('  养老金计算引擎自动化测试')
  console.log('═══════════════════════════════════════════════════════')
  console.log('')
  console.log(`容忍度: ${TOLERANCE} 元`)
  console.log(`过滤: ${filterProvince ? '省份=' + filterProvince : '全部'}`)
  console.log(`       ${filterGender ? '性别=' + filterGender : '全部'}`)
  console.log('')
  
  const cases = loadAllCases()
  console.log(`加载案例: ${cases.length} 个`)
  console.log('')
  
  const results = []
  let passCount = 0
  let failCount = 0
  let errorCount = 0
  
  for (const c of cases) {
    const { province, caseFile, data } = c
    
    try {
      const provinceConfig = loadProvinceConfig(province)
      const calcResult = calculateCase(data, provinceConfig)
      
      if (!calcResult.success) {
        errorCount++
        results.push({
          province,
          caseFile,
          caseId: data.case_id,
          status: 'ERROR',
          error: calcResult.error
        })
        continue
      }
      
      // 提取实际值
      const actual = {
        basic_pension: calcResult.result.basicPension?.amount,
        personal_pension: calcResult.result.personalAccount?.amount,
        transitional_pension: calcResult.result.transitionalPension?.amount,
        total: calcResult.result.total
      }
      
      // 对比
      const { allPass, issues } = compareResult(actual, data.expected, TOLERANCE)
      
      if (allPass) {
        passCount++
        results.push({
          province,
          caseFile,
          caseId: data.case_id,
          status: 'PASS',
          issues: issues
        })
        console.log(`  ✅ PASS  [${province}/${caseFile}] ${data.case_id}`)
      } else {
        failCount++
        results.push({
          province,
          caseFile,
          caseId: data.case_id,
          status: 'FAIL',
          issues: issues,
          actual: actual,
          expected: data.expected
        })
        console.log(`  ❌ FAIL  [${province}/${caseFile}] ${data.case_id}`)
        for (const issue of issues) {
          if (!issue.pass) {
            console.log(`       ${issue.field}: 期望=${issue.expected}, 实际=${issue.actual?.toFixed(2)}, 差异=${issue.diff.toFixed(2)}`)
          }
        }
      }
      
    } catch (err) {
      errorCount++
      results.push({
        province,
        caseFile,
        caseId: data.case_id,
        status: 'ERROR',
        error: err.message
      })
      console.log(`  💥 ERROR [${province}/${caseFile}] ${err.message}`)
    }
  }
  
  // 生成报告
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const reportBase = path.join(REPORTS_DIR, `auto-test-${timestamp}`)
  
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true })
  }
  
  // JSON 报告
  fs.writeFileSync(
    `${reportBase}.json`,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      tolerance: TOLERANCE,
      filter: { province: filterProvince, gender: filterGender },
      summary: { total: cases.length, pass: passCount, fail: failCount, error: errorCount },
      results: results
    }, null, 2)
  )
  
  // Markdown 报告
  const mdLines = [
    `# 自动化测试报告`,
    ``,
    `- **时间**: ${new Date().toLocaleString('zh-CN')}`,
    `- **容忍度**: ${TOLERANCE} 元`,
    `- **案例数**: ${cases.length}`,
    `- **通过**: ${passCount}`,
    `- **失败**: ${failCount}`,
    `- **错误**: ${errorCount}`,
    ``,
    `## 结果汇总`,
    ``,
    `| 省份 | 案例 | 状态 | 差异 |`,
    `|------|------|------|------|`,
  ]
  
  for (const r of results) {
    if (r.status === 'PASS') {
      mdLines.push(`| ${r.province} | ${r.caseId} | ✅ PASS | - |`)
    } else if (r.status === 'FAIL') {
      const diffs = r.issues.filter(i => !i.pass).map(i => `${i.field}=${i.diff.toFixed(2)}`).join(', ')
      mdLines.push(`| ${r.province} | ${r.caseId} | ❌ FAIL | ${diffs} |`)
    } else {
      mdLines.push(`| ${r.province} | ${r.caseId} | 💥 ERROR | ${r.error} |`)
    }
  }
  
  fs.writeFileSync(`${reportBase}.md`, mdLines.join('\n'))
  
  // 打印汇总
  console.log('')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`  汇总：✅ 通过 ${passCount}  ❌ 失败 ${failCount}  💥 错误 ${errorCount}  （共 ${cases.length}）`)
  console.log('═══════════════════════════════════════════════════════')
  console.log('')
  console.log(`报告已生成:`)
  console.log(`  JSON:  ${reportBase}.json`)
  console.log(`  Markdown: ${reportBase}.md`)
  console.log('')
  
  return { passCount, failCount, errorCount, total: cases.length }
}

// ═══════════════════════════════════════════════════════
//  执行
// ═══════════════════════════════════════════════════════

if (require.main === module) {
  try {
    const summary = runTests()
    process.exit(summary.failCount > 0 || summary.errorCount > 0 ? 1 : 0)
  } catch (err) {
    console.error('测试执行失败:', err)
    process.exit(1)
  }
}

module.exports = { runTests, loadAllCases, calculateCase, compareResult }
