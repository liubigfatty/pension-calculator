// miniprogram/pages/pension/pension.js
// 养老金测算 — 引导式流程 v4（同步 WorkBuddy 项目 index.js 改动）
// 引用完整引擎 ../../../engine/pension-engine

// ===== 辅助函数（Canvas 绘制用）=====
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + day
}

const { calculatePension } = require('../../../engine/pension-engine')

// 吉林省历年社平基数
const PROV_BASE = {
  1995: 369.17, 1996: 447.50, 1997: 472.00, 1998: 545.92, 1999: 596.50,
  2000: 660.33, 2001: 730.92, 2002: 832.50, 2003: 923.42, 2004: 1035.92,
  2005: 1200.75, 2006: 1381.92, 2007: 1709.42, 2008: 1957.17, 2009: 2185.83,
  2010: 2449.92, 2011: 2849.75, 2012: 3200.58, 2013: 3570.50, 2014: 3876.33,
  2015: 4296.50, 2016: 4674.83, 2017: 5120.92, 2018: 5711.08, 2019: 6151.08,
  2020: 5088.42, 2021: 6004.75, 2022: 6384.83, 2023: 6655.33, 2024: 7178.50,
  2025: 7322.08
}
// 历年记账利率
const INTEREST_RATE = {
  1995: 0.025, 1996: 0.025, 1997: 0.025, 1998: 0.025, 1999: 0.025,
  2000: 0.025, 2001: 0.025, 2002: 0.025, 2003: 0.025, 2004: 0.025,
  2005: 0.0226, 2006: 0.025, 2007: 0.025, 2008: 0.0393, 2009: 0.0225,
  2010: 0.0230, 2011: 0.025, 2012: 0.025, 2013: 0.0325, 2014: 0.025,
  2015: 0.025, 2016: 0.0831, 2017: 0.0712, 2018: 0.0829, 2019: 0.0761,
  2020: 0.0604, 2021: 0.0669, 2022: 0.0397, 2023: 0.0397, 2024: 0.0262, 2025: 0.0150
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

// 其他加发选项（单选）
const BONUS_OPTIONS = [
  { label: '无', province: false, city: false, mid: false, high: false },
  { label: '省级劳模（加发10%）', province: true, city: false, mid: false, high: false },
  { label: '市级劳模（加发5%）', province: false, city: true, mid: false, high: false },
  { label: '中级职称（加发15元/月）', province: false, city: false, mid: true, high: false },
  { label: '高级职称（加发25元/月）', province: false, city: false, mid: false, high: true },
]

// ===== 逐年数据计算辅助 =====
function buildYearFields(startYear, endYear, yearData) {
  const fields = []
  for (let y = startYear; y <= endYear; y++) {
    const personal = yearData[y] || ''
    const prov = PROV_BASE[y] ? PROV_BASE[y].toFixed(2) : '—'
    let indexText = '—'
    let indexClass = ''
    if (personal && prov !== '—') {
      const idx = personal / PROV_BASE[y]
      indexText = idx.toFixed(4)
      if (idx >= 2.0) indexClass = 'index-high'
      else if (idx >= 1.0) indexClass = 'index-mid'
      else indexClass = 'index-low'
    }
    fields.push({ year: y, value: personal, base: prov, indexText, indexClass })
  }
  return fields
}

function calcAvgIndex(yearData) {
  let sum = 0, count = 0
  const yrs = Object.keys(yearData).map(Number).sort()
  for (const y of yrs) {
    const base = yearData[y]
    if (!base) continue
    const provBase = PROV_BASE[y]
    if (!provBase) continue
    sum += base / provBase
    count++
  }
  return count > 0 ? +(sum / count).toFixed(4) : null
}

// ===== Page =====
Page({
  data: {
    currentStep: 1,

    // Step 1
    provinceList: ['吉林省'],
    provinceIndex: 0,
    cityList: ['省直/其他', '长春市'],
    cityIndex: -1,
    personTypeLabels: PERSON_TYPES.map(p => p.label),
    personTypeIndex: -1,
    birthDate: '',
    workDate: '',
    // 其他加发（选择器）
    bonusLabels: BONUS_OPTIONS.map(b => b.label),
    bonusIndex: 0,
    bonusProvince: false,
    bonusCity: false,
    bonusMid: false,
    bonusHigh: false,

    // Step 2
    inputMode: 'excel',
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
    breakdownList: [
      { label: '基础养老金',         value: 0, valueText: '0.00', formula: '', expanded: false },
      { label: '个人账户养老金',     value: 0, valueText: '0.00', formula: '', expanded: false },
      { label: '过渡性养老金',     value: 0, valueText: '0.00', formula: '', expanded: false },
      { label: '增发养老金',       value: 0, valueText: '0.00', formula: '', expanded: false },
      { label: '其它加发',         value: 0, valueText: '0.00', formula: '', expanded: false },
    ],
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
    showSharePreview: false,
    shareImagePath: '',

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
  },

  onPersonTypeChange(e) {
    this.setData({ personTypeIndex: Number(e.detail.value) })
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
    this.setData({ currentStep: 2, inputMode: 'excel' })
  },

  // ── Step 2 ──
  onModeSwitch(e) {
    this.setData({ inputMode: e.currentTarget.dataset.mode })
  },

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
      inputMode: 'manual',
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
    const cityType = d.cityIndex === 1 ? 'cc' : 'prov'

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
    if (d.customTier && Object.keys(yearData).length === 0) {
      const idx = parseInt(d.customTier) / 100
      for (let y = workYear; y <= 2025; y++) {
        const avgWage = PROV_BASE[y] || 0
        yearData[y] = avgWage > 0 ? Math.round(avgWage * idx) : 0
      }
    }

    // 计算个人账户
    let personalAcc = 0
    const validYears = Object.keys(yearData).map(Number).filter(y => yearData[y] > 0).sort()
    for (const y of validYears) {
      const base = yearData[y]
      const months = y === 2025 ? 6 : 12
      personalAcc += base * 0.08 * months
      const rate = INTEREST_RATE[y] !== undefined ? INTEREST_RATE[y] : 0.025
      if (y < 2025) {
        personalAcc = Math.round(personalAcc * (1 + rate))
      }
    }

    try {
      const result = calculatePension({
        city:          cityType,
        genderType:     genderType,
        birthYear:      birthYear,
        birthMonth:     birthMonth,
        workYear:       workYear,
        workMonth:      workMonth,
        avgIndex:       d.avgIndex,
        personalAcc:    personalAcc,
        // 加发字段（引擎 pension-engine.js 已支持）
        bonusProvince:   d.bonusProvince,
        bonusCity:       d.bonusCity,
        bonusMid:        d.bonusMid,
        bonusHigh:       d.bonusHigh,
      })

      this.setData({ _calcResult: result, currentStep: 3 })
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
    const actualYearsText = actualYears.toFixed(1) + '年'

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
        avgWageText:  avgWage > 0 ? '¥' + avgWage.toLocaleString() : '--',
        indexText:     index > 0 ? index.toFixed(4) : '--',
        indexClass:     index > 0 ? (index < 1 ? 'index-low' : index > 2 ? 'index-high' : 'index-mid') : '',
        accText:       accVal > 0 ? '¥' + accVal.toLocaleString() : '--',
      })
    }

    // 修复：正确设置 avgIndex 和 avgIndexText
    const avgIndex = result.legal?.avgIndex || 0
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

  _fillStep4(result) {
    const legal = result.legal || {}
    const flex  = result.flex  || {}

    const legalTotal = legal.total  || 0
    const flexTotal  = flex.total   || legalTotal
    const totalPensionText = legalTotal.toFixed(2)

    // 分项明细（顺序：基础→个人账户→过渡性→其它加发→增发养老金）
    const breakdownList = [
      {
        label: '基础养老金',
        value: legal.basicPension || 0,
        valueText: (legal.basicPension || 0).toFixed(2),
        formula: '(' + (legal.baseRetire || 0) + '+' + (legal.baseProv || 0) + ')/2 × ' + (legal.totalYears || 0) + '年 × 1%',
        expanded: false,
      },
      {
        label: '个人账户养老金',
        value: legal.personalPension || 0,
        valueText: (legal.personalPension || 0).toFixed(2),
        formula: (legal.personalAcc || 0) + ' ÷ ' + (legal.months || 139),
        expanded: false,
      },
      {
        label: '过渡性养老金',
        value: legal.transPension || 0,
        valueText: (legal.transPension || 0).toFixed(2),
        formula: (legal.baseProv || 0) + ' × ' + (legal.sightYears || 0) + '年 × 指数 × 1.4%',
        expanded: false,
      },
      {
        label: '其它加发',
        value: legal.bonusPension || 0,
        valueText: (legal.bonusPension || 0).toFixed(2),
        formula: legal.bonusDesc || '无',
        expanded: false,
      },
      {
        label: '增发养老金',
        value: legal.extraPension || 0,
        valueText: (legal.extraPension || 0).toFixed(2),
        formula: legal.extraPension > 0 ? '按劳模/职称规则计算' : '无增发',
        expanded: false,
      },
    ]

    // 对比数据
    const normalAge = legal.retireAgeExact ? Math.floor(legal.retireAgeExact) : 0
    const earlyAge  = flex.retireAgeExact  ? Math.floor(flex.retireAgeExact)  : normalAge
    const earlyMonths = legal.retireTotalMonths && flex.retireTotalMonths
      ? legal.retireTotalMonths - flex.retireTotalMonths
      : 0
    const monthlyDiff = legalTotal - flexTotal

    const maxBar = Math.max(legalTotal, flexTotal, 1)
    const normalBarWidth = Math.min(100, (legalTotal / maxBar) * 100)
    const earlyBarWidth  = Math.min(100, (flexTotal  / maxBar) * 100)

    // 分项占比条形图
    const chartColors = ['#3b82f6','#8b5cf6','#059669','#f59e0b','#ec4899']
    const chartLabels = ['基础','个人','过渡','增发','其它']
    const breakdownChartList = breakdownList
      .filter(it => it.label !== '合计' && it.value > 0)
      .map((it, i) => {
        const pct = legalTotal > 0 ? (it.value / legalTotal * 100).toFixed(1) : '0.0'
        const width = legalTotal > 0 ? Math.max(8, it.value / legalTotal * 100) : 0
        return {
          label: it.label,
          short: chartLabels[i] || '其它',
          value: it.value,
          valueText: it.valueText,
          pct,
          width,
          color: chartColors[i] || '#6b7280',
        }
      })

    this.setData({
      totalPensionText,
      breakdownList,
      breakdownChartList,
      normalRetireAge: normalAge,
      earlyRetireAge:  earlyAge,
      earlyMonths:      earlyMonths,
      monthlyDiffText:   monthlyDiff.toFixed(2),
      normalPensionText: legalTotal.toFixed(2),
      earlyPensionText:  flexTotal.toFixed(2),
      normalBarWidth,
      earlyBarWidth,
      showCompare: flexTotal > 0 && flex.retireAgeExact > 0,
    })
  },

  onToggleBreakdown(e) {
    const idx = e.currentTarget.dataset.idx
    const k = 'breakdownList[' + idx + '].expanded'
    this.setData({ [k]: !this.data.breakdownList[idx].expanded })
  },

  // ── Step 4 行动卡片 ──
  onShareImage() {
    this._drawShareImage()
  },
  onCloseSharePreview() {
    this.setData({ showSharePreview: false, shareImagePath: '' })
  },
  onSaveShareImage() {
    const that = this
    const path = this.data.shareImagePath
    if (!path) return
    wx.saveImageToPhotosAlbum({
      filePath: path,
      success() {
        wx.showToast({ title: '已保存到相册', icon: 'success' })
        that.setData({ showSharePreview: false })
      },
      fail(err) {
        if (err.errMsg.indexOf('auth deny') !== -1) {
          wx.showModal({
            title: '提示',
            content: '需要您授权保存图片到相册',
            confirmText: '去授权',
            success(mres) {
              if (mres.confirm) wx.openSetting()
            }
          })
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  },

  _drawShareImage() {
    const that = this
    const d = this.data
    const result = d._calcResult
    if (!result) return

    wx.showLoading({ title: '生成分享图...' })

    const query = wx.createSelectorQuery()
    query.select('#shareCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) {
          wx.hideLoading()
          wx.showToast({ title: 'Canvas 初始化失败', icon: 'none' })
          return
        }

        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = wx.getWindowInfo().pixelRatio || 2

        // 分享图尺寸：750×1000
        const W = 375
        const H = 500
        canvas.width = W * dpr
        canvas.height = H * dpr
        ctx.scale(dpr, dpr)

        // ── 背景：顶部渐变蓝，底部白色 ──
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
        bgGrad.addColorStop(0, '#1e3a5f')
        bgGrad.addColorStop(0.35, '#2563eb')
        bgGrad.addColorStop(1, '#ffffff')
        ctx.fillStyle = bgGrad
        ctx.fillRect(0, 0, W, H)

        // ── 顶部品牌区 ──
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 11px PingFang SC, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('现实调音师', W / 2, 32)

        ctx.font = '10px PingFang SC, sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.75)'
        ctx.fillText('吉林省社保/养老金政策解读', W / 2, 48)

        // ── 养老金总额卡片 ──
        const cardY = 62
        ctx.fillStyle = '#ffffff'
        roundRect(ctx, 20, cardY, W - 40, 100, 12)
        ctx.fill()

        ctx.shadowColor = 'rgba(0,0,0,0.08)'
        ctx.shadowBlur = 8
        ctx.fillStyle = '#ffffff'
        roundRect(ctx, 20, cardY, W - 40, 100, 12)
        ctx.fill()
        ctx.shadowBlur = 0

        ctx.fillStyle = '#64748b'
        ctx.font = '10px PingFang SC, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('每月可领取养老金（估算）', W / 2, cardY + 24)

        ctx.fillStyle = '#1e3a5f'
        ctx.font = 'bold 28px PingFang SC, sans-serif'
        const totalText = '¥' + (d.totalPensionText || '0.00')
        ctx.fillText(totalText, W / 2, cardY + 62)

        ctx.fillStyle = '#94a3b8'
        ctx.font = '8px PingFang SC, sans-serif'
        ctx.fillText('实际金额以社保局核定为准', W / 2, cardY + 82)

        // ── 分项明细 ──
        const listY = cardY + 112
        ctx.textAlign = 'left'
        ctx.fillStyle = '#1e293b'
        ctx.font = 'bold 11px PingFang SC, sans-serif'
        ctx.fillText('养老金分项明细', 28, listY)

        const items = d.breakdownList.filter(it => it.value > 0)
        const barColors = ['#3b82f6','#8b5cf6','#059669','#f59e0b','#ec4899']
        const barLabels = ['基础养老金', '个人账户', '过渡性', '其它加发', '增发养老金']

        let barY = listY + 12
        const maxVal = Math.max(...items.map(it => it.value), 1)

        items.forEach((it, i) => {
          // 标签
          ctx.fillStyle = '#475569'
          ctx.font = '9px PingFang SC, sans-serif'
          ctx.fillText(barLabels[i] || it.label, 28, barY + 10)

          // 金额
          ctx.fillStyle = '#1e293b'
          ctx.font = 'bold 9px PingFang SC, sans-serif'
          ctx.textAlign = 'right'
          ctx.fillText('¥' + it.valueText, W - 28, barY + 10)
          ctx.textAlign = 'left'

          // 条形图
          const barX = 28
          const barW = W - 56
          const barH = 10
          ctx.fillStyle = '#f1f5f9'
          roundRect(ctx, barX, barY + 16, barW, barH, 5)
          ctx.fill()

          const fillW = Math.max(4, (it.value / maxVal) * barW)
          ctx.fillStyle = barColors[i] || '#3b82f6'
          roundRect(ctx, barX, barY + 16, fillW, barH, 5)
          ctx.fill()

          barY += 36
        })

        // ── 底部信息 ──
        const footerY = H - 40
        ctx.fillStyle = '#94a3b8'
        ctx.font = '8px PingFang SC, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('养老金计算平台 · 数据仅供参考', W / 2, footerY)
        ctx.fillText('测算时间：' + formatDate(new Date()), W / 2, footerY + 14)

        // ── 导出图片 ──
        wx.canvasToTempFilePath({
          canvas,
          x: 0,
          y: 0,
          width: W * dpr,
          height: H * dpr,
          destWidth: W * 2,
          destHeight: H * 2,
          fileType: 'png',
          success(res) {
            wx.hideLoading()
            that.setData({
              showSharePreview: true,
              shareImagePath: res.tempFilePath,
            })
          },
          fail() {
            wx.hideLoading()
            wx.showToast({ title: '生成图片失败', icon: 'none' })
          }
        })
      })
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
