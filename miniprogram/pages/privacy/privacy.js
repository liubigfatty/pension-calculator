// pages/privacy/privacy.js
Page({
  data: {},

  onLoad() {
    console.log('隐私协议页面加载完成')
  },

  // 用户点击"同意"
  onAgree() {
    wx.setStorageSync('privacy_agreed', true)
    wx.navigateBack()
  }
})
