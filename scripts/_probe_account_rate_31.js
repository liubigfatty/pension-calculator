#!/usr/bin/env node
/**
 * 探针：31 省「空输入」个账记账比例影响面（2026-10-30）
 *
 * ⚠️ 为什么要单独写：185 条 case **全部显式传 personalAcc**，走「用户输入余额」分支、
 *    根本不进滚存 ⇒ 改记账比例类规则时 run-cases 永远全绿（假绿）。
 *    本探针把 case 里的 personalAcc 剥掉，强制走引擎滚存路径。
 *
 * 用法：node scripts/_probe_account_rate_31.js
 * 依赖：git HEAD 版本作为「旧引擎」基线（_tmp_cmp/old_engine.js）
 */
const fs = require('fs')
const path = require('path')
const ROOT = path.join(__dirname, '..')
const { mapCaseToInput } = require('./run-cases.js')

const OLD_PATH = path.join(ROOT, '_tmp_cmp', 'old_engine.js')
if (!fs.existsSync(OLD_PATH)) {
  console.error('缺少旧引擎基线，先跑：')
  console.error('  mkdir -p _tmp_cmp && git show HEAD:cloudfunctions/calculate/pension-engine.js > _tmp_cmp/old_engine.js')
  process.exit(1)
}
const OLD = require(OLD_PATH)
const NEW = require(path.join(ROOT, 'engine', 'pension-engine.js'))

function loadConfig(prov) {
  const m = require(path.resolve(path.join(ROOT, 'cloudfunctions', 'calculate', 'provinces', prov + '.js')))
  return m.getEngineConfig ? m.getEngineConfig() : m
}

// 统一构造场景：1996-01 参保（横跨 1998~2005 的 11% 段）、2026-01 退休、100% 档、不传余额
// ⚠️ run-cases 的 mapCaseToInput 认 snake_case（birth_year / work_year / retire_year ...）
const SCENARIO = {
  gender: 'male', birth_year: 1966, birth_month: 1,
  work_year: 1996, work_month: 1,
  retire_year: 2026, retire_month: 1,
  avg_index: 1, city_type: 'prov'
}

const rows = []
for (const prov of fs.readdirSync(path.join(ROOT, 'cases')).sort()) {
  const dir = path.join(ROOT, 'cases', prov)
  if (!fs.statSync(dir).isDirectory()) continue
  let cfg
  try { cfg = loadConfig(prov) } catch (e) { rows.push({ prov, err: 'cfg:' + e.message }); continue }

  const c = Object.assign({ province: prov }, SCENARIO)
  const input = mapCaseToInput(c, cfg)
  let ro, rn
  try {
    ro = OLD.calculate(cfg, input)
    rn = NEW.calculate(cfg, input)
  } catch (e) { rows.push({ prov, err: 'calc:' + e.message }); continue }

  const g = r => {
    const pa = (r.legal && r.legal.personalAccount) || {}
    return { b: pa.balance || 0, a: pa.amount || 0, t: (r.legal && r.legal.total) || 0 }
  }
  const o = g(ro), n = g(rn)
  rows.push({ prov, f: '1996参保/2026退', bo: o.b, bn: n.b, db: n.b - o.b, dp: n.a - o.a, dt: n.t - o.t })
}

const ok = rows.filter(r => !r.err)
const changed = ok.filter(r => Math.abs(r.db) > 0.5)
console.log('════ 31 省「空输入」个账记账比例影响面（剥掉 personalAcc，强制滚存）════')
console.log()
console.log(`省份数 ${ok.length}，个账余额发生变化 ${changed.length} 个`)
console.log()
console.log('省份          案例              旧个账余额     新个账余额        差额   月领差')
console.log('─'.repeat(84))
for (const r of ok) {
  const mark = Math.abs(r.db) > 0.5 ? ' ←' : '  '
  console.log(
    r.prov.padEnd(13), String(r.f).padEnd(16),
    r.bo.toFixed(2).padStart(11), r.bn.toFixed(2).padStart(13),
    (r.db >= 0 ? '+' : '') + r.db.toFixed(2).padStart(9),
    ((r.dp >= 0 ? '+' : '') + r.dp.toFixed(2)).padStart(9), mark
  )
}
const errs = rows.filter(r => r.err)
if (errs.length) {
  console.log()
  console.log('报错：')
  for (const r of errs.slice(0, 12)) console.log(' ', r.prov, r.err)
}
const un = changed.filter(r => Math.abs(r.db) <= 0.5)
console.log()
console.log(`未变化的省份（${ok.length - changed.length} 个）：` +
  (ok.filter(r => Math.abs(r.db) <= 0.5).map(r => r.prov).join(' ') || '无'))
