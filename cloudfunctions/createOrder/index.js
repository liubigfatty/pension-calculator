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
 * 文档：
 *  - 虚拟支付：https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment.html
 *  - 客户端 API：wx.requestVirtualPayment
 */
const cloud = require('wx-server-sdk')
const https = require('https')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// ⚠️ APP_SECRET 为小程序密钥，请在小程序后台
//    「开发管理 → 开发设置 → 开发者密钥(AppSecret)」获取并填入下方。
// 也可改为从云函数环境变量注入，避免明文。此处为占位符，上传前必须替换。
const CONFIG = {
  APPID: 'wx76075ba352d5333c',
  APP_SECRET: process.env.VP_APP_SECRET || '',  // ⚠️小程序密钥(敏感)：上传云函数后须在云函数控制台配置环境变量 VP_APP_SECRET，勿将明文写在此处/commit
  OFFER_ID: '1450568626',                             // 虚拟支付 OfferID
  APP_KEY_PROD: 'WC52oAh5z4veWT3de3wvn2Q5ANNEwmIy',     // 现网 AppKey
  APP_KEY_SANDBOX: 'Ci1GCEVPChncatS5aNrZLypWADRUnAJV',  // 沙箱 AppKey
  PRODUCT_ID: 'pension_report',                       // 后台道具ID（需一致）
  GOODS_PRICE: 100,                                   // 道具单价：分（=¥1.00，需与后台道具价格一致）
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
    const { loginCode, productId } = event
    const pid = productId || CONFIG.PRODUCT_ID

    if (!loginCode) {
      return { code: -1, msg: '缺少 loginCode（请先 wx.login）' }
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
    const outTradeNo = 'RP' + Date.now() + Math.random().toString(36).slice(-4).toUpperCase()
    const signDataObj = {
      buyQuantity: 1,
      env: CONFIG.ENV,
      offerId: CONFIG.OFFER_ID,
      currencyType: 'CNY',
      productId: pid,
      goodsPrice: CONFIG.GOODS_PRICE,
      outTradeNo: outTradeNo,
      attach: JSON.stringify({ productId: pid }),
    }
    const signData = JSON.stringify(signDataObj)

    // 3) 计算双签名
    const appKey = CONFIG.ENV === 1 ? CONFIG.APP_KEY_SANDBOX : CONFIG.APP_KEY_PROD
    const signature = hmacSha256Hex(sessionKey, signData)                       // 用户态签名
    const paySig = hmacSha256Hex(appKey, `requestVirtualPayment&${signData}`)   // 支付签名

    console.log('[vpay] 签名生成完成 openid=', openid, 'orderNo=', outTradeNo)

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
      },
    }
  } catch (e) {
    console.error('[vpay] 异常:', e)
    return { code: -1, msg: e.message || '未知错误' }
  }
}
