/**
 * 省份配置加载工具
 * 小程序版：优先从远程加载，内置吉林配置作为测试备用
 */
const BASE_URL = 'https://liubigfatty.github.io/pension-calculator/js/provinces/'

// 吉林配置（内嵌，用于测试号/离线环境，其他省份需配白名单后远程加载）
const JILIN_CONFIG = {"province":"吉林省","base_rates":{"prov":{"1995":369.17,"1996":447.5,"1997":472,"1998":545.92,"1999":596.5,"2000":660.33,"2001":730.92,"2002":832.5,"2003":923.42,"2004":1035.92,"2005":1200.75,"2006":1381.92,"2007":1709.42,"2008":1957.17,"2009":2185.83,"2010":2449.92,"2011":2849.75,"2012":3200.58,"2013":3570.5,"2014":3876.33,"2015":4296.5,"2016":4674.83,"2017":5120.92,"2018":5711.08,"2019":6151.08,"2020":5088.42,"2021":6004.75,"2022":6709.83,"2023":7058.67,"2024":7178.5,"2025":7322.08,"2026":7642.79,"2027":7977.54,"2028":8326.96,"2029":8691.68,"2030":9072.37,"2031":9308.26,"2032":9550.27,"2033":9798.58,"2034":10053.34,"2035":10314.73},"cc":{}},"special":{"oneChild":20.5,"intellectual":5},"transition":{"startYear":1996,"method":"sightYear","ratio":0.014},"city_names":["长春市","吉林市","四平市","辽源市","通化市","白山市","松原市","白城市","延边州"],"accounts":{"startYear":1996},"delay":{"male":62,"fw":55,"fc":60},"min_years":{"male":[15,15],"fw":[15,15],"fc":[15,15]},"growth_rate":0.02}

// 内置省份配置映射
const EMBEDDED = { jilin: JILIN_CONFIG }

// 省份名称映射
const PROVINCE_NAMES = {
  jilin:'吉林省', liaoning:'辽宁省', heilongjiang:'黑龙江省',
  beijing:'北京市', tianjin:'天津市', shanghai:'上海市', chongqing:'重庆市',
  hebei:'河北省', shanxi:'山西省', neimenggu:'内蒙古',
  shandong:'山东省', henan:'河南省', jiangsu:'江苏省',
  zhejiang:'浙江省', anhui:'安徽省', fujian:'福建省',
  jiangxi:'江西省', hubei:'湖北省', hunan:'湖南省',
  guangdong:'广东省', guangxi:'广西', hainan:'海南省',
  sichuan:'四川省', guizhou:'贵州省', yunnan:'云南省',
  shaanxi:'陕西省', gansu:'甘肃省', qinghai:'青海省',
  ningxia:'宁夏', xinjiang:'新疆', xizang:'西藏'
}

// 省份列表
const PROVINCE_LIST = Object.keys(PROVINCE_NAMES).map(id => ({
  id,
  name: PROVINCE_NAMES[id]
}))

/**
 * 加载省份配置
 * 测试号环境使用内置配置（仅吉林），正式版远程加载
 */
function loadProvince(id) {
  // 测试号环境：wx.request 不可用，使用内置配置
  if (EMBEDDED[id]) {
    return Promise.resolve(JSON.parse(JSON.stringify(EMBEDDED[id])))
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + id + '.json',
      success(res) {
        if (res.statusCode === 200) resolve(res.data)
        else resolve(null) // 不报错，让调用方处理
      },
      fail(err) {
        // 网络失败时回退到内置配置
        if (EMBEDDED[id]) {
          resolve(JSON.parse(JSON.stringify(EMBEDDED[id])))
        } else {
          reject(err)
        }
      }
    })
  })
}

module.exports = {
  PROVINCE_NAMES,
  PROVINCE_LIST,
  loadProvince
}
