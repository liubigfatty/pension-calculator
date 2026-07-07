#!/usr/bin/env node
/**
 * build-web.js — 生成网页版养老金计算器所需的浏览器端资源
 *
 * 产出（写入 web/）：
 *   1. engine.js          引擎（engine/pension-engine.js）的浏览器全局 shim 版本
 *                          → 暴露 window.PensionEngine（与云函数内引擎逐字一致）
 *   2. provinces-bundle.js 31 省配置（cloudfunctions/calculate/provinces/*.js 的 getEngineConfig() 输出）
 *                          → 暴露 window.PROVINCE_CONFIGS（含带函数的闭包，如 TRANS_COEF.get）
 *
 * 设计要点：
 *   - 引擎与省份文件均为 CommonJS（module.exports），浏览器无 module。
 *     用 IIFE + `var module={exports:{}}` 垫片包裹，末尾挂到 window，避免改源码。
 *   - 省份 getEngineConfig() 返回的对象可能含函数（过渡系数 .get、sz_modules），
 *     这些闭包随配置对象一起被保留，calculate() 调用时仍可用。
 *   - 每次改了 engine 或 provinces 后重跑本脚本即可同步网页端与线上。
 *
 * 用法：node scripts/build-web.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const ENGINE_SRC = path.join(ROOT, 'engine', 'pension-engine.js')
const PROV_DIR = path.join(ROOT, 'cloudfunctions', 'calculate', 'provinces')
const OUT_DIR = path.join(ROOT, 'web')

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

// ---------- 1. 引擎浏览器版 ----------
const engineSrc = fs.readFileSync(ENGINE_SRC, 'utf8')
const engineOut =
  '// AUTO-GENERATED from engine/pension-engine.js — 请勿手改，改源码后重跑 scripts/build-web.js\n' +
  '(function () {\n' +
  '  var module = { exports: {} };\n' +
  '  var exports = module.exports;\n' +
  engineSrc + '\n' +
  '  window.PensionEngine = module.exports;\n' +
  '})();\n'
fs.writeFileSync(path.join(OUT_DIR, 'engine.js'), engineOut)
console.log('✅ web/engine.js 已生成 (' + engineOut.length + ' bytes)')

// ---------- 2. 省份配置 bundle ----------
const files = fs.readdirSync(PROV_DIR)
  .filter(f => f.endsWith('.js') && f !== 'index.js' && !f.startsWith('_'))
  .sort()

let bundle = '// AUTO-GENERATED — 请勿手改，改省份配置后重跑 scripts/build-web.js\n'
bundle += 'window.PROVINCE_CONFIGS = {};\n'

let count = 0
for (const f of files) {
  const name = f.replace(/\.js$/, '')
  const src = fs.readFileSync(path.join(PROV_DIR, f), 'utf8')
  // 每个省份独立 IIFE，避免顶层 const 互相污染
  bundle +=
    '(function () {\n' +
    '  var module = { exports: {} };\n' +
    '  var exports = module.exports;\n' +
    src + '\n' +
    '  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();\n' +
    '  window.PROVINCE_CONFIGS[' + JSON.stringify(name) + '] = cfg;\n' +
    '})();\n'
  count++
}
fs.writeFileSync(path.join(OUT_DIR, 'provinces-bundle.js'), bundle)
console.log('✅ web/provinces-bundle.js 已生成（' + count + ' 个省份）')
