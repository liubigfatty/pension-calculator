/**
 * 2026-10-09：用**线上拉回的代码**（_tmp_download/）跑「8 条硬伤」空输入探针。
 * 目的：deploy 日志 success ≠ 线上正确。必须用线上代码本身复算一遍。
 *
 * 前置：python scripts/_download_online_20261009.py <port>
 */
const path = require('path')
const DL = path.resolve('./_tmp_download')
const { calculate } = require(path.join(DL, 'pension-engine.js'))

function cfg(p) {
  const m = require(path.join(DL, 'provinces', p + '.js'))
  return m.getEngineConfig ? m.getEngineConfig() : m
}

let pass = 0, fail = 0
function chk(tag, actual, expected, tol) {
  const ok = Math.abs(actual - expected) <= (tol == null ? 0.02 : tol)
  console.log((ok ? '  ✅ ' : '  ❌ ') + tag + ' 实算=' + Number(actual).toFixed(4) + ' 期望=' + Number(expected).toFixed(4))
  ok ? pass++ : fail++
}
function has(tag, file, needle) {
  const fs = require('fs')
  const txt = fs.readFileSync(path.join(DL, file), 'utf8')
  const ok = txt.includes(needle)
  console.log((ok ? '  ✅ ' : '  ❌ ') + tag + '  [' + file + '] 含 "' + needle + '"')
  ok ? pass++ : fail++
}

console.log('══ 一、源码特征（线上代码）══')
has('sight_cutoff 分支已上线', 'pension-engine.js', 'config.sight_cutoff || accountStartConfigured')
has('天津 sight_cutoff 1998-01', 'provinces/tianjin.js', 'SIGHT_CUTOFF')
has('陕西 sight_cutoff 1993-01', 'provinces/shaanxi.js', 'SIGHT_CUTOFF')
has('内蒙古 account_start 1996-01', 'provinces/neimenggu.js', '{ year: 1996, month: 1 }')
has('青海 viewing_start 1998-01', 'provinces/qinghai.js', 'VIEWING_START')
has('云南 2025=3553 / 2026=3623', 'provinces/yunnan.js', '2026: 3623')
has('四川 默认不加发', 'pension-engine.js', "params?.oneChild === true")
has('宁夏 知识分子可手输', 'pension-engine.js', 'intellectualWorkAmount')
has('天津 rounding 2位', 'provinces/tianjin.js', 'years_decimal: 2')

console.log('\n══ 二、空输入探针（线上代码实算）══')

// 1 天津 视同 11.00 年
console.log('① 天津 视同 → 1997-12')
{
  const L = (calculate(cfg('tianjin'), {
    province: 'tianjin', gender: 'female', genderType: 'fw50',
    birthYear: 1976, birthMonth: 3, workYear: 1987, workMonth: 1,
    retireDateInput: { year: 2026, month: 3 }, retireType: 'standard', cityType: 'prov',
    avgIndex: 1.14, personalAcc: 211636, months: 195, transIndex: 1.17,
  }).legal)
  chk('视同年限(原7.75)', L.sightYears, 11.0, 0.01)
}
// 2 陕西 视同 10.8333
console.log('② 陕西 视同 → 1992-12')
{
  const L = (calculate(cfg('shaanxi'), {
    province: 'shaanxi', gender: 'male', genderType: 'male',
    birthYear: 1965, birthMonth: 3, workYear: 1982, workMonth: 3,
    retireDateInput: { year: 2025, month: 8 }, retireType: 'standard', cityType: 'prov',
    avgIndex: 0.712, personalAcc: 108455, months: 138, baseRetire: 7881, baseProv: 7881,
  }).legal)
  chk('视同年限(原13.83)', L.sightYears, 10.8333, 0.01)
}
// 3 内蒙古 视同 11.3333
console.log('③ 内蒙古 视同 → 1995-12')
{
  const L = (calculate(cfg('neimenggu'), {
    province: 'neimenggu', gender: 'male', genderType: 'male',
    birthYear: 1965, birthMonth: 9, workYear: 1984, workMonth: 9,
    retireDateInput: { year: 2025, month: 9 }, retireType: 'standard', cityType: 'prov',
    avgIndex: 0.6111, personalAcc: 93644, months: 138, baseRetire: 8179, baseProv: 8179,
  }).legal)
  chk('视同年限(原13.33)', L.sightYears, 11.3333, 0.01)
}
// 4 青海 过渡性 1162
console.log('④ 青海 过渡性年限 → 1997-12')
{
  const L = (calculate(cfg('qinghai'), {
    province: 'qinghai', gender: 'male', genderType: 'male',
    birthYear: 1963, birthMonth: 1, workYear: 1986, workMonth: 8,
    retireDateInput: { year: 2023, month: 1 }, retireType: 'standard', cityType: 'prov',
    avgIndex: 0.6919, personalAcc: 95630.01, months: 170, baseRetire: 8591, baseProv: 8591,
  }).legal)
  chk('过渡性(原958.11)', L.transitionalPension ? L.transitionalPension.amount : 0, 1161.60, 1.5)
}
// 5 四川 未声明不加发
console.log('⑤ 四川 增发须持证')
{
  const base = {
    province: 'sichuan', gender: 'male', genderType: 'male',
    birthYear: 1965, birthMonth: 1, workYear: 1990, workMonth: 1,
    retireDateInput: { year: 2025, month: 6 }, retireType: 'standard', cityType: 'prov',
    avgIndex: 1.0, personalAcc: 100000, months: 170, baseRetire: 8462, baseProv: 8462,
  }
  const g = (r) => { const L = r.legal || r; const e = L.extraPension || L.extra_pension || {}; return e.amount || 0 }
  chk('未声明 ⇒ 0(原299.70)', g(calculate(cfg('sichuan'), Object.assign({}, base))), 0, 0.01)
  chk('持证 ⇒ 299.70', g(calculate(cfg('sichuan'), Object.assign({}, base, { oneChild: true }))), 299.70, 5)
}
// 6 云南 3553/3623
console.log('⑥ 云南 独子基数')
{
  const base = {
    province: 'yunnan', gender: 'male', genderType: 'male',
    birthYear: 1965, birthMonth: 1, workYear: 1985, workMonth: 10,
    retireType: 'standard', cityType: 'prov',
    avgIndex: 0.8, personalAcc: 90000, months: 139, oneChild: true,
    baseRetire: 8265, baseProv: 8265,
  }
  const g = (r) => { const L = r.legal || r; const s = L.specialAddition || L.special_addition || {}; return s.amount || 0 }
  chk('2025退休=177.65(原171.55)', g(calculate(cfg('yunnan'), Object.assign({}, base, { retireDateInput: { year: 2025, month: 9 } }))), 177.65, 0.05)
  chk('2026退休=181.15', g(calculate(cfg('yunnan'), Object.assign({}, base, { retireDateInput: { year: 2026, month: 9 } }))), 181.15, 0.05)
}
// 7 宁夏 手输生效
console.log('⑦ 宁夏 知识分子补贴')
{
  const base = {
    province: 'ningxia', gender: 'male', genderType: 'male',
    birthYear: 1964, birthMonth: 6, workYear: 1986, workMonth: 1,
    retireDateInput: { year: 2025, month: 6 }, retireType: 'standard', cityType: 'prov',
    avgIndex: 0.9, personalAcc: 90000, months: 139, baseRetire: 8366, baseProv: 8366,
  }
  const g = (r) => { const L = r.legal || r; const s = L.specialAddition || L.special_addition || {}; return s.amount || 0 }
  chk('非知识分子=0', g(calculate(cfg('ningxia'), Object.assign({}, base))), 0, 0.01)
  chk('手输30+5.5=35.5', g(calculate(cfg('ningxia'), Object.assign({}, base,
    { intellectual: true, intellectualAreaAmount: 30, intellectualWorkAmount: 5.5 }))), 35.5, 0.01)
}
// 8 天津 年限 2 位
console.log('⑧ 天津 年限 2 位小数')
{
  const L = (calculate(cfg('tianjin'), {
    province: 'tianjin', gender: 'male', genderType: 'male',
    birthYear: 1966, birthMonth: 3, workYear: 1992, workMonth: 5,
    retireDateInput: { year: 2026, month: 3 }, retireType: 'standard', cityType: 'prov',
    avgIndex: 1.0, personalAcc: 150000, months: 139, baseRetire: 9417, baseProv: 9417,
  }).legal)
  chk('总年限 33.8333→33.83', L.totalYears, 33.83, 0.005)
}

console.log('\n=== 线上 ' + pass + ' / ' + (pass + fail) + ' ===')
if (fail) process.exit(1)
