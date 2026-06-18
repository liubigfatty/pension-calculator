// app.js
App({
  globalData: {
    // 云开发环境ID（从云开发控制台获取）
    envId: 'cloud1-d2gfe2lrpe9cdf8a0',
    // 省份列表（从云存储加载，这里先硬编码）
    provinceList: [
      { code: 'jilin', name: '吉林省' },
      { code: 'liaoning', name: '辽宁省' },
      { code: 'heilongjiang', name: '黑龙江省' },
      { code: 'beijing', name: '北京市' },
      { code: 'shanghai', name: '上海市' },
      { code: 'guangdong', name: '广东省' },
      { code: 'jiangsu', name: '江苏省' },
      { code: 'zhejiang', name: '浙江省' },
      { code: 'shandong', name: '山东省' },
      { code: 'henan', name: '河南省' },
      { code: 'hebei', name: '河北省' },
      { code: 'hubei', name: '湖北省' },
      { code: 'hunan', name: '湖南省' },
      { code: 'sichuan', name: '四川省' },
      { code: 'fujian', name: '福建省' },
      { code: 'anhui', name: '安徽省' },
      { code: 'shaanxi', name: '陕西省' },
      { code: 'tianjin', name: '天津市' },
      { code: 'chongqing', name: '重庆市' },
      { code: 'liaoning', name: '辽宁省' },
      { code: 'shanxi', name: '山西省' },
      { code: 'jiangxi', name: '江西省' },
      { code: 'yunnan', name: '云南省' },
      { code: 'guangxi', name: '广西壮族自治区' },
      { code: 'guizhou', name: '贵州省' },
      { code: 'gansu', name: '甘肃省' },
      { code: 'hainan', name: '海南省' },
      { code: 'neimenggu', name: '内蒙古自治区' },
      { code: 'xinjiang', name: '新疆维吾尔自治区' },
      { code: 'xizang', name: '西藏自治区' },
      { code: 'ningxia', name: '宁夏回族自治区' },
      { code: 'qinghai', name: '青海省' }
    ],
    // 计算结果
    calcResult: null,
    // 用户输入（跨页面共享）
    calcInput: {}
  },

  onLaunch() {
    // 初始化云开发环境
    if (wx.cloud) {
      wx.cloud.init({
        env: this.globalData.envId,
        traceUser: true
      })
      console.log('云开发初始化成功，环境ID：', this.globalData.envId)
    }
  }
})
