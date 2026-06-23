const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  try {
    // 生成小程序码（不需要携带参数，用 getUnlimited 无调用次数限制）
    const result = await cloud.openapi.wxacode.getUnlimited({
      scene: 'share',           // 必填，用固定值
      page: 'pages/index/index', // 小程序页面路径
      width: 280,                // 二维码宽度
      isHyaline: false          // 是否透明底色
    })

    // result 是 Buffer，转成 base64 返回
    return {
      success: true,
      contentType: 'image/png',
      buffer: result.buffer.toString('base64')
    }
  } catch (err) {
    console.error('[getQRCode] 生成小程序码失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
