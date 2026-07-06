/**
 * 支付下单云函数 — 使用云调用支付API（cloud.cloudPay）
 *
 * 流程：
 *   1. 调用 cloud.cloudPay.unifiedOrder 统一下单
 *   2. 返回值自带 payment 对象，直接传给 wx.requestPayment
 *
 * 官方文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloud/reference-sdk-api/open/pay/CloudPay.unifiedOrder.html
 */
const cloud = require('wx-server-sdk')

exports.main = async (event) => {
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

  // 检查 cloud.cloudPay 是否可用
  if (!cloud.cloudPay || typeof cloud.cloudPay.unifiedOrder !== 'function') {
    return {
      code: -1,
      msg: 'cloud.cloudPay 不可用，wx-server-sdk版本可能过低或云环境未正确初始化'
    }
  }

  const { total_fee } = event

  try {
    const outTradeNo = 'RP' + Date.now() + Math.random().toString(36).slice(-4).toUpperCase()

    // 调用官方统一下单 API
    const result = await cloud.cloudPay.unifiedOrder({
      body: '养老金测算深度报告',
      outTradeNo,
      spbillCreateIp: '127.0.0.1',
      subMchId: '1747046083',                // 商户号
      totalFee: total_fee || 99,              // 金额：分（默认0.99元）
      envId: 'cyz0813-d0go10t7vfbe3bc47',     // 云环境ID（标准版）
      functionName: 'payCallback',            // 支付回调云函数名
    })

    // 检查下单结果
    if (!result) {
      return { code: -1, msg: '下单无返回结果' }
    }

    if (result.returnCode !== 'SUCCESS') {
      return { code: -1, msg: `下单失败(${result.returnCode}): ${result.returnMsg || ''} ${result.err_code_des || ''}` }
    }

    if (result.resultCode !== 'SUCCESS') {
      return { code: -1, msg: `交易失败(${result.resultCode}): ${result.err_code_des || result.err_code || ''}` }
    }

    // result.payment 是 SDK 自动生成的，直接传给 wx.requestPayment
    // 包含：timeStamp, nonceStr, package, signType, paySign
    if (!result.payment) {
      return { code: -1, msg: '下单成功但未返回支付参数：' + JSON.stringify(result) }
    }

    return {
      code: 0,
      data: {
        outTradeNo,
        paymentParams: result.payment   // SDK 算好的签名，直接用
      }
    }
  } catch (e) {
    console.error('[createOrder] 异常:', e)
    return { code: -1, msg: e.message || '未知错误' }
  }
}
