// pages/step2/step2.js
const app = getApp()

const NOW_YEAR = new Date().getFullYear()
const MIN_BIRTH_YEAR = 1960
const DEFAULT_BIRTH = { year: 1970, month: 6 }

// 延迟退休规则（国发〔2024〕14号）
// 2025-01-01 起实施，渐进式延迟：
//   男职工：每4个月延迟1个月，最终延至63岁
//   女干部/灵活就业：每4个月延迟1个月，最终延至58岁
//   女工人：每2个月延迟1个月，最终延至55岁
function getRetireAgeInfo(birthYear, birthMonth, gender, identity) {
  if (!birthYear || !birthMonth || !gender) return null

  // 法定退休年龄基准（延迟前）
  let baseAge
  if (gender === 'male') {
    baseAge = 60
  } else if (identity === 'employee') {
    baseAge = 50 // 女职工默认50，可由用户选择55
  } else {
    baseAge = 55 // 灵活就业女性55
  }

  const retireDate = new Date(birthYear + baseAge, birthMonth - 1)
  const delayStart = new Date(2025, 0) // 2025-01-01

  if (retireDate < delayStart) {
    // 2025年之前退休，不延迟
    return {
      baseAge,
      delayedYears: baseAge,
      delayedMonths: 0,
      display: `${baseAge}岁`
    }
  }

  // 需要延迟：计算延迟月数
  // monthsAfterDelayStart = 退休日期距离 2025-01-01 的月数
  const monthsAfterDelayStart =
    (retireDate.getFullYear() - 2025) * 12 +
    (retireDate.getMonth() - 0)

  // 渐进式延迟规则
  let monthsPerDelay  // 每多少个月延迟1个月
  if (gender === 'male' || identity !== 'employee') {
    monthsPerDelay = 4 // 男 / 女干部/灵活就业：每4个月延1个月
  } else {
    monthsPerDelay = 2 // 女工人：每2个月延1个月
  }

  // 延迟月数 = floor((monthsAfterDelayStart) / monthsPerDelay) + 1
  // 但第1个月内（0~monthsPerDelay-1）延迟1个月
  const delayMonths = Math.floor(monthsAfterDelayStart / monthsPerDelay) + 1

  // 实际退休年龄 = 基准年龄 + 延迟的年数
  const delayYears = Math.floor(delayMonths / 12)
  const delayExtraMonths = delayMonths % 12
  const actualAge = baseAge + delayYears
  const actualMonths = delayExtraMonths

  return {
    baseAge,
    delayedYears: actualAge,
    delayedMonths: actualMonths,
    display: `${actualAge}岁${actualMonths > 0 ? '+' + actualMonths + '个月' : ''}`
  }
}

Page({
  data: {
    gender: '',
    identity: '',

    // 出生日期相关
    birthYear: MIN_BIRTH_YEAR,
    birthMonth: DEFAULT_BIRTH.month,

    // 参加工作时间
    workYear: 1995,              // 默认1995年
    workMonth: 7,                 // 默认7月

    // 女职工退休年龄选择（仅女职工显示）
    femaleEmployeeAge: '50',       // 50 或 55

    // 退休年龄预览
    retirePreview: '',

    // 日期范围
    birthYearRange: [],
    workYearRange: [],

    isValid: false
  },

  onLoad() {
    const saved = app.globalData.calcInput || {}

    // 构建年份选择器数据
    const birthYears = []
    for (let y = MIN_BIRTH_YEAR; y <= NOW_YEAR; y++) {
      birthYears.push(y)
    }
    const workYears = []
    for (let y = MIN_BIRTH_YEAR; y <= NOW_YEAR; y++) {
      workYears.push(y)
    }

    // 恢复已填数据或使用默认值
    const birthYr = saved.birthYear || DEFAULT_BIRTH.year
    const birthMo = saved.birthMonth || DEFAULT_BIRTH.month
    const workYr = saved.workYear || 1995
    const workMo = saved.workMonth || 7

    this.setData({
      gender: saved.gender || '',
      identity: saved.identity || '',
      birthYear: birthYr,
      birthMonth: birthMo,
      workYear: workYr,
      workMonth: workMo,
      femaleEmployeeAge: saved.femaleEmployeeAge || '50',
      birthYearRange: birthYears,
      workYearRange: workYears
    })

    this.updateRetirePreview()
    this.checkValid()
  },

  // 选择性别
  onGenderSelect(e) {
    this.setData({ gender: e.currentTarget.dataset.value })
    this.updateRetirePreview()
    this.checkValid()
  },

  // 选择人员类型
  onIdentitySelect(e) {
    this.setData({ identity: e.currentTarget.dataset.value })
    this.updateRetirePreview()
    this.checkValid()
  },

  // 女职工退休年龄选择
  onFemaleAgeSelect(e) {
    this.setData({ femaleEmployeeAge: e.currentTarget.dataset.value })
    this.updateRetirePreview()
  },

  // 出生年份变化 → 自动调整参加工作时间
  onBirthYearChange(e) {
    const yr = parseInt(this.data.birthYearRange[e.detail.value])
    const defaultWorkYear = yr + 18
    this.setData({
      birthYear: yr,
      workYear: Math.max(defaultWorkYear, this.data.workYear < defaultWorkYear ? defaultWorkYear : this.data.workYear)
    })
    this.updateRetirePreview()
    this.checkValid()
  },

  onBirthMonthChange(e) {
    this.setData({ birthMonth: parseInt(e.detail.value) + 1 })
    this.updateRetirePreview()
    this.checkValid()
  },

  onWorkYearChange(e) {
    this.setData({ workYear: parseInt(this.data.workYearRange[e.detail.value]) })
    this.checkValid()
  },

  onWorkMonthChange(e) {
    this.setData({ workMonth: parseInt(e.detail.value) + 1 })
    this.checkValid()
  },

  // 更新退休年龄预览
  updateRetirePreview() {
    const { gender, identity, birthYear, birthMonth, femaleEmployeeAge } = this.data
    if (!gender || !birthYear || !birthMonth) {
      this.setData({ retirePreview: '' })
      return
    }

    // 如果是女职工且选了55岁，临时用55计算预览
    let effectiveIdentity = identity
    let effectiveBaseAge = null
    if (gender === 'female' && identity === 'employee' && femaleEmployeeAge === '55') {
      effectiveBaseAge = 55
    }

    const info = getRetireAgeInfo(birthYear, birthMonth, gender, identity)
    if (info) {
      let display = info.display
      if (effectiveBaseAge === 55) {
        display = `约${parseInt(info.delayedYears) + 5}岁（按女干部55岁基准）`
      }
      this.setData({ retirePreview: `预计退休年龄：${display}` })
    }
  },

  checkValid() {
    const { gender, identity, birthYear, birthMonth, workYear, workMonth } = this.data
    this.setData({
      isValid: !!(
        gender &&
        identity &&
        birthYear &&
        birthMonth &&
        workYear &&
        workMonth &&
        workYear >= birthYear + 16 // 至少工作满16年才合理
      )
    })
  },

  onPrev() {
    wx.navigateBack()
  },

  onNext() {
    if (!this.data.isValid) {
      // 详细验证提示
      const { gender, identity, birthYear, birthMonth, workYear, workMonth } = this.data
      let errorMsg = ''
      
      if (!gender) {
        errorMsg = '请选择性别'
      } else if (!identity) {
        errorMsg = '请选择人员类型'
      } else if (!birthYear || !birthMonth) {
        errorMsg = '请选择出生年月'
      } else if (!workYear || !workMonth) {
        errorMsg = '请选择参加工作日期'
      } else if (workYear < birthYear + 16) {
        errorMsg = '参加工作时间必须满16周岁'
      } else {
        errorMsg = '请填写完整信息'
      }
      
      wx.showToast({ title: errorMsg, icon: 'none', duration: 2000 })
      return
    }

    const calcInput = app.globalData.calcInput || {}
    Object.assign(calcInput, {
      gender: this.data.gender,
      identity: this.data.identity,
      birthYear: this.data.birthYear,
      birthMonth: this.data.birthMonth,
      workYear: this.data.workYear,
      workMonth: this.data.workMonth,
      femaleEmployeeAge: this.data.gender === 'female' && this.data.identity === 'employee'
        ? this.data.femaleEmployeeAge
        : undefined
    })

    app.globalData.calcInput = calcInput
    wx.navigateTo({ url: '/pages/step3/step3' })
  }
})
