// pages/index/index.js
Page({
  data: {},

  onLoad() {
    console.log('首页加载完成')
    
    // 检查是否已同意隐私协议
    const agreed = wx.getStorageSync('privacy_agreed')
    if (!agreed) {
      wx.showModal({
        title: '隐私保护指引',
        content: '本小程序需要收集省份、缴费年限等信息用于计算养老金。信息仅本地保存，不会上传服务器。点击"同意"继续使用。',
        confirmText: '同意',
        cancelText: '不同意',
        success: (res) => {
          if (res.confirm) {
            wx.setStorageSync('privacy_agreed', true)
            wx.showToast({ title: '感谢您的同意', icon: 'success' })
          } else {
            wx.showToast({ title: '需要同意才能使用', icon: 'none' })
            // 用户不同意，可以退出小程序或限制功能
          }
        }
      })
    }
  },

  // 开始测算
  onStart() {
    wx.navigateTo({
      url: '/pages/step1/step1'
    })
  },

  // 分享到聊天
  onShareAppMessage() {
    return {
      title: '养老金计算器 - 算算你能领多少',
      path: '/pages/index/index'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '养老金计算器 - 算算你能领多少'
    }
  }
})
