// pages/report/index.js
// 变量名严格对齐 index.wxml 绑定字段（2026-05-23 重写版）

const { PROV_BASE, CC_BASE } = require('../../data/pension')

const PERSON_TYPE_LABELS = {
  male:      '企业职工·男',
  fw:        '企业职工·女（原50岁退休）',
  fc:        '企业职工·女（原55岁退休）',
  eco_male:  '灵活就业·男',
  eco_female:'灵活就业·女',
}
const CITY_LABELS = { cc: '长春市', prov: '吉林省其他地区' }

Page({
  data: {
    // 一、人员信息
    personTypeText: '',
    inputCity: '',
    inputBirth: '',
    inputWork: '',
    inputRetireDate: '',
    inputRetireAge: '',
    showFlex: false,
    flexRetireDate: '',
    flexRetireAge: '',

    // 二、缴费信息
    inputTotalYears: '',
    inputSightYears: '',
    inputActualYears: '',
    avgIndexText: '',
    avgIndexClass: '',
    inputAcc: '',

    // 三、法定退休养老金计算
    baseRetireText: '',
    baseProvText: '',
    inputTotalYearsCalc: '',
    avgIndexTextCalc: '',
    basicAmountText: '',
    monthsText: '',
    personalAmountText: '',
    sightYearsText: '',
    transAmountText: '',
    extraAmountText: '0.00',
    extraFormulaText: '',
    extraSubstitute: '',
    bonusAmountText: '0.00',
    bonusDescText: '',
    totalPensionText: '',

    // 四、弹性提前退休
    flexBaseRetireText: '',
    flexBaseProvText: '',
    flexMonthsText: '',
    flexBasicAmountText: '',
    flexPersonalAmountText: '',
    flexAccText: '',
    flexSightYearsText: '',
    flexTransAmountText: '',
    flexExtraAmountText: '0.00',
    flexExtraFormulaText: '',
    flexExtraSubstitute: '',
    flexTotalYearsText: '',
    flexTotalYearsCalc: '',
    flexTotalAmountText: '',
    diffText: '',

    // 五、历年缴费明细
    yearlyList: [],

    // 六、重要说明
    baseYearText: '',
    baseSourceText: '',
    hasPrediction: false,

    // 七、免责
    reportDate: '',
  },

  onLoad() {
    const app = getApp()
    const result = app.globalData.calcResult || {}
    const input  = app.globalData.pensionInput || {}

    if (!result.legal) {
      this._pendingFill = true
    } else {
      this._doFill(result, input)
      this._pendingFill = false
    }
  },

  onShow() {
    if (!this._pendingFill) return
    const app = getApp()
    const result = app.globalData.calcResult || {}
    const input  = app.globalData.pensionInput || {}
    if (result.legal) {
      this._doFill(result, input)
      this._pendingFill = false
    }
  },

  // ──────────────────────────────────────────────
  // 核心填充逻辑（只写一次，onLoad/onShow 共用）
  // ──────────────────────────────────────────────
  _doFill(result, input) {
    const legal = result.legal || result
    const flex  = result.flex || null
    const showFlex = result.canFlex || !!(flex && flex.total > 0)

    const birthDate  = input.birthDate || '1970-01'
    const workDate   = input.workDate  || '1995-01'
    const bp = birthDate.split('-')
    const wp = workDate.split('-')
    const birthYear  = parseInt(bp[0]) || 1970
    const birthMonth = parseInt(bp[1]) || 1
    const workYear   = parseInt(wp[0]) || 1995
    const workMonth  = parseInt(wp[1]) || 1

    // ── 一、人员信息 ────────────────────────
    const personTypeText = PERSON_TYPE_LABELS[input.personType] || input.personType || ''
    const inputCity     = input.cityLabel || CITY_LABELS[input.city] || input.city || ''

    const inputBirth   = birthYear + '年' + String(birthMonth).padStart(2, '0') + '月'
    const inputWork    = workYear + '年' + String(workMonth).padStart(2, '0') + '月'

    // 退休时间（优先用引擎返回的 legalDate / legalTotalMonths）
    const legalDate       = result.legalDate || {}
    const legalTotalMonths = result.legalTotalMonths || 0
    const retireYear  = legalDate.year  || (birthYear + this._calcRetireAge(input.personType))
    const retireMonth = legalDate.month || birthMonth
    const inputRetireDate = retireYear + '年' + String(retireMonth).padStart(2, '0') + '月'

    const retireAgeYears  = legalTotalMonths > 0 ? Math.floor(legalTotalMonths / 12) : this._calcRetireAge(input.personType)
    const retireAgeMonths = legalTotalMonths > 0 ? (legalTotalMonths % 12) : 0
    const inputRetireAge = retireAgeMonths > 0
      ? retireAgeYears + '岁' + retireAgeMonths + '个月'
      : retireAgeYears + '岁'

    // 弹性退休时间
    let flexRetireDate = ''
    let flexRetireAge  = ''
    if (showFlex) {
      const fd = result.flexDate || {}
      const fm = result.flexTotalMonths || 0
      if (fd.year) {
        flexRetireDate = fd.year + '年' + String(fd.month || 1).padStart(2, '0') + '月'
        const fAgeYears  = fm > 0 ? Math.floor(fm / 12) : (fd.year - birthYear)
        const fAgeMonths = fm > 0 ? (fm % 12) : (fd.month >= birthMonth ? fd.month - birthMonth : 12 - birthMonth + fd.month)
        flexRetireAge = fAgeMonths > 0
          ? fAgeYears + '岁' + fAgeMonths + '个月'
          : fAgeYears + '岁'
      }
    }

    // ── 二、缴费信息 ────────────────────────
    const totalYearsNum  = legal.totalYears || 0
    const sightYearsNum  = legal.sightYears || 0
    const actualYearsNum = Math.max(0, totalYearsNum - sightYearsNum)
    const inputTotalYears   = totalYearsNum.toFixed(2) + '年'
    const inputSightYears  = sightYearsNum.toFixed(2) + '年'
    const inputActualYears = actualYearsNum.toFixed(2) + '年'

    const avgIndexNum   = result.avgIndex || input.avgIndex || 0
    const avgIndexText  = avgIndexNum.toFixed(4)
    const avgIndexClass = avgIndexNum < 0.6 ? 'idx-red' : avgIndexNum < 1.0 ? 'idx-blue' : 'idx-green'

    const personalAcc = result.personalAcc || 0
    const inputAcc = '¥' + personalAcc.toFixed(2)

    // ── 三、法定退休养老金计算 ──────────────
    const retireYear4Calc = retireYear
    const baseRetireNum = legal.baseRetire || PROV_BASE[retireYear4Calc] || PROV_BASE[2025] || 0
    const baseProvNum    = legal.baseProv   || PROV_BASE[retireYear4Calc] || PROV_BASE[2025] || 0

    const baseRetireText = '¥' + baseRetireNum
    const baseProvText   = '¥' + baseProvNum
    const inputTotalYearsCalc = totalYearsNum.toFixed(2)
    const avgIndexTextCalc  = avgIndexNum.toFixed(4)

    // 基础养老金
    const basicAmountText = '¥' + ((legal.basicPension || 0).toFixed(2))

    // 个人账户养老金
    const monthsNum = legal.months || 139
    const personalAmountText = '¥' + ((legal.personalPension || 0).toFixed(2))
    const monthsText = String(monthsNum)

    // 过渡性养老金
    const sightYearsText  = sightYearsNum.toFixed(2) + '年'
    const transAmountText = '¥' + ((legal.transPension || 0).toFixed(2))

    // 增发养老金（公式 + 代入过程）
    const extraNum = legal.extraPension || 0
    const extraAmountText = extraNum.toFixed(2)
    let extraSubstitute = ''
    if (extraNum > 0) {
      const seg1 = Math.min(5, Math.max(0, totalYearsNum - 20))
      const seg2 = Math.min(5, Math.max(0, totalYearsNum - 25))
      const seg3 = Math.max(0, totalYearsNum - 30)
      extraSubstitute = '代入：'
      if (seg1 > 0) extraSubstitute += baseProvNum + ' × ' + seg1.toFixed(2) + '年 × ' + avgIndexText + ' × 0.15%'
      if (seg2 > 0) extraSubstitute += (seg1 > 0 ? ' + ' : '') + baseProvNum + ' × ' + seg2.toFixed(2) + '年 × ' + avgIndexText + ' × 0.20%'
      if (seg3 > 0) extraSubstitute += ((seg1 + seg2) > 0 ? ' + ' : '') + baseProvNum + ' × ' + seg3.toFixed(2) + '年 × ' + avgIndexText + ' × 0.25%'
    }
    const extraFormulaText = extraNum > 0
      ? '实际缴费>20年部分，分段增发（0.15%/0.20%/0.25%）'
      : '无'

    // 其它加发（劳模/职称）
    const bonusNum     = legal.bonusPension || 0
    const bonusAmountText = bonusNum.toFixed(2)
    const bonusDescText   = legal.bonusDesc || (bonusNum > 0 ? '按劳模/职称规则计算' : '无')

    // 合计
    const totalPensionText = '¥' + ((legal.total || 0).toFixed(2))

    // ── 四、弹性提前退休（所有变量先给默认值）──
    let flexBaseRetireText = ''
    let flexBaseProvText   = ''
    let flexMonthsText     = ''
    let flexBasicAmountText   = ''
    let flexPersonalAmountText = ''
    let flexAccText         = ''
    let flexSightYearsText   = ''
    let flexTransAmountText   = ''
    let flexExtraAmountText   = '0.00'
    let flexExtraFormulaText  = ''
    let flexExtraSubstitute   = ''
    let flexTotalYearsText  = ''
    let flexTotalYearsCalc  = ''
    let flexTotalAmountText = ''
    let diffText = ''

    if (showFlex && flex) {
      const fBaseRetireNum = flex.baseRetire || baseRetireNum
      const fBaseProvNum   = flex.baseProv   || baseProvNum
      flexBaseRetireText = '¥' + fBaseRetireNum
      flexBaseProvText   = '¥' + fBaseProvNum
      flexMonthsText     = String(flex.months || 170)
      flexBasicAmountText   = '¥' + ((flex.basicPension || 0).toFixed(2))

      // 个人账户（直接用引擎结果）
      const fAcc = flex.personalAcc || 0
      flexPersonalAmountText = '¥' + ((flex.personalPension || 0).toFixed(2))
      flexAccText           = '¥' + fAcc.toFixed(2)

      flexSightYearsText   = (flex.sightYears || sightYearsNum).toFixed(2) + '年'
      flexTransAmountText   = '¥' + ((flex.transPension || 0).toFixed(2))

      // 弹性缴费年限（用引擎返回的 flex.totalYears）
      const fTotalYearsNum   = flex.totalYears || totalYearsNum
      flexTotalYearsCalc  = fTotalYearsNum.toFixed(2)
      flexTotalYearsText  = fTotalYearsNum.toFixed(2) + '年'

      // 弹性增发（分段代入）
      const fExtraNum = flex.extraPension || 0
      flexExtraAmountText = fExtraNum.toFixed(2)
      if (fExtraNum > 0) {
        const fSeg1 = Math.min(5, Math.max(0, fTotalYearsNum - 20))
        const fSeg2 = Math.min(5, Math.max(0, fTotalYearsNum - 25))
        const fSeg3 = Math.max(0, fTotalYearsNum - 30)
        flexExtraSubstitute = '代入：'
        if (fSeg1 > 0) flexExtraSubstitute += fBaseProvNum + ' × ' + fSeg1.toFixed(2) + '年 × ' + avgIndexText + ' × 0.15%'
        if (fSeg2 > 0) flexExtraSubstitute += (fSeg1 > 0 ? ' + ' : '') + fBaseProvNum + ' × ' + fSeg2.toFixed(2) + '年 × ' + avgIndexText + ' × 0.20%'
        if (fSeg3 > 0) flexExtraSubstitute += ((fSeg1 + fSeg2) > 0 ? ' + ' : '') + fBaseProvNum + ' × ' + fSeg3.toFixed(2) + '年 × ' + avgIndexText + ' × 0.25%'
      }

      flexTotalAmountText = '¥' + ((flex.total || 0).toFixed(2))
      const diff = Math.round(((legal.total || 0) - (flex.total || 0)) * 100) / 100
      diffText = (diff >= 0 ? '+' : '') + diff.toFixed(2)
    }

    // ── 五、历年缴费明细 ─────────────────────
    const PROV_BASE = app.globalData.PROV_BASE || {}
    const CC_BASE   = app.globalData.CC_BASE   || {}
    const yearlyList = this._buildYearlyList(input.yearData, PROV_BASE, CC_BASE, input.city)

    // ── 六、重要说明 ────────────────────────
    const baseYearText  = retireYear4Calc >= 2026 ? retireYear4Calc + '年（预测）' : retireYear4Calc + '年（已公布）'
    const baseSourceText = retireYear4Calc >= 2026 ? '预测值（统一规则）' : '人社厅正式公布'
    const hasPrediction = retireYear4Calc >= 2026

    // ── 七、免责 ──────────────────────────
    const now = new Date()
    const reportDate = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日'

    // ── setData（所有变量都在上面定义好了）──
    this.setData({
      // 一
      personTypeText, inputCity, inputBirth, inputWork,
      inputRetireDate, inputRetireAge, showFlex, flexRetireDate, flexRetireAge,
      // 二
      inputTotalYears, inputSightYears, inputActualYears,
      avgIndexText, avgIndexClass, inputAcc,
      // 三
      baseRetireText, baseProvText, inputTotalYearsCalc, avgIndexTextCalc,
      basicAmountText,
      monthsText, personalAmountText,
      sightYearsText, transAmountText,
      extraAmountText, extraFormulaText, extraSubstitute,
      bonusAmountText, bonusDescText,
      totalPensionText,
      // 四
      flexBaseRetireText, flexBaseProvText, flexMonthsText,
      flexBasicAmountText, flexPersonalAmountText,
      flexAccText, flexSightYearsText, flexTransAmountText,
      flexExtraAmountText, flexExtraFormulaText, flexExtraSubstitute,
      flexTotalYearsText, flexTotalYearsCalc,
      flexTotalAmountText, diffText,
      // 五
      yearlyList,
      // 六
      baseYearText, baseSourceText, hasPrediction,
      // 七
      reportDate,
    })
  },

  // ── 历年缴费明细 ──────────────────────────
  _buildYearlyList(yearData, PROV_BASE, CC_BASE, cityType) {
    if (!yearData) return []
    const years = Object.keys(yearData).map(Number).sort((a, b) => a - b)
    return years.map(y => {
      const base = yearData[y] || 0
      const provBase = (cityType === 'cc' ? (CC_BASE[y] || 0) : (PROV_BASE[y] || 0))
      const idx = provBase > 0 ? (base / provBase) : 0
      const idxClass = idx < 0.6 ? 'idx-red' : idx < 1.0 ? 'idx-blue' : 'idx-green'
      const months = (y === (new Date()).getFullYear()) ? 6 : 12
      const deposit = Math.round(base * 0.08 * months * 100) / 100
      return {
        year: String(y),
        baseText: String(base),
        provBaseText: String(provBase),
        indexText: idx.toFixed(4),
        indexClass: idxClass,
        depositText: '¥' + deposit.toFixed(2),
      }
    })
  },

  // ── 估算退休年龄（备用）──────────────────
  _calcRetireAge(personType) {
    const map = { male: 60, fw: 50, fc: 55, eco_male: 60, eco_female: 55 }
    return map[personType] || 60
  },

  onSaveReport() {
    wx.showToast({ title: '保存功能开发中', icon: 'none' })
  },
  onBack() { wx.navigateBack() },
})
