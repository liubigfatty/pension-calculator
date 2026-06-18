// pages/index/index.js
Page({
  data: {},

  onLoad() {
    console.log('首页加载完成')
  },

  // 开始测算
  onStart() {
    wx.navigateTo({
      url: '/pages/step1/step1'
    })
  }
})
