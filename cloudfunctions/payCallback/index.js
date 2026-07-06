/**
 * 支付回调云函数
 *
 * 微信支付服务器在用户支付成功后，会调用此云函数通知结果。
 * 这里记录支付状态，后续可扩展：
 *   - 记录订单到云数据库
 *   - 发送订阅消息
 *
 * 文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guide/payment/cloud-pay.html
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  // event 包含微信支付回调的标准参数
  // return_code / return_msg / result_code / out_trade_no / transaction_id / total_fee / openid / time_end 等
  const { return_code, out_trade_no, transaction_id, total_fee, openid } = event

  if (return_code === 'SUCCESS') {
    console.log('✅ 支付成功:', {
      outTradeNo: out_trade_no,
      transactionId: transaction_id,
      totalFee: total_fee,        // 单位：分
      openid,
    })

    // ===== 后续可在此处扩展 =====
    // 1. 记录到云数据库
    // 2. 发送订阅消息提醒用户
    // 3. 发放权益标记
    // ===========================

    return { code: 'SUCCESS', message: 'ok' }
  }

  console.log('❌ 支付失败:', event)
  return { code: 'FAIL', message: '支付通知处理失败' }
}
