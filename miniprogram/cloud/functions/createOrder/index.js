/**
 * 支付下单云函数
 * 用户点击"查看完整报告"时调用，创建微信支付订单
 */
const crypto = require('crypto')

// ===== 支付配置（商户信息） =====
const APPID = 'wx76075ba352d5333c'
const MCHID = '1747046083'
// 密钥在云函数环境变量中设置（安全）
const APIv3 = process.env.APIv3_KEY || ''

/**
 * 生成随机字符串
 */
function nonceStr() {
  return Math.random().toString(36).substring(2, 18) + Math.random().toString(36).substring(2, 18)
}

/**
 * 获取微信服务器时间戳
 */
async function getWxTimestamp() {
  const res = await new Promise((resolve, reject) => {
    https.get('https://api.mch.weixin.qq.com/v3/merchant/service', (r) => {
      let data = ''
      r.on('data', c => data += c)
      r.on('end', () => {
        try { resolve(JSON.parse(data)) } catch(e) { resolve({}) }
      })
    }).on('error', reject)
  })
  return Math.floor(Date.now() / 1000)
}

/**
 * 调用微信支付统一下单 API
 */
async function unifiedOrder(openid, total_fee, outTradeNo) {
  const url = 'https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi'
  const body = JSON.stringify({
    appid: APPID,
    mchid: MCHID,
    description: '养老金测算完整报告',
    out_trade_no: outTradeNo,
    notify_url: 'https://YOUR_CLOUD_ID.service.tcloudbase.com/payCallback',  // TODO: 部署后替换
    amount: { total: total_fee, currency: 'CNY' },
    payer: { openid }
  })

  // 使用 APIv3 密钥签名
  const timestamp = Math.floor(Date.now() / 1000)
  const nonce = nonceStr()
  const signStr = `${APPID}\n${timestamp}\n${nonce}\n${body}\n`
  const sign = crypto.createHmac('sha256', APIv3).update(signStr).digest('base64')

  const res = await wxHttpRequest(url, 'POST', body, {
    'Authorization': `WECHATPAY2-SHA256-RSA2048 mchid="${MCHID}",nonce_str="${nonce}",timestamp="${timestamp}",signature="${sign}"`,
    'Content-Type': 'application/json',
    'User-Agent': 'wx-miniprogram/1.0'
  })

  return res
}

/**
 * 生成前端调起支付所需的参数
 */
function buildPaymentParams(prepayId) {
  const timestamp = Math.floor(Date.now() / 1000) + ''
  const nonce = nonceStr()
  const packageStr = `prepay_id=${prepayId}`
  const signStr = `${APPID}\n${timestamp}\n${nonce}\n${packageStr}\n`
  const paySign = crypto.createHmac('sha256', APIv3).update(signStr).digest('hex')

  return {
    timeStamp: timestamp,
    nonceStr: nonce,
    package: packageStr,
    signType: 'HMAC-SHA256',
    paySign: paySign
  }
}

// 云函数入口
exports.main = async (event) => {
  const { total_fee, openid } = event
  if (!openid) return { code: -1, msg: '缺少openid' }
  if (!APIv3) return { code: -1, msg: 'APIv3密钥未配置' }

  try {
    const outTradeNo = 'RP' + Date.now() + Math.random().toString(36).slice(-4).toUpperCase()
    const result = await unifiedOrder(openid, total_fee || 1, outTradeNo)
    
    if (result.prepay_id) {
      const params = buildPaymentParams(result.prepay_id)
      return { code: 0, data: { params, outTradeNo } }
    }
    return { code: -1, msg: JSON.stringify(result) }
  } catch(e) {
    return { code: -1, msg: e.message }
  }
}
