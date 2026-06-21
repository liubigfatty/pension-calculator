// pages/step1/step1.js
const app = getApp()

// 省份配置：名称 + 城市类型选项（对应引擎的 cityType）
// 注意：此配置需与 assets/province-meta.js 保持同步
const PROVINCE_CONFIG = [
  { code: 'jilin', name: '吉林省', cityTypes: [
    { type: 'changchun', label: '长春市（独立基数）' },
    { type: 'prov', label: '全省其他地区' }
  ]},
  { code: 'liaoning', name: '辽宁省', cityTypes: [
    { type: 'shenyang', label: '沈阳市（独立基数）' },
    { type: 'dalian', label: '大连市（独立基数）' },
    { type: 'prov', label: '全省其他地区' }
  ]},
  { code: 'heilongjiang', name: '黑龙江省', cityTypes: [
    { type: 'prov', label: '全省统一基数' }
  ]},
  { code: 'beijing', name: '北京市', cityTypes: [
    { type: 'prov', label: '全市统一' }
  ]},
  { code: 'shanghai', name: '上海市', cityTypes: [
    { type: 'prov', label: '全市统一' }
  ]},
  { code: 'tianjin', name: '天津市', cityTypes: [
    { type: 'prov', label: '全市统一' }
  ]},
  { code: 'hebei', name: '河北省', cityTypes: [
    { type: 'prov', label: '全省统一基数' }
  ]},
  { code: 'shanxi', name: '山西省', cityTypes: [
    { type: 'prov', label: '全省统一基数' }
  ]},
  { code: 'shandong', name: '山东省', cityTypes: [
    { type: 'prov', label: '全省统一基数' }
  ]},
  { code: 'henan', name: '河南省', cityTypes: [
    { type: 'zhengzhou', label: '郑州市（独立基数）' },
    { type: 'prov', label: '全省其他地区' }
  ]},
  { code: 'jiangsu', name: '江苏省', cityTypes: [
    { type: 'prov', label: '全省统一基数' }
  ]},
  { code: 'zhejiang', name: '浙江省', cityTypes: [
    { type: 'prov', label: '全省统一基数' }
  ]},
  { code: 'anhui', name: '安徽省', cityTypes: [
    { type: 'prov', label: '全省统一基数' }
  ]},
  { code: 'fujian', name: '福建省', cityTypes: [
    { type: 'prov', label: '全省统一基数' }
  ]},
  { code: 'jiangxi', name: '江西省', cityTypes: [
    { type: 'prov', label: '全省统一基数' }
  ]},
  { code: 'hubei', name: '湖北省', cityTypes: [
    { type: 'wh', label: '武汉市及省直（一档）' },
    { type: 'prov', label: '全省其他地区（二档）' },
    { type: 'tier3', label: '三档城市（孝感/荆州/黄冈等）' }
  ]},
  { code: 'hunan', name: '湖南省', cityTypes: [
    { type: 'prov', label: '全省统一基数' }
  ]},
  { code: 'guangdong', name: '广东省', cityTypes: [
    { type: 'shenzhen', label: '深圳市（独立体系）' },
    { type: 'prov', label: '全省其他地区' }
  ]},
  { code: 'guangxi', name: '广西壮族自治区', cityTypes: [
    { type: 'prov', label: '全区统一基数' }
  ]},
  { code: 'hainan', name: '海南省', cityTypes: [
    { type: 'prov', label: '全省统一基数' }
  ]},
  { code: 'chongqing', name: '重庆市', cityTypes: [
    { type: 'prov', label: '全市统一' }
  ]},
  { code: 'sichuan', name: '四川省', cityTypes: [
    { type: 'prov', label: '全省统一基数' }
  ]},
  { code: 'guizhou', name: '贵州省', cityTypes: [
    { type: 'prov', label: '全省统一基数' }
  ]},
  { code: 'yunnan', name: '云南省', cityTypes: [
    { type: 'prov', label: '全省统一基数' }
  ]},
  { code: 'shaanxi', name: '陕西省', cityTypes: [
    { type: 'prov', label: '全省统一基数' }
  ]},
  { code: 'gansu', name: '甘肃省', cityTypes: [
    { type: 'prov', label: '全省统一基数' }
  ]},
  { code: 'qinghai', name: '青海省', cityTypes: [
    { type: 'prov', label: '全省统一基数' }
  ]},
  { code: 'neimenggu', name: '内蒙古自治区', cityTypes: [
    { type: 'prov', label: '全区统一基数' }
  ]},
  { code: 'xinjiang', name: '新疆维吾尔自治区', cityTypes: [
    { type: 'prov', label: '全区统一基数' }
  ]},
  { code: 'xizang', name: '西藏自治区', cityTypes: [
    { type: 'prov', label: '全区统一基数' }
  ]},
  { code: 'ningxia', name: '宁夏回族自治区', cityTypes: [
    { type: 'prov', label: '全区统一基数' }
  ]}
]

Page({
  data: {
    provinceNames: [],
    provinceIndex: -1,
    cityTypeNames: [],
    cityTypeIndex: -1,
    currentCityTypes: []
  },

  onLoad() {
    const names = PROVINCE_CONFIG.map(p => p.name)
    this.setData({ provinceNames: names })
  },

  // 选择省份 → 动态更新城市类型列表
  onProvinceChange(e) {
    const index = parseInt(e.detail.value)
    const prov = PROVINCE_CONFIG[index]
    const cityTypeNames = prov.cityTypes.map(c => c.label)

    this.setData({
      provinceIndex: index,
      cityTypeNames,
      cityTypeIndex: 0, // 默认选第一个
      currentCityTypes: prov.cityTypes
    })
  },

  // 选择城市/基数类型
  onCityTypeChange(e) {
    this.setData({ cityTypeIndex: parseInt(e.detail.value) })
  },

  // 下一步
  onNext() {
    if (this.data.provinceIndex < 0 || this.data.provinceIndex === undefined) {
      wx.showToast({ title: '请选择参保省份', icon: 'none' })
      return
    }

    const prov = PROVINCE_CONFIG[this.data.provinceIndex]
    const selectedCity = this.data.currentCityTypes[this.data.cityTypeIndex]

    app.globalData.calcInput = Object.assign(app.globalData.calcInput || {}, {
      province: prov.code,
      provinceName: prov.name,
      cityType: selectedCity.type,
      cityLabel: selectedCity.label
    })

    wx.navigateTo({ url: '/pages/step2/step2' })
  }
})
