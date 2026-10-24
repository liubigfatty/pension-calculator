/**
 * 2026-10-09「8 条硬伤」专属哨兵 —— **空输入探针**
 *
 * ⭐⭐ 本轮最重要的方法论：回归 185/185 全绿 ≠ 默认路径正确。
 *    几乎所有 case 都手工传了 sight_years / pre_account_years / base_number / one_child_avg_pension，
 *    把引擎「自动推算」这条**真实用户走的路径**完全绕开了。
 * ⇒ 本脚本刻意**不传**这些字段，只给参工年月/出生年月/退休时点，逼引擎走默认路径。
 *
 * 覆盖 8 条：
 *   1 天津  视同截止 1994-10 → 1997-12-31
 *   2 陕西  视同截止 1996-01 → 1992-12-31
 *   3 内蒙古 视同截止 1998-01 → 1995-12（1996-01）
 *   4 青海  过渡性年限 1995-12 → 1997-12-31
 *   5 四川  oneChild 未传默认加发 → 默认不加发
 *   6 云南  独子基数 3431(2023) → 3553(2024)/3623(2025)
 *   7 宁夏  知识分子补贴写死 → 支持手输 + 兜底告警
 *   8 天津  年限保留 2 位小数
 */
const path = require('path')
const { calculate } = require(path.resolve('./engine/pension-engine.js'))

function cfg(p) {
  const m = require(path.resolve('./cloudfunctions/calculate/provinces/' + p + '.js'))
  return m.getEngineConfig ? m.getEngineConfig() : m
}

let pass = 0, fail = 0
function chk(tag, actual, expected, tol) {
  const ok = Math.abs(actual - expected) <= (tol == null ? 0.01 : tol)
  console.log((ok ? '  ✅ ' : '  ❌ ') + tag + ' 实算=' + Number(actual).toFixed(2) + ' 期望=' + Number(expected).toFixed(2))
  ok ? pass++ : fail++
  return ok
}
function near(tag, actual, expected, tol) { return chk(tag, actual, expected, tol == null ? 0.02 : tol) }

// ================= 1 天津：视同截止 1997-12-31 =================
console.log('\n① 天津 视同截止（津劳局〔2006〕329号：截至 1997-12-31 前）')
{
  // 天津 case 1 真实核定表：1987-01 参工 / 2026-03 退休 / 官方 97年底前年限 10.42 年
  const r = calculate(cfg('tianjin'), {
    province: 'tianjin', gender: 'female', genderType: 'fw50',
    birthYear: 1976, birthMonth: 3,
    workYear: 1987, workMonth: 1,
    retireDateInput: { year: 2026, month: 3 },
    retireType: 'standard', cityType: 'prov',
    avgIndex: 1.14, personalAcc: 211636, months: 195,
    transIndex: 1.17,
  })
  const L = r.legal || r
  console.log('   年限: 视同=' + (L.sightYears != null ? L.sightYears.toFixed(4) : '?') +
              ' 总=' + (L.totalYears != null ? L.totalYears.toFixed(4) : '?'))
  // 1987-01 → 1998-01（不含 1998-01）= 132 月 = 11.00 年
  near('视同年限(→1997-12)', L.sightYears, 11.0, 0.01)
  // 修复前是 7.75 年 ⇒ 断言必须显著大于旧值
  console.log('   （修复前默认路径为 7.75 年，过渡性 831.99）')
  console.log('   过渡性实算 = ' + (L.transitionalPension ? L.transitionalPension.amount.toFixed(2) : '0'))
}

// ================= 2 陕西：视同截止 1992-12-31 =================
console.log('\n② 陕西 视同截止（陕政发〔2006〕27号：1992-12-31 前）')
{
  // 陕西 case 4：1982-03 参工 / 2025-08 退休 / 官方视同 10.83 年
  const r = calculate(cfg('shaanxi'), {
    province: 'shaanxi', gender: 'male', genderType: 'male',
    birthYear: 1965, birthMonth: 3,
    workYear: 1982, workMonth: 3,
    retireDateInput: { year: 2025, month: 8 },
    retireType: 'standard', cityType: 'prov',
    avgIndex: 0.712, personalAcc: 108455, months: 138,
    baseRetire: 7881, baseProv: 7881,
  })
  const L = r.legal || r
  console.log('   年限: 视同=' + (L.sightYears != null ? L.sightYears.toFixed(4) : '?'))
  // 1982-03 → 1993-01（不含）= 130 月 = 10.8333 年
  near('视同年限(→1992-12)', L.sightYears, 10.8333, 0.01)
  console.log('   （修复前默认路径为 13.83 年，多算 3 年，过渡性 +235.94）')
}

// ================= 3 内蒙古：视同截止 1995-12（1996-01）=================
console.log('\n③ 内蒙古 视同截止（内政办字〔2006〕253号：统账结合前 = 至 1995-12-31）')
{
  // 内蒙古 case 2：1984-09 参工 / 2025-09 退休 / 官方 11.3333 年
  const r = calculate(cfg('neimenggu'), {
    province: 'neimenggu', gender: 'male', genderType: 'male',
    birthYear: 1965, birthMonth: 9,
    workYear: 1984, workMonth: 9,
    retireDateInput: { year: 2025, month: 9 },
    retireType: 'standard', cityType: 'prov',
    avgIndex: 0.6111, personalAcc: 93644, months: 138,
    baseRetire: 8179, baseProv: 8179,
  })
  const L = r.legal || r
  console.log('   年限: 视同=' + (L.sightYears != null ? L.sightYears.toFixed(4) : '?'))
  // 1984-09 → 1996-01（不含）= 136 月 = 11.3333 年
  near('视同年限(→1995-12)', L.sightYears, 11.3333, 0.01)
  console.log('   （修复前默认路径为 13.33 年，多算 2 年，过渡性 +196.30）')
}

// ================= 4 青海：过渡性年限 1997-12-31 =================
console.log('\n④ 青海 过渡性年限（青劳社厅发〔2006〕59号：1997-12-31 前）')
{
  // 青海 case 2：1986-08 参工 / 2023-01 退休 / 官方过渡年限 11.42 年
  const r = calculate(cfg('qinghai'), {
    province: 'qinghai', gender: 'male', genderType: 'male',
    birthYear: 1963, birthMonth: 1,
    workYear: 1986, workMonth: 8,
    retireDateInput: { year: 2023, month: 1 },
    retireType: 'standard', cityType: 'prov',
    avgIndex: 0.6919, personalAcc: 95630.01, months: 170,
    baseRetire: 8591, baseProv: 8591,
  })
  const L = r.legal || r
  const desc = (L.transitionalPension && L.transitionalPension.description) || ''
  const m = desc.match(/×\s*([\d.]+)年/)
  console.log('   过渡性描述: ' + desc)
  console.log('   过渡性实算 = ' + (L.transitionalPension ? L.transitionalPension.amount.toFixed(2) : '0'))
  // 1986-08 → 1998-01（不含）= 137 月 = 11.4167 年 ⇒ 1162.01
  near('过渡性养老金(年限→1997-12)', L.transitionalPension ? L.transitionalPension.amount : 0, 1162.01, 1.5)
  console.log('   （修复前年限 9.42 年，过渡性 958.11，少 203.90）')
}

// ================= 5 四川：oneChild 默认不加发 =================
console.log('\n⑤ 四川 增发养老金（川劳社发〔2006〕18号：须持证）')
{
  const base = {
    province: 'sichuan', gender: 'male', genderType: 'male',
    birthYear: 1965, birthMonth: 1,
    workYear: 1990, workMonth: 1,
    retireDateInput: { year: 2025, month: 6 },
    retireType: 'standard', cityType: 'prov',
    avgIndex: 1.0, personalAcc: 100000, months: 170,
    baseRetire: 8462, baseProv: 8462,
  }
  const rNone = calculate(cfg('sichuan'), Object.assign({}, base))          // 未声明
  const rNo = calculate(cfg('sichuan'), Object.assign({}, base, { oneChild: false })) // 无子女
  const rYes = calculate(cfg('sichuan'), Object.assign({}, base, { oneChild: true })) // 持证
  const g = (r) => {
    const L = r.legal || r
    const e = L.extraPension || L.extra_pension || {}
    return e.amount || 0
  }
  console.log('   未声明持证: ' + g(rNone).toFixed(2) + ' | 显式无子女: ' + g(rNo).toFixed(2) + ' | 持证: ' + g(rYes).toFixed(2))
  chk('未声明 ⇒ 不加发', g(rNone), 0, 0.01)
  chk('持证 ⇒ 加发(约299.70)', g(rYes), 299.70, 5)
  console.log('   （修复前未声明也按 0.1% 加发 299.70，非独子被多算）')
}

// ================= 6 云南：独子基数随年度更新 =================
console.log('\n⑥ 云南 独生子女补贴基数（云人社发〔2026〕8号）')
{
  const base = {
    province: 'yunnan', gender: 'male', genderType: 'male',
    birthYear: 1965, birthMonth: 1,
    workYear: 1985, workMonth: 10,
    retireType: 'standard', cityType: 'prov',
    avgIndex: 0.8, personalAcc: 90000, months: 139,
    oneChild: true,
    baseRetire: 8265, baseProv: 8265,
  }
  const r25 = calculate(cfg('yunnan'), Object.assign({}, base, { retireDateInput: { year: 2025, month: 9 } }))
  const r26 = calculate(cfg('yunnan'), Object.assign({}, base, { retireDateInput: { year: 2026, month: 9 } }))
  const g = (r) => {
    const L = r.legal || r
    const s = L.specialAddition || L.special_addition || {}
    return s.amount || 0
  }
  console.log('   2025 退休: ' + g(r25).toFixed(2) + '（应为 3553×5%=177.65）')
  console.log('   2026 退休: ' + g(r26).toFixed(2) + '（应为 3623×5%=181.15）')
  near('2025 退休 独子补贴', g(r25), 177.65, 0.05)
  near('2026 退休 独子补贴', g(r26), 181.15, 0.05)
  console.log('   （修复前两档都回退 3431×5%=171.55）')
}

// ================= 7 宁夏：知识分子补贴可手输 =================
console.log('\n⑦ 宁夏 知识分子补贴（宁党发〔1985〕27号 浮动表）')
{
  const base = {
    province: 'ningxia', gender: 'male', genderType: 'male',
    birthYear: 1964, birthMonth: 6,
    workYear: 1986, workMonth: 1,
    retireDateInput: { year: 2025, month: 6 },
    retireType: 'standard', cityType: 'prov',
    avgIndex: 0.9, personalAcc: 90000, months: 139,
    baseRetire: 8366, baseProv: 8366,
  }
  const rIntel = calculate(cfg('ningxia'), Object.assign({}, base, { intellectual: true }))
  const rManual = calculate(cfg('ningxia'), Object.assign({}, base, {
    intellectual: true, intellectualAreaAmount: 30, intellectualWorkAmount: 5.5
  }))
  const rNone = calculate(cfg('ningxia'), Object.assign({}, base))
  const g = (r) => {
    const L = r.legal || r
    const s = L.specialAddition || L.special_addition || {}
    return s.amount || 0
  }
  console.log('   非知识分子: ' + g(rNone).toFixed(2) + ' | 知识分子(兜底): ' + g(rIntel).toFixed(2) + ' | 手输 30+5.5: ' + g(rManual).toFixed(2))
  chk('非知识分子 ⇒ 0', g(rNone), 0, 0.01)
  near('手输金额生效', g(rManual), 35.5, 0.01)
  const L = rIntel.legal || rIntel
  const s = L.specialAddition || L.special_addition || {}
  console.log('   兜底描述: ' + (s.description || ''))
  if (!/因人而异/.test(s.description || '')) { console.log('  ❌ 兜底值未带「因人而异」告警'); fail++ } else { console.log('  ✅ 兜底值带告警'); pass++ }
}

// ================= 8 天津：年限 2 位小数 =================
console.log('\n⑧ 天津 年限保留 2 位小数（津劳局〔2006〕329号 第四条）')
{
  const tj = cfg('tianjin')
  const rd = tj.rounding || {}
  console.log('   rounding = ' + JSON.stringify(rd))
  if (rd.years_decimal === 2 && rd.years_round_mode === 'round') { console.log('  ✅ 已配置 years_decimal:2 / round'); pass++ }
  else { console.log('  ❌ rounding 未正确配置'); fail++ }
  // 实测：1992-05 参工 → 2026-03 退休。引擎分段算：
  //   视同 = calcYears(1992-05, sight_cutoff 1998-01) = 68 月 = 5.6667 年
  //   实际 = calcYears(1998-01, 2026-03)             = 338 月 = 28.1667 年
  //   合计 = 33.8333 年 ⇒ 保留 2 位、第 3 位四舍五入 ⇒ **33.83**（未配置时是 33.8333）
  const r = calculate(tj, {
    province: 'tianjin', gender: 'male', genderType: 'male',
    birthYear: 1966, birthMonth: 3,
    workYear: 1992, workMonth: 5,
    retireDateInput: { year: 2026, month: 3 },
    retireType: 'standard', cityType: 'prov',
    avgIndex: 1.0, personalAcc: 150000, months: 139,
    baseRetire: 9417, baseProv: 9417,
  })
  const L = r.legal || r
  console.log('   总年限实算 = ' + (L.totalYears != null ? L.totalYears.toFixed(4) : '?') + '（精确值 33.8333 ⇒ 应为 33.83）')
  near('总年限四舍五入到 2 位', L.totalYears, 33.83, 0.005)
}

console.log('\n=== ' + pass + ' / ' + (pass + fail) + ' ===')
if (fail) process.exit(1)
