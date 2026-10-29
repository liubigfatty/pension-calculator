#!/usr/bin/env node
/**
 * 探针：分年记账比例改造的影响面（2026-10-30）
 *
 * 引擎原按「缴费基数 × 8%」一刀切记账。改为按省分年后（ACCOUNT_RATE_SCHEDULE），
 * 只有省份配置命中且缴费年份落在 1998~8%起点 之间的案例才会变化。
 *
 * 用法：node scripts/_probe_account_rate.js
 * 依赖：git 里 HEAD 版本作为「旧引擎」基线（提取到 _tmp_cmp/old_engine.js）
 */
const fs = require('fs')
const path = require('path')
const ROOT = path.join(__dirname, '..')

const { mapCaseToInput } = require('./run-cases.js')

const OLD_PATH = path.join(ROOT, '_tmp_cmp', 'old_engine.js')
if (!fs.existsSync(OLD_PATH)) {
  console.error('缺少旧引擎基线 _tmp_cmp/old_engine.js，先跑：')
  console.error('  git show HEAD:cloudfunctions/calculate/pension-engine.js > _tmp_cmp/old_engine.js')
  process.exit(1)
}
const OLD = require(OLD_PATH)
const NEW = require(path.join(ROOT, 'engine', 'pension-engine.js'))

function loadConfig(prov) {
  const p = path.join(ROOT, 'cloudfunctions', 'calculate', 'provinces', prov + '.js')
  const m = require(path.resolve(p))
  return m.getEngineConfig ? m.getEngineConfig() : m
}

const rows = []
for (const prov of fs.readdirSync(path.join(ROOT, 'cases'))) {
  const dir = path.join(ROOT, 'cases', prov)
  if (!fs.statSync(dir).isDirectory()) continue
  const cfg = loadConfig(prov)
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue
    const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))
    const input = mapCaseToInput(c, cfg)
    let ro, rn
    try {
      ro = OLD.calculate(cfg, input)
      rn = NEW.calculate(cfg, input)
    } catch (e) {
      rows.push({ prov, f, err: e.message })
      continue
    }
    const bo = (ro.legal && ro.legal.personalAccount && ro.legal.personalAccount.balance) || 0
    const bn = (rn.legal && rn.legal.personalAccount && rn.legal.personalAccount.balance) || 0
    const po = (ro.legal && ro.legal.personalAccount && ro.legal.personalAccount.amount) || 0
    const pn = (rn.legal && rn.legal.personalAccount && rn.legal.personalAccount.amount) || 0
    rows.push({ prov, f, bo, bn, po, pn, db: bn - bo, dp: pn - po })
  }
}

const changed = rows.filter(r => !r.err && Math.abs(r.db) > 0.5)
console.log('════ 分年记账比例改造影响面 ════')
console.log()
console.log(`案例总数 ${rows.length}，个账余额发生变化 ${changed.length} 个`)
console.log()
if (changed.length) {
  console.log('省份        案例                         旧余额      新余额      差      旧月领   新月领    差')
  for (const r of changed.sort((a, b) => a.prov.localeCompare(b.prov))) {
    console.log(
      r.prov.padEnd(11), r.f.padEnd(26),
      r.bo.toFixed(2).padStart(11), r.bn.toFixed(2).padStart(11), r.db.toFixed(2).padStart(9),
      r.po.toFixed(2).padStart(9), r.pn.toFixed(2).padStart(8), r.dp.toFixed(2).padStart(7)
    )
  }
  const avgD = changed.reduce((s, r) => s + r.dp, 0) / changed.length
  console.log()
  console.log(`变化案例的月个人账户养老金平均变化：${avgD.toFixed(2)} 元/月`)
}
const errs = rows.filter(r => r.err)
if (errs.length) {
  console.log()
  console.log('报错：')
  for (const r of errs.slice(0, 10)) console.log(' ', r.prov, r.f, r.err)
}

// ══════════ 空输入探针 ══════════
// 185 条 case 全部显式传 personalAcc（"用户输入余额"分支），**根本不走滚存**，
// 所以回归全绿是假绿。必须补空输入探针才能验证本次改造真的生效。
console.log()
console.log('════ 空输入探针（不传 personalAcc，强制走滚存路径）════')
console.log()

const PROBES = [
  { label: '吉林  1981-04 参加工作 / 2025 退休', prov: 'jilin',        workYear: 1981, workMonth: 4 },
  { label: '吉林  1996-01 参加工作 / 2025 退休', prov: 'jilin',        workYear: 1996, workMonth: 1 },
  { label: '辽宁  1985-01 参加工作 / 2025 退休', prov: 'liaoning',     workYear: 1985, workMonth: 1 },
  { label: '黑龙江 1985-01 参加工作 / 2025 退休', prov: 'heilongjiang', workYear: 1985, workMonth: 1 },
  { label: '河南  1985-01 参加工作 / 2025 退休（对照·无 schedule）', prov: 'henan', workYear: 1985, workMonth: 1 }
]

console.log('场景                                            旧余额      新余额        差    旧月领   新月领     差')
for (const p of PROBES) {
  const cfg = loadConfig(p.prov)
  const input = {
    province: p.prov,
    gender: 'male', genderType: 'male',
    birthYear: 1965, birthMonth: 2,
    workYear: p.workYear, workMonth: p.workMonth,
    retireYear: 2025, retireMonth: 2,
    avgIndex: 1.0
    // ⚠️ 故意不传 personalAcc —— 强制走滚存
  }
  let ro, rn
  try {
    ro = OLD.calculate(cfg, input)
    rn = NEW.calculate(cfg, input)
  } catch (e) {
    console.log(p.label.padEnd(46), 'ERR', e.message)
    continue
  }
  const go = r => {
    const pa = (r.legal && r.legal.personalAccount) || {}
    return { b: pa.balance || 0, a: pa.amount || 0 }
  }
  const o = go(ro), n = go(rn)
  console.log(
    p.label.padEnd(46),
    o.b.toFixed(2).padStart(11), n.b.toFixed(2).padStart(11), (n.b - o.b).toFixed(2).padStart(9),
    o.a.toFixed(2).padStart(9), n.a.toFixed(2).padStart(8), (n.a - o.a).toFixed(2).padStart(7)
  )
}
console.log()
console.log('判据：东北三省应【上升】（早期记账 16%/11%/12% 高于一刀切 8%），河南应【不变】（无 schedule）')
