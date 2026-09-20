// 验证云端 calcIndex 副本：与本地引擎逐省比对
// 重点：社平数组右移后，D1 分母取数索引是否同步 +1（含陕西/西藏「当年社平」口径）
const path = require('path')
const ROOT = path.join(__dirname, '..')

const cloudFn = require(path.join(ROOT, '_verify_dl/calcIndex/index.js'))
const { calculateIndex, PROVINCE_RULES } = require(path.join(ROOT, 'index-engine/calcIndex.js'))
const PROVINCES = require(path.join(ROOT, 'index-mini/cloudfunctions/calcIndex/provinces-data.js'))

let pass = 0, fail = 0
const errs = []

// 逐年明细：2020—2024 各缴 12 个月，基数按省社平的 60%
function buildYearly(provinceConfig, years) {
  const h = provinceConfig.avg_salary_history || {}
  return years.map(y => {
    const s = h[y] || h[y - 1] || 5000
    return { year: y, months: 12, baseAvg: Math.round(s * 0.6 * 100) / 100 }
  })
}

const CASES = [
  { code: 'shandong', name: '山东', deemed: 0, note: '默认（上年社平）' },
  { code: 'shaanxi', name: '陕西', deemed: 0, note: 'D1=当年社平（索引+1）' },
  { code: 'xizang', name: '西藏', deemed: 0, note: 'D1=当年社平' },
  { code: 'guangdong', name: '广东', deemed: 0, note: '视同指数查表' },
  { code: 'jilin', name: '吉林', deemed: 8, note: '视同年不进分母' },
  { code: 'zhejiang', name: '浙江', deemed: 5, note: '替代指数' },
  { code: 'beijing', name: '北京', deemed: 6, note: '视同年进分母' },
]

async function main() {
  console.log('省份   口径                     云端avgIndex   本地avgIndex   差     云端transIndex')
  console.log('-'.repeat(88))

  for (const c of CASES) {
    const cfg = PROVINCES[c.code]
    if (!cfg) { errs.push(`${c.name} 云端省份数据缺失`); fail++; continue }
    const years = [2020, 2021, 2022, 2023, 2024]
    const yearlyData = buildYearly(cfg, years)
    const event = {
      province: c.code,
      startYear: years[0], startMonth: 1,
      yearlyData,
      deemedYears: c.deemed
    }

    let cr
    try {
      cr = await cloudFn.main(event)
    } catch (e) {
      errs.push(`${c.name} 云端抛错：${e.message}`); fail++; continue
    }
    if (!cr || cr.success === false) {
      errs.push(`${c.name} 云端返回失败：${cr && cr.error}`); fail++; continue
    }

    const lr = calculateIndex({
      provinceCode: c.code,
      provinceConfig: cfg,
      contribution: yearlyData,
      deemedYears: c.deemed,
      granularity: 'A'
    })

    const ca = (cr.data && cr.data.forward) ? cr.data.forward.avgIndex : cr.avgIndex
    const la = lr.avgIndex
    const diff = Math.abs(ca - la)
    const ok = diff < 0.0001
    if (ok) pass++
    else { fail++; errs.push(`${c.name} avgIndex 云端 ${ca} vs 本地 ${la}`) }

    console.log([
      c.name.padEnd(6),
      c.note.padEnd(24),
      Number(ca).toFixed(4).padStart(11),
      Number(la).toFixed(4).padStart(13),
      diff.toFixed(6).padStart(9),
      String((cr.data && cr.data.forward && cr.data.forward.transIndex != null) ? Number(cr.data.forward.transIndex).toFixed(4) : '-').padStart(14)
    ].join(' '))
  }

  // 分母口径专项：陕西应取当年社平（右移后索引 +1）
  console.log('\n=== 分母取数索引专项（数组右移联动）===')
  const sxCfg = PROVINCES.shaanxi
  const h = sxCfg.avg_salary_history || {}
  const { getDenominator } = require(path.join(ROOT, 'index-engine/calcIndex.js'))
  const rule = PROVINCE_RULES.shaanxi
  const d2024 = getDenominator(rule, h, 2024)
  const want = h[2025]
  const okIdx = Math.abs(d2024 - want) < 0.01
  console.log(`  陕西 D1=当年社平：getDenominator(2024) = ${d2024}，应为 hist[2025] = ${want}  ${okIdx ? '✅' : '❌'}`)
  if (okIdx) pass++
  else { fail++; errs.push(`陕西分母索引未 +1：${d2024} != ${want}`) }

  const sdRule = PROVINCE_RULES.shandong
  const sdH = PROVINCES.shandong.avg_salary_history || {}
  const sdD = getDenominator(sdRule, sdH, 2025)
  const sdWant = sdH[2025]
  const okIdx2 = Math.abs(sdD - sdWant) < 0.01
  console.log(`  山东 D1=上年社平：getDenominator(2025) = ${sdD}，应为 hist[2025] = ${sdWant}  ${okIdx2 ? '✅' : '❌'}`)
  if (okIdx2) pass++
  else { fail++; errs.push(`山东分母索引异常：${sdD} != ${sdWant}`) }

  console.log('\n' + '='.repeat(60))
  console.log(`结果：${pass} 通过 / ${fail} 失败`)
  errs.forEach(e => console.log('  ❌ ' + e))
  console.log('='.repeat(60))
}

main().catch(e => { console.error(e); process.exit(1) })
