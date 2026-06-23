// pages/step2/step2.js - 缴费信息页
const app = getApp()

// 双指数省份（浙江、广东、陕西）
const DOUBLE_INDEX_PROVINCES = [10, 18, 26]  // 浙江=10, 广东=18, 陕西=26

// 缴费档次对应的指数
const LEVEL_TO_INDEX = [0.6, 0.8, 1.0, 1.5, 2.0, 2.5, 3.0]

// 省份名称列表（必须和 step1 一致）
const PROVINCE_NAMES = ['北京','天津','河北','山西','内蒙古','辽宁','吉林','黑龙江','上海','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','广西','海南','重庆','四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏','新疆']

// 退休类型 → (gender, identity) 映射（必须和云函数期望的一致）
const RETIRE_TYPE_MAP = [
  { gender: 'male',   identity: 'enterprise' },    // 0: 企业职工男
  { gender: 'female', identity: 'fw50' },           // 1: 企业职工女（原50岁退休）
  { gender: 'female', identity: 'fw55' },           // 2: 企业职工女（原55岁退休）
  { gender: 'male',   identity: 'flexible' },       // 3: 灵活就业男
  { gender: 'female', identity: 'flexible' },       // 4: 灵活就业女
]

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
    accountBalanceInput: '',

    // 预估个人账户余额（灵活就业时自动计算）
    estimatedBalance: '',
    showEstimated: false,

    // 小贴士弹窗
    showTip: false
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
    const levelIndex = Number(e.detail.value)
    this.setData({ levelIndex: levelIndex })
    // 计算预估余额
    this.calculateEstimatedBalance()
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

  // 计算预估个人账户余额（灵活就业时）
  calculateEstimatedBalance() {
    const step1 = wx.getStorageSync('form_step1')
    if (!step1 || !step1.workDate || !step1.birthDate) {
      this.setData({ showEstimated: false, estimatedBalance: '' })
      return
    }

    // 计算缴费年限（从参加工作到退休）
    const workYear = parseInt(step1.workDate.split('-')[0])
    const workMonth = parseInt(step1.workDate.split('-')[1])
    const birthYear = parseInt(step1.birthDate.split('-')[0])
    const birthMonth = parseInt(step1.birthDate.split('-')[1])

    // 粗略估算退休年龄（男60，女50/55）
    let retireYear, retireMonth
    if (step1.retireTypeIndex <= 1) {
      // 男或女干部，按60岁退休
      retireYear = birthYear + 60
      retireMonth = birthMonth
    } else {
      // 女工人，按50岁退休
      retireYear = birthYear + 50
      retireMonth = birthMonth
    }

    const years = retireYear - workYear + (retireMonth - workMonth) / 12
    const totalMonths = Math.floor(years * 12)

    if (totalMonths <= 0) {
      this.setData({ showEstimated: false, estimatedBalance: '' })
      return
    }

    // 获取当前省份的社平工资（用于计算缴费基数）
    const monthlyPay = 8000 * LEVEL_TO_INDEX[this.data.levelIndex] // 假设社平8000
    const personalRate = 0.08 // 个人账户缴费比例8%
    const monthlyToAccount = monthlyPay * personalRate
    const totalBalance = Math.floor(monthlyToAccount * totalMonths * 0.6) // 考虑利息等因素，打6折

    this.setData({
      estimatedBalance: totalBalance.toString(),
      showEstimated: true
    })
  },

  // 显示小贴士
  showTip() {
    this.setData({ showTip: true })
  },

  // 隐藏小贴士
  hideTip() {
    this.setData({ showTip: false })
  },

  // 阻止事件冒泡
  stopProp() {
    // 空方法，仅用于catchtap
  },

  // ===== 核心方法：调用云函数计算养老金 =====
  async onCalculate() {
    const d = this.data

    // ---- 校验 ----
    if (d.baseTypeIndex < 0) return wx.showToast({ title: '请选择缴费基数类型', icon: 'none' })
    if (d.baseTypeIndex === 0 && d.levelIndex < 0) return wx.showToast({ title: '请选择缴费档次', icon: 'none' })
    if (d.baseTypeIndex === 1 && !d.averageIndexInput) return wx.showToast({ title: '请输入历年缴费指数', icon: 'none' })
    if (!d.accountBalanceInput) return wx.showToast({ title: '请输入个人账户余额', icon: 'none' })

    // ---- 读取 step1 数据 ----
    const step1 = wx.getStorageSync('form_step1')

    // ---- 字段映射（小程序字段 → 云函数字段）----
    // 省份名：index → 名称
    const province = PROVINCE_NAMES[step1.provinceIndex]
    if (!province) return wx.showToast({ title: '参保地数据异常', icon: 'none' })

    // 性别和身份类型：retireTypeIndex → gender + identity
    const typeInfo = RETIRE_TYPE_MAP[step1.retireTypeIndex]
    if (!typeInfo) return wx.showToast({ title: '退休类型数据异常', icon: 'none' })

    // 日期直接传字符串 "1970-06"、"1995-07"（云函数内部会解析）
    const birthDate = step1.birthDate || ''
    const workStartDate = step1.workDate || ''

    // 缴费指数：灵活就业从档次换算，按实际直接用
    let avgIndex
    if (d.baseTypeIndex === 0) {
      avgIndex = LEVEL_TO_INDEX[d.levelIndex]   // 灵活就业：档次 → 指数
    } else {
      avgIndex = parseFloat(d.averageIndexInput) // 按实际：直接用
    }

    // ---- 组装云函数参数（字段名必须和 cloudfunctions/calculate/index.js 完全一致）----
    const cloudParams = {
      province: province,              // "吉林"
      gender: typeInfo.gender,         // "male"
      identity: typeInfo.identity,     // "flexible"
      birthDate: birthDate,            // "1970-06"
      workStartDate: workStartDate,    // "1995-07"
      averageIndex: avgIndex,          // 1.0
      personalAccount: d.accountBalanceInput,  // "114010"
      extras: {}
    }

    console.log('[step2] 云函数参数：', JSON.stringify(cloudParams))

    // ---- 调用云函数 ----
    wx.showLoading({ title: '计算中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'calculate',
        data: cloudParams
      })

      wx.hideLoading()

      console.log('[step2] 云函数返回：', JSON.stringify(res.result))

      if (res.result && res.result.success) {
        // 保存结果到缓存，跳转到结果页
        wx.setStorageSync('calc_result', res.result.data)
        wx.navigateTo({ url: '/pages/result/result' })
      } else {
        const msg = res.result?.message || '计算失败'
        wx.showToast({ title: msg, icon: 'none', duration: 3000 })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('[calculate] 调用失败：', err)
      wx.showToast({ title: '计算失败：' + err.errMsg || '网络错误', icon: 'none', duration: 3000 })
    }
  },

  // 返回上一步
  onPrev() {
    wx.navigateBack()
  }
})
