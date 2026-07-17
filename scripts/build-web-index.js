/**
 * 生成 web-index/ 的浏览器包（本人平均缴费指数计算器 · 网站版）
 *
 *   1. calc-index.js         — index-engine/calcIndex.js 的浏览器全局 shim (window.CalcIndex)
 *   2. provinces-index-data.js — index-mini 的 provinces-data.js 浏览器 shim (window.INDEX_PROVINCES)
 *
 * 说明：
 *   - index-mini 的云函数用 calcIndex 引擎 + provinces-data 社平数据包（provinces-data.js
 *     由真相源 cloudfunctions/calculate/provinces/ 经 scripts/_gen_province_data.js 生成），
 *     本脚本把该小程序包包装成浏览器可用的全局变量，使网站版与小程序版使用同一份已生成数据。
 *   - 注意：网页版数据源是「小程序包」而非真相源本身。每次改了 index-engine/calcIndex.js
 *     或真相源后，须先跑 _gen_province_data.js 再跑本脚本，顺序反了网页版会滞后。
 *
 * 用法：node scripts/build-web-index.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const ENGINE_SRC = path.join(ROOT, 'index-engine', 'calcIndex.js')
const DATA_SRC = path.join(ROOT, 'index-mini', 'cloudfunctions', 'calcIndex', 'provinces-data.js')
const OUT_DIR = path.join(ROOT, 'web-index')

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

/**
 * 把 Node 风格 `module.exports = {...}` 的文件包装成浏览器 IIFE，
 * 返回值挂到指定 window 全局变量。引擎为纯函数（无 require/process），可直接在浏览器运行。
 */
function wrapToWindow(src, globalName) {
  return (
    `// AUTO-GENERATED from source — 请勿手改，改源码后重跑 scripts/build-web-index.js\n` +
    `window.${globalName} = (function () {\n` +
    `  const module = { exports: {} };\n` +
    src + '\n' +
    `  return module.exports;\n` +
    `})();\n`
  )
}

// ── 引擎 ──
const engineSrc = fs.readFileSync(ENGINE_SRC, 'utf8')
const engineOut = wrapToWindow(engineSrc, 'CalcIndex')
fs.writeFileSync(path.join(OUT_DIR, 'calc-index.js'), engineOut)
console.log('✅ web-index/calc-index.js 已生成 (' + engineOut.length + ' bytes)')

// ── 省份社平数据包 ──
const dataSrc = fs.readFileSync(DATA_SRC, 'utf8')
const dataOut = wrapToWindow(dataSrc, 'INDEX_PROVINCES')
fs.writeFileSync(path.join(OUT_DIR, 'provinces-index-data.js'), dataOut)

// 统计省份数做自检
const provinceCount = (dataSrc.match(/"avg_salary_history"/g) || []).length
console.log('✅ web-index/provinces-index-data.js 已生成（' + provinceCount + ' 个省份）')

if (provinceCount !== 31) {
  console.error('❌ 省份数不为 31，请检查 provinces-data.js')
  process.exit(1)
}
console.log('✅ 构建完成')
