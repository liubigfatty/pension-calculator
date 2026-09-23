// 「同指数换省」实证：固定缴费档位（指数），换参保+退休地，比较待遇与成本
// 用户定位（2026-09-21）：不能用 A 省缴费去 B 省退休；有意义的是
//   「同样按 X% 档缴，选哪个省作为一生的参保+退休地」
// 机制：待遇端由**计发基数**决定，成本端由**社平**决定，两者不是同一个数
//   ⇒ 核心杠杆 = 计发基数 ÷ 社平
const path = require('path')
const engine = require(path.join(__dirname, '..', 'cloudfunctions', 'calculate', 'pension-engine.js'))
const { getConfig } = require(path.join(__dirname, '..', 'cloudfunctions', 'calculate', 'provinces-data.js'))
const F = (n, p = 2) => Number(n).toLocaleString('en-US', { minimumFractionDigits: p, maximumFractionDigits: p })

const PROVS = [
  ['beijing', '北京'], ['tianjin', '天津'], ['hebei', '河北'], ['shanxi', '山西'], ['neimenggu', '内蒙古'],
  ['liaoning', '辽宁'], ['jilin', '吉林'], ['heilongjiang', '黑龙江'], ['shanghai', '上海'], ['jiangsu', '江苏'],
  ['zhejiang', '浙江'], ['anhui', '安徽'], ['fujian', '福建'], ['jiangxi', '江西'], ['shandong', '山东'],
  ['henan', '河南'], ['hubei', '湖北'], ['hunan', '湖南'], ['guangdong', '广东'], ['guangxi', '广西'],
  ['hainan', '海南'], ['chongqing', '重庆'], ['sichuan', '四川'], ['guizhou', '贵州'], ['yunnan', '云南'],
  ['xizang', '西藏'], ['shaanxi', '陕西'], ['gansu', '甘肃'], ['qinghai', '青海'], ['ningxia', '宁夏'],
  ['xinjiang', '新疆'],
]

// 固定人群：1996-07 参工（排除视同干扰），2025-12 退休，男
const PERSON = {
  gender: 'male', genderType: 'male', birthYear: 1965, birthMonth: 9,
  workYear: 1996, workMonth: 7, cityType: 'prov',
  retireDateInput: { year: 2025, month: 12 },
}

/** 取某年数值：兼容省/市嵌套结构（广东 avg_salary_history 为 {prov, shenzhen, 深圳}） */
function hv(obj, y) {
  if (!obj) return 0
  if (typeof obj[y] === 'number') return obj[y]
  for (const k of ['prov', '全省', '省']) {
    if (obj[k] && typeof obj[k][y] === 'number') return obj[k][y]
  }
  return 0
}

/** 累计缴费成本：Σ 社平[y] × 档位 × 12月 × 20%（灵活就业全口径），1996-07 起按实际月数 */
function totalCost(cfg, tier) {
  const h = cfg.avg_salary_history || {}
  let sum = 0
  for (let y = 1996; y <= 2025; y++) {
    const v = hv(h, y)
    if (!v || v <= 0) continue
    const months = (y === 1996) ? 6 : 12   // 1996-07 起，当年 6 个月
    sum += v * tier * months * 0.20
  }
  return sum
}

const tiers = [[0.6, '60%档'], [1.0, '100%档'], [3.0, '300%档']]

const rows = PROVS.map(([code, name]) => {
  const cfg = getConfig(code)
  const h = cfg.avg_salary_history || {}
  const soc2025 = hv(h, 2025)
  const base2025 = hv(cfg.base_rates, 2025) || hv(cfg.base_rates, 2024) || 0
  const leverage = soc2025 > 0 ? base2025 / soc2025 : 0

  const o = { code, name, soc2025, base2025, leverage }
  for (const [tier, label] of tiers) {
    const r = engine.calculate(cfg, Object.assign({}, PERSON, { avgIndex: tier })).legal
    const base = r.basicPension ? r.basicPension.amount : 0
    const pers = r.personalAccount ? r.personalAccount.amount : 0
    const tp = r.transitionalPension || {}
    const trans = (tp.amount || 0) + (tp._adjustment || 0)
    const localB = (r.extraPension ? r.extraPension.amount : 0)
      + (r.specialAddition ? r.specialAddition.amount : 0)
      + (r.adjustmentFund ? r.adjustmentFund.amount : 0)
    const core = base + pers + trans          // 口径A：三部分核心
    const cost = totalCost(cfg, tier)
    o[label] = {
      total: r.total, core,
      cost,
      eff: cost > 0 ? core / cost * 10000 : 0,   // 每万元投入换回的月领
    }
  }
  return o
})

function dump(tierLabel) {
  console.log('\n===== ' + tierLabel + '：按各省排序 =====')
  console.log('排名 | 省份 | 计发基数 | 社平 | 基数/社平 | 月领(口径A) | 累计投入 | 每万元换回')
  const sorted = rows.slice().sort((a, b) => b[tierLabel].core - a[tierLabel].core)
  sorted.forEach((x, i) => {
    const d = x[tierLabel]
    console.log(
      String(i + 1).padStart(3) + ' | ' + x.name.padEnd(4) +
      ' | ' + F(x.base2025, 0).padStart(7) +
      ' | ' + F(x.soc2025, 0).padStart(6) +
      ' | ' + x.leverage.toFixed(4).padStart(7) +
      ' | ' + F(d.core).padStart(9) +
      ' | ' + F(d.cost, 0).padStart(9) +
      ' | ' + F(d.eff).padStart(7)
    )
  })
  const cs = sorted.map(x => x[tierLabel].core)
  const es = sorted.map(x => x[tierLabel].eff)
  console.log('--- 月领极差 ' + (Math.max(...cs) / Math.min(...cs)).toFixed(3) + ' 倍，差 ' + F(Math.max(...cs) - Math.min(...cs)) + ' 元/月')
  console.log('--- 每万元效率极差 ' + (Math.max(...es) / Math.min(...es)).toFixed(3) + ' 倍，' + sorted.slice().sort((a,b)=>b[tierLabel].eff-a[tierLabel].eff).map(x=>x.name).slice(0,3).join('/') + ' 最高')
  return sorted
}

console.log('人群：男，1965-09 生，1996-07 参工，2025-12 退休（60岁3个月），全程按固定档位缴费')
console.log('成本口径：Σ 社平[y] × 档位 × 月数 × 20%（灵活就业全自缴）')
const s60 = dump('60%档')
const s100 = dump('100%档')
const s300 = dump('300%档')

// 杠杆 vs 效率 相关性
console.log('\n===== 核心杠杆：计发基数 ÷ 社平（2025）=====')
const lev = rows.slice().sort((a, b) => b.leverage - a.leverage)
lev.forEach((x, i) => {
  console.log(String(i + 1).padStart(3) + ' | ' + x.name.padEnd(4) + ' | ' + x.leverage.toFixed(4) +
    ' | 基数 ' + F(x.base2025, 0).padStart(7) + ' / 社平 ' + F(x.soc2025, 0).padStart(6))
})
const ls = lev.map(x => x.leverage)
console.log('--- 杠杆极差 ' + (Math.max(...ls) / Math.min(...ls)).toFixed(3) + ' 倍：' + lev[0].name + ' ' + lev[0].leverage.toFixed(3) + ' vs ' + lev[lev.length - 1].name + ' ' + lev[lev.length - 1].leverage.toFixed(3))

// 同一省：档位从 60% 提到 300%，效率掉多少
console.log('\n===== 档位对效率的影响（每省：60%档效率 ÷ 300%档效率）=====')
const ratio = rows.map(x => ({ name: x.name, r: x['60%档'].eff / x['300%档'].eff })).sort((a, b) => b.r - a.r)
ratio.forEach((x, i) => console.log(String(i + 1).padStart(3) + ' | ' + x.name.padEnd(4) + ' | ' + x.r.toFixed(3)))
console.log('--- 理论值 = ((1+0.6)/0.6) / ((1+3)/3) = ' + ((1.6 / 0.6) / (4 / 3)).toFixed(3))
