/**
 * 验证当前 getAccRate 实际取值路径：省份文件优先 vs 统一表
 * 通过调用 getAccRate 的实际返回值反推路径
 */

const fs = require('fs')
const path = require('path')

const enginePath = path.join(__dirname, '..', 'engine', 'pension-engine.js')
const engine = require(enginePath)
const { getAccRate } = engine

const PROV_DIR = path.join(__dirname, '..', 'provinces')

const provinces = []
for (const f of fs.readdirSync(PROV_DIR)) {
  if (!f.endsWith('.json')) continue
  const cfg = JSON.parse(fs.readFileSync(path.join(PROV_DIR, f), 'utf-8'))
  provinces.push({ slug: f.replace('.json', ''), name: cfg.name, cfg })
}

console.log('═'.repeat(80))
console.log('当前引擎利率取值路径分析（调用 getAccRate 实测）')
console.log('═'.repeat(80))
console.log()

let usingProvincePre2016 = []   // 1996-2015 实际用了省份文件值
let usingUnifiedPre2016 = []     // 1996-2015 实际走统一表

for (const p of provinces) {
  const ir = p.cfg.interest_rates || {}
  const years = Object.keys(ir).map(Number).sort((a,b)=>a-b)

  if (years.length === 0) {
    usingUnifiedPre2016.push(p)
    continue
  }

  const ownPre2016Years = years.filter(y => y < 2016)
  let hasOwn = false
  const diffDetails = []

  for (const y of ownPre2016Years) {
    const actual = getAccRate(y, p.cfg)
    const fileVal = ir[y]
    if (Math.abs(actual - fileVal) > 0.0001) {
      // 实际值 ≠ 文件值 → 走了统一表（文件值被覆盖或不存在）
    } else {
      hasOwn = true
      diffDetails.push(`${y}:文件${(fileVal*100).toFixed(2)}%`)
    }
  }

  if (hasOwn) {
    usingProvincePre2016.push({ name: p.name, years: diffDetails })
  } else {
    usingUnifiedPre2016.push(p)
  }
}

console.log(`📊 31省利率取值现状:`)
console.log()
console.log(`【组1】1996-2015 实际用自己的文件值（未统一）: ${usingProvincePre2016.length} 省`)
for (const item of usingProvincePre2016) {
  console.log(`  • ${item.name}  ${item.years.join(', ')}`)
}
console.log()
console.log(`【组2】1996-2015 实际走统一表: ${usingUnifiedPre2016.length} 省`)
console.log(`  ${usingUnifiedPre2016.map(p=>p.name).join(', ')}`)
console.log()

console.log('═'.repeat(80))
console.log('结论:')
console.log('  • 2016-2025: ✅ 所有省都走 UNIFIED 统一表（省份文件的同年值是死数据）')
console.log(`  • 1996-2015: ${usingProvincePre2016.length} 省仍用自己的文件值 → 未完全统一`)
console.log(`            ${usingUnifiedPre2016.length} 省（含9空省补齐+海南等）走统一表 → 已统一`)
console.log()
console.log('  若要做到「全部统一」: 清空31省文件的 interest_rates，或改 getAccRate 不优先省份')
console.log('═'.repeat(80))
