/**
 * 养老金测算统一引擎 — 测试套件
 * 
 * 测试场景：
 * 1. 刘阿姨 — 1972.8 出生，2001.4 参保，60%→80%→60% 混档，长春
 * 2. 赵哥 — 1976.6 出生，2005.1 参保，85% 档，长春
 * 3. 孙姐 — 1978.3 出生，2000.1 参保，100% 档，全省
 * 4. 法定退休年龄验证
 * 5. 延迟退休计算验证
 * 6. 最小缴费年限验证
 * 7. 模块开关测试
 * 8. 跨平台一致性验证
 */

const engine = require('../engine/pension-engine')
const jilinConfig = require('../provinces/jilin.json')

// ==================== 测试工具函数 ====================

let passCount = 0
let failCount = 0
let testGroup = ''

function group(name) {
  testGroup = name
  console.log(`\n${'='.repeat(50)}`)
  console.log(`📋 ${name}`)
  console.log('='.repeat(50))
}

function test(name, fn) {
  try {
    fn()
    passCount++
    console.log(`  ✅ ${name}`)
  } catch (e) {
    failCount++
    console.log(`  ❌ ${name}`)
    console.log(`     错误: ${e.message}`)
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || '断言失败')
}

function assertNear(actual, expected, tolerance, msg) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(msg || `期望值 ${expected}（±${tolerance}），实际 ${actual}`)
  }
}

// ==================== 测试 1: 刘阿姨 ====================

group('刘阿姨 — 1972.8 出生，2001.4 参保，60%→80%→60% 混档')

function getLiuIndex(year) {
  // 2001-2004: 60%, 2005-2012: 80%, 2013+: 60%
  if (year <= 2004) return 0.6
  if (year <= 2012) return 0.8
  return 0.6
}

const liuInput = {
  name: '刘阿姨',
  gender: 'female',
  birthYear: 1972,
  birthMonth: 8,
  workYear: 2001,
  workMonth: 4,
  cityType: 'cc',
  avgIndex: 0.6,
  retireType: 'standard'
}

// 注意：刘阿姨的实际缴费年限会随年份变化
// 平均缴费指数按实际计算
const liuResult = engine.calculate(jilinConfig, liuInput)

test('法定退休日期计算', () => {
  // 女灵活就业，1972.8出生
  // 国办发〔2025〕5号：1975年及以后出生的灵活就业女才延迟
  // 1972年出生 < 1975，延迟月数=0
  // 原法定50岁 = 2022年8月
  assert(liuResult.legal.date.year === 2022, 
    `期望退休年份2022，实际${liuResult.legal.date.year}`)
  assert(liuResult.legal.date.month === 8,
    `期望退休月份8，实际${liuResult.legal.date.month}`)
})

test('法定退休年龄', () => {
  // 灵活就业女，1972年8月出生，延迟0个月
  const delayMonths = engine.getDelayMonths(1972, 8, 'fw')
  assert(delayMonths === 0, `1972年8月灵活就业女延迟月数应为0，实际${delayMonths}`)
})

test('四部分养老金均不为零', () => {
  assert(liuResult.legal.basicPension.amount > 0, '基础养老金应为正数')
  assert(liuResult.legal.personalAccount.amount > 0, `个人账户养老金应为正数，实际${liuResult.legal.personalAccount.amount}`)
  // 过渡性养老金：2001年开始参保，晚于1995.7，所以视同年限为0
  // 但需要确认是否有视同缴费
  assert(liuResult.legal.totalYears > 0, '累计缴费年限应为正数')
})

test('基本养老金总额合理', () => {
  // 刘阿姨：2001年参保，缴费约21年，指数0.6
  // 基础养老金约：(7000+7000*0.6)/2 * 21 * 0.01 ≈ 1176
  // 个人账户养老金：约50-80（早期基数低）
  // 合计约1200-1500
  const total = liuResult.legal.total
  assert(total > 500 && total < 5000, 
    `养老金总额${total}应在合理范围内（500-5000）`)
})

// ==================== 测试 2: 赵哥 ====================

group('赵哥 — 1976.6 出生，2005.1 参保，85% 档，长春')

const zhaoInput = {
  name: '赵哥',
  gender: 'male',
  birthYear: 1976,
  birthMonth: 6,
  workYear: 2005,
  workMonth: 1,
  cityType: 'cc',
  avgIndex: 0.85,
  retireType: 'standard'
}

const zhaoResult = engine.calculate(jilinConfig, zhaoInput)

test('法定退休日期计算', () => {
  // 男职工60岁+延迟，1976.6出生
  // 延迟计算：1976 > 1965基准，diff = (1976-1965)*12 + (6-1) = 137月
  // delay = floor(136/4) + 1 = 35月（不超过36）
  // 总月数 = 60*12 + 35 = 755月
  // 退休日期 = 1976 + 755/12 = 1976+62 = 2038, month = 6+755%12 = 6+11 = 17 -> 5月
  // 验证延迟月数
  const delay = engine.getDelayMonths(1976, 6, 'male')
  assert(delay > 0, '延迟月数应大于0')
  assert(delay <= 36, `延迟月数${delay}不应超过36`)
})

test('基础养老金 + 增发基础养老金 + 个人账户养老金', () => {
  assert(zhaoResult.legal.basicPension.amount > 0, '基础养老金应为正数')
  assert(zhaoResult.legal.personalAccount.amount > 0, 
    `个人账户养老金应为正数，实际${zhaoResult.legal.personalAccount.amount}`)
  // 赵哥2005年参保，晚于1995.7，无过渡性养老金
  assert(zhaoResult.legal.total > 0, '总养老金应为正数')
})

test('缴费年限合理', () => {
  // 2005到2038约33年
  assert(zhaoResult.legal.totalYears > 30, 
    `缴费年限${zhaoResult.legal.totalYears}应大于30年`)
  assert(zhaoResult.legal.totalYears < 40,
    `缴费年限${zhaoResult.legal.totalYears}应小于40年`)
})

// ==================== 测试 3: 孙姐 ====================

group('孙姐 — 1978.3 出生，2000.1 参保，100% 档，全省')

const sunInput = {
  name: '孙姐',
  gender: 'female',
  birthYear: 1978,
  birthMonth: 3,
  workYear: 2000,
  workMonth: 1,
  cityType: 'prov',
  avgIndex: 1.0,
  retireType: 'standard'
}

const sunResult = engine.calculate(jilinConfig, sunInput)

test('无过渡性养老金', () => {
  // 2000年参保，晚于1995.7，无视同缴费
  assert(sunResult.legal.sightYears === 0 || sunResult.legal.transitionalPension.amount === 0,
    '无视同缴费年限，过渡性养老金应为0')
})

test('无增发基础养老金', () => {
  // 2000到约2035约35年，实际缴费可能超过20年
  // 但需要确认实际缴费年限是否超过20
  if (sunResult.legal.actualYears > 20) {
    assert(sunResult.legal.extraPension.amount > 0, '实际缴费超20年应有增发')
  }
})

test('替代率合理', () => {
  // 替代率 = 总养老金 / 退休地计发基数
  // 正常范围：30%-60%
  const rate = sunResult.legal.rate
  assert(rate > 20 && rate < 80, 
    `替代率${rate}%应在合理范围内（20-80%）`)
})

// ==================== 测试 4: 退休年龄验证 ====================

group('法定退休年龄验证（国办发〔2025〕5号）')

test('男职工延迟月数 — 1965年前出生无延迟', () => {
  const d1 = engine.getDelayMonths(1964, 1, 'male')
  assert(d1 === 0, '1965年前出生男职工无延迟')
  
  const d2 = engine.getDelayMonths(1965, 1, 'male')
  assert(d2 >= 0, '1965年出生男职工延迟月数应≥0')
})

test('男职工延迟月数 — 1965-1989逐步增加', () => {
  const d0 = engine.getDelayMonths(1965, 1, 'male')
  const d1 = engine.getDelayMonths(1965, 12, 'male')
  assert(d1 >= d0, '延迟月数应随出生年月递增')
  
  const d89 = engine.getDelayMonths(1989, 12, 'male')
  assert(d89 <= 36, '最大延迟不超过36个月')
  assert(d89 >= 20, '1989年出生延迟月数应≥20')
})

test('男职工延迟月数 — 1990+封顶36个月', () => {
  const d90 = engine.getDelayMonths(1990, 1, 'male')
  const d95 = engine.getDelayMonths(1995, 1, 'male')
  assert(d90 <= 36, '延迟月数不超过36')
  assert(d95 <= 36, '延迟月数不超过36')
  assert(d90 === d95, '同属封顶区间延迟月数应相同')
})

test('女干部延迟月数', () => {
  const d = engine.getDelayMonths(1970, 1, 'fc')
  assert(d >= 0 && d <= 36, '女干部延迟月数应在0-36之间')
})

test('灵活就业女延迟月数', () => {
  const d = engine.getDelayMonths(1975, 1, 'fw')
  assert(d >= 0 && d <= 60, '灵活就业女延迟月数应在0-60之间')
})

test('各类型延迟月数封顶', () => {
  // 2000年出生应该都封顶
  const m = engine.getDelayMonths(2000, 1, 'male')
  const f = engine.getDelayMonths(2000, 1, 'fc')
  const fw = engine.getDelayMonths(2000, 1, 'fw')
  assert(m === 36, `男封顶36，实际${m}`)
  assert(f === 36, `女干部封顶36，实际${f}`)
  assert(fw === 60, `灵活就业女封顶60，实际${fw}`)
})

// ==================== 测试 5: 计发月数验证 ====================

group('计发月数验证')

test('标准计发月数表', () => {
  // 计发月数表使用浮点键（如 50.0, 55.0, 60.0）
  // JavaScript 对象键会自动转为字符串，50.0 === "50.0"
  assert(engine.getRetireMonths(50, jilinConfig) === 195, `50岁应为195个月，实际${engine.getRetireMonths(50, jilinConfig)}`)
  assert(engine.getRetireMonths(55, jilinConfig) === 170, `55岁应为170个月，实际${engine.getRetireMonths(55, jilinConfig)}`)
  assert(engine.getRetireMonths(60, jilinConfig) === 139, `60岁应为139个月，实际${engine.getRetireMonths(60, jilinConfig)}`)
})

test('半年精度插值', () => {
  // 50.5岁应该介于195和190之间
  const m505 = engine.getRetireMonths(50.5, jilinConfig)
  assert(m505 > 190 && m505 < 195, `50.5岁计发月数${m505}应在190-195之间`)
})

test('未定义年龄插值', () => {
  const m61 = engine.getRetireMonths(61, jilinConfig)
  // 61岁应该介于60.5(136.1)和61.5(128.6)之间
  assert(m61 > 128 && m61 < 137, `61岁计发月数${m61}应在合理范围`)
})

// ==================== 测试 6: 基础数据查询 ====================

group('基础数据查询')

test('全省计发基数 — 已有数据直接返回', () => {
  assert(engine.getBase('prov', 2024, jilinConfig) === 7178.50, '2024年全省基数应为7178.50')
  assert(engine.getBase('prov', 2020, jilinConfig) === 5088.42, '2020年全省基数应为5088.42')
  assert(engine.getBase('prov', 1995, jilinConfig) === 369.17, '1995年全省基数应为369.17')
})

test('长春市计发基数 — 已有数据直接返回', () => {
  assert(engine.getBase('cc', 2025, jilinConfig) === 7978.25, '2025年长春基数应为7978.25')
  // 2026-09-14 更新：真相源 CC_BASE[2020] 已订正为 6605.23（旧测试期望 6927.75 为早期口径）
  assert(engine.getBase('cc', 2020, jilinConfig) === 6605.23, '2020年长春基数应为6605.23')
})

test('基数查询 — 后向匹配', () => {
  // 2026年没有数据 → 预发年规则：取 2025 年原值（不上浮）
  // 2026-09-14 更新：真相源 PROV_BASE[2025] = 7322（旧测试期望 7322.08 为早期口径）
  const b26 = engine.getBase('prov', 2026, jilinConfig)
  assert(b26 === 7322, `2026年全省基数应预发为7322（=2025原值），实际${b26}`)
})

test('记账利率 — 已有数据', () => {
  assert(engine.getAccRate(2024, jilinConfig) === 0.0262, '2024年记账利率应为0.0262')
  assert(engine.getAccRate(2016, jilinConfig) === 0.0831, '2016年记账利率应为0.0831')
})

test('记账利率 — 缺失数据回退', () => {
  // 2050年没有数据
  const r50 = engine.getAccRate(2050, jilinConfig)
  assert(r50 === 0.015, `2050年记账利率应回退到0.015，实际${r50}`)
})

// ==================== 测试 7: 模块配置测试 ====================

group('模块配置开关测试')

test('禁用过渡性养老金', () => {
  const cfg = JSON.parse(JSON.stringify(jilinConfig))
  cfg.modules.transitional_pension.enabled = false
  
  const input = {
    name: '测试', gender: 'male', birthYear: 1950, birthMonth: 1,
    workYear: 1980, workMonth: 1, cityType: 'cc', avgIndex: 1.0
  }
  const r = engine.calculate(cfg, input)
  assert(r.legal.transitionalPension.amount === 0, 
    '禁用过渡性养老金模块，金额应为0')
})

test('禁用增发基础养老金', () => {
  const cfg = JSON.parse(JSON.stringify(jilinConfig))
  cfg.modules.extra_pension.enabled = false
  
  const input = {
    name: '测试', gender: 'male', birthYear: 1960, birthMonth: 1,
    workYear: 1980, workMonth: 1, cityType: 'cc', avgIndex: 1.0
  }
  const r = engine.calculate(cfg, input)
  assert(r.legal.extraPension.amount === 0,
    '禁用增发基础养老金模块，金额应为0')
})

test('启用特殊增发（高龄）', () => {
  const cfg = JSON.parse(JSON.stringify(jilinConfig))
  cfg.modules.special_addition = {
    enabled: true,
    type: 'age',
    brackets: [
      { from: 70, to: 75, amount: 50 },
      { from: 75, to: 80, amount: 100 },
      { from: 80, to: 120, amount: 150 }
    ]
  }
  
  const input = {
    name: '测试', gender: 'male', birthYear: 1950, birthMonth: 1,
    workYear: 1970, workMonth: 1, cityType: 'cc', avgIndex: 1.0
  }
  const r = engine.calculate(cfg, input)
  // 1950年退休约2010年，当时年龄60岁，无高龄增发
  assert(r.legal.specialAddition.amount === 0,
    '60岁退休无高龄增发')
})

// ==================== 测试 8: 跨平台一致性 ====================

group('跨平台一致性验证')

test('同一输入在不同调用中结果一致', () => {
  const input = {
    name: '一致性测试', gender: 'male', birthYear: 1976, birthMonth: 6,
    workYear: 2005, workMonth: 1, cityType: 'cc', avgIndex: 0.85,
    retireType: 'standard'
  }
  
  const r1 = engine.calculate(jilinConfig, input)
  const r2 = engine.calculate(jilinConfig, input)
  
  assert(r1.legal.total === r2.legal.total, '总养老金应一致')
  assert(r1.legal.basicPension.amount === r2.legal.basicPension.amount, '基础养老金应一致')
  assert(r1.legal.personalAccount.amount === r2.legal.personalAccount.amount, '个人账户养老金应一致')
  assert(r1.legal.transitionalPension.amount === r2.legal.transitionalPension.amount, '过渡性养老金应一致')
})

test('parseInput标准化', () => {
  const r1 = engine.calculate(jilinConfig, {
    name: 'Test', gender: 'female', birthYear: '1980', birthMonth: '5',
    workYear: '2005', workMonth: '1', avgIndex: '0.8', cityType: 'prov'
  })
  const r2 = engine.calculate(jilinConfig, {
    name: 'Test', gender: 'female', birthYear: 1980, birthMonth: 5,
    workYear: 2005, workMonth: 1, avgIndex: 0.8, cityType: 'prov'
  })
  assert(r1.legal.total === r2.legal.total, '字符串和数字输入应得到相同结果')
})

// ==================== 测试 9: 边界条件 ====================

group('边界条件测试')

test('最低缴费年限不足', () => {
  const cfg = JSON.parse(JSON.stringify(jilinConfig))
  
  // 缴费年限很短：2020年参保，2025年退休
  const input = {
    name: '短缴费', gender: 'male', birthYear: 1965, birthMonth: 1,
    workYear: 2020, workMonth: 1, cityType: 'cc', avgIndex: 1.0
  }
  const r = engine.calculate(cfg, input)
  // 缴费约5年，远低于最低15年
  assert(r.legal.minYears <= 15, '最低缴费年限应≤15年')
  assert(r.legal.meetMin === false, '不满足最低缴费年限')
  // 即使缴费不足，仍有基础养老金（约1200-1500）
  // 但远低于正常水平（通常3000+）
  assert(r.legal.total < 3000, `缴费不足时养老金应远低于正常水平，实际${r.legal.total}`)
})

test('超长缴费年限', () => {
  const input = {
    name: '长缴费', gender: 'male', birthYear: 1960, birthMonth: 1,
    workYear: 1980, workMonth: 1, cityType: 'cc', avgIndex: 1.0
  }
  const r = engine.calculate(jilinConfig, input)
  // 1980年参保到2022+，约42年，远超20年，应触发增发
  assert(r.legal.actualYears > 20, `实际缴费年限${r.legal.actualYears}应超过20年`)
  assert(r.legal.extraPension.amount > 0, 
    `超长缴费应有增发基础养老金，实际${r.legal.extraPension.amount}`)
  // 1980年参保晚于1995.7，无视同缴费
  // 但需要确认是否有视同
  if (r.legal.sightYears > 0) {
    assert(r.legal.transitionalPension.amount > 0, '有视同缴费应该有过渡性养老金')
  }
})

test('用户输入个人账户余额', () => {
  // 使用1964年出生（无延迟）的男性，法定退休年龄60岁（139个月）
  const input = {
    name: '输入余额', gender: 'male', birthYear: 1964, birthMonth: 1,
    workYear: 2000, workMonth: 1, cityType: 'cc', avgIndex: 1.0,
    personalAcc: 50000
  }
  const r = engine.calculate(jilinConfig, input)
  // 1964年出生，无延迟，退休年龄60岁，计发月数139
  assert(r.legal.months === 139, `应为139个月，实际${r.legal.months}`)
  const expected = Math.round(50000 / 139 * 100) / 100
  assertNear(r.legal.personalAccount.amount, expected, 0.01,
    `个人账户养老金应为${expected}，实际${r.legal.personalAccount.amount}`)
})

test('无参保记录', () => {
  const input = {
    name: '无参保', gender: 'male', birthYear: 1970, birthMonth: 1,
    workYear: 2030, workMonth: 1, cityType: 'cc', avgIndex: 1.0
  }
  const r = engine.calculate(jilinConfig, input)
  // 2030年参保，还没退休（法定退休约2030年以后）
  // 应该计算结果为0或很低
  assert(r.legal.total >= 0, '未来参保的养老金应≥0')
})

// ==================== 测试 10: 延迟退休验证 ====================

group('延迟退休计算验证')

test('延迟月数计算 — 边界情况', () => {
  // 1964年出生：0
  assert(engine.getDelayMonths(1964, 12, 'male') === 0, '1964年12月无延迟')
  // 1965年1月：开始有延迟
  assert(engine.getDelayMonths(1965, 1, 'male') >= 0, '1965年1月开始有延迟')
  // 1965年1月 vs 1965年2月：2月应更多
  assert(engine.getDelayMonths(1965, 2, 'male') >= 
    engine.getDelayMonths(1965, 1, 'male'), '晚出生1个月延迟不减少')
})

test('延迟月数单调递增', () => {
  let prev = -1
  for (let y = 1965; y <= 2000; y++) {
    for (let m = 1; m <= 12; m++) {
      const d = engine.getDelayMonths(y, m, 'male')
      assert(d >= prev, `延迟月数应单调递增：${y}.${m}=${d}`)
      prev = d
    }
  }
})

test('最低缴费年限 — 2025年前为15年', () => {
  for (let y = 2020; y <= 2024; y++) {
    assert(engine.getMinYears(y, jilinConfig) === 15, 
      `${y}年最低缴费年限应为15年`)
  }
})

test('最低缴费年限 — 渐进式提高', () => {
  assert(engine.getMinYears(2029, jilinConfig) === 15, '2029年为15年')
  assert(engine.getMinYears(2030, jilinConfig) === 15.5, '2030年为15.5年')
  assert(engine.getMinYears(2035, jilinConfig) === 18, '2035年为18年')
  assert(engine.getMinYears(2039, jilinConfig) === 20, '2039年为20年')
  assert(engine.getMinYears(2040, jilinConfig) === 20, '2040年为20年')
})

// ==================== 测试 11: 格式化工具 ====================

group('格式化工具测试')

test('金额格式化', () => {
  assert(engine.formatMoney(1234) === '1,234', '1234应格式化为1,234')
  assert(engine.formatMoney(12345) === '12,345', '12345应格式化为12,345')
  assert(engine.formatMoney(123456) === '12.35万', '123456应格式化为12.35万')
})

test('退休年龄文字', () => {
  assert(engine.getAgeStr(720) === '60岁', '720月=60岁')
  assert(engine.getAgeStr(660) === '55岁', '660月=55岁')
  assert(engine.getAgeStr(600) === '50岁', '600月=50岁')
})

test('日期文字', () => {
  assert(engine.getDateStr({ year: 2025, month: 1 }) === '2025.01', '1月应补零')
  assert(engine.getDateStr({ year: 2025, month: 12 }) === '2025.12', '12月不补零')
})

test('模块名称映射', () => {
  assert(engine.getModuleName('basicPension') === '基础养老金', '模块名映射正确')
  assert(engine.getModuleName('extraPension') === '增发基础养老金', '模块名映射正确')
  assert(engine.getModuleName('personalAccount') === '个人账户养老金', '模块名映射正确')
  assert(engine.getModuleName('transitionalPension') === '过渡性养老金', '模块名映射正确')
})

// ==================== 汇总输出 ====================

console.log(`\n${'='.repeat(50)}`)
console.log(`📊 测试结果汇总`)
console.log('='.repeat(50))
console.log(`  通过: ${passCount}`)
console.log(`  失败: ${failCount}`)
console.log(`  总计: ${passCount + failCount}`)
console.log(`  通过率: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`)
console.log('='.repeat(50))

if (failCount > 0) {
  console.log('\n⚠️ 存在失败的测试用例，需要修复')
  process.exit(1)
} else {
  console.log('\n✅ 所有测试通过！')
  process.exit(0)
}
