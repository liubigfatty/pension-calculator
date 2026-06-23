// pages/step2/step2.js - 缴费信息页
const app = getApp()

// 2025年计发基数（元/月），按省份索引 [0-30]
// 数据来源：data/provinces/*.js 的 PROV_BASE 最新年份值


// ==================== 历年记账利率（用于估算个人账户余额）====================
// 2016年及以后：全国统一记账利率（人社部公布）


// 2016年之前全国统一记账利率估算值（分段均值）


// 获取某年记账利率（优先查表，找不到用2.5%兜底）
function getInterestRate(year) {
  if (year >= 2016 && NATIONAL_INTEREST_RATES[year] !== undefined) {
    return NATIONAL_INTEREST_RATES[year]
  }
  if (PRE2016_RATES[year] !== undefined) return PRE2016_RATES[year]
  // 2016年后：用最近已知值（2025=1.50%）
  if (year > 2025) return NATIONAL_INTEREST_RATES[2025]
  // 1998年前：兜底2.5%
  return 0.025
}

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
  },
  // 选择缴费基数类型
  onBaseTypeChange(e) {
    const index = Number(e.detail.value)
    this.setData({ baseTypeIndex: index })
  },

  // 选择缴费档次（灵活就业）
  onLevelChange(e) {
    this.setData({ levelIndex: Number(e.detail.value) })
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

    // 5. 双基数城市类型（从 form_step1 读取）
    const _step1 = wx.getStorageSync('form_step1') || {}
    let cityType = null
    if (_step1.cityTypeIndex != null && _step1.cityTypeIndex >= 0) {
      if (step1.provinceIndex === 15) cityType = _step1.cityTypeIndex === 0 ? 'zz' : 'prov'     // 河南
      else if (step1.provinceIndex === 6) cityType = _step1.cityTypeIndex === 0 ? 'cc' : 'prov'  // 吉林
      else if (step1.provinceIndex === 5) {                                                    // 辽宁
        cityType = _step1.cityTypeIndex === 0 ? 'shenyang' : _step1.cityTypeIndex === 1 ? 'dalian' : 'prov'
      }
      else if (step1.provinceIndex === 18) cityType = _step1.cityTypeIndex === 0 ? 'sz' : 'prov' // 广东
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
        // 存缓存时包一层 _raw，兼容 result.js 的数据结构检测
        wx.setStorageSync('calc_result', {
          _raw: res.result.data,
          retirePlan: step1.retirePlan || 'normal',
          averageIndex: averageIndex || null,       // 传给结果页显示
          provinceName: step1.provinceName || '',
          cityLabel: step1.cityTypeIndex >= 0 ? (step1.cityTypeNames || '')[step1.cityTypeIndex] : ''
        })
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

  // 估算个人账户余额（供用户参考，可手动修改）
  async onEstimateBalance() {
    const d = this.data
    if (d.baseTypeIndex < 0) return wx.showToast({ title: '请先选择缴费基数类型', icon: 'none' })
    if (d.baseTypeIndex === 1 && !d.averageIndexInput) return wx.showToast({ title: '请先输入平均缴费指数', icon: 'none' })

    const step1 = wx.getStorageSync('form_step1')
    if (!step1) return wx.showToast({ title: '请先填写个人信息', icon: 'none' })

    // 参数映射（和 onCalculate 完全一致）
    const province = PROVINCE_SLUGS[step1.provinceIndex]
    const typeInfo = RETIRE_TYPE_MAP[step1.retireTypeIndex]
    if (!province || !typeInfo) return wx.showToast({ title: '参数异常', icon: 'none' })
    const { gender, identity, genderType } = typeInfo

    let birthDate, workStartDate
    if (step1.birthYearIndex != null && step1.birthMonthIndex != null) {
      birthDate = `${1960 + step1.birthYearIndex}-${String(step1.birthMonthIndex + 1).padStart(2, '0')}`
    } else {
      birthDate = step1.birthDate || ''
    }
    if (step1.workYearIndex != null && step1.workMonthIndex != null) {
      workStartDate = `${1980 + step1.workYearIndex}-${String(step1.workMonthIndex + 1).padStart(2, '0')}`
    } else {
      workStartDate = step1.workDate || ''
    }

    let averageIndex
    if (d.baseTypeIndex === 0 && d.levelIndex >= 0) {
      averageIndex = LEVEL_PERCENTS[d.levelIndex]
    } else {
      averageIndex = parseFloat(d.averageIndexInput) || 0
    }

    let cityType = null
    if (d.showCityType && d.cityTypeIndex >= 0) {
      if (step1.provinceIndex === 15) cityType = d.cityTypeIndex === 0 ? 'zz' : 'prov'
      else if (step1.provinceIndex === 6) cityType = d.cityTypeIndex === 0 ? 'cc' : 'prov'
      else if (step1.provinceIndex === 5) {
        cityType = d.cityTypeIndex === 0 ? 'shenyang' : d.cityTypeIndex === 1 ? 'dalian' : 'prov'
      }
      else if (step1.provinceIndex === 18) cityType = d.cityTypeIndex === 0 ? 'sz' : 'prov'
    }

    wx.showLoading({ title: '估算中...' })
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
          personalAccount: 0,  // 0 → 引擎自动估算
          extras: {},
          estimateOnly: true   // 快速路径，只返回估算余额
        }
      })
      wx.hideLoading()

      if (res.result && res.result.success) {
        const balance = res.result.data.estimatedBalance
        if (balance != null && balance > 0) {
          this.setData({ accountBalanceInput: String(Math.round(balance)) })
          wx.showToast({ title: '已估算并填入', icon: 'success' })
        } else {
          wx.showToast({ title: '估算失败，请手动输入', icon: 'none' })
        }
      } else {
        wx.showToast({ title: '估算失败，请稍后重试', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('[onEstimateBalance] 云函数调用异常:', err)
      wx.showToast({ title: '网络异常，请重试', icon: 'none' })
    }
  },

  // 返回上一步
  onPrev() {
    wx.navigateBack()
  }
})
