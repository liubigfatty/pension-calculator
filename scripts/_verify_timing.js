// 时点篇正文数字全量验算（吉林 · 男1965-09 · 1987-07参工 · 100档 · 长春）
const ROOT = 'C:/Users/14041/WorkBuddy/2026-07-16-10-20-33/养老金计算平台/'
const e = require(ROOT + 'engine/pension-engine.js')
const prov = require(ROOT + 'cloudfunctions/calculate/provinces-data.js')
const cfg = prov.getConfig('jilin')

let pass = 0, fail = 0
const ok = (label, got, want, tol = 0.01) => {
  const p = Math.abs(got - want) <= tol
  p ? pass++ : fail++
  console.log((p ? '  ✅ ' : '  ❌ ') + label + ' = ' + got + (p ? '' : '   期望 ' + want))
}

const BASE = { gender: 'male', genderType: 'male', birthYear: 1965, birthMonth: 9, workYear: 1987, workMonth: 7, avgIndex: 1.0, cityType: 'cc' }
// 静态口径：强制 2025 年已公布基数，排除外推
const S = { baseRetireInput: 7978.25, baseProvInput: 7322 }
const run = (rd, extra = {}) => e.calculate(cfg, { ...BASE, ...extra, retireDateInput: rd }).legal

const A = run({ year: 2025, month: 9 }, S)    // 提前（60岁整）
const B = run({ year: 2025, month: 12 }, S)   // 法定（60岁3个月）
const C = run({ year: 2028, month: 12 }, S)   // 晚退3年（静态）
const C2 = run({ year: 2028, month: 12 })     // 晚退3年（引擎外推口径，仅对比用）

console.log('【一、三个时点（正文第一节）】')
ok('  提前 年限 38.17', +A.totalYears.toFixed(2), 38.17)
ok('  提前 月数 139', A.months, 139, 0)
ok('  提前 月领 5,034.46', +A.total.toFixed(2), 5034.46)
ok('  法定 年限 38.42', +B.totalYears.toFixed(2), 38.42)
ok('  法定 月数 139', B.months, 139, 0)
ok('  法定 月领 5,074.62', +B.total.toFixed(2), 5074.62)
ok('  晚退 年限 41.42', +C.totalYears.toFixed(2), 41.42)
ok('  晚退 月数 117', C.months, 117, 0)
// 2026-09-14 更新：外推率改为「按上一年已公布增幅」后，个人账户余额微降 0.63 元，
//   月领由 5802.56 → 5802.55（基础养老金 3168.43 不变，静态口径结论不受影响）
ok('  晚退 月领 5,802.55（静态）', +C.total.toFixed(2), 5802.55)
ok('  基数 市县 7,978.25', B.baseRetire, 7978.25)
ok('  基数 全省 7,322', B.baseProv, 7322)
ok('  晚退口径确实冻结在 7,978.25', C.baseRetire, 7978.25)

console.log('\n【二、提前退（正文第二节）】')
ok('  每月少 40.16', +(B.total - A.total).toFixed(2), 40.16)
ok('  早领3个月 15,103.38', +(A.total * 3).toFixed(2), 15103.38)
ok('  追平 31.34 年', +(A.total * 3 / (B.total - A.total) / 12).toFixed(2), 31.34)
ok('  要活到 91.3 岁', +(60 + A.total * 3 / (B.total - A.total) / 12).toFixed(1), 91.3, 0.05)

console.log('\n【三、晚退（正文第三节·静态口径）】')
const dTot = C.total - B.total
ok('  每月多 727.93', +dTot.toFixed(2), 727.93)
ok('  少领36个月 182,686', +(B.total * 36).toFixed(0), 182686, 1)
const p8 = 7322 * 0.08 * 36, p12 = 7322 * 0.12 * 36, p20 = 7322 * 0.20 * 36
ok('  自缴8%（进个人账户）21,087', +p8.toFixed(0), 21087, 1)
ok('  自缴12%（进统筹）31,631', +p12.toFixed(0), 31631, 1)
ok('  自缴20%合计 52,718', +p20.toFixed(0), 52718, 1)
ok('  [口径1] 回本 20.91 年', +(B.total * 36 / dTot / 12).toFixed(2), 20.91)
ok('  [口径1] 活到 84.2 岁', +(63.25 + B.total * 36 / dTot / 12).toFixed(1), 84.2, 0.05)
ok('  [口径2] 回本 24.53 年', +((B.total * 36 + p12) / dTot / 12).toFixed(2), 24.53)
ok('  [口径2] 活到 87.8 岁', +(63.25 + (B.total * 36 + p12) / dTot / 12).toFixed(1), 87.8, 0.05)
ok('  [口径3] 回本 26.95 年', +((B.total * 36 + p20) / dTot / 12).toFixed(2), 26.95)
ok('  [口径3] 活到 90.2 岁', +(63.25 + (B.total * 36 + p20) / dTot / 12).toFixed(1), 90.2, 0.05)

console.log('\n【四、多拿的钱里有一半是自己的（正文第三节末）】')
ok('  个人账户多存 29,146', +(C.personalAccount.balance - B.personalAccount.balance).toFixed(0), 29146, 1)
ok('  月个人账户 1020.79 → 1461.85', +C.personalAccount.amount.toFixed(2), 1461.85)
ok('  月个人账户多 441.06', +(C.personalAccount.amount - B.personalAccount.amount).toFixed(2), 441.06)
ok('  月统筹部分多 286.88', +((C.total - C.personalAccount.amount) - (B.total - B.personalAccount.amount)).toFixed(2), 286.88)
ok('  两块之和 = 月领差', +(C.personalAccount.amount - B.personalAccount.amount + (C.total - C.personalAccount.amount) - (B.total - B.personalAccount.amount)).toFixed(2), +dTot.toFixed(2))

console.log('\n【五、外推口径对比（正文第四节）】')
// ⚠️ 2026-09-14 口径变更：原"外推"走的是配置里写死的 2027-2035 值（按 PROV_GROWTH 4.38% 生成，
//    无官方来源），现一律改为「按该省上一年已公布增幅」复合外推（吉林全省 2.00% / 长春 1.60%）。
//    故以下数字整体下移，且更保守；正文不采用外推口径（用静态口径），此处仅作对比留档。
ok('  外推 2028 基数 8,367.46', +C2.baseRetire.toFixed(2), 8367.46)
ok('  外推月领 6,045.36', +C2.total.toFixed(2), 6045.36)
ok('  外推每月多 970.74', +(C2.total - B.total).toFixed(2), 970.74)
ok('  外推回本 15.68 年', +(B.total * 36 / (C2.total - B.total) / 12).toFixed(2), 15.68)
ok('  外推活到 78.9 岁', +(63.25 + B.total * 36 / (C2.total - B.total) / 12).toFixed(1), 78.9, 0.05)
ok('  两种口径回本差 5.2 年', +(B.total * 36 / dTot / 12 - B.total * 36 / (C2.total - B.total) / 12).toFixed(1), 5.2, 0.05)
console.log('  ℹ️  外推基数现由引擎按「上一年已公布增幅」外推（吉林全省 2.00% / 长春 1.60%）—— 属预测值，非官方数据')

console.log('\n【六、有工作的净账（正文第五节）】')
const wage = 7322 * 36
ok('  三年工资 263,592', +wage.toFixed(0), 263592, 1)
ok('  扣个人社保后 242,505', +(wage - p8).toFixed(0), 242505, 1)
ok('  不晚退可领 182,686', +(B.total * 36).toFixed(0), 182686, 1)
ok('  净 +59,818', +(wage - p8 - B.total * 36).toFixed(0), 59818, 1)

console.log('\n【七、口径自洽】')
ok('  提前退时点 = 60 岁整', A.age, 60, 0)
ok('  法定退休 = 60 岁 3 个月', +B.age.toFixed(2), 60.25)
ok('  晚退 = 63 岁 3 个月', +C.age.toFixed(2), 63.25)
ok('  年限差（法定-提前）= 0.25 年', +(B.totalYears - A.totalYears).toFixed(2), 0.25)
ok('  年限差（晚退-法定）= 3.00 年', +(C.totalYears - B.totalYears).toFixed(2), 3.00)

console.log(`\n===== 时点篇验算：${pass} 通过 / ${fail} 失败 =====`)
process.exit(fail ? 1 : 0)
