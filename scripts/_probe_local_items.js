/**
 * 31 省 × 3 档：口径A（核心三项） vs 口径B（含地方项，到手金额）
 *
 * 目的（用户 2026-09-22 指令1）：换省的意义也在于地方项，因为引擎支持且确实是到手金额
 *   → 把 extraPension / specialAddition / adjustmentFund 全部计入，看排名如何变化
 *
 * 口径A = 基础养老金 + 个人账户 + 过渡性养老金
 * 口径B = 引擎 legal.total（= A + 增发基础 + 特殊增发 + 过渡调节金 + 过渡性调整 + 当年增资）
 *
 * 同时输出地方项明细与触发条件，区分：
 *   - 【无条件】默认参数下即给（只要在该省退休）
 *   - 【条件性】需 location / intellectual / oneChild / city 等输入才触发
 */
const engine = require('../cloudfunctions/calculate/pension-engine.js')
const { getConfig } = require('../cloudfunctions/calculate/provinces-data.js')

const PROVS = [
  ['beijing', '北京'], ['tianjin', '天津'], ['hebei', '河北'], ['shanxi', '山西'],
  ['neimenggu', '内蒙古'], ['liaoning', '辽宁'], ['jilin', '吉林'], ['heilongjiang', '黑龙江'],
  ['shanghai', '上海'], ['jiangsu', '江苏'], ['zhejiang', '浙江'], ['anhui', '安徽'],
  ['fujian', '福建'], ['jiangxi', '江西'], ['shandong', '山东'], ['henan', '河南'],
  ['hubei', '湖北'], ['hunan', '湖南'], ['guangdong', '广东'], ['guangxi', '广西'],
  ['hainan', '海南'], ['chongqing', '重庆'], ['sichuan', '四川'], ['guizhou', '贵州'],
  ['yunnan', '云南'], ['xizang', '西藏'], ['shaanxi', '陕西'], ['gansu', '甘肃'],
  ['qinghai', '青海'], ['ningxia', '宁夏'], ['xinjiang', '新疆']
]

/** 社平取值（广东等为嵌套 {prov, shenzhen}） */
function hv(o, y) {
  if (!o) return 0
  if (typeof o[y] === 'number') return o[y]
  for (const k of ['prov', '全省', '省']) if (o[k] && typeof o[k][y] === 'number') return o[k][y]
  return 0
}

/** 累计投入：Σ 社平[y] × 档位 × 12月 × 20%（灵活就业全自缴），自建账年起 */
function totalCost(cfg, tier, startYear) {
  const h = cfg.avg_salary_history || {}
  let sum = 0
  for (let y = startYear; y <= 2025; y++) {
    const v = hv(h, y)
    if (!v || v <= 0) continue
    const months = (y === startYear) ? 6 : 12
    sum += v * tier * months * 0.20
  }
  return sum
}

const TIERS = [[0.6, '60%'], [1.0, '100%'], [3.0, '300%']]

// 主口径：1987-07 参工（与原文 4833 篇同口径，含视同）
const P1987 = {
  gender: 'male', genderType: 'male', birthYear: 1965, birthMonth: 9,
  workYear: 1987, workMonth: 7, cityType: 'prov',
  retireDateInput: { year: 2025, month: 12 }
}

const rows = PROVS.map(([code, name]) => {
  const cfg = getConfig(code)
  // ⚠️ account_start 是对象 {year, month}（不是 "1996-07" 字符串）
  const startYear = (cfg.account_start && cfg.account_start.year) || 1996
  const rec = { code, name, startYear }
  for (const [tier, label] of TIERS) {
    const r = engine.calculate(cfg, Object.assign({}, P1987, { avgIndex: tier })).legal
    const base = (r.basicPension && r.basicPension.amount) || 0
    const pers = (r.personalAccount && r.personalAccount.amount) || 0
    const trans = ((r.transitionalPension || {}).amount || 0) + ((r.transitionalPension || {})._adjustment || 0)
    const core = base + pers + trans
    const ex = (r.extraPension || {}).amount || 0
    const sp = (r.specialAddition || {}).amount || 0
    const af = (r.adjustmentFund || {}).amount || 0
    const local = ex + sp + af
    const total = r.total || 0
    const cost = totalCost(cfg, tier, startYear)
    rec[label] = {
      base, pers, trans, core, ex, sp, af, local, total,
      other: total - core - local,   // 过渡性调整 + 当年增资等
      cost,
      effA: cost > 0 ? core / cost * 10000 : 0,
      effB: cost > 0 ? total / cost * 10000 : 0
    }
  }
  return rec
})

function dump(label) {
  const sorted = rows.slice().sort((a, b) => b[label].total - a[label].total)
  console.log('\n===== ' + label + ' 档：按口径B（到手，含地方项）降序 =====')
  console.log('排名 省     口径A核心   地方项(增发/特殊/调节)  口径B到手   投入      效率A   效率B   排名变化')
  const rankA = rows.slice().sort((a, b) => b[label].core - a[label].core).map(x => x.code)
  sorted.forEach((x, i) => {
    const d = x[label]
    const ra = rankA.indexOf(x.code) + 1
    const delta = ra - (i + 1)
    const dstr = delta === 0 ? '  —' : (delta > 0 ? '↑' + delta : '↓' + (-delta))
    console.log(
      String(i + 1).padStart(3) + ' ' + x.name.padEnd(4) +
      ' ' + d.core.toFixed(2).padStart(9) +
      '  ' + (d.local.toFixed(2)).padStart(7) + ' (' + d.ex.toFixed(0) + '/' + d.sp.toFixed(0) + '/' + d.af.toFixed(0) + ')' +
      ' ' + d.total.toFixed(2).padStart(9) +
      ' ' + d.cost.toFixed(0).padStart(9) +
      ' ' + d.effA.toFixed(2).padStart(7) + ' ' + d.effB.toFixed(2).padStart(7) +
      '  ' + dstr
    )
  })
  const ts = sorted.map(x => x[label].total)
  const cs = sorted.map(x => x[label].core)
  console.log('  口径A极差 ' + (Math.max(...cs) - Math.min(...cs)).toFixed(2) + '（' + (Math.max(...cs) / Math.min(...cs)).toFixed(3) + '倍）')
  console.log('  口径B极差 ' + (Math.max(...ts) - Math.min(...ts)).toFixed(2) + '（' + (Math.max(...ts) / Math.min(...ts)).toFixed(3) + '倍）')
  return sorted
}

console.log('【1987-07 参工，38.42 年（含视同），2025-12 退休，男，100%档=avgIndex 1.0】')
console.log('地方项括号：(增发基础 / 特殊增发 / 过渡调节金)')
const s60 = dump('60%')
const s100 = dump('100%')
const s300 = dump('300%')

// 地方项非零的省清单
console.log('\n===== 地方项非零点名（100% 档）=====')
rows.filter(x => x['100%'].local > 0.01).sort((a, b) => b['100%'].local - a['100%'].local).forEach(x => {
  const d = x['100%']
  console.log('  ' + x.name.padEnd(4) + ' 地方项合计 ' + d.local.toFixed(2).padStart(7) +
    '  → 增发 ' + d.ex.toFixed(2).padStart(7) + ' | 特殊增发 ' + d.sp.toFixed(2).padStart(7) + ' | 调节金 ' + d.af.toFixed(2).padStart(7) +
    ' | 其它(过渡调整/增资) ' + d.other.toFixed(2).padStart(7))
})
console.log('  （无地方项的省：' + rows.filter(x => x['100%'].local <= 0.01).map(x => x.name).join('、') + '）')
