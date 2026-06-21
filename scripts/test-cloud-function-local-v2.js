/**
 * 本地模拟云函数调用测试脚本 v2
 * 用途：模拟小程序 wx.cloud.callFunction 调用，验证前后端数据格式对齐
 * 用法：node scripts/test-cloud-function-local-v2.js [测试用例路径]
 * 示例：node scripts/test-cloud-function-local-v2.js cases/beijing/1.json
 */

const fs   = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

// 重用 run-cases.js 的 mapCaseToInput 函数（字段映射已验证正确）
const { mapCaseToInput } = require('./run-cases.js')

// 加载引擎
let engine
const TRY_PATHS = [
  './cloudfunctions/calculate/pension-engine.js',
  './engine/pension-engine.js',
]
for (const p of TRY_PATHS) {
  if (fs.existsSync(p)) { engine = require(path.resolve(ROOT, p)); break; }
}
if (!engine) { console.error('❌ 找不到引擎'); process.exit(1); }
const { calculate } = engine

function loadProvinceConfig(province, useJsonFirst = true) {
  /**
   * 加载省份配置，优先用 .json（与 run-cases.js 一致）
   * 如果 useJsonFirst=false，则优先用 .js（模拟云函数行为）
   */
  const configPaths = [
    path.join(ROOT, 'provinces', `${province}.json`),
    path.join(ROOT, 'cloudfunctions', 'calculate', 'provinces', `${province}.json`),
  ]
  if (!useJsonFirst) {
    configPaths.unshift(
      path.join(ROOT, 'cloudfunctions', 'calculate', 'provinces', `${province}.js`)
    )
  }

  let config = null
  for (const p of configPaths) {
    if (fs.existsSync(p)) {
      if (p.endsWith('.js')) {
        const mod = require(path.resolve(p))
        config = mod.getEngineConfig ? mod.getEngineConfig() : mod
      } else {
        config = JSON.parse(fs.readFileSync(p, 'utf8'))
      }
      break
    }
  }
  if (!config) {
    throw new Error(`省份配置文件不存在: ${province}`)
  }
  return config
}

function runTest(testCasePath, useJsonFirst = true) {
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
    config = loadProvinceConfig(province, useJsonFirst)
    console.log(`✅ 省份配置加载成功: ${province} (${useJsonFirst ? 'json优先' : 'js优先'})`)
  } catch (err) {
    console.error(`❌ 省份配置加载失败: ${err.message}`)
    return false
  }

  // 2. 构造引擎输入（与 run-cases.js 相同的 mapCaseToInput 函数）
  const input = mapCaseToInput(testCase, config)
  console.log(`✅ 引擎输入参数构造完成`)

  // 3. 调用计算引擎（模拟云函数调用）
  let result
  try {
    result = calculate(config, input)
    console.log(`✅ 计算引擎调用成功`)
  } catch (err) {
    console.error(`❌ 计算引擎调用失败: ${err.message}`)
    return false
  }

  // 4. 提取结果（与 run-cases.js 相同的逻辑）
  const expected = testCase.expected || {}
  const legal = result.legal || result
  const actual = {
    basic_pension:       legal.basicPension?.amount       ?? legal.basicPension       ?? 0,
    personal_pension:     legal.personalAccount?.amount   ?? legal.personalAccountPension ?? 0,
    transitional_pension:  legal.transitionalPension?.amount ?? legal.transitionalPension ?? 0,
    total:               legal.total                    ?? 0,
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
  // 默认用 json 配置（与 verify.js/run-cases.js 一致）
  // 如果传 --cloud，则用 js 配置（模拟云函数行为）
  const useJsonFirst = !process.argv.includes('--cloud')
  const passed = runTest(testCasePath, useJsonFirst)

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
