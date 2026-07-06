/**
 * 支付结果记录云函数（虚拟支付）
 *
 * 客户端 wx.requestVirtualPayment 成功后调用本函数：
 *   1. 记录订单（便于对账、解锁状态同步）
 *   2. best-effort 兜底发货上报（道具直购正常由微信 xpay_goods_deliver_notify 推送确认，
 *      本函数仅用于推送失败时的手动标记，失败不阻断）
 *
 * 文档：
 *  - 虚拟支付：https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment.html
 *  - 通知已发货完成（仅现金单，推送失败兜底）：/xpay/notify_provide_goods
 */
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const CONFIG = {
  OFFER_ID: '1450568626',
  ENV: 0, // 0=现网 1=沙箱
}

/** 简单 HTTPS POST JSON */
function httpsPost(url, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data)
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }
    const req = https.request(options, (res) => {
      let chunks = ''
      res.on('data', (c) => { chunks += c })
      res.on('end', () => {
        try { resolve(JSON.parse(chunks)) } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

/**
 * 兜底发货上报（仅现金单）：当 xpay_goods_deliver_notify 推送未成功时手动标记已发货。
 * 道具直购一般无需，仅防推送失败。失败仅记录，不阻断。
 */
async function notifyProvideGoods({ orderId }) {
  try {
    const tokenRes = await cloud.getAccessToken()
    const accessToken = tokenRes.access_token || tokenRes.accessToken
    if (!accessToken) return
    const result = await httpsPost(
      `https://api.weixin.qq.com/xpay/notify_provide_goods?access_token=${accessToken}`,
      { order_id: orderId, env: CONFIG.ENV }
    )
    console.log('[payCallback] notify_provide_goods:', JSON.stringify(result))
  } catch (e) {
    console.error('[payCallback] notify_provide_goods 异常（已忽略）:', e)
  }
}

exports.main = async (event) => {
  const { orderNo, productId } = event
  const openid = cloud.getWXContext().OPENID

  console.log('✅ 虚拟支付成功记录:', { orderNo, productId, openid })

  // 兜底发货上报（道具直购一般无需，仅防推送失败）
  try {
    if (orderNo) await notifyProvideGoods({ orderId: orderNo })
  } catch (e) {
    console.error('[payCallback] 发货上报未预期异常（已忽略）:', e)
  }

  return { code: 0, msg: 'ok' }
}
