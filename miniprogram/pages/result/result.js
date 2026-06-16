Page({
  data: {
    tab: 'legal',
    result: {},
    legalTotal: '--',
    flexTotal: '--',
    hasFlex: false,
    params: []
  },

  onLoad() {
    var app = getApp()
    var r = app.globalData.lastResult
    if (!r) { wx.navigateBack(); return }

    var legal = r.legal
    var flex = r.flex
    var hasFlex = r.comparison && r.comparison.canFlex && flex && flex.total

    var fmt = function(v) {
      if (v == null || isNaN(v)) return '--'
      return '¥' + Number(v).toLocaleString('zh-CN', {minimumFractionDigits:2})
    }
    function t(label, val, highlight) {
      return {label: label, value: val || '--', highlight: !!highlight}
    }

    // 当前展示常规参数
    var dateStr = function(d) { return d ? d.year + '年' + d.month + '月' : '--' }

    this.setData({
      result: r,
      legalTotal: fmt(legal.total),
      flexTotal: hasFlex ? fmt(flex.total) : '--',
      hasFlex: hasFlex,
      params: [
        t('退休时间', dateStr(legal.date)),
        t('退休年龄', legal.ageStr || '--'),
        t('累计缴费', (legal.totalYears || 0).toFixed(2) + '年'),
        t('视同缴费', (legal.sightYears || 0).toFixed(2) + '年'),
        t('实际缴费', (legal.actualYears || 0).toFixed(2) + '年'),
        t('计发基数', fmt(legal.baseRetire)),
        t('是否满足最低年限', legal.meetMin ? '✅ 是' : '❌ 否', !legal.meetMin)
      ]
    })
  },

  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab })
    var r = this.data.result
    var obj = this.data.tab === 'legal' ? r.legal : r.flex
    if (!obj) return

    var fmt = function(v) {
      if (v == null || isNaN(v)) return '--'
      return '¥' + Number(v).toLocaleString('zh-CN', {minimumFractionDigits:2})
    }
    var dateStr = function(d) { return d ? d.year + '年' + d.month + '月' : '--' }

    this.setData({
      params: [
        {label:'退休时间', value: dateStr(obj.date)},
        {label:'退休年龄', value: obj.ageStr || '--'},
        {label:'累计缴费', value: (obj.totalYears || 0).toFixed(2) + '年'},
        {label:'视同缴费', value: (obj.sightYears || 0).toFixed(2) + '年'},
        {label:'实际缴费', value: (obj.actualYears || 0).toFixed(2) + '年'},
        {label:'计发基数', value: fmt(obj.baseRetire)},
        {label:'是否满足最低年限', value: obj.meetMin ? '✅ 是' : '❌ 否', highlight: !obj.meetMin}
      ]
    })
  },

  goReport() {
    wx.navigateTo({ url: '/pages/report/report' })
  },

  goBack() {
    wx.navigateBack()
  }
})
