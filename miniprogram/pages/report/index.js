// pages/report/index.js
// 养老金测算报告页 — 修正版

const PERSON_TYPE_LABELS = {
  male:      '企业职工·男',
  fw:        '企业职工·女（原50岁）',
  fc:        '企业职工·女（原55岁）',
  eco_male:  '灵活就业·男',
  eco_female: '灵活就业·女',
}

const BREAKDOWN_COLORS = ['#3b82f6','#8b5cf6','#059669','#f59e0b','#ec4899']

Page({
  data: {
    reportDate: '',
    totalPensionText: '0.00',
    personTypeLabel: '',
    birthDate: '',
    workDate: '',
    retireAge: 0,
    cityLabel: '',
    totalYears: '0',
    avgIndexText: '',
    avgIndexClass: '',
    breakdownList: [],
    yearDetailList: [],
    _calcResult: null,
  },

  onLoad() {
    this.setData({ reportDate: this._formatDate(new Date()) })

    const app = getApp()
    const calcResult  = app.globalData.calcResult
    const pensionInput = app.globalData.pensionInput

    if (calcResult && pensionInput) {
      this._fillReport(calcResult, pensionInput)
    } else {
      wx.showToast({ title: '无测算数据，请重新测算', icon: 'none' })
    }
  },

  _fillReport(result, input) {
    // 防御性处理：兼容 result.legal 或直接返回结果
    const legal = result.legal || result || {}
    const total = legal.total || result.total || 0

    // 分项明细（保留值为0的项，显示"无"）
    const breakdownList = [
      {
        label: '基础养老金',
        value: legal.basicPension || 0,
        valueText: (legal.basicPension || 0).toFixed(2),
        formula: this._getBasicFormula(legal),
        color: BREAKDOWN_COLORS[0],
      },
      {
        label: '个人账户养老金',
        value: legal.personalPension || 0,
        valueText: (legal.personalPension || 0).toFixed(2),
        formula: this._getPersonalFormula(legal),
        color: BREAKDOWN_COLORS[1],
      },
      {
        label: '过渡性养老金',
        value: legal.transPension || 0,
        valueText: (legal.transPension || 0).toFixed(2),
        formula: this._getTransFormula(legal),
        color: BREAKDOWN_COLORS[2],
      },
      {
        label: '增发养老金',
        value: legal.extraPension || 0,
        valueText: (legal.extraPension || 0).toFixed(2),
        formula: (legal.extraPension || 0) > 0 ? '按劳模/职称规则计算' : '无增发',
        color: BREAKDOWN_COLORS[3],
      },
      {
        label: '其它加发',
        value: legal.bonusPension || 0,
        valueText: (legal.bonusPension || 0).toFixed(2),
        formula: legal.bonusDesc || '无',
        color: BREAKDOWN_COLORS[4],
      },
    ]

    // 计算占比（用于条形图宽度）
    const maxVal = Math.max(total, 1)
    breakdownList.forEach(it => {
      it.pct = total > 0 ? (it.value / total * 100).toFixed(1) : '0.0'
    })

    // 人员信息
    const personTypeLabel = PERSON_TYPE_LABELS[input.personType] || ''
    const cityLabel = input.city === 'cc' ? '长春市' : '吉林省其他地区'

    this.setData({
      totalPensionText: total.toFixed(2),
      personTypeLabel,
      birthDate: this._joinDate(input.birthYear, input.birthMonth),
      workDate:  this._joinDate(input.workYear,  input.workMonth),
      retireAge: legal.retireAgeExact ? Math.floor(legal.retireAgeExact) : 0,
      cityLabel,
      totalYears:  (legal.totalYears || 0).toFixed(1),
      avgIndexText: (legal.avgIndex || 0).toFixed(4),
      avgIndexClass: this._indexClass(legal.avgIndex || 0),
      breakdownList,
      _calcResult: result,
    })

    // 填充历年明细
    this._fillYearDetails(input)
  },

  _fillYearDetails(input) {
    const yearData  = input.yearData || {}
    const PROV_BASE = getApp().globalData.PROV_BASE || {}
    const list = []
    const years = Object.keys(yearData).map(Number).sort()
    for (const y of years) {
      const base    = yearData[y] || 0
      const avgWage = PROV_BASE[y] || 0
      const index   = avgWage > 0 ? base / avgWage : 0
      list.push({
        year:        y,
        baseText:    base > 0 ? '¥' + base.toLocaleString() : '--',
        avgWageText: avgWage > 0 ? '¥' + avgWage.toLocaleString() : '--',
        indexText:   index > 0 ? index.toFixed(4) : '--',
        indexClass:  index > 0 ? this._indexClass(index) : '',
      })
    }
    this.setData({ yearDetailList: list })
  },

  _indexClass(idx) {
    if (idx < 1)  return 'index-low'
    if (idx > 2)  return 'index-high'
    return 'index-mid'
  },

  _joinDate(year, month) {
    if (!year) return ''
    return year + '-' + String(month || 1).padStart(2, '0')
  },

  _getBasicFormula(legal) {
    const b1 = (legal.baseRetire || 0).toFixed(2)
    const b2 = (legal.baseProv  || 0).toFixed(2)
    const y  = (legal.totalYears || 0).toFixed(1)
    return '(' + b1 + ' + ' + b2 + ' × ' + (legal.avgIndex || 0).toFixed(4) + ') ÷ 2 × ' + y + '年 × 1%'
  },

  _getPersonalFormula(legal) {
    const acc = (legal.personalAcc || 0).toFixed(0)
    const m   = legal.months || 139
    return acc + ' ÷ ' + m + '（计发月数）'
  },

  _getTransFormula(legal) {
    const b = (legal.baseProv   || 0).toFixed(2)
    const s = (legal.sightYears || 0).toFixed(2)
    return b + ' × ' + s + '年 × 指数 × 1.4%'
  },

  // ── 事件处理 ──
  onPayReport() {
    // TODO: 接入支付，支付成功后解锁完整报告
    wx.showToast({ title: '支付功能评估中，敬请期待', icon: 'none' })
  },

  onShareReport() {
    wx.showShareMenu({ withShareTicket: true })
  },

  onCustomConsult() {
    wx.showToast({ title: '定制咨询功能评估中，敬请期待', icon: 'none' })
  },

  _formatDate(d) {
    const y   = d.getFullYear()
    const m   = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return y + '-' + m + '-' + day
  },

  onShareAppMessage() {
    return {
      title: '我的养老金测算报告 — 现实调音师',
      path: '/pages/pension/index',
    }
  },
})
