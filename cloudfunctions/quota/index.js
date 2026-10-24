/**
 * 额度账户云函数（跨端共享）
 *
 * 背景：AI 对话场景里没有"报告页面"这道物理墙，付费条件必须从「看不看报告」
 *       改成「有没有额度」。额度必须落服务端，因为：
 *         ① 原子组件与小程序是隔离的 JS 上下文，localStorage 不共享；
 *         ② AI 对话与小程序是同一 appid ⇒ 同一 openid ⇒ 天然可以是一个账户。
 *
 * 集合设计
 *   user_quota（每人一条，_id = openid）
 *     freeTotal / freeLeft  终身免费深度调用额度（默认 3）
 *     paidLeft  已购未用的深度调用次数
 *     paidTotal 累计购买次数
 *     unlocked 是否已永久解锁报告（小程序内 ¥1 道具的老语义，兼容已付费用户）
 *     lastConsumeFrom  上一次消耗来自 'free' | 'paid'（用于失败归还）
 *     firstChannel 首次开户渠道 'ai' | 'mp'
 *
 * action
 *   get      查询账户（不存在则开户）
 *   consume  消耗 1 次深度调用额度（L2 接口调用前）
 *   refund   归还 1 次（接口计算失败时回滚，避免用户白扣）
 *
 * 消耗顺序：unlocked 免消耗 → 先扣免费额度 → 再扣付费次数 → 都不够则返回 needPay
 *
 * ⚠️ 商品表（与 createOrder / payCallback 三处必须一致，改一处记得改三处）
 *   pension_report    ¥1  永久解锁报告 + 赠 1 次深度调用
 *   pension_report_3  ¥2  深度调用 3 次（纯额度包，不解锁报告）
 *
 * 2026-10-18 建立
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const COLL_QUOTA = 'user_quota'
const COLL_ORDERS = 'orders'

/** 终身免费深度调用额度 */
const FREE_TOTAL = 3

/** 商品表：price 单位=分，必须与微信虚拟支付后台道具价格一致 */
const PRODUCTS = {
  pension_report: {
    price: 100,
    grant: { unlocked: true, paidLeft: 1 },
    desc: '报告解锁 ¥1（永久解锁完整报告，赠 1 次深度调用）',
  },
  pension_report_3: {
    price: 200,
    grant: { paidLeft: 3 },
    desc: '深度调用 3 次 ¥2（不含报告解锁）',
  },
}

/** 新户默认账户 */
function newAccount(openid, channel) {
  const now = Date.now()
  return {
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
}

/** 读取账户；不存在则开户。返回 { doc, isNew } */
async function getOrCreate(openid, channel) {
  try {
    const res = await db.collection(COLL_QUOTA).doc(openid).get()
    if (res && res.data) return { doc: res.data, isNew: false }
  } catch (e) {
    // doc 不存在会抛异常，继续走开户
  }
  const doc = newAccount(openid, channel)
  try {
    await db.collection(COLL_QUOTA).add({ data: doc })
    console.log('[quota] 开户:', openid, 'channel=', channel)
  } catch (e) {
    // 并发下可能已被创建，重新读一次
    const again = await db.collection(COLL_QUOTA).doc(openid).get().catch(() => null)
    if (again && again.data) return { doc: again.data, isNew: false }
    throw e
  }
  return { doc, isNew: true }
}

/** 对外统一返回体 */
function ok(data) {
  return { code: 0, data }
}
function fail(msg, extra) {
  return Object.assign({ code: -1, msg }, extra || {})
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) {
    return fail('无法识别用户（OPENID 为空），请在小程序/AI 环境内调用')
  }

  const action = event.action || 'get'
  const channel = event.channel || 'unknown'

  try {
    // ---------- get ----------
    if (action === 'get') {
      const { doc } = await getOrCreate(openid, channel)
      return ok(normalize(doc))
    }

    // ---------- consume ----------
    if (action === 'consume') {
      const { doc } = await getOrCreate(openid, channel)

      // ① 已永久解锁 ⇒ 不消耗（尊重已付费老用户的权益）
      if (doc.unlocked) {
        await db.collection(COLL_QUOTA).doc(openid).update({
          data: { consumedTotal: _.inc(1), updatedAt: Date.now() },
        })
        return ok(Object.assign(normalize(doc), { from: 'unlocked', consumed: false }))
      }

      // ② 先扣免费额度
      if ((doc.freeLeft || 0) > 0) {
        await db.collection(COLL_QUOTA).doc(openid).update({
          data: {
            freeLeft: _.inc(-1),
            consumedTotal: _.inc(1),
            lastConsumeFrom: 'free',
            updatedAt: Date.now(),
          },
        })
        const left = { freeLeft: (doc.freeLeft || 0) - 1, paidLeft: doc.paidLeft || 0 }
        return ok(Object.assign(normalize(doc, left), { from: 'free', consumed: true }))
      }

      // ③ 再扣付费次数
      if ((doc.paidLeft || 0) > 0) {
        await db.collection(COLL_QUOTA).doc(openid).update({
          data: {
            paidLeft: _.inc(-1),
            consumedTotal: _.inc(1),
            lastConsumeFrom: 'paid',
            updatedAt: Date.now(),
          },
        })
        const left = { freeLeft: 0, paidLeft: (doc.paidLeft || 0) - 1 }
        return ok(Object.assign(normalize(doc, left), { from: 'paid', consumed: true }))
      }

      // ④ 都没有 ⇒ 需要付费
      return ok(Object.assign(normalize(doc), {
        from: 'none',
        consumed: false,
        needPay: true,
        tip: '免费额度已用完，解锁一次 ¥1（或 ¥2 买 3 次）',
        products: [
          { productId: 'pension_report_3', price: 200, desc: PRODUCTS.pension_report_3.desc },
          { productId: 'pension_report', price: 100, desc: PRODUCTS.pension_report.desc },
        ],
      }))
    }

    // ---------- refund ----------
    if (action === 'refund') {
      // 仅当上一次消耗来自额度时才归还，避免重复归还刷额度
      const { doc } = await getOrCreate(openid, channel)
      if (!doc.lastConsumeFrom) {
        return ok({ refunded: false, reason: '无待归还记录' })
      }
      const back = doc.lastConsumeFrom === 'paid' ? { paidLeft: _.inc(1) } : { freeLeft: _.inc(1) }
      await db.collection(COLL_QUOTA).doc(openid).update({
        data: Object.assign(back, {
          consumedTotal: _.inc(-1),
          lastConsumeFrom: '',
          updatedAt: Date.now(),
        }),
      })
      console.log('[quota] 归还额度:', openid, 'from=', doc.lastConsumeFrom)
      return ok({ refunded: true, from: doc.lastConsumeFrom })
    }

    return fail('未知 action：' + action)
  } catch (e) {
    console.error('[quota] 异常:', e)
    return fail(e.message || '额度服务异常')
  }
}

/** 统一裁剪对外字段；left 可覆盖剩余额度（用于 avoid 二次读库） */
function normalize(doc, left) {
  const base = {
    openid: doc.openid,
    freeTotal: doc.freeTotal == null ? FREE_TOTAL : doc.freeTotal,
    freeLeft: doc.freeLeft == null ? FREE_TOTAL : doc.freeLeft,
    paidLeft: doc.paidLeft || 0,
    paidTotal: doc.paidTotal || 0,
    consumedTotal: doc.consumedTotal || 0,
    unlocked: !!doc.unlocked,
    firstChannel: doc.firstChannel || 'unknown',
  }
  if (left && typeof left === 'object') {
    base.freeLeft = left.freeLeft
    base.paidLeft = left.paidLeft
  }
  base.available = base.unlocked || base.freeLeft > 0 || base.paidLeft > 0
  return base
}

module.exports.PRODUCTS = PRODUCTS
