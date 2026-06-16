App({
  onLaunch() {
    // 初始化时加载省份列表
    this.loadProvinceList()
  },
  globalData: {
    provinceList: [],
    provinceData: {},  // { 'jilin': {config}, ... }
    userInfo: {}
  },
  loadProvinceList() {
    var list = [
      {id:'jilin',name:'吉林省'},{id:'liaoning',name:'辽宁省'},{id:'heilongjiang',name:'黑龙江省'},
      {id:'beijing',name:'北京市'},{id:'tianjin',name:'天津市'},{id:'shanghai',name:'上海市'},{id:'chongqing',name:'重庆市'},
      {id:'hebei',name:'河北省'},{id:'shanxi',name:'山西省'},{id:'neimenggu',name:'内蒙古'},
      {id:'shandong',name:'山东省'},{id:'henan',name:'河南省'},{id:'jiangsu',name:'江苏省'},
      {id:'zhejiang',name:'浙江省'},{id:'anhui',name:'安徽省'},{id:'fujian',name:'福建省'},
      {id:'jiangxi',name:'江西省'},{id:'hubei',name:'湖北省'},{id:'hunan',name:'湖南省'},
      {id:'guangdong',name:'广东省'},{id:'guangxi',name:'广西'},{id:'hainan',name:'海南省'},
      {id:'sichuan',name:'四川省'},{id:'guizhou',name:'贵州省'},{id:'yunnan',name:'云南省'},
      {id:'shaanxi',name:'陕西省'},{id:'gansu',name:'甘肃省'},{id:'qinghai',name:'青海省'},
      {id:'ningxia',name:'宁夏'},{id:'xinjiang',name:'新疆'},{id:'xizang',name:'西藏'}
    ]
    this.globalData.provinceList = list
  }
})
