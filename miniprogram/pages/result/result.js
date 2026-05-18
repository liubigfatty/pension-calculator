// pages/result/result.js
Page({
  data: {
    legalTotal: '0',
    legalBasicPension: '0',
    legalExtraPension: '0',
    legalPersonalPension: '0',
    legalTransPension: '0',
    legalRetireDate: '',
    legalAge: '',
    legalTotalYears: '0',
    legalRate: '0',
    canFlex: false,
    legalDate: '',
    legalFlexTotal: '0',
    flexDate: '',
    flexTotal: '0',
    flexAdvance: '0',
    flexDiff: '0',
    isFlexible: false  // 是否灵活就业人员
  },

  onLoad(options) {
    if (!options.result) return
    const r = JSON.parse(decodeURIComponent(options.result))
    const L = r.legal
    const F = r.flex
    
    // 判断是否为灵活就业人员
    const userType = wx.getStorageSync('calc_userType') || 'standard'
    const isFlexible = userType === 'flexible'

    this.setData({
      legalTotal: L.total?.toFixed(2) || '0',
      legalBasicPension: L.basicPension?.amount?.toFixed(2) || '0',
      legalExtraPension: L.extraPension?.amount?.toFixed(2) || '0',
      legalPersonalPension: L.personalAccount?.amount?.toFixed(2) || '0',
      legalTransPension: L.transitionalPension?.amount?.toFixed(2) || '0',
      legalRetireDate: `${L.date.year}年${L.date.month}月`,
      legalAge: L.ageStr || '',
      legalTotalYears: `${L.totalYears?.toFixed(2)}年`,
      legalRate: L.rate?.toFixed(1) || '0',
      canFlex: r.comparison?.canFlex,
      legalDate: `${L.date.year}年${L.date.month}月 (${L.ageStr})`,
      legalFlexTotal: F.total?.toFixed(2) || '0',
      flexDate: `${F.date.year}年${F.date.month}月 (${F.ageStr})`,
      flexTotal: F.total?.toFixed(2) || '0',
      flexAdvance: r.comparison?.flexAdvance || 0,
      flexDiff: Math.round(r.comparison?.amountDiff / (F.totalYears || 1) * 100) / 100,
      isFlexible: isFlexible
    })
  },

  goBack() {
    wx.navigateBack()
  },

  exportReport() {
    const L = this.data;
    if (!L.legalTotal || L.legalTotal === '0') {
      wx.showToast({ title: '请先进行测算', icon: 'none' })
      return
    }
    
    const name = wx.getStorageSync('calc_name') || '-'
    const city = wx.getStorageSync('calc_city') || '全省'
    const province = wx.getStorageSync('calc_province') || '-'
    const userType = wx.getStorageSync('calc_userType') || 'standard'
    const userTypeText = userType === 'flexible' ? '灵活就业' : '企业职工'
    
    const report = `养老金测算报告

========== 基本信息 ==========
参保人员：${name}
参保类型：${userTypeText}
参保地区：${province} - ${city}

========== 退休信息 ==========
退休日期：${L.legalRetireDate || '-'}
退休年龄：${L.legalAge || '-'}
总缴费年限：${L.legalTotalYears || '-'}

========== 养老金明细（元/月）==========
基础养老金：${L.legalBasicPension || '0'}
增发养老金：${L.legalExtraPension || '0'}
个人账户养老金：${L.legalPersonalPension || '0'}
过渡性养老金：${L.legalTransPension || '0'}
--------------------------------
合计：${L.legalTotal || '0'}

${L.canFlex ? `
========== 弹性提前退休对比 ==========
法定退休：${L.legalDate || '-'}，${L.legalFlexTotal || '0'}元/月
提前退休：${L.flexDate || '-'}，${L.flexTotal || '0'}元/月
提前 ${L.flexAdvance || 0} 个月，每月少领 ${L.flexDiff || 0} 元
` : ''}
========== 关键参数 ==========
替代率：${L.legalRate || '0'}%

========================================
本报告由养老金计算平台生成，仅供参考。
实际养老金以社保部门核定为准。
`.trim()
    
    // 复制到剪贴板
    wx.setClipboardData({
      data: report,
      success: () => {
        wx.showModal({
          title: '报告已复制',
          content: '报告内容已复制到剪贴板，您可以粘贴到备忘录或微信聊天中。',
          showCancel: false,
          confirmText: '我知道了'
        })
      }
    })
  },

  // 微信分享功能
  onShareAppMessage() {
    const total = this.data.legalTotal || '0'
    return {
      title: `养老金测算结果：约${total}元/月`,
      path: '/pages/index/index'
    }
  }
})
