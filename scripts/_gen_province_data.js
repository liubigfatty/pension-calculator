const fs = require('fs')
const path = require('path')

const SRC_DIR = path.join(__dirname, '..', 'cloudfunctions', 'calculate', 'provinces')
const OUT_FILE = path.join(__dirname, '..', 'index-mini', 'cloudfunctions', 'calcIndex', 'provinces-data.js')

// 未发布年份外推：与引擎 pension-engine.js getBase() 口径一致
//   - 预发年(=数据最大年+1)：返回上年原值 flat，不上浮
//   - 更远期：按 GROWTH_RATE 复利外推
// 目的：小程序 calcIndex 不会自己外推，必须保证数据包含最新可用年份分母。
// 真相源 AVG_SALARY_HISTORY 仍保持“未发布年份不写固定值”，此处仅在派生数据包补全。
const GROWTH_RATE = 0.02
function withExtrapolation(avgIn) {
  const avg = JSON.parse(JSON.stringify(avgIn)) // 深拷贝，避免污染真相源 cfg 对象
  const years = Object.keys(avg).map(Number).filter(y => !isNaN(y)).sort((a, b) => a - b)
  if (years.length === 0) return avg
  const maxY = years[years.length - 1]
  const upTo = Math.max(2026, maxY + 1) // 至少补齐到 2026（覆盖用户填报的近年缴费年）
  let lastVal = avg[maxY]
  for (let y = maxY + 1; y <= upTo; y++) {
    if (y === maxY + 1) {
      avg[y] = +Number(lastVal).toFixed(2) // 预发年：flat（=上年原值）
    } else {
      lastVal = +(Number(lastVal) * (1 + GROWTH_RATE)).toFixed(2)
      avg[y] = lastVal
    }
  }
  return avg
}

const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.js'))
const out = {}
const missing = []

for (const f of files) {
  const slug = f.replace(/\.js$/, '')
  try {
    delete require.cache[require.resolve(path.join(SRC_DIR, f))]
    const mod = require(path.join(SRC_DIR, f))
    const cfg = mod.getEngineConfig ? mod.getEngineConfig() : null
    if (!cfg) { missing.push(slug + ':无getEngineConfig'); continue }
    const avgRaw = cfg.avg_salary_history
    if (!avgRaw || Object.keys(avgRaw).length === 0) { missing.push(slug + ':空社平'); continue }
    out[slug] = {
      name: cfg.name || slug,
      avg_salary_history: withExtrapolation(avgRaw)
    }
  } catch (e) {
    missing.push(slug + ':' + e.message)
  }
}

const header = '/*\n' +
  ' * 自动生成 - 31省社平工资数据包 (元/月)\n' +
  ' * 来源: cloudfunctions/calculate/provinces/*.js getEngineConfig().avg_salary_history\n' +
  ' * 生成时间: ' + new Date().toISOString().slice(0, 10) + '\n' +
  ' * 用途: 缴费指数小程序 calcIndex 云函数\n' +
  ' * 说明: 未发布年份(2025/2026)按引擎 getBase 外推口径补全(预发年flat/之后2%复利)，保证小程序有分母\n' +
  ' */\n\n' +
  'module.exports = ' + JSON.stringify(out, null, 2) + '\n'

fs.writeFileSync(OUT_FILE, header)
console.log('✅ 生成 ' + Object.keys(out).length + ' 省数据 -> ' + OUT_FILE)
if (missing.length) {
  console.log('⚠️ 缺失/异常: ' + missing.join(', '))
} else {
  console.log('✅ 31省社平数据全部齐全')
}
