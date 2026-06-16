/**
 * 完整报告页
 */
// 引擎延迟加载（避免初始化超时）

Page({
  data: {
    headerTitle: '',
    headerMeta: '',
    personalInfo: [],
    legalSummary: '',
    legalCalc: [],
    legalTotal: '--',
    showFlex: false,
    flexSummary: '',
    flexCalc: [],
    flexTotal: '--',
    cmpDetail: '',
    suggestions: []
  },

  onLoad() {
    var app = getApp()
    var r = app.globalData.lastResult
    var input = app.globalData.lastInput
    var employType = app.globalData.employType || 'employee'
    if (!r || !input) { wx.navigateBack(); return }

    var L = r.legal
    var F = r.flex
    var C = r.comparison
    var pName = app.globalData.lastProvince || '吉林省'
    var cName = app.globalData.lastCityName || (input.cityType === 'prov' ? '全省默认' : input.cityType)

    var now = new Date()
    var reportId = 'RP' + now.getFullYear() + ('0'+(now.getMonth()+1)).slice(-2) + ('0'+now.getDate()).slice(-2)
    var genderLbl = function(gt, et) {
      if (et === 'flexible') return gt === 'male' ? '男性灵活就业' : '女性灵活就业'
      return gt === 'male' ? '男职工' : gt === 'fw' ? '女工人' : gt === 'fc' ? '女干部' : '女'
    }

    this.setData({
      headerTitle: pName + ' · ' + genderLbl(input.genderType, employType) + ' · 养老金测算报告',
      headerMeta: '生成时间：' + now.toLocaleString('zh-CN') + '  报告编号：' + reportId,
      personalInfo: [
        {label:'退休省份', value: pName},
        {label:'城市/地区', value: cName},
        {label:'人员身份', value: genderLbl(input.genderType, employType)},
        {label:'出生年月', value: input.birthYear + '年' + input.birthMonth + '月'},
        {label:'参加工作时间', value: input.workYear + '年' + input.workMonth + '月'},
        {label:'平均缴费指数', value: (input.avgIndex || 1.0).toFixed(4)},
        {label:'个人账户余额', value: '¥' + (input.personalAccInput || 0).toLocaleString('zh-CN')}
      ],
      legalSummary: this.buildSummary(L),
      legalCalc: this.buildCalcSteps(L),
      legalTotal: this.money(L.total)
    })

    if (C && C.canFlex && F && F.total) {
      var diff = (L.total||0) - (F.total||0)
      var adv = C.flexAdvance||0
      var extraTotal = (F.total||0) * adv
      var beMonths = diff > 0 ? Math.ceil(extraTotal / diff) : 0
      var fd = F.date
      var beY = fd.year + Math.floor((fd.month + beMonths - 1) / 12)
      var beM = ((fd.month + beMonths - 1) % 12) + 1

      this.setData({
        showFlex: true,
        flexSummary: this.buildSummary(F),
        flexCalc: this.buildCalcSteps(F),
        flexTotal: this.money(F.total),
        cmpDetail: '① 早领时间分析\n弹性提前退休比正常退休早 ' + adv + '个月（' + this.fmtObj(F.date) + ' 至 ' + this.fmtObj(L.date) + '）。\n\n' +
          '② 提前多领总额\n弹性退休期间累计多领取养老金：' + this.money(extraTotal) + '\n\n' +
          (diff > 0 ? '③ 每月养老金差额\n弹性退休每月少领：' + this.money(diff) + '\n\n' +
          '④ 盈亏平衡分析\n盈亏平衡点：约 ' + beMonths + '个月（' + (beMonths/12).toFixed(1) + '年）后，正常退休累计总额追平弹性提前退休。\n平衡点时间：约 ' + beY + '年' + beM + '月。' : '弹性养老与正常退休基本持平。')
      })
    }

    // 建议内容
    var sugList = [
      {title:'📌 持续缴费', text:'无论您是企业在职职工还是灵活就业人员，持续缴纳养老保险是保障退休后基本生活的基石。缴费年限越长、缴费基数越高，退休后养老金水平就越高。', color:'blue'},
      {title:'📊 核心判断', text:'一个关键经济指标：如果弹性提前退休后每月养老金高于您继续工作的月净收入（扣除社保缴费后），提前退休可能更划算。反之则延迟退休的经济收益更大。', color:'green'},
      {title:'🔍 综合考量', text:'退休时间的选择需要综合算好账：经济账（弹性提前退休更早开始领钱但每月减少，延迟退休则每月更多）、健康账（身体状况是否允许继续工作）、生活账（家庭经济压力、精神压力等）。', color:'orange'}
    ]
    // 决策建议
    var diff = (L.total||0) - (F.total||0)
    var adv = C ? C.flexAdvance || 0 : 0
    var extraTotal = F ? (F.total||0) * adv : 0
    var beMonths = diff > 0 ? Math.ceil(extraTotal / diff) : 0
    var decisionText = diff > 0
      ? '如果您预期寿命较长（超过 ' + (beMonths/12).toFixed(1) + '年），正常退休的总收入更高，延迟退休更划算。如果您当前经济压力大、身体状况一般，弹性提前退休可以更早获得稳定现金流，提前退休更合适。建议结合个人健康状况、家庭经济需求、工作压力等综合判断。'
      : '弹性提前退休与正常退休的月养老金基本持平，您可以根据个人情况自由选择退休时间。'
    sugList.push({title:'📋 决策建议', text: decisionText, color:'blue'})
    // 个性化咨询在 WXML 中最后保留，这里不加

    this.setData({ suggestions: sugList })
  },

  buildSummary(obj) {
    var d = obj.date
    return '退休时间：' + (d ? d.year+'年'+d.month+'月' : '--') +
      '  退休年龄：' + (obj.ageStr||'--') +
      '  累计缴费：' + (obj.totalYears||0).toFixed(2) + '年'
  },

  buildCalcSteps(obj) {
    var steps = []
    var colors = ['blue','green','orange','purple']
    var names = {
      basicPension: '基础养老金',
      personalAccount: '个人账户养老金',
      transitionalPension: '过渡性养老金',
      extraPension: '增发养老金',
      specialAddition: '特殊加发'
    }
    var icons = {basicPension:'📐',personalAccount:'👤',transitionalPension:'📋',extraPension:'➕',specialAddition:'⭐'}
    function add(key, desc, val) {
      if (val == null || val <= 0) return
      var d = desc ? desc.replace(/=\s*[\d,.]+元$/,'').trim() : ''
      steps.push({title: (icons[key]||'📌') + ' ' + (names[key]||key), formula: d, amount: '¥' + (val||0).toLocaleString('zh-CN',{minimumFractionDigits:2}), color: colors[steps.length % colors.length]})
    }
    if (obj.basicPension && obj.basicPension.amount) add('basicPension', obj.basicPension.description, obj.basicPension.amount)
    if (obj.personalAccount && obj.personalAccount.amount) add('personalAccount', '账户余额 ÷ ' + obj.months + '个月', obj.personalAccount.amount)
    if (obj.transitionalPension && obj.transitionalPension.amount > 0) add('transitionalPension', obj.transitionalPension.description, obj.transitionalPension.amount)
    if (obj.extraPension && obj.extraPension.amount > 0) add('extraPension', obj.extraPension.description, obj.extraPension.amount)
    if (obj.specialAddition && obj.specialAddition.amount > 0) add('specialAddition', obj.specialAddition.description, obj.specialAddition.amount)
    return steps
  },

  money(v) {
    if (v == null || isNaN(v)) return '--'
    return '¥' + Number(v).toLocaleString('zh-CN', {minimumFractionDigits:2})
  },
  fmtObj(d) {
    return d ? d.year + '年' + d.month + '月' : '--'
  }
})
