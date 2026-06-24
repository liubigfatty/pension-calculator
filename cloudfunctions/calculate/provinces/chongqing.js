// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：8160元/月
// 更新时间：2026-06-10

// data/provinces/chongqing.js
// 重庆市养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 865,
  1979: 908,
  1980: 954,
  1981: 1001,
  1982: 1051,
  1983: 1104,
  1984: 1159,
  1985: 1217,
  1986: 1278,
  1987: 1342,
  1988: 1409,
  1989: 1479,
  1990: 1553,
  1991: 1631,
  1992: 1713,
  1993: 1798,
  1994: 1888,
  1995: 1982,
  1996: 2082,
  1997: 2186,
  1998: 2295,
  1999: 2410,
  2000: 2530,
  2001: 2657,
  2002: 2789,
  2003: 2929,
  2004: 3075,
  2005: 3229,
  2006: 3391,
  2007: 3560,
  2008: 3738,
  2009: 3925,
  2010: 4121,
  2011: 4327,
  2012: 4544,
  2013: 4252,
  2014: 5488,
  2015: 5174,
  2016: 5616,
  2017: 6106,
  2018: 5439,
  2019: 6577,
  2020: 6160,
  2021: 6594,
  2022: 6862,
  2023: 7264,
  2024: 8240,
  2025: 8405,
};

const BASE_PARAMS = {
  PROV_2025: 8350,
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031
}

// ==================== 城市列表 ====================

const CITY_LIST = []

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.013  // 重庆市过渡系数 1.3%

const PROV_TAG = 'chongqing'

// ==================== 模块配置 ====================

const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

// ==================== 测试案例 ====================

const cases = [
  // 案例1：待用户提供官方核定表
  // 案例2：待用户提供官方核定表
]

// ==================== 引擎配置 ====================

function getEngineConfig() {
  const modules = {};
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true };
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF;
      }
    }
  }

  return {    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '⚠️ 2023-2025年基数待官方文件确认',
  }
}

// ==================== 导出 ====================

module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}
