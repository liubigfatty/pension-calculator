// pages/report/report.js - 退休规划深度报告
var app = getApp()
// 报告长图改由云端 generateReportImage 云函数生成（方案A：彻底规避小程序端 Canvas 叠字/尺寸限制）

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
    // 弹性提前退休对比基准：优先取 raw.legalOriginal（原法定年龄退休方案）。
    // 经核查 cloudfunctions/calculate 引擎当前并未返回 legalOriginal 键，故恒走 flex 兜底。
    // 注释修正：此处并非"原法定年龄退休"，而是以 flex 方案（弹性提前）作为对比基准。
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
    const flexMonths = hasEarlyRetire ? (legalOrig.months || 0) : 0  // 计发月数，仅用于展示
    // 提前退休期间（月）= 正常退休年龄 − 弹性提前退休年龄 = comparison.flexAdvance（如提前3年=36个月）
    // ⚠️ 此前误用 flexMonths(计发月数,约139) 当期间，导致"工资/公积金/保费"虚高约4倍
    const gapMonths = hasEarlyRetire ? (comparison.flexAdvance || Math.round((legalAge - flexAge) * 12)) : 0
    const flexAnnual = flexTotal * 12

    // 平均指数
    const avgIndex = r.averageIndex || meta.avgIndex || legal.avgIndex || 1.0

    // === 累计领取对比（只有真正有弹性提前退休时才显示） ===
    const cumulative = hasEarlyRetire ? this._calcCumulative(legalAge, flexAge, legalAnnual, flexAnnual) : { items: [], breakEvenAge: 0 }

    // === 衍生计算：特色分析数据 ===
    // 替代率（按缴费基数×平均指数 推算退休前税前工资，比用计发基数更接近本人收入）
    const estPreRetireSalary = Math.round(legalBaseRetire * avgIndex)
    const replaceRate = estPreRetireSalary > 0 ? Math.round(legalTotal / estPreRetireSalary * 100) : 0
    // 替代率说明：按实际替代率区间动态生成，不再写死"40-45%"
    let replaceRateDesc
    if (replaceRate >= 70) {
      replaceRateDesc = '替代率≥70%，达到世界银行建议的"维持退休前生活水平"标准（70%+），养老保障充足，一般无需额外补充。'
    } else if (replaceRate >= 55) {
      replaceRateDesc = '替代率处于55%-70%，接近国际劳工组织建议的最低标准（55%），保障较充分。'
    } else if (replaceRate >= 40) {
      replaceRateDesc = '替代率处于全国平均水平（约40%-55%），基本保障尚可，建议适度补充养老（企业年金/个人养老金）。'
    } else {
      replaceRateDesc = '替代率低于40%，明显低于全国平均水平，退休后收入替代不足，建议重点规划补充养老（企业年金/商业养老保险）。'
    }
    // 医保退休缴费年限：男职工缴满30年、女职工缴满25年（各地略有差异，按通用标准）
    const medicareYears = Math.floor(legalTotalYears)
    const retireIdxGender = retireIdx !== undefined ? retireIdx : (isFlexible ? 4 : 0)
    const isFemale = retireIdxGender === 2 || retireIdxGender === 4  // 企业女(55退)/灵活就业女
    const medicareRequirement = isFemale ? 25 : 30  // 男30年 / 女25年
    const medicareMet = medicareYears >= medicareRequirement
    const medicareLabel = isFemale ? '女' : '男'
    // 企业职工：提前退休期间继续工作的工资收入（按计发基数×0.92扣除个人8%社保估算）
    const monthlyNetSalary = Math.round(legalBaseRetire * 0.92)
    const salary3year = hasEarlyRetire ? Math.round(monthlyNetSalary * gapMonths).toLocaleString() : '0'
    // 公积金（单位12%+个人12%）
    const fund3year = hasEarlyRetire ? Math.round(legalBaseRetire * 0.24 * gapMonths).toLocaleString() : '0'
    // 灵活就业：提前退休期间省下的保费
    const monthlyPremium = isFlexible ? Math.round(legalBaseRetire * avgIndex * 0.2) : 0
    const savePremium = hasEarlyRetire ? Math.round(monthlyPremium * gapMonths).toLocaleString() : '0'
    // 早领养老金（提前期间领取的养老金）
    const earlyPension = hasEarlyRetire ? Math.round(flexTotal * gapMonths).toLocaleString() : '0'
    const totalEarlyBenefitNum = hasEarlyRetire ? (parseInt(savePremium.replace(/,/g,'')) + parseInt(earlyPension.replace(/,/g,''))) : 0
    const totalEarlyBenefit = totalEarlyBenefitNum.toLocaleString()
    const earlyMonths = hasEarlyRetire ? gapMonths : 0
    // 月差额
    const diffMonthly = hasEarlyRetire ? Math.round(legalTotal - flexTotal) : 0
    // 回本周期
    const paybackYears = (hasEarlyRetire && diffMonthly > 0) ? Math.round(totalEarlyBenefitNum / diffMonthly / 12) : 0
    // 指数优化数据（按比例估算）
    const index06 = '¥' + Math.round(legalBaseRetire * 0.8 * legalTotalYears * 0.01 + legalPersonal).toLocaleString()
    const index08 = '¥' + Math.round(legalBaseRetire * 0.9 * legalTotalYears * 0.01 + legalPersonal).toLocaleString()
    const index15 = '¥' + Math.round(legalBaseRetire * 1.25 * legalTotalYears * 0.01 + legalPersonal).toLocaleString()
    const index20 = '¥' + Math.round(legalBaseRetire * 1.5 * legalTotalYears * 0.01 + legalPersonal).toLocaleString()
    const inc08 = Math.round(legalBaseRetire * 0.1 * legalTotalYears * 0.01)
    const inc10 = Math.round(legalBaseRetire * 0.2 * legalTotalYears * 0.01)
    const inc15 = Math.round(legalBaseRetire * 0.45 * legalTotalYears * 0.01)
    const inc20 = Math.round(legalBaseRetire * 0.7 * legalTotalYears * 0.01)

    const legalTotalStr = '¥' + legalTotal.toFixed(2)
    const flexTotalStr = flexTotal > 0 ? '¥' + flexTotal.toFixed(2) : '--'

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
      legalTotalStr,
      flexTotalStr,
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
      // 模块4（拆成结构化条目，避免 wxml 堆字）
      adviceType: isFlexible ? 'flexible' : 'worker',
      replaceRate,
      replaceRateDesc,
      medicareYears,
      medicareMet,
      medicareLabel,
      medicareRequirement,
      estPreRetireSalary: estPreRetireSalary.toLocaleString(),
      salary3year,
      fund3year,
      savePremium,
      earlyPension,
      totalEarlyBenefit,
      earlyMonths,
      paybackYears,
      workerAdvicePoints: isFlexible ? [] : [
        { title: '核心对比', desc: '正常退休月养老金 ' + legalTotalStr + '，弹性提前 ' + flexTotalStr + '，每月差额约 ¥' + diffMonthly.toLocaleString() + ' 元。' },
        { title: '工资收入', desc: '正常退休多领约 ¥' + salary3year.toLocaleString() + ' 元工资（按缴费基数估算），弹性提前退休后无工资收入。' },
        { title: '住房公积金', desc: '正常退休继续缴存，单位和个人合计约 ¥' + fund3year.toLocaleString() + '；弹性提前退休停缴。' },
        { title: '医疗保险', desc: medicareLabel + '职工医保缴费年限要求约' + medicareRequirement + '年（' + medicareYears + '年已' + (medicareMet ? '满足' : '不足') + '），弹性提前退休后可直接享受退休医保待遇，无需补缴。' },
        { title: '盈亏平衡', desc: '约 ' + (cumulative.breakEvenAge > 0 ? cumulative.breakEvenAge : '—') + ' 岁前弹性提前累计领取更高，此后正常退休反超。' }
      ],
      flexibleAdvicePoints: !isFlexible ? [] : [
        { title: '核心对比', desc: '全部保费自费（费率20%），提前退休经济账：少缴保费约 ¥' + savePremium.toLocaleString() + ' 元 + 早领养老金约 ¥' + earlyPension.toLocaleString() + ' 元，合计好处约 ¥' + totalEarlyBenefit.toLocaleString() + ' 元。' },
        { title: '保费节省', desc: '弹性提前退休约省下 ¥' + savePremium.toLocaleString() + ' 元保费（全自费20%，3年少缴）。' },
        { title: '早领养老金', desc: '提前领取约 ' + earlyMonths + ' 个月，多领约 ¥' + earlyPension.toLocaleString() + ' 元。' },
        { title: '回本分析', desc: '合计好处约 ¥' + totalEarlyBenefit.toLocaleString() + ' 元，正常退休每月多领 ¥' + diffMonthly.toLocaleString() + ' 元，需约 ' + paybackYears + ' 年追平。' },
        { title: '医疗保险', desc: medicareLabel + '职工医保缴费年限要求约' + medicareRequirement + '年（' + medicareYears + '年），弹性提前退休后可直接享受退休医保待遇。' }
      ],
      optimizationPoint: isFlexible
        ? null
        : { title: '足额申报', desc: '企业职工社保由单位依法缴纳，缴费基数按本人实际工资确定。建议确认单位是否按照实际工资足额申报，避免低基数缴费影响未来待遇。' },
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
        label: d.range + '年：' + Number(d.years).toFixed(2) + '年 × ' + Number(d.rate * 100).toFixed(1) + '%',
        amount: '¥' + Math.round(d.amount)
      })),
      totalPensionStr: '¥' + legalTotal.toFixed(2),
      // 折叠
      showSection: {
        profile: true, comparison: true, cumulative: true,
        advice: true, optimization: true, calculation: true, disclaimer: true
      }
    })

    // 页面渲染完成后立刻预热云函数实例，降低首次保存时冷启动概率
    this._warmupGenerate()
  },

  // 累计领取对比（里程碑式：提前起领 / 正常起领 / 70岁 / 追平，不再5年区间、不再延伸到90）
  _calcCumulative(legalAge, flexAge, legalAnnual, flexAnnual) {
    const startAge = Math.floor(flexAge || legalAge)
    // 预扫描：找出追平年龄（累计领取差额由正转负）
    let breakEvenAge = 0
    let prevDiff = 0
    for (let age = startAge; age <= 100; age++) {
      const diff = Math.round(Math.max(0, age - flexAge) * flexAnnual) - Math.round(Math.max(0, age - legalAge) * legalAnnual)
      if (breakEvenAge === 0 && prevDiff > 0 && diff <= 0) { breakEvenAge = age; break }
      prevDiff = diff
    }
    // 关键里程碑集合（起始年龄用实际值，避免 60 与 60岁2个月 被 round 成同一个整数而合并）
    const ageSet = new Set()
    ageSet.add(flexAge)    // 弹性提前起领（实际年龄，可能含小数）
    ageSet.add(legalAge)   // 正常起领（实际年龄）
    ageSet.add(70)         // 70岁
    if (breakEvenAge > 0) ageSet.add(breakEvenAge)  // 追平

    const ages = Array.from(ageSet).filter(function (a) { return a >= startAge }).sort(function (a, b) { return a - b })

    const items = ages.map(function (age) {
      const legalYrs = Math.max(0, age - legalAge)
      const flexYrs = Math.max(0, age - flexAge)
      const legalTotal = Math.round(legalYrs * legalAnnual)
      const flexTotal = Math.round(flexYrs * flexAnnual)
      const diff = flexTotal - legalTotal
      const isNormalStart = Math.abs(age - legalAge) < 0.01
      const isFlexStart = Math.abs(age - flexAge) < 0.01
      const isBreakEven = breakEvenAge > 0 && Math.abs(age - breakEvenAge) < 0.5
      let diffStr
      if (isBreakEven) diffStr = '追平'
      else if (diff > 0) diffStr = '+' + this._fmtWan(diff)
      else if (diff < 0) diffStr = '-' + this._fmtWan(Math.abs(diff))
      else diffStr = '平'
      const ageLabel = this._fmtAgeLabel(age, isFlexStart, isNormalStart, isBreakEven)
      return { age, ageLabel, legalTotal: this._fmtWan(legalTotal), flexTotal: this._fmtWan(flexTotal), diff: diffStr, isBreakEven, isNormalStart, isFlexStart }
    }.bind(this))

    return { items, breakEvenAge: Math.round(breakEvenAge) }
  },

  _fmtAgeLabel(age, isFlexStart, isNormalStart, isBreakEven) {
    const year = Math.floor(age)
    const month = Math.round((age - year) * 12)
    let s = year + '岁'
    if (month > 0) s += month + '个月'
    if (isBreakEven) s += '（追平）'
    else if (isFlexStart) s += '（提前）'
    else if (isNormalStart) s += '（正常）'
    return s
  },

  _fmtWan(num) {
    if (!num || isNaN(num)) return '--'
    return (num / 10000).toFixed(1) + '万'
  },

  toggleSection(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ ['showSection.' + key]: !this.data.showSection[key] })
  },

  // 保存报告：调用云端 generateReportImage 生成 PNG，优先 base64 直传回写相册，失败/超时时自动重试一次
  onSaveImage() {
    var data = this._buildReportData()
    if (!data) {
      wx.showToast({ title: '报告数据缺失', icon: 'none' })
      return
    }
    this._doSaveImage(data, false)
  },

  _doSaveImage(data, isRetry) {
    var self = this
    wx.showLoading({ title: '生成报告图...', mask: true })
    wx.cloud.callFunction({
      name: 'generateReportImage',
      data: { data: data },
      success: function (res) {
        wx.hideLoading()
        var r = res.result || {}
        if (!r.success) {
          wx.showToast({ title: (r.message || '生成失败'), icon: 'none' })
          return
        }
        if (r.base64) {
          // base64 直传：写入本地临时文件后直接保存到相册
          const fs = wx.getFileSystemManager()
          const filePath = wx.env.USER_DATA_PATH + '/pension_report_' + Date.now() + '.png'
          fs.writeFile({
            filePath: filePath,
            data: r.base64,
            encoding: 'base64',
            success: function () {
              wx.saveImageToPhotosAlbum({
                filePath: filePath,
                success: function () {
                  wx.showToast({ title: '已保存到相册', icon: 'success' })
                },
                fail: function (err) {
                  // 无相册权限或拒绝时，回退到预览让用户长按保存
                  console.warn('[report] saveImageToPhotosAlbum fail, fallback preview', err)
                  wx.previewImage({ urls: [filePath], current: filePath })
                }
              })
            },
            fail: function (err) {
              console.error('[report] writeFile fail:', err)
              wx.showToast({ title: '图片写入失败', icon: 'none' })
            }
          })
        } else if (r.url) {
          // 云存储兜底：走 previewImage 长按保存
          wx.previewImage({ urls: [r.url], current: r.url })
        } else {
          wx.showToast({ title: '生成结果异常', icon: 'none' })
        }
      },
      fail: function (err) {
        wx.hideLoading()
        console.error('[report] generateReportImage fail:', err)
        if (!isRetry) {
          wx.showToast({ title: '首次超时，正在重试...', icon: 'none' })
          setTimeout(function () { self._doSaveImage(data, true) }, 500)
        } else {
          wx.showToast({ title: '生成失败，请重试', icon: 'none' })
        }
      }
    })
  },

  _warmupGenerate() {
    wx.cloud.callFunction({
      name: 'generateReportImage',
      data: { _warmup: true },
      success: function (res) {
        console.log('[report] warmup ok', res.result)
      },
      fail: function (err) {
        console.warn('[report] warmup fail', err)
      }
    })
  },

  // 组装传给云函数的报告数据（与展示页 setData 字段一致）
  _buildReportData() {
    var d = this.data
    var hasEarly = d.flexTotalStr !== '--'
    var adviceType = d.isFlexible ? 'flexible' : 'worker'

    return {
      province: d.provinceName,
      city: d.cityLabel,
      identity: d.identity,
      legalAge: d.legalAgeStr,
      legalDate: d.legalDate,
      legalYears: d.legalYearsStr,
      avgIndex: d.avgIndexStr,
      balance: d.personalBalanceStr,
      base: d.baseRetireStr,
      // Hero 卡
      legalTotalStr: d.legalTotalStr,
      legalAgeShow: d.legalAgeShow,
      legalYearsShow: d.legalYearsShow,
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
      medicareRequirement: d.medicareRequirement || 25,
      medicareLabel: d.medicareLabel || '',
      medicareMet: d.medicareMet,
      savePremium: d.savePremium || '0',
      earlyPension: d.earlyPension || '0',
      totalEarlyBenefit: d.totalEarlyBenefit || '0',
      earlyMonths: d.earlyMonths || 0,
      diffMonthly: d.diffMonthly || 0,
      paybackYears: d.paybackYears || 0,
      replaceRate: d.replaceRate || '',
      estPreRetireSalary: d.estPreRetireSalary || '',
      replaceRateDesc: d.replaceRateDesc || '',
      // 模块5
      qrPath: 'consult-wechat.jpg',
      indexOpts: [
        { label: '0.6', pension: d.index06, inc: '--', isCurrent: false },
        { label: '0.8', pension: d.index08, inc: '+¥' + d.index08inc, isCurrent: false },
        { label: d.avgIndexStr + '（当前）', pension: d.legalTotalStr, inc: '+¥' + d.index10inc, isCurrent: true },
        { label: '1.5', pension: d.index15, inc: '+¥' + d.index15inc, isCurrent: false },
        { label: '2.0', pension: d.index20, inc: '+¥' + d.index20inc, isCurrent: false }
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
  },

  onUnload() {
    // 付费标记保留，用户返回结果页可再次进入无需重复付费
  },

  onBack() { wx.navigateBack() }
})
