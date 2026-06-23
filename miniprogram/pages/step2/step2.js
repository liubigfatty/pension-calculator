// pages/step2/step2.js - 缴费信息页
const app = getApp()

// 双指数省份（浙江、广东、陕西）
const DOUBLE_INDEX_PROVINCES = [10, 18, 26]  // 浙江=10, 广东=18, 陕西=26

Page({
  data: {
    // 缴费基数类型：0=灵活就业，1=按实际指数
    baseTypeNames: ['灵活就业', '按实际缴费指数'],
    baseTypeIndex: -1,

    // 灵活就业缴费档次
    levelNames: ['60%', '80%', '100%', '150%', '200%', '250%', '300%'],
    levelIndex: -1,

    // 历年缴费指数（按实际指数时填写）
    averageIndexInput: '',

    // 双指数省份相关
    showDoubleIndex: false,
    transIndexInput: '',   // 过渡性养老金指数
    oldIndexInput: '',      // 老办法指数

    // 个人账户余额
    accountBalanceInput: ''
  },

  onLoad() {
    // 检查 step1 是否已填
    const step1 = wx.getStorageSync('form_step1')
    if (!step1 || step1.provinceIndex < 0) {
      wx.showToast({ title: '请先填写个人信息', icon: 'none' })
      wx.navigateBack()
      return
    }
    
    // 判断是否为双指数省份
    const isDoubleIndex = DOUBLE_INDEX_PROVINCES.includes(step1.provinceIndex)
    console.log('[step2] 读取 step1 数据：', step1, '是否双指数省份：', isDoubleIndex)
    
    this.setData({
      showDoubleIndex: isDoubleIndex
    })
  },

  // 选择缴费基数类型
  onBaseTypeChange(e) {
    this.setData({ baseTypeIndex: Number(e.detail.value) })
  },

  // 选择缴费档次（灵活就业）
  onLevelChange(e) {
    this.setData({ levelIndex: Number(e.detail.value) })
  },

  // 输入平均缴费指数
  onIndexInput(e) {
    this.setData({ averageIndexInput: e.detail.value })
  },

  // 输入过渡性养老金指数（双指数省份）
  onTransIndexInput(e) {
    this.setData({ transIndexInput: e.detail.value })
  },

  // 输入老办法指数（双指数省份）
  onOldIndexInput(e) {
    this.setData({ oldIndexInput: e.detail.value })
  },

  // 输入个人账户余额
  onBalanceInput(e) {
    this.setData({ accountBalanceInput: e.detail.value })
  },

  // 计算养老金
  async onCalculate() {
    const d = this.data

    // 校验
    if (d.baseTypeIndex < 0) return wx.showToast({ title: '请选择缴费基数类型', icon: 'none' })
    if (d.baseTypeIndex === 2 && !d.averageIndexInput) return wx.showToast({ title: '请输入平均缴费指数', icon: 'none' })
    if (!d.accountBalanceInput) return wx.showToast({ title: '请输入个人账户余额', icon: 'none' })

    // 读取 step1 数据
    const step1 = wx.getStorageSync('form_step1')

    // 组装计算参数（调用云函数）
    wx.showLoading({ title: '计算中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'calculate',
        data: {
          provinceIndex: step1.provinceIndex,
          retireTypeIndex: step1.retireTypeIndex,
          birthYearIndex: step1.birthYearIndex,
          birthMonthIndex: step1.birthMonthIndex,
          workYearIndex: step1.workYearIndex,
          workMonthIndex: step1.workMonthIndex,
          retirePlan: step1.retirePlan,
          baseTypeIndex: d.baseTypeIndex,
          levelIndex: d.levelIndex >= 0 ? d.levelIndex : null,
          averageIndex: d.averageIndexInput ? parseFloat(d.averageIndexInput) : null,
          transIndex: d.transIndexInput ? parseFloat(d.transIndexInput) : null,
          oldIndex: d.oldIndexInput ? parseFloat(d.oldIndexInput) : null,
          accountBalance: parseFloat(d.accountBalanceInput) || 0
        }
      })

      wx.hideLoading()

      if (res.result && res.result.success) {
        // 保存结果到缓存，跳转到结果页
        wx.setStorageSync('calc_result', res.result.data)
        wx.navigateTo({ url: '/pages/result/result' })
      } else {
        wx.showToast({ title: '计算失败，请重试', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('[calculate] 调用失败：', err)
      wx.showToast({ title: '计算失败，请检查网络', icon: 'none' })
    }
  },

  // 返回上一步
  onPrev() {
    wx.navigateBack()
  }
})
