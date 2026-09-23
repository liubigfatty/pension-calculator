// 扫描根目录 provinces/*.json 里的未来年份写死值（tests/ 与部分构建脚本使用这份配置）
const fs = require('fs')
const path = require('path')
const ROOT = path.resolve(__dirname, '..')
const DIR = path.join(ROOT, 'provinces')

const CUR = 2025 // 当前已完整公布的计发基数年份
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort()
let total = 0
for (const f of files) {
  const raw = fs.readFileSync(path.join(DIR, f), 'utf8')
  let cfg
  try { cfg = JSON.parse(raw) } catch (e) { console.log('❌ 解析失败 ' + f + ': ' + e.message); continue }
  const hits = []
  const scan = (obj, label) => {
    if (!obj || typeof obj !== 'object') return
    for (const [k, v] of Object.entries(obj)) {
      if (/^(20[2-9]\d)$/.test(k) && Number(k) > CUR && typeof v === 'number') {
        hits.push(`${label}[${k}]=${v}`)
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        scan(v, label + (label ? '.' : '') + k)
      }
    }
  }
  scan(cfg.base_rates, 'base_rates')
  scan(cfg.avg_salary_history, 'avg_salary_history')
  if (hits.length) { console.log(`${f.padEnd(16)} ${hits.join('  ')}`); total += hits.length }
}
console.log(`\n合计：${total} 处未来年份写死值（基准年 ${CUR}）`)
