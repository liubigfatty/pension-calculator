// pages/step1/step1.js - 个人信息页（整合版）
const app = getApp()

Page({
  data: {
    // 参保地
    provinceNames: ['北京','天津','河北','山西','内蒙古','辽宁','吉林','黑龙江','上海','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','广西','海南','重庆','四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏','新疆'],
    provinceIndex: -1,

    // 退休类型（整合性别+人员类型）
    retireTypeNames: [
      '企业职工男',
      '企业职工女（原50岁退休）',
      '企业职工女（原55岁退休）',
      '灵活就业男',
      '灵活就业女'
    ],
    retireTypeIndex: -1,

    // 出生日期（格式：1970-06）
    birthDate: '',
    today: '',

    // 参加工作时间（格式：1995-07）
    workDate: '',

    // 退休方案
    retirePlan: 'normal'  // 'normal' | 'early'
  },

  onLoad() {
    // 今天的日期（用于限制日期选择器上限）
    const now = new Date()
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')

    // 恢复已填数据或使用默认值
    const saved = wx.getStorageSync('form_step1') || {}

    this.setData({
      today: today,
      provinceIndex: saved.provinceIndex ?? -1,
      retireTypeIndex: saved.retireTypeIndex ?? -1,
      // 出生日期：恢复已填或使用默认（1970-06）
      birthDate: saved.birthDate || '1970-06',
      // 参加工作时间：恢复已填或使用默认（1995-07）
      workDate: saved.workDate || '1995-07',
      retirePlan: saved.retirePlan || 'normal'
    })
  },

    // 选择省份
  onProvinceChange(e) {
    this.setData({ provinceIndex: Number(e.detail.value) })
  },

  // 选择退休类型
  onRetireTypeChange(e) {
    this.setData({ retireTypeIndex: Number(e.detail.value) })
  },

  // 选择出生日期
  onBirthDateChange(e) {
    // 格式：1970-06-01
    const date = e.detail.value
    const yearMonth = date.substring(0, 7)  // 取前7位：1970-06
    this.setData({ birthDate: yearMonth })
  },

  // 选择参加工作时间
  onWorkDateChange(e) {
    const date = e.detail.value
    const yearMonth = date.substring(0, 7)
    this.setData({ workDate: yearMonth })
  },

  // 把 "1970-06" 拆成 yearIndex 和 monthIndex
  _parseDateToIndex(dateStr, startYear) {
    if (!dateStr) return { yearIndex: -1, monthIndex: -1 }
    const [year, month] = dateStr.split('-').map(Number)
    const yearIndex = year - startYear
    const monthIndex = month - 1  // 月份转0-11
    return { yearIndex, monthIndex }
  },

  // 选择退休方案
  onRetirePlanChange(e) {
    this.setData({ retirePlan: e.currentTarget.dataset.value })
  },

  // 校验并通过
  goNext() {
    const d = this.data

    if (d.provinceIndex < 0) return wx.showToast({ title: '请选择参保地', icon: 'none' })
    if (d.retireTypeIndex < 0) return wx.showToast({ title: '请选择人员类型', icon: 'none' })
    if (!d.birthDate) return wx.showToast({ title: '请选择出生日期', icon: 'none' })
    if (!d.workDate) return wx.showToast({ title: '请选择参加工作时间', icon: 'none' })

    // 保存数据到缓存
    const birth = this._parseDateToIndex(d.birthDate, 1960)  // 出生日期从1960年开始
    const work = this._parseDateToIndex(d.workDate, 1980)  // 参加工作从1980年开始

    // 省份中文名称（供结果页显示）
    const provinceName = d.provinceIndex >= 0 ? d.provinceNames[d.provinceIndex] : ''

    wx.setStorageSync('form_step1', {
      provinceIndex: d.provinceIndex,
      provinceName: provinceName,    // 省份中文名称
      retireTypeIndex: d.retireTypeIndex,
      // 出生日期
      birthDate: d.birthDate,          // 字符串：1970-06
      birthYearIndex: birth.yearIndex,   // 索引：10（1970-1960=10）
      birthMonthIndex: birth.monthIndex,  // 索引：5（6月-1=5）
      // 参加工作时间
      workDate: d.workDate,             // 字符串：1995-07
      workYearIndex: work.yearIndex,     // 索引：15（1995-1980=15）
      workMonthIndex: work.monthIndex,   // 索引：6（7月-1=6）
      retirePlan: d.retirePlan,
    })

    wx.navigateTo({ url: '/pages/step2/step2' })
  },
})

