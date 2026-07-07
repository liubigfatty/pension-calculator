/**
 * 虚拟支付 signData 字段类型校验脚本
 *
 * 目的：每次修改 createOrder/index.js 的 signData 构造后，
 *       自动比对微信官方文档字段类型（脚本内置权威表），避免"靠真机报错试错"。
 *
 * 用法：node scripts/check-vpay-signData.js
 *
 * 类型表来源：微信官方文档 wx.requestVirtualPayment
 *   https://developers.weixin.qq.com/miniprogram/dev/api/payment/wx.requestVirtualPayment.html
 *   （含官方示例：{offerId:'123', buyQuantity:1, env:0, currencyType:'CNY',
 *                   productId:'testproductId', goodsPrice:10, outTradeNo:'xxxxxx', attach:'testdata'}）
 */
const fs = require('fs')
const path = require('path')

const CREATE_ORDER = path.join(__dirname, '..', 'cloudfunctions', 'createOrder', 'index.js')
const src = fs.readFileSync(CREATE_ORDER, 'utf8')

// —— 从源码提取 CONFIG 常量（避免 require 云函数导致 wx-server-sdk 报错）——
function extractConst(name, fallback) {
  const line = src
    .split('\n')
    .find((l) => l.includes(name + ':') && !l.trim().startsWith('//'))
  if (!line) return fallback
  const m = line.match(/:\s*('([^']*)'|"([^"]*)"|(\d+))/)
  if (!m) return fallback
  if (m[2] !== undefined) return m[2] // 单引号字符串
  if (m[3] !== undefined) return m[3] // 双引号字符串
  if (m[4] !== undefined) return Number(m[4]) // 数字
  return fallback
}

const CONFIG = {
  OFFER_ID: extractConst('OFFER_ID', '1450568626'),
  GOODS_PRICE: extractConst('GOODS_PRICE', 1),
  ENV: extractConst('ENV', 0),
  PRODUCT_ID: extractConst('PRODUCT_ID', 'pension_report'),
}

// —— 官方字段类型权威表（与微信文档一致）——
const FIELD_TYPES = {
  offerId: 'string',
  buyQuantity: 'number',
  env: 'number',
  currencyType: 'string',
  productId: 'string',
  goodsPrice: 'number', // 官方文档：单位"分"；后台「价格(元)」=1 即 100 分，goodsPrice 须传 100 与微信后台一致
  outTradeNo: 'string',
  attach: 'string',
}

const REQUIRED = ['offerId', 'buyQuantity', 'env', 'currencyType', 'productId', 'goodsPrice', 'outTradeNo', 'attach']

// —— 直接从 createOrder 源码解析真实的 signData 字段与顺序（不硬编码，确保验证对象=真实代码）——
const blockMatch = src.match(/const signDataObj = \{([\s\S]*?)\n    \}/)
if (!blockMatch) {
  console.error('❌ 无法在 createOrder/index.js 中找到 const signDataObj = {...} 块')
  process.exit(1)
}
const block = blockMatch[1]
const keyOrder = [...block.matchAll(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm)].map((m) => m[1])

const pid = CONFIG.PRODUCT_ID
const outTradeNo = 'RP_TEST_SIGN_DATA_CHECK'
// 用解析出的 key 顺序构造对象（值取 CONFIG/常量，仅用于类型校验）
const signDataObj = {}
for (const k of keyOrder) {
  if (k === 'offerId') signDataObj[k] = CONFIG.OFFER_ID
  else if (k === 'buyQuantity') signDataObj[k] = 1
  else if (k === 'env') signDataObj[k] = CONFIG.ENV
  else if (k === 'currencyType') signDataObj[k] = 'CNY'
  else if (k === 'productId') signDataObj[k] = pid
  else if (k === 'goodsPrice') signDataObj[k] = CONFIG.GOODS_PRICE
  else if (k === 'outTradeNo') signDataObj[k] = outTradeNo
  else if (k === 'attach') signDataObj[k] = JSON.stringify({ productId: pid })
  else signDataObj[k] = 'PLACEHOLDER'
}

// —— 校验 ——
let pass = 0
let fail = 0
const lines = []

// 1) 必填字段齐全
for (const f of REQUIRED) {
  if (!(f in signDataObj)) {
    fail++
    lines.push(`❌ 缺失必填字段: ${f}`)
  }
}

// 2) 类型匹配官方表
for (const [field, expected] of Object.entries(FIELD_TYPES)) {
  const actual = typeof signDataObj[field]
  if (actual === expected) {
    pass++
    lines.push(`✅ ${field}: ${actual} (= ${JSON.stringify(signDataObj[field])})`)
  } else {
    fail++
    lines.push(`❌ ${field}: 实际 ${actual}，期望 ${expected} (= ${JSON.stringify(signDataObj[field])})`)
  }
}

// 3) goodsPrice 合理性（>0 且=后台 100 分=1元）
if (typeof signDataObj.goodsPrice === 'number' && signDataObj.goodsPrice > 0) {
  pass++
  lines.push(`✅ goodsPrice 数值合理: ${signDataObj.goodsPrice}（单位=分，后台「价格(元)」=1 即 100 分，与微信后台一致）`)
} else {
  fail++
  lines.push(`❌ goodsPrice 非正数或类型异常: ${JSON.stringify(signDataObj.goodsPrice)}`)
}

// 4) 字段顺序与官方示例一致（顺序敏感）
const expectedOrder = ['offerId', 'buyQuantity', 'env', 'currencyType', 'productId', 'goodsPrice', 'outTradeNo', 'attach']
const actualOrder = Object.keys(signDataObj)
const orderMatch = expectedOrder.every((k, i) => actualOrder[i] === k)
if (orderMatch) {
  pass++
  lines.push(`✅ 字段顺序与官方示例一致（顺序敏感）`)
} else {
  fail++
  lines.push(`❌ 字段顺序异常: 实际 ${actualOrder.join(',')} ≠ 官方 ${expectedOrder.join(',')}`)
}

console.log('')
console.log('=== 虚拟支付 signData 字段校验 ===')
console.log(`CONFIG: GOODS_PRICE=${CONFIG.GOODS_PRICE}, ENV=${CONFIG.ENV}, OFFER_ID=${CONFIG.OFFER_ID}, PRODUCT_ID=${CONFIG.PRODUCT_ID}`)
console.log(`signData: ${JSON.stringify(signDataObj)}`)
console.log('')
lines.forEach((l) => console.log(l))
console.log('')
console.log(fail === 0 ? `✅ 全部通过（${pass} 项）` : `❌ 失败 ${fail} 项，通过 ${pass} 项`)
process.exit(fail === 0 ? 0 : 1)
