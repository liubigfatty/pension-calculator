/**
 * 本地模拟云函数调用测试脚本
 * 用途：模拟小程序 wx.cloud.callFunction 调用，验证前后端数据格式对齐
 * 用法：node scripts/test-cloud-function-local.js [测试用例路径]
 * 示例：node scripts/test-cloud-function-local.js cases/beijing/1.json
 */

const fs   = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const ENGINE_PATH = path.join(ROOT, 'engine/pension-engine.js')
const CONFIGS_DIR  = path.join(ROOT, 'cloudfunctions/calculate/provinces')

// 加载引擎
const engine = require(ENGINE_PATH)

function loadProvinceConfig(province) {
  // 云函数使用 .js 模块（getEngineConfig() 导出引擎格式配置）
  const configPath = path.join(CONFIGS_DIR, `${province}.js`)
  if (!fs.existsSync(configPath)) {
    throw new Error(`省份配置文件不存在: ${configPath}`)
  }
  const mod = require(configPath)
  return mod.getEngineConfig()
}

function mapCaseToEngineInput(testCase) {
  /**
   * 将测试用例字段映射到引擎输入格式（驼峰命名，与云函数 index.js 一致）
   */
  const gender = testCase.gender
  const isMale = gender === 'male'

  return {
    gender: gender,
    identity: 'employee', // 默认职工身份
    genderType: isMale ? 'male' : (testCase.retire_year >= 2025 ? 'fw55' : 'fw50'),
    birthYear:  testCase.birth_year,
    birthMonth: testCase.birth_month,
    workYear:   testCase.work_year,
    workMonth:  testCase.work_month,
    retireYear: testCase.retire_year,
    retireMonth: testCase.retire_month,
    avgIndex:   testCase.avg_index,
    personalAccInput: testCase.personal_account || 0,
    extras:     {},
    cityType:   'prov',
    actualYears:       testCase.actual_years,
    sightYears:        testCase.sight_years,
    totalYears:        testCase.total_years,
    preAccountYears:   testCase.pre_account_years,
    transIndex:        testCase.trans_index || testCase.avg_index,
  }
}

function runTest(testCasePath) {
  const absPath = path.resolve(ROOT, testCasePath)
  if (!fs.existsSync(absPath)) {
    console.error(`❌ 测试用例文件不存在: ${absPath}`)
    process.exit(1)
  }

  const testCase = JSON.parse(fs.readFileSync(absPath, 'utf8'))
  const province = testCase.province

  console.log(`\n📋 测试用例: ${province}/${testCase.case_id}`)
  console.log(`   性别: ${testCase.gender}, 出生: ${testCase.birth_year}-${testCase.birth_month}`)
  console.log(`   工作: ${testCase.work_year}-${testCase.work_month}, 退休: ${testCase.retire_year}-${testCase.retire_month}`)

  // 1. 加载省份配置（模拟云函数行为）
  let config
  try {
    config = loadProvinceConfig(province)
    console.log(`✅ 省份配置加载成功: ${province}`)
  } catch (err) {
    console.error(`❌ 省份配置加载失败: ${err.message}`)
    return false
  }

  // 2. 构造引擎输入（模拟小程序端传参）
  const input = mapCaseToEngineInput(testCase)
  console.log(`✅ 引擎输入参数构造完成`)

  // 3. 调用计算引擎（模拟云函数调用）
  let result
  try {
    result = engine.calculate(config, input)
    console.log(`✅ 计算引擎调用成功`)
    console.log(`   调试：引擎返回结果 =`, JSON.stringify(result, null, 2).substring(0, 500))
  } catch (err) {
    console.error(`❌ 计算引擎调用失败: ${err.message}`)
    return false
  }

  // 4. 对比结果
  const expected = testCase.expected
  // 引擎返回的结果在 legal 字段下，金额在 amount 字段里
  const legalResult = result.legal
  const actual = {
    basic_pension:       legalResult.basicPension.amount,
    personal_pension:    legalResult.personalAccount.amount,
    transitional_pension:  legalResult.transitionalPension.amount,
    total:                legalResult.total
  }

  console.log(`\n📊 结果对比:`)
  console.log(`   基础养老金: 预期=${expected.basic_pension}, 实际=${actual.basic_pension}, 差=${Math.abs(actual.basic_pension - expected.basic_pension).toFixed(2)}`)
  console.log(`   个人账户养老金: 预期=${expected.personal_pension}, 实际=${actual.personal_pension}, 差=${Math.abs(actual.personal_pension - expected.personal_pension).toFixed(2)}`)
  console.log(`   过渡性养老金: 预期=${expected.transitional_pension}, 实际=${actual.transitional_pension}, 差=${Math.abs(actual.transitional_pension - expected.transitional_pension).toFixed(2)}`)
  console.log(`   总额: 预期=${expected.total}, 实际=${actual.total}, 差=${Math.abs(actual.total - expected.total).toFixed(2)}`)

  // 5. 判断是否通过（容忍度 1 元）
  const tolerance = 1.0
  const passed = (
    Math.abs(actual.basic_pension - expected.basic_pension) <= tolerance &&
    Math.abs(actual.personal_pension - expected.personal_pension) <= tolerance &&
    Math.abs(actual.transitional_pension - expected.transitional_pension) <= tolerance &&
    Math.abs(actual.total - expected.total) <= tolerance
  )

  if (passed) {
    console.log(`\n✅ 测试通过！`)
  } else {
    console.log(`\n❌ 测试失败！`)
  }

  return passed
}

// 主程序
function main() {
  const testCasePath = process.argv[2] || 'cases/beijing/1.json'
  const passed = runTest(testCasePath)

  // 总结
  console.log(`\n${'='.repeat(50)}`)
  if (passed) {
    console.log(`🎉 联调验证成功！小程序前端可以正确调用计算引擎。`)
  } else {
    console.log(`⚠️  联调验证失败！需要检查数据格式或引擎逻辑。`)
  }
  console.log(`${'='.repeat(50)}`)

  process.exit(passed ? 0 : 1)
}

main()
