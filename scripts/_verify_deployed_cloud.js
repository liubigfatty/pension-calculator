// 验证云端部署副本：download 回来的代码逐省跑，与本地引擎逐项比对
// 红线：deploy 日志 success ≠ 线上正确，必须拉回副本验证
const path = require('path')
const ROOT = path.join(__dirname, '..')

const cloudFn = require(path.join(ROOT, '_verify_dl/calculate/index.js'))
const localEngine = require(path.join(ROOT, 'cloudfunctions/calculate/pension-engine.js'))
const localData = require(path.join(ROOT, 'cloudfunctions/calculate/provinces-data.js'))

const BASE = {
  gender: 'male',
  genderType: 'male',
  birthDate: '1965-09',
  workStartDate: '1987-07',
  averageIndex: '1.0',
  cityType: 'prov'
}

let pass = 0
let fail = 0
const errs = []

function F(n, p = 2) { return Number(n).toFixed(p) }

async function main() {
  const codes = localData.listProvinces()
  console.log('省份数：' + codes.length)
  console.log('\n省份        云端合计      本地合计      差额   基础养老金   个账      过渡性')
  console.log('-'.repeat(92))

  for (const code of codes) {
    const cfg = localData.getConfig(code)
    const name = cfg.province_name || cfg.name || code
    let cloudRes
    try {
      cloudRes = await cloudFn.main({ ...BASE, province: code })
    } catch (e) {
      errs.push(`${name} 云端调用抛错：${e.message}`)
      fail++
      continue
    }
    if (!cloudRes || cloudRes.success === false) {
      errs.push(`${name} 云端返回失败：${cloudRes && cloudRes.message}`)
      fail++
      continue
    }
    const c = (cloudRes.data && cloudRes.data.legal) || cloudRes.legal || cloudRes
    const l = localEngine.calculate(cfg, {
      gender: 'male', genderType: 'male',
      birthYear: 1965, birthMonth: 9,
      workYear: 1987, workMonth: 7,
      avgIndex: 1.0, cityType: 'prov'
    }).legal

    const diff = Math.abs((c.total || 0) - (l.total || 0))
    const ok = diff < 0.01
    if (ok) pass++
    else {
      fail++
      errs.push(`${name} 云端 ${F(c.total)} vs 本地 ${F(l.total)} 差 ${F(diff)}`)
    }
    console.log([
      name.padEnd(10),
      F(c.total).padStart(11),
      F(l.total).padStart(11),
      F(diff).padStart(9),
      F(c.basicPension ? c.basicPension.amount : 0).padStart(11),
      F(c.personalAccount ? c.personalAccount.amount : 0).padStart(9),
      F((c.transitionalPension ? c.transitionalPension.amount : 0) + (c.transitionalPension && c.transitionalPension._adjustment ? c.transitionalPension._adjustment : 0)).padStart(9)
    ].join(' '))
  }

  // ---- 贵州独生子女增发 bug 专项验证 ----
  console.log('\n=== 贵州独生子女增发专项（本次修复核心）===')
  const noCert = await cloudFn.main({ ...BASE, province: 'guizhou' })
  const withCert = await cloudFn.main({ ...BASE, province: 'guizhou', extras: { oneChild: true } })
  const deny = await cloudFn.main({ ...BASE, province: 'guizhou', extras: { oneChild: false } })
  const g = (r) => { const L = (r.data && r.data.legal) || r.legal || {}; return F((L.specialAddition ? L.specialAddition.amount : 0) + (L.extraPension ? L.extraPension.amount : 0)) }
  console.log('  不传 extras（默认）     增发 =', g(noCert), ' ← 修复前为 244.29（bug：默认人人发）')
  console.log('  extras.oneChild=true    增发 =', g(withCert))
  console.log('  extras.oneChild=false   增发 =', g(deny))
  const bugFixed = g(noCert) === '0.00' && g(withCert) !== '0.00' && g(deny) === '0.00'
  console.log('  判定：' + (bugFixed ? '✅ 已修复（默认不发、持证才发、可关闭）' : '❌ 仍异常'))
  if (bugFixed) pass++
  else { fail++; errs.push('贵州独生子女增发 bug 未修复') }

  // ---- 社平语义专项：山东 2026 年度应为 7621 ----
  console.log('\n=== 社平语义专项（执行年口径）===')
  const sdCfg = localData.getConfig('shandong')
  const h = sdCfg.AVG_SALARY_HISTORY || sdCfg.avg_salary_history || {}
  const checks = [[2025, 7506], [2026, 7621]]
  for (const [y, want] of checks) {
    const got = h[y]
    const ok = got != null && Math.abs(got - want) < 1
    console.log(`  山东 [${y}] = ${got}  期望 ${want}  ${ok ? '✅' : '❌'}`)
    if (ok) pass++
    else { fail++; errs.push(`山东[${y}] = ${got}，期望 ${want}`) }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`结果：${pass} 通过 / ${fail} 失败`)
  if (errs.length) {
    console.log('\n失败明细：')
    errs.forEach(e => console.log('  ❌ ' + e))
  }
  console.log('='.repeat(60))
}

main().catch(e => { console.error(e); process.exit(1) })
