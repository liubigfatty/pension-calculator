#!/usr/bin/env node
/**
 * verify-jilin-cases.js
 * 批量验证 cases/jilin/ 下所有案例（支持多种格式）
 * 用法：node scripts/verify-jilin-cases.js
 */
const fs   = require('fs')
const path = require('path')

const ROOT     = path.resolve(__dirname, '..')
const JILIN_DIR  = path.join(ROOT, 'cases', 'jilin')
const CONFIG_PATH = path.join(ROOT, 'provinces', 'jilin.json')

// ── 装载引擎 + 省份配置 ────────────────────────────
const engine = require(path.join(ROOT, 'engine', 'pension-engine.js'))
const { calculate } = engine
const jilinConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))

// ── 日期解析 ──────────────────────────────────────────
function parseDate(str) {
  if (!str) return null
  // "1971年02月" / "1971年02月10日"
  let m = str.match(/(\d{4})年(\d{1,2})月/)
  if (m) return { year: +m[1], month: +m[2] }
  // "1965-08-19" / "1965-08"
  m = str.match(/^(\d{4})-(\d{2})/)
  if (m) return { year: +m[1], month: +m[2] }
  return null
}

// ── 数字解析 ──────────────────────────────────────────
function num(v) {
  if (v == null) return undefined
  if (typeof v === 'number') return v
  return parseFloat(String(v).replace(/[,，元\s￥%]/g, ''))
}

// ── 城市 → cityType ───────────────────────────────────
function mapCityType(city) {
  if (!city) return 'prov'
  if (/长春/.test(city)) return 'cc'
  return 'prov'
}

// ── 性别 → gender + genderType ────────────────────────
function mapGender(gender) {
  if (!gender) return 'male'
  if (/女/.test(gender)) return 'female'
  return 'male'
}
function mapGenderType(gender) {
  if (!gender) return 'male'
  if (/女/.test(gender)) return 'fw'  // 默认原50岁
  return 'male'
}

// ── 案例 → 引擎输入 ──────────────────────────────────
function caseToInput(c) {
  const birth     = parseDate(c.birth || c.birth_date)
  const workStart = parseDate(c.work_start || c.work_start_date || c.employment_start_date)
  if (!birth || !workStart) return null

  // 嵌套字段兼容
  const cy = c.contribution_years || {}
  const cp = c.calculation_params || c.calculation_parameters || {}

  const input = {
    name:        String(c.case_id || 'test'),
    gender:       mapGender(c.gender),
    birthYear:    birth.year,
    birthMonth:   birth.month,
    workYear:     workStart.year,
    workMonth:    workStart.month,
    cityType:     mapCityType(c.city),
    genderType:   mapGenderType(c.gender),
    provinceKey:  'jilin',
    avgIndex:      num(c.avg_index || cp.avg_wage_index || cp.average_wage_index),
    personalAcc:  num(c.personal_account || cp.personal_account_balance || cp.personal_account),
    sightYears:   num(c.deemed_years || cy.deemed_years),
    totalYears:   num(c.total_years || cy.total_years),
    baseRetire:   num(c.base_number_city || cp.city_base_amount || cp.pension_base),
    baseProv:     num(c.base_number_province || cp.province_base_amount || cp.pension_base),
    skipDelay:    true,   // 验证场景：跳过延迟退休
  }

  // 计发月数：优先用案例指定值
  const months = num(c.months || cp.payment_months || cp.payment_months)
  if (months) input.months = months

  return input
}

// ── 提取期望值（兼容多种格式）───────────────────────
function getExpected(c) {
  const pb  = c.pension_breakdown || {}

  // 增发养老金：兼容多种格式
  let extra = undefined

  // 格式1: pb.basic_pension_increment = 300.75 (数字)
  if (typeof pb.basic_pension_increment === 'number') {
    extra = pb.basic_pension_increment
  }
  // 格式2: pb.basic_pension_increment = { total: 300.75 }
  else if (pb.basic_pension_increment?.total != null) {
    extra = pb.basic_pension_increment.total
  }
  // 格式3: pb.basic_pension_increase_by_tenure = { total: ... }
  else if (pb.basic_pension_increase_by_tenure?.total != null) {
    extra = pb.basic_pension_increase_by_tenure.total
  }
  // 格式4: c.total_years_bonus
  if (extra == null && c.total_years_bonus != null) {
    extra = num(c.total_years_bonus)
  }

  return {
    basic:        num(c.basic_pension || pb.basic_pension),
    extra:         extra != null ? num(extra) : 0,
    personal:      num(c.personal_pension || pb.personal_account_pension),
    transitional:  num(c.transition_pension || pb.transitional_pension),
    total:         num(c.total || c.total_pension || pb.total_pension || pb.monthly_basic_pension_total),
  }
}

// ── 比对 ──────────────────────────────────────────────
function diff(actual, expected, label, tol = 1) {
  if (expected == null) return null
  if (actual == null) return `  ❌ ${label}：引擎未计算（undefined）`
  const d = Math.abs(actual - expected)
  if (d <= tol) return null
  return `  ❌ ${label}：引擎 ¥${actual.toFixed(2)} vs 官方 ¥${expected.toFixed(2)}（差¥${d.toFixed(2)}）`
}

// ── 主流程 ────────────────────────────────────────────
function main() {
  const files = fs.readdirSync(JILIN_DIR).filter(f => f.endsWith('.json')).sort()
  const result = { pass: 0, fail: 0, skip: 0 }

  console.log(`\n=== 吉林案例批量验证（共 ${files.length} 个）===\n`)

  for (const file of files) {
    const fpath = path.join(JILIN_DIR, file)
    let c
    try { c = JSON.parse(fs.readFileSync(fpath, 'utf8')) }
    catch { result.skip++; continue }

    const input    = caseToInput(c)
    const expected = getExpected(c)

    if (!input) {
      console.log(`  ⚠️  SKIP ${file}：无法解析输入字段`)
      result.skip++
      continue
    }
    if (!expected.total) {
      console.log(`  ⚠️  SKIP ${file}：无法提取期望值`)
      result.skip++
      continue
    }

    let actual
    try {
      actual = calculate(jilinConfig, input)
    } catch (e) {
      console.log(`  ❌ FAIL ${file}：引擎报错 ${e.message}`)
      result.fail++
      continue
    }

    const L = actual.legal
    const errors = [
      diff(L.basicPension?.amount,       expected.basic,       '基础养老金'),
      diff(L.extraPension?.amount,       expected.extra,       '增发养老金'),
      diff(L.personalAccount?.amount,     expected.personal,    '个人账户养老金'),
      diff(L.transitionalPension?.amount, expected.transitional, '过渡性养老金'),
      diff(L.total,                       expected.total,        '合计'),
    ].filter(Boolean)

    if (errors.length === 0) {
      console.log(`  ✅ PASS  ${file}`)
      result.pass++
    } else {
      console.log(`  ❌ FAIL  ${file}：`)
      errors.forEach(e => console.log(e))
      // 调试：打印引擎输入
      if (file === '29.json') {
        console.log(`      [调试] input =`, JSON.stringify(input, null, 2))
        console.log(`      [调试] 引擎personalAcc=`, L.personalAccount)
      }
      result.fail++
    }
  }

  console.log(`\n=== 汇总 ===`)
  console.log(`  ✅ 通过：${result.pass}`)
  console.log(`  ❌ 失败：${result.fail}`)
  console.log(`  ⚠️  跳过：${result.skip}`)
  console.log(`  总计：${files.length}`)
}

main()
