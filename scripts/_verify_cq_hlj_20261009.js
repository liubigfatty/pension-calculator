/**
 * 哨兵：重庆独生子女增发 3% + 黑龙江御寒津贴移除（2026-10-09 用户拍板）
 *
 * 重庆依据：渝劳办发〔2000〕261号
 *   —— **1996-01-01 前参加工作或参加城镇企业职工基本养老保险** 且持《独生子女父母光荣证》的参保人，
 *      退休时按本人基本养老金（基础+个人+过渡）**增发 3%**；1996-01-01 及以后参保者无此政策。
 *   本次修正两处：① 去掉原 `transPension.amount > 0` 条件（无视同缴费者会被漏掉）；
 *                ② 补「1996-01-01 前参工」门槛（1996 后参保者会被多算）。
 *
 * 黑龙江依据：黑劳社发〔2008〕79号 御寒津贴 45 元/月。
 *   2026-10-09 用户拍板**移除**：真实核定表「核定基本养老金合计」7855.30 = 三项之和，不含 45
 *   ⇒ heilongjiang.js 的 modules.special_addition 改为 enabled:false。
 *
 * 用法：node scripts/_verify_cq_hlj_20261009.js
 */
const fs = require('fs')
const path = require('path')
const { calculate } = require(path.resolve('./engine/pension-engine.js'))
const { mapCaseToInput } = require('./run-cases.js')

let pass = 0, fail = 0
function chk(tag, actual, expected, tol) {
  const ok = Math.abs(actual - expected) <= (tol == null ? 0.01 : tol)
  console.log((ok ? '  ✅ ' : '  ❌ ') + tag + ' 实算=' + actual + ' 期望=' + expected)
  ok ? pass++ : fail++
  return ok
}

function loadCase(prov, file) {
  return JSON.parse(fs.readFileSync(path.resolve('./cases', prov, file), 'utf8'))
}

function run(prov, c) {
  const cfgMod = require(path.resolve('./cloudfunctions/calculate/provinces/' + prov + '.js'))
  const config = cfgMod.getEngineConfig ? cfgMod.getEngineConfig() : cfgMod
  const input = mapCaseToInput(c, prov)
  const r = calculate(config, input)
  return r.legal || r
}

console.log('══ 一、黑龙江：御寒津贴 45 已移除 ══')
{
  const c = loadCase('heilongjiang', '1.json')
  const L = run('heilongjiang', c)
  const sum3 = L.basicPension.amount + L.personalAccount.amount + L.transitionalPension.amount
  console.log('   描述:', L.specialAddition && L.specialAddition.description)
  chk('specialAddition = 0', L.specialAddition.amount, 0)
  chk('total = 基础+个账+过渡（核定表口径）', L.total, Math.round(sum3 * 100) / 100, 0.01)
  chk('total 与案例期望一致(5195.70)', L.total, 5195.70, 0.01)
  console.log('   ℹ️ 御寒津贴 45 仍按月发放，只是不并入"月基本养老金合计"')
}

console.log('\n══ 二、重庆：独子 3% 门槛与口径 ══')
{
  // ① 1996 前参工 + 持证 ⇒ 3%（案例 2：1983-01 参工）
  const c2 = loadCase('chongqing', '2.json')
  const L2 = run('chongqing', c2)
  const base2 = L2.basicPension.amount + L2.personalAccount.amount + L2.transitionalPension.amount
  console.log('   描述:', L2.specialAddition && L2.specialAddition.description)
  chk('① 1983年参工+持证 ⇒ specialAddition', L2.specialAddition.amount, Math.round(base2 * 0.03 * 100) / 100)
  chk('① 与案例期望 133.59 一致', L2.specialAddition.amount, 133.59, 0.01)

  // ② 1996 后参工 + 持证 ⇒ 0（新门槛）
  const cLater = JSON.parse(JSON.stringify(c2))
  cLater.work_year = 2000
  cLater.work_month = 3
  const L3 = run('chongqing', cLater)
  console.log('   描述:', L3.specialAddition && L3.specialAddition.description)
  chk('② 2000年参工+持证 ⇒ 不增发', L3.specialAddition.amount, 0)

  // ③ 1996 前参工 + 未持证 ⇒ 0
  const cNoCert = JSON.parse(JSON.stringify(c2))
  cNoCert.one_child = false
  cNoCert.oneChild = false
  const L4 = run('chongqing', cNoCert)
  chk('③ 1983年参工+未持证 ⇒ 不增发', L4.specialAddition.amount, 0)

  // ④ 1996 前参工 + 持证 + **无视同缴费（过渡性=0）** ⇒ 仍应给 3%
  //    （旧实现多加了 transPension>0 条件，此例会被漏掉 ⇒ 本条是回归哨兵）
  const cNoSight = JSON.parse(JSON.stringify(c2))
  cNoSight.sight_years = 0
  cNoSight.pre_account_years = 0
  const L5 = run('chongqing', cNoSight)
  const base5 = L5.basicPension.amount + L5.personalAccount.amount + L5.transitionalPension.amount
  console.log('   过渡性=', L5.transitionalPension.amount, '| 描述:', L5.specialAddition && L5.specialAddition.description)
  chk('④ 无视同缴费(过渡性=0)仍给 3%', L5.specialAddition.amount, Math.round(base5 * 0.03 * 100) / 100)
  chk('④ 金额 > 0（旧实现会归 0）', L5.specialAddition.amount > 0 ? 1 : 0, 1)

  // ⑤ 官方实例同式验算（开州府复〔2026〕3号：基本养老金 2472.35 × 3% = 74.17）
  chk('⑤ 开州实例 2472.35×3%', Math.round(2472.35 * 0.03 * 100) / 100, 74.17)
}

console.log('\n══ 三、其他省不受影响 ══')
{
  // 海南 5% / 贵州 5% 仍在；云南 5%（人均口径）仍在
  for (const prov of ['hainan', 'guizhou']) {
    const dir = path.resolve('./cases', prov)
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
    let hit = null
    for (const f of files) {
      const c = loadCase(prov, f)
      if (c.oneChild) { hit = { f, c }; break }
    }
    if (!hit) { console.log('  ⏭  ' + prov + ' 无 oneChild 案例，跳过'); continue }
    const L = run(prov, hit.c)
    const b = L.basicPension.amount + L.personalAccount.amount + L.transitionalPension.amount
    const rate = prov === 'hainan' ? 0.05 : 0.05
    console.log('  ' + prov + '/' + hit.f + ' 描述:', L.specialAddition && L.specialAddition.description)
    chk(prov + ' 独子增发仍是 5%', L.specialAddition.amount, Math.round(b * rate * 100) / 100)
  }
}

console.log('\n=== ' + pass + ' / ' + (pass + fail) + ' ===')
if (fail) process.exit(1)
