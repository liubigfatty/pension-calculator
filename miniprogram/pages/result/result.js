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
   * 查看方案对比和退休建议（0.99元）
   *
   * 支付流程（一次云函数搞定）：
   *   1. 调用云函数 createOrder → 统一下单 + 生成签名参数
   *   2. 调起 wx.requestPayment
   *   3. 支付成功 → 标记已购买 → 跳转报告页
   */
  goReport() {
    const startTime = Date.now()
    wx.showLoading({ title: '创建订单...', mask: true })

    wx.cloud.callFunction({
      name: 'createOrder',
      data: { total_fee: 100 }
    }).then(res => {
      wx.hideLoading()

      if (res.result.code !== 0) {
        wx.showToast({ title: res.result.msg || '下单失败，请重试', icon: 'none' })
        return
      }

      const params = res.result.data.paymentParams
      wx.requestPayment({
        timeStamp: params.timeStamp,
        nonceStr: params.nonceStr,
        package: params.package,
        signType: params.signType,
        paySign: params.paySign,
        success: () => {
          console.log('✅ 支付成功，耗时', (Date.now() - startTime) / 1000, '秒')
          wx.showToast({ title: '支付成功', icon: 'success', duration: 1500 })
          wx.setStorageSync('report_paid', '1')
          setTimeout(() => {
            wx.navigateTo({ url: '/pages/report/report' })
          }, 1500)
        },
        fail: (err) => {
          if (err.errMsg && err.errMsg.includes('cancel')) {
            wx.showToast({ title: '已取消支付', icon: 'none' })
          } else {
            console.error('❌ 支付失败:', err)
            wx.showToast({ title: '支付失败，请重试', icon: 'none' })
          }
        }
      })
    }).catch(err => {
      wx.hideLoading()
      console.error('❌ 支付流程异常:', err)
      wx.showToast({ title: '网络错误，请重试', icon: 'none' })
    })
  },

  /**
   * 点击"分享结果"：生成图片 → 全屏预览
   */
  onShareResult() {
    wx.showLoading({ title: '生成分享图...', mask: true })
    this._generateShareImageIfNeeded().then((filePath) => {
      wx.hideLoading()
      this.setData({
        showSharePreview: true,
        shareImagePath: filePath,
      })
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '图片生成失败', icon: 'none' })
    })
  },

  /**
   * 关闭分享预览
   */
  closeSharePreview() {
    this.setData({ showSharePreview: false })
  },

  /**
   * 分享预览中：长按图片 → 全屏预览（原生支持发送给朋友）
   */
  onShareImagePreview() {
    const filePath = this.data.shareImagePath
    if (!filePath) return
    wx.previewImage({
      urls: [filePath],
      current: filePath,
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
   * 绘制分享图（Canvas 2D）— 返回 Promise<tempFilePath>
   */
  _drawShareImage() {
    return new Promise((resolve, reject) => {
      const query = this.createSelectorQuery()
      query.select('#shareCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) {
            reject(new Error('canvas not found'))
            return
          }
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = wx.getSystemInfoSync().pixelRatio
          canvas.width = 750 * dpr
          canvas.height = 1400 * dpr
          ctx.scale(dpr, dpr)

          // 绘制分享图内容
          this._drawShare(ctx, this.data)

          // 导出临时文件
          wx.canvasToTempFilePath({
            canvas: canvas,
            fileType: 'png',
            quality: 1,
            success: (res) => {
              this._shareImageReady = true
              this.setData({ shareImagePath: res.tempFilePath })
              resolve(res.tempFilePath)
            },
            fail: (err) => {
              console.error('[share] 导出失败:', err)
              reject(err)
            }
          })
        })
    })
  },

  /**
   * 绘制分享图内容（和结果展示页视觉完全一致）
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} d - this.data
   */
  _drawShare(ctx, d) {
    const W = 750, H = 1400

    // ═══ 设计规范（和结果页完全一致） ═══
    const C = {
      bg: '#F5F3F0',           /* 暖白 - 页面背景 */
      white: '#F4F0E8',        /* Creamy Off-White - 卡片背景 */
      darkBg: '#171717',       /* Deep Charcoal - 金额卡片背景 */
      darkBgEnd: '#2A2A2A',    /* 深色渐变结束 */
      gold: '#B8977D',         /* 正元光 - 金色文字 */
      text: '#171717',         /* Deep Charcoal - 深色正文 */
      sub: '#6C584B',         /* Warm Taupe - 暖棕 */
      faint: '#AAAAAA',         /* 辅助文字 */
      line: '#E0D8CC',        /* 暖棕分割线 */
    }
    const F = {
      title: 'bold 34px PingFang SC',
      region: '25px PingFang SC',
      amount: 'bold 88px DIN Alternate',
      unit: '24px PingFang SC',
      section: 'bold 28px PingFang SC',
      label: '22px PingFang SC',
      value: 'bold 26px PingFang SC',
      note: '19px PingFang SC',
      brand: '17px PingFang SC'
    }

    // ── 1. 页面背景 ──
    ctx.fillStyle = C.bg
    ctx.fillRect(0, 0, W, H)

    // ── 2. 金额主卡片（深色渐变，和结果页一致）──
    const cardX = 40, cardW = W - 80, cardY = 40, cardH = 280
    
    // 阴影
    ctx.shadowColor = 'rgba(40,41,43,0.25)'
    ctx.shadowBlur = 30
    ctx.shadowOffsetY = 8
    
    // 深色渐变背景
    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH)
    cardGrad.addColorStop(0, C.darkBg)
    cardGrad.addColorStop(1, C.darkBgEnd)
    ctx.fillStyle = cardGrad
    this._roundRect(ctx, cardX, cardY, cardW, cardH, 32)
    ctx.fill()
    
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0

    // 标题：每月可领取养老金
    let y = cardY + 48
    ctx.fillStyle = 'rgba(139,115,85,0.9)'
    ctx.font = F.title
    ctx.textAlign = 'center'
    ctx.fillText('每月可领取养老金', W / 2, y)
    y += 80

    // 金额（金色）
    ctx.fillStyle = C.gold
    ctx.font = F.amount
    ctx.textAlign = 'center'
    const totalStr = d.totalAmount ? ('¥' + d.totalAmount) : '--'
    ctx.fillText(totalStr, W / 2, y)
    y += 90

    // 退休信息标签（半透明金色背景）
    if (d.retireInfo) {
      const tagW = Math.min(W - 120, 400)
      const tagX = (W - tagW) / 2
      ctx.fillStyle = 'rgba(139,115,85,0.12)'
      this._roundRect(ctx, tagX, y - 30, tagW, 44, 22)
      ctx.fill()
      ctx.fillStyle = 'rgba(139,115,85,0.95)'
      ctx.font = F.region
      ctx.textAlign = 'center'
      ctx.fillText(d.retireInfo, W / 2, y)
    }

    // ── 3. 地区标签 ──
    y = cardY + cardH + 32
    ctx.fillStyle = C.sub
    ctx.font = F.region
    ctx.textAlign = 'center'
    ctx.fillText((d.provinceName || '') + (d.cityLabel ? ' · ' + d.cityLabel : ''), W / 2, y)
    y += 48

    // ── 4. 养老金构成明细（白色卡片）──
    ctx.fillStyle = C.text
    ctx.font = F.section
    ctx.textAlign = 'left'
    ctx.fillText('养老金构成', 48, y)
    y += 46

    const items = [
      { label: '基础养老金', value: d.basePension },
      { label: '个人账户养老金', value: d.personalPension },
    ]
    if (d.transitionPension != null && Number(d.transitionPension) > 0)
      items.push({ label: '过渡性养老金', value: d.transitionPension })
    if (d.extraPension != null && Number(d.extraPension) > 0)
      items.push({ label: '其它加发', value: d.extraPension })

    const detailH = items.length * 56 + 32
    ctx.fillStyle = C.white
    this._roundRect(ctx, 40, y, cardW, detailH, 32)
    ctx.fill()

    ctx.strokeStyle = C.line
    ctx.lineWidth = 1
    items.forEach((item, i) => {
      const iy = y + 16 + i * 56
      if (i > 0) {
        ctx.beginPath()
        ctx.moveTo(72, iy)
        ctx.lineTo(W - 72, iy)
        ctx.stroke()
      }
      ctx.fillStyle = C.sub
      ctx.font = F.label
      ctx.textAlign = 'left'
      ctx.fillText(item.label, 72, iy + 33)
      ctx.fillStyle = C.text
      ctx.font = F.value
      ctx.textAlign = 'right'
      ctx.fillText((item.value || '--') + ' 元', W - 72, iy + 33)
    })
    y += detailH + 40

    // ── 5. 计算参数（白色卡片，不含退休方式/年龄/日期）──
    ctx.fillStyle = C.text
    ctx.font = F.section
    ctx.textAlign = 'left'
    ctx.fillText('计算参数', 48, y)
    y += 46

    const params = []
    params.push({ label: '累计缴费年限', value: (d.workYears || '--') + ' 年' })
    params.push({ label: '实际缴费年限', value: (d.actualYears || '--') + ' 年' })
    if (d.sameYears != null && Number(d.sameYears) > 0)
      params.push({ label: '视同缴费年限', value: d.sameYears + ' 年' })
    params.push({ label: '平均缴费指数', value: String(d.averageIndex || '--') })
    params.push({ label: '个人账户余额', value: (d.accountBalance || '--') + ' 元' })
    params.push({ label: '计发月数', value: String(d.months || '--') })
    params.push({ label: '退休地计发基数', value: (d.cityLabel || '--') })

    const paramCardH = params.length * 56 + 32
    ctx.fillStyle = C.white
    this._roundRect(ctx, 40, y, cardW, paramCardH, 32)
    ctx.fill()

    ctx.strokeStyle = C.line
    ctx.lineWidth = 1
    params.forEach((p, i) => {
      const py = y + 16 + i * 56
      if (i > 0) {
        ctx.beginPath()
        ctx.moveTo(72, py)
        ctx.lineTo(W - 72, py)
        ctx.stroke()
      }
      ctx.fillStyle = C.sub
      ctx.font = F.label
      ctx.textAlign = 'left'
      ctx.fillText(p.label, 72, py + 33)
      ctx.fillStyle = C.text
      ctx.font = F.value
      ctx.textAlign = 'right'
      ctx.fillText(p.value, W - 72, py + 33)
    })
    y += paramCardH + 44

    // ── 6. 温馨提示 ──
    ctx.fillStyle = '#C9A96E'
    ctx.font = F.note
    ctx.textAlign = 'center'
    ctx.fillText('💡 温馨提示：本测算结果仅供参考', W / 2, y)
    y += 28
    ctx.fillText('实际养老金以社保部门核定为准', W / 2, y)
  },


  /**
   * 绘制圆角矩形（辅助方法）
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - 左上角x
   * @param {number} y - 左上角y
   * @param {number} w - 宽度
   * @param {number} h - 高度
   * @param {number} r - 圆角半径
   */
  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  },

  /**
   * 阻止事件冒泡（分享预览弹窗用）
   */
  stopProp() {},

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
      imageUrl: d.shareImagePath || ''
    }
  },

  /**
   * 分享到朋友圈（微信 7.0.12+ 支持）
   */
  onShareTimeline() {
    const d = this.data
    return {
      title: `养老金测算：我每月预计领${d.totalAmount || '--'}元 · ${d.provinceName || ''}`,
      query: '',
      imageUrl: d.shareImagePath || ''
    }
  },
})
