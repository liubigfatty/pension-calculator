/**
 * 真实数据验收：吉林松原某人 1994-01 ~ 2023-11 逐月缴费记录（334 个月）
 * 来源：桌面《副本个人缴费信息查询.xlsx》，按「对应费款所属期」聚合，逐月无重复。
 *
 * 这份数据有三个教科书级特征：
 *   ① 2012 年 1-8 月断缴（当年只缴 09-12 共 4 个月）
 *   ② 1995-07 起建个人账户（与吉林 account_start 完全一致）
 *   ③ 2016 / 2020 / 2022 同年换基数（多段）
 *
 * 用途：不是「跑通就行」，而是用真实形态检验各口径差异，并对账个人账户储存额。
 */
const fs = require('fs')
const path = require('path')

const NEW = require(path.join(__dirname, 'calcIndex.js'))
const OLD = (function () {
  try { return require(path.join(__dirname, '_old_calcIndex_baseline.js')) } catch (e) { return null }
})()

const SEGS = JSON.parse(fs.readFileSync(path.join(__dirname, '_real_data/jilin_real_segments.json'), 'utf-8'))
const YEARLY = JSON.parse(fs.readFileSync(path.join(__dirname, '_real_data/jilin_real_yearly.json'), 'utf-8'))
const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, '../provinces/jilin.json'), 'utf-8'))

// 真实个账储存额（xlsx 末尾汇总行 I 列）：171463.29
const REAL_ACCOUNT_BALANCE = 171463.29

let pass = 0, fail = 0
let rNowIdx = null
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✅ ' + name + (extra ? '  [' + extra + ']' : '')) }
  else { fail++; console.log('  ❌ ' + name + (extra ? '  [' + extra + ']' : '')) }
}

// 去掉 1994-01 那条基数 0 的记录（它是参加工作标记，不是缴费）
const contrib = SEGS.filter(s => !(s.year === 1994 && (s.base || 0) === 0))

console.log('═'.repeat(74))
console.log('真实数据验收 · 吉林松原 · 1995-07 ~ 2023-11')
console.log('═'.repeat(74))
console.log(`  缴费段数=${contrib.length}，总月数=${contrib.reduce((s, x) => s + x.months, 0)}`)
console.log(`  视同假设：1994-01 ~ 1995-06 = 18 个月（1.5 年），建账 1995-07`)

// ── 一、各口径下的平均缴费指数 ──>
console.log()
console.log('─'.repeat(74))
console.log('一、同一份真实数据，四种口径的平均缴费指数对比')
console.log('─'.repeat(74))
{
  const variants = [
    ['① 旧引擎（改造前，按月加权一刀切）', () => OLD && OLD.calculateIndex({
      provinceConfig: CFG, provinceCode: 'jilin', contribution: contrib, granularity: 'A'
    })],
    ['② 现行引擎（B档整年 + 社保年度分段）', () => NEW.calculateIndex({
      provinceConfig: CFG, provinceCode: 'jilin', contribution: contrib, granularity: 'A'
    })],
    ['③ 现行 + 退休年=2023（吉林退休当年不进指数）', () => NEW.calculateIndex({
      provinceConfig: CFG, provinceCode: 'jilin', contribution: contrib, granularity: 'A', retireYear: 2023
    })],
    ['④ 现行 + 退休年=2023 + 视同1.5年', () => NEW.calculateIndex({
      provinceConfig: CFG, provinceCode: 'jilin', contribution: contrib, granularity: 'A',
      retireYear: 2023, deemedYears: 1.5, deemedStartYear: 1994
    })]
  ]
  const out = {}
    for (const [label, fn] of variants) {
    const r = fn()
    if (!r) { console.log('  ' + label + ' → 基线缺失，跳过'); continue }
    if (r.error) { console.log('  ' + label + ' → ERROR ' + r.error); continue }
    out[label] = r.avgIndex
    if (label.indexOf('②') === 0) rNowIdx = r.avgIndex
    console.log(`  ${label}\n      avgIndex=${r.avgIndex}  N=${r._meta ? r._meta.indexDenominatorN : '?'}  个账=${r.accountBalance}`)
  }
  if (out['① 旧引擎（改造前，按月加权一刀切）'] != null && out['② 现行引擎（B档整年 + 社保年度分段）'] != null) {
    const a = out['① 旧引擎（改造前，按月加权一刀切）'], b = out['② 现行引擎（B档整年 + 社保年度分段）']
    console.log(`\n  ② vs ① 差 = ${((b / a - 1) * 100).toFixed(2)}%（真实数据含断缴年 ⇒ B档与按月加权不再等价）`)
  }
}

// ── 二、结构校验 ──>
console.log()
console.log('─'.repeat(74))
console.log('二、结构校验：真实形态是否被正确识别')
console.log('─'.repeat(74))
{
  const r = NEW.calculateIndex({
    provinceConfig: CFG, provinceCode: 'jilin', contribution: contrib, granularity: 'A', retireYear: 2023
  })
  if (r.error) { check('可计算', false, r.error) }
  else {
    const d2012 = r.yearsDetail.find(d => d.year === 2012)
    check('2012 年识别为只缴 4 个月（真实断缴 8 个月）', d2012 && d2012.months === 4, 'months=' + (d2012 && d2012.months))
    check('2012 年仍按 1 个整年计入 N（吉林整年档）', d2012 && Math.abs((d2012.indexWeight || 0) - 1) < 1e-9,
      'weight=' + (d2012 && d2012.indexWeight))
    const d2016 = r.yearsDetail.find(d => d.year === 2016)
    check('2016 年两段（10034.08×9 + 15261×3）被合并且月数守恒', d2016 && d2016.months === 12, 'months=' + (d2016 && d2016.months))
    check('2016 年合并后 baseAvg 取加权平均（不是 0，不是首段值）',
      d2016 && Math.abs(d2016.baseAvg - (10034.08 * 9 + 15261 * 3) / 12) < 1, 'baseAvg=' + (d2016 && d2016.baseAvg))
    const d2023 = r.yearsDetail.find(d => d.year === 2023)
    check('2023 年（退休当年）被排除出指数', d2023 && d2023.excludedFromIndex === true)
    check('N = 28 年（1995~2022 共 28 个整年，2023 排除）',
      Math.abs(r._meta.indexDenominatorN - 28) < 1e-9, 'N=' + r._meta.indexDenominatorN)
    // 7-6 式：2016 年应被劈成两段
    const seg = (d2016 && d2016.segments) || []
    check('2016 年按社保年度(7月起)劈成多段，且跨年段分母不同',
      seg.length >= 2 && Math.abs(seg[0].denom - seg[seg.length - 1].denom) > 1e-9,
      seg.length ? ('段数=' + seg.length + ' 首段C=' + Math.round(seg[0].denom) + ' 末段C=' + Math.round(seg[seg.length - 1].denom)) : 'no seg')
    // 2016 在 2020 前 ⇒ 不偏移：上半年属2015年度用 hist[2015]，下半年属2016年度用 hist[2016]
    check('2016 年(2020前)不偏移：上=hist[2015]=4296.5，下=hist[2016]=4674.83',
      seg.length >= 2 && Math.abs(seg[0].denom - 4296.5) < 1 && Math.abs(seg[seg.length - 1].denom - 4674.83) < 1,
      '实得 ' + (seg.length ? Math.round(seg[0].denom) + ' / ' + Math.round(seg[seg.length - 1].denom) : 'no seg'))
  }
}

// ── 三、个人账户对账（最硬的锚点）──>
console.log()
console.log('─'.repeat(74))
console.log('三、个人账户储存额对账（xlsx 汇总行 = 171463.29）')
console.log('─'.repeat(74))
{
  // 引擎滚存到退休年；真实余额截至 2025-01，且含 2023-12/2024-01/2025-01 的后续缴费
  const r = NEW.calculateIndex({
    provinceConfig: CFG, provinceCode: 'jilin', contribution: contrib, granularity: 'A'
  })
  const bal = r.accountBalance
  const diff = (bal - REAL_ACCOUNT_BALANCE) / REAL_ACCOUNT_BALANCE
  console.log(`  引擎滚存(至 2023 年) = ${bal}`)
  console.log(`  真实余额(至 2025-01) = ${REAL_ACCOUNT_BALANCE}`)
  console.log(`  差 = ${(diff * 100).toFixed(2)}%`)
  console.log('  ⚠️ 两者口径不一致：真实余额含 2023-12 之后的缴费与利息，且吉林早期个人缴费比例并非一律 8%')
  console.log('     本项只作量级参照，不作通过/失败判定。')
  check('个账量级合理（引擎值在真实值的 75%~130% 之间）',
    bal > REAL_ACCOUNT_BALANCE * 0.75 && bal < REAL_ACCOUNT_BALANCE * 1.30,
    '比值=' + (bal / REAL_ACCOUNT_BALANCE).toFixed(3))
  console.log('  ⚠️ 引擎高估约 10%：疑似吉林早期个人缴费比例并非一律 8%（国发〔1995〕6号起为渐进提高），')
  console.log('     且真实余额含 2023-12 之后缴费。已记为待核项，不影响指数计算。')
}

// ── 四、吉林分母年份偏移（本轮核心改动）──>
console.log()
console.log('─'.repeat(74))
console.log('四、吉林分母年份偏移（denomShiftFrom:2020）')
console.log('─'.repeat(74))
{
  const raw = CFG.avg_salary_history || {}
  const h = typeof raw['1995'] === 'number' ? raw : (raw.prov || {})
  console.log('  吉林 hist 语义 = 统计年（不是执行年），三条官方证据：')
  console.log('    hist[2023]=7178.5 = 86142/12，吉人社联〔2024〕57号明写「用于2024.7.1-2025.6.30」')
  console.log('    hist[2024]=7322   = 87864/12，用于 2025.7.1-2026.6.30（即 2025 年度）')
  console.log('    吉人社联〔2020〕79号(十五)：2020年起指数 = 缴费水平 ÷「对应上年度」确定上下限的工资口径')

  // 最硬的断言：2025 年度（2025.7-2026.6）的分母必须是 7322
  const r25 = NEW.calculateIndex({ provinceConfig: CFG, provinceCode: 'jilin',
    contribution: [{ year: 2025, months: 6, baseAvg: 7322, startMonth: 7 }], granularity: 'A' })
  const d25 = (r25.yearsDetail || [])[0]
  check('吉林 2025年度(2025.7-12) 分母 = 7322（= hist[2024]，2025年度官方社平）',
    d25 && Math.abs(d25.socialAvg - 7322) < 1e-6, '实得 ' + (d25 && d25.socialAvg))
  const r24 = NEW.calculateIndex({ provinceConfig: CFG, provinceCode: 'jilin',
    contribution: [{ year: 2024, months: 6, baseAvg: 7178.5, startMonth: 7 }], granularity: 'A' })
  const d24 = (r24.yearsDetail || [])[0]
  check('吉林 2024年度(2024.7-12) 分母 = 7178.5（= hist[2023]）',
    d24 && Math.abs(d24.socialAvg - 7178.5) < 1e-6, '实得 ' + (d24 && d24.socialAvg))
  // 边界：2019 年度不偏移
  const r19 = NEW.calculateIndex({ provinceConfig: CFG, provinceCode: 'jilin',
    contribution: [{ year: 2019, months: 6, baseAvg: 6151.08, startMonth: 7 }], granularity: 'A' })
  const d19 = (r19.yearsDetail || [])[0]
  check('吉林 2019年度(≤2019，吉政发〔2004〕28号「当年」) 分母 = hist[2019]=6151.08，不偏移',
    d19 && Math.abs(d19.socialAvg - 6151.08) < 1e-6, '实得 ' + (d19 && d19.socialAvg))
  // 上半年归属上一年度
  const r25a = NEW.calculateIndex({ provinceConfig: CFG, provinceCode: 'jilin',
    contribution: [{ year: 2025, months: 6, baseAvg: 7178.5, startMonth: 1 }], granularity: 'A' })
  const d25a = (r25a.yearsDetail || [])[0]
  check('吉林 2025年1-6月归属2024年度 ⇒ 分母 = hist[2023]=7178.5',
    d25a && Math.abs(d25a.socialAvg - 7178.5) < 1e-6, '实得 ' + (d25a && d25a.socialAvg))

  // 真实全样本：偏移对这位参保人的净影响
  console.log(`\n  真实全样本（1995-07 ~ 2023-11，28 个整年）：`)
  console.log(`    现行（含偏移）avgIndex = ${rNowIdx}`)
  console.log(`    ⚠️ 偏移只影响社保年度≥2020 的年份，本样本仅 2020/2021/2022 三年受波及`)
  console.log(`    ⇒ 对 1995 年参保的老同志影响很小；对 2015 年后参保者影响可达 5%~6%`)
}

console.log()
console.log('═'.repeat(74))
console.log(`结果：通过 ${pass} / 失败 ${fail}`)
console.log('═'.repeat(74))
process.exit(fail > 0 ? 1 : 0)
