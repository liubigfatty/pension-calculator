// pages/pension/index.js
const { calculatePension } = require('../../utils/pension-calc')
const { PROV_BASE, INTEREST_RATE, MODULES, MODULE_LABELS, MODULE_FORMULAS, CITY_LIST, CC_BASE, BASE_PARAMS } = require('../../data/pension')

// 预测某年社平工资（平台函数，省份数据文件提供参数）
function predictWage(year, cityType) {
  if (cityType === 'cc') {
    if (CC_BASE[year]) return CC_BASE[year]
    const years = year - 2025
    if (years <= 0) return CC_BASE[2025] || 7978.25
    return Math.round(BASE_PARAMS.CC_2025 * Math.pow(1 + BASE_PARAMS.CC_GROWTH, years))
  } else {
    if (PROV_BASE[year]) return PROV_BASE[year]
    const years = year - 2025
    if (years <= 0) return PROV_BASE[2025] || 7322.08
    return Math.round(BASE_PARAMS.PROV_2025 * Math.pow(1 + BASE_PARAMS.PROV_GROWTH, years))
  }
}

const TIER_MAP = {
  60: 0.6, 70: 0.7, 80: 0.8, 90: 0.9,
  100: 1.0, 150: 1.5, 200: 2.0, 250: 2.5, 300: 3.0
}

const PERSON_TYPES = [
  { label: '企业职工·男', value: 'male' },
  { label: '企业职工·女（原50岁）', value: 'fw' },
  { label: '企业职工·女（原55岁）', value: 'fc' },
  { label: '灵活就业·男', value: 'eco_male' },
  { label: '灵活就业·女', value: 'eco_female' },
]

// personType → 引擎需要的 genderType + userType
const PERSON_TYPE_MAP = {
  male:      { genderType: 'male',   userType: 'standard' },
  fw:        { genderType: 'fw',     userType: 'standard' },
  fc:        { genderType: 'fc',     userType: 'standard' },
  eco_male:  { genderType: 'male',   userType: 'flexible' },
  eco_female:{ genderType: 'fw55',  userType: 'flexible' },
}

// 其他加发选项（单选：无/省级劳模/市级劳模/中级职称/高级职称）
const BONUS_OPTIONS = [
  { label: '无', province: false, city: false, mid: false, high: false },
  { label: '省级劳模（加发10%）', province: true, city: false, mid: false, high: false },
  { label: '市级劳模（加发5%）', province: false, city: true, mid: false, high: false },
  { label: '中级职称（加发15元/月）', province: false, city: false, mid: true, high: false },
  { label: '高级职称（加发25元/月）', province: false, city: false, mid: false, high: true },
]

Page({
  data: {
    currentStep: 1,

    // Step 1
    provinceList: ['吉林省'],
    provinceIndex: 0,
    cityList: CITY_LIST,
    cityIndex: -1,
    personTypeLabels: PERSON_TYPES.map(p => p.label),
    personTypeIndex: -1,
    birthDate: '',
    workDate: '',
    // 其他加发（选择器）
    bonusLabels: BONUS_OPTIONS.map(b => b.label),
    bonusIndex: 0, // 默认"无"
    bonusProvince: false,
    bonusCity: false,
    bonusMid: false,
    bonusHigh: false,

    // Step 2
    importSource: '',
    yearFields: [],
    avgIndex: 0,
    avgIndexText: '',
    avgIndexClass: '',
    customTier: '',

    // Step 3
    personalAccText: '',
    actualYearsText: '',
    yearDetailList: [],

    // Step 4
    totalPensionText: '',
    breakdownList: [],   // 由 _fillStep4 根据 MODULES 动态生成
    normalRetireAge: 0,
    earlyRetireAge: 0,
    earlyMonths: 0,
    monthlyDiffText: '0.00',
    normalPensionText: '0.00',
    earlyPensionText: '0.00',
    normalBarWidth: 0,
    earlyBarWidth: 0,

    _yearData: {},
    _calcResult: null,
  },

  onLoad() {
    this.setData({ provinceIndex: 0 })
    const saved = wx.getStorageSync('pension_data_v3')
    if (saved && saved.workDate) {
      // 恢复其他加发选项
      let bonusIdx = 0
      if (saved.bonusProvince) bonusIdx = 1
      else if (saved.bonusCity) bonusIdx = 2
      else if (saved.bonusMid) bonusIdx = 3
      else if (saved.bonusHigh) bonusIdx = 4

      this.setData({
        cityIndex:      saved.cityIndex      !== undefined ? saved.cityIndex      : -1,
        personTypeIndex: saved.personTypeIndex !== undefined ? saved.personTypeIndex : -1,
        birthDate:    saved.birthDate    || '',
        workDate:     saved.workDate     || '',
        bonusIndex:    bonusIdx,
        bonusProvince: saved.bonusProvince || false,
        bonusCity:     saved.bonusCity     || false,
        bonusMid:      saved.bonusMid      || false,
        bonusHigh:     saved.bonusHigh     || false,
        customTier:   saved.customTier   || '',
        _yearData:     saved.yearData      || {},
      })
      if (saved.yearData && Object.keys(saved.yearData).length > 0) {
        this._rebuildYearFields(saved.yearData)
      }
    }
  },

  // ── Step 1 选择器 ──
  onProvinceChange(e) {
    this.setData({ provinceIndex: Number(e.detail.value), cityIndex: -1 })
  },

  onCityChange(e) {
    this.setData({ cityIndex: Number(e.detail.value) })
    this._saveDraft()
  },

  onPersonTypeChange(e) {
    this.setData({ personTypeIndex: Number(e.detail.value) })
    this._saveDraft()
  },

  onBirthDateChange(e) {
    this.setData({ birthDate: e.detail.value })
    this._saveDraft()
  },

  onWorkDateChange(e) {
    const v = e.detail.value
    this.setData({ workDate: v })
    this._saveDraft()
    if (v) {
      const startYear = parseInt(v)
      const yearData = this.data._yearData || {}
      // 直接展开2年（从参保年份到参保年份+1）
      this._rebuildYearFields(yearData, startYear, startYear + 1)
    }
  },

  onBonusChange(e) {
    const idx = Number(e.detail.value)
    const opt = BONUS_OPTIONS[idx] || BONUS_OPTIONS[0]
    this.setData({
      bonusIndex:    idx,
      bonusProvince: opt.province,
      bonusCity:     opt.city,
      bonusMid:      opt.mid,
      bonusHigh:     opt.high,
    })
    this._saveDraft()
  },

  onStartCalc() {
    const d = this.data
    if (d.cityIndex < 0) { wx.showToast({ title: '请选择缴费地区', icon: 'none' }); return }
    if (d.personTypeIndex < 0) { wx.showToast({ title: '请选择人员类型', icon: 'none' }); return }
    if (!d.birthDate) { wx.showToast({ title: '请选择出生年月', icon: 'none' }); return }
    if (!d.workDate) { wx.showToast({ title: '请选择参保时间', icon: 'none' }); return }
    this.setData({ currentStep: 2 })
  },

  // ── Step 2 ──
  onChooseExcel() {
    const that = this
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls'],
      success(res) {
        that._parseExcelFile(res.tempFiles[0].path)
      }
    })
  },

  _parseExcelFile(filePath) {
    wx.showLoading({ title: '解析中...' })
    const that = this
    const cloudPath = 'excel/' + Date.now() + '.xlsx'
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success(uploadRes) {
        wx.cloud.callFunction({
          name: 'parseExcel',
          data: { fileID: uploadRes.fileID },
          success(callRes) {
            wx.hideLoading()
            const result = callRes.result
            if (!result || !result.success) {
              wx.showToast({ title: result?.error || '解析失败', icon: 'none' })
              return
            }
            that._applyExcelData(result.data)
          },
          fail(err) {
            wx.hideLoading()
            wx.showToast({ title: '云函数调用失败', icon: 'none' })
            console.error('parseExcel fail:', err)
          }
        })
      },
      fail() {
        wx.hideLoading()
        wx.showToast({ title: '文件上传失败', icon: 'none' })
      }
    })
  },

  _applyExcelData(data) {
    let yearData = { ...this.data._yearData }
    if (data.yearlyDetails && data.yearlyDetails.length > 0) {
      for (const item of data.yearlyDetails) {
        yearData[item.year] = item.base || 0
      }
    }
    const workYear = parseInt(this.data.workDate) || 1995
    this._rebuildYearFields(yearData, workYear, 2025)
    this.setData({
      _yearData: yearData,
      importSource: 'excel',
    })
    this._saveDraft()
    wx.showToast({ title: '已导入 ' + Object.keys(yearData).length + ' 年数据', icon: 'success' })
  },

  onYearBaseInput(e) {
    const idx = e.currentTarget.dataset.idx
    const val = e.detail.value
    const fields = this.data.yearFields
    if (!fields[idx]) return
    fields[idx].base = val

    const year = fields[idx].year
    const base = parseFloat(val) || 0
    const avgWage = PROV_BASE[year] || 0
    if (avgWage > 0 && base > 0) {
      const index = base / avgWage
      fields[idx].indexText = index.toFixed(4)
      fields[idx].indexClass = index < 1 ? 'index-low' : index > 2 ? 'index-high' : 'index-mid'
    } else {
      fields[idx].indexText = '--'
      fields[idx].indexClass = ''
    }

    // 更新 yearData
    const yearData = { ...this.data._yearData }
    if (val === '' || val === undefined) {
      delete yearData[year]
    } else {
      yearData[year] = parseFloat(val) || 0
    }
    this.setData({ yearFields: fields, _yearData: yearData })
    this._recalcAvgIndex()
    this._saveDraft()
  },

  onCustomTierInput(e) {
    const raw = e.detail.value
    if (raw === '') {
      this.setData({ customTier: '', avgIndex: 0, avgIndexText: '', avgIndexClass: '' })
      return
    }
    const val = parseInt(raw, 10)
    if (isNaN(val) || val < 60 || val > 300) {
      wx.showToast({ title: '请输入60-300之间整数', icon: 'none' })
      return
    }
    this.setData({ customTier: String(val) })
    this._recalcByTier(val)
    this._saveDraft()
  },

  _recalcByTier(tier) {
    const idx = tier / 100
    const startYear = parseInt(this.data.workDate) || 1995
    const yearData = {}
    const fields = []
    let sumIndex = 0, count = 0
    for (let y = startYear; y <= 2025; y++) {
      const avgWage = PROV_BASE[y] || 0
      const base = avgWage > 0 ? Math.round(avgWage * idx) : 0
      yearData[y] = base
      const index = idx
      sumIndex += index
      count++
      fields.push({
        year: y,
        base: base > 0 ? String(base) : '',
        indexText: index.toFixed(4),
        indexClass: index < 1 ? 'index-low' : index > 2 ? 'index-high' : 'index-mid',
        accText: '--',
      })
    }
    const avgIndex = count > 0 ? sumIndex / count : 0
    const avgClass = avgIndex < 1 ? 'index-low' : avgIndex > 2 ? 'index-high' : 'index-mid'
    this.setData({
      yearFields: fields,
      _yearData: yearData,
      avgIndex,
      avgIndexText: avgIndex > 0 ? avgIndex.toFixed(4) : '',
      avgIndexClass: avgClass,
    })
  },

  _recalcAvgIndex() {
    const fields = this.data.yearFields.filter(f => f.indexText !== '--' && f.indexText !== '' && !isNaN(parseFloat(f.indexText)))
    const sum = fields.reduce((s, f) => s + parseFloat(f.indexText), 0)
    const count = fields.length
    const avgIndex = count > 0 ? sum / count : 0
    const avgClass = avgIndex < 1 ? 'index-low' : avgIndex > 2 ? 'index-high' : 'index-mid'
    this.setData({
      avgIndex,
      avgIndexText: avgIndex > 0 ? avgIndex.toFixed(4) : '',
      avgIndexClass: avgClass,
    })
  },

  _rebuildYearFields(yearData, startYear, endYear) {
    const sY = startYear || parseInt(this.data.workDate) || 1995
    const eY = endYear || 2025
    const fields = []
    for (let y = sY; y <= eY; y++) {
      const base = yearData[y] || 0
      const avgWage = PROV_BASE[y] || 0
      let indexText = '--', indexClass = ''
      if (base > 0 && avgWage > 0) {
        const index = base / avgWage
        indexText = index.toFixed(4)
        indexClass = index < 1 ? 'index-low' : index > 2 ? 'index-high' : 'index-mid'
      }
      fields.push({
        year: y,
        base: base > 0 ? String(base) : '',
        indexText,
        indexClass,
        accText: '--',
      })
    }
    this.setData({ yearFields: fields })
    this._recalcAvgIndex()
  },

  // ── 导航 ──
  onBackToStep1() { this.setData({ currentStep: 1 }) },
  onBackToStep2() { this.setData({ currentStep: 2 }) },

  onRestart() {
    this.setData({
      currentStep: 1,
      cityIndex: -1,
      personTypeIndex: -1,
      birthDate: '',
      workDate: '',
      bonusIndex: 0,
      bonusProvince: false,
      bonusCity: false,
      bonusMid: false,
      bonusHigh: false,
      yearFields: [],
      avgIndex: 0,
      avgIndexText: '',
      customTier: '',
      importSource: '',
      _yearData: {},
      _calcResult: null,
    })
    wx.removeStorageSync('pension_data_v3')
  },

  // ── 计算 ──
  onCalculate() {
    const d = this.data
    const cityType = d.cityIndex === 0 ? 'cc' : 'prov'

    // personType → genderType + userType（引擎要的是这两个字段）
    const personVal = PERSON_TYPES[d.personTypeIndex]?.value || 'male'
    const typeMap  = PERSON_TYPE_MAP[personVal] || { genderType: 'male', userType: 'standard' }
    const genderType = typeMap.genderType
    const userType  = typeMap.userType

    const birthParts = (d.birthDate || '').split('-')
    const workParts  = (d.workDate  || '').split('-')
    const birthYear  = parseInt(birthParts[0]) || 1970
    const birthMonth = parseInt(birthParts[1]) || 1
    const workYear  = parseInt(workParts[0]) || 1995
    const workMonth = parseInt(workParts[1]) || 1

    // 用 yearData 或 tier 估算
    let yearData = { ...d._yearData }

    // ── 填充缺失年份（从最后填写年份+1 到退休年份）──
    const retireYearEst = birthYear + this._calcRetireAge(personVal)
    const validYears = Object.keys(yearData).map(Number).filter(y => yearData[y] > 0).sort()
    const maxFilledYear = validYears.length > 0 ? validYears[validYears.length - 1] : (workYear - 1)
    if (retireYearEst > maxFilledYear) {
      const avgIdx = d.avgIndex || 0
      for (let y = maxFilledYear + 1; y <= retireYearEst; y++) {
        const predictedWage = predictWage(y, cityType)
        yearData[y] = predictedWage > 0 && avgIdx > 0 ? Math.round(predictedWage * avgIdx) : 0
      }
    }
    // ── 填充后重新计算 avgIndex（含预测年份）──
    let sumIdx = 0, cntIdx = 0
    const allYears = Object.keys(yearData).map(Number).filter(y => yearData[y] > 0).sort()
    for (const y of allYears) {
      const base = yearData[y]
      const avgWage = PROV_BASE[y] || predictWage(y, cityType)
      if (avgWage > 0 && base > 0) {
        sumIdx += base / avgWage
        cntIdx++
      }
    }
    const avgIdxFinal = cntIdx > 0 ? sumIdx / cntIdx : (d.avgIndex || 0)
    // 把填充后的 yearData 和最新 avgIndex 写回 data，供 _fillStep4 使用
    this.setData({ _yearData: yearData, avgIndex: avgIdxFinal })
    // ────────────────────────────────────────────────────

    if (d.customTier && Object.keys(yearData).length === 0) {
      const idx = parseInt(d.customTier) / 100
      for (let y = workYear; y <= 2025; y++) {
        const avgWage = PROV_BASE[y] || 0
        yearData[y] = avgWage > 0 ? Math.round(avgWage * idx) : 0
      }
    }

    // 计算个人账户（含预测年份）
    // 顺序：先对年初余额计息，再加当年缴费
    let personalAcc = 0
    const accYears = Object.keys(yearData).map(Number).filter(y => yearData[y] > 0).sort()
    for (const y of accYears) {
      // 先计息（年初余额）
      const rate = INTEREST_RATE[y] !== undefined ? INTEREST_RATE[y] : 0.015
      personalAcc = Math.round(personalAcc * (1 + rate))
      // 再加当年缴费
      const base = yearData[y]
      const months = y === 2025 ? 6 : 12
      personalAcc += base * 0.08 * months
    }

    try {
      const result = calculatePension({
        city:          cityType,
        genderType:     genderType,
        birthYear:      birthYear,
        birthMonth:     birthMonth,
        workYear:       workYear,
        workMonth:      workMonth,
        avgIndex:       avgIdxFinal,
        personalAcc:    personalAcc,
        // 加发字段（引擎 pension-calc.js 已支持）
        bonusProvince:   d.bonusProvince,
        bonusCity:       d.bonusCity,
        bonusMid:        d.bonusMid,
        bonusHigh:       d.bonusHigh,
      })

      this.setData({ _calcResult: result, currentStep: 3, personalAccInput: personalAcc })
      this._fillStep3(result, yearData, personalAcc)
    } catch (err) {
      wx.showToast({ title: '计算失败：' + (err.message || err), icon: 'none' })
      console.error('calculatePension error:', err)
    }
  },

  _fillStep3(result, yearData, personalAcc) {
    const acc = personalAcc || 0
    const personalAccText = acc >= 10000
      ? '¥' + (acc / 10000).toFixed(2) + '万'
      : '¥' + acc.toFixed(0)

    const actualYears = result.legal?.actualYears || 0
    const actualYearsText = actualYears.toFixed(2) + '年'

    const yearDetailList = []
    const validYears = Object.keys(yearData).map(Number).filter(y => yearData[y] > 0).sort()
    for (const y of validYears) {
      const base = yearData[y]
      const avgWage = PROV_BASE[y] || 0
      const index = avgWage > 0 ? base / avgWage : 0
      const accVal = Math.round(base * 0.08 * 12)
      yearDetailList.push({
        year: y,
        baseText:      base > 0 ? '¥' + base.toLocaleString() : '--',
        provBaseText:  avgWage > 0 ? '¥' + avgWage.toLocaleString() : '--',
        indexText:     index > 0 ? index.toFixed(4) : '--',
        indexClass:     index > 0 ? (index < 1 ? 'index-low' : index > 2 ? 'index-high' : 'index-mid') : '',
        depositText:   accVal > 0 ? '¥' + accVal.toLocaleString() : '--',
      })
    }

    // avgIndex 是前端自己算的，不从引擎取
    const avgIndex = this.data.avgIndex || 0
    const avgClass = avgIndex < 1 ? 'index-low' : avgIndex > 2 ? 'index-high' : 'index-mid'

    this.setData({
      personalAccText,
      actualYearsText,
      yearDetailList,
      avgIndex,
      avgIndexText: avgIndex > 0 ? avgIndex.toFixed(4) : '',
      avgIndexClass: avgClass,
    })
  },

  onShowPensionResult() {
    const result = this.data._calcResult
    if (!result) return
    this._fillStep4(result)
    this.setData({ currentStep: 4 })
  },

  _buildYearlyDetails(yearData, PROV_BASE, INTEREST_RATE) {
    const details = []
    const validYears = Object.keys(yearData || {}).map(Number).filter(y => yearData[y] > 0).sort()
    for (const y of validYears) {
      const base = yearData[y]
      const avgWage = PROV_BASE[y] || 0
      const index = avgWage > 0 ? base / avgWage : 0
      const accVal = Math.round(base * 0.08 * 12)
      details.push({
        year: y,
        baseText:      base > 0 ? '¥' + base.toLocaleString() : '--',
        provBaseText:  avgWage > 0 ? '¥' + avgWage.toLocaleString() : '--',
        indexText:     index > 0 ? index.toFixed(4) : '--',
        indexClass:     index > 0 ? (index < 1 ? 'index-low' : index > 2 ? 'index-high' : 'index-mid') : '',
        depositText:   accVal > 0 ? '¥' + accVal.toLocaleString() : '--',
      })
    }
    return details
  },

  _fillStep4(result) {
    const that = this
    const d = this.data
    const legal = result.legal || {}
    const flex  = result.flex  || {}

    const legalTotal = legal.total  || 0
    const flexTotal  = flex.total   || legalTotal
    const totalPensionText = legalTotal.toFixed(2)

    // 分项明细（根据 MODULES 动态生成，模块顺序 = 展示顺序）
    const breakdownList = MODULES.map(key => {
      const label = MODULE_LABELS[key]
      let value = 0
      const formulaFn = MODULE_FORMULAS[key]
      let formula = ''
      switch (key) {
        case 'base':       value = legal.basicPension || 0;       formula = formulaFn ? formulaFn(legal, d) : ''; break
        case 'extra':      value = legal.extraPension || 0;      formula = formulaFn ? formulaFn(legal, d) : ''; break
        case 'personal':   value = legal.personalPension || 0; formula = formulaFn ? formulaFn(legal, d) : ''; break
        case 'transition': value = legal.transPension || 0;     formula = formulaFn ? formulaFn(legal, d) : ''; break
        case 'other':      value = legal.bonusPension || 0;     formula = formulaFn ? formulaFn(legal, d) : ''; break
      }
      return {
        label,
        value,
        valueText: value.toFixed(2),
        formula,
        expanded: false,
      }
    })

    // 对比数据
    // 法定退休年龄：用 legalTotalMonths 换算成 X岁Y个月
    const normalTotalMonths = result.legalTotalMonths || 0
    const normalAgeYears = Math.floor(normalTotalMonths / 12)
    const normalAgeMonths = normalTotalMonths % 12
    const normalAgeText = normalAgeMonths > 0
      ? normalAgeYears + '岁' + normalAgeMonths + '个月'
      : normalAgeYears + '岁'

    // 弹性提前退休年龄
    const earlyTotalMonths = result.flexTotalMonths || normalTotalMonths
    const earlyAgeYears = Math.floor(earlyTotalMonths / 12)
    const earlyAgeMonths = earlyTotalMonths % 12
    const earlyAgeText = earlyAgeMonths > 0
      ? earlyAgeYears + '岁' + earlyAgeMonths + '个月'
      : earlyAgeYears + '岁'

    // 提前月数 = 法定总月数 - 弹性总月数
    const earlyMonths = (result.legalTotalMonths && result.flexTotalMonths)
      ? result.legalTotalMonths - result.flexTotalMonths
      : 0

    // 退休时间 = 出生年 + 退休年龄（从 birthDate 直接解析）
    const birthParts = (d.birthDate || '').split('-')
    const birthYear  = parseInt(birthParts[0]) || 0
    const birthMonth = parseInt(birthParts[1]) || 1
    const retireYear  = birthYear + normalAgeYears
    const retireMonth = birthMonth + normalAgeMonths
    let retireDateText = ''
    if (retireYear > 0) {
      if (retireMonth > 12) {
        retireDateText = (retireYear + 1) + '年' + (retireMonth - 12) + '月'
      } else {
        retireDateText = retireYear + '年' + retireMonth + '月'
      }
    }

    // 是否有权选择弹性提前退休（提前月数>0 才显示对比）
    const hasEarlyRetirement = earlyMonths > 0

    // 每月差额 = 法定月养老金 - 弹性月养老金
    const monthlyDiff = legalTotal - flexTotal

    const maxBar = Math.max(legalTotal, flexTotal, 1)
    const normalBarWidth = Math.min(100, (legalTotal / maxBar) * 100)
    const earlyBarWidth  = Math.min(100, (flexTotal  / maxBar) * 100)

    this.setData({
      totalPensionText,
      breakdownList,
      normalAgeText,
      earlyAgeText,
      earlyMonths:      earlyMonths,
      monthlyDiffText:   monthlyDiff.toFixed(2),
      normalPensionText: legalTotal.toFixed(2),
      earlyPensionText:  flexTotal.toFixed(2),
      normalBarWidth,
      earlyBarWidth,
      hasEarlyRetirement: hasEarlyRetirement,

      // 标记计算完成，供报告页使用
      _calcDone: true,
    })

    // ──同时存到 localData，供报告页使用 ──
    const app = getApp()
    app.globalData = app.globalData || {}

    // 从索引转为实际值（对齐 onCalculate 逻辑）
    const personTypeVal = PERSON_TYPES[this.data.personTypeIndex]?.value || ''
    const cityTypeVal   = this.data.cityIndex === 0 ? 'cc' : 'prov'
    const cityLabel     = '吉林省' + (CITY_LIST[this.data.cityIndex] || '')

    // 计算用的输入参数（传给报告页）
    app.globalData.pensionInput = {
      personType:  personTypeVal,
      city:        cityTypeVal,
      cityLabel:   cityLabel,
      birthDate:  this.data.birthDate  || '',
      workDate:   this.data.workDate   || '',
      avgIndex:   d.avgIndex,
      yearData:   d._yearData || {},
    }
    // 社平基数（传给报告页，补入2026+预测值）
    const extPROV_BASE = { ...PROV_BASE }
    for (let y = 2026; y <= 2045; y++) {
      if (!extPROV_BASE[y]) extPROV_BASE[y] = predictWage(y, 'prov')
    }
    const extCC_BASE = { ...CC_BASE }
    for (let y = 2026; y <= 2045; y++) {
      if (!extCC_BASE[y]) extCC_BASE[y] = predictWage(y, 'cc')
    }
    app.globalData.PROV_BASE = extPROV_BASE
    app.globalData.CC_BASE   = extCC_BASE

    app.globalData.calcResult = {
      legal:       legal,
      flex:        flex,
      legalDate:   result.legalDate || {},
      flexDate:    result.flexDate  || {},
      legalTotalMonths: result.legalTotalMonths || 0,
      flexTotalMonths:  result.flexTotalMonths  || 0,
      canFlex:     result.canFlex || false,
      breakdownList:  breakdownList,
      avgIndex:     d.avgIndex,
      totalYears:    legal.totalYears || 0,
      sightYears:   legal.sightYears || 0,
      personalAcc:  d.personalAccInput || d.personalAcc || (this.data.personalAccInput||0),
      baseRetire:   legal.baseRetire || 0,
      baseProv:     legal.baseProv   || 0,
      months:       legal.months     || 139,
      retireAgeText: normalAgeText,
      retireDateText: retireDateText,
      transRatio:   '1.2%',
      extraPension:  legal.extraPension || 0,
      extraRatioText: legal.extraRatioText || '',
      bonusPension:  legal.bonusPension || 0,
      bonusProvince: d.bonusProvince || false,
      bonusCity:     d.bonusCity     || false,
      bonusMid:      d.bonusMid      || false,
      bonusHigh:     d.bonusHigh     || false,
      yearlyDetails: that._buildYearlyDetails(d._yearData, PROV_BASE, INTEREST_RATE) || [],
      province:      d.provinceText || '吉林省',
      provinceCode:  d.provinceCode  || 'jilin',
      personType:    d.personType    || '',
      personTypeText: (function(){
        var t = d.personType || ''
        if (t.indexOf('eco')===0) return '灵活就业'
        return '企业职工'
      })(),
      baseYearText:   '2025',
      baseSourceText: '实际公布基数',
      hasPrediction: false,
      hasEarlyRetirement: hasEarlyRetirement,   // 是否有权弹性提前退休
      totalPensionText: totalPensionText,
      avgIndex: d.avgIndex,  // 平均缴费指数（传给报告页）
    }
    // ── 同时存到本地缓存（报告页优先读缓存）──
    try {
      wx.setStorageSync('calcResult', app.globalData.calcResult)
      console.log('[pension] calcResult saved to storage', app.globalData.calcResult.totalPensionText)
    } catch(e) {
      console.error('[pension] storage save failed:', e)
    }
  },

  onToggleBreakdown(e) {
    const idx = e.currentTarget.dataset.idx
    const k = 'breakdownList[' + idx + '].expanded'
    this.setData({ [k]: !this.data.breakdownList[idx].expanded })
  },

  // ── 生成分享图并弹分享面板（本地小程序码）──
  onShareImage() {
    const d = this.data
    if (!d._calcResult) {
      wx.showToast({ title: '请先完成测算', icon: 'none' })
      return
    }
    wx.showLoading({ title: '生成中...' })

    const that = this
    const query = this.createSelectorQuery()
    query.select('#share-canvas')
      .fields({ node: true, size: true })
      .exec(function(res) {
        if (!res || !res[0] || !res[0].node) {
          wx.hideLoading()
          wx.showToast({ title: '生成组件未就绪', icon: 'none' })
          return
        }
        var canvas = res[0].node
        var ctx = canvas.getContext('2d')
        var sysInfo = wx.getSystemInfoSync()
        var dpr = sysInfo.pixelRatio || 2
        var W = 340
        var H = 500   // 加高，给小程序码留空间
        canvas.width  = W * dpr
        canvas.height = H * dpr
        ctx.scale(dpr, dpr)

        // ── 背景 ──
        ctx.fillStyle = '#f0f4f8'
        ctx.fillRect(0, 0, W, H)

        // ── 顶部蓝色区 ──
        var grad = ctx.createLinearGradient(0, 0, W, 80)
        grad.addColorStop(0, '#1e3a5f')
        grad.addColorStop(1, '#2563eb')
        ctx.fillStyle = grad
        that._roundRect(ctx, 0, 0, W, 82, 0)
        ctx.fill()

        // 标题
        ctx.textAlign = 'center'
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 15px PingFang SC, sans-serif'
        ctx.fillText('养老金测算结果', W / 2, 32)

        // 总额
        ctx.font = 'bold 28px PingFang SC, sans-serif'
        ctx.fillStyle = '#ffffff'
        var totalStr = '¥' + (d.totalPensionText || '0.00')
        ctx.fillText(totalStr, W / 2, 62)

        // ── 分项 ──
        var items = (d.breakdownList || []).filter(function(it) { return it && it.value > 0 })
        var colors = ['#3b82f6','#f59e0b','#059669','#8b5cf6','#ec4899']
        var y = 98
        items.forEach(function(it, idx) {
          ctx.fillStyle = '#ffffff'
          that._roundRect(ctx, 14, y, W - 28, 38, 6)
          ctx.fill()
          ctx.fillStyle = colors[idx] || '#3b82f6'
          that._roundRect(ctx, 14, y, 4, 38, 2)
          ctx.fill()
          ctx.textAlign = 'left'
          ctx.fillStyle = '#1e293b'
          ctx.font = '13px PingFang SC, sans-serif'
          ctx.fillText(it.label || '', 26, y + 18)
          ctx.textAlign = 'right'
          ctx.fillStyle = '#1e3a5f'
          ctx.font = 'bold 13px PingFang SC, sans-serif'
          ctx.fillText('¥' + (it.valueText || '0.00'), W - 22, y + 18)
          y += 46
        })

        // ── 弹性提前退休对比 ──
        var calcResult = d._calcResult || {}
        var flexResult = calcResult.flex
        if (flexResult && flexResult.total > 0) {
          var legalTotal = (calcResult.legal && calcResult.legal.total) || 0
          var flexTotal  = flexResult.total
          var diff = Math.round((legalTotal - flexTotal) * 100) / 100
          y += 10
          ctx.fillStyle = '#fee2e2'
          that._roundRect(ctx, 14, y, W - 28, 34, 6)
          ctx.fill()
          ctx.fillStyle = '#ef4444'
          that._roundRect(ctx, 14, y, 4, 34, 2)
          ctx.fill()
          ctx.textAlign = 'left'
          ctx.fillStyle = '#1e293b'
          ctx.font = '12px PingFang SC, sans-serif'
          ctx.fillText('弹性提前退休（少领）', 26, y + 16)
          ctx.textAlign = 'right'
          ctx.fillStyle = '#1e3a5f'
          ctx.font = 'bold 12px PingFang SC, sans-serif'
          ctx.fillText('¥' + flexTotal.toFixed(2), W - 22, y + 16)
          y += 40
          ctx.textAlign = 'left'
          ctx.fillStyle = '#64748b'
          ctx.font = '11px PingFang SC, sans-serif'
          ctx.fillText('法定 vs 弹性差额', 26, y + 12)
          ctx.textAlign = 'right'
          ctx.fillStyle = '#ef4444'
          ctx.font = 'bold 11px PingFang SC, sans-serif'
          ctx.fillText((diff >= 0 ? '+' : '') + diff.toFixed(2), W - 22, y + 12)
          y += 30
        }

        // ── 底部品牌（左对齐，给小程序码留空间）──
        ctx.textAlign = 'left'
        ctx.fillStyle = '#94a3b8'
        ctx.font = '11px PingFang SC, sans-serif'
        ctx.fillText('现实调音师 · 养老金计算平台', 14, H - 20)

        // ── 导出函数 ──
        function exportImage() {
          wx.canvasToTempFilePath({
            canvas: canvas,
            fileType: 'png',
            success: function(tmp) {
              wx.hideLoading()
              wx.showShareImageMenu({
                path: tmp.tempFilePath,
                fail: function() {
                  wx.saveImageToPhotosAlbum({
                    filePath: tmp.tempFilePath,
                    success: function() { wx.showToast({ title: '已保存到相册', icon: 'success' }) },
                    fail: function(err) {
                      if (err.errMsg && err.errMsg.indexOf('auth deny') !== -1) {
                        wx.showModal({
                          title: '需要授权',
                          content: '请允许保存图片到相册，以便分享',
                          confirmText: '去设置',
                          success: function(m) { if (m.confirm) wx.openSetting() }
                        })
                      } else {
                        wx.showToast({ title: '已取消', icon: 'none' })
                      }
                    }
                  })
                }
              })
            },
            fail: function(err) {
              wx.hideLoading()
              console.error('canvasToTempFilePath fail:', err)
              wx.showToast({ title: '生成图片失败', icon: 'none' })
            }
          })
        }

        // ── 画小程序码（右下角 80×80，本地图片）──
        var img = canvas.createImage()
        img.onload = function() {
          var qx = W - 14 - 80, qy = H - 14 - 80 - 16
          ctx.fillStyle = '#ffffff'
          that._roundRect(ctx, qx - 4, qy - 4, 88, 88, 6)
          ctx.fill()
          ctx.drawImage(img, qx, qy, 80, 80)
          ctx.textAlign = 'center'
          ctx.fillStyle = '#94a3b8'
          ctx.font = '9px PingFang SC, sans-serif'
          ctx.fillText('扫码使用小程序', qx + 40, qy + 92)
          exportImage()
        }
        img.onerror = function() {
          console.log('[分享图] 本地小程序码加载失败')
          exportImage()
        }
        img.src = '/images/wxacode.png'
      })
  },

  // Canvas 圆角矩形辅助函数
  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y,       x + w, y + r,       r)
    ctx.arcTo(x + w, y + h,   x + w - r, y + h,   r)
    ctx.arcTo(x,     y + h,   x,     y + h - r,   r)
    ctx.arcTo(x,     y,       x + r, y,           r)
    ctx.closePath()
  },

  // 估算退休年龄（用于预测缴费年限）
  _calcRetireAge(type) {
    const map = { male:60, fw:50, fc:55, eco_male:60, eco_female:55 }
    return map[type] || 60
  },

  onExportReport() {
    const d = this.data
    if (!d._calcResult) {
      wx.showToast({ title: '请先完成测算', icon: 'none' })
      return
    }
    // 数据已在 _fillStep4 写入 globalData，直接跳
    wx.navigateTo({ url: '/pages/report/index' })
  },
  onCustomConsult() {
    wx.showToast({ title: '定制咨询开发中', icon: 'none' })
  },
  _saveDraft() {
    const d = this.data
    wx.setStorageSync('pension_data_v3', {
      cityIndex:      d.cityIndex,
      personTypeIndex: d.personTypeIndex,
      birthDate:    d.birthDate,
      workDate:     d.workDate,
      bonusProvince: d.bonusProvince,
      bonusCity:     d.bonusCity,
      bonusMid:      d.bonusMid,
      bonusHigh:     d.bonusHigh,
      customTier:   d.customTier,
      yearData:      d._yearData,
    })
  },
})
