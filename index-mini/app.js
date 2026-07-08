// app.js
App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        // 云开发环境ID（复用旧AppID的个人版环境）
        env: 'pension-calculato-d8dhrr613b49c3',
        traceUser: true
      })
    }
  },
  globalData: {}
})
