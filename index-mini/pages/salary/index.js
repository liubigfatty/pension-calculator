// pages/salary/index.js
// 全国社平工资查询：选省 + 选年 + 大数值 + 趋势图 + 统计 + 排名 + 分享裂变
const DATA = require('../../data/salaryHistory.js')
const PROVINCES = DATA.provinces
const META = DATA.meta

function fmt(n) {
  if (n == null || isNaN(n)) return '-'
  return Math.round(n).toLocaleString('zh-CN')
}
function pct(n) {
  if (n == null || isNaN(n)) return '-'
  const s = n > 0 ? '+' : ''
  return s + n.toFixed(1) + '%'
}

Page({
  data: {
    meta: META,
    chips: PROVINCES.map(p => ({ code: p.code, name: p.name })),
    provIndex: 0,
    yearList: [],
    yearIndex: 0,
    selName: '',
    selYear: '',
    valueMonth: '',
    valueYear: '',
    isEstimate: false,
    yoy: '',
    cagr10: '',
    span: '',
    rankList: [],
    rankSelf: 0,
    rankTotal: 0
  },

  onLoad(query) {
    let pi = 0
    if (query && query.code) {
      const i = PROVINCES.findIndex(p => p.code === query.code)
      if (i >= 0) pi = i
    }
    this.setData({ provIndex: pi }, () => this.applyProvince(pi, query && query.year))
  },

  // 选择省份（chip 点击）
  onChipTap(e) {
    const i = Number(e.currentTarget.dataset.idx)
    if (i === this.data.provIndex) return
    this.setData({ provIndex: i }, () => this.applyProvince(i))
  },

  onYearChange(e) {
    const yi = Number(e.detail.value)
    this.applyYear(yi)
  },

  // 应用省份：重置年份为最新（或深链指定年）
  applyProvince(pi, year) {
    const p = PROVINCES[pi]
    const years = Object.keys(p.history).map(Number).sort((a, b) => a - b)
    let yi = years.length - 1
    if (year) {
      const yi2 = years.indexOf(Number(year))
      if (yi2 >= 0) yi = yi2
    }
    this.setData({ selName: p.name, yearList: years.map(String) }, () => this.applyYear(yi))
  },

  applyYear(yi) {
    const p = PROVINCES[this.data.provIndex]
    const years = Object.keys(p.history).map(Number).sort((a, b) => a - b)
    const y = years[yi]
    const v = p.history[y]
    const prevY = years[yi - 1]
    const prevV = prevY != null ? p.history[prevY] : undefined
    const yoy = (prevV != null) ? (v - prevV) / prevV * 100 : null

    // 近10年累计涨幅（截至选中年）
    const avail = years.filter(t => t <= y)
    const win = avail.slice(-10)
    const cagr10 = win.length >= 2 ? (p.history[win[win.length - 1]] - p.history[win[0]]) / p.history[win[0]] * 100 : null

    const span = `${p.earliest}~${p.latest}`
    const isEstimate = y >= 2025

    // 排名（选中年各省）
    const rankArr = PROVINCES
      .map(pp => ({ code: pp.code, name: pp.name, value: pp.history[y] }))
      .filter(r => r.value != null)
      .sort((a, b) => b.value - a.value)
    let selfRank = 0
    rankArr.forEach((r, idx) => { if (r.code === p.code) selfRank = idx + 1 })
    const rankList = rankArr.map((r, idx) => ({
      rank: idx + 1, name: r.name, value: fmt(r.value), self: r.code === p.code
    }))

    this.setData({
      yearIndex: yi,
      selYear: String(y),
      valueMonth: fmt(v),
      valueYear: fmt(v * 12),
      isEstimate,
      yoy: pct(yoy),
      cagr10: pct(cagr10),
      span,
      rankList,
      rankSelf: selfRank,
      rankTotal: rankArr.length
    }, () => this.drawTrend())
  },

  // ===== 趋势折线图（canvas 2d）=====
  drawTrend() {
    const that = this
    wx.createSelectorQuery().in(this).select('#trend').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) return
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio) || 2
      const W = res[0].width, H = res[0].height
      canvas.width = W * dpr
      canvas.height = H * dpr
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, W, H)

      const p = PROVINCES[that.data.provIndex]
      const years = Object.keys(p.history).map(Number).sort((a, b) => a - b)
      const vals = years.map(y => p.history[y])
      const minV = Math.min(...vals), maxV = Math.max(...vals)
      const padL = 8, padR = 8, padT = 16, padB = 22
      const plotW = W - padL - padR, plotH = H - padT - padB
      const xOf = i => padL + (years.length === 1 ? plotW / 2 : plotW * i / (years.length - 1))
      const yOf = v => padT + plotH * (1 - (v - minV) / (maxV - minV || 1))

      // 网格基线
      ctx.strokeStyle = '#EFE9DF'
      ctx.lineWidth = 1
      for (let g = 0; g <= 3; g++) {
        const gy = padT + plotH * g / 3
        ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(W - padR, gy); ctx.stroke()
      }

      // 面积填充
      ctx.beginPath()
      ctx.moveTo(xOf(0), yOf(vals[0]))
      for (let i = 1; i < years.length; i++) ctx.lineTo(xOf(i), yOf(vals[i]))
      ctx.lineTo(xOf(years.length - 1), padT + plotH)
      ctx.lineTo(xOf(0), padT + plotH)
      ctx.closePath()
      ctx.fillStyle = 'rgba(139,115,85,0.10)'
      ctx.fill()

      // 折线
      ctx.beginPath()
      ctx.moveTo(xOf(0), yOf(vals[0]))
      for (let i = 1; i < years.length; i++) ctx.lineTo(xOf(i), yOf(vals[i]))
      ctx.strokeStyle = '#8B7355'
      ctx.lineWidth = 2
      ctx.stroke()

      // 数据点 + 高亮选中年
      const selYear = Number(that.data.selYear)
      for (let i = 0; i < years.length; i++) {
        const x = xOf(i), y = yOf(vals[i])
        if (years[i] === selYear) {
          ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2)
          ctx.fillStyle = '#8B7355'; ctx.fill()
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke()
        } else if (i % 4 === 0 || i === years.length - 1) {
          ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2)
          ctx.fillStyle = '#C9BBA8'; ctx.fill()
        }
      }

      // X 轴年份刻度（首/中/尾）
      ctx.fillStyle = '#A3A3A3'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      const ticks = [0, Math.floor((years.length - 1) / 2), years.length - 1]
      ticks.forEach(i => { if (years[i] != null) ctx.fillText(String(years[i]), xOf(i), H - 6) })
    })
  },

  // ===== 分享裂变 =====
  onShareAppMessage() {
    const p = PROVINCES[this.data.provIndex]
    const y = this.data.selYear
    const title = `${p.name} ${y}年社平工资 ${this.data.valueMonth}元/月 · 近10年${this.data.cagr10}｜全国各省一键查`
    return {
      title,
      path: `pages/salary/index?code=${p.code}&year=${y}`
    }
  },

  onShareTimeline() {
    const p = PROVINCES[this.data.provIndex]
    return {
      title: `${p.name} ${this.data.selYear}年社平工资 ${this.data.valueMonth}元/月（全国社平查询）`,
      query: `code=${p.code}&year=${this.data.selYear}`
    }
  },

  // 生成分享图（海报）并保存到相册
  onMakePoster() {
    const that = this
    wx.showLoading({ title: '生成中...' })
    wx.createSelectorQuery().in(this).select('#poster').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) { wx.hideLoading(); wx.showToast({ title: '生成失败', icon: 'none' }); return }
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio) || 2
      const W = 600, H = 800
      canvas.width = W * dpr; canvas.height = H * dpr
      ctx.scale(dpr, dpr)
      that.renderPoster(ctx, W, H, () => {
        wx.canvasToTempFilePath({
          canvas,
          success(r) {
            wx.hideLoading()
            wx.saveImageToPhotosAlbum({
              filePath: r.tempFilePath,
              success() { wx.showToast({ title: '已保存到相册' }) },
              fail() {
                wx.showModal({
                  title: '需要相册权限',
                  content: '请在「设置」中允许保存到相册后重试',
                  confirmText: '去设置',
                  success(m) { if (m.confirm) wx.openSetting() }
                })
              }
            })
          },
          fail() { wx.hideLoading(); wx.showToast({ title: '生成失败', icon: 'none' }) }
        })
      })
    })
  },

  renderPoster(ctx, W, H, done) {
    const p = PROVINCES[this.data.provIndex]
    const y = this.data.selYear
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#8B7355'); bg.addColorStop(1, '#A08566')
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
    // 白色卡片
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(40, 90, W - 80, H - 180)
    // 标题
    ctx.fillStyle = '#8B7355'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('全国社平工资', W / 2, 150)
    ctx.fillStyle = '#171717'; ctx.font = 'bold 26px sans-serif'
    ctx.fillText(`${p.name} · ${y}年${this.data.isEstimate ? '（预发估算）' : ''}`, W / 2, 196)
    // 大数值
    ctx.fillStyle = '#8B7355'; ctx.font = 'bold 64px sans-serif'
    ctx.fillText(`${this.data.valueMonth}`, W / 2, 290)
    ctx.fillStyle = '#6C584B'; ctx.font = '22px sans-serif'
    ctx.fillText(`元/月　·　约 ${this.data.valueYear} 元/年`, W / 2, 330)
    // 统计
    ctx.fillStyle = '#171717'; ctx.font = '22px sans-serif'
    ctx.fillText(`同比 ${this.data.yoy}　近10年 ${this.data.cagr10}`, W / 2, 380)
    ctx.fillStyle = '#A3A3A3'; ctx.font = '18px sans-serif'
    ctx.fillText(`历史区间 ${this.data.span}　全国排名 ${this.data.rankSelf}/${this.data.rankTotal}`, W / 2, 414)
    // 迷你折线
    const years = Object.keys(p.history).map(Number).sort((a, b) => a - b)
    const vals = years.map(t => p.history[t])
    const minV = Math.min(...vals), maxV = Math.max(...vals)
    const px0 = 70, py0 = 450, pw = W - 140, ph = 200
    ctx.strokeStyle = '#8B7355'; ctx.lineWidth = 2; ctx.beginPath()
    vals.forEach((v, i) => {
      const x = px0 + (years.length === 1 ? pw / 2 : pw * i / (years.length - 1))
      const yy = py0 + ph * (1 - (v - minV) / (maxV - minV || 1))
      i === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy)
    })
    ctx.stroke()
    // 页脚
    ctx.fillStyle = '#FFFFFF'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('养老金计算平台 · 缴费指数小程序', W / 2, H - 60)
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = '16px sans-serif'
    ctx.fillText('微信搜索「平均缴费指数计算器」', W / 2, H - 30)
    done()
  },

  onPosterImage(e) {
    // 占位：如需预览海报可在此处理
  }
})
