// pages/index/index.js
// 设计（v2 简化版）：只服务「有逐年缴费明细」的人
//   第一行：参保地（省份）—— 决定用哪套社平工资
//   第二行：首次缴费年月 —— 锚定清单起点（含首年实际缴费月数）
//   第三行：缴费年度范围（起始年份 ~ 截止年份）—— 框定逐年清单覆盖的年份区间
//   下面紧跟：逐年缴费明细（按年度范围自动生成年份行；有缴的年份填月均基数，没缴留空）
const PROVINCES = [
  { slug: 'beijing', name: '北京市' },
  { slug: 'tianjin', name: '天津市' },
  { slug: 'hebei', name: '河北省' },
  { slug: 'shanxi', name: '山西省' },
  { slug: 'neimenggu', name: '内蒙古自治区' },
  { slug: 'liaoning', name: '辽宁省' },
  { slug: 'jilin', name: '吉林省' },
  { slug: 'heilongjiang', name: '黑龙江省' },
  { slug: 'shanghai', name: '上海市' },
  { slug: 'jiangsu', name: '江苏省' },
  { slug: 'zhejiang', name: '浙江省' },
  { slug: 'anhui', name: '安徽省' },
  { slug: 'fujian', name: '福建省' },
  { slug: 'jiangxi', name: '江西省' },
  { slug: 'shandong', name: '山东省' },
  { slug: 'henan', name: '河南省' },
  { slug: 'hubei', name: '湖北省' },
  { slug: 'hunan', name: '湖南省' },
  { slug: 'guangdong', name: '广东省' },
  { slug: 'guangxi', name: '广西壮族自治区' },
  { slug: 'hainan', name: '海南省' },
  { slug: 'chongqing', name: '重庆市' },
  { slug: 'sichuan', name: '四川省' },
  { slug: 'guizhou', name: '贵州省' },
  { slug: 'yunnan', name: '云南省' },
  { slug: 'xizang', name: '西藏自治区' },
  { slug: 'shaanxi', name: '陕西省' },
  { slug: 'gansu', name: '甘肃省' },
  { slug: 'qinghai', name: '青海省' },
  { slug: 'ningxia', name: '宁夏回族自治区' },
  { slug: 'xinjiang', name: '新疆维吾尔自治区' }
]

const SAMPLE_YEARLY = [
  { year: 1998, months: 6, baseAvg: 353.0 },
  { year: 1999, months: 12, baseAvg: 353.0 },
  { year: 2000, months: 12, baseAvg: 436.8 },
  { year: 2001, months: 12, baseAvg: 2154.0 },
  { year: 2002, months: 12, baseAvg: 488.0 },
  { year: 2003, months: 12, baseAvg: 589.0 },
  { year: 2004, months: 13, baseAvg: 1500.0 },
  { year: 2005, months: 12, baseAvg: 1500.0 },
  { year: 2006, months: 12, baseAvg: 1500.0 },
  { year: 2007, months: 12, baseAvg: 2200.0 },
  { year: 2008, months: 12, baseAvg: 2183.33 },
  { year: 2009, months: 12, baseAvg: 1598.67 },
  { year: 2010, months: 12, baseAvg: 1522.0 },
  { year: 2011, months: 12, baseAvg: 1786.0 },
  { year: 2012, months: 12, baseAvg: 2074.0 },
  { year: 2013, months: 12, baseAvg: 10941.0 },
  { year: 2014, months: 12, baseAvg: 11174.0 },
  { year: 2015, months: 12, baseAvg: 8300.38 },
  { year: 2016, months: 12, baseAvg: 11351.97 },
  { year: 2017, months: 12, baseAvg: 10857.65 },
  { year: 2018, months: 12, baseAvg: 14714.6 },
  { year: 2019, months: 12, baseAvg: 15151.17 },
  { year: 2020, months: 13, baseAvg: 14475.01 },
  { year: 2021, months: 12, baseAvg: 16639.75 },
  { year: 2022, months: 11, baseAvg: 18532.95 }
]

Page({
  data: {
    provinces: PROVINCES,
    provIndex: 6,
    gapHint: '',
    startYear: '', startMonth: '',
    yearRange: [],
    listStartYear: '', listStartIdx: -1,
    listEndYear: '',   listEndIdx: -1,
    yearlyList: [],
    loading: false
  },

  onLoad() {
    const curY = new Date().getFullYear()
    const yearRange = []
    for (let y = 1990; y <= curY; y++) yearRange.push(y)
    this.setData({ yearRange, listEndYear: curY, listEndIdx: yearRange.length - 1 })
  },

  onProvChange(e) {
    const provIndex = Number(e.detail.value)
    const prov = this.data.provinces[provIndex]
    const GAP_SET = new Set(['beijing', 'tianjin', 'shaanxi', 'zhejiang', 'yunnan'])
    const gapHint = GAP_SET.has(prov.slug)
      ? '提示：' + prov.name + '执行“断缴年份按指数0计入平均指数”规则——中间断缴的年份会拉低您的平均指数，请如实逐年填写。'
      : ''
    this.setData({ provIndex, gapHint })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value }, () => {
      if (['startYear', 'startMonth'].includes(field)) {
        const { startYear, startMonth, yearlyList, yearRange } = this.data
        const sy = Number(startYear) || 0, sm = Number(startMonth) || 0
        if (sy) {
          const idx = yearRange.indexOf(sy)
          if (idx >= 0) this.setData({ listStartYear: sy, listStartIdx: idx })
        }
        if (yearlyList.length && yearlyList.some(r => r.year)) {
          this.genYearly(true)
        } else if (sy && sm && yearlyList.every(r => !r.year)) {
          this.genYearly(true)
        }
      }
    })
  },

  onRangeChange(e) {
    const field = e.currentTarget.dataset.field
    const idx = Number(e.detail.value)
    const year = this.data.yearRange[idx]
    if (field === 'start') {
      this.setData({ listStartIdx: idx, listStartYear: year }, () => this.maybeRegen())
    } else {
      this.setData({ listEndIdx: idx, listEndYear: year }, () => this.maybeRegen())
    }
  },

  maybeRegen() {
    const list = this.data.yearlyList
    if (list.length && list.some(r => r.year)) this.genYearly(true)
  },

  genYearly(silent) {
    const sy = Number(this.data.listStartYear) || Number(this.data.startYear) || 0
    const ey = Number(this.data.listEndYear) || new Date().getFullYear()
    const firstYear = Number(this.data.startYear) || sy
    const firstMonth = Number(this.data.startMonth) || 1
    if (!sy || !ey || sy > ey) {
      if (!silent) wx.showToast({ title: '请先设置缴费年度范围', icon: 'none' })
      return
    }
    const oldMap = {}
    this.data.yearlyList.forEach(r => { if (r.year && r.baseAvg) oldMap[r.year] = r.baseAvg })
    const rows = []
    let y = sy
    while (y <= ey) {
      const months = (y === firstYear) ? (firstMonth > 1 ? 13 - firstMonth : 12) : 12
      rows.push({ year: y, months, baseAvg: oldMap[y] || '' })
      y += 1
    }
    this.setData({ yearlyList: rows })
    if (!silent) wx.showToast({ title: '已生成 ' + rows.length + ' 行', icon: 'none' })
  },

  addYear() {
    const list = this.data.yearlyList.slice()
    const lastYear = list.length ? list[list.length - 1].year : (Number(this.data.listStartYear) || new Date().getFullYear())
    list.push({ year: lastYear + 1, months: 12, baseAvg: '' })
    this.setData({ yearlyList: list })
  },

  delRow(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const list = this.data.yearlyList.slice()
    list.splice(idx, 1)
    this.setData({ yearlyList: list })
  },

  onYearlyInput(e) {
    const { idx, sub } = e.currentTarget.dataset
    this.setData({ ['yearlyList[' + idx + '].' + sub]: e.detail.value })
  },

  fillSample() {
    const yr = this.data.yearRange
    const sIdx = yr.indexOf(1998)
    const eIdx = yr.indexOf(2022)
    this.setData({
      provIndex: 6,
      startYear: '1998', startMonth: '7',
      listStartYear: 1998, listStartIdx: sIdx,
      listEndYear: 2022, listEndIdx: eIdx,
      yearlyList: SAMPLE_YEARLY.map(r => ({ year: r.year, months: r.months, baseAvg: String(r.baseAvg) }))
    }, () => {
      wx.showToast({ title: '已填入吉林示例（25年）', icon: 'none' })
    })
  },

  calc() {
    const { provinces, provIndex, startYear, startMonth } = this.data
    const province = provinces[provIndex].slug
    const sy = Number(startYear) || 0
    const sm = Number(startMonth) || 0

    if (!sy || !sm) {
      wx.showToast({ title: '请填写首次缴费年月', icon: 'none' })
      return
    }

    const yearlyData = this.data.yearlyList
      .filter(r => Number(r.year) > 0 && Number(r.months) > 0)
      .map(r => ({ year: Number(r.year), months: Number(r.months), baseAvg: Number(r.baseAvg) || 0 }))

    if (!yearlyData.some(r => r.baseAvg > 0)) {
      wx.showToast({ title: '请至少填写一年的月均缴费基数', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    wx.cloud.callFunction({
      name: 'calcIndex',
      data: { province, startYear: sy, startMonth: sm, yearlyData },
      success: res => {
        this.setData({ loading: false })
        const r = res.result
        if (!r || !r.success) {
          const errMsg = (r && r.error) || '计算失败'
          if (errMsg.length > 20) {
            wx.showModal({ title: '提示', content: errMsg, showCancel: false })
          } else {
            wx.showToast({ title: errMsg, icon: 'none' })
          }
          return
        }
        getApp().globalData.result = r
        wx.navigateTo({ url: '/pages/result/result' })
      },
      fail: err => {
        this.setData({ loading: false })
        wx.showToast({ title: '调用失败: ' + (err.errMsg || err), icon: 'none' })
      }
    })
  }
})
