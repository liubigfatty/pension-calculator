// pages/step2/step2.js - 缴费信息页
const app = getApp()

// 计发基数选择配置（前端使用）
const { CITY_TYPE_CONFIG, DOUBLE_BASE_PROVINCES, PROV_BASE_LATEST } = require('../../data/base-rates')

// ==================== 历年记账利率（用于估算个人账户余额）====================
// 2016年及以后：全国统一记账利率（人社部公布）
const NATIONAL_INTEREST_RATES = {
  2016: 0.0831, 2017: 0.0712, 2018: 0.0829, 2019: 0.0761,
  2020: 0.0604, 2021: 0.0669, 2022: 0.0397, 2023: 0.0397,
  2024: 0.0262, 2025: 0.0150
}

// 2016年之前全国统一记账利率估算值（分段均值）
const PRE2016_RATES = {
  1996: 0.0804, 1997: 0.0567, 1998: 0.0447, 1999: 0.0225,
  2000: 0.0225, 2001: 0.0225, 2002: 0.0225, 2003: 0.0198,
  2004: 0.0198, 2005: 0.0225, 2006: 0.0252, 2007: 0.0414,
  2008: 0.0414, 2009: 0.0225, 2010: 0.0225, 2011: 0.0350,
  2012: 0.0350, 2013: 0.0300, 2014: 0.0350, 2015: 0.0350
}

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

// 省份索引 → 云函数省份文件名（拼音，与 provinces/*.js 对应）
const PROVINCE_SLUGS = [
  'beijing','tianjin','hebei','shanxi','neimenggu',
  'liaoning','jilin','heilongjiang','shanghai','jiangsu',
  'zhejiang','anhui','fujian','jiangxi','shandong',
  'henan','hubei','hunan','guangdong','guangxi',
  'hainan','chongqing','sichuan','guizhou','yunnan',
  'xizang','shaanxi','gansu','qinghai','ningxia','xinjiang'
]
const PROVINCE_NAMES = ['北京','天津','河北','山西','内蒙古','辽宁','吉林','黑龙江','上海','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','广西','海南','重庆','四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏','新疆']

// 退休类型索引 → { gender, identity }
// step1 retireTypeNames: ['企业职工男','企业职工女（原50岁）','企业职工女（原55岁）','灵活就业男','灵活就业女']
const RETIRE_TYPE_MAP = [
  { gender: 'male',   identity: 'employee', genderType: 'male' },         // 0: 企业职工男
  { gender: 'female', identity: 'employee', genderType: 'fw50' },          // 1: 企业职工女(50)
  { gender: 'female', identity: 'employee', genderType: 'fw55' },          // 2: 企业职工女(55)
  { gender: 'male',   identity: 'flexible', genderType: 'male' },          // 3: 灵活就业男
  { gender: 'female', identity: 'flexible', genderType: 'fw55' }          // 4: 灵活就业女(55岁退休)
]

Page({
  data: {
    // 人员类型：从step1获取，决定是否显示缴费档次
    isFlexible: false,  // 是否灵活就业

    // 日期起始年份（与 step1 保持一致）
    _BIRTH_START: 1960,
    _WORK_START: 1980,

    // 灵活就业缴费档次
    levelNames: ['60%', '80%', '100%', '150%', '200%', '250%', '300%'],
    levelIndex: -1,

    // 本人平均缴费指数
    averageIndexInput: '',

    // 双指数省份相关
    showDoubleIndex: false,
    transIndexInput: '',   // 过渡性养老金指数
    oldIndexInput: '',      // 老办法指数

    // 计发基数选择（所有省份都显示）
    baseRateIndex: 0,       // 当前选择的计发基数索引
    baseRateNames: [],      // 计发基数选项名称
    baseRateValues: [],     // 计发基数选项值

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

    // 判断是否为灵活就业（根据step1的retireTypeIndex）
    const isFlexible = step1.retireTypeIndex >= 3  // 3=灵活就业男, 4=灵活就业女
    this.setData({ isFlexible })

    // 判断是否为双指数省份，控制过渡指数输入框显示
    const isDoubleIndex = DOUBLE_INDEX_PROVINCES.includes(step1.provinceIndex)
    this.setData({ showDoubleIndex: isDoubleIndex })

    // 计发基数选择（所有省份都显示）
    let baseRateNames = []
    let baseRateValues = []
    let baseRateIndex = 0

    const provinceBase = PROV_BASE_LATEST[step1.provinceIndex] || 0
    if (DOUBLE_BASE_PROVINCES.includes(step1.provinceIndex)) {
      // 双基数省份：显示城市选项
      const config = CITY_TYPE_CONFIG[step1.provinceIndex]
      baseRateNames = config.names
      baseRateValues = config.values
      // 恢复已选：从step1的cityTypeIndex
      baseRateIndex = step1.cityTypeIndex >= 0 ? step1.cityTypeIndex : 0
    } else {
      // 单基数省份：显示"全省统一计发基数"（不显示具体数额，引擎会估算到退休年份）
      baseRateNames = ['全省统一计发基数']
      baseRateValues = ['prov']
      baseRateIndex = 0
    }

    // 恢复已填数据
    const saved = wx.getStorageSync('form_step2') || {}
    this.setData({
      levelIndex: saved.levelIndex ?? -1,
      averageIndexInput: saved.averageIndexInput || '',
      accountBalanceInput: saved.accountBalanceInput || '',
      transIndexInput: saved.transIndexInput || '',
      oldIndexInput: saved.oldIndexInput || '',
      // 计发基数选择
      baseRateNames,
      baseRateValues,
      baseRateIndex,
    })
  },
  // 选择缴费档次（灵活就业）
  onLevelChange(e) {
    this.setData({ levelIndex: Number(e.detail.value) })
  },

  // 选择计发基数（双基数省份）
  onBaseRateChange(e) {
    this.setData({ baseRateIndex: Number(e.detail.value) })
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
    if (d.isFlexible && d.levelIndex < 0) return wx.showToast({ title: '请选择缴费档次', icon: 'none' })
    if (!d.isFlexible && !d.averageIndexInput) return wx.showToast({ title: '请输入本人平均缴费指数', icon: 'none' })
    // 校验指数范围（0.6~3.0 为合理区间）
    if (!d.isFlexible) {
      const idx = parseFloat(d.averageIndexInput)
      if (isNaN(idx) || idx < 0.4 || idx > 3.0) {
        return wx.showToast({ title: '指数一般为0.6-3.0，请检查', icon: 'none' })
      }
    }

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
    if (d.isFlexible && d.levelIndex >= 0) {
      averageIndex = LEVEL_PERCENTS[d.levelIndex]
    } else {
      averageIndex = parseFloat(d.averageIndexInput) || 0
    }

    // 5. 双基数城市类型（从 baseRateIndex 读取）
    let cityType = null
    if (d.baseRateIndex >= 0) {
      cityType = d.baseRateValues[d.baseRateIndex]
    }

    console.log('[onCalculate] 映射后参数:', { province, gender, identity, genderType, birthDate, workStartDate, averageIndex, cityType })

    // 存 calcInput 供 step3 页面读取（用于余额估算时的 genderType 判断）
    app.globalData.calcInput = {
      province,
      identity,
      gender,
      genderType,
      cityType: cityType || 'prov',
      birthYear: parseInt(birthDate.split('-')[0]),
      birthMonth: parseInt(birthDate.split('-')[1]),
      workYear: parseInt(workStartDate.split('-')[0]),
      workMonth: parseInt(workStartDate.split('-')[1]),
    }

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
        // 城市标签（用于结果页显示）
        let cityLabel = ''
        if (d.baseRateIndex >= 0) {
          cityLabel = d.baseRateNames[d.baseRateIndex] || ''
        }
        wx.setStorageSync('calc_result', {
          _raw: res.result.data,
          retirePlan: step1.retirePlan || 'normal',
          averageIndex: averageIndex || null,       // 传给结果页显示
          provinceName: PROVINCE_NAMES[step1.provinceIndex] || '',
          cityLabel: cityLabel
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
    if (d.isFlexible && d.levelIndex < 0) return wx.showToast({ title: '请先选择缴费档次', icon: 'none' })
    if (!d.isFlexible && !d.averageIndexInput) return wx.showToast({ title: '请先输入本人平均缴费指数', icon: 'none' })

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
    if (d.isFlexible && d.levelIndex >= 0) {
      averageIndex = LEVEL_PERCENTS[d.levelIndex]
    } else {
      averageIndex = parseFloat(d.averageIndexInput) || 0
    }

    // 双基数城市类型（从 baseRateIndex 读取）
    let cityType = null
    if (d.baseRateIndex >= 0) {
      cityType = d.baseRateValues[d.baseRateIndex]
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
