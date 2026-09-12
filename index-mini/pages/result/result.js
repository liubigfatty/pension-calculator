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
    transIndex: '-',
    showTrans: false,
    deemedNote: '',
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
      const meta = fwd._meta || {}
      const gapRule = !!meta.gapYearCountsInAvg
      const gapYears = meta.gapYears || 0
      let gapNote = ''
      if (gapRule && gapYears > 0) {
        gapNote = `您选择的${meta.province || '该地区'}执行“断缴年份按指数0计入平均指数”规则：本次有 ${gapYears} 个断缴年份已计入分母，平均指数因此被拉低。`
      }
      // 过渡性指数（双指数/双基数省）
      const showTrans = fwd.transIndex != null && fwd.transIndex > 0
      // 视同年 / 城市 D 值说明
      const dnParts = []
      if (meta.deemedInDenom && meta.deemedYears > 0) {
        dnParts.push('已按' + (meta.province || '该省') + '规则将 ' + meta.deemedYears + ' 年视同缴费计入平均指数分母（指数默认1.0，特例省按省规）')
      } else if (meta.deemedInDenom && meta.deemedYears === 0) {
        dnParts.push('该省视同年计入指数分母，但您未填写视同缴费年限；如有视同年限请填写以得准确结果')
      }
      if (meta.city) {
        dnParts.push('广东省「' + meta.city + '」视同缴费指数(D)按粤府函〔2021〕294号查表，深圳用独立社平')
      }
      if (meta.deemedStartYear && (meta.provinceCode === 'zhejiang' || meta.provinceCode === 'jiangsu' || meta.provinceCode === 'jiangxi')) {
        dnParts.push('已用视同起始年 ' + meta.deemedStartYear + ' 取分段视同指数')
      }
      Object.assign(patch, {
        avgIndex: fwd.avgIndex !== undefined ? fwd.avgIndex.toFixed(4) : '-',
        accountBalance: fwd.accountBalance !== undefined ? fwd.accountBalance.toFixed(2) : '-',
        totalMonths: fwd.totalMonths || 0,
        totalYears: fwd.totalYears || 0,
        transIndex: showTrans ? fwd.transIndex.toFixed(4) : '-',
        showTrans,
        deemedNote: dnParts.length ? dnParts.join('；') + '。' : '',
        forwardSource: fwd._source === 'current'
          ? '按您当前工资估算（假设历年按相同比例缴费）'
          : '基于逐年明细计算（最准确）',
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
