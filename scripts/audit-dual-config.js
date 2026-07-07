// 审计脚本 v2：对齐固定年份比较 线上JS配置 vs verify用的JSON配置
// 用法: node scripts/audit-dual-config.js
const fs = require('fs')
const path = require('path')
const ROOT = process.cwd()
const JS_DIR = path.join(ROOT, 'cloudfunctions/calculate/provinces')
const JSON_DIR = path.join(ROOT, 'provinces')

function getJsCfg(f) {
  const p = path.join(JS_DIR, f)
  delete require.cache[require.resolve(p)]
  const m = require(p)
  if (typeof m === 'function') return m()
  if (m && m.getEngineConfig) return m.getEngineConfig()
  if (m && m.default && m.default.getEngineConfig) return m.default.getEngineConfig()
  return null
}
function get(cfg, year) {
  if (!cfg) return null
  const v = cfg[String(year)]
  return v == null ? null : Number(v)
}
function provBase(cfg) {
  const br = cfg && cfg.base_rates
  return br ? (br.prov || br) : null
}

const jsFiles = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js'))
const years = [2024, 2025]
console.log(['省', 'Y', 'brJs', 'brJson', 'brDiff%', 'avgJs(月)', 'avgJson(adj)', 'avgDiff%'].join('\t'))
let problems = []
for (const f of jsFiles) {
  const name = f.replace('.js', '')
  const js = getJsCfg(f)
  const jp = path.join(JSON_DIR, name + '.json')
  if (!js || !fs.existsSync(jp)) { console.log(name, 'MISSING'); continue }
  const j = JSON.parse(fs.readFileSync(jp, 'utf8'))
  for (const y of years) {
    const brJs = get(provBase(js), y), brJson = get(provBase(j), y)
    const aJs = get(js.avg_salary_history, y), aJson = get(j.avg_salary_history, y)
    if (brJs == null && brJson == null && aJs == null && aJson == null) continue
    const brDiff = (brJs && brJson) ? Math.abs(brJs - brJson) / brJs * 100 : null
    // 自动识别单位：json 若为元/年（≈js 的 12 倍）则 ÷12 对齐到元/月；否则 json 已是元/月直接使用
    let aJsonMonth = aJson != null ? aJson : null
    if (aJson != null && aJs != null && aJson > aJs * 3) aJsonMonth = aJson / 12
    const aDiff = (aJs && aJsonMonth != null) ? Math.abs(aJs - aJsonMonth) / aJs * 100 : null
    const brDiffS = brDiff == null ? '-' : brDiff.toFixed(1)
    const aDiffS = aDiff == null ? '-' : aDiff.toFixed(1)
    if ((brDiff != null && brDiff > 1) || (aDiff != null && aDiff > 5)) {
      problems.push(name + '@' + y + ' brDiff=' + brDiffS + '% avgDiff=' + aDiffS + '%')
    }
    console.log([name, y, brJs, brJson, brDiffS, aJs, aJsonMonth == null ? '-' : aJsonMonth.toFixed(1), aDiffS].join('\t'))
  }
}
console.log('\n=== 对齐年份后的重大分歧 (brDiff>1% 或 avgDiff>5%) ===')
console.log(problems.length ? problems.join('\n') : '无')
