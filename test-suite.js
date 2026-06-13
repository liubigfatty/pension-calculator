/**
 * 养老金计算引擎 - 自动化测试套件
 * 功能：读取cases/目录下所有格式的案例，自动适配输入，运行引擎验证
 * 用法：node test-suite.js
 */

const engine = require('./engine/pension-engine')
const fs = require('fs')
const path = require('path')

const CASES_DIR = path.join(__dirname, 'cases')

// 从各种格式中提取引擎输入
function adaptInput(raw) {
  const input = {}
  
  // 省份 -> 配置文件映射
  const provinceMap = {
    '北京市': 'beijing',
    '北京': 'beijing',
    '上海市': 'shanghai',
    '上海': 'shanghai',
    '天津市': 'tianjin',
    '天津': 'tianjin',
    '重庆市': 'chongqing',
    '重庆': 'chongqing',
    '河北省': 'hebei',
    '山西': 'shanxi',
    '辽宁省': 'liaoning',
    '吉林省': 'jilin',
    '黑龙江省': 'heilongjiang',
    '江苏省': 'jiangsu',
    '浙江省': 'zhejiang',
    '安徽省': 'anhui',
    '福建省': 'fujian',
    '江西省': 'jiangxi',
    '山东省': 'shandong',
    '河南省': 'henan',
    '湖北省': 'hubei',
    '湖南省': 'hunan',
    '广东省': 'guangdong',
    '海南省': 'hainan',
    '四川省': 'sichuan',
    '贵州省': 'guizhou',
    '云南省': 'yunnan',
    '西藏自治区': 'xizang',
    '陕西省': 'shaanxi',
    '甘肃省': 'gansu',
    '青海省': 'qinghai',
    '宁夏回族自治区': 'ningxia',
    '新疆': 'xinjiang'
  }
  
  const provinceName = raw.province || raw.region || ''
  input.province = provinceMap[provinceName] || raw.province || ''
  
  // 性别
  const gender = raw.gender || ''
  input.gender = (gender === '男' || gender === 'male') ? 'male' : 'female'
  
  // 出生年月
  function extractDate(dateStr) {
    if (!dateStr) return null
    const s = String(dateStr)
    // 格式：1970年09月
    let m = s.match(/(\d{4})年(\d{1,2})月/)
    if (m) return { year: parseInt(m[1]), month: parseInt(m[2]) }
    // 格式：1964-11-01
    m = s.match(/^(\d{4})-(\d{1,2})-/)
    if (m) return { year: parseInt(m[1]), month: parseInt(m[2]) }
    return null
  }
  
  const birth = extractDate(raw.birth || raw.birth_date || raw['出生年'])
  if (birth) {
    input.birthYear = birth.year
    input.birthMonth = birth.month
  }
  
  // 参工时间
  const work = extractDate(raw.work_start || raw.work_start_date || raw.employment_start_date || raw['参工时间'])
  if (work) {
    input.workYear = work.year
    input.workMonth = work.month
  }
  
  // 平均缴费指数
  input.avgIndex = raw.avg_index || raw.average_wage_index || raw['平均缴费工资指数'] || 1.0
  
  // 个人账户余额
  input.personalAcc = raw.personal_account || raw.personal_account_balance || raw['个人账户累计储存额'] || 0
  
  // 视同缴费年限
  input.sightYears = raw.deemed_years || raw.sight_years || raw.pre92_continuous_years || 0
  
  // 累计缴费年限
  input.totalYears = raw.total_years || raw.totalYears || raw['累计缴费年限'] || 0
  
  // 计发基数
  input.baseProv = raw.base_number || raw.pension_base || raw['计发基数'] || 0
  input.baseRetire = input.baseProv // 简化处理
  
  // 计发月数
  input.months = raw.months || raw.payment_months || 0
  
  return input
}

// 从各种格式中提取期望输出
function adaptExpected(raw) {
  return {
    basic: raw.basic_pension || raw.pension_breakdown?.basic_pension || 0,
    personal: raw.personal_pension || raw.pension_breakdown?.personal_account_pension || 0,
    transition: raw.transition_pension || raw.pension_breakdown?.transitional_pension || 0,
    total: raw.total || raw.pension_breakdown?.monthly_basic_pension_total || 0
  }
}

// 运行单个测试案例
async function runTest(filePath) {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const input = adaptInput(raw)
    const expected = adaptExpected(raw)
    
    // 加载省份配置
    const configPath = path.join(__dirname, 'provinces', input.province + '.json')
    if (!fs.existsSync(configPath)) {
      return { file: path.basename(filePath), status: 'SKIP', reason: '省份配置不存在' }
    }
    const config = require(configPath)
    
    // 运行引擎
    const result = engine.calculate(config, input)
    
    // 比较结果（允许1元误差）
    const legal = result.legal
    const diff = {
      basic: Math.abs((legal.basic_pension?.amount || 0) - expected.basic),
      personal: Math.abs((legal.personal_account?.amount || 0) - expected.personal),
      transition: Math.abs((legal.transitional_pension?.amount || 0) - expected.transition),
      total: Math.abs((legal.total || 0) - expected.total)
    }
    
    const passed = diff.basic <= 1 && diff.personal <= 1 && diff.transition <= 1 && diff.total <= 1
    
    return {
      file: path.basename(filePath),
      province: input.province,
      status: passed ? 'PASS' : 'FAIL',
      expected,
      actual: {
        basic: legal.basic_pension?.amount || 0,
        personal: legal.personal_account?.amount || 0,
        transition: legal.transitional_pension?.amount || 0,
        total: legal.total || 0
      },
      diff
    }
  } catch (e) {
    return { file: path.basename(filePath), status: 'ERROR', reason: e.message }
  }
}

// 主流程：扫描所有案例并测试
async function main() {
  const provinces = fs.readdirSync(CASES_DIR)
    .filter(f => fs.statSync(path.join(CASES_DIR, f)).isDirectory())
    .filter(f => !['skip', 'extracted', 'other'].includes(f))
  
  console.log('# 养老金计算引擎 - 自动化测试报告\n')
  console.log(`扫描时间：${new Date().toLocaleString()}\n`)
  
  let total = 0
  let passed = 0
  let failed = 0
  let skipped = 0
  let errors = 0
  
  for (const province of provinces) {
    const dirPath = path.join(CASES_DIR, province)
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'))
    
    for (const file of files) {
      const filePath = path.join(dirPath, file)
      const result = await runTest(filePath)
      total++
      
      if (result.status === 'PASS') {
        passed++
        console.log(`✅ ${result.file} (${result.province})`)
      } else if (result.status === 'FAIL') {
        failed++
        console.log(`❌ ${result.file} (${result.province})`)
        console.log(`   期望：Basic=${result.expected.basic}, Personal=${result.expected.personal}, Transition=${result.expected.transition}, Total=${result.expected.total}`)
        console.log(`   实际：Basic=${result.actual.basic}, Personal=${result.actual.personal}, Transition=${result.actual.transition}, Total=${result.actual.total}`)
        console.log(`   差异：${JSON.stringify(result.diff)}`)
      } else if (result.status === 'SKIP') {
        skipped++
        console.log(`⏭ ${result.file}: ${result.reason}`)
      } else {
        errors++
        console.log(`⚠️  ${result.file}: ${result.reason}`)
      }
    }
  }
  
  console.log('\n---\n')
  console.log(`## 测试汇总`)
  console.log(`- 总案例数：${total}`)
  console.log(`- ✅ 通过：${passed}`)
  console.log(`- ❌ 失败：${failed}`)
  console.log(`- ⏭ 跳过：${skipped}`)
  console.log(`- ⚠️  错误：${errors}`)
}

main().catch(console.error)
