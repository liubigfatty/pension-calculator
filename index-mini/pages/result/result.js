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

  onLoad() {
    const r = getApp().globalData.result
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
      Object.assign(patch, {
        avgIndex: fwd.avgIndex !== undefined ? fwd.avgIndex.toFixed(4) : '-',
        accountBalance: fwd.accountBalance !== undefined ? fwd.accountBalance.toFixed(2) : '-',
        totalMonths: fwd.totalMonths || 0,
        totalYears: fwd.totalYears || 0,
        forwardSource: fwd._source === 'current'
          ? '按您当前工资估算（假设历年按相同比例缴费）'
          : '基于逐年明细计算（最准确）',
        forwardIsCurrent: fwd._source === 'current',
        forwardCurrentIndex: (fwd._currentIndex != null) ? fwd._currentIndex.toFixed(4) : '',
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
