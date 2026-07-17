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
    // 隐私合规：首次启动拉起微信系统隐私授权弹窗（P0-3）
    this.initPrivacy()
  },

  /**
   * 隐私合规授权流（P0-3）
   * - 启动时检测是否需要隐私授权，需要则拉起微信系统隐私弹窗
   * - 用户“同意”后方可使用计算；拒绝则标记未授权并提示功能受限
   * - 基础库过低无隐私接口时按已授权处理，避免阻断旧版
   */
  initPrivacy() {
    const that = this
    that.globalData.privacyAuthorized = false
    if (typeof wx.getPrivacySetting !== 'function' ||
        typeof wx.requirePrivacyAuthorize !== 'function') {
      that.globalData.privacyAuthorized = true
      return
    }
    wx.getPrivacySetting({
      success(res) {
        if (res.needAuthorization) {
          that.showPrivacyAuthorize()
        } else {
          that.globalData.privacyAuthorized = true
        }
      },
      fail() {
        // 读取失败按已授权，避免硬阻断
        that.globalData.privacyAuthorized = true
      }
    })
  },

  // 拉起微信系统隐私授权弹窗（可被页面复用，例如用户拒绝后从计算按钮重新触发）
  showPrivacyAuthorize() {
    const that = this
    if (typeof wx.requirePrivacyAuthorize !== 'function') {
      that.globalData.privacyAuthorized = true
      return
    }
    wx.requirePrivacyAuthorize({
      success() {
        that.globalData.privacyAuthorized = true
      },
      fail() {
        that.globalData.privacyAuthorized = false
        wx.showModal({
          title: '隐私授权未通过',
          content: '我们仅在本机计算你输入的缴费数据，不会上传。未同意《隐私保护指引》将限制使用本小程序的计算功能，你可在“设置”中重新授权。',
          confirmText: '重新授权',
          cancelText: '暂不',
          success(m) {
            if (m.confirm) that.showPrivacyAuthorize()
          }
        })
      }
    })
  },

  globalData: {
    privacyAuthorized: false
  }
})
