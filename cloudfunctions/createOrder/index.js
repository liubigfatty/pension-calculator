/**
 * 虚拟支付签名云函数
 *
 * 流程：
 *   1. 客户端 wx.login 拿到 code，传进来
 *   2. 云函数用 code + AppSecret 调 code2Session 换 session_key
 *   3. 构造 signData（JSON 字符串，字段顺序敏感，勿调整）
 *   4. 计算 signature（session_key）与 paySig（appKey）
 *   5. 返回给客户端，客户端调 wx.requestVirtualPayment（内部自动下单）
 *
 * ⭐ 2026-10-18 改造（AI 场景额度制）：
 *   - 支持两个道具：pension_report(¥1 永久解锁+赠1次) / pension_report_3(¥2 3次额度包)
 *   - 下单即预写 orders 集合（status='created'），供对账与"下单未付"分析
 *   - ⚠️ 商品表与 quota / payCallback 三处保持一致，改一处要改三处
 *
 * 文档：
 *  - 虚拟支付：https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment.html
 *  - 客户端 API：wx.requestVirtualPayment
 */
const cloud = require('wx-server-sdk')
const https = require('https')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/** 商品表（与 cloudfunctions/quota、payCallback 三处一致；price 单位=分） */
const PRODUCTS = {
  pension_report: { price: 100, desc: '报告解锁 ¥1（永久解锁完整报告，赠 1 次深度调用）' },
  pension_report_3: { price: 200, desc: '深度调用 3 次 ¥2（不含报告解锁）' },
}

// ⚠️ APP_SECRET 为小程序密钥，请在小程序后台
//    「开发管理 → 开发设置 → 开发者密钥(AppSecret)」获取并填入下方。
// 也可改为从云函数环境变量注入，避免明文。此处为占位符，上传前必须替换。
const CONFIG = {
  APPID: 'wx76075ba352d5333c',
  APP_SECRET: process.env.VP_APP_SECRET || '',  // ⚠️小程序密钥(敏感)：上传云函数后须在云函数控制台配置环境变量 VP_APP_SECRET，勿将明文写在此处/commit
  OFFER_ID: '1450568626',                             // 虚拟支付 OfferID
  APP_KEY_PROD: process.env.VP_APP_KEY || '',            // 现网 AppKey（敏感）：上传云函数后须配置环境变量 VP_APP_KEY，勿明文入仓
  APP_KEY_SANDBOX: process.env.VP_APP_KEY_SANDBOX || '',  // 沙箱 AppKey（敏感）：同上，配置环境变量 VP_APP_KEY_SANDBOX
  PRODUCT_ID: 'pension_report',                       // 后台道具ID（需一致）
  GOODS_PRICE: 100,                                  // 道具单价（单位：分）。微信 signData.goodsPrice 单位为「分」；后台「价格(元)」=1 即 100 分，须与微信后台道具价格一致（官方文档明确 goodsPrice 单位=分）
  ENV: 0,                                             // 0=现网 1=沙箱
}

/** HMAC-SHA256 → hex */
function hmacSha256Hex(key, data) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest('hex')
}

/** 简单 HTTPS GET JSON */
function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let chunks = ''
      res.on('data', (c) => { chunks += c })
      res.on('end', () => {
        try { resolve(JSON.parse(chunks)) } catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
}

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const { loginCode, productId, channel } = event
    const pid = productId || CONFIG.PRODUCT_ID

    if (!loginCode) {
      return { code: -1, msg: '缺少 loginCode（请先 wx.login）' }
    }
    // 🔴 道具白名单：goodsPrice 必须与微信虚拟支付后台该道具的价格完全一致，
    //    否则拉起收银台会报价格不符 ⇒ 未知道具一律拒绝，不静默回退默认道具。
    const product = PRODUCTS[pid]
    if (!product) {
      console.error('[vpay] 未知道具:', pid)
      return { code: -1, msg: '未知道具：' + pid + '（可用：' + Object.keys(PRODUCTS).join(' / ') + '）' }
    }
    if (!CONFIG.APP_SECRET) {
      return { code: -1, msg: '云函数未配置 APP_SECRET，无法换取 session_key' }
    }

    // 1) code2Session 换 session_key
    const code2sessionUrl =
      `https://api.weixin.qq.com/sns/jscode2session?appid=${CONFIG.APPID}` +
      `&secret=${CONFIG.APP_SECRET}&js_code=${loginCode}&grant_type=authorization_code`
    const sessionRes = await httpsGetJson(code2sessionUrl)
    if (!sessionRes || !sessionRes.session_key) {
      console.error('[vpay] code2Session 失败:', JSON.stringify(sessionRes))
      return { code: -1, msg: '登录态获取失败：' + (sessionRes.errmsg || '未知错误') }
    }
    const sessionKey = sessionRes.session_key

    // 2) 构造 signData（字段顺序敏感，勿调整）
    //    ★ 字段类型权威依据（微信官方 API 文档 wx.requestVirtualPayment）：
    //      offerId:      string   米大师应用ID
    //      buyQuantity:  number   购买数量
    //      env:          number   0=正式环境 1=沙箱
    //      currencyType: string   CNY
    //      productId:    string   道具ID（mode=short_series_goods 时必填）
    //      goodsPrice:   number   道具单价，单位=分（官方文档：goodsPrice 单位"分"；本小程序后台「价格(元)」=1 即 100 分，goodsPrice 须传 100）
    //      outTradeNo:   string   业务订单号
    //      attach:       string   透传数据
    //    来源: https://developers.weixin.qq.com/miniprogram/dev/api/payment/wx.requestVirtualPayment.html
    //    真机实测（基础库 3.3.5）：buyQuantity/env/goodsPrice 传字符串报 -15016 "doesn't expect a string value" → 三者须 number
    //    校验脚本: scripts/check-vpay-signData.js（每次改完自动比对上表）
    const outTradeNo = 'RP' + Date.now() + Math.random().toString(36).slice(-4).toUpperCase()
    const signDataObj = {
      offerId: CONFIG.OFFER_ID,                   // string（米大师应用ID）
      buyQuantity: 1,                             // number（购买数量；次数包用独立道具，不用数量叠加，避免单价×数量歧义）
      env: CONFIG.ENV,                            // number: 0=正式环境 1=沙箱
      currencyType: 'CNY',                        // string
      productId: pid,                             // string（道具ID）
      goodsPrice: product.price,                  // number，单位=分（官方文档 goodsPrice 单位为分；须与后台道具价格一致）
      outTradeNo: outTradeNo,                      // string（业务订单号）
      attach: JSON.stringify({ productId: pid }),  // string（透传）
    }
    const signData = JSON.stringify(signDataObj)

    // 3) 计算双签名
    const appKey = CONFIG.ENV === 1 ? CONFIG.APP_KEY_SANDBOX : CONFIG.APP_KEY_PROD
    const signature = hmacSha256Hex(sessionKey, signData)                       // 用户态签名
    const paySig = hmacSha256Hex(appKey, `requestVirtualPayment&${signData}`)   // 支付签名

    console.log('[vpay] 签名生成完成 openid=', openid, 'orderNo=', outTradeNo, 'productId=', pid, 'price(分)=', product.price)

    // 订单预入库（status='created'）：对账用，也便于分析"下单未付"。
    // 失败不影响支付（best-effort）—— 支付链路不能被记账逻辑拖垮。
    try {
      await db.collection('orders').add({
        data: {
          orderNo: outTradeNo,
          openid,
          productId: pid,
          price: product.price,
          quantity: 1,
          status: 'created',
          channel: channel || 'unknown',
          createdAt: Date.now(),
        },
      })
    } catch (e) {
      console.error('[vpay] 订单预入库失败（不影响支付）:', e.message)
    }

    return {
      code: 0,
      data: {
        signData,
        paySig,
        signature,
        orderNo: outTradeNo,
        env: CONFIG.ENV,
        offerId: CONFIG.OFFER_ID,
        productId: pid,
        price: product.price,
        desc: product.desc,
      },
    }
  } catch (e) {
    console.error('[vpay] 异常:', e)
    return { code: -1, msg: e.message || '未知错误' }
  }
}
