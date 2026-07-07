// report-canvas.js
// 用原生 Canvas 2D API 绘制「退休规划深度报告」长图，1:1 还原 report.wxml 视觉：
//  - Hero 金额卡（深色渐变 + 阴影 + 金色内描边）
//  - 模块1~6 + 免责声明 + 咨询二维码
// 与屏显视觉一致，替代原 wxml-to-canvas 方案（原生 Canvas 支持渐变/阴影，且无需隐藏节点渲染）。
// 设计参考 result/share-canvas.js 的安全写法：roundRect 传数组 [r] + try/catch 回退 + Number 防御。

const PAGE_W = 375
const PAD = 16
const CARD_W = PAGE_W - PAD * 2 // 343
const CONTENT_X = PAD + 16      // 32
const CONTENT_W = CARD_W - 32   // 311
const HEADER_H = 42
const BODY_TOP = 10
const BODY_BOT = 14
const GAP = 12

const GOLD = '#8B7355'
const GOLD_LIGHT = '#B8977D'
const BROWN = '#6C584B'
const PAGE_BG = '#F5F3F0'
const CARD_BG = '#FFFFFF'
const DIVIDER = '#F0EDE8'
const BLUE = '#3A5A7A'
const GREEN_TXT = '#4A8C5C'
const RED_TXT = '#D85A30'
const GRAY = '#888888'

// 圆角矩形路径（兼容部分基础库无 roundRect / 仅接受数组 radii 的绑定）
function roundRectPath(ctx, x, y, w, h, r) {
  w = Number(w) || 0
  h = Number(h) || 0
  r = Number(r) || 0
  r = Math.max(0, Math.min(r, w / 2, h / 2))
  if (r <= 0) {
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    return
  }
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath()
    try {
      // 多数标准/小程序绑定接受数组形式的 radii（length=1 即四角同半径）
      ctx.roundRect(x, y, w, h, [r])
    } catch (e) {
      // 个别绑定仅接受数字 radii，回退
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, r)
    }
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

// 异步加载图片（二维码），失败返回 null
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

// 文本按字符宽度换行（兼容中英文混排）
function wrapText(ctx, text, font, maxWidth) {
  ctx.font = font
  if (text == null || text === '') return ['']
  const chars = String(text).split('')
  let line = ''
  const lines = []
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i]
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = chars[i]
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

// 绘制（或仅测量）一段自动换行文本，返回占用高度
function drawWrapped(ctx, text, x, y, maxW, lineH, font, color, align, mode) {
  const lines = wrapText(ctx, text, font, maxW)
  if (mode === 'draw') {
    ctx.font = font
    ctx.fillStyle = color
    ctx.textAlign = align || 'left'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, y + lineH / 2 + i * lineH)
    }
  }
  return lines.length * lineH
}

// 单行文本（或仅测量）
function drawText(ctx, text, x, y, font, color, align, mode) {
  if (mode === 'draw') {
    ctx.font = font
    ctx.fillStyle = color
    ctx.textAlign = align || 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(text == null ? '' : String(text), x, y)
  }
}

// ===== 通用区块（带标题 + 白卡背景 + 阴影） =====
function section(ctx, yTop, num, title, bodyFn, mode, data) {
  const contentY = yTop + HEADER_H + BODY_TOP
  const bodyH = bodyFn(ctx, CONTENT_X, contentY, mode, data)
  const totalH = HEADER_H + BODY_TOP + bodyH + BODY_BOT
  if (mode === 'draw') {
    ctx.save()
    ctx.shadowColor = 'rgba(40,41,43,0.06)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 2
    ctx.fillStyle = CARD_BG
    roundRectPath(ctx, PAD, yTop, CARD_W, totalH, 12)
    ctx.fill()
    ctx.restore()
    ctx.strokeStyle = 'rgba(213,206,195,0.6)'
    ctx.lineWidth = 1
    roundRectPath(ctx, PAD + 0.5, yTop + 0.5, CARD_W - 1, totalH - 1, 12)
    ctx.stroke()
    // header
    ctx.fillStyle = GOLD
    roundRectPath(ctx, PAD + 14, yTop + 10, 22, 22, 11)
    ctx.fill()
    drawText(ctx, num, PAD + 25, yTop + 21, "700 11px 'PingFang SC', sans-serif", '#fff', 'center', 'draw')
    drawText(ctx, title, PAD + 14 + 22 + 8, yTop + 21, "700 15px 'PingFang SC', sans-serif", '#333', 'left', 'draw')
    bodyFn(ctx, CONTENT_X, contentY, 'draw', data)
  }
  return totalH
}

// ===================== 各模块绘制 =====================

// 模块1：个人退休画像（2列信息网格）
function bodyModule1(ctx, x, y, mode, data) {
  const items = [
    ['参保地', (data.province || '') + (data.city ? ' · ' + data.city : ''), false],
    ['人员类型', data.identity || '参保人员', false],
    ['法定退休年龄', data.legalAge || '', true],
    ['退休时间', data.legalDate || '', false],
    ['缴费年限', data.legalYears || '', false],
    ['缴费指数', data.avgIndex || '', false],
    ['个人账户余额', (data.balance || '') + ' 元', true],
    ['计发基数', (data.base || '') + ' 元', false]
  ]
  const cellW = 150, cellH = 46, gapX = 11, gapY = 6
  const rows = Math.ceil(items.length / 2)
  for (let i = 0; i < items.length; i++) {
    const col = i % 2
    const cx = x + col * (cellW + gapX)
    const cy = y + Math.floor(i / 2) * (cellH + gapY)
    if (mode === 'draw') {
      ctx.fillStyle = '#F8F6F4'
      roundRectPath(ctx, cx, cy, cellW, cellH, 8)
      ctx.fill()
      drawText(ctx, items[i][0], cx + cellW / 2, cy + 13, "400 11px 'PingFang SC', sans-serif", '#888', 'center', 'draw')
      drawText(ctx, String(items[i][1]), cx + cellW / 2, cy + 32, "600 14px 'PingFang SC', sans-serif", items[i][2] ? GOLD : '#333', 'center', 'draw')
    }
  }
  return rows * (cellH + gapY)
}

// 模块2：方案深度对比（对比卡 + 数据表）
function bodyModule2(ctx, x, y, mode, data) {
  let yy = y
  const cardW = 150, cardH = 86, cardGap = 11
  // 对比卡
  if (mode === 'draw') {
    // 正常退休
    ctx.fillStyle = '#F8F6F4'
    roundRectPath(ctx, x, yy, cardW, cardH, 10)
    ctx.fill()
    drawText(ctx, '正常退休', x + cardW / 2, yy + 18, "400 12px 'PingFang SC', sans-serif", '#666', 'center', 'draw')
    drawText(ctx, data.legalTotal || '', x + cardW / 2, yy + 44, "700 24px 'PingFang SC', sans-serif", '#333', 'center', 'draw')
    drawText(ctx, '/月 · ' + (data.legalAgeShow || '') + '起领', x + cardW / 2, yy + 70, "400 11px 'PingFang SC', sans-serif", '#999', 'center', 'draw')
  }
  if (data.hasEarly) {
    const ex = x + cardW + cardGap
    if (mode === 'draw') {
      ctx.fillStyle = '#F0F5EE'
      roundRectPath(ctx, ex, yy, cardW, cardH, 10)
      ctx.fill()
      drawText(ctx, '弹性提前退休', ex + cardW / 2, yy + 18, "400 12px 'PingFang SC', sans-serif", '#666', 'center', 'draw')
      drawText(ctx, data.flexTotal || '', ex + cardW / 2, yy + 44, "700 24px 'PingFang SC', sans-serif", GREEN_TXT, 'center', 'draw')
      drawText(ctx, '/月 · ' + (data.flexAgeShow || '') + '起领', ex + cardW / 2, yy + 70, "400 11px 'PingFang SC', sans-serif", '#999', 'center', 'draw')
    }
  }
  yy += cardH + 10

  // 数据表
  const colW = [130, 90, 91]
  const c0 = x
  const c1 = x + colW[0]
  const c2 = x + colW[0] + colW[1]
  const rowH = 26
  const headers = ['对比项', '正常退休', '弹性提前']
  const rowsData = [
    ['退休年龄', data.legalAgeShow, data.flexAgeShow],
    ['退休时间', data.legalDateShow, data.flexDateShow],
    ['缴费年限', data.legalYearsShow, data.flexYearsShow],
    ['计发月数', data.legalMonthsShow, data.flexMonthsShow],
    ['月养老金', data.legalTotal, data.flexTotal],
    ['年养老金', data.legalAnnual, data.flexAnnual]
  ]
  if (mode === 'draw') {
    // 表头
    ctx.fillStyle = '#FAF8F6'
    roundRectPath(ctx, x, yy, CONTENT_W, rowH, 4)
    ctx.fill()
    drawText(ctx, headers[0], c0 + 6, yy + rowH / 2, "600 12px 'PingFang SC', sans-serif", '#666', 'left', 'draw')
    drawText(ctx, headers[1], c1 + colW[1] / 2, yy + rowH / 2, "600 12px 'PingFang SC', sans-serif", '#666', 'center', 'draw')
    drawText(ctx, headers[2], c2 + colW[2] / 2, yy + rowH / 2, "600 12px 'PingFang SC', sans-serif", '#4A8C5C', 'center', 'draw')
  }
  yy += rowH
  for (let i = 0; i < rowsData.length; i++) {
    if (mode === 'draw' && i > 0) {
      ctx.strokeStyle = DIVIDER
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, yy + rowH / 2 + 0.5)
      ctx.lineTo(x + CONTENT_W, yy + rowH / 2 + 0.5)
      ctx.stroke()
    }
    if (mode === 'draw') {
      drawText(ctx, rowsData[i][0], c0 + 6, yy + rowH / 2, "400 12px 'PingFang SC', sans-serif", '#666', 'left', 'draw')
      drawText(ctx, String(rowsData[i][1] == null ? '--' : rowsData[i][1]), c1 + colW[1] / 2, yy + rowH / 2, "600 12px 'PingFang SC', sans-serif", '#333', 'center', 'draw')
      drawText(ctx, String(rowsData[i][2] == null ? '--' : rowsData[i][2]), c2 + colW[2] / 2, yy + rowH / 2, "600 12px 'PingFang SC', sans-serif", '#4A8C5C', 'center', 'draw')
    }
    yy += rowH
  }
  return yy - y
}

// 模块3：累计领取对比（4列表格）
function bodyModule3(ctx, x, y, mode, data) {
  let yy = y
  // 说明行
  const cap = '弹性提前退休（' + (data.flexAgeShow || '') + '起领） vs 正常退休（' + (data.legalAgeShow || '') + '起领）累计领取对比'
  yy += drawWrapped(ctx, cap, x, yy, CONTENT_W, 16, "400 11px 'PingFang SC', sans-serif", GOLD, 'left', mode)
  yy += 4

  const colW = [70, 80, 81, 80]
  const c0 = x, c1 = x + colW[0], c2 = x + colW[0] + colW[1], c3 = x + colW[0] + colW[1] + colW[2]
  const rowH = 26
  // 表头
  if (mode === 'draw') {
    ctx.fillStyle = '#FAF8F6'
    roundRectPath(ctx, x, yy, CONTENT_W, rowH, 4)
    ctx.fill()
    drawText(ctx, '领到年龄', c0 + 6, yy + rowH / 2, "600 12px 'PingFang SC', sans-serif", '#666', 'left', 'draw')
    drawText(ctx, '正常退休', c1 + colW[1] / 2, yy + rowH / 2, "600 12px 'PingFang SC', sans-serif", '#666', 'center', 'draw')
    drawText(ctx, '弹性提前', c2 + colW[2] / 2, yy + rowH / 2, "600 12px 'PingFang SC', sans-serif", '#4A8C5C', 'center', 'draw')
    drawText(ctx, '差额', c3 + colW[3] / 2, yy + rowH / 2, "600 12px 'PingFang SC', sans-serif", '#666', 'center', 'draw')
  }
  yy += rowH

  const items = data.cumulativeItems || []
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const isNormal = !!it.isNormalStart
    const isBE = !!it.isBreakEven
    if (mode === 'draw') {
      // 行背景
      if (isNormal) {
        ctx.fillStyle = '#EDEFF4'
        roundRectPath(ctx, x, yy, CONTENT_W, rowH, 2)
        ctx.fill()
        ctx.strokeStyle = GOLD
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(x + 1.5, yy + 2)
        ctx.lineTo(x + 1.5, yy + rowH - 2)
        ctx.stroke()
      } else if (isBE) {
        ctx.fillStyle = '#FFF8E8'
        roundRectPath(ctx, x, yy, CONTENT_W, rowH, 2)
        ctx.fill()
      }
      const ageLabel = it.age + '岁' + (isNormal ? '（正常起领）' : '')
      drawText(ctx, ageLabel, c0 + 6, yy + rowH / 2, "400 12px 'PingFang SC', sans-serif", '#666', 'left', 'draw')
      drawText(ctx, '¥' + it.legalTotal, c1 + colW[1] / 2, yy + rowH / 2, "400 12px 'PingFang SC', sans-serif", '#333', 'center', 'draw')
      drawText(ctx, '¥' + it.flexTotal, c2 + colW[2] / 2, yy + rowH / 2, "400 12px 'PingFang SC', sans-serif", '#4A8C5C', 'center', 'draw')
      let diffColor = RED_TXT
      if (isBE) diffColor = GOLD
      else if (it.diff && it.diff.indexOf('+') === 0) diffColor = GREEN_TXT
      drawText(ctx, it.diff || '', c3 + colW[3] / 2, yy + rowH / 2, "400 12px 'PingFang SC', sans-serif", diffColor, 'center', 'draw')
    }
    yy += rowH
  }

  if (data.breakEvenAge && data.breakEvenAge > 0) {
    yy += 8
    if (mode === 'draw') {
      ctx.fillStyle = '#FFF8E8'
      roundRectPath(ctx, x, yy, CONTENT_W, 36, 6)
      ctx.fill()
      drawText(ctx, '盈亏平衡点：约 ' + data.breakEvenAge + '岁 后正常退休累计领取反超', x + CONTENT_W / 2, yy + 18, "400 12px 'PingFang SC', sans-serif", GOLD, 'center', 'draw')
    }
    yy += 36
  }
  return yy - y
}

// 模块4：退休策略建议
function bodyModule4(ctx, x, y, mode, data) {
  let yy = y
  const isWorker = data.adviceType !== 'flexible'

  // 建议卡
  const cardBg = isWorker ? '#F0F4F8' : '#F0F5EE'
  const titleColor = isWorker ? BLUE : GREEN_TXT
  let adviceText
  if (isWorker) {
    adviceText = '正常退休月养老金 ' + (data.legalTotal || '') + '，弹性提前 ' + (data.flexTotal || '') + '，每月差额约¥' + (data.diffMonthly || '0') + '元。'
  } else {
    adviceText = '全部保费自费（费率20%），提前退休：少缴保费约¥' + (data.savePremium || '0') + '元 + 早领养老金约¥' + (data.earlyPension || '0') + '元，合计约¥' + (data.totalEarlyBenefit || '0') + '元。'
  }
  const cardH = 18 + drawWrapped(ctx, adviceText, x, y + 10 + 18, CONTENT_W, 18, "400 12px 'PingFang SC', sans-serif", titleColor, 'left', mode) + 10
  if (mode === 'draw') {
    ctx.fillStyle = cardBg
    roundRectPath(ctx, x, yy, CONTENT_W, cardH, 10)
    ctx.fill()
    drawText(ctx, isWorker ? '企业职工退休分析' : '灵活就业退休分析', x + 12, yy + 10 + 9, "700 13px 'PingFang SC', sans-serif", '#333', 'left', 'draw')
    drawWrapped(ctx, adviceText, x + 12, yy + 10 + 18, CONTENT_W - 24, 18, "400 12px 'PingFang SC', sans-serif", titleColor, 'left', 'draw')
  }
  yy += cardH + 8

  // 关键差异分析
  const featItems = []
  if (isWorker) {
    featItems.push(['工资收入', '正常退休多领约¥' + (data.salary3year || '0') + '元工资，弹性提前退休后无工资收入'])
    featItems.push(['住房公积金', '正常退休继续缴存，单位和个人合计约¥' + (data.fund3year || '0') + '；弹性提前退休停缴'])
    featItems.push(['医疗保险', (data.medicareLabel || '') + '职工医保缴费年限要求约' + (data.medicareRequirement || 25) + '年（' + (data.medicareYears || 0) + '年已' + ((data.medicareYears || 0) >= (data.medicareRequirement || 25) ? '满足' : '不足') + '），弹性提前退休后直接享受退休医保待遇，无需补缴'])
    if (data.breakEvenAge > 0) featItems.push(['盈亏平衡', '约' + data.breakEvenAge + '岁前弹性提前累计领取更高，此后正常退休反超'])
  } else {
    featItems.push(['保费节省', '弹性提前退休约省下¥' + (data.savePremium || '0') + '元保费（全自费20%）'])
    featItems.push(['早领养老金', '提前领取约' + (data.earlyMonths || 0) + '个月，多领约¥' + (data.earlyPension || '0') + '元'])
    featItems.push(['回本分析', '合计好处约¥' + (data.totalEarlyBenefit || '0') + '元，正常退休每月多领¥' + (data.diffMonthly || '0') + '元，需约' + (data.paybackYears || 0) + '年追平'])
    if (data.medicareYears > 0) featItems.push(['医疗保险', (data.medicareLabel || '') + '职工医保缴费年限要求约' + (data.medicareRequirement || 25) + '年（' + (data.medicareYears || 0) + '年），弹性提前退休后可直接享受退休医保待遇'])
  }
  const featBlockH = 18 + 8 + featItems.length * 50
  if (mode === 'draw') {
    ctx.fillStyle = '#F8F6F4'
    roundRectPath(ctx, x, yy, CONTENT_W, featBlockH, 8)
    ctx.fill()
    drawText(ctx, '关键差异分析', x + 10, yy + 10 + 9, "700 13px 'PingFang SC', sans-serif", '#333', 'left', 'draw')
    let fy = yy + 10 + 18 + 8
    for (let i = 0; i < featItems.length; i++) {
      drawText(ctx, featItems[i][0], x + 10, fy + 8, "700 12px 'PingFang SC', sans-serif", '#333', 'left', 'draw')
      drawWrapped(ctx, featItems[i][1], x + 10, fy + 16, CONTENT_W - 20, 14, "400 11px 'PingFang SC', sans-serif", '#888', 'left', 'draw')
      fy += 50
    }
  }
  yy += featBlockH + 8

  // 建议条
  const suggestText = isWorker
    ? '建议：正常退休经济上明显更优（工资+公积金远超养老金差额），建议优先选正常退休。若身体有慢性病、家庭需要照顾或工作强度大，可考虑弹性提前。'
    : '建议：灵活就业全部自费，弹性提前退休省下的保费+早领的养老金合计明显。若想早点休息或保费压力大，弹性提前更划算。若缴费基数低且身体好，可考虑正常退休。'
  const suggestBg = isWorker ? '#E6F1FB' : '#E1F5EE'
  const suggestColor = isWorker ? '#0C447C' : '#0F6E56'
  const suggestH = 6 + drawWrapped(ctx, suggestText, x, yy + 6, CONTENT_W - 20, 18, "400 11px 'PingFang SC', sans-serif", suggestColor, 'left', mode) + 6
  if (mode === 'draw') {
    ctx.fillStyle = suggestBg
    roundRectPath(ctx, x, yy, CONTENT_W, suggestH, 8)
    ctx.fill()
    drawWrapped(ctx, suggestText, x + 10, yy + 6, CONTENT_W - 20, 18, "400 11px 'PingFang SC', sans-serif", suggestColor, 'left', 'draw')
  }
  yy += suggestH + 8

  // 替代率分析
  const rateBlockH = 10 + 24 * 3 + 4 + 44 + 10
  if (mode === 'draw') {
    ctx.fillStyle = '#F8F6F4'
    roundRectPath(ctx, x, yy, CONTENT_W, rateBlockH, 8)
    ctx.fill()
    drawText(ctx, '养老金替代率分析', x + 10, yy + 10 + 9, "700 13px 'PingFang SC', sans-serif", '#333', 'left', 'draw')
    let ry = yy + 10 + 18 + 4
    drawText(ctx, '月养老金', x + 10, ry + 8, "400 12px 'PingFang SC', sans-serif", '#888', 'left', 'draw')
    drawText(ctx, data.legalTotal || '', x + CONTENT_W - 10, ry + 8, "700 12px 'PingFang SC', sans-serif", '#333', 'right', 'draw')
    ry += 24
    drawText(ctx, '退休前月工资（按缴费基数×指数推算）', x + 10, ry + 8, "400 12px 'PingFang SC', sans-serif", '#888', 'left', 'draw')
    drawText(ctx, '约¥' + (data.estPreRetireSalary || ''), x + CONTENT_W - 10, ry + 8, "700 12px 'PingFang SC', sans-serif", '#333', 'right', 'draw')
    ry += 24
    ctx.strokeStyle = DIVIDER
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 10, ry + 2)
    ctx.lineTo(x + CONTENT_W - 10, ry + 2)
    ctx.stroke()
    drawText(ctx, '替代率', x + 10, ry + 8, "700 12px 'PingFang SC', sans-serif", '#888', 'left', 'draw')
    drawText(ctx, (data.replaceRate || '') + '%', x + CONTENT_W - 10, ry + 8, "700 12px 'PingFang SC', sans-serif", GOLD, 'right', 'draw')
    ry += 24 + 4
    drawWrapped(ctx, '替代率 = 月养老金÷退休前工资。' + (data.replaceRateDesc || ''), x + 10, ry, CONTENT_W - 20, 14, "400 11px 'PingFang SC', sans-serif", '#888', 'left', 'draw')
  }
  yy += rateBlockH

  return yy - y
}

// 模块5：缴费优化建议
function bodyModule5(ctx, x, y, mode, data) {
  let yy = y
  const isWorker = data.adviceType !== 'flexible'

  if (isWorker) {
    const txt = '企业职工社保由单位依法缴纳，缴费基数按本人实际工资确定。建议确认单位是否按照实际工资足额申报，避免低基数缴费影响未来待遇。'
    const h = 8 + drawWrapped(ctx, txt, x, yy + 8, CONTENT_W - 24, 16, "400 12px 'PingFang SC', sans-serif", BLUE, 'left', mode) + 8
    if (mode === 'draw') {
      ctx.fillStyle = '#F0F4F8'
      roundRectPath(ctx, x, yy, CONTENT_W, h, 10)
      ctx.fill()
      drawWrapped(ctx, txt, x + 12, yy + 8, CONTENT_W - 24, 16, "400 12px 'PingFang SC', sans-serif", BLUE, 'left', 'draw')
    }
    yy += h + 6
  } else {
    const tip = '灵活就业可自主选择缴费档次，不同指数对养老金的影响如下（基于当前缴费年限估算）：'
    yy += drawWrapped(ctx, tip, x, yy, CONTENT_W, 12, "400 11px 'PingFang SC', sans-serif", '#999', 'left', mode)
    yy += 6
    // 指数表
    const colW = [120, 95, 96]
    const c0 = x, c1 = x + colW[0], c2 = x + colW[0] + colW[1]
    const rowH = 26
    if (mode === 'draw') {
      ctx.fillStyle = '#FAF8F6'
      roundRectPath(ctx, x, yy, CONTENT_W, rowH, 4)
      ctx.fill()
      drawText(ctx, '缴费指数', c0 + 6, yy + rowH / 2, "600 12px 'PingFang SC', sans-serif", '#666', 'left', 'draw')
      drawText(ctx, '月养老金', c1 + colW[1] / 2, yy + rowH / 2, "600 12px 'PingFang SC', sans-serif", '#666', 'center', 'draw')
      drawText(ctx, '月增加', c2 + colW[2] / 2, yy + rowH / 2, "600 12px 'PingFang SC', sans-serif", '#666', 'center', 'draw')
    }
    yy += rowH
    const opts = data.indexOpts || []
    for (let i = 0; i < opts.length; i++) {
      const o = opts[i]
      if (mode === 'draw') {
        if (o.isCurrent) {
          ctx.fillStyle = '#F0F5EE'
          roundRectPath(ctx, x, yy, CONTENT_W, rowH, 2)
          ctx.fill()
        } else if (i > 0) {
          ctx.strokeStyle = DIVIDER
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(x, yy + rowH / 2 + 0.5)
          ctx.lineTo(x + CONTENT_W, yy + rowH / 2 + 0.5)
          ctx.stroke()
        }
        drawText(ctx, o.label, c0 + 6, yy + rowH / 2, "400 12px 'PingFang SC', sans-serif", '#333', 'left', 'draw')
        drawText(ctx, o.pension, c1 + colW[1] / 2, yy + rowH / 2, "600 12px 'PingFang SC', sans-serif", '#333', 'center', 'draw')
        const incColor = (o.inc === '--') ? '#888' : GREEN_TXT
        drawText(ctx, o.inc, c2 + colW[2] / 2, yy + rowH / 2, "400 12px 'PingFang SC', sans-serif", incColor, 'center', 'draw')
      }
      yy += rowH
    }
    yy += 4
    const note = '注：以上为基础养老金变化估算，实际总养老金差异更大（含个人账户部分）。'
    yy += drawWrapped(ctx, note, x, yy, CONTENT_W, 12, "400 11px 'PingFang SC', sans-serif", '#999', 'left', mode)
    yy += 6
  }

  // 咨询引导卡
  const consultTexts = [
    '如果您存在以下情况：',
    '· 社保有断档、多地缴纳未合并',
    '· 曾经企业缴、后来灵活就业，不清楚怎么衔接',
    '· 想了解补缴政策或提前退休规划',
    '· 想测算不同缴费方案对养老金的影响'
  ]
  let blockH = 10
  blockH += 18 // 标题
  blockH += consultTexts.length * 16
  const qrSize = 130
  const qrH = data.qrPath ? (6 + qrSize * (165 / 130) + 6 + 18) : 0
  blockH += qrH + 10
  if (mode === 'draw') {
    ctx.fillStyle = '#FFF8E8'
    ctx.strokeStyle = '#F0E0C0'
    ctx.lineWidth = 1
    roundRectPath(ctx, x, yy, CONTENT_W, blockH, 8)
    ctx.fill()
    ctx.stroke()
    drawText(ctx, consultTexts[0], x + 12, yy + 10 + 9, "700 12px 'PingFang SC', sans-serif", GOLD, 'left', 'draw')
    let cy2 = yy + 10 + 18 + 8
    for (let i = 1; i < consultTexts.length; i++) {
      drawText(ctx, consultTexts[i], x + 12, cy2 + 8, "400 11px 'PingFang SC', sans-serif", '#A08860', 'left', 'draw')
      cy2 += 16
    }
    if (data._qrImg) {
      const qx = x + (CONTENT_W - qrSize) / 2
      const qy = cy2 + 6
      try {
        ctx.drawImage(data._qrImg, qx, qy, qrSize, qrSize * (165 / 130))
      } catch (e) {}
      drawText(ctx, '长按识别二维码，添加客服微信咨询', x + CONTENT_W / 2, qy + qrSize * (165 / 130) + 6 + 9, "700 12px 'PingFang SC', sans-serif", GOLD, 'center', 'draw')
    }
  }
  yy += blockH

  return yy - y
}

// 模块6：养老金计算明细
function bodyModule6(ctx, x, y, mode, data) {
  let yy = y
  const rowH = 28
  const rows = []
  rows.push(['基础养老金', data.basicPension, data.basicDesc, false])
  rows.push(['个人账户养老金', data.personalPension, data.personalDesc, false])
  if (data.extraPension) rows.push(['增发养老金（' + (data.province || '') + '）', data.extraPension, '', true])

  for (let i = 0; i < rows.length; i++) {
    if (mode === 'draw') {
      drawText(ctx, rows[i][0], x + 4, yy + rowH / 2, "400 13px 'PingFang SC', sans-serif", '#333', 'left', 'draw')
      drawText(ctx, rows[i][1] || '', x + CONTENT_W - 4, yy + rowH / 2, "700 13px 'PingFang SC', sans-serif", '#333', 'right', 'draw')
    }
    yy += rowH
    if (mode === 'draw' && rows[i][2]) {
      yy += drawWrapped(ctx, rows[i][2], x + 4, yy, CONTENT_W, 14, "400 11px 'PingFang SC', sans-serif", '#999', 'left', 'draw')
    }
    if (rows[i][3] && data.extraDetails && data.extraDetails.length) {
      for (let j = 0; j < data.extraDetails.length; j++) {
        if (mode === 'draw') {
          ctx.fillStyle = '#F8F6F4'
          roundRectPath(ctx, x + 4, yy, CONTENT_W - 8, 18, 6)
          ctx.fill()
          drawText(ctx, data.extraDetails[j].label + ' → ' + data.extraDetails[j].amount, x + 12, yy + 9, "400 11px 'PingFang SC', sans-serif", '#888', 'left', 'draw')
        }
        yy += 18 + 2
      }
    }
  }
  // 合计
  yy += 4
  if (mode === 'draw') {
    ctx.strokeStyle = '#E8E4DE'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 4, yy + 4)
    ctx.lineTo(x + CONTENT_W - 4, yy + 4)
    ctx.stroke()
  }
  yy += 8
  if (mode === 'draw') {
    drawText(ctx, '月养老金合计', x + 4, yy + 12, "700 14px 'PingFang SC', sans-serif", '#333', 'left', 'draw')
    drawText(ctx, (data.totalPension || '') + '/月', x + CONTENT_W - 4, yy + 12, "700 16px 'PingFang SC', sans-serif", GOLD, 'right', 'draw')
  }
  yy += 24
  return yy - y
}

// 免责（独立卡，非带标题 section）
function drawDisclaimer(ctx, yTop, data, mode) {
  const text = '本报告依据国务院渐进式延迟退休政策（国办发〔2025〕5号）及' + (data.province || '') + '现行计发办法计算。个人账户余额为复利估算值，实际以社保系统查询为准。最终待遇以退休时社保部门核定结果为准。'
  const h = 8 + drawWrapped(ctx, text, 0, yTop + 8, CARD_W - 24, 14, "400 11px 'PingFang SC', sans-serif", '#999', 'left', mode) + 8
  if (mode === 'draw') {
    ctx.fillStyle = '#F8F6F4'
    roundRectPath(ctx, PAD, yTop, CARD_W, h, 8)
    ctx.fill()
    drawWrapped(ctx, text, PAD + 12, yTop + 8, CARD_W - 24, 14, "400 11px 'PingFang SC', sans-serif", '#999', 'left', 'draw')
  }
  return h
}

// Hero 金额卡
function drawHero(ctx, yTop, data, mode) {
  const amountH = 28 + 20 + 56 + 26 + 22 // padTop + label + value + tags + padBottom
  if (mode === 'draw') {
    ctx.save()
    ctx.shadowColor = 'rgba(40,41,43,0.25)'
    ctx.shadowBlur = 16
    ctx.shadowOffsetY = 4
    const grad = ctx.createLinearGradient(0, yTop, 0, yTop + amountH)
    grad.addColorStop(0, '#171717')
    grad.addColorStop(1, '#2A2A2A')
    ctx.fillStyle = grad
    roundRectPath(ctx, PAD, yTop, CARD_W, amountH, 16)
    ctx.fill()
    ctx.restore()
    ctx.strokeStyle = 'rgba(139,115,85,0.18)'
    ctx.lineWidth = 1
    roundRectPath(ctx, PAD + 0.5, yTop + 0.5, CARD_W - 1, amountH - 1, 16)
    ctx.stroke()

    let ay = yTop + 28
    drawText(ctx, '每月可领取养老金', PAGE_W / 2, ay + 10, "400 14px 'PingFang SC', sans-serif", 'rgba(139,115,85,0.9)', 'center', 'draw')
    ay += 20 + 28
    const total = data.legalTotalStr || (data.legalTotal || '--')
    ctx.font = "700 48px 'PingFang SC', sans-serif"
    const symW = ctx.measureText('¥').width
    const numW = ctx.measureText(total).width
    const totalW = symW + 8 + numW
    const sx = PAGE_W / 2 - totalW / 2
    ctx.fillStyle = GOLD_LIGHT
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('¥', sx, ay + 28)
    ctx.fillText(total, sx + symW + 8, ay + 28)
    ay += 28 + 13
    const tag1 = (data.identity || '') + ' · ' + (data.province || '') + (data.city ? ' · ' + data.city : '')
    const tag2 = (data.legalAgeShow || '') + '起领 · ' + (data.legalYearsShow || '')
    drawText(ctx, tag1, PAGE_W / 2, ay, "400 13px 'PingFang SC', sans-serif", 'rgba(255,255,255,0.85)', 'center', 'draw')
    ay += 13 + 13
    drawText(ctx, tag2, PAGE_W / 2, ay, "400 13px 'PingFang SC', sans-serif", 'rgba(255,255,255,0.85)', 'center', 'draw')
  }
  return amountH
}

function _draw(data, canvas, ctx, dpr, qrImg) {
  const d = data
  d._qrImg = qrImg

  // 先以 measure 模式计算总高度
  let measureY = PAD
  measureY += drawHero(ctx, measureY, d, 'measure')
  measureY += 6
  measureY += section(ctx, measureY, '1', '个人退休画像', bodyModule1, 'measure', d)
  measureY += GAP
  measureY += section(ctx, measureY, '2', '方案深度对比', bodyModule2, 'measure', d)
  measureY += GAP
  if (d.hasEarly && d.cumulativeItems && d.cumulativeItems.length > 0) {
    measureY += section(ctx, measureY, '3', '累计领取对比', bodyModule3, 'measure', d)
    measureY += GAP
  }
  measureY += section(ctx, measureY, '4', '退休策略建议', bodyModule4, 'measure', d)
  measureY += GAP
  measureY += section(ctx, measureY, '5', '缴费优化建议', bodyModule5, 'measure', d)
  measureY += GAP
  measureY += section(ctx, measureY, '6', '养老金计算明细', bodyModule6, 'measure', d)
  measureY += GAP
  measureY += drawDisclaimer(ctx, measureY, d, 'measure')
  measureY += PAD

  const totalH = measureY

  canvas.width = PAGE_W * dpr
  canvas.height = totalH * dpr
  ctx.scale(dpr, dpr)

  // 背景
  ctx.fillStyle = PAGE_BG
  ctx.fillRect(0, 0, PAGE_W, totalH)

  let y = PAD
  y += drawHero(ctx, y, d, 'draw')
  y += 6
  y += section(ctx, y, '1', '个人退休画像', bodyModule1, 'draw', d)
  y += GAP
  y += section(ctx, y, '2', '方案深度对比', bodyModule2, 'draw', d)
  y += GAP
  if (d.hasEarly && d.cumulativeItems && d.cumulativeItems.length > 0) {
    y += section(ctx, y, '3', '累计领取对比', bodyModule3, 'draw', d)
    y += GAP
  }
  y += section(ctx, y, '4', '退休策略建议', bodyModule4, 'draw', d)
  y += GAP
  y += section(ctx, y, '5', '缴费优化建议', bodyModule5, 'draw', d)
  y += GAP
  y += section(ctx, y, '6', '养老金计算明细', bodyModule6, 'draw', d)
  y += GAP
  y += drawDisclaimer(ctx, y, d, 'draw')
}

function draw(data, canvas, ctx, dpr, done) {
  loadImage(canvas, data.qrPath).then(function (qrImg) {
    try {
      _draw(data, canvas, ctx, dpr, qrImg)
    } catch (e) {
      console.error('[report-canvas] draw error:', e)
    }
    done()
  })
}

module.exports = { draw: draw }
