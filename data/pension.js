// data/pension.js
// 养老金计算平台 —— 公共数据 + 省份数据聚合入口
// 各省独立模块放在 data/provinces/*.js

// ==================== 公共数据（全国统一）====================

// 历年个人账户记账利率（全国统一，2016年起）
const INTEREST_RATE = {
  1995: 0.025, 1996: 0.025, 1997: 0.025, 1998: 0.025, 1999: 0.025,
  2000: 0.025, 2001: 0.025, 2002: 0.025, 2003: 0.025, 2004: 0.025,
  2005: 0.0226, 2006: 0.025, 2007: 0.025, 2008: 0.0393, 2009: 0.0225,
  2010: 0.0230, 2011: 0.025, 2012: 0.025, 2013: 0.0325, 2014: 0.025,
  2015: 0.025,
  2016: 0.0831, 2017: 0.0712, 2018: 0.0829, 2019: 0.0761, 2020: 0.0604,
  2021: 0.0669, 2022: 0.0397, 2023: 0.0397, 2024: 0.0262, 2025: 0.0150
}

// 计发月数表（全国统一，精确到半年）
const MONTHS_TABLE = {
  50.0: 195.0, 50.5: 192.5, 51.0: 190.0, 51.5: 187.5,
  52.0: 185.0, 52.5: 182.5, 53.0: 180.0, 53.5: 177.5,
  54.0: 175.0, 54.5: 172.5, 55.0: 170.0, 55.5: 167.5,
  56.0: 164.0, 56.5: 161.5, 57.0: 158.0, 57.5: 155.5,
  58.0: 152.0, 58.5: 149.5, 59.0: 145.0, 59.5: 142.5,
  60.0: 139.0, 60.5: 136.1, 61.0: 132.0, 61.5: 128.6,
  62.0: 125.0, 62.5: 121.4, 63.0: 117.0, 63.5: 113.4
}

// 最低缴费年限（渐进式提高，2025-2045，全国统一）
const MIN_YEARS = {
  2025: 15, 2026: 15, 2027: 15, 2028: 15, 2029: 15,
  2030: 15.5, 2031: 16, 2032: 16.5, 2033: 17, 2034: 17.5,
  2035: 18, 2036: 18.5, 2037: 19, 2038: 19.5,
  2039: 20, 2040: 20, 2041: 20, 2042: 20, 2043: 20, 2044: 20, 2045: 20
}

// 省份列表（供 picker 使用，顺序与 provinces/*.js 文件名对应）
const PROVINCE_LIST = ['吉林省', '黑龙江省', '甘肃省', '云南省', '上海市', '北京市', '江苏省', '四川省']

// ==================== 省份数据映射 ====================
// 静态 require 各省模块（微信小程序不支持动态 require）

const jilinModule       = require('./provinces/jilin')
const heilongjiangModule = require('./provinces/heilongjiang')
const gansuModule      = require('./provinces/gansu')
const yunnanModule     = require('./provinces/yunnan')
const shanghaiModule   = require('./provinces/shanghai')
const beijingModule    = require('./provinces/beijing')
const jiangsuModule    = require('./provinces/jiangsu')
const sichuanModule    = require('./provinces/sichuan')

const PROV_MODULE_MAP = {
  'jilin':       jilinModule,
  'heilongjiang': heilongjiangModule,
  'gansu':       gansuModule,
  'yunnan':      yunnanModule,
  'shanghai':    shanghaiModule,
  'beijing':     beijingModule,
  'jiangsu':     jiangsuModule,
  'sichuan':     sichuanModule,
}

// ==================== 省份数据获取函数 ====================
// 保持与原接口完全兼容

function getProvinceData(prov) {
  // 参数容错：支持 '吉林省' 和 'jilin' 两种格式
  let key = prov
  if (prov === '吉林省') key = 'jilin'
  else if (prov === '黑龙江省') key = 'heilongjiang'
  else if (prov === '甘肃省') key = 'gansu'
  else if (prov === '云南省') key = 'yunnan'
  else if (prov === '上海市') key = 'shanghai'
  else if (prov === '北京市') key = 'beijing'
  else if (prov === '江苏省') key = 'jiangsu'
  else if (prov === '四川省') key = 'sichuan'

  // 获取省份模块
  const mod = PROV_MODULE_MAP[key]
  if (!mod) {
    console.error('[pension.js] 未知省份：' + prov)
    // 默认返回吉林省
    return getProvinceData('jilin')
  }

  // 组装返回对象（保持与原接口完全兼容）
  // 注意：INTEREST_RATE / MONTHS_TABLE / MIN_YEARS 来自公共数据
  return {
    PROV_BASE:      mod.PROV_BASE,
    INTEREST_RATE:   INTEREST_RATE,
    CC_BASE:        mod.CC_BASE || {},
    MONTHS_TABLE:   MONTHS_TABLE,
    MIN_YEARS:      MIN_YEARS,
    BASE_PARAMS:    mod.BASE_PARAMS,
    CITY_LIST:      mod.CITY_LIST,
    ACCOUNT_START:  mod.ACCOUNT_START,
    CUTOFF_DATE:   mod.CUTOFF_DATE,
    transCoef:      mod.TRANS_COEF,
    provTag:        mod.PROV_TAG,
    MODULES:        mod.MODULES,
    MODULE_LABELS:  mod.MODULE_LABELS,
    MODULE_FORMULAS: mod.MODULE_FORMULAS,
    MODULE_COLORS:  mod.MODULE_COLORS,
    // 附件数据（部分省份有）
    SALARY_HISTORY: mod.SALARY_HISTORY || null,
    cases:          mod.cases || null,
  }
}

// 计发基数预测函数（省份专用，优先调用各省模块内的 predictBase）
function predictBase(province, year, cityType) {
  let key = province
  if (province === '吉林省') key = 'jilin'
  else if (province === '黑龙江省') key = 'heilongjiang'
  else if (province === '甘肃省') key = 'gansu'
  else if (province === '云南省') key = 'yunnan'
  else if (province === '上海市') key = 'shanghai'
  else if (province === '北京市') key = 'beijing'
  else if (province === '江苏省') key = 'jiangsu'
  else if (province === '四川省') key = 'sichuan'

  const mod = PROV_MODULE_MAP[key]
  if (!mod) {
    console.error('[pension.js] predictBase 未知省份：' + province)
    return 0
  }
  if (typeof mod.predictBase === 'function') {
    return mod.predictBase(year, cityType)
  }
  // 兜底：如果模块没有导出 predictBase，返回 0
  console.error('[pension.js] ' + key + ' 模块未导出 predictBase 函数')
  return 0
}

module.exports = {
  PROVINCE_LIST,
  INTEREST_RATE,
  MONTHS_TABLE,
  MIN_YEARS,
  getProvinceData,
  predictBase,
}
