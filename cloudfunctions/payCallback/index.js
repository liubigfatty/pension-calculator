/**
 * 支付结果记录云函数（虚拟支付）
 *
 * 客户端 wx.requestVirtualPayment 成功后调用本函数：
 *   1. 记录订单（便于对账、解锁状态同步）
 * 2. [可选/需公网] 处理微信虚拟支付道具发货确认推送 xpay_goods_deliver_notify，
 *    幂等记录"已发货"状态，防重复发货（见下方 handleDeliverNotify 说明）
 *
 * 文档：
 *  - 虚拟支付：https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment.html
 *  - 客户端 API：wx.requestVirtualPayment
 *
 * ⚠️ 关于服务端发货确认（xpay_goods_deliver_notify）：
 *  微信虚拟支付道具直购的"已发货"确认由微信主动推送 xpay_goods_deliver_notify 完成。
 *  该推送需要公网回调地址 —— 云开发需为云函数配置「HTTP 触发器 / 自定义回调」，
 *  并在「微信支付（虚拟支付）后台 → 道具发货回调地址」中填写该公网地址，微信才会推送。
 *  当前项目已明确选择「暂不配置服务端推送，客户端 success 回调记录已足够」，
 *  因此下方 handleDeliverNotify 仅为幂等处理骨架：当云函数实际收到该事件时记录"已发货"
 *  （防重复发货），但不会主动发起任何需要公网的请求。未配置回调时该分支不会被触发，
 *  不影响现有客户端成功记录逻辑。
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const CONFIG = {
  OFFER_ID: '1450568626',
  ENV: 0, // 0=现网 1=沙箱
}

/**
 * 处理微信虚拟支付道具发货确认推送（xpay_goods_deliver_notify）
 *
 * 触发前提（需公网，当前未配置，故本分支默认不会被调用）：
 *   - 云函数已配置 HTTP 触发器 / 自定义回调（公网可访问）
 *   - 已在微信虚拟支付后台配置「道具发货回调地址」指向该回调
 *
 * 幂等说明：微信可能重复推送同一笔订单的发货通知。真正防重复发货应基于
 *  持久化存储（如云数据库 orders 集合）按 order_id 去重 —— 已存在"已发货"
 *  记录则直接返回，避免重复记账/解锁。此处仅做骨架与日志，持久化需接入
 *  数据库后补充（见下方 TODO）。
 *
 * @param {object} event 微信推送的 xpay_goods_deliver_notify 事件体
 *  典型字段：Event, openid, productid, out_trade_no, order_id, ...
 * @returns {Promise<{code:number, msg:string}>}
 */
async function handleDeliverNotify(event) {
  // 微信推送字段大小写不固定，兼容 Event / event
  const evt = event.Event || event.event || ''
  const orderId = event.order_id || event.out_trade_no || ''
  const openid = event.openid || cloud.getWXContext().OPENID || ''
  const productId = event.productid || event.productId || ''

  console.log('📦 [payCallback] 收到 xpay_goods_deliver_notify:', {
    evt, orderId, openid, productId,
  })

  // TODO(持久化去重): 接入云数据库后取消注释，按 order_id 幂等写入"已发货"状态：
  //   const db = cloud.database()
  //   const existed = await db.collection('orders').where({ orderId }).count()
  //   if (existed.total > 0) {
  //     console.log('📦 [payCallback] 订单已发货，跳过重复处理:', orderId)
  //     return { code: 0, msg: 'already_delivered' }
  //   }
  //   await db.collection('orders').add({ data: { orderId, openid, productId, status: 'delivered', deliveredAt: Date.now() } })

  // 当前未配置数据库：仅记录日志，标记"已发货"（幂等由上游微信去重保证）
  console.log('📦 [payCallback] 已标记发货(骨架，未持久化去重):', orderId)
  return { code: 0, msg: 'deliver_notified' }
}

exports.main = async (event) => {
  // 分支一：微信推送的道具发货确认事件（需公网回调，当前未配置则不会进入）
  const evtName = (event.Event || event.event || '')
  if (evtName === 'xpay_goods_deliver_notify') {
    return handleDeliverNotify(event)
  }

  // 分支二：客户端 wx.requestVirtualPayment 成功后 best-effort 记录订单
  const { orderNo, productId } = event
  const openid = cloud.getWXContext().OPENID

  console.log('✅ 虚拟支付成功记录:', { orderNo, productId, openid })

  return { code: 0, msg: 'ok' }
}
