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
    // 微信 AI 开发模式：账号卡片点击进入时，接收原子接口 handoff 数据
    if (typeof wx.onAgentHandoff === 'function') {
      wx.onAgentHandoff(({ pageId, path, query, payload }) => {
        this.globalData.agentHandoffs = this.globalData.agentHandoffs || {}
        this.globalData.agentHandoffs[pageId] = { path, query, payload }
      })
    }
  },
  globalData: {}
})
