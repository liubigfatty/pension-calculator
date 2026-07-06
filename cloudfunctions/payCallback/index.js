/**
 * 支付回调云函数
 *
 * 微信支付服务器在用户支付成功后，会调用此云函数通知结果。
 * 这里记录支付状态，并向微信「订单发货管理」上报虚拟发货，
 * 否则微信会判定为异常交易、对支付能力进行管制（requestPayment:fail banned）。
 *
 * 文档：
 *  - 云支付：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guide/payment/cloud-pay.html
 *  - 发货信息录入（uploadShippingInfo）：
 *    https://developers.weixin.qq.com/miniprogram/dev/server/API/order_shipping/api_uploadshippinginfo.html
 */
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 向微信「订单发货管理」上报虚拟发货（解除 banned 管制）
 * 养老金报告为虚拟商品（logistics_type=3，无实体配送）。
 * 失败仅记录日志，不抛出 —— 绝不能因发货上报失败而阻断支付回调（否则微信会重复推送）。
 */
async function reportVirtualShipping({ transaction_id, out_trade_no, openid }) {
  // 至少要能定位到订单
  if (!transaction_id && !(out_trade_no)) {
    console.warn('[payCallback] 缺少上报发货所需字段，跳过', { transaction_id, out_trade_no, openid })
    return
  }
  if (!openid) {
    console.warn('[payCallback] 缺少 openid，跳过发货上报', { openid })
    return
  }

  try {
    const tokenRes = await cloud.getAccessToken()
    const accessToken = tokenRes.access_token || tokenRes.accessToken
    if (!accessToken) {
      console.error('[payCallback] 获取 access_token 失败', JSON.stringify(tokenRes))
      return
    }

    // 优先用微信支付单号定位订单；缺失时退回商户单号
    const orderKey = transaction_id
      ? { order_number_type: 2, transaction_id }
      : { order_number_type: 1, mchid: '1747046083', out_trade_no }

    const body = {
      order_key: orderKey,
      delivery_mode: 1,            // 1=统一发货
      logistics_type: 3,           // 3=虚拟商品，无实体配送
      shipping_list: [
        { item_desc: '养老金测算深度报告' }  // 必填，商品描述
      ],
      upload_time: new Date().toISOString().replace('Z', '+08:00'), // RFC 3339
      payer: { openid }
    }

    const result = await httpsPost(
      `https://api.weixin.qq.com/wxa/sec/order/upload_shipping_info?access_token=${accessToken}`,
      body
    )
    console.log('[payCallback] 虚拟发货上报结果:', JSON.stringify(result))

    // errcode 非0 时记录（常见非致命：10060002 已发货、268485224 发货模式非法等）
    if (result && result.errcode !== 0 && result.errcode !== undefined) {
      console.error('[payCallback] 虚拟发货上报返回非0:', JSON.stringify(result))
    }
  } catch (e) {
    console.error('[payCallback] 虚拟发货上报异常（不影响支付结果）:', e)
  }
}

/** 简单的 HTTPS POST JSON 工具 */
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
        'Content-Length': Buffer.byteLength(payload)
      }
    }
    const req = https.request(options, (res) => {
      let chunks = ''
      res.on('data', (c) => { chunks += c })
      res.on('end', () => {
        try {
          resolve(JSON.parse(chunks))
        } catch (e) {
          reject(e)
        }
      })
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

exports.main = async (event) => {
  // event 包含微信支付回调标准参数：
  // return_code / result_code / out_trade_no / transaction_id / total_fee / openid / time_end 等
  const { return_code, out_trade_no, transaction_id, total_fee, openid } = event

  if (return_code === 'SUCCESS') {
    console.log('✅ 支付成功:', {
      outTradeNo: out_trade_no,
      transactionId: transaction_id,
      totalFee: total_fee,        // 单位：分
      openid,
    })

    // 上报虚拟发货（解除微信支付「订单发货管理」管制，否则 requestPayment:fail banned）
    // 用 try 包裹兜底，确保支付回调始终向微信返回 SUCCESS
    try {
      await reportVirtualShipping({ transaction_id, out_trade_no, openid })
    } catch (e) {
      console.error('[payCallback] 发货上报未预期异常（已忽略）:', e)
    }

    return { code: 'SUCCESS', message: 'ok' }
  }

  console.log('❌ 支付失败:', event)
  return { code: 'FAIL', message: '支付通知处理失败' }
}
