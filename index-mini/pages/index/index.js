// pages/index/index.js
// 设计（v3）：只服务「有逐年缴费明细」的人，UI 与养老金主程序（正元金）统一
//   第一行：参保地（省份）—— 决定用哪套社平工资
//   第二行：首次缴费年月 —— 锚定清单起点（含首年实际缴费月数）
//   逐年缴费明细：从首次缴费年自动铺到当前年份（去掉截止年份，清单即覆盖全部应缴年）
//   有缴的年份填月均基数，没缴的年份留空（5省按应缴费年限计入断缴=0，其余省忽略）
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
    provIndex: 6,
    gapHint: '',
    today: '',
    startDate: '',
    startYear: '',
    startMonth: '',
    yearlyList: [],
    loading: false
  },

  onLoad() {
    const now = new Date()
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    this.setData({ today })
  },

  onProvChange(e) {
    const provIndex = Number(e.detail.value)
    const prov = this.data.provinces[provIndex]
    // 断缴年份按0计入平均指数的省份：北京/天津/陕西/浙江/云南
    const GAP_SET = new Set(['beijing', 'tianjin', 'shaanxi', 'zhejiang', 'yunnan'])
    const gapHint = GAP_SET.has(prov.slug)
      ? '提示：' + prov.name + '执行“断缴年份按指数0计入平均指数”规则——中间断缴的年份会拉低您的平均指数，请如实逐年填写。'
      : ''
    this.setData({ provIndex, gapHint })
  },

  // 首次缴费年月：复用养老金主程序的「年月」时间选择器（picker mode=date fields=month）
  onStartDateChange(e) {
    const ym = e.detail.value.substring(0, 7)  // 形如 "1995-07"（detail.value 为 "1995-07-01"）
    const [y, m] = ym.split('-').map(Number)
    this.setData({ startDate: ym, startYear: String(y), startMonth: String(m) }, () => {
      this.genYearly(true)
    })
  },

  // 逐年明细：从「首次缴费年」自动铺到当前年份（去掉了截止年份，清单即覆盖全部应缴年）
  //   endYear 每次都按 new Date().getFullYear() 实时取，确保跨年（今年2026、明年2027…）始终正确
  //   endYearOverride 仅用于示例按钮（示例数据止于2022）
  genYearly(silent, endYearOverride) {
    const sy = Number(this.data.startYear) || 0
    const sm = Number(this.data.startMonth) || 1
    const ey = Number(endYearOverride) || new Date().getFullYear()
    if (!sy) {
      if (!silent) wx.showToast({ title: '请先填写首次缴费年月', icon: 'none' })
      return
    }
    if (sy > ey) {
      if (!silent) wx.showToast({ title: '起始年不能晚于今年', icon: 'none' })
      return
    }
    // 保留已填的月均基数，避免重生成时清空
    const oldMap = {}
    this.data.yearlyList.forEach(r => { if (r.year && r.baseAvg) oldMap[r.year] = r.baseAvg })
    const rows = []
    let y = sy
    while (y <= ey) {
      const months = (y === sy) ? (sm > 1 ? 13 - sm : 12) : 12
      rows.push({ year: y, months, baseAvg: oldMap[y] || '' })
      y += 1
    }
    this.setData({ yearlyList: rows })
    if (!silent) wx.showToast({ title: '已生成 ' + rows.length + ' 行', icon: 'none' })
  },

  onYearlyInput(e) {
    const { idx, sub } = e.currentTarget.dataset
    this.setData({ ['yearlyList[' + idx + '].' + sub]: e.detail.value })
  },

  calc() {
    // 隐私合规门禁（P0-3）：未同意《隐私保护指引》前禁用计算
    const app = getApp()
    if (!app.globalData.privacyAuthorized) {
      wx.showModal({
        title: '隐私授权',
        content: '我们仅在本机计算你输入的缴费数据，不会上传。点击同意即代表你已知晓《隐私保护指引》。',
        showCancel: false,
        success() { app.showPrivacyAuthorize && app.showPrivacyAuthorize() }
      })
      return
    }

    const { provinces, provIndex, startYear, startMonth } = this.data
    const province = provinces[provIndex].slug
    const sy = Number(startYear) || 0
    const sm = Number(startMonth) || 0

    if (!sy || !sm) {
      wx.showToast({ title: '请填写首次缴费年月', icon: 'none' })
      return
    }

    // 发送所有年份行（含空行/断缴年）。空行 baseAvg=0，由云函数按省份规则决定是否计入分母
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
