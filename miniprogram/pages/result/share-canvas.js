// share-canvas.js
// 用原生 Canvas 2D API 绘制「结果分享图」，1:1 还原 result 页面视觉：
//  - 深色渐变金额卡 + 阴影 + 金色内描边
//  - 地区文字、养老金构成卡、参数卡（带渐隐分隔线）
//  - 免责声明、小程序码
// wxml-to-canvas 不支持渐变/阴影，故改用原生 canvas 以获得与屏幕一致的质感。

const PAGE_W = 375
const PAD = 16
const CARD_W = PAGE_W - PAD * 2
const GOLD = '#8B7355'
const GOLD_LIGHT = '#B8977D'
const BROWN = '#6C584B'
const CARD_BG = '#F4F0E8'
const PAGE_BG = '#F5F3F0'
const DIVIDER = '#E0D8CC'

// 圆角矩形路径（兼容部分基础库无 roundRect）
function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
    return
  }
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// 异步加载图片（小程序码），失败返回 null
function loadImage(canvas, src) {
  return new Promise(function (resolve) {
    if (!src) return resolve(null)
    let img
    try {
      img = canvas.createImage()
    } catch (e) {
      return resolve(null)
    }
    img.onload = function () { resolve(img) }
    img.onerror = function () { resolve(null) }
    img.src = src
  })
}

// 渐隐分隔线（模拟 result.wxss 的 linear-gradient divider）
function drawDivider(ctx, y) {
  const g = ctx.createLinearGradient(PAD + 18, 0, PAD + CARD_W - 18, 0)
  g.addColorStop(0, 'rgba(224,216,204,0)')
  g.addColorStop(0.15, DIVIDER)
  g.addColorStop(0.85, DIVIDER)
  g.addColorStop(1, 'rgba(224,216,204,0)')
  ctx.strokeStyle = g
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD + 18, y + 0.5)
  ctx.lineTo(PAD + CARD_W - 18, y + 0.5)
  ctx.stroke()
}

function draw(data, canvas, ctx, dpr, done) {
  loadImage(canvas, data.qrPath).then(function (qrImg) {
    try {
      _draw(data, canvas, ctx, dpr, qrImg)
    } catch (e) {
      console.error('[share-canvas] draw error:', e)
    }
    done()
  })
}

function _draw(data, canvas, ctx, dpr, qrImg) {
  // ---- 行数据 ----
  const items = []
  if (data.basePension != null) items.push(['基础养老金', '¥' + data.basePension])
  if (data.transitionPension != null && Number(data.transitionPension) > 0) items.push(['过渡性养老金', '¥' + data.transitionPension])
  if (data.personalPension != null) items.push(['个人账户养老金', '¥' + data.personalPension])
  if (data.extraPension != null && Number(data.extraPension) > 0) items.push(['其它加发', '¥' + data.extraPension])

  const params = []
  params.push(['累计缴费年限', (data.workYears || '--') + ' 年'])
  params.push(['实际缴费年限', (data.actualYears || '--') + ' 年'])
  if (data.sameYears != null && Number(data.sameYears) > 0) params.push(['视同缴费年限', data.sameYears + ' 年'])
  params.push(['平均缴费指数', String(data.averageIndex || '--')])
  params.push(['个人账户余额', (data.accountBalance || '--') + ' 元'])
  params.push(['计发月数', String(data.months || '--')])
  params.push(['退休地计发基数', (data.baseNumber || '--') + ' 元'])

  // ---- 尺寸（逻辑像素，375 宽）----
  const rowH = 28
  const cardPadY = 10
  const gap = 12

  const amountPadTop = 28, amountPadBottom = 22, labelH = 20, valueH = 56, tagH = 26, tagGap = 12
  const amountH = amountPadTop + labelH + valueH + (data.retireInfo ? tagGap + tagH : 0) + amountPadBottom
  const card1H = cardPadY * 2 + items.length * rowH
  const card2H = cardPadY * 2 + 2 + params.length * rowH // 两条分隔线
  const regionBlock = 4 + 20 + 14
  const disclaimerBlock = 4 + 20 + 14
  const qrBlock = data.qrPath ? (gap + 90) : 0

  const totalH = PAD + amountH + regionBlock + card1H + gap + card2H + gap + disclaimerBlock + qrBlock + PAD

  canvas.width = PAGE_W * dpr
  canvas.height = totalH * dpr
  ctx.scale(dpr, dpr)

  // 页面背景
  ctx.fillStyle = PAGE_BG
  ctx.fillRect(0, 0, PAGE_W, totalH)

  let y = PAD

  // ===== 金额卡片（渐变 + 阴影 + 金色内描边）=====
  ctx.save()
  ctx.shadowColor = 'rgba(40,41,43,0.25)'
  ctx.shadowBlur = 16
  ctx.shadowOffsetY = 4
  const grad = ctx.createLinearGradient(0, y, 0, y + amountH)
  grad.addColorStop(0, '#171717')
  grad.addColorStop(1, '#2A2A2A')
  ctx.fillStyle = grad
  roundRectPath(ctx, PAD, y, CARD_W, amountH, 16)
  ctx.fill()
  ctx.restore()

  ctx.strokeStyle = 'rgba(139,115,85,0.18)'
  ctx.lineWidth = 1
  roundRectPath(ctx, PAD + 0.5, y + 0.5, CARD_W - 1, amountH - 1, 16)
  ctx.stroke()

  let ay = y + amountPadTop
  ctx.fillStyle = 'rgba(139,115,85,0.9)'
  ctx.font = "400 14px 'PingFang SC', sans-serif"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('每月可领取养老金', PAGE_W / 2, ay + labelH / 2)
  ay += labelH

  const total = data.totalAmount != null ? data.totalAmount : '--'
  ctx.fillStyle = GOLD_LIGHT
  ctx.font = "700 48px 'PingFang SC', sans-serif"
  const symW = ctx.measureText('¥').width
  const numW = ctx.measureText(total).width
  const totalW = symW + 8 + numW
  const sx = PAGE_W / 2 - totalW / 2
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('¥', sx, ay + valueH / 2)
  ctx.fillText(total, sx + symW + 8, ay + valueH / 2)
  ay += valueH

  if (data.retireInfo) {
    ay += tagGap
    const tagW = 230, tagX = (PAGE_W - tagW) / 2
    ctx.fillStyle = 'rgba(139,115,85,0.12)'
    roundRectPath(ctx, tagX, ay, tagW, tagH, 12)
    ctx.fill()
    ctx.strokeStyle = 'rgba(139,115,85,0.18)'
    ctx.lineWidth = 1
    roundRectPath(ctx, tagX + 0.5, ay + 0.5, tagW - 1, tagH - 1, 12)
    ctx.stroke()
    ctx.fillStyle = 'rgba(139,115,85,0.95)'
    ctx.font = "500 13px 'PingFang SC', sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(data.retireInfo, PAGE_W / 2, ay + tagH / 2)
    ay += tagH
  }
  y += amountH

  // ===== 地区 =====
  y += 4
  ctx.fillStyle = BROWN
  ctx.font = "400 13px 'PingFang SC', sans-serif"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const region = (data.provinceName || '') + (data.cityLabel ? ' · ' + data.cityLabel : '')
  ctx.fillText(region, PAGE_W / 2, y + 10)
  y += 20 + 14

  // ===== 卡片绘制 =====
  function drawCard(cardY, rows, dividerAfterIndex) {
    const divN = dividerAfterIndex != null ? 2 : 0
    const h = cardPadY * 2 + divN + rows.length * rowH

    ctx.save()
    ctx.shadowColor = 'rgba(40,41,43,0.06)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 2
    ctx.fillStyle = CARD_BG
    roundRectPath(ctx, PAD, cardY, CARD_W, h, 16)
    ctx.fill()
    ctx.restore()

    ctx.strokeStyle = 'rgba(213,206,195,0.5)'
    ctx.lineWidth = 1
    roundRectPath(ctx, PAD + 0.5, cardY + 0.5, CARD_W - 1, h - 1, 16)
    ctx.stroke()

    if (dividerAfterIndex != null) {
      drawDivider(ctx, cardY + cardPadY)
      drawDivider(ctx, cardY + cardPadY + dividerAfterIndex * rowH)
    }

    let ry = cardY + cardPadY
    rows.forEach(function (row) {
      ctx.fillStyle = BROWN
      ctx.font = "400 14px 'PingFang SC', sans-serif"
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(row[0], PAD + 18, ry + rowH / 2)
      ctx.fillStyle = '#171717'
      ctx.font = "600 16px 'PingFang SC', sans-serif"
      ctx.textAlign = 'right'
      ctx.fillText(row[1], PAD + CARD_W - 18, ry + rowH / 2)
      ry += rowH
    })
    return h
  }

  y += drawCard(y, items, null)
  y += gap
  y += drawCard(y, params, 3)
  y += gap

  // ===== 免责 =====
  y += 4
  ctx.fillStyle = '#AAAAAA'
  ctx.font = "400 12px 'PingFang SC', sans-serif"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('本测算结果仅供参考，实际以社保部门核定为准', PAGE_W / 2, y + 10)
  y += 20 + 14

  // ===== 小程序码 =====
  if (data.qrPath && qrImg) {
    y += gap
    const qrSize = 60
    const qrX = (PAGE_W - qrSize) / 2
    const qrY = y
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
    ctx.fillStyle = GOLD
    ctx.font = "400 11px 'PingFang SC', sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('长按扫码，测算你的养老金', PAGE_W / 2, qrY + qrSize + 14)
  }
}

module.exports = { draw: draw }
