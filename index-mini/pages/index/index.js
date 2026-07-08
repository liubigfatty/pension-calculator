// pages/index/index.js
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

// 各颗粒度示例数据
const SAMPLE = {
  A: JSON.stringify([
    { year: 2020, months: 12, baseAvg: 4980.5 },
    { year: 2021, months: 12, baseAvg: 5450.3 },
    { year: 2022, months: 11, baseAvg: 5890.1 }
  ], null, 2),
  B: JSON.stringify([
    { year: 2020, months: 12, baseAvg: 4980.5 },
    { year: 2021, months: 12, baseAvg: 5450.3 },
    { year: 2022, months: 11, baseAvg: 5890.1 }
  ], null, 2)
}

Page({
  data: {
    provinces: PROVINCES,
    provIndex: 6,            // 默认吉林省
    granularity: 'A',        // A详细 / B中等 / C最简
    mode: 'forward',         // forward 正向 / infer 反推
    aJson: '',
    bStartYear: '', bTotalMonths: '', bJson: '',
    cStartYear: '', cStartMonth: '', cTotalMonths: '', cBalance: '',
    loading: false
  },

  onProvChange(e) { this.setData({ provIndex: Number(e.detail.value) }) },
  onGranChange(e) { this.setData({ granularity: e.currentTarget.dataset.g }) },
  onModeChange(e) { this.setData({ mode: e.currentTarget.dataset.m }) },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value })
  },

  fillSample() {
    const g = this.data.granularity
    if (g === 'A') {
      this.setData({ aJson: SAMPLE.A })
    } else if (g === 'B') {
      this.setData({
        bStartYear: '2020', bTotalMonths: '35', bJson: SAMPLE.B
      })
    } else {
      this.setData({
        cStartYear: '2020', cStartMonth: '1', cTotalMonths: '35', cBalance: '80000'
      })
    }
    wx.showToast({ title: '已填入示例', icon: 'none' })
  },

  calc() {
    const { provinces, provIndex, granularity, mode } = this.data
    const province = provinces[provIndex].slug
    let contribution = {}
    let knownBalance = undefined

    try {
      if (granularity === 'A') {
        if (!this.data.aJson.trim()) throw new Error('请填写缴费数据')
        contribution = JSON.parse(this.data.aJson)
      } else if (granularity === 'B') {
        contribution = {
          startYear: Number(this.data.bStartYear) || 0,
          totalMonths: Number(this.data.bTotalMonths) || 0,
          yearlyData: this.data.bJson.trim() ? JSON.parse(this.data.bJson) : []
        }
      } else {
        contribution = {
          startYear: Number(this.data.cStartYear) || 0,
          startMonth: Number(this.data.cStartMonth) || 0,
          totalMonths: Number(this.data.cTotalMonths) || 0
        }
        if (mode === 'infer') {
          if (!this.data.cBalance.trim()) throw new Error('反推需填写当前账户余额')
          knownBalance = Number(this.data.cBalance)
        }
      }
    } catch (e) {
      wx.showToast({ title: '数据格式错误: ' + e.message, icon: 'none' })
      return
    }

    this.setData({ loading: true })
    wx.cloud.callFunction({
      name: 'calcIndex',
      data: { province, granularity, contribution, mode, knownBalance },
      success: res => {
        this.setData({ loading: false })
        const r = res.result
        if (!r || !r.success) {
          wx.showToast({ title: (r && r.error) || '计算失败', icon: 'none' })
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
