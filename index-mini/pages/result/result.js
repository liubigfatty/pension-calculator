// pages/result/result.js
Page({
  data: {
    mode: 'forward',
    avgIndex: '-',
    accountBalance: '-',
    totalMonths: 0,
    totalYears: 0,
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
    const detail = (d.yearsDetail || [])
      .filter(y => y.index !== null && y.index !== undefined)
      .map(y => ({
        year: y.year,
        months: y.months,
        baseAvg: (y.baseAvg || 0).toFixed(0),
        index: y.index.toFixed(4),
        balance: (y.balanceAfterYear || 0).toFixed(2)
      }))

    this.setData({
      mode: r.mode,
      avgIndex: d.avgIndex !== undefined ? d.avgIndex.toFixed(4) : '-',
      accountBalance: d.accountBalance !== undefined ? d.accountBalance.toFixed(2) : '-',
      totalMonths: d.totalMonths || 0,
      totalYears: d.totalYears || 0,
      inferredIndex: d.inferredIndex !== undefined ? d.inferredIndex.toFixed(4) : '-',
      calculatedBalance: d.calculatedBalance !== undefined ? d.calculatedBalance.toFixed(2) : '-',
      converged: !!d.converged,
      residual: d.residual ? '¥' + d.residual.toFixed(0) : '',
      detail
    })
  },

  back() { wx.navigateBack() }
})
