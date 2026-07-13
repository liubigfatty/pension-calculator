// pages/result/result.js
const app = getApp()

/**
 * 计算精确年龄（岁+月）
 * @param {number} birthYear
 * @param {number} birthMonth
 * @param {number} retireYear
 * @param {number} retireMonth
 * @returns {string} 如 "62岁10个月"
 */
function calcExactAge(birthYear, birthMonth, retireYear, retireMonth) {
  if (!birthYear || !retireYear) return ''
  let totalMonths = (retireYear - birthYear) * 12 + (retireMonth - birthMonth)
  if (totalMonths < 0) totalMonths = 0
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  return months > 0 ? `${years}岁${months}个月` : `${years}岁`
}

var shareCanvas = require('./share-canvas.js')

Page({
  data: {
    hasValidData: true,
    result: {},
    provinceName: '',
    cityLabel: '',
    showDetail: true,
    exactAge: '',

    // 分享图预览
    showSharePreview: false,
    shareImagePath: '',
  },

  onLoad(options) {
    // 检测是否是分享卡片进来的（裂变路径）
    if (options.share === '1') {
      // 分享查看模式：显示分享者的结果 + "我也来算一下"按钮
      this.setData({
        hasValidData: true,
        isShareView: true,
        showDetail: false,
        totalAmount: options.total || '',
        provinceName: decodeURIComponent(options.province || ''),
        cityLabel: options.city ? decodeURIComponent(options.city) : '',
        retirementType: options.retireType || 'normal',
        retireAge: decodeURIComponent(options.retireAge || ''),
        shareData: {
          provinceName: decodeURIComponent(options.province || ''),
          cityLabel: options.city ? decodeURIComponent(options.city) : '',
          totalAmount: options.total || '',
          retireType: options.retireType || 'normal',
          retireAge: decodeURIComponent(options.retireAge || ''),
        }
      })
      return  // 不执行正常计算流程
    }

    // 正常流程：优先从缓存读取计算结果（step2 存到 calc_result）
    const r = wx.getStorageSync('calc_result') || app.globalData.calcResult || {}

    // 调试：打印原始数据（上线前可删除）
    console.log('[result] calcResult:', JSON.stringify(r))

    // 保护：如果数据无效，提示用户返回重新计算
    // 支持两种结构：扁平结构（有 totalAmount）或 _raw 结构（有 legal/flex）
    let hasValidData = false
    if (r && r.totalAmount != null) {
      hasValidData = true
    } else if (r && r._raw) {
      const raw = r._raw
      if (raw.legal?.total != null || raw.flex?.total != null) {
        hasValidData = true
      }
    }

    if (!hasValidData) {
      console.warn('[result] 数据无效，显示引导')
      this.setData({
        result: {},
        hasValidData: false,
        errorMsg: '未获取到计算结果，请返回重新计算'
      })
      return  // 不再执行后续逻辑
    }

    this.setData({ hasValidData: true })

    // 退休方式：优先用缓存里的 retirePlan，其次用 r.retirementType
    const retirementType = r.retirePlan || r.retirementType || 'normal'
    const isEarly = retirementType === 'early'

    // 展平数据，多重容错
    const raw = r._raw || {}
    const legal = raw.legal || {}
    // 弹性提前退休数据（云函数返回值）
    const flex = raw.flex || {}

    // 根据退休方式选择数据源
    const source = isEarly && flex.total ? flex : legal

    // 具体退休日期
    let retireDateStr = ''
    if (source.date && source.date.year && source.date.month) {
      retireDateStr = `${source.date.year}年${source.date.month}月`
    } else if (r.retireYear && r.retireMonth) {
      retireDateStr = `${r.retireYear}年${r.retireMonth}月`
    }

    // fmt: 安全数字格式化，失败返回 null（WXML 里用 != null 判断）
    const fmt = (v, d = 2) => {
      if (v == null || v === '') return null  // null、undefined、空字符串都返回 null
      const n = Number(v)
      return !isNaN(n) && isFinite(n) ? n.toFixed(d) : null
    }

    // extraPension 多重 fallback（用 source 动态选择 legal 或 flex）
    const extraVal = r.extraPension != null
      ? r.extraPension
      : ((source.extraPension?.amount || 0) + (source.specialAddition?.amount || 0))
    const extraPensionFmt = (extraVal != null && Number(extraVal) > 0) ? fmt(extraVal) : null

    // 核心金额字段：优先用 step3 已算好的值，其次用引擎返回值（source 动态选择）
    const totalAmount = r.totalAmount != null ? r.totalAmount : fmt(source.total)
    const basePension = r.basePension != null ? r.basePension : fmt(source.basicPension?.amount)
    const personalPension = r.personalPension != null ? r.personalPension : fmt(source.personalAccount?.amount)
    const transitionPension = r.transitionPension != null ? r.transitionPension : fmt(source.transitionalPension?.amount)

    // 计算参数：优先用 step3 已算好的值，其次用 source（动态选择）
    let workYearsVal = r.workYears != null ? r.workYears : (source.totalYears != null ? source.totalYears : null)
    if (workYearsVal != null) workYearsVal = fmt(workYearsVal, 2)

    // accountBalance: 优先用 step3 传入的用户输入值
    let accountBalanceVal = null
    if (r.accountBalance != null && String(r.accountBalance) !== '') {
      const n = Number(r.accountBalance)
      if (!isNaN(n) && isFinite(n)) accountBalanceVal = n.toFixed(2)
    }
    if (accountBalanceVal === null && source.personalAccount?.balance != null) {
      accountBalanceVal = fmt(source.personalAccount.balance, 2)
    }

    // baseNumber: 退休地计发基数
    let baseNumberVal = null
    if (r.baseNumber != null && String(r.baseNumber) !== '') {
      const n = Number(r.baseNumber)
      if (!isNaN(n) && isFinite(n)) baseNumberVal = n.toFixed(2)
    }
    if (baseNumberVal === null && source.baseRetire != null) {
      baseNumberVal = fmt(source.baseRetire)
    }

    // averageIndex: 平均缴费指数（优先用 step2 传过来的值，其次从引擎返回值里取）
    let averageIndexVal = null
    if (r.averageIndex != null && String(r.averageIndex) !== '') {
      const n = Number(r.averageIndex)
      averageIndexVal = !isNaN(n) ? n.toFixed(2) : null
    }
    if (averageIndexVal === null && source.averageIndex != null) {
      const n = Number(source.averageIndex)
      averageIndexVal = !isNaN(n) ? n.toFixed(2) : null
    }

    // actualYears: 实际缴费年限
    let actualYearsVal = null
    if (r.actualYears != null) {
      actualYearsVal = fmt(r.actualYears, 2)
    } else if (source.actualYears != null) {
      actualYearsVal = fmt(source.actualYears, 2)
    }

    // sameYears: 视同缴费年限 = 累计 - 实际
    let sameYearsVal = null
    if (workYearsVal != null && actualYearsVal != null) {
      const work = parseFloat(workYearsVal)
      const actual = parseFloat(actualYearsVal)
      if (!isNaN(work) && !isNaN(actual)) {
        sameYearsVal = fmt(Math.max(0, work - actual), 2)
      }
    } else if (r.sameYears != null) {
      sameYearsVal = fmt(r.sameYears, 2)
    }

    // months: 计发月数（用 source 动态选择）
    const monthsVal = r.months != null ? r.months : (source.months || null)

    // 退休方式标签（纯方式，不带年龄 → 计算参数用）
    const retireTypeLabel = isEarly ? '弹性提前退休' : '法定年龄退休'

    // 精确退休年龄（岁+月）— 用 source.date 动态选择
    let exactAgeStr = ''
    if (r.birthYear && r.birthMonth && source.date) {
      exactAgeStr = calcExactAge(r.birthYear, r.birthMonth, source.date.year, source.date.month)
    }
    const retireAgeText = r.retireAge || source.ageStr || exactAgeStr || ''

    // 头部退休信息（一行：60岁弹性提前退休（2031年6月））
    const retireInfo = retireDateStr
      ? `${retireAgeText}${retireTypeLabel}（${retireDateStr}）`
      : `${retireAgeText}${retireTypeLabel}`

    this.setData({
      // 核心金额
      totalAmount,
      basePension,
      personalPension,
      transitionPension,
      extraPension: extraPensionFmt,

      // 计算参数（已经是格式化好的字符串，WXML 直接显示）
      workYears: workYearsVal,
      actualYears: actualYearsVal,
      sameYears: sameYearsVal,
      averageIndex: averageIndexVal,
      accountBalance: accountBalanceVal,
      months: monthsVal,
      retireAge: retireAgeText,
      retireDate: retireDateStr,
      baseNumber: baseNumberVal,
      retirementType: retirementType,  // 存到data，供分享路径使用

      // 地区信息
      provinceName: r.provinceName || '',
      cityLabel: r.cityLabel || '',

      // 退休方式（用于 WXML 显示不同文案）
      retirementType: retirementType,
      retireAgeLabel: retireTypeLabel,  // "弹性提前退休" 或 "法定年龄退休"
      retireInfo: retireInfo,        // "60岁弹性提前退休（2031年6月）"
      retireDateLabel: retireDateStr ? `预计${retireDateStr}退休` : ''
    })

    // 分享图不再在 onLoad 时生成，改为按需触发（用户点"保存到相册"或"分享"时才生成）
    this._shareImageReady = false

    // 调试：确认最终 setData 的值
    console.log('[result] setData done:', {
      totalAmount, basePension, personalPension, transitionPension,
      workYears: workYearsVal, accountBalance: accountBalanceVal, baseNumber: baseNumberVal,
      exactAge: exactAgeStr
    })
  },

  toggleDetail() {
    this.setData({ showDetail: !this.data.showDetail })
  },

  onRecalculate() {
    wx.navigateBack({ delta: 3 })
  },

  /**
   * 分享查看模式下：点"我也来算一下" → 跳到首页
   */
  goCalculate() {
    wx.reLaunch({ url: '/pages/index/index' })
  },

  /**
   * 查看方案对比和退休建议（¥1.00，虚拟支付）
   *
   * 支付流程：
   *   1. wx.login 拿 code → 调用云函数 createOrder 换 session_key + 生成虚拟支付签名
   *   2. 调起 wx.requestVirtualPayment（道具直购，内部自动下单）
   *   3. 支付成功 → 标记已购买 → 跳转报告页
   */
  goReport() {
    // 付费开关：false=线下自测直接解锁报告；true=发布收费版（需主体已开通虚拟支付能力 + 云端 createOrder 配 VP_APP_SECRET）
    const PAY_ENABLED = true
    if (!PAY_ENABLED) {
      wx.setStorageSync('report_paid', '1')
      wx.navigateTo({ url: '/pages/report/report' })
      return
    }

    // 审核模式：连续点击5次绕过支付
    this._debugTapCount = (this._debugTapCount || 0) + 1
    if (this._debugTapCount >= 5) {
      wx.setStorageSync('audit_paid', '1')
      wx.showToast({ title: '审核模式已启用，跳过支付', icon: 'success' })
      this._debugTapCount = 0
      wx.setStorageSync('report_paid', '1')
      wx.navigateTo({ url: '/pages/report/report' })
      return
    }

    var self = this
    wx.showLoading({ title: '加载支付中...', mask: true })

    // 虚拟支付：先 wx.login 拿 code，云函数据此换 session_key 并生成签名
    wx.login({
      success: function(loginRes) {
        if (!loginRes.code) {
          wx.hideLoading()
          wx.showModal({ title: '登录失败', content: '无法获取登录凭证', showCancel: false })
          return
        }
        wx.cloud.callFunction({
          name: 'createOrder',
          data: { loginCode: loginRes.code, productId: 'pension_report' },
          success: function(res) {
            wx.hideLoading()
            var result = res.result
            if (result.code !== 0 || !result.data) {
              wx.showModal({ title: '下单失败', content: result.msg || '未知错误', showCancel: false })
              return
            }
            var d = result.data
            // 防御：签名参数缺失说明云端 createOrder 还是旧版（标准支付），需重新上传虚拟支付版本
            if (!d.signData || !d.paySig || !d.signature) {
              console.error('[pay] 签名参数缺失:', JSON.stringify(Object.keys(d||{})))
              wx.showModal({
                title: '支付服务升级中',
                content: '签名参数缺失，请确认云函数 createOrder 已重新上传（虚拟支付版本）并配置了 VP_APP_SECRET 环境变量',
                showCancel: false
              })
              return
            }
            // wx.requestVirtualPayment 内部自动下单，仅需传签名参数（道具直购模式）
            wx.requestVirtualPayment({
              signData: d.signData,
              paySig: d.paySig,
              signature: d.signature,
              mode: 'short_series_goods',
              success: function() {
                wx.setStorageSync('report_paid', '1')
                // 记录订单（best-effort，不影响解锁）
                wx.cloud.callFunction({
                  name: 'payCallback',
                  data: { orderNo: d.orderNo, productId: d.productId }
                }).catch(function() {})
                wx.navigateTo({ url: '/pages/report/report' })
              },
              fail: function(err) {
                console.error('[pay] requestVirtualPayment fail:', JSON.stringify(err))
                // 取消判定：部分基础库 errMsg 含 'cancel'，部分仅返回 errno === -2
                var isCancel = (err.errMsg && err.errMsg.indexOf('cancel') >= 0) || err.errno === -2
                if (isCancel) {
                  wx.showToast({ title: '已取消支付', icon: 'none' })
                } else {
                  wx.showModal({
                    title: '支付失败',
                    content: (err.errMsg || '请重试') + '\n（如反复失败请截屏反馈）',
                    showCancel: false
                  })
                }
              }
            })
          },
          fail: function(err) {
            wx.hideLoading()
            console.error('[pay] createOrder callFunction fail:', JSON.stringify(err))
            wx.showModal({
              title: '下单失败',
              content: (err.errMsg || '无法连接支付服务') + '\n（如反复失败请截屏反馈）',
              showCancel: false
            })
          }
        })
      },
      fail: function() {
        wx.hideLoading()
        wx.showToast({ title: '登录失败', icon: 'none' })
      }
    })
  },

  /**
   * 点击"分享结果"：生成图片 → 微信原生全屏预览（长按可转发/保存）
   */
  onShareResult() {
    wx.showLoading({ title: '生成分享图...', mask: true })
    this._generateShareImageIfNeeded().then((filePath) => {
      wx.hideLoading()
      this.setData({ shareImagePath: filePath })
      wx.previewImage({
        urls: [filePath],
        current: filePath,
      })
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '图片生成失败', icon: 'none' })
    })
  },


  /**
   * 确保分享图已生成（返回 Promise，已缓存则直接返回）
   */
  _generateShareImageIfNeeded() {
    if (this._shareImageReady && this.data.shareImagePath) {
      return Promise.resolve(this.data.shareImagePath)
    }
    return this._drawShareImage()
  },

  /**
   * 绘制分享图（原生 Canvas 2D）— 返回 Promise<tempFilePath>
   */
  _drawShareImage() {
    var self = this
    return new Promise(function(resolve, reject) {
      // 拷贝小程序码到 USER_DATA_PATH
      var fs = wx.getFileSystemManager()
      var tmpQr = wx.env.USER_DATA_PATH + '/minicode.png'
      fs.copyFile({
        srcPath: '/images/minicode.png',
        destPath: tmpQr,
        success: function() {
          self._renderCanvas(tmpQr, resolve, reject)
        },
        fail: function() {
          self._renderCanvas(null, resolve, reject)
        }
      })
    })
  },

  _renderCanvas(qrPath, resolve, reject) {
    var self = this
    var d = this.data

    var data = {
      totalAmount: d.totalAmount,
      basePension: d.basePension,
      personalPension: d.personalPension,
      transitionPension: d.transitionPension,
      extraPension: d.extraPension,
      retireInfo: d.retireInfo,
      provinceName: d.provinceName,
      cityLabel: d.cityLabel,
      workYears: d.workYears,
      actualYears: d.actualYears,
      averageIndex: d.averageIndex,
      accountBalance: d.accountBalance,
      sameYears: d.sameYears,
      months: d.months,
      baseNumber: d.baseNumber,
      qrPath: qrPath
    }

    var query = wx.createSelectorQuery().in(this)
    query.select('#shareCanvas').fields({ node: true, size: true }).exec(function (res) {
      if (!res || !res[0] || !res[0].node) {
        console.error('[share] canvas node not found')
        reject(new Error('canvas node not found'))
        return
      }
      var canvas = res[0].node
      var ctx = canvas.getContext('2d')
      var dpr = 2
      try {
        dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio) || 2
      } catch (e) { dpr = 2 }

      shareCanvas.draw(data, canvas, ctx, dpr, function () {
        wx.canvasToTempFilePath({
          canvas: canvas,
          success: function (r) {
            self._shareImageReady = true
            self.setData({ shareImagePath: r.tempFilePath })
            resolve(r.tempFilePath)
          },
          fail: function (err) {
            console.error('[share] canvasToTempFilePath fail:', JSON.stringify(err))
            reject(err)
          }
        })
      })
    })
  },



  /**
   * 原生分享给朋友（open-type="share" 按钮触发）
   * 分享小程序卡片，带关键结果参数（支持裂变）
   */
  onShareAppMessage() {
    const d = this.data
    // 如果是分享查看模式，分享的是原分享者的数据（从 shareData 取）
    const share = d.isShareView ? d.shareData : d
    const province = (share.provinceName || '').replace(/\s+/g, '')
    const city = (share.cityLabel || '').replace(/\s+/g, '')
    const title = `我每月预计领${share.totalAmount || d.totalAmount}元养老金，你呢？`
    const path = `/pages/result/result?share=1&province=${encodeURIComponent(province)}&city=${encodeURIComponent(city)}&total=${share.totalAmount || d.totalAmount}&retireType=${share.retirementType || d.retirementType}&retireAge=${encodeURIComponent(share.retireAge || d.retireAge)}`
    return {
      title: title,
      path: path,
      imageUrl: d.shareImagePath || '/assets/logo.jpg'
    }
  },

  /**
   * 分享到朋友圈（微信 7.0.12+ 支持）
   */
  onShareTimeline() {
    const d = this.data
    const share = d.isShareView ? d.shareData : d
    const province = (share.provinceName || '').replace(/\s+/g, '')
    const city = (share.cityLabel || '').replace(/\s+/g, '')
    const query = `share=1&province=${encodeURIComponent(province)}&city=${encodeURIComponent(city)}&total=${share.totalAmount || d.totalAmount}&retireType=${share.retirementType || d.retirementType}&retireAge=${encodeURIComponent(share.retireAge || d.retireAge)}`
    return {
      title: `养老金测算：我每月预计领${share.totalAmount || d.totalAmount}元 · ${province || ''}`,
      query: query,
      imageUrl: d.shareImagePath || '/assets/logo.jpg'
    }
  },
})
