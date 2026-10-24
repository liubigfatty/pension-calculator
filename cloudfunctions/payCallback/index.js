/**
 * 支付结果记录云函数（虚拟支付）—— 2026-10-18 改造为真入库
 *
 * 两个入口：
 *   ① 客户端 wx.requestVirtualPayment 成功后上报（主路径，best-effort）
 *   ② 微信主动推送 xpay_goods_deliver_notify（需公网回调；当前未配置 ⇒ 分支不会触发，
 *      但代码已按幂等写好，将来配了回调就能直接用）
 *
 * 改造要点（原实现只 console.log，订单入库是注释状态 ⇒ 跨端付费态无法共享）：
 *   - orders 集合：按 orderNo 幂等，status: created → paid
 *   - user_quota 集合：按道具发放额度（unlocked / paidLeft）
 *
 * 另提供 action='syncLegacy'：给"小程序本地已付费、服务端无记录"的老用户补 3 次额度。
 *   🔴 只补额度、不给 unlocked —— 本地 localStorage 解锁照旧生效，
 *      既照顾老用户，又不留下"调一次接口就永久解锁"的漏洞。
 *
 * 文档：
 *  - 虚拟支付：https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment.html
 *  - 客户端 API：wx.requestVirtualPayment
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const CONFIG = {
  OFFER_ID: '1450568626',
  ENV: 0, // 0=现网 1=沙箱
}

const FREE_TOTAL = 3

/** 商品发放规则（与 quota / createOrder 三处一致；price 单位=分） */
const PRODUCTS = {
  pension_report: {
    price: 100,
    grant: { unlocked: true, paidLeft: 1 },
    desc: '报告解锁 ¥1（永久解锁 + 赠 1 次深度调用）',
  },
  pension_report_3: {
    price: 200,
    grant: { paidLeft: 3 },
    desc: '深度调用 3 次 ¥2',
  },
}

/** 账户不存在则开户（与 quota 云函数保持同一套字段） */
async function ensureAccount(openid, channel) {
  try {
    const res = await db.collection('user_quota').doc(openid).get()
    if (res && res.data) return res.data
  } catch (e) { /* 不存在，走开户 */ }

  const now = Date.now()
  const doc = {
    _id: openid,
    openid,
    freeTotal: FREE_TOTAL,
    freeLeft: FREE_TOTAL,
    paidLeft: 0,
    paidTotal: 0,
    consumedTotal: 0,
    unlocked: false,
    lastConsumeFrom: '',
    firstChannel: channel || 'unknown',
    createdAt: now,
    updatedAt: now,
  }
  try {
    await db.collection('user_quota').add({ data: doc })
  } catch (e) {
    const again = await db.collection('user_quota').doc(openid).get().catch(() => null)
    if (again && again.data) return again.data
    throw e
  }
  return doc
}

/** 按道具发放额度（幂等由调用方保证：同一 orderNo 只发一次） */
async function grantQuota(openid, productId, channel) {
  const p = PRODUCTS[productId]
  if (!p) return { granted: false, reason: '未知道具：' + productId }

  await ensureAccount(openid, channel)

  const update = {
    paidTotal: _.inc(p.grant.paidLeft || 0),
    updatedAt: Date.now(),
  }
  if (p.grant.paidLeft) update.paidLeft = _.inc(p.grant.paidLeft)
  if (p.grant.unlocked) update.unlocked = true

  await db.collection('user_quota').doc(openid).update({ data: update })
  console.log('[payCallback] 发放额度:', openid, productId, JSON.stringify(p.grant))
  return { granted: true, grant: p.grant }
}

/**
 * 处理微信虚拟支付道具发货确认推送（xpay_goods_deliver_notify）
 * 触发前提（需公网回调，当前未配置 ⇒ 默认不会进入）
 */
async function handleDeliverNotify(event) {
  const evt = event.Event || event.event || ''
  const orderId = event.order_id || event.out_trade_no || ''
  const openid = event.openid || cloud.getWXContext().OPENID || ''
  const productId = event.productid || event.productId || ''

  console.log('📦 [payCallback] 收到 xpay_goods_deliver_notify:', { evt, orderId, openid, productId })

  if (!orderId) return { code: -1, msg: '缺少 order_id' }

  // 幂等：已标记 paid 的直接返回
  const existed = await db.collection('orders')
    .where({ orderNo: orderId, status: 'paid' }).count().catch(() => ({ total: 0 }))
  if (existed.total > 0) {
    console.log('📦 [payCallback] 订单已发货，跳过重复处理:', orderId)
    return { code: 0, msg: 'already_delivered' }
  }

  await db.collection('orders').add({
    data: {
      orderNo: orderId,
      openid,
      productId,
      status: 'paid',
      channel: 'wx_notify',
      createdAt: Date.now(),
      paidAt: Date.now(),
    },
  })
  await grantQuota(openid, productId, 'wx_notify')
  return { code: 0, msg: 'deliver_notified' }
}

exports.main = async (event) => {
  // 分支一：微信推送的道具发货确认事件（需公网回调）
  const evtName = (event.Event || event.event || '')
  if (evtName === 'xpay_goods_deliver_notify') {
    return handleDeliverNotify(event)
  }

  // 分支三：老用户本地付费态迁移（只补额度，不解锁）
  if (event.action === 'syncLegacy') {
    const openid = cloud.getWXContext().OPENID
    if (!openid) return { code: -1, msg: 'OPENID 为空' }
    try {
      const acc = await ensureAccount(openid, event.channel || 'mp')
      if (acc.unlocked) return { code: 0, msg: 'already_unlocked', data: { paidLeft: acc.paidLeft || 0 } }
      // 只给一次性补偿，且上限 3 次，避免被反复调用刷额度
      const bonus = 3
      await db.collection('user_quota').doc(openid).update({
        data: {
          paidLeft: _.inc(bonus),
          paidTotal: _.inc(bonus),
          legacySynced: true,
          updatedAt: Date.now(),
        },
      })
      console.log('[payCallback] legacy 迁移补额度:', openid, '+', bonus)
      return { code: 0, msg: 'legacy_synced', data: { bonus } }
    } catch (e) {
      console.error('[payCallback] syncLegacy 异常:', e)
      return { code: -1, msg: e.message || '迁移失败' }
    }
  }

  // 分支二：客户端 wx.requestVirtualPayment 成功后上报（主路径）
  const { orderNo, productId, channel } = event
  const openid = cloud.getWXContext().OPENID

  console.log('✅ 虚拟支付成功上报:', { orderNo, productId, openid })

  if (!orderNo) return { code: -1, msg: '缺少 orderNo' }
  if (!openid) return { code: -1, msg: 'OPENID 为空' }

  const pid = productId || 'pension_report'

  try {
    // 幂等：同一订单只入账一次
    const dup = await db.collection('orders')
      .where({ orderNo, status: 'paid' }).count().catch(() => ({ total: 0 }))
    if (dup.total > 0) {
      console.log('[payCallback] 重复上报，跳过:', orderNo)
      return { code: 0, msg: 'already_paid' }
    }

    // 下单时已预写 created 记录 ⇒ 更新状态；没预写（老版本客户端）则补一条
    const created = await db.collection('orders').where({ orderNo }).limit(1).get().catch(() => null)
    if (created && created.data && created.data.length) {
      await db.collection('orders').doc(created.data[0]._id).update({
        data: { status: 'paid', paidAt: Date.now(), productId: pid, openid },
      })
    } else {
      await db.collection('orders').add({
        data: {
          orderNo,
          openid,
          productId: pid,
          price: (PRODUCTS[pid] && PRODUCTS[pid].price) || 0,
          quantity: 1,
          status: 'paid',
          channel: channel || 'unknown',
          createdAt: Date.now(),
          paidAt: Date.now(),
        },
      })
    }

    const g = await grantQuota(openid, pid, channel)
    const acc = await db.collection('user_quota').doc(openid).get().catch(() => null)

    return {
      code: 0,
      msg: 'ok',
      data: {
        granted: g.granted,
        unlocked: !!(acc && acc.data && acc.data.unlocked),
        paidLeft: (acc && acc.data && acc.data.paidLeft) || 0,
        freeLeft: (acc && acc.data && acc.data.freeLeft) || 0,
      },
    }
  } catch (e) {
    console.error('[payCallback] 入账异常:', e)
    // 🔴 入账失败也必须返回 0：钱已经扣了，不能让客户端弹出"失败"让用户以为没付成
    return { code: 0, msg: 'record_failed_but_paid', err: e.message }
  }
}
