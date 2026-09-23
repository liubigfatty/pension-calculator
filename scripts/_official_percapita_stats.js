/**
 * 国家统计局口径 —— 31 省城镇职工月人均养老金（2024年）
 *
 * 数据源（唯一，国家级，非各省自报）：
 *   《中国统计年鉴2025》 24-26 分地区城镇职工基本养老保险情况(2024年)
 *   https://www.stats.gov.cn/sj/ndsj/2025/html/C24-26.jpg
 *   抓取日：2026-09-22   （年鉴2026 尚未上线，404，本期为最新）
 *
 * 口径声明（写文章必须带上）：
 *   ① 分子 = 基金支出，含基本养老金 + 丧葬补助金和抚恤金 + 病残津贴 + 转移支出
 *      → 略高于「纯养老金」，全国层面高估幅度约 3~5%
 *   ② 分母 = 年末离退休(职)人员数（单一时点），非全年平均人数
 *      → 年内新增退休者被计入分母但只领了部分月份，故人均略被压低
 *      两处偏差方向相反，可部分抵消
 *   ③ 覆盖 = 城镇职工基本养老保险全体（含机关事业单位，2014-10 并轨后）
 *      → 不是「企业退休人员」口径。企业退休人均国家口径为 3162 元（2023，统计局）
 *   ④ 因此本表适合做**省份之间**的相对比较，不适合当作「某人能领多少」
 *
 * 复算公式：月人均(元) = 基金支出(亿元) ÷ 离退休人数(万人) × 10000 ÷ 12
 */
const engine = require('../cloudfunctions/calculate/pension-engine.js')
const { getConfig } = require('../cloudfunctions/calculate/provinces-data.js')

// 《中国统计年鉴2025》24-26 原表（单位：万人 / 亿元）
// 列：参保职工合计, 职工, 离退休(职)人员, 基金收入, 基金支出, 累计结余
const YEARBOOK_2024 = {
  全国: [53452.2, 38713.2, 14739.1, 74732.0, 67656.3, 70726.6],
  北京: [1939.4, 1587.6, 351.8, 4294.9, 2521.7, 10039.5],
  天津: [847.1, 593.0, 254.1, 1354.5, 1350.4, 483.5],
  河北: [2017.5, 1479.9, 537.6, 2542.3, 2561.0, 677.0],
  山西: [1122.1, 786.9, 335.2, 1728.0, 1716.7, 1662.6],
  内蒙古: [958.4, 599.7, 358.7, 1474.3, 1635.5, 419.3],
  辽宁: [2180.2, 1263.9, 916.4, 3076.0, 3924.3, 359.5],
  吉林: [969.1, 545.8, 423.2, 1554.2, 1805.1, 542.8],
  黑龙江: [1543.2, 841.2, 702.0, 2181.4, 2842.9, 307.5],
  上海: [1714.1, 1164.1, 549.9, 4423.1, 3841.9, 2459.7],
  江苏: [3803.9, 2646.1, 1157.8, 5499.2, 4982.5, 5624.0],
  浙江: [3631.3, 2605.4, 1027.7, 4804.7, 4569.2, 1399.3],
  安徽: [1774.2, 1338.3, 435.8, 2205.0, 1855.7, 2966.2],
  福建: [1877.3, 1616.5, 260.8, 1529.5, 1183.7, 1258.2],
  江西: [1485.5, 1065.2, 420.3, 1541.7, 1557.2, 902.3],
  山东: [3546.5, 2642.7, 903.8, 4169.8, 4244.9, 1293.8],
  河南: [2636.5, 2028.4, 608.1, 2707.7, 2526.4, 1646.9],
  湖北: [2085.2, 1391.7, 693.4, 2986.5, 3139.5, 1039.0],
  湖南: [2084.1, 1498.4, 585.7, 2310.7, 2300.5, 1906.9],
  广东: [5473.8, 4564.4, 909.4, 7881.7, 4313.2, 20258.8],
  广西: [1101.4, 797.9, 303.5, 1501.2, 1388.9, 978.6],
  海南: [390.2, 305.3, 84.8, 506.8, 384.7, 582.1],
  重庆: [1512.0, 1022.1, 489.9, 1707.6, 1722.9, 1361.6],
  四川: [3463.9, 2376.0, 1087.9, 4297.7, 3982.7, 4328.8],
  贵州: [817.3, 632.6, 184.7, 1085.1, 860.0, 1496.0],
  云南: [958.1, 747.2, 210.9, 1301.3, 1107.9, 1962.7],
  西藏: [71.5, 59.5, 12.0, 232.0, 157.8, 349.3],
  陕西: [1395.2, 1081.6, 313.6, 2043.8, 1671.2, 1567.4],
  甘肃: [544.9, 358.4, 186.6, 886.3, 929.5, 374.7],
  青海: [195.1, 138.4, 56.7, 344.9, 361.3, 72.7],
  宁夏: [302.2, 222.9, 79.3, 419.0, 382.8, 301.2],
  新疆: [912.9, 656.7, 256.3, 1667.1, 1407.4, 2019.2]
}

// 《中国统计年鉴2025》24-27 原表（单位：万人 / 亿元）
// 列：参保人数, #实际领取待遇人数, 基金收入, 基金支出, 累计结余
const YEARBOOK_2024_JU = {
  全国: [53830.2, 18039.4, 7287.0, 5321.6, 16499.5],
  北京: [175.1, 66.3, 125.6, 119.0, 194.7],
  天津: [168.3, 90.0, 70.0, 60.4, 328.8],
  河北: [3494.1, 1237.7, 376.1, 288.8, 783.8],
  山西: [1597.7, 498.0, 223.0, 124.3, 573.6],
  内蒙古: [814.6, 274.3, 114.8, 84.6, 216.4],
  辽宁: [1011.8, 470.1, 111.8, 105.4, 104.3],
  吉林: [936.6, 286.2, 76.1, 57.6, 133.3],
  黑龙江: [897.3, 274.7, 117.4, 73.8, 217.0],
  上海: [71.1, 52.8, 113.9, 110.8, 95.5],
  江苏: [2318.8, 1175.4, 708.3, 537.0, 1346.1],
  浙江: [1022.3, 579.6, 459.8, 350.0, 616.2],
  安徽: [3386.8, 1073.3, 470.9, 262.5, 1318.6],
  福建: [1588.9, 538.0, 177.5, 147.2, 345.8],
  江西: [1947.8, 577.5, 214.0, 156.5, 505.7],
  山东: [4470.6, 1745.7, 636.5, 507.9, 1914.2],
  河南: [5245.7, 1610.2, 455.5, 355.1, 1010.2],
  湖北: [2490.2, 850.2, 287.7, 226.4, 774.4],
  湖南: [3374.0, 1002.2, 362.3, 228.9, 790.7],
  广东: [2745.2, 935.1, 359.3, 338.5, 623.2],
  广西: [2393.3, 671.4, 177.5, 146.3, 363.8],
  海南: [365.2, 84.7, 52.2, 31.6, 178.4],
  重庆: [1154.6, 382.8, 155.1, 89.7, 340.8],
  四川: [3127.8, 1156.3, 608.7, 359.3, 1394.1],
  贵州: [1939.4, 515.0, 139.4, 106.0, 276.3],
  云南: [2480.5, 642.0, 205.4, 138.5, 696.2],
  西藏: [175.5, 30.5, 16.2, 10.8, 53.6],
  陕西: [1798.0, 613.0, 190.3, 150.5, 448.8],
  甘肃: [1370.7, 372.9, 150.1, 78.9, 453.6],
  青海: [263.1, 51.9, 27.8, 17.2, 94.4],
  宁夏: [226.8, 40.8, 25.3, 18.3, 70.7],
  新疆: [778.2, 140.9, 78.7, 39.9, 236.5]
}

// 人社部《2025年度人力资源和社会保障事业发展统计公报》（发布 2026-07-16）全国口径
const MOHRSS_2025 = {
  workerRetirees: 15215,   // 万人，城镇职工参保离退休人员
  workerExpense: 71203,    // 亿元，城镇职工养老基金支出
  workerBalance: 78685,    // 亿元，累计结余
  juRetirees: 18820,       // 万人，城乡居民实际领取待遇人数
  juExpense: 6223,         // 亿元
  juBalance: 19774
}

const CODE = {
  北京: 'beijing', 天津: 'tianjin', 河北: 'hebei', 山西: 'shanxi', 内蒙古: 'neimenggu',
  辽宁: 'liaoning', 吉林: 'jilin', 黑龙江: 'heilongjiang', 上海: 'shanghai', 江苏: 'jiangsu',
  浙江: 'zhejiang', 安徽: 'anhui', 福建: 'fujian', 江西: 'jiangxi', 山东: 'shandong',
  河南: 'henan', 湖北: 'hubei', 湖南: 'hunan', 广东: 'guangdong', 广西: 'guangxi',
  海南: 'hainan', 重庆: 'chongqing', 四川: 'sichuan', 贵州: 'guizhou', 云南: 'yunnan',
  西藏: 'xizang', 陕西: 'shaanxi', 甘肃: 'gansu', 青海: 'qinghai', 宁夏: 'ningxia', 新疆: 'xinjiang'
}

const perCapita = (expense, retirees) => expense / retirees * 10000 / 12

// 引擎样本（与 _probe_official_benchmark.js 保持一致）
const P = {
  gender: 'male', genderType: 'male', birthYear: 1965, birthMonth: 9,
  workYear: 1987, workMonth: 7, cityType: 'prov',
  retireDateInput: { year: 2025, month: 12 }
}

const rows = []
Object.keys(CODE).forEach(name => {
  const [tot, , ret, , exp] = YEARBOOK_2024[name]
  const cfg = getConfig(CODE[name])
  const r60 = engine.calculate(cfg, Object.assign({}, P, { avgIndex: 0.6 })).legal
  const r100 = engine.calculate(cfg, Object.assign({}, P, { avgIndex: 1.0 })).legal
  rows.push({
    name, code: CODE[name], retirees: ret, expense: exp,
    percap: perCapita(exp, ret),
    support: ret / tot,                       // 制度赡养率 = 离退休/参保职工
    e60: r60.total, e100: r100.total
  })
})

// 全国校验
const nRet = YEARBOOK_2024['全国'][2], nExp = YEARBOOK_2024['全国'][4]
console.log('=== 全国校验（年鉴口径复算）===')
console.log('  离退休 ' + nRet + ' 万人 / 基金支出 ' + nExp + ' 亿元')
console.log('  → 月人均 = ' + perCapita(nExp, nRet).toFixed(2) + ' 元')
console.log('  31省合计离退休 = ' + rows.reduce((s, r) => s + r.retirees, 0).toFixed(1) +
  ' 万人（+不分地区 41.1 = ' + (rows.reduce((s, r) => s + r.retirees, 0) + 41.1).toFixed(1) + '）')
console.log('  31省合计支出 = ' + rows.reduce((s, r) => s + r.expense, 0).toFixed(1) +
  ' 亿元（+不分地区 427.1 = ' + (rows.reduce((s, r) => s + r.expense, 0) + 427.1).toFixed(1) + '）')

// 排名
const sorted = rows.slice().sort((a, b) => b.percap - a.percap)
console.log('\n=== 31省城镇职工月人均养老金（2024，国家统计局口径）按高→低 ===')
console.log('排名 省份     月人均    离退休(万)  基金支出(亿)  赡养率  引擎60%档  引擎100%档')
sorted.forEach((r, i) => {
  console.log(
    String(i + 1).padStart(3) + '  ' + r.name.padEnd(5) +
    r.percap.toFixed(2).padStart(9) +
    r.retirees.toFixed(1).padStart(11) +
    r.expense.toFixed(1).padStart(13) +
    (r.support * 100).toFixed(1).padStart(8) + '%' +
    r.e60.toFixed(2).padStart(11) +
    r.e100.toFixed(2).padStart(12)
  )
})

const vals = rows.map(r => r.percap)
console.log('\n=== 分布 ===')
console.log('  最高 ' + sorted[0].name + ' ' + sorted[0].percap.toFixed(2))
console.log('  最低 ' + sorted[sorted.length - 1].name + ' ' + sorted[sorted.length - 1].percap.toFixed(2))
console.log('  极差 ' + (sorted[0].percap - sorted[sorted.length - 1].percap).toFixed(2) +
  '  倍数 ' + (sorted[0].percap / sorted[sorted.length - 1].percap).toFixed(2) + 'x')
console.log('  31省简单平均 ' + (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2))
console.log('  全国加权（含不分地区）' + perCapita(nExp, nRet).toFixed(2))
const noXz = vals.slice().sort((a, b) => b - a)
console.log('  剔除西藏后极差 ' + (noXz[1] - noXz[noXz.length - 1]).toFixed(2) +
  '  倍数 ' + (noXz[1] / noXz[noXz.length - 1]).toFixed(2) + 'x')

// 与引擎对照：比值
console.log('\n=== 校准：引擎60%档 ÷ 官方人均（越接近1，说明该省真实人群结构越贴近我们样本）===')
const cal = rows.slice().sort((a, b) => Math.abs(a.e60 / a.percap - 1) - Math.abs(b.e60 / b.percap - 1))
cal.slice(0, 6).forEach(r => console.log('  ' + r.name.padEnd(5) + ' 引擎 ' + r.e60.toFixed(2) +
  ' / 官方 ' + r.percap.toFixed(2) + ' = ' + (r.e60 / r.percap).toFixed(3)))
console.log('  ...')
cal.slice(-3).forEach(r => console.log('  ' + r.name.padEnd(5) + ' 引擎 ' + r.e60.toFixed(2) +
  ' / 官方 ' + r.percap.toFixed(2) + ' = ' + (r.e60 / r.percap).toFixed(3)))

// ===== 城乡居民（同源表 24-27）=====
const juRows = []
Object.keys(CODE).forEach(name => {
  const [, recv, , exp] = YEARBOOK_2024_JU[name]
  juRows.push({ name, recv, exp, percap: exp / recv * 10000 / 12 })
})
console.log('\n=== 城乡居民月人均（2024，表24-27）===')
console.log('  全国 ' + (YEARBOOK_2024_JU['全国'][3] / YEARBOOK_2024_JU['全国'][1] * 10000 / 12).toFixed(2) +
  ' 元/月（支出 ' + YEARBOOK_2024_JU['全国'][3] + ' 亿 / 领取 ' + YEARBOOK_2024_JU['全国'][1] + ' 万人）')
const juSort = juRows.slice().sort((a, b) => b.percap - a.percap)
console.log('  最高 ' + juSort[0].name + ' ' + juSort[0].percap.toFixed(2) +
  '  最低 ' + juSort[juSort.length - 1].name + ' ' + juSort[juSort.length - 1].percap.toFixed(2) +
  '  极差 ' + (juSort[0].percap - juSort[juSort.length - 1].percap).toFixed(2))
console.log('  城乡倍差 TOP5：')
rows.map(r => {
  const j = juRows.find(x => x.name === r.name)
  return { name: r.name, ratio: r.percap / j.percap, t: r.percap, j: j.percap }
}).sort((a, b) => b.ratio - a.ratio).slice(0, 5).forEach(x =>
  console.log('    ' + x.name.padEnd(5) + ' 职工 ' + x.t.toFixed(0) + ' / 居民 ' + x.j.toFixed(0) +
    ' = ' + x.ratio.toFixed(1) + '倍'))

// ===== 人社部 2025 全国口径 =====
console.log('\n=== 人社部《2025年度人社事业发展统计公报》全国口径（最新一年）===')
console.log('  城镇职工：支出 ' + MOHRSS_2025.workerExpense + ' 亿 / 离退休 ' + MOHRSS_2025.workerRetirees +
  ' 万 → ' + perCapita(MOHRSS_2025.workerExpense, MOHRSS_2025.workerRetirees).toFixed(2) + ' 元/月')
console.log('  城乡居民：支出 ' + MOHRSS_2025.juExpense + ' 亿 / 领取 ' + MOHRSS_2025.juRetirees +
  ' 万 → ' + perCapita(MOHRSS_2025.juExpense, MOHRSS_2025.juRetirees).toFixed(2) + ' 元/月')
console.log('  ⚠️ 公报只到全国，分省只有统计年鉴（2024）')
console.log('  职工/居民倍差 = ' +
  (perCapita(MOHRSS_2025.workerExpense, MOHRSS_2025.workerRetirees) /
    perCapita(MOHRSS_2025.juExpense, MOHRSS_2025.juRetirees)).toFixed(2) + ' 倍')

// ===== 输出 Markdown 表格 =====
let md = '# 31省城镇职工/城乡居民月人均养老金（国家统计局口径）\n\n'
md += '> 数据源：《中国统计年鉴2025》表 24-26 / 24-27（2024年数据）  抓取 2026-09-22\n'
md += '> 全国校验：67656.3 ÷ 14739.1 ÷ 12 × 10000 = ' + perCapita(nExp, nRet).toFixed(2) + ' 元/月\n\n'
md += '| 排名 | 省份 | 职工月人均 | 离退休(万) | 基金支出(亿) | 赡养率 | 居民月人均 | 城乡倍差 | 引擎60%档 | 引擎100%档 |\n'
md += '|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|\n'
sorted.forEach((r, i) => {
  const j = juRows.find(x => x.name === r.name)
  md += '| ' + (i + 1) + ' | ' + r.name + ' | ' + r.percap.toFixed(2) + ' | ' + r.retirees.toFixed(1) +
    ' | ' + r.expense.toFixed(1) + ' | ' + (r.support * 100).toFixed(1) + '%' +
    ' | ' + j.percap.toFixed(2) + ' | ' + (r.percap / j.percap).toFixed(1) +
    ' | ' + r.e60.toFixed(2) + ' | ' + r.e100.toFixed(2) + ' |\n'
})
md += '\n全国（加权）：职工 ' + perCapita(nExp, nRet).toFixed(2) + ' 元/月，居民 ' +
  (YEARBOOK_2024_JU['全国'][3] / YEARBOOK_2024_JU['全国'][1] * 10000 / 12).toFixed(2) + ' 元/月\n'
const mdPath = require('path').join(__dirname, '_official_percapita_table.md')
require('fs').writeFileSync(mdPath, md)
console.log('\n已写出 ' + mdPath)

// 输出 JSON 供其它脚本消费
require('fs').writeFileSync(
  require('path').join(__dirname, '_official_percapita_2024.json'),
  JSON.stringify({ source: '中国统计年鉴2025 表24-26', fetchedAt: '2026-09-22', rows: sorted }, null, 2)
)
console.log('已写出 scripts/_official_percapita_2024.json')
