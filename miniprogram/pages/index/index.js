/**
 * 首页 - 引导式填表流程（5步）
 */
const provinceUtil = require('../../utils/province')

Page({
  data: {
    step: 1,
    maxStep: 5,

    // Step 1: 身份 + 性别
    employType: '',       // 'employee' | 'flexible'
    genderType: '',       // 'male' | 'fw' | 'fc' | 'female'
    genderOptions: [],

    // Step 2: 出生/参工
    birthYear: 1970,
    birthMonth: 1,
    workYear: 1995,
    workMonth: 1,
    birthYearRange: [],
    workYearRange: [],
    monthRange: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],

    // Step 3: 地区
    provinceList: [],
    provinceIndex: 0,
    cityList: [{code:'prov',name:'全省默认'}],
    cityIndex: 0,

    // Step 4: 缴费水平（默认选中100%）
    payLevel: 2,          // 2=100%
    avgIndex: 1.0,
    personalAcc: '',
    accEstimate: '',

    // Step 5: 其它加发
    specialFlag: '',
    specialOptions: [{value:'',label:'无'},{value:'oneChild',label:'独生子女'}],
    showAdv: false,

    // 状态
    loading: false,
    configLoaded: false,
    currentConfig: null
  },

  onLoad() {
    // 生成年份范围（出生从1962开始，参工从1978开始）
    var now = new Date().getFullYear()
    var birthYears = []
    for (var y = 1962; y <= now; y++) birthYears.push(y)
    var workYears = []
    for (var y = 1978; y <= now; y++) workYears.push(y)
    this.setData({
      birthYearRange: birthYears,
      workYearRange: workYears,
      provinceList: provinceUtil.PROVINCE_LIST,
      genderOptions: [{value:'male',label:'男 (60岁)'},{value:'fw',label:'女工人 (50岁)'},{value:'fc',label:'女干部 (55岁)'}]
    })
    // 自动加载第一个省份（吉林省）配置
    this.loadProvinceData(0)
  },

  loadProvinceData(idx) {
    var id = this.data.provinceList[idx].id
    this.setData({ provinceIndex: idx, loading: true })
    var self = this
    provinceUtil.loadProvince(id).then(config => {
      if (!config) {
        self.setData({ loading: false })
        wx.showToast({title:'省份配置加载失败',icon:'none'})
        return
      }
      var cities = config.cities || [{code:'prov',name:'全省默认'}]
      // 确保全省默认在第一位
      if (cities.length > 0 && cities[0].code !== 'prov') {
        cities.unshift({code:'prov',name:'全省默认'})
      }
      self.setData({
        currentConfig: config,
        cityList: cities,
        cityIndex: 0,
        loading: false,
        configLoaded: true
      })
      self.estimateAccount(config)
    }).catch(function(err) {
      self.setData({ loading: false })
      wx.showToast({title:'省份加载失败',icon:'none'})
    })
  },

  // ===== 步骤导航 =====
  nextStep() {
    var s = this.data.step
    if (!this.validateStep(s)) return
    this.setData({ step: s + 1 })
  },
  prevStep() {
    if (this.data.step > 1) {
      this.setData({ step: this.data.step - 1 })
    }
  },

  validateStep(s) {
    var d = this.data
    switch(s) {
      case 1:
        if (!d.employType) { wx.showToast({title:'请选择人员身份',icon:'none'}); return false }
        if (!d.genderType) { wx.showToast({title:'请选择性别',icon:'none'}); return false }
        return true
      case 2:
        if (!d.birthYear || !d.birthMonth) { wx.showToast({title:'请填写出生年月',icon:'none'}); return false }
        if (!d.workYear || !d.workMonth) { wx.showToast({title:'请填写参工年月',icon:'none'}); return false }
        return true
      case 3:
        if (!d.currentConfig) { wx.showToast({title:'省份配置加载中，请稍候',icon:'none'}); return false }
        return true
      case 4:
        return true
      case 5:
        return true
    }
    return true
  },

  // ===== Step 1: 身份 + 性别 =====
  onEmployTap(e) {
    var et = e.currentTarget.dataset.value
    var opts = et === 'flexible'
      ? [{value:'male',label:'男 (60岁)'},{value:'female',label:'女 (55岁)'}]
      : [{value:'male',label:'男 (60岁)'},{value:'fw',label:'女工人 (50岁)'},{value:'fc',label:'女干部 (55岁)'}]
    var sfOpts = et === 'flexible'
      ? [{value:'',label:'无'},{value:'oneChild',label:'独生子女'}]
      : [{value:'',label:'无'},{value:'oneChild',label:'独生子女'},{value:'intellectual',label:'知识分子'},{value:'both',label:'独生+知识分子'}]
    this.setData({
      employType: et,
      genderType: '',
      genderOptions: opts,
      specialOptions: sfOpts,
      specialFlag: ''
    })
  },

  onGenderTap(e) {
    this.setData({ genderType: e.currentTarget.dataset.value })
  },

  // ===== Step 2: 出生/参工 =====
  onBirthChange(e) {
    this.setData({ birthYear: this.data.birthYearRange[e.detail.value] })
  },
  onBirthMonthChange(e) {
    this.setData({ birthMonth: e.detail.value + 1 })
  },
  onWorkChange(e) {
    this.setData({ workYear: this.data.workYearRange[e.detail.value] })
  },
  onWorkMonthChange(e) {
    this.setData({ workMonth: e.detail.value + 1 })
  },

  // ===== Step 3: 地区 =====
  onProvinceChange(e) {
    this.loadProvinceData(e.detail.value)
  },

  onCityChange(e) {
    this.setData({ cityIndex: e.detail.value })
  },

  // ===== Step 4: 缴费水平 =====
  onPayLevelTap(e) {
    var level = parseInt(e.currentTarget.dataset.value)
    var idx = [0.6, 0.8, 1.0][level]
    this.setData({
      payLevel: level,
      avgIndex: idx
    })
    this.estimateAccount(this.data.currentConfig)
  },

  onIndexInput(e) {
    var val = parseFloat(e.detail.value) || 1.0
    this.setData({ avgIndex: val, payLevel: -1 })
    this.estimateAccount(this.data.currentConfig)
  },

  onAccInput(e) {
    this.setData({ personalAcc: e.detail.value })
  },

  estimateAccount(config) {
    if (!config) return
    var provRates = config.base_rates && config.base_rates.prov
    if (!provRates) return
    var years = Object.keys(provRates).map(Number).filter(y => y >= 2015 && y <= 2025)
    if (years.length === 0) years = Object.keys(provRates).map(Number).slice(-10)
    var sum = 0
    years.forEach(y => sum += provRates[y])
    var avgBase = sum / years.length
    var idx = this.data.avgIndex || 1.0
    var retireY = this.data.birthYear + 60
    var totalY = Math.max(retireY - this.data.workYear, 15)
    var est = Math.round(avgBase * idx * 0.08 * 12 * totalY * 1.3)
    est = Math.round(est / 10000) * 10000
    this.setData({
      accEstimate: '约 ' + est.toLocaleString() + ' 元',
      personalAcc: this.data.personalAcc || est.toString()
    })
  },

  // ===== Step 5: 其它加发 =====
  onSpecialTap(e) {
    this.setData({ specialFlag: e.currentTarget.dataset.value })
  },
  toggleAdv() {
    this.setData({ showAdv: !this.data.showAdv })
  },

  // ===== 开始测算 =====
  doCalculate() {
    if (!this.validateStep(5)) return;
    if (!this.data.currentConfig) {
      wx.showToast({title:'省份配置未加载',icon:'none'});
      return;
    }
    try {
      var engine = require('../../utils/pension-engine')
      var d = this.data;
      var input = {
        name: '测算用户',
        gender: (d.genderType === 'male') ? 'male' : 'female',
        genderType: d.genderType,
        cityType: d.cityList[d.cityIndex].code,
        retireType: 'standard',
        birthYear: d.birthYear,
        birthMonth: d.birthMonth,
        workYear: d.workYear,
        workMonth: d.workMonth,
        avgIndex: d.avgIndex,
        personalAccInput: parseFloat(d.personalAcc) || undefined,
        skipDelay: false
      };
      if (d.employType === 'flexible') input.sightYears = 0;
      if (d.specialFlag === 'oneChild' || d.specialFlag === 'both') input.oneChild = true;
      if (d.specialFlag === 'intellectual' || d.specialFlag === 'both') input.intellectual = true;
      try {
        var result = engine.calculate(d.currentConfig, input);
        var app = getApp();
        app.globalData.lastResult = result;
        app.globalData.lastInput = input;
        app.globalData.employType = d.employType;
        app.globalData.lastProvince = d.provinceList[d.provinceIndex].name;
        app.globalData.lastCityName = d.cityList[d.cityIndex].name;
        wx.navigateTo({ url: '/pages/result/result' });
      } catch(e) {
        wx.showToast({title:'计算失败: ' + e.message, icon:'none'});
      }
    } catch(e) {
      wx.showToast({title:'引擎加载失败',icon:'none'});
    }
  }
});
