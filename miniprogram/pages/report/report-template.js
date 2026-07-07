// report-template.js — 对照 report.wxml + report.wxss 一比一还原
// wxml-to-canvas 模板：所有元素必须有 width/height，CSS属性使用驼峰格式

var W = 375
var CW = 343  // 375 - 16*2
var IBW = 311 // CW - 16*2 (section body inner width)

var style = {
  // === 页面 ===
  page: {
    width: W, height: 2700,
    flexDirection: 'column',
    backgroundColor: '#F5F3F0',
    paddingLeft: 16, paddingRight: 16, paddingTop: 16, paddingBottom: 20
  },

  // === 主标题 ===
  titleBox: {
    width: CW, height: 44,
    flexDirection: 'column', alignItems: 'center',
    marginBottom: 14
  },
  titleMain: {
    width: CW, height: 22,
    fontSize: 18, color: '#333', textAlign: 'center', fontWeight: 'bold',
    lineHeight: 22
  },
  titleSub: {
    width: CW, height: 18,
    fontSize: 12, color: '#8B7355', textAlign: 'center',
    marginTop: 4
  },

  // === Section 通用 ===
  section: {
    width: CW, borderRadius: 12, backgroundColor: '#fff',
    flexDirection: 'column', marginBottom: 12
  },
  // section-header: flex row, 没有折叠箭头（保存图不需要）
  sectionHeader: {
    width: CW, height: 42,
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderColor: '#F0EDE8',
    paddingLeft: 14, paddingRight: 14
  },
  sectionNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#8B7355',
    fontSize: 11, color: '#fff', textAlign: 'center',
    lineHeight: 22
  },
  sectionTitle: {
    width: 285, height: 22,
    fontSize: 15, color: '#333',
    fontWeight: 'bold',
    marginLeft: 8
  },
  sectionBody: {
    width: CW, flexDirection: 'column',
    paddingTop: 10, paddingBottom: 14, paddingLeft: 16, paddingRight: 16
  },

  // === 模块1: 信息网格 (2列 × 4行) ===
  infoGrid: {
    width: IBW, height: 202,
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    alignContent: 'flex-start'
  },
  infoItem: {
    width: 150, height: 46,
    backgroundColor: '#F8F6F4', borderRadius: 8,
    flexDirection: 'column', alignItems: 'center',
    paddingTop: 5, paddingBottom: 5,
    marginBottom: 6
  },
  infoLabel: {
    width: 130, height: 16,
    fontSize: 11, color: '#888', textAlign: 'center',
    lineHeight: 16
  },
  infoValue: {
    width: 130, height: 20,
    fontSize: 14, color: '#333', textAlign: 'center',
    lineHeight: 20
  },
  infoValueHL: {
    width: 130, height: 20,
    fontSize: 14, color: '#8B7355', textAlign: 'center',
    lineHeight: 20
  },

  // === 模块2: 对比卡片 ===
  compareCards: {
    width: IBW, height: 86,
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 10
  },
  compareCard: {
    width: 150, height: 86,
    borderRadius: 10, flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center'
  },
  compareCardNorm: {
    width: 150, height: 86,
    borderRadius: 10, backgroundColor: '#F8F6F4',
    flexDirection: 'column', alignItems: 'center',
    paddingTop: 10, paddingBottom: 10
  },
  compareCardEarly: {
    width: 150, height: 86,
    borderRadius: 10, backgroundColor: '#F0F5EE',
    flexDirection: 'column', alignItems: 'center',
    paddingTop: 10, paddingBottom: 10
  },
  compareLabel: {
    width: 130, height: 18,
    fontSize: 12, color: '#666', textAlign: 'center'
  },
  compareAmount: {
    width: 130, height: 32,
    fontSize: 24, color: '#333', textAlign: 'center',
    lineHeight: 32
  },
  compareAmountEarly: {
    width: 130, height: 32,
    fontSize: 24, color: '#4A8C5C', textAlign: 'center',
    lineHeight: 32
  },
  compareDesc: {
    width: 130, height: 16,
    fontSize: 11, color: '#999', textAlign: 'center'
  },

  // === 数据表 (3列) ===
  tableHeader: {
    width: IBW, height: 26,
    flexDirection: 'row', backgroundColor: '#F8F6F4',
    borderBottomWidth: 1, borderColor: '#F0EDE8'
  },
  tableRow: {
    width: IBW, height: 26,
    flexDirection: 'row',
    borderBottomWidth: 1, borderColor: '#F0EDE8'
  },
  tableRowGold: {
    width: IBW, height: 26,
    flexDirection: 'row', backgroundColor: '#FFF8E8',
    borderBottomWidth: 1, borderColor: '#F0EDE8'
  },
  tableRowGreen: {
    width: IBW, height: 26,
    flexDirection: 'row', backgroundColor: '#F0F5EE',
    borderBottomWidth: 1, borderColor: '#F0EDE8'
  },
  tdName: {
    width: 120, height: 26,
    fontSize: 12, color: '#666', paddingLeft: 6, paddingTop: 6
  },
  tdNum: {
    width: 95, height: 26,
    fontSize: 12, color: '#333', textAlign: 'center', paddingTop: 6
  },
  tdNumEarly: {
    width: 96, height: 26,
    fontSize: 12, color: '#4A8C5C', textAlign: 'center', paddingTop: 6
  },

  // === 数据表 (4列, 模块3) ===
  tableHeader4: {
    width: IBW, height: 26,
    flexDirection: 'row', backgroundColor: '#F8F6F4',
    borderBottomWidth: 1, borderColor: '#F0EDE8'
  },
  tableRow4: {
    width: IBW, height: 26,
    flexDirection: 'row',
    borderBottomWidth: 1, borderColor: '#F0EDE8'
  },
  tableRow4Gold: {
    width: IBW, height: 26,
    flexDirection: 'row', backgroundColor: '#FFF8E8',
    borderBottomWidth: 1, borderColor: '#F0EDE8'
  },
  tdName4: {
    width: 70, height: 26,
    fontSize: 12, color: '#666', paddingLeft: 6, paddingTop: 6
  },
  tdNum4: {
    width: 80, height: 26,
    fontSize: 12, color: '#333', textAlign: 'center', paddingTop: 6
  },
  tdNum4Early: {
    width: 81, height: 26,
    fontSize: 12, color: '#4A8C5C', textAlign: 'center', paddingTop: 6
  },
  tdDiffGreen: {
    width: 80, height: 26,
    fontSize: 12, color: '#4A8C5C', textAlign: 'center', paddingTop: 6
  },
  tdDiffRed: {
    width: 80, height: 26,
    fontSize: 12, color: '#D85A30', textAlign: 'center', paddingTop: 6
  },
  tdDiffGold: {
    width: 80, height: 26,
    fontSize: 12, color: '#8B7355', textAlign: 'center', paddingTop: 6,
    fontWeight: 'bold'
  },

  // 盈亏平衡
  breakevenTip: {
    width: IBW, height: 36,
    marginTop: 8,
    paddingTop: 6, paddingLeft: 10, paddingRight: 10,
    backgroundColor: '#FFF8E8', borderRadius: 6
  },
  breakevenText: {
    width: IBW - 20, height: 20,
    fontSize: 12, color: '#8B7355', textAlign: 'center'
  },

  // === 模块4: 建议 ===
  adviceCardBlue: {
    width: IBW, height: 78,
    backgroundColor: '#F0F4F8', borderRadius: 10,
    flexDirection: 'column',
    paddingTop: 10, paddingLeft: 12, paddingRight: 12, paddingBottom: 10
  },
  adviceCardGreen: {
    width: IBW, height: 78,
    backgroundColor: '#F0F5EE', borderRadius: 10,
    flexDirection: 'column',
    paddingTop: 10, paddingLeft: 12, paddingRight: 12, paddingBottom: 10
  },
  adviceTitle: {
    width: IBW - 24, height: 18,
    fontSize: 13, color: '#333', fontWeight: 'bold',
    lineHeight: 18
  },
  adviceText: {
    width: IBW - 24, height: 36,
    fontSize: 12, color: '#3A5A7A',
    lineHeight: 18,
    marginTop: 4
  },
  adviceTextGreen: {
    width: IBW - 24, height: 36,
    fontSize: 12, color: '#3A6A4A',
    lineHeight: 18,
    marginTop: 4
  },

  // 特色分析
  featureSection: {
    width: IBW, height: 236,
    backgroundColor: '#F8F6F4', borderRadius: 8,
    flexDirection: 'column',
    paddingTop: 10, paddingLeft: 10, paddingRight: 10, paddingBottom: 10,
    marginTop: 8
  },
  featureTitle: {
    width: IBW - 20, height: 18,
    fontSize: 13, color: '#333', fontWeight: 'bold',
    lineHeight: 18,
    marginBottom: 8
  },
  featureItem: {
    width: IBW - 20, height: 46,
    flexDirection: 'column',
    borderBottomWidth: 1, borderColor: '#EDE8E0',
    marginBottom: 4, paddingBottom: 4
  },
  featureItemLast: {
    width: IBW - 20, height: 40,
    flexDirection: 'column'
  },
  featureLabel: {
    width: IBW - 20, height: 16,
    fontSize: 12, color: '#333', fontWeight: 'bold',
    lineHeight: 16
  },
  featureDesc: {
    width: IBW - 20, height: 28,
    fontSize: 11, color: '#888',
    lineHeight: 14,
    marginTop: 2
  },

  // 建议条
  adviceSuggestBlue: {
    width: IBW, height: 66,
    backgroundColor: '#E6F1FB', borderRadius: 8,
    flexDirection: 'column', justifyContent: 'center',
    paddingLeft: 10, paddingRight: 10, paddingTop: 6, paddingBottom: 6,
    marginTop: 8
  },
  adviceSuggestBlueText: {
    width: IBW - 20, height: 54,
    fontSize: 11, color: '#0C447C',
    lineHeight: 18
  },
  adviceSuggestGreen: {
    width: IBW, height: 66,
    backgroundColor: '#E1F5EE', borderRadius: 8,
    flexDirection: 'column', justifyContent: 'center',
    paddingLeft: 10, paddingRight: 10, paddingTop: 6, paddingBottom: 6,
    marginTop: 8
  },
  adviceSuggestGreenText: {
    width: IBW - 20, height: 54,
    fontSize: 11, color: '#0F6E56',
    lineHeight: 18
  },

  // 替代率
  rateSection: {
    width: IBW, height: 168,
    backgroundColor: '#F8F6F4', borderRadius: 8,
    flexDirection: 'column',
    paddingTop: 10, paddingLeft: 10, paddingRight: 10, paddingBottom: 10,
    marginTop: 8
  },
  rateRow: {
    width: IBW - 20, height: 24,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 4, paddingBottom: 4
  },
  rateRowHL: {
    width: IBW - 20, height: 24,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderColor: '#EDE8E0',
    marginTop: 2, paddingTop: 6
  },
  rateLabel: {
    width: 200, height: 16,
    fontSize: 12, color: '#888',
    lineHeight: 16
  },
  rateValue: {
    width: 90, height: 16,
    fontSize: 12, color: '#333', textAlign: 'right',
    fontWeight: 'bold',
    lineHeight: 16
  },
  rateValueHL: {
    width: 90, height: 16,
    fontSize: 12, color: '#8B7355', textAlign: 'right',
    fontWeight: 'bold',
    lineHeight: 16
  },
  rateDesc: {
    width: IBW - 20, height: 44,
    fontSize: 11, color: '#888',
    lineHeight: 14,
    marginTop: 4
  },

  // === 模块5: 缴费优化 ===
  // worker版
  adviceCardBlue5: {
    width: IBW, height: 64,
    backgroundColor: '#F0F4F8', borderRadius: 10,
    flexDirection: 'column', justifyContent: 'center',
    paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
    marginBottom: 6
  },
  adviceTextWork: {
    width: IBW - 24, height: 48,
    fontSize: 12, color: '#3A5A7A',
    lineHeight: 16
  },

  // flexible版: 指数表格说明
  calcDesc5: {
    width: IBW, height: 24,
    fontSize: 11, color: '#999',
    lineHeight: 12,
    marginBottom: 6
  },
  calcDescNote: {
    width: IBW, height: 20,
    fontSize: 11, color: '#999',
    lineHeight: 12,
    marginTop: 4
  },

  // 咨询引导
  consultCard: {
    width: IBW, height: 320,
    backgroundColor: '#FFF8E8', borderRadius: 8,
    flexDirection: 'column',
    borderWidth: 1, borderColor: '#F0E0C0',
    paddingTop: 10, paddingLeft: 12, paddingRight: 12, paddingBottom: 10,
    marginTop: 10
  },
  consultText: {
    width: IBW - 24, height: 18,
    fontSize: 12, color: '#8B7355', fontWeight: 'bold'
  },
  consultItem: {
    width: IBW - 24, height: 16,
    fontSize: 11, color: '#A08860',
    lineHeight: 16,
    marginTop: 2
  },
  consultImage: {
    width: 130, height: 165,
    borderRadius: 8,
    marginTop: 6, marginBottom: 6,
    alignSelf: 'center'
  },
  consultFooter: {
    width: IBW - 24, height: 18,
    fontSize: 12, color: '#8B7355', fontWeight: 'bold',
    borderTopWidth: 1, borderColor: '#F0E0C0',
    marginTop: 6, paddingTop: 6
  },

  // === 模块6: 计算明细 ===
  calcRow: {
    width: IBW, height: 28,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 4, paddingBottom: 4
  },
  calcLabel: {
    width: 140, height: 18,
    fontSize: 13, color: '#333',
    lineHeight: 18
  },
  calcAmount: {
    width: 120, height: 18,
    fontSize: 13, color: '#333', textAlign: 'right',
    fontWeight: 'bold',
    lineHeight: 18
  },
  calcDesc: {
    width: IBW, height: 42,
    fontSize: 11, color: '#999',
    lineHeight: 14,
    marginBottom: 2
  },
  calcExtraDetail: {
    width: IBW, height: 30,
    backgroundColor: '#F8F6F4', borderRadius: 6,
    flexDirection: 'column', justifyContent: 'center',
    paddingLeft: 8, paddingRight: 8,
    marginBottom: 2
  },
  calcExtraLine: {
    width: IBW - 16, height: 18,
    fontSize: 11, color: '#888',
    lineHeight: 18
  },
  calcTotal: {
    width: IBW, height: 36,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderColor: '#E8E4DE',
    marginTop: 4, paddingTop: 8
  },
  calcTotalLabel: {
    width: 120, height: 20,
    fontSize: 14, color: '#333', fontWeight: 'bold'
  },
  calcTotalAmount: {
    width: 150, height: 24,
    fontSize: 16, color: '#8B7355', textAlign: 'right',
    fontWeight: 'bold'
  },

  // === 免责 ===
  disclaimer: {
    width: CW, height: 60,
    backgroundColor: '#F8F6F4', borderRadius: 8,
    flexDirection: 'column', justifyContent: 'center',
    paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
    marginTop: 4, marginBottom: 12
  },
  disclaimerText: {
    width: CW - 24, height: 44,
    fontSize: 11, color: '#999',
    lineHeight: 14
  },

  // 隐藏元素用的零高度
  zeroH: {
    width: 0, height: 0
  }
}

// ============ build() ============
function build(data) {
  var s = JSON.parse(JSON.stringify(style))
  var w = ''

  // === 标题 ===
  w += '<view class="page">'
  w += '<view class="titleBox">'
  w += '<text class="titleMain">个人退休深度报告</text>'
  w += '<text class="titleSub">正元养老金 · 专属退休规划</text>'
  w += '</view>'

  // === 模块1: 个人退休画像 ===
  w += sectionStart(s, '1', '个人退休画像')
  w += '<view class="infoGrid">'
  w += infoItem(s, '参保地', data.province + (data.city ? ' · ' + data.city : ''))
  w += infoItem(s, '人员类型', data.identity)
  w += infoItemHL(s, '法定退休年龄', data.legalAge)
  w += infoItem(s, '退休时间', data.legalDate)
  w += infoItem(s, '缴费年限', data.legalYears)
  w += infoItem(s, '缴费指数', data.avgIndex)
  w += infoItemHL(s, '个人账户余额', data.balance + ' 元')
  w += infoItem(s, '计发基数', data.base + ' 元')
  w += '</view></view></view>'  // close infoGrid, sectionBody, section

  // === 模块2: 方案深度对比 ===
  w += sectionStart(s, '2', '方案深度对比')
  w += '<view class="compareCards">'
  w += '<view class="compareCardNorm">'
  w += '<text class="compareLabel">正常退休</text>'
  w += '<text class="compareAmount">' + data.legalTotal + '</text>'
  w += '<text class="compareDesc">/月 · ' + data.legalAgeShow + '起领</text>'
  w += '</view>'
  if (data.hasEarly) {
    w += '<view class="compareCardEarly">'
    w += '<text class="compareLabel">弹性提前退休</text>'
    w += '<text class="compareAmountEarly">' + data.flexTotal + '</text>'
    w += '<text class="compareDesc">/月 · ' + data.flexAgeShow + '起领</text>'
    w += '</view>'
  }
  w += '</view>'

  w += '<view class="tableHeader"><text class="tdName">对比项</text><text class="tdNum">正常退休</text><text class="tdNumEarly">弹性提前</text></view>'
  w += tableRow3(s, '退休年龄', data.legalAgeShow, data.flexAgeShow)
  w += tableRow3(s, '退休时间', data.legalDateShow, data.flexDateShow)
  w += tableRow3(s, '缴费年限', data.legalYearsShow, data.flexYearsShow)
  w += tableRow3(s, '计发月数', data.legalMonthsShow, data.flexMonthsShow)
  w += tableRow3(s, '月养老金', data.legalTotal, data.flexTotal)
  w += tableRow3(s, '年养老金', data.legalAnnual, data.flexAnnual)
  w += '</view></view>'  // close sectionBody, section

  // === 模块3: 累计领取对比 ===
  if (data.hasEarly && data.cumulativeItems && data.cumulativeItems.length > 0) {
    w += sectionStart(s, '3', '累计领取对比')
    w += '<view class="tableHeader4"><text class="tdName4">领到年龄</text><text class="tdNum4">正常退休</text><text class="tdNum4Early">弹性提前</text><text class="tdNum4">差额</text></view>'

    data.cumulativeItems.forEach(function(item) {
      var rowClass = item.isBreakEven ? 'tableRow4Gold' : 'tableRow4'
      var diffClass = 'tdDiffGray'
      if (item.isBreakEven) diffClass = 'tdDiffGold'
      else if (item.diff && item.diff.indexOf('+') === 0) diffClass = 'tdDiffGreen'
      else diffClass = 'tdDiffRed'
      w += '<view class="' + rowClass + '">'
      w += '<text class="tdName4">' + item.age + '岁</text>'
      w += '<text class="tdNum4">¥' + item.legalTotal + '</text>'
      w += '<text class="tdNum4Early">¥' + item.flexTotal + '</text>'
      w += '<text class="' + diffClass + '">' + item.diff + '</text>'
      w += '</view>'
    })

    if (data.breakEvenAge && data.breakEvenAge > 0) {
      w += '<view class="breakevenTip"><text class="breakevenText">盈亏平衡点：约 ' + data.breakEvenAge + '岁 后正常退休累计领取反超</text></view>'
    }
    w += '</view></view>'  // close sectionBody, section
  }

  // === 模块4: 退休策略建议 ===
  w += sectionStart(s, '4', '退休策略建议')

  if (data.adviceType === 'worker') {
    // 企业职工版
    w += '<view class="adviceCardBlue">'
    w += '<text class="adviceTitle">企业职工退休分析</text>'
    w += '<text class="adviceText">正常退休月养老金 ' + data.legalTotal + '，弹性提前 ' + data.flexTotal + '，每月差额约¥' + data.diffMonthly + '元。</text>'
    w += '</view>'

    w += '<view class="featureSection">'
    w += '<text class="featureTitle">关键差异分析</text>'
    w += '<view class="featureItem"><text class="featureLabel">工资收入</text><text class="featureDesc">正常退休多领约¥' + data.salary3year + '元工资，弹性提前退休后无工资收入</text></view>'
    w += '<view class="featureItem"><text class="featureLabel">住房公积金</text><text class="featureDesc">正常退休继续缴存，单位和个人合计约¥' + data.fund3year + '；弹性提前退休停缴</text></view>'
    w += '<view class="featureItem"><text class="featureLabel">医疗保险</text><text class="featureDesc">' + (data.medicareLabel || '') + '职工医保缴费年限要求约25年（' + data.medicareYears + '年已' + (data.medicareYears >= 25 ? '满足' : '不足') + '），弹性提前退休后直接享受退休医保待遇，无需补缴</text></view>'
    if (data.breakEvenAge > 0) {
      w += '<view class="featureItemLast"><text class="featureLabel">盈亏平衡</text><text class="featureDesc">约' + data.breakEvenAge + '岁前弹性提前累计领取更高，此后正常退休反超</text></view>'
    }
    w += '</view>'

    w += '<view class="adviceSuggestBlue"><text class="adviceSuggestBlueText">建议：正常退休经济上明显更优（工资+公积金远超养老金差额），建议优先选正常退休。若身体有慢性病、家庭需要照顾或工作强度大，可考虑弹性提前。</text></view>'
  } else {
    // 灵活就业版
    w += '<view class="adviceCardGreen">'
    w += '<text class="adviceTitle">灵活就业退休分析</text>'
    w += '<text class="adviceTextGreen">全部保费自费（费率20%），提前退休：少缴保费约¥' + data.savePremium + '元 + 早领养老金约¥' + data.earlyPension + '元，合计约¥' + data.totalEarlyBenefit + '元。</text>'
    w += '</view>'

    w += '<view class="featureSection">'
    w += '<text class="featureTitle">关键差异分析</text>'
    w += '<view class="featureItem"><text class="featureLabel">保费节省</text><text class="featureDesc">弹性提前退休约省下¥' + data.savePremium + '元保费（全自费20%）</text></view>'
    w += '<view class="featureItem"><text class="featureLabel">早领养老金</text><text class="featureDesc">提前领取约' + data.earlyMonths + '个月，多领约¥' + data.earlyPension + '元</text></view>'
    w += '<view class="featureItem"><text class="featureLabel">回本分析</text><text class="featureDesc">合计好处约¥' + data.totalEarlyBenefit + '元，正常退休每月多领¥' + data.diffMonthly + '元，需约' + data.paybackYears + '年追平</text></view>'
    if (data.medicareYears > 0) {
      w += '<view class="featureItemLast"><text class="featureLabel">医疗保险</text><text class="featureDesc">' + (data.medicareLabel || '') + '职工医保缴费年限要求约25年（' + data.medicareYears + '年），弹性提前退休后可直接享受退休医保待遇</text></view>'
    }
    w += '</view>'

    w += '<view class="adviceSuggestGreen"><text class="adviceSuggestGreenText">建议：灵活就业全部自费，弹性提前退休省下的保费+早领的养老金合计明显。若想早点休息或保费压力大，弹性提前更划算。</text></view>'
  }

  // 替代率分析（通用）
  w += '<view class="rateSection">'
  w += '<text class="featureTitle">养老金替代率分析</text>'
  w += '<view class="rateRow"><text class="rateLabel">月养老金</text><text class="rateValue">' + data.legalTotal + '</text></view>'
  w += '<view class="rateRow"><text class="rateLabel">退休前月工资（按缴费基数推算）</text><text class="rateValue">约¥' + data.baseRetireStr + '</text></view>'
  w += '<view class="rateRowHL"><text class="rateLabel">替代率</text><text class="rateValueHL">' + data.replaceRate + '%</text></view>'
  w += '<text class="rateDesc">替代率 = 养老金÷退休前工资。国际劳工组织建议最低55%，世界银行建议70%+维持生活水平。您处于全国平均水平（40-45%），建议提前规划补充养老。</text>'
  w += '</view>'

  w += '</view></view>'  // close sectionBody, section

  // === 模块5: 缴费优化建议 ===
  w += sectionStart(s, '5', '缴费优化建议')

  if (data.adviceType === 'worker') {
    w += '<view class="adviceCardBlue5"><text class="adviceTextWork">企业职工社保由单位依法缴纳，缴费基数按本人实际工资确定。建议确认单位是否按照实际工资足额申报，避免低基数缴费影响未来待遇。</text></view>'
  } else {
    w += '<text class="calcDesc5">灵活就业可自主选择缴费档次，不同指数对养老金的影响如下（基于当前缴费年限估算）：</text>'

    w += '<view class="tableHeader"><text class="tdName">缴费指数</text><text class="tdNum">月养老金</text><text class="tdNum">月增加</text></view>'

    data.indexOpts.forEach(function(o) {
      var rowClass = o.isCurrent ? 'tableRowGreen' : 'tableRow'
      w += '<view class="' + rowClass + '">'
      w += '<text class="tdName">' + o.label + '</text>'
      w += '<text class="tdNum">' + o.pension + '</text>'
      w += '<text class="tdNum" style="color:' + (o.inc === '--' ? '#888' : '#4A8C5C') + '">' + o.inc + '</text>'
      w += '</view>'
    })

    w += '<text class="calcDescNote">注：以上为基础养老金变化估算，实际总养老金差异更大（含个人账户部分）。</text>'
  }

  // 咨询引导语（通用）
  w += '<view class="consultCard">'
  w += '<text class="consultText">如果您存在以下情况：</text>'
  w += '<text class="consultItem">· 社保有断档、多地缴纳未合并</text>'
  w += '<text class="consultItem">· 曾经企业缴、后来灵活就业，不清楚怎么衔接</text>'
  w += '<text class="consultItem">· 想了解补缴政策或提前退休规划</text>'
  w += '<text class="consultItem">· 想测算不同缴费方案对养老金的影响</text>'
  if (data.consultImg) {
    w += '<image class="consultImage" src="' + data.consultImg + '"></image>'
  }
  w += '<text class="consultFooter">长按识别二维码，添加客服微信咨询</text>'
  w += '</view>'

  w += '</view></view>'  // close sectionBody, section

  // === 模块6: 养老金计算明细 ===
  w += sectionStart(s, '6', '养老金计算明细')

  w += '<view class="calcRow"><text class="calcLabel">基础养老金</text><text class="calcAmount">' + data.basicPension + '</text></view>'
  w += '<text class="calcDesc">' + data.basicDesc + '</text>'

  w += '<view class="calcRow"><text class="calcLabel">个人账户养老金</text><text class="calcAmount">' + data.personalPension + '</text></view>'
  w += '<text class="calcDesc">' + data.personalDesc + '</text>'

  if (data.extraPension) {
    w += '<view class="calcRow"><text class="calcLabel">增发养老金（' + data.province + '）</text><text class="calcAmount">' + data.extraPension + '</text></view>'
    if (data.extraDetails && data.extraDetails.length > 0) {
      w += '<view class="calcExtraDetail">'
      data.extraDetails.forEach(function(d) {
        w += '<text class="calcExtraLine">' + d.label + ' → ' + d.amount + '</text>'
      })
      w += '</view>'
    }
  }

  w += '<view class="calcTotal"><text class="calcTotalLabel">月养老金合计</text><text class="calcTotalAmount">' + data.totalPension + '/月</text></view>'

  w += '</view></view>'  // close sectionBody, section

  // === 免责声明 ===
  w += '<view class="disclaimer"><text class="disclaimerText">本报告依据国务院渐进式延迟退休政策（国办发〔2025〕5号）及' + data.province + '现行计发办法计算。个人账户余额为复利估算值，实际以社保系统查询为准。最终待遇以退休时社保部门核定结果为准。</text></view>'

  w += '</view>'  // close page

  return { wxml: w, style: s }
}

// ============ 辅助函数 ============

// 模块标题
function sectionStart(s, num, title) {
  return '<view class="section"><view class="sectionHeader"><text class="sectionNum">' + num + '</text><text class="sectionTitle">' + title + '</text></view><view class="sectionBody">'
}

// 信息网格单元格（普通）
function infoItem(s, label, val) {
  return '<view class="infoItem"><text class="infoLabel">' + label + '</text><text class="infoValue">' + val + '</text></view>'
}

// 信息网格单元格（高亮值）
function infoItemHL(s, label, val) {
  return '<view class="infoItem"><text class="infoLabel">' + label + '</text><text class="infoValueHL">' + val + '</text></view>'
}

// 3列表格行
function tableRow3(s, label, normal, early) {
  return '<view class="tableRow"><text class="tdName">' + label + '</text><text class="tdNum">' + normal + '</text><text class="tdNumEarly">' + (early || '--') + '</text></view>'
}

module.exports = { build: build }
