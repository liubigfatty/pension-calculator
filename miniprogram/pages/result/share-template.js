// share-template.js — wxml-to-canvas 模板
// 参照 result.wxss，rpx→px（375px屏宽, 1rpx=0.5px）

var CARD_W = 343   // 375 - 16*2
var ROW_H = 28
var CARD_PAD = 10

// ===== 基础样式（不含动态高度） =====
var baseStyle = {
  page: {
    width: 375, height: 700,
    flexDirection: 'column',
    backgroundColor: '#F5F3F0',
    paddingLeft: 16, paddingRight: 16,
  },

  // ── 金额卡片 ──
  amountCard: {
    width: CARD_W, marginTop: 16,
    borderRadius: 16,
    flexDirection: 'column', alignItems: 'center',
    paddingTop: 28, paddingBottom: 22,
    backgroundColor: '#171717',
  },
  amountLabel: {
    width: CARD_W - 40, height: 20,
    fontSize: 14, color: 'rgba(139,115,85,0.9)',
    textAlign: 'center', marginBottom: 4,
  },
  amountValue: {
    width: CARD_W - 40, height: 56,
    fontSize: 48, color: '#B8977D', textAlign: 'center',
    verticalAlign: 'middle', lineHeight: 56,
    marginTop: 12, marginBottom: 8,
  },
  retireTag: {
    width: 230, height: 26,
    borderRadius: 12,
    backgroundColor: 'rgba(139,115,85,0.12)',
    paddingLeft: 16, paddingRight: 16,
    marginTop: 6,
    justifyContent: 'center', alignItems: 'center',
  },
  retireText: {
    width: 230, height: 20,
    fontSize: 13, color: 'rgba(139,115,85,0.95)', textAlign: 'center',
  },

  // ── 地区 ──
  regionText: {
    width: CARD_W, height: 20,
    fontSize: 13, color: '#6C584B', textAlign: 'center',
    marginTop: 4, marginBottom: 14,
  },

  // ── 通用卡片 ──
  card: {
    width: CARD_W, borderRadius: 16,
    backgroundColor: '#F4F0E8',
    flexDirection: 'column',
    marginBottom: 12,
    paddingTop: CARD_PAD, paddingBottom: CARD_PAD,
    paddingLeft: 18, paddingRight: 18,
  },
  cardRow: {
    width: CARD_W - 36, height: ROW_H,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  cardLabel: {
    width: 150, height: ROW_H,
    fontSize: 14, color: '#6C584B',
  },
  cardValue: {
    width: 150, height: ROW_H,
    fontSize: 16, color: '#171717',
    textAlign: 'right',
  },
  cardDivider: {
    width: CARD_W - 36, height: 1,
    backgroundColor: '#E0D8CC',
    marginBottom: 0,
  },

  // ── 免责 ──
  disclaimer: {
    width: CARD_W, height: 20,
    fontSize: 12, color: '#AAAAAA', textAlign: 'center',
    marginTop: 4, marginBottom: 14,
  },

  // ── 小程序码 ──
  qrArea: {
    width: CARD_W, height: 90,
    flexDirection: 'column', alignItems: 'center',
  },
  qrImage: {
    width: 60, height: 60,
  },
  qrText: {
    width: CARD_W, height: 20,
    fontSize: 11, color: '#8B7355', textAlign: 'center',
    marginTop: 10,
  },
}

// ===== 构建完整的 style + wxml =====
function build(data) {
  var style = JSON.parse(JSON.stringify(baseStyle))

  // 动态计算高度
  var itemCount = 2
  if (data.transitionPension != null && Number(data.transitionPension) > 0) itemCount++
  if (data.extraPension != null && Number(data.extraPension) > 0) itemCount++
  style.card1 = JSON.parse(JSON.stringify(style.card))
  style.card1.height = itemCount * ROW_H + CARD_PAD * 2

  var paramCount = 6
  if (data.sameYears != null && Number(data.sameYears) > 0) paramCount++
  style.card2 = JSON.parse(JSON.stringify(style.card))
  style.card2.height = paramCount * ROW_H + CARD_PAD * 2

  var acH = 28 + 20 + 4 + 12 + 56 + 8 + (data.retireInfo ? 6 + 26 : 0) + 22
  style.amountCard.height = acH

  // 构建 WXML
  var region = (data.provinceName || '') + (data.cityLabel ? ' · ' + data.cityLabel : '')
  var total = data.totalAmount != null ? data.totalAmount : '--'

  var tag = ''
  if (data.retireInfo) {
    tag = '<view class="retireTag"><text class="retireText">' + data.retireInfo + '</text></view>'
  }

  var items = ''
  function addRow(lbl, val) {
    items += '<view class="cardRow"><text class="cardLabel">' + lbl + '</text><text class="cardValue">' + val + '</text></view>'
  }
  if (data.basePension != null) addRow('基础养老金', '¥' + data.basePension)
  if (data.transitionPension != null && Number(data.transitionPension) > 0) addRow('过渡性养老金', '¥' + data.transitionPension)
  if (data.personalPension != null) addRow('个人账户养老金', '¥' + data.personalPension)
  if (data.extraPension != null && Number(data.extraPension) > 0) addRow('其它加发', '¥' + data.extraPension)

  var params = '<view class="cardDivider"></view>'
  function addParam(lbl, val) {
    params += '<view class="cardRow"><text class="cardLabel">' + lbl + '</text><text class="cardValue">' + val + '</text></view>'
  }
  addParam('累计缴费年限', (data.workYears || '--') + ' 年')
  addParam('实际缴费年限', (data.actualYears || '--') + ' 年')
  if (data.sameYears != null && Number(data.sameYears) > 0) addParam('视同缴费年限', data.sameYears + ' 年')
  params += '<view class="cardDivider"></view>'
  addParam('平均缴费指数', String(data.averageIndex || '--'))
  addParam('个人账户余额', (data.accountBalance || '--') + ' 元')
  addParam('计发月数', String(data.months || '--'))
  addParam('退休地计发基数', (data.baseNumber || '--') + ' 元')

  var qr = ''
  if (data.qrPath) {
    qr = '<view class="qrArea"><image class="qrImage" src="' + data.qrPath + '"></image><text class="qrText">长按扫码，测算你的养老金</text></view>'
  }

  var wxml = '<view class="page">' +
    '<view class="amountCard">' +
      '<text class="amountLabel">每月可领取养老金</text>' +
      '<text class="amountValue">¥' + total + '</text>' +
      tag +
    '</view>' +
    '<text class="regionText">' + region + '</text>' +
    '<view class="card1">' + items + '</view>' +
    '<view class="card2">' + params + '</view>' +
    '<text class="disclaimer">本测算结果仅供参考，实际以社保部门核定为准</text>' +
    qr +
  '</view>'

  return { wxml: wxml, style: style }
}

module.exports = { build: build }
