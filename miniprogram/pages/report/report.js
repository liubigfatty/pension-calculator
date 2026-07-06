// pages/report/report.js - 退休规划深度报告
var app = getApp()
var reportTpl = require('./report-template.js')

Page({
  data: {
    isLoading: true,
    // 所有显示字段扁平化，WXML直接引用
    // 模块1
    provinceName: '', cityLabel: '', identity: '',
    legalAgeStr: '', legalDate: '',
    legalYearsStr: '', avgIndexStr: '',
    personalBalanceStr: '', baseRetireStr: '',
    isFlexible: false,
    // 模块2
    legalTotalStr: '', flexTotalStr: '',
    legalAgeShow: '', flexAgeShow: '',
    legalDateShow: '', flexDateShow: '',
    legalYearsShow: '', flexYearsShow: '',
    legalMonthsShow: 0, flexMonthsShow: 0,
    legalAnnualStr: '', flexAnnualStr: '',
    diffMonthly: 0,
    // 模块3
    cumulativeItems: [],
    breakEvenAge: 0,
    // 模块4
    adviceType: '', // 'worker' | 'flexible'
    // 模块5
    basicPensionStr: '', basicDesc: '',
    personalPensionStr: '', personalDesc: '',
    extraPensionStr: '', extraDetails: [],
    totalPensionStr: '',
    // 折叠
    showSection: {}
  },

  onLoad() {
    // 支付检查：未付费且非审核模式则跳回
    if (!wx.getStorageSync('report_paid') && !wx.getStorageSync('audit_paid')) {
      wx.showToast({ title: '请先付费', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1000)
      return
    }

    const r = wx.getStorageSync('calc_result') || app.globalData.calcResult

    if (!r || !r._raw) {
      wx.showToast({ title: '未获取到计算结果', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1000)
      return
    }

    const raw = r._raw
    const legal = raw.legal || {}
    const flex = raw.flex || {}
    const comparison = raw.comparison || {}
    const meta = raw.metaData || {}

    // === 个人信息 ===
    const provinceName = r.provinceName || ''
    const rawCityLabel = r.cityLabel || ''
    // cityLabel 如果是"全省统一计发基数"就不显示
    const cityLabel = (rawCityLabel && rawCityLabel !== '全省统一计发基数') ? rawCityLabel : ''
    // identity（人员类型）
    const retireIdx = wx.getStorageSync('form_step1')?.retireTypeIndex
    const typeNames = ['企业职工男','企业职工女','企业职工女（55退）','灵活就业男','灵活就业女']
    const identity = typeNames[retireIdx] || '参保人员'
    const isFlexible = retireIdx >= 3

    // 正常退休数据
    const legalAge = legal.age || 0
    const legalAgeYear = Math.floor(legalAge)
    const legalAgeMonth = Math.round((legalAge - legalAgeYear) * 12)
    const legalAgeStr = legalAgeMonth > 0 ? legalAgeYear + '岁' + legalAgeMonth + '个月' : legalAgeYear + '岁'
    const legalDate = legal.date ? legal.date.year + '年' + legal.date.month + '月' : ''
    const legalTotalYears = legal.totalYears || 0
    const legalYearsStr = Math.floor(legalTotalYears) + '年' + Math.round((legalTotalYears % 1) * 12) + '个月'
    const legalBaseRetire = legal.baseRetire || 0
    const legalPersonalBalance = legal.personalAccount?.balance || 0
    const legalTotal = legal.total || 0
    const legalMonths = legal.months || 0
    const legalBase = legal.basicPension?.amount || 0
    const legalBaseDesc = legal.basicPension?.description || ''
    const legalPersonal = legal.personalAccount?.amount || 0
    const legalPersonalDesc = legal.personalAccount?.description || ''
    const legalExtra = legal.extraPension?.amount || 0
    const legalExtraDetails = legal.extraPension?.bracketDetails || []
    const legalAnnual = legalTotal * 12

    // 弹性退休数据
    // 优先使用云函数返回的 legalOriginal（原法定年龄退休），作为弹性提前退休对比
    // fallback：其次用 flex（旧版引擎无legalOriginal时）
    const legalOrig = raw.legalOriginal || flex
    const hasEarlyRetire = legalOrig.age > 0 && legalOrig.age < legalAge && legalOrig.total > 0
    const flexAge = hasEarlyRetire ? (legalOrig.age || 0) : 0
    const flexAgeYear = Math.floor(flexAge)
    const flexAgeMonth = Math.round((flexAge - flexAgeYear) * 12)
    const flexAgeStr = flexAgeMonth > 0 ? flexAgeYear + '岁' + flexAgeMonth + '个月' : (flexAge > 0 ? flexAgeYear + '岁' : '')
    const flexDate = (hasEarlyRetire && legalOrig.date) ? legalOrig.date.year + '年' + legalOrig.date.month + '月' : ''
    const flexTotalYears = hasEarlyRetire ? (legalOrig.totalYears || 0) : 0
    const flexYearsStr = flexTotalYears > 0 ? Math.floor(flexTotalYears) + '年' + Math.round((flexTotalYears % 1) * 12) + '个月' : ''
    const flexTotal = hasEarlyRetire ? (legalOrig.total || 0) : 0
    const flexMonths = hasEarlyRetire ? (legalOrig.months || 0) : 0
    const flexAnnual = flexTotal * 12

    // 平均指数
    const avgIndex = r.averageIndex || meta.avgIndex || legal.avgIndex || 1.0

    // === 累计领取对比（只有真正有弹性提前退休时才显示） ===
    const cumulative = hasEarlyRetire ? this._calcCumulative(legalAge, flexAge, legalAnnual, flexAnnual) : { items: [], breakEvenAge: 0 }

    // === 衍生计算：特色分析数据 ===
    // 替代率（按计发基数推算退休前工资）
    const replaceRate = legalBaseRetire > 0 ? Math.round(legalTotal / legalBaseRetire * 100) : 0
    // 医保年限（女满25年）
    const medicareYears = Math.floor(legalTotalYears)
    const medicareRequirement = isFlexible ? 25 : 25
    const medicareMet = medicareYears >= medicareRequirement
    // 企业职工：3年工资收入（按计发基数×0.92扣除个人8%社保 估算）
    const monthlyNetSalary = Math.round(legalBaseRetire * 0.92)
    const salary3year = hasEarlyRetire ? Math.round(monthlyNetSalary * flexMonths).toLocaleString() : '0'
    // 公积金3年（单位12%+个人12%）
    const fund3year = hasEarlyRetire ? Math.round(legalBaseRetire * 0.24 * flexMonths).toLocaleString() : '0'
    // 灵活就业：省下的保费
    const monthlyPremium = isFlexible ? Math.round(legalBaseRetire * avgIndex * 0.2) : 0
    const savePremium = hasEarlyRetire ? Math.round(monthlyPremium * flexMonths).toLocaleString() : '0'
    // 早领养老金
    const earlyPension = hasEarlyRetire ? Math.round(flexTotal * flexMonths).toLocaleString() : '0'
    const totalEarlyBenefitNum = hasEarlyRetire ? (parseInt(savePremium.replace(/,/g,'')) + parseInt(earlyPension.replace(/,/g,''))) : 0
    const totalEarlyBenefit = totalEarlyBenefitNum.toLocaleString()
    const earlyMonths = hasEarlyRetire ? flexMonths : 0
    // 月差额
    const diffMonthly = hasEarlyRetire ? Math.round(legalTotal - flexTotal) : 0
    // 回本周期
    const paybackYears = (hasEarlyRetire && diffMonthly > 0) ? Math.round(totalEarlyBenefitNum / diffMonthly / 12) : 0
    // 指数优化数据（按比例估算）
    const basePensionPercent = legalBaseRetire > 0 ? Math.round(legalBase / legalTotal * 100) : 50
    const index06 = '¥' + Math.round(legalBaseRetire * 0.8 * legalTotalYears * 0.01 + legalPersonal).toLocaleString()
    const index08 = '¥' + Math.round(legalBaseRetire * 0.9 * legalTotalYears * 0.01 + legalPersonal).toLocaleString()
    const index15 = '¥' + Math.round(legalBaseRetire * 1.25 * legalTotalYears * 0.01 + legalPersonal).toLocaleString()
    const index20 = '¥' + Math.round(legalBaseRetire * 1.5 * legalTotalYears * 0.01 + legalPersonal).toLocaleString()
    const inc08 = Math.round(legalBaseRetire * 0.1 * legalTotalYears * 0.01)
    const inc10 = Math.round(legalBaseRetire * 0.2 * legalTotalYears * 0.01)
    const inc15 = Math.round(legalBaseRetire * 0.45 * legalTotalYears * 0.01)
    const inc20 = Math.round(legalBaseRetire * 0.7 * legalTotalYears * 0.01)

    this.setData({
      isLoading: false,
      // 模块1
      provinceName, cityLabel, identity,
      legalAgeStr, legalDate,
      legalYearsStr, avgIndexStr: Number(avgIndex).toFixed(2),
      personalBalanceStr: Math.round(legalPersonalBalance).toLocaleString(),
      baseRetireStr: Math.round(legalBaseRetire).toLocaleString(),
      isFlexible,
      // 模块2
      legalTotalStr: '¥' + legalTotal.toFixed(2),
      flexTotalStr: flexTotal > 0 ? '¥' + flexTotal.toFixed(2) : '--',
      legalAgeShow: legalAgeStr, flexAgeShow: flexAgeStr || '--',
      legalDateShow: legalDate, flexDateShow: flexDate || '--',
      legalYearsShow: legalYearsStr, flexYearsShow: flexYearsStr || '--',
      legalMonthsShow: legalMonths, flexMonthsShow: flexMonths,
      legalAnnualStr: '¥' + Math.round(legalAnnual).toLocaleString(),
      flexAnnualStr: flexTotal > 0 ? '¥' + Math.round(flexAnnual).toLocaleString() : '--',
      diffMonthly: diffMonthly,
      // 模块3
      cumulativeItems: cumulative.items,
      breakEvenAge: cumulative.breakEvenAge,
      // 模块4
      adviceType: isFlexible ? 'flexible' : 'worker',
      replaceRate,
      medicareYears,
      medicareMet,
      salary3year,
      fund3year,
      savePremium,
      earlyPension,
      totalEarlyBenefit,
      earlyMonths,
      paybackYears,
      // 模块5（指数优化）
      index06, index08, index15, index20,
      index08inc: inc08.toLocaleString(),
      index10inc: inc10.toLocaleString(),
      index15inc: inc15.toLocaleString(),
      index20inc: inc20.toLocaleString(),
      // 模块6（计算明细）
      basicPensionStr: '¥' + legalBase.toFixed(2),
      basicDesc: legalBaseDesc,
      personalPensionStr: '¥' + legalPersonal.toFixed(2),
      personalDesc: legalPersonalDesc,
      extraPensionStr: legalExtra > 0 ? '¥' + legalExtra.toFixed(2) : '',
      extraDetails: legalExtraDetails.map(d => ({
        label: d.range + '年：' + d.years + '年 × ' + (d.rate * 100) + '%',
        amount: '¥' + Math.round(d.amount)
      })),
      totalPensionStr: '¥' + legalTotal.toFixed(2),
      // 折叠
      showSection: {
        profile: true, comparison: true, cumulative: true,
        advice: true, optimization: true, calculation: true, disclaimer: true
      }
    })
  },

  // 累计领取对比
  _calcCumulative(legalAge, flexAge, legalAnnual, flexAnnual) {
    const items = []
    let breakEvenAge = 0
    let prevDiff = 0
    const startAge = Math.min(Math.floor(legalAge), Math.floor(flexAge || 99))

    for (let age = startAge; age <= 90; age += 5) {
      const legalYrs = Math.max(0, age - legalAge)
      const flexYrs = Math.max(0, age - flexAge)
      if (flexYrs === 0 && age > flexAge) continue
      const legalTotal = Math.round(legalYrs * legalAnnual)
      const flexTotal = Math.round(flexYrs * flexAnnual)
      const diff = flexTotal - legalTotal

      let diffStr = ''
      let isBreakEven = false
      if (breakEvenAge === 0 && prevDiff > 0 && diff <= 0) {
        breakEvenAge = age
        isBreakEven = true
      }
      if (breakEvenAge > 0 && age === breakEvenAge) isBreakEven = true

      if (isBreakEven) diffStr = '追平'
      else if (diff > 0) diffStr = '+' + this._fmtWan(diff)
      else diffStr = '-' + this._fmtWan(Math.abs(diff))

      prevDiff = diff
      items.push({ age, legalTotal: this._fmtWan(legalTotal), flexTotal: this._fmtWan(flexTotal), diff: diffStr, isBreakEven })
    }
    return { items, breakEvenAge: Math.round(breakEvenAge) }
  },

  _fmtWan(num) {
    if (!num || isNaN(num)) return '--'
    return (num / 10000).toFixed(1) + '万'
  },

  toggleSection(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ ['showSection.' + key]: !this.data.showSection[key] })
  },

  onReady() {
    this._reportWidget = this.selectComponent('.reportWidget')
  },

  onSaveImage() {
    var self = this
    wx.showLoading({ title: '生成报告图...', mask: true })

    // 提前提取 this.data，避免异步回调中 this 丢失
    var d = this.data
    var widget = this._reportWidget

    if (!widget) {
      wx.hideLoading()
      wx.showToast({ title: '组件未就绪', icon: 'none' })
      return
    }

    // 拷贝二维码图片到 USER_DATA_PATH（wxml-to-canvas 需要绝对路径）
    var fs = wx.getFileSystemManager()
    var tmpQr = wx.env.USER_DATA_PATH + '/consult-wechat.jpg'
    fs.copyFile({
      srcPath: '/images/consult-wechat.jpg',
      destPath: tmpQr,
      success: function() { self._doRenderReport(d, widget, tmpQr) },
      fail: function() { self._doRenderReport(d, widget, null) }
    })
  },

  _doRenderReport(d, widget, qrPath) {
    var hasEarly = d.flexTotalStr !== '--'
    var adviceType = d.isFlexible ? 'flexible' : 'worker'

    var data = {
      province: d.provinceName,
      city: d.cityLabel,
      identity: d.identity,
      legalAge: d.legalAgeStr,
      legalDate: d.legalDate,
      legalYears: d.legalYearsStr,
      avgIndex: d.avgIndexStr,
      balance: d.personalBalanceStr,
      base: d.baseRetireStr,
      // 模块2 表格行
      legalTotal: d.legalTotalStr,
      flexTotal: d.flexTotalStr,
      legalAnnual: d.legalAnnualStr,
      flexAnnual: d.flexAnnualStr,
      legalMonthsShow: String(d.legalMonthsShow),
      flexMonthsShow: String(d.flexMonthsShow),
      legalAgeShow: d.legalAgeShow,
      flexAgeShow: d.flexAgeShow,
      legalDateShow: d.legalDateShow,
      flexDateShow: d.flexDateShow,
      legalYearsShow: d.legalYearsShow,
      flexYearsShow: d.flexYearsShow,
      hasEarly: hasEarly,
      // 模块3
      cumulativeItems: d.cumulativeItems || [],
      breakEvenAge: d.breakEvenAge || 0,
      // 模块4
      adviceType: adviceType,
      salary3year: d.salary3year || '',
      fund3year: d.fund3year || '',
      medicareYears: d.medicareYears || 0,
      savePremium: d.savePremium || '0',
      earlyPension: d.earlyPension || '0',
      totalEarlyBenefit: d.totalEarlyBenefit || '0',
      earlyMonths: d.earlyMonths || 0,
      diffMonthly: d.diffMonthly || 0,
      paybackYears: d.paybackYears || 0,
      replaceRate: d.replaceRate || '',
      baseRetireStr: d.baseRetireStr || '',
      // 模块5
      consultImg: qrPath || '',
      indexOpts: [
        { label: '0.6', pension: '¥' + d.index06, inc: '--', isCurrent: false },
        { label: '0.8', pension: '¥' + d.index08, inc: '+¥' + d.index08inc, isCurrent: false },
        { label: d.avgIndexStr + '（当前）', pension: d.legalTotalStr, inc: '+¥' + d.index10inc, isCurrent: true },
        { label: '1.5', pension: '¥' + d.index15, inc: '+¥' + d.index15inc, isCurrent: false },
        { label: '2.0', pension: '¥' + d.index20, inc: '+¥' + d.index20inc, isCurrent: false }
      ],
      // 模块6
      basicPension: d.basicPensionStr,
      basicDesc: d.basicDesc || '',
      personalPension: d.personalPensionStr,
      personalDesc: d.personalDesc || '',
      extraPension: d.extraPensionStr || '',
      extraDetails: d.extraDetails || [],
      totalPension: d.totalPensionStr
    }

    var tpl = reportTpl.build(data)

    widget.renderToCanvas({ wxml: tpl.wxml, style: tpl.style }).then(function(container) {
      return widget.canvasToTempFilePath({ fileType: 'png' })
    }).then(function(res) {
      wx.hideLoading()
      var filePath = res.tempFilePath
      // 优先用预览大图展示：用户在预览里「长按」即可保存到相册 / 转发（iOS、安卓微信原生能力，最稳）
      // 避免 wx.saveImageToPhotosAlbum 因相册授权被拒而静默失败（尤其 iOS 首次拒绝后不再弹窗）
      wx.previewImage({
        urls: [filePath],
        current: filePath,
        success: function() {
          console.log('[report] 预览已弹出，可长按保存')
        },
        fail: function() {
          // 预览兜底：极少数机型预览失败，则尝试直接保存
          wx.saveImageToPhotosAlbum({
            filePath: filePath,
            success: function() { wx.showToast({ title: '已保存到相册', icon: 'success' }) },
            fail: function(err2) {
              if (err2.errMsg && err2.errMsg.indexOf('auth deny') >= 0) {
                wx.showModal({
                  title: '需要授权',
                  content: '请授权保存图片到相册',
                  confirmText: '去设置',
                  success: function(m) { if (m.confirm) wx.openSetting() }
                })
              } else {
                wx.showToast({ title: '保存失败', icon: 'none' })
              }
            }
          })
        }
      })
    }).catch(function(err) {
      wx.hideLoading()
      wx.showToast({ title: '生成失败', icon: 'none' })
    })
  },

  onUnload() {
    // 付费标记保留，用户返回结果页可再次进入无需重复付费
  },

  onBack() { wx.navigateBack() }
})
