// pages/result/result.js
Page({
  data: {
    mode: 'forward',
    hasForward: false,
    hasInfer: false,
    avgIndex: '-',
    accountBalance: '-',
    totalMonths: 0,
    totalYears: 0,
    forwardSource: '',
    inferredIndex: '-',
    calculatedBalance: '-',
    converged: false,
    residual: '',
    detail: []
  },

  onLoad(query) {
    // 微信 AI 开发模式：优先读取「接力到小程序页面」的 handoff payload
    const app = getApp()
    let r = null
    const handoffs = (app.globalData && app.globalData.agentHandoffs) || {}
    const key = (typeof this.getPageId === 'function') ? this.getPageId() : null
    const ho = (key != null) ? handoffs[key] : null
    if (ho && ho.payload && ho.payload.result && ho.payload.result.data) {
      r = ho.payload.result
      if (key != null) delete handoffs[key]
    } else {
      r = app.globalData.result
    }

    if (!r || !r.data) {
      wx.showToast({ title: '无计算结果', icon: 'none' })
      return
    }
    const d = r.data
    const fwd = d.forward
    const inf = d.infer

    const patch = { mode: r.mode, hasForward: !!fwd, hasInfer: !!inf }

    if (fwd) {
      const detail = (fwd.yearsDetail || [])
        .filter(y => y.index !== null && y.index !== undefined)
        .map(y => ({
          year: y.year,
          months: y.months,
          baseAvg: (y.baseAvg || 0).toFixed(0),
          index: y.index.toFixed(4),
          balance: (y.balanceAfterYear || 0).toFixed(2)
        }))
      const meta = fwd._meta || {}
      const gapRule = !!meta.gapYearCountsInAvg
      const gapYears = meta.gapYears || 0
      let gapNote = ''
      if (gapRule && gapYears > 0) {
        gapNote = `您选择的${meta.province || '该地区'}执行“断缴年份按指数0计入平均指数”规则：本次有 ${gapYears} 个断缴年份已计入分母，平均指数因此被拉低。`
      }
      let reverseNote = ''
      if (meta.reverseMode === 'balance') {
        reverseNote = '本结果为【反推】：已知账户余额 ¥' + Math.round(meta.knownBalance) + ' 反推，平均指数 ' + fwd.avgIndex + '，历年按相同比例缴费估算。'
      } else if (meta.reverseMode === 'currentBase') {
        reverseNote = '本结果为【反推】：基于当前月缴费基数 ¥' + Math.round(meta.currentBase) + '（当下指数 ' + meta.currentIndex + '），假设历年按相同比例缴费估算。'
      } else if (meta.reverseMode === 'targetIndex') {
        reverseNote = '本结果为【反推】：按目标平均指数 ' + meta.targetIndex + ' 估算，每年应缴基数 = 当年社平 × ' + meta.targetIndex + '。'
      }
      const reverseSourceMap = { balance: '基于账户余额反推（假设历年按相同比例）', currentBase: '基于当前基数反推（假设历年按相同比例）', targetIndex: '基于目标指数反推（每年 = 当年社平 × 目标）' }
      Object.assign(patch, {
        avgIndex: fwd.avgIndex !== undefined ? fwd.avgIndex.toFixed(4) : '-',
        accountBalance: fwd.accountBalance !== undefined ? fwd.accountBalance.toFixed(2) : '-',
        totalMonths: fwd.totalMonths || 0,
        totalYears: fwd.totalYears || 0,
        forwardSource: reverseNote
          ? reverseSourceMap[meta.reverseMode]
          : (fwd._source === 'current'
          ? '按您当前工资估算（假设历年按相同比例缴费）'
              : '基于逐年明细计算（最准确）'),
        forwardIsCurrent: fwd._source === 'current',
        forwardCurrentIndex: (fwd._currentIndex != null) ? fwd._currentIndex.toFixed(4) : '',
        gapNote,
        detail
      })
    }

    if (inf) {
      Object.assign(patch, {
        inferredIndex: inf.inferredIndex !== undefined ? inf.inferredIndex.toFixed(4) : '-',
        calculatedBalance: inf.calculatedBalance !== undefined ? inf.calculatedBalance.toFixed(2) : '-',
        converged: !!inf.converged,
        residual: inf.residual ? '¥' + inf.residual.toFixed(0) : ''
      })
    }

    this.setData(patch)
  },

  back() { wx.navigateBack() }
})
