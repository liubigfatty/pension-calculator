// pages/privacy/privacy.js
Page({
  data: {},

  onLoad(options) {
    // 如果从设置页进入，不需要特殊处理
    if (options && options.from === 'settings') {
      this.setData({ fromSettings: true })
    }
  },

  // 用户点击"同意"
  onAgree() {
    wx.setStorageSync('privacy_agreed', true)
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      // 如果没有历史页面（如直接从设置进入），跳回首页
      wx.switchTab({ url: '/pages/index/index' })
    }
  }
})
