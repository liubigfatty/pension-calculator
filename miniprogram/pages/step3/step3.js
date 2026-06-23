/**
 * 根据 calcInput 计算 genderType（引擎直接使用的类型标识）
 *  male         → 'male'
 *  female+flexible → 'fw55'（灵活就业女性，55岁）
 *  female+employee+55 → 'fc'（女干部，55岁）
 *  female+employee+50 → 'fw50'（女工人，50岁）
 */
function getGenderType(input) {
  if (!input) return 'male'
  if (input.gender === 'male') return 'male'
  if (input.identity === 'flexible') return 'fw55'
  if (input.gender === 'female' && input.identity === 'employee' && input.femaleEmployeeAge === '55') return 'fc'
  return 'fw50'
}

const app = getApp()

// 加载省份元数据（assets/province-meta.js）
let PROVINCE_META = []
try {
  const raw = require('../../assets/province-meta.js')
  PROVINCE_META = raw.provinces || []
} catch (e) {
  console.warn('[step3] 加载 province-meta.js 失败：', e.message)
}

Page({
  data: {
    loading: false,
    estimating: false,  // 是否正在估算余额
    // 缴费指数
    indexOptions: [
      { label: '0.6（最低档）', value: 0.6 },
      { label: '0.8', value: 0.8 },
      { label: '1.0（基准）', value: 1.0 },
      { label: '1.5', value: 1.5 },
      { label: '2.0', value: 2.0 },
      { label: '3.0（最高档）', value: 3.0 }
    ],
    selectedIndex: 2, // 默认 1.0
    customIndex: '',
    useCustomIndex: false,

    // 个人账户余额
    accountBalance: null,
    estimatedBalance: null, // 估算值

    // 加发项（根据省份动态加载）
    hasExtra: false,
    extraType: null,   // 'extra_pension' | 'special_addition'
    extraLabel: '',
    extraValues: {},

    // 省份信息
    provinceName: '',
    cityLabel: '',

    // 表单是否可提交（每次输入后 setData 更新）
    formValid: false
  },

  onLoad() {
    const input = app.globalData.calcInput || {}
    const provCode = input.province || ''

    // 从 province-meta.json 读取省份配置
    const meta = PROVINCE_META.find(p => p.code === provCode) || {}
    const hasExtra = !!meta.hasExtra
    const extraType = meta.extraType || null
    const extraLabel = meta.extraLabel || ''

    // 用默认指数 1.0 估算余额（异步，不阻塞 UI）
    this.estimateBalanceProperly(provCode, input.cityType, 1.0)

    this.setData({
      provinceName: meta.name || provCode,
      cityLabel: this.getCityLabel(input.cityType, meta),
      hasExtra,
      extraType,
      extraLabel
      // accountBalance + formValid 由 estimateBalanceProperly 异步回填
    })
  },

  // 更新表单可提交状态（每次输入后调用）
  updateFormValid() {
    const idx = this.getSelectedIndexValue()
    const balance = parseFloat(this.data.accountBalance)
    const valid = !!(idx && idx > 0 && balance >= 0)
    if (valid !== this.data.formValid) {
      this.setData({ formValid: valid })
    }
  },

  // 获取城市类型标签
  getCityLabel(cityType, meta) {
    if (!cityType || cityType === 'prov') return '全省统一基数'
    const labels = meta.cityTypeLabels || {}
    return labels[cityType] || cityType
  },

  // 正确的余额估算：调用云函数，让引擎按记账利率复利计算
  estimateBalanceProperly(provCode, cityType, avgIndex) {
    const input = app.globalData.calcInput || {}
    if (!input.birthYear || !input.workYear) {
      console.warn('[step3] 缺少出生/工作日期，无法估算余额')
      return
    }

    this.setData({ estimating: true })

    const pad = n => String(n).padStart(2, '0')

    // 退休方式映射（与 onCalculate 保持一致）
    const rtMap = { normal: 'standard', early: 'early' }
    const rt = rtMap[input.retirementType] || 'standard'

    const params = {
      province: provCode,
      cityType: cityType || 'prov',
      gender: input.gender,
      identity: input.identity,
      genderType: getGenderType(input),
      birthDate: `${input.birthYear}-${pad(input.birthMonth)}`,
      workStartDate: `${input.workYear}-${pad(input.workMonth)}`,
      averageIndex: avgIndex,
      personalAccount: 0,  // 传 0，让引擎估算
      retireType: rt  // ✅ 传入退休方式，影响余额估算（提前退休=更少缴费月数）
    }

    wx.cloud.callFunction({
      name: 'calculate',
      data: params,
      success: (res) => {
        this.setData({ estimating: false })
        if (res.result && res.result.success) {
          const raw = res.result.data || {}
          // 根据退休方式选择数据源：弹性提前退休用 flex，否则用 legal
          const source = rt === 'early' && raw.flex ? raw.flex : raw.legal
          const balance = source?.personalAccount?.balance
          console.log('[step3] 引擎估算余额:', balance, '(退休方式:', rt, ', 数据源:', rt === 'early' && raw.flex ? 'flex' : 'legal', ')')
          this.setData({
            estimatedBalance: balance,
            accountBalance: balance != null ? String(Math.round(balance)) : null
          }, () => {
            this.updateFormValid()  // 估算值回填后更新按钮状态
          })
        } else {
          console.error('[step3] 估算余额失败:', res.result?.message)
          this.setData({ accountBalance: null }, () => {
            this.updateFormValid()
          })
        }
      },
      fail: (err) => {
        this.setData({ estimating: false })
        console.error('[step3] 估算余额调用失败:', err)
        this.setData({ accountBalance: null }, () => {
          this.updateFormValid()
        })
      }
    })
  },

  // 选择预设指数
  onIndexSelect(e) {
    const idx = e.currentTarget.dataset.idx
    const input = app.globalData.calcInput || {}
    const provCode = input.province || ''
    const newIndex = parseInt(idx)
    const newAvgIndex = this.data.indexOptions[newIndex].value

    this.setData({
      selectedIndex: newIndex,
      useCustomIndex: false,
      customIndex: ''
    })
    this.updateFormValid()

    // 重新估算账户余额（指数变化会影响估算值）
    this.estimateBalanceProperly(provCode, input.cityType, newAvgIndex)
  },

  // 切换手动输入
  onCustomIndexTap() {
    this.setData({ useCustomIndex: !this.data.useCustomIndex })
  },

  // 缴费指数输入
  onIndexInput(e) {
    this.setData({ customIndex: e.detail.value })
    this.updateFormValid()
    // 自定义指数变化时也重新估算
    const val = parseFloat(e.detail.value)
    if (!isNaN(val) && val > 0) {
      const input = app.globalData.calcInput || {}
      const provCode = input.province || ''
      this.estimateBalanceProperly(provCode, input.cityType, val)
    }
  },

  // 账户余额输入
  onBalanceInput(e) {
    this.setData({ accountBalance: e.detail.value })
    this.updateFormValid()
  },

  // 加发项输入
  onExtraInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`extraValues.${key}`]: e.detail.value })
  },

  onPrev() {
    wx.navigateBack()
  },

  // 获取缴费指数（支持预设 + 手动）
  getSelectedIndexValue() {
    if (this.data.useCustomIndex) {
      const v = parseFloat(this.data.customIndex)
      return isNaN(v) ? null : v
    }
    return this.data.indexOptions[this.data.selectedIndex].value
  },

  onCalculate() {
    if (this.data.loading) return

    const idx = this.getSelectedIndexValue()
    if (!idx || idx <= 0) {
      wx.showToast({ title: '请选择有效的缴费指数', icon: 'none' })
      return
    }

    const balance = parseFloat(this.data.accountBalance)
    if (!balance || balance < 0) {
      wx.showToast({ title: '请输入个人账户余额', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    const input = app.globalData.calcInput || {}

    // ⚠️ retireType 必须在 params 之前定义！（之前在 params 之后导致 TDZ 错误）
    const retireTypeMap = { normal: 'standard', early: 'early' }
    const retireType = retireTypeMap[input.retirementType] || 'standard'
    const isEarly = retireType === 'early'

    // 构造日期字符串格式 YYYY-MM
    const pad = n => String(n).padStart(2, '0')
    const params = {
      province: input.province,
      cityType: input.cityType || 'prov',
      gender: input.gender,
      identity: input.identity,
      genderType: getGenderType(input),
      birthDate: `${input.birthYear}-${pad(input.birthMonth)}`,
      workStartDate: `${input.workYear}-${pad(input.workMonth)}`,
      averageIndex: idx,
      personalAccount: balance,
      extras: this.data.extraValues,
      retireType: retireType  // ✅ 正确传入：'standard'法定 / 'early'弹性提前
    }

    wx.cloud.callFunction({
      name: 'calculate',
      data: params,
      success: (res) => {
        this.setData({ loading: false })
        if (res.result && res.result.success) {
          const raw = res.result.data || {}
          const legal = raw.legal || {}
          const flex = raw.flex || {}
          const meta = raw.metaData || {}

          // ✅ 根据退休方式选择数据源（核心修复！）
          //   弹性提前退休 → 用 flex 数据（更早退休年龄、更少缴费年限、更低养老金）
          //   法定年龄退休 → 用 legal 数据
          const source = isEarly && flex.total ? flex : legal

          // 辅助函数
          const safeNum = (v) => (v != null && !isNaN(v) && isFinite(v) ? v : null)
          const fmt = (v, d = 2) => v != null ? Number(v).toFixed(d) : null

          // 从正确的数据源提取金额
          const totalAmount = fmt(source.total)
          const basePension = fmt(source.basicPension?.amount)
          const personalPension = fmt(source.personalAccount?.amount || source.personalAccountPension?.amount)
          const transitionPension = fmt(source.transitionalPension?.amount)
          const extraPension = fmt((source.extraPension?.amount || 0) + (source.specialAddition?.amount || 0))

          console.log('[step3] 计算结果映射:', {
            retireType, isEarly, source: isEarly ? 'flex' : 'legal',
            totalAmount, basePension, personalPension,
            sourceTotal: source.total,
            legalTotal: legal.total,
            flexTotal: flex.total
          })

          app.globalData.calcResult = {
            // 核心金额（从正确的数据源提取）
            totalAmount,
            basePension,
            personalPension,
            transitionPension,
            extraPension,
            // 计算参数（从正确的数据源提取）
            workYears: fmt(source.totalYears || meta.totalYears),
            averageIndex: idx,
            accountBalance: fmt(balance, 0),
            months: source.months || meta.months || null,
            retireAge: source.ageStr || null,  // ✅ 弹性提前时显示 60岁X月，不是62岁
            baseNumber: fmt(source.baseRetire),
            // 退休日期（用于精确年龄计算）
            retireYear: source.date?.year || null,
            retireMonth: source.date?.month || null,
            // 地区
            provinceName: meta.name || '',
            cityLabel: this.getCityLabel(params.cityType, meta),
            // 出生日期（用于 result 页精确年龄计算）
            birthYear: input.birthYear,
            birthMonth: input.birthMonth,
            // 退休方式（用于 result 页显示文案）
            retirementType: input.retirementType || 'normal',
            // 保留原始数据（result 页 fallback 用）
            _raw: raw
          }
          console.log('[step3] 计算结果:', JSON.stringify(app.globalData.calcResult))
          wx.navigateTo({ url: '/pages/result/result' })
        } else {
          wx.showModal({
            title: '计算失败',
            content: res.result?.message || '未知错误',
            showCancel: false
          })
        }
      },
      fail: (err) => {
        this.setData({ loading: false })
        wx.showModal({
          title: '计算失败',
          content: err.message || '网络错误，请重试',
          showCancel: false
        })
      }
    })
  }
})
