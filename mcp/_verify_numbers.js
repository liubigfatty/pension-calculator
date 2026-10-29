'use strict'

// 数字准确度对账（不是协议，是算得准不准）
// 三组比对：
//   A. 内部一致性：pension_retire_date 自算结果 vs pension_calculate（引擎 legal.date）结果
//   B. 引擎一致性：MCP 输出 vs 直接 require 引擎（同一入参）
//   C. 案例对账：MCP 用案例可提供的参数 vs cases/ 期望值（口径差异量化）

const path = require('path')
const fs = require('fs')
const http = require('http')

const engine = require('../cloudfunctions/calculate/pension-engine.js')
const A = require('./alias.js')
const TOOLS = require('./tools.js')
const CALC = TOOLS[0]
const RETIRE = TOOLS[1]

const PORT = process.env.PORT || 8787

function call (o) {
  return new Promise((resolve, reject) => {
    const d = JSON.stringify(o)
    const r = http.request({
      host: '127.0.0.1', port: PORT, path: '/mcp', method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }
    }, (res) => {
      let b = ''
      res.on('data', (c) => { b += c })
      res.on('end', () => { try { resolve(JSON.parse(b)) } catch (e) { reject(new Error('bad json: ' + b.slice(0, 80))) } })
    })
    r.on('error', reject)
    r.end(d)
  })
}

const ok = []
const bad = []
const check = (name, cond, detail) => {
  ;(cond ? ok : bad).push(name + (detail ? ' — ' + detail : ''))
  console.log((cond ? '✅' : '❌') + ' ' + name + (detail ? ' — ' + detail : ''))
}

// ── A. 内部一致性：退休时间两个工具是否打架 ─────────────────────
async function innerConsistency () {
  console.log('\n--- A. 两个工具的退休时间是否一致 ---')
  // 覆盖三种身份 × 关键出生年月（含封顶档）
  const cases = [
    { p: '吉林', g: '男', b: '1976-02' },
    { p: '吉林', g: '男', b: '1976-09' },   // 男封顶阈值
    { p: '吉林', g: '男', b: '1965-01' },
    { p: '广东', g: '女干部', b: '1981-09' }, // 女干部封顶
    { p: '广东', g: '女工人', b: '1984-11' }, // 女工人封顶 60 个月
    { p: '广东', g: '女工人', b: '1980-01' },
    { p: '北京', g: '男', b: '1970-06' },
    { p: '山东', g: '女工人', b: '1982-03' }
  ]
  for (const c of cases) {
    const rt = await RETIRE.run({ province: c.p, gender_type: c.g, birth_date: c.b })
    const rd = rt.data
    const calcRes = await CALC.run({
      province: c.p, gender_type: c.g, birth_date: c.b, work_start_date: '1996-01', average_index: 1.0
    })
    if (calcRes.isError || !calcRes.data) {
      check(`A [${c.p}/${c.g}/${c.b}] 法定退休一致`, false, 'CALC 工具报错: ' + String(calcRes.text || '').slice(0, 120))
      continue
    }
    const legal = calcRes.data.legal
    const eDate = legal.date
    const eFlex = calcRes.data.flex && calcRes.data.flex.date
    const same = rd.retire.year === eDate.year && rd.retire.month === eDate.month
    const flexSame = eFlex ? (rd.flex.year === eFlex.year && rd.flex.month === eFlex.month) : null
    check(
      `A [${c.p}/${c.g}/${c.b}] 法定退休一致`,
      same,
      `retire工具=${rd.retire.year}-${String(rd.retire.month).padStart(2, '0')} | 引擎=${eDate.year}-${String(eDate.month).padStart(2, '0')} | 延迟=${rd.delay}个月`
    )
    if (flexSame !== null) {
      check(
        `A [${c.p}/${c.g}/${c.b}] 提前退休一致`,
        flexSame,
        `retire工具=${rd.flex.year}-${String(rd.flex.month).padStart(2, '0')} | 引擎=${eFlex.year}-${String(eFlex.month).padStart(2, '0')}`
      )
    }
  }
}

// ── B. MCP 输出 vs 引擎直调 ────────────────────────────────────
async function engineConsistency () {
  console.log('\n--- B. MCP 输出 vs 直接调引擎 ---')
  const cases = [
    { p: '吉林', g: '男', b: '1976-02', w: '1996-01', idx: 1.0 },
    { p: '吉林', g: '男', b: '1976-02', w: '1996-01', idx: 0.6, city: '长春' },
    { p: '广东', g: '女工人', b: '1984-11', w: '2005-03', idx: 0.6 },
    { p: '北京', g: '女干部', b: '1979-05', w: '2000-07', idx: 1.5 },
    { p: '山东', g: '男', b: '1968-11', w: '1990-09', idx: 2.0 }
  ]
  for (const c of cases) {
    const args = {
      province: c.p, gender_type: c.g, birth_date: c.b, work_start_date: c.w,
      average_index: c.idx
    }
    if (c.city) args.city = c.city
    const m = await CALC.run(args)

    // 直接调引擎（与 tools.js 完全相同的 input 构造）
    const pk = A.resolveProvince(c.p)
    const gt = A.resolveGenderType(c.g)
    const bd = A.parseMonth(c.b)
    const wd = A.parseMonth(c.w)
    const input = {
      gender: A.genderOf(gt), genderType: gt,
      birthYear: bd.year, birthMonth: bd.month,
      workYear: wd.year, workMonth: wd.month,
      avgIndex: c.idx, personalAccInput: 0,
      cityType: A.resolveCity(pk, c.city)
    }
    const e = engine.calculate(A.getConfig(pk), input)
    const mt = m.data.total
    const et = Math.round(e.legal.total * 100) / 100
    check(`B [${c.p}${c.city ? '/' + c.city : ''}/${c.g}] MCP=引擎`, Math.abs(mt - et) < 0.01, `MCP=${mt} 引擎=${et}`)
  }
}

// ── C. 案例对账：与 cases/ 期望值差多少（口径差异量化）─────────
function caseReconcile () {
  console.log('\n--- C. 与官方案例 expected 的对账（口径差异）---')
  const dirs = fs.readdirSync(path.resolve(__dirname, '..', 'cases'))
    .filter((d) => fs.statSync(path.resolve(__dirname, '..', 'cases', d)).isDirectory())
  let total = 0
  const rows = []
  for (const d of dirs) {
    const p = path.resolve(__dirname, '..', 'cases', d)
    const fs2 = fs.readdirSync(p).filter((f) => f.endsWith('.json'))
    for (const f of fs2.slice(0, 1)) { // 每省取 1 个案例，控制规模
      let c
      try { c = JSON.parse(fs.readFileSync(path.resolve(p, f), 'utf8')) } catch (e) { continue }
      if (!c || !c.expected || !c.expected.total) continue
      const pk = A.resolveProvince(c.province) || c.province
      if (!A.getConfig(pk)) continue
      const gt = A.resolveGenderType(c.gender === 'female' ? '女干部' : '男') || c.gender
      const birth = c.birth_year + '-' + String(c.birth_month).padStart(2, '0')
      const work = c.work_year + '-' + String(c.work_month).padStart(2, '0')
      let m, err = null
      try {
        m = CALC.runSync // 不存在则用 await
      } catch (e) { /* noop */ }
      rows.push({ province: c.province, city: c.city, birth, work, idx: c.avg_index, expected: c.expected.total, gt, pk, acc: c.personal_account })
      total++
    }
  }
  return rows
}

async function runCaseReconcile (rows) {
  console.log('   （MCP 只收用户说得出的参数：省份/性别/出生/参工/指数/账户额；')
  console.log('     案例里的 base_number、sight_years 属核定表口径，MCP 不收，故必然有差）\n')
  let n = 0
  let sumAbs = 0
  let sumPct = 0
  const big = []
  for (const r of rows) {
    let out
    try {
      out = await CALC.run({
        province: r.pk, gender_type: r.gt, birth_date: r.birth, work_start_date: r.work,
        average_index: r.idx, personal_account: r.acc
      })
    } catch (e) { console.log('   ⚠️ ' + r.province + ' 运行失败: ' + e.message); continue }
    if (out.isError) { console.log('   ⚠️ ' + r.province + ': ' + out.text.slice(0, 60)); continue }
    const got = out.data.total
    const exp = r.expected
    const diff = got - exp
    const pct = Math.abs(diff / exp) * 100
    n++
    sumAbs += Math.abs(diff)
    sumPct += pct
    if (pct > 20) big.push(`${r.province}${r.city ? '/' + r.city : ''} 期望${exp} 实得${got} 差${diff.toFixed(2)} (${pct.toFixed(1)}%)`)
    console.log(`   ${r.province.padEnd(6)} 期望 ${String(exp).padStart(8)} | MCP ${String(got).padStart(8)} | 差 ${diff.toFixed(2).padStart(9)} (${pct.toFixed(1)}%)`)
  }
  if (n) {
    console.log(`\n   样本 ${n} 个：平均绝对偏差 ${(sumAbs / n).toFixed(2)} 元，平均相对偏差 ${(sumPct / n).toFixed(1)}%`)
    if (big.length) { console.log('   偏差 >20% 的：'); big.forEach((b) => console.log('     - ' + b)) }
  }
}

async function main () {
  // 先确认服务在跑（A 组其实直接调 run()，不需要服务；B/C 也不需要）
  await innerConsistency()
  await engineConsistency()
  const rows = caseReconcile()
  await runCaseReconcile(rows)

  console.log('\n===== 汇总 =====')
  console.log('通过 ' + ok.length + ' 项，失败 ' + bad.length + ' 项')
  if (bad.length) { console.log('失败项：'); bad.forEach((b) => console.log('  - ' + b)) }
}

main().catch((e) => console.log('💥', e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n') : e))
