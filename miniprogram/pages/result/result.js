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
    result: {},
    provinceName: '',
    cityLabel: '',
    showDetail: true,
    // 精确退休年龄
    exactAge: '',
  },

  onLoad() {
    const r = app.globalData.calcResult || {}

    // 调试：打印原始数据（上线前可删除）
    console.log('[result] calcResult:', JSON.stringify(r))

    // 展平数据，多重容错
    const raw = r._raw || {}
    const legal = raw.legal || {}
    const meta = raw.metaData || {}

    // fmt: 安全数字格式化，失败返回 null（WXML 里用 != null 判断）
    const fmt = (v, d = 2) => {
      if (v == null || v === '') return null  // null、undefined、空字符串都返回 null
      const n = Number(v)
      return !isNaN(n) && isFinite(n) ? n.toFixed(d) : null
    }

    // extraPension 多重 fallback
    const extraVal = r.extraPension != null
      ? r.extraPension
      : ((legal.extraPension?.amount || 0) + (legal.specialAddition?.amount || 0))
    const extraPensionFmt = (extraVal != null && Number(extraVal) > 0) ? fmt(extraVal) : null

    // 核心金额字段：优先用 step3 已算好的值，其次用引擎返回值
    const totalAmount = r.totalAmount != null ? r.totalAmount : fmt(legal.total)
    const basePension = r.basePension != null ? r.basePension : fmt(legal.basicPension?.amount)
    const personalPension = r.personalPension != null ? r.personalPension : fmt(legal.personalAccount?.amount)
    const transitionPension = r.transitionPension != null ? r.transitionPension : fmt(legal.transitionalPension?.amount)

    // 计算参数：优先用 step3 已算好的值
    // workYears: 可能是数字或字符串，统一转数字再格式化
    let workYearsVal = r.workYears != null ? r.workYears : (legal.totalYears != null ? legal.totalYears : null)
    if (workYearsVal != null) workYearsVal = fmt(workYearsVal, 2)  // 变成 "32.50" 这样的字符串

    // accountBalance: 优先用 step3 传入的用户输入值
    let accountBalanceVal = null
    if (r.accountBalance != null && String(r.accountBalance) !== '') {
      const n = Number(r.accountBalance)
      if (!isNaN(n) && isFinite(n)) accountBalanceVal = n.toFixed(2)
    }
    if (accountBalanceVal === null && legal.personalAccount?.balance != null) {
      accountBalanceVal = fmt(legal.personalAccount.balance, 2)
    }

    // baseNumber: 退休地计发基数
    let baseNumberVal = null
    if (r.baseNumber != null && String(r.baseNumber) !== '') {
      const n = Number(r.baseNumber)
      if (!isNaN(n) && isFinite(n)) baseNumberVal = n.toFixed(2)
    }
    if (baseNumberVal === null && legal.baseRetire != null) {
      baseNumberVal = fmt(legal.baseRetire)
    }

    // averageIndex: 平均缴费指数
    const averageIndexVal = r.averageIndex != null ? r.averageIndex : null

    // months: 计发月数
    const monthsVal = r.months != null ? r.months : (legal.months || null)

    // retireAge: 法定退休年龄（精确：62岁10个月）
    const retireAgeVal = r.retireAge || legal.ageStr || null
    // 精确退休年龄（岁+月）
    let exactAgeStr = retireAgeVal || ''
    if (r.birthYear && r.birthMonth && legal.date) {
      exactAgeStr = calcExactAge(r.birthYear, r.birthMonth, legal.date.year, legal.date.month)
    }

    this.setData({
      // 核心金额
      totalAmount,
      basePension,
      personalPension,
      transitionPension,
      extraPension: extraPensionFmt,

      // 计算参数（已经是格式化好的字符串，WXML 直接显示）
      workYears: workYearsVal,
      averageIndex: averageIndexVal,
      accountBalance: accountBalanceVal,
      months: monthsVal,
      retireAge: retireAgeVal,
      exactAge: exactAgeStr,
      baseNumber: baseNumberVal,

      // 地区信息
      provinceName: r.provinceName || meta.name || '',
      cityLabel: r.cityLabel || ''
    })

    // 生成分享图（异步，不阻塞页面渲染）
    this.generateShareImage()

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

  // 保存分享图到相册
  saveShareImage() {
    const path = this.data.shareImagePath
    if (!path) {
      wx.showToast({ title: '分享图生成中，请稍候', icon: 'none' })
      // 如果分享图还没生成好，1秒后重试
      setTimeout(() => {
        this.saveShareImage()
      }, 1000)
      return
    }
    wx.saveImageToPhotosAlbum({
      filePath: path,
      success: () => {
        wx.showToast({ title: '已保存到相册', icon: 'success', duration: 1500 })
      },
      fail: (err) => {
        // 如果是用户拒绝授权，引导开启权限
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中开启相册权限，以便保存分享图',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) wx.openSetting()
            }
          })
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  },

  onShareAppMessage() {
    const d = this.data
    return {
      title: `我的养老金预计每月${d.totalAmount || '--'}元，来测算你的吧`,
      path: '/pages/index/index',
      imageUrl: d.shareImagePath || ''
    }
  },

  /**
   * 生成分享图（Canvas 2D）
   * 动态绘制：根据结果字段自动显示/隐藏对应行
   */
  generateShareImage() {
    const query = this.createSelectorQuery()
    query.select('#shareCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          console.error('[share] canvas not found')
          return
        }
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = wx.getSystemInfoSync().pixelRatio
        canvas.width = 750 * dpr
        canvas.height = 1000 * dpr
        ctx.scale(dpr, dpr)

        this._drawShare(ctx, this.data)

        // 导出临时文件
        wx.canvasToTempFilePath({
          canvas: canvas,
          fileType: 'png',
          quality: 1,
          success: (res) => {
            this.setData({ shareImagePath: res.tempFilePath })
            console.log('[share] 分享图已生成:', res.tempFilePath)
            wx.showToast({ title: '分享图已生成', icon: 'success', duration: 1500 })
          },
          fail: (err) => {
            console.error('[share] 导出失败:', err)
            wx.showToast({ title: '分享图生成失败', icon: 'none' })
          }
        })
      })
  },

  /**
   * 绘制分享图内容（动态布局）
   */
  _drawShare(ctx, d) {
    const W = 750, H = 1000

    // ── 背景 ──
    ctx.fillStyle = '#F7F8FA'
    ctx.fillRect(0, 0, W, H)

    // ── 顶部品牌条 ──
    ctx.fillStyle = '#1677FF'
    ctx.fillRect(0, 0, W, 8)

    // ── 标题 ──
    ctx.fillStyle = '#1A1A1A'
    ctx.font = 'bold 34px PingFang SC'
    ctx.textAlign = 'center'
    ctx.fillText('养老金测算结果', W / 2, 70)

    // ── 核心金额 ──
    ctx.fillStyle = '#1677FF'
    ctx.font = 'bold 68px DIN Alternate, PingFang SC'
    ctx.textAlign = 'center'
    const totalStr = d.totalAmount ? `¥${d.totalAmount}` : '--'
    ctx.fillText(totalStr, W / 2, 185)

    ctx.fillStyle = '#666666'
    ctx.font = '26px PingFang SC'
    ctx.fillText('元/月（基本养老金）', W / 2, 225)

    // ── 分隔线 ──
    ctx.strokeStyle = '#E5E5EA'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(60, 260)
    ctx.lineTo(W - 60, 260)
    ctx.stroke()

    // ── 养老金构成（动态）────
    ctx.textAlign = 'left'
    let y = 310
    const itemFont = '26px PingFang SC'
    const valFont  = 'bold 26px DIN Alternate, PingFang SC'
    const labelColor = '#333333'
    const valColor   = '#1A1A1A'

    // 基础养老金（必有）
    ctx.fillStyle = labelColor
    ctx.font = itemFont
    ctx.fillText('基础养老金', 60, y)
    ctx.fillStyle = valColor
    ctx.font = valFont
    ctx.textAlign = 'right'
    ctx.fillText(`${d.basePension || '--'} 元`, W - 60, y)
    y += 56

    // 个人账户养老金（必有）
    ctx.textAlign = 'left'
    ctx.fillStyle = labelColor
    ctx.font = itemFont
    ctx.fillText('个人账户养老金', 60, y)
    ctx.fillStyle = valColor
    ctx.font = valFont
    ctx.textAlign = 'right'
    ctx.fillText(`${d.personalPension || '--'} 元`, W - 60, y)
    y += 56

    // 过渡性养老金（有条件）
    if (d.transitionPension != null && Number(d.transitionPension) > 0) {
      ctx.textAlign = 'left'
      ctx.fillStyle = labelColor
      ctx.font = itemFont
      ctx.fillText('过渡性养老金', 60, y)
      ctx.fillStyle = valColor
      ctx.font = valFont
      ctx.textAlign = 'right'
      ctx.fillText(`${d.transitionPension} 元`, W - 60, y)
      y += 56
    }

    // 增发养老金（有条件）
    if (d.extraPension != null && Number(d.extraPension) > 0) {
      ctx.textAlign = 'left'
      ctx.fillStyle = labelColor
      ctx.font = itemFont
      ctx.fillText('增发养老金', 60, y)
      ctx.fillStyle = valColor
      ctx.font = valFont
      ctx.textAlign = 'right'
      ctx.fillText(`${d.extraPension} 元`, W - 60, y)
      y += 56
    }

    // ── 分隔线 ──
    ctx.strokeStyle = '#E5E5EA'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(60, y + 10)
    ctx.lineTo(W - 60, y + 10)
    ctx.stroke()
    y += 46

    // ── 关键参数 ──
    ctx.fillStyle = '#86868B'
    ctx.font = '22px PingFang SC'
    ctx.textAlign = 'left'

    const params = []
    if (d.exactAge)      params.push(`退休年龄：${d.exactAge}`)
    if (d.workYears)      params.push(`累计缴费：${d.workYears}年`)
    if (d.averageIndex)    params.push(`平均指数：${d.averageIndex}`)
    if (d.provinceName)    params.push(`省份：${d.provinceName}`)
    if (d.cityLabel)       params.push(`退休地：${d.cityLabel}`)

    // 两列显示
    const colW = (W - 120) / 2
    for (let i = 0; i < params.length; i++) {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = 60 + col * (colW + 20)
      const yy = y + row * 40
      ctx.fillText(params[i], x, yy)
    }
    y += Math.ceil(params.length / 2) * 40 + 30

    // ── 免责声明 ──
    ctx.fillStyle = '#FF8F1F'
    ctx.font = '20px PingFang SC'
    ctx.textAlign = 'center'
    ctx.fillText('⚠️ 结果仅供参考，实际以社保部门核定为准', W / 2, y)

    // ── 底部品牌 ──
    ctx.fillStyle = '#86868B'
    ctx.font = '18px PingFang SC'
    ctx.textAlign = 'center'
    ctx.fillText('养老金计算平台 · 数据来源各省人社厅', W / 2, H - 40)
  }
})
