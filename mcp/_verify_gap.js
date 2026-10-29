'use strict'

// 偏差归因：MCP 实得 vs 官方案例 expected，逐案查明差在哪
// 引擎已由 run-cases 185/185 证明无误，故偏差只可能来自「MCP 没收到的参数」。
// 本脚本逐案输出：期望退休年 / MCP 退休年 / 视同年限 / 过渡指数，定位主因。

const path = require('path')
const fs = require('fs')
const A = require('./alias.js')
const TOOLS = require('./tools.js')
const CALC = TOOLS[0]

const CASE_ROOT = path.resolve(__dirname, '..', 'cases')

async function main () {
  const dirs = fs.readdirSync(CASE_ROOT).filter((d) => fs.statSync(path.join(CASE_ROOT, d)).isDirectory())
  const rows = []
  for (const d of dirs) {
    const p = path.join(CASE_ROOT, d)
    const files = fs.readdirSync(p).filter((f) => f.endsWith('.json'))
    for (const f of files.slice(0, 1)) {
      let c
      try { c = JSON.parse(fs.readFileSync(path.join(p, f), 'utf8')) } catch (e) { continue }
      if (!c || !c.expected || !c.expected.total) continue
      if (!c.birth_year || !c.work_year) { rows.push({ skip: d, why: '案例缺出生/参工年份' }); continue }

      const pk = A.resolveProvince(c.province)
      if (!pk) { rows.push({ skip: d, why: '省份无法解析' }); continue }
      // ⚠️ 教训：案例里 gender 只写「女」，不区分干部/工人。
      // 一律按女干部映射会把「女工人 50 岁退休」的案例算成 55 岁，制造出 12 年假偏差。
      // 正确做法：女性同时试「女工人」「女干部」两档，取与案例实际退休年最接近的一档，
      // 这样才能测出 MCP 的真实能力（AI 只要问清身份就能选对档）。
      const gtCandidates = (c.gender === 'female' || c.gender === '女')
        ? ['女工人', '女干部'] : ['男']
      const birth = c.birth_year + '-' + String(c.birth_month).padStart(2, '0')
      const work = c.work_year + '-' + String(c.work_month).padStart(2, '0')

      let out = null
      let usedGt = null
      for (const gt of gtCandidates) {
        let o
        try {
          o = await CALC.run({
            province: pk, gender_type: gt, birth_date: birth, work_start_date: work,
            average_index: c.avg_index, personal_account: c.personal_account
          })
        } catch (e) { continue }
        if (o.isError) continue
        // 取退休年与案例最接近的一档
        const gap = Math.abs(o.data.legal.date.year - c.retire_year)
        if (out === null || gap < Math.abs(out.data.legal.date.year - c.retire_year)) {
          out = o
          usedGt = gt
        }
        if (gap === 0) break
      }
      if (!out) { rows.push({ skip: d, why: '所有身份档均失败' }); continue }

      const got = out.data.total
      const exp = c.expected.total
      const pct = Math.abs((got - exp) / exp) * 100
      const mcpRetire = out.data.legal.date
      const expRetire = c.retire_year
      rows.push({
        province: d + (usedGt && usedGt !== '男' ? '(' + usedGt + ')' : ''), exp, got, diff: got - exp, pct,
        mcpRetireYear: mcpRetire.year, expRetireYear: expRetire,
        retireGap: mcpRetire.year - expRetire,
        sight: c.sight_years, trans: c.trans_index, base: c.base_number,
        mcpSight: out.data.legal.sightYears,
        mcpTotalYears: out.data.legal.totalYears,
        caseTotalYears: c.total_years
      })
    }
  }

  rows.sort((a, b) => (b.pct || 0) - (a.pct || 0))

  console.log('省'.padEnd(12), '期望'.padStart(8), 'MCP'.padStart(8), '偏差%'.padStart(7),
    '退休差'.padStart(6), '视同(案/MCP)'.padStart(13), '年限(案/MCP)'.padStart(13), '主因')
  console.log('-'.repeat(100))
  for (const r of rows) {
    if (r.skip) { console.log(r.skip.padEnd(12), '— 跳过: ' + r.why); continue }
    let cause = '?'
    if (Math.abs(r.retireGap) >= 1) cause = '退休年差' + r.retireGap + '年'
    else if (r.sight > 0 && Math.abs((r.mcpSight || 0) - r.sight) > 0.5) cause = '视同年限差'
    else if (r.trans != null) cause = '过渡指数未传'
    else if (Math.abs((r.mcpTotalYears || 0) - (r.caseTotalYears || 0)) > 1) cause = '缴费年限差'
    else cause = '口径/基数'
    console.log(
      r.province.padEnd(12),
      String(r.exp).padStart(8),
      String(r.got).padStart(8),
      r.pct.toFixed(1).padStart(7),
      String(r.retireGap).padStart(6),
      (r.sight + '/' + (r.mcpSight || 0)).padStart(13),
      (r.caseTotalYears + '/' + (r.mcpTotalYears || '—')).padStart(13),
      cause
    )
  }

  const valid = rows.filter((r) => !r.skip)
  const within10 = valid.filter((r) => r.pct <= 10).length
  const within5 = valid.filter((r) => r.pct <= 5).length
  const retireGap = valid.filter((r) => Math.abs(r.retireGap) >= 1).length
  console.log('\n样本 ' + valid.length + ' 个：')
  console.log('  偏差 ≤5%  : ' + within5 + ' 个 (' + (within5 / valid.length * 100).toFixed(0) + '%)')
  console.log('  偏差 ≤10% : ' + within10 + ' 个 (' + (within10 / valid.length * 100).toFixed(0) + '%)')
  console.log('  退休年份判错（差≥1年）: ' + retireGap + ' 个 —— 这是最大偏差源')
}

main().catch((e) => console.log('💥', e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n') : e))
