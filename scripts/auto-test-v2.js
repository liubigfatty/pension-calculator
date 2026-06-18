/**
 * 自动化测试脚本 v2 - 基于 verify.js 的逻辑
 * 功能：读取 cases/ 下所有案例，调用引擎，生成详细报告
 * 
 * 用法：
 *   node scripts/auto-test-v2.js
 *   node scripts/auto-test-v2.js --province shanxi
 *   node scripts/auto-test-v2.js --gender female
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const ENGINE_PATH = path.join(ROOT, 'engine/pension-engine.js')
const CASES_DIR = path.join(ROOT, 'cases')
const REPORTS_DIR = path.join(ROOT, 'reports')
const PROVINCES_DIR = path.join(ROOT, 'provinces')

const TOLERANCE = 0.5

// ═══════════════════════════════════════════════════════
//  从 verify.js 复用核心逻辑
// ═══════════════════════════════════════════════════════

function num(...args) {
  for (const v of args) {
    if (v == null || v === '') continue
    const n = typeof v === 'number' ? v : parseFloat(v)
    if (!isNaN(n) && isFinite(n)) return n
  }
  return undefined
}

function parseDate(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.split(/[-年/月]/).map(Number)
  if (parts.length >= 2) {
    return { year: parts[0], month: parts[1] || 1 }
  }
  return null
}

function buildEngineInput(c) {
  const input = {}
  
  // 性别类型
  const gender = c.gender === '男' ? 'male' : 'female'
  const identity = c.identity || 'employee'
  const femaleEmployeeAge = c.female_employee_age || '50'
  
  if (gender === 'male') {
    input.genderType = 'male'
  } else if (identity === 'flexible') {
    input.genderType = 'fw55'
  } else if (femaleEmployeeAge === '55') {
    input.genderType = 'fc'
  } else {
    input.genderType = 'fw50'
  }
  
  // 出生日期
  const birth = parseDate(c.birth || `${c.birth_year}年${c.birth_month}月`)
  if (birth) {
    input.birthYear = birth.year
    input.birthMonth = birth.month
  } else {
    return null
  }
  
  // 工作开始日期
  const work = parseDate(c.work_start || `${c.work_year}年${c.work_month}月`)
  if (work) {
    input.workStartYear = work.year
    input.workStartMonth = work.month
  } else {
    return null
  }
  
  // 缴费指数
  input.averageIndex = num(c.avg_index, c.average_index)
  if (c.trans_index != null) input.transIndex = num(c.trans_index)
  
  // 个人账户
  input.personalAccount = num(c.personal_account, c.personalAccount) || 0
  
  // 其他参数
  if (c.base_number) input.baseNumber = num(c.base_number)
  if (c.months) input.months = num(c.months)
  
  return input
}

function getExpected(c) {
  if (c.expected) {
    return {
      basic: num(c.expected.basic_pension, c.expected.basicPension),
      personal: num(c.expected.personal_pension, c.expected.personalPension),
      transitional: num(c.expected.transition_pension, c.expected.transitionalPension),
      total: num(c.expected.total, c.expected.totalPension)
    }
  }
  
  if (c.basic_pension != null) {
    return {
      basic: num(c.basic_pension),
      personal: num(c.personal_pension),
      transitional: num(c.transition_pension, c.transitional_pension),
      total: num(c.total, c.total_pension)
    }
  }
  
  return null
}

// ═══════════════════════════════════════════════════════
//  主逻辑
// ═══════════════════════════════════════════════════════

function loadCases(filterProvince, filterGender) {
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
      
      if (filterGender) {
        const gender = caseData.gender === '男' ? 'male' : 'female'
        if (gender !== filterGender) continue
      }
      
      cases.push({ province: prov, caseFile: file, data: caseData })
    }
  }
  
  return cases
}

function runTest(caseInfo) {
  const { province, caseFile, data } = caseInfo
  
  try {
    // 加载省份配置
    const configPath = path.join(PROVINCES_DIR, `${province}.json`)
    if (!fs.existsSync(configPath)) {
      return { status: 'error', error: `省份配置不存在: ${province}` }
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    
    // 构建引擎输入
    const input = buildEngineInput(data)
    if (!input) {
      return { status: 'skip', error: '无法解析日期' }
    }
    
    // 获取期望值
    const expected = getExpected(data)
    if (!expected || !expected.total) {
      return { status: 'skip', error: '无法提取期望值' }
    }
    
    // 调用引擎
    const engine = require(ENGINE_PATH)
    const result = engine.calculate(config, input)
    
    // 对比结果
    const actual = {
      basic: result.basicPension?.amount,
      personal: result.personalAccount?.amount,
      transitional: result.transitionalPension?.amount,
      total: result.total
    }
    
    const issues = []
    let allPass = true
    
    for (const field of ['basic', 'personal', 'transitional', 'total']) {
      if (expected[field] == null) continue
      
      const diff = Math.abs(actual[field] - expected[field])
      const pass = diff <= TOLERANCE
      
      if (!pass) allPass = false
      
      issues.push({
        field: field,
        expected: expected[field],
        actual: actual[field],
        diff: diff,
        pass: pass
      })
    }
    
    return {
      status: allPass ? 'pass' : 'fail',
      issues: issues,
      actual: actual,
      expected: expected,
      result: result
    }
    
  } catch (err) {
    return { status: 'error', error: err.message }
  }
}

function main() {
  const args = process.argv.slice(2)
  const filterProvince = args.find(a => a.startsWith('--province='))?.split('=')[1]
  const filterGender = args.find(a => a.startsWith('--gender='))?.split('=')[1]
  
  console.log('═══════════════════════════════════════════════════════')
  console.log('  养老金计算引擎自动化测试 v2')
  console.log('═══════════════════════════════════════════════════════')
  console.log('')
  console.log(`容忍度: ${TOLERANCE} 元`)
  if (filterProvince) console.log(`省份过滤: ${filterProvince}`)
  if (filterGender) console.log(`性别过滤: ${filterGender}`)
  console.log('')
  
  const cases = loadCases(filterProvince, filterGender)
  console.log(`加载案例: ${cases.length} 个`)
  console.log('')
  
  let passCount = 0
  let failCount = 0
  let errorCount = 0
  let skipCount = 0
  
  const results = []
  
  for (const c of cases) {
    const testResult = runTest(c)
    
    results.push({
      province: c.province,
      caseFile: c.caseFile,
      caseId: c.data.case_id,
      status: testResult.status,
      issues: testResult.issues,
      error: testResult.error
    })
    
    if (testResult.status === 'pass') {
      passCount++
      console.log(`  ✅ PASS  [${c.province}/${c.caseFile}] ${c.data.case_id}`)
    } else if (testResult.status === 'fail') {
      failCount++
      console.log(`  ❌ FAIL  [${c.province}/${c.caseFile}] ${c.data.case_id}`)
      for (const issue of testResult.issues) {
        if (!issue.pass) {
          console.log(`       ${issue.field}: 期望=${issue.expected?.toFixed(2)}, 实际=${issue.actual?.toFixed(2)}, 差异=${issue.diff.toFixed(2)}`)
        }
      }
    } else if (testResult.status === 'error') {
      errorCount++
      console.log(`  💥 ERROR [${c.province}/${c.caseFile}] ${testResult.error}`)
    } else {
      skipCount++
      console.log(`  ⚠️  SKIP  [${c.province}/${c.caseFile}] ${testResult.error}`)
    }
  }
  
  // 生成报告
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true })
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const reportBase = path.join(REPORTS_DIR, `auto-test-v2-${timestamp}`)
  
  // JSON 报告
  fs.writeFileSync(
    `${reportBase}.json`,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: { total: cases.length, pass: passCount, fail: failCount, error: errorCount, skip: skipCount },
      results: results
    }, null, 2)
  )
  
  // Markdown 报告
  const md = [
    `# 自动化测试报告 v2`,
    ``,
    `- **时间**: ${new Date().toLocaleString('zh-CN')}`,
    `- **案例数**: ${cases.length}`,
    `- **通过**: ${passCount}`,
    `- **失败**: ${failCount}`,
    `- **错误**: ${errorCount}`,
    `- **跳过**: ${skipCount}`,
    ``,
    `## 详细结果`,
    ``,
    `| 省份 | 案例 | 状态 |`,
    `|------|------|------|`,
  ]
  
  for (const r of results) {
    const statusIcon = r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : r.status === 'error' ? '💥' : '⚠️'
    md.push(`| ${r.province} | ${r.caseId} | ${statusIcon} ${r.status.toUpperCase()} |`)
  }
  
  fs.writeFileSync(`${reportBase}.md`, md.join('\n'))
  
  // 打印汇总
  console.log('')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`  汇总：✅ 通过 ${passCount}  ❌ 失败 ${failCount}  💥 错误 ${errorCount}  ⚠️  跳过 ${skipCount}  （共 ${cases.length}）`)
  console.log('═══════════════════════════════════════════════════════')
  console.log('')
  console.log(`报告:`)
  console.log(`  JSON:  ${reportBase}.json`)
  console.log(`  Markdown: ${reportBase}.md`)
  console.log('')
  
  process.exit(failCount > 0 || errorCount > 0 ? 1 : 0)
}

if (require.main === module) {
  main()
}

module.exports = { runTest, loadCases, buildEngineInput, getExpected }
