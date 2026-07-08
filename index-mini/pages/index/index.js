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

Page({
  data: {
    provinces: PROVINCES,
    provIndex: 6,            // 默认吉林省
    // 基础信息
    startYear: '', startMonth: '', totalMonths: '',
    // 缴费基数（能填多少填多少）
    monthlyBase: '',         // 月均缴费基数（统一值）
    showDetail: false,       // 是否展开逐年明细
    yearlyList: [{ year: '', months: '', baseAvg: '' }],  // 逐年明细（逐行表单）
    // 账户余额（选填）
    balance: '',
    loading: false
  },

  onProvChange(e) { this.setData({ provIndex: Number(e.detail.value) }) },
  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value })
  },
  toggleDetail() {
    const show = !this.data.showDetail
    if (show) {
      const empty = this.data.yearlyList.every(r => !r.year && !r.months && !r.baseAvg)
      if (empty) this.genYearly(true)
    }
    this.setData({ showDetail: show })
  },

  // 逐年明细：按参加工作时间自动生成年份行，用户只需填月均基数
  genYearly(silent) {
    const sy = Number(this.data.startYear) || 0
    const sm = Number(this.data.startMonth) || 0
    const tm = Number(this.data.totalMonths) || 0
    if (!sy || !sm) { wx.showToast({ title: '请先填参加工作时间', icon: 'none' }); return }
    if (tm <= 0) { wx.showToast({ title: '请先填累计缴费月数', icon: 'none' }); return }
    // 保留已填的基数（按年份匹配），重新生成行
    const oldMap = {}
    this.data.yearlyList.forEach(r => { if (r.year && r.baseAvg) oldMap[r.year] = r.baseAvg })
    const rows = []
    let rem = tm, y = sy, m = sm
    while (rem > 0) {
      const mty = 13 - m
      const mm = Math.min(rem, mty > 0 ? mty : 12)
      rows.push({ year: y, months: mm, baseAvg: oldMap[y] || '' })
      rem -= mm; y += 1; m = 1
    }
    this.setData({ yearlyList: rows })
    if (!silent) wx.showToast({ title: '已生成 ' + rows.length + ' 行', icon: 'none' })
  },
  onYearlyInput(e) {
    const { idx, sub } = e.currentTarget.dataset
    this.setData({ [`yearlyList[${idx}].${sub}`]: e.detail.value })
  },

  fillSample() {
    this.setData({
      startYear: '1998', startMonth: '7', totalMonths: '295',
      monthlyBase: '5000',
      balance: '204822.97'
    })
    wx.showToast({ title: '已填入示例', icon: 'none' })
  },

  calc() {
    const { provinces, provIndex, startYear, startMonth, totalMonths,
            monthlyBase, showDetail, balance } = this.data
    const province = provinces[provIndex].slug

    const sy = Number(startYear) || 0
    const sm = Number(startMonth) || 0
    const tm = Number(totalMonths) || 0
    const mb = Number(monthlyBase) || 0
    const kb = Number(balance) || 0

    if (!sy || !sm) {
      wx.showToast({ title: '请填写参加工作时间', icon: 'none' })
      return
    }
    if (tm <= 0 && mb <= 0 && kb <= 0) {
      wx.showToast({ title: '请至少填写累计月数/月均基数/余额之一', icon: 'none' })
      return
    }
    if (tm <= 0 && (mb > 0 || kb > 0)) {
      wx.showToast({ title: '请填写累计缴费月数', icon: 'none' })
      return
    }

    // 逐年明细（逐行表单，可选）
    let yearlyData = []
    if (showDetail) {
      yearlyData = this.data.yearlyList
        .map(r => ({ year: Number(r.year), months: Number(r.months), baseAvg: Number(r.baseAvg) }))
        .filter(r => r.year > 0 && r.months > 0 && r.baseAvg > 0)
    }

    this.setData({ loading: true })
    wx.cloud.callFunction({
      name: 'calcIndex',
      data: { province, startYear: sy, startMonth: sm, totalMonths: tm, monthlyBase: mb, yearlyData, knownBalance: kb },
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
