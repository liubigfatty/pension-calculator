// pages/step2/step2.js - 缴费信息页
const app = getApp()

// 2025年计发基数（元/月），按省份索引 [0-30]
// 数据来源：data/provinces/*.js 的 PROV_BASE 最新年份值
const PROV_AVG_SALARY = [
  8077,  // 0:北京
  12477, // 1:天津
  8405,  // 2:河北
  8009,  // 3:山西
  7822,  // 4:内蒙古
  9905,  // 5:辽宁
  7052,  // 6:吉林
  7490,  // 7:黑龙江
  8375,  // 8:上海
  7483,  // 9:江苏
  7705,  // 10:浙江
  6738,  // 11:安徽
  6665,  // 12:福建
  7060,  // 13:江西
  9049,  // 14:山东
  7123,  // 15:河南
  7394,  // 16:湖北
  7121,  // 17:湖南
  8348,  // 18:广东
  8448,  // 19:广西
  9144,  // 20:海南
  7959,  // 21:重庆
  7908,  // 22:四川
  12636, // 23:贵州
  7324,  // 24:云南
  8289,  // 25:西藏
  8762,  // 26:陕西
  8582,  // 27:甘肃
  11892, // 28:青海
  7263,  // 29:宁夏
  8559   // 30:新疆
]

// 缴费档次对应的百分比
const LEVEL_PERCENTS = [0.6, 0.8, 1.0, 1.5, 2.0, 2.5, 3.0]

// 双指数省份（浙江、广东、陕西）
const DOUBLE_INDEX_PROVINCES = [10, 18, 26]  // 浙江=10, 广东=18, 陕西=26

// 双基数省份（河南=15, 吉林=6, 辽宁=5, 广东=18）
const DOUBLE_BASE_PROVINCES = [15, 6, 5, 18]

// 省份索引 → 云函数省份文件名（拼音，与 provinces/*.js 对应）
const PROVINCE_SLUGS = [
  'beijing','tianjin','hebei','shanxi','neimenggu',
  'liaoning','jilin','heilongjiang','shanghai','jiangsu',
  'zhejiang','anhui','fujian','jiangxi','shandong',
  'henan','hubei','hunan','guangdong','guangxi',
  'hainan','chongqing','sichuan','guizhou','yunnan',
  'xizang','shaanxi','gansu','qinghai','ningxia','xinjiang'
]

// 退休类型索引 → { gender, identity }
// step1 retireTypeNames: ['企业职工男','企业职工女（原50岁）','企业职工女（原55岁）','灵活就业男','灵活就业女']
const RETIRE_TYPE_MAP = [
  { gender: 'male',   identity: 'worker', genderType: 'male' },           // 0: 企业职工男
  { gender: 'female', identity: 'worker', genderType: 'fw50' },            // 1: 企业职工女(50)
  { gender: 'female', identity: 'worker', genderType: 'fw55' },            // 2: 企业职工女(55)
  { gender: 'male',   identity: 'flexible', genderType: 'male' },          // 3: 灵活就业男
  { gender: 'female', identity: 'flexible', genderType: 'flexFemale' }     // 4: 灵活就业女
]

Page({
  data: {
    // 缴费基数类型：0=灵活就业，1=按实际指数
    baseTypeNames: ['灵活就业', '按实际缴费指数'],

    // 日期起始年份（与 step1 保持一致）
    _BIRTH_START: 1960,
    _WORK_START: 1980,
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

    // 双基数省份相关（河南郑州、吉林长春）
    showCityType: false,
    cityTypeNames: [],
    cityTypeIndex: -1,

    // 个人账户余额
    accountBalanceInput: '',

    // 小贴士弹窗
    showBalanceTip: false
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

    // 判断是否为双基数省份，并设置城市选项
    let showCityType = false
    let cityTypeNames = []
    if (step1.provinceIndex === 15) {  // 河南（郑州）
      showCityType = true
      cityTypeNames = ['郑州市', '全省其他']
    } else if (step1.provinceIndex === 6) {  // 吉林（长春）
      showCityType = true
      cityTypeNames = ['长春市', '全省其他']
    } else if (step1.provinceIndex === 5) {  // 辽宁（沈阳、大连）
      showCityType = true
      cityTypeNames = ['沈阳市', '大连市', '全省其他']
    } else if (step1.provinceIndex === 18) {  // 广东（深圳）
      showCityType = true
      cityTypeNames = ['深圳市', '全省其他']
    }

    this.setData({
      showDoubleIndex: isDoubleIndex,
      showCityType: showCityType,
      cityTypeNames: cityTypeNames
    })
  },

  // 选择缴费基数类型
  onBaseTypeChange(e) {
    const index = Number(e.detail.value)
    this.setData({ baseTypeIndex: index }, () => {
      // 切换到"灵活就业"时，如果已选档次，自动估算余额
      if (index === 0 && this.data.levelIndex >= 0) {
        setTimeout(() => this.estimateBalance(), 50)
      }
    })
  },

  // 选择缴费档次（灵活就业）→ 自动估算余额
  onLevelChange(e) {
    this.setData({ levelIndex: Number(e.detail.value) }, () => {
      // 延迟一帧，确保 levelIndex 已更新
      setTimeout(() => this.estimateBalance(), 50)
    })
  },

  // 自动估算个人账户余额
  // 公式：计发基数 × 档次% × 8% × 12个月 × 缴费年数 × 1.4（利息系数）
  estimateBalance() {
    const step1 = wx.getStorageSync('form_step1')
    if (!step1 || step1.provinceIndex < 0) return
    if (this.data.baseTypeIndex !== 0) return   // 仅"灵活就业"时估算
    if (this.data.levelIndex < 0) return

    const provinceIndex = step1.provinceIndex
    const avgSalary = PROV_AVG_SALARY[provinceIndex]  // 元/月
    if (!avgSalary) return

    // 缴费档次 → 百分比
    const percent = LEVEL_PERCENTS[this.data.levelIndex]

    // 缴费年数 = 当前年份 − 参加工作年份（兼容新旧缓存格式）
    let workYear
    if (step1.workYearIndex != null) {
      workYear = 1960 + step1.workYearIndex
    } else if (step1.workDate) {
      // 旧格式：从 "1995-07" 解析年份
      workYear = parseInt(step1.workDate.split('-')[0])
    } else {
      workYear = 1995  // 兜底默认值
    }
    const currentYear = new Date().getFullYear()
    const contribYears = Math.max(1, currentYear - workYear)

    // 估算：计发基数 × 档次% × 8% × 12 × 缴费年数 × 1.4（利息）
    const estimated = Math.round(
      avgSalary * percent * 0.08 * 12 * contribYears * 1.4
    )

    this.setData({ accountBalanceInput: String(estimated) })
    console.log('[estimateBalance] 省份=' + provinceIndex + ' 档次=' + (percent*100) + '% 缴费年数=' + contribYears + ' 估算余额=' + estimated)
  },

  // 选择城市类型（双基数省份：郑州/长春 vs 全省其他）
  onCityTypeChange(e) {
    this.setData({ cityTypeIndex: Number(e.detail.value) })
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

  // 输入个人账户余额（可手动修改估算值）
  onBalanceInput(e) {
    this.setData({ accountBalanceInput: e.detail.value })
  },

  // 显示小贴士弹窗
  onShowBalanceTip() {
    this.setData({ showBalanceTip: true })
  },

  // 关闭小贴士弹窗
  onCloseBalanceTip() {
    this.setData({ showBalanceTip: false })
  },

  // 把 "1970-06" 转成 { yearIndex, monthIndex }
  _parseDateToIndex(dateStr, startYear) {
    if (!dateStr) return { yearIndex: -1, monthIndex: -1 }
    const [y, m] = dateStr.split('-').map(Number)
    return { yearIndex: y - startYear, monthIndex: m - 1 }
  },

  // 计算养老金
  async onCalculate() {
    const d = this.data

    // 前端校验
    if (d.baseTypeIndex < 0) return wx.showToast({ title: '请选择缴费基数类型', icon: 'none' })
    if (d.baseTypeIndex === 1 && !d.averageIndexInput) return wx.showToast({ title: '请输入平均缴费指数', icon: 'none' })
    if (!d.accountBalanceInput) return wx.showToast({ title: '请输入个人账户余额', icon: 'none' })

    const step1 = wx.getStorageSync('form_step1')
    if (!step1) return wx.showToast({ title: '请先填写个人信息', icon: 'none' })

    // ── 参数映射：小程序内部格式 → 云函数期望格式 ──

    // 1. 省份：index → 拼音 slug
    const province = PROVINCE_SLUGS[step1.provinceIndex]
    if (!province) return wx.showToast({ title: '无效的参保省份', icon: 'none' })

    // 2. 性别/人员类型：index → gender + identity
    const typeInfo = RETIRE_TYPE_MAP[step1.retireTypeIndex]
    if (!typeInfo) return wx.showToast({ title: '无效的退休类型', icon: 'none' })
    const { gender, identity, genderType } = typeInfo

    // 3. 出生日期：索引/字符串 → "YYYY-MM"
    let birthDate, workStartDate
    if (step1.birthYearIndex != null && step1.birthMonthIndex != null) {
      const by = 1960 + step1.birthYearIndex
      const bm = step1.birthMonthIndex + 1
      birthDate = `${by}-${String(bm).padStart(2, '0')}`
    } else {
      birthDate = step1.birthDate || ''
    }
    if (step1.workYearIndex != null && step1.workMonthIndex != null) {
      const wy = 1980 + step1.workYearIndex
      const wm = step1.workMonthIndex + 1
      workStartDate = `${wy}-${String(wm).padStart(2, '0')}`
    } else {
      workStartDate = step1.workDate || ''
    }

    // 4. 平均缴费指数：灵活就业档次 → 数值，或直接用用户输入值
    let averageIndex
    if (d.baseTypeIndex === 0 && d.levelIndex >= 0) {
      averageIndex = LEVEL_PERCENTS[d.levelIndex]
    } else {
      averageIndex = parseFloat(d.averageIndexInput) || 0
    }

    // 5. 双基数城市类型
    let cityType = null
    if (d.showCityType && d.cityTypeIndex >= 0) {
      if (step1.provinceIndex === 15) cityType = d.cityTypeIndex === 0 ? 'zz' : 'prov'     // 河南
      else if (step1.provinceIndex === 6) cityType = d.cityTypeIndex === 0 ? 'cc' : 'prov'  // 吉林
      else if (step1.provinceIndex === 5) {                                               // 辽宁
        cityType = d.cityTypeIndex === 0 ? 'shenyang' : d.cityTypeIndex === 1 ? 'dalian' : 'prov'
      }
      else if (step1.provinceIndex === 18) cityType = d.cityTypeIndex === 0 ? 'sz' : 'prov' // 广东
    }

    console.log('[onCalculate] 映射后参数:', { province, gender, birthDate, workStartDate, averageIndex, cityType })

    // 调用云函数
    wx.showLoading({ title: '计算中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'calculate',
        data: {
          province,
          cityType: cityType || 'prov',
          gender,
          identity,
          genderType,
          birthDate,
          workStartDate,
          averageIndex,
          personalAccount: parseFloat(d.accountBalanceInput) || 0,
          extras: {}
        }
      })

      wx.hideLoading()

      if (res.result && res.result.success) {
        wx.setStorageSync('calc_result', res.result.data)
        wx.navigateTo({ url: '/pages/result/result' })
      } else {
        const msg = (res.result && res.result.message) || '计算失败，请重试'
        console.error('[onCalculate] 云函数返回失败:', msg)
        wx.showToast({ title: msg, icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('[onCalculate] 云函数调用异常:', err)
      wx.showToast({ title: '计算失败，请检查网络', icon: 'none' })
    }
  },

  // 返回上一步
  onPrev() {
    wx.navigateBack()
  }
})
