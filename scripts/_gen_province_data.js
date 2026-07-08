const fs = require('fs')
const path = require('path')

const SRC_DIR = path.join(__dirname, '..', 'cloudfunctions', 'calculate', 'provinces')
const OUT_FILE = path.join(__dirname, '..', 'index-mini', 'cloudfunctions', 'calcIndex', 'provinces-data.js')

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
    const avg = cfg.avg_salary_history
    if (!avg || Object.keys(avg).length === 0) { missing.push(slug + ':空社平'); continue }
    out[slug] = {
      name: cfg.name || slug,
      avg_salary_history: avg
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
  ' */\n\n' +
  'module.exports = ' + JSON.stringify(out, null, 2) + '\n'

fs.writeFileSync(OUT_FILE, header)
console.log('✅ 生成 ' + Object.keys(out).length + ' 省数据 -> ' + OUT_FILE)
if (missing.length) {
  console.log('⚠️ 缺失/异常: ' + missing.join(', '))
} else {
  console.log('✅ 31省社平数据全部齐全')
}
