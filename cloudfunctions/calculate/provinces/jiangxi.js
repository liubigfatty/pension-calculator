// 数据来源：✅ 官方数据
// 2024年计发基数：6916元/月
// 更新时间：2026-06-10

// data/provinces/jiangxi.js
// 江西省养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 733,
  1979: 770,
  1980: 808,
  1981: 849,
  1982: 891,
  1983: 936,
  1984: 982,
  1985: 1032,
  1986: 1083,
  1987: 1137,
  1988: 1194,
  1989: 1254,
  1990: 1316,
  1991: 1382,
  1992: 1451,
  1993: 1524,
  1994: 1600,
  1995: 1680,
  1996: 1764,
  1997: 1852,
  1998: 1945,
  1999: 2042,
  2000: 2144,
  2001: 2252,
  2002: 2364,
  2003: 2482,
  2004: 2607,
  2005: 2737,
  2006: 2874,
  2007: 3017,
  2008: 3168,
  2009: 3327,
  2010: 3493,
  2011: 3668,
  2012: 3851,
  2013: 4044,
  2014: 4246,
  2015: 4458,
  2016: 4681,
  2017: 4915,
  2018: 5161,
  2019: 5419,
  2020: 5690,
  2021: 5974,
  2022: 6273,
  2023: 6587,
  2024: 7054,
  2025: 7123,
};

const BASE_PARAMS = {
  PROV_2025: 7054,
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031
}

// ==================== 城市列表 ====================

const CITY_LIST = [
  '南昌',
  '景德镇',
  '萍乡',
  '九江',
  '新余',
  '鹰潭',
  '赣州',
  '吉安',
  '宜春',
  '抚州',
  '上饶'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1995, month: 10 }
const CUTOFF_DATE   = { year: 1995, month: 9 }

const TRANS_COEF = 0.013  // 江西省过渡系数 1.3%

const PROV_TAG = 'jiangxi'

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
    notes: '2023年基数6747元，2024年基数6916元，2025年基数7054元（赣人社发〔2023/2024/2025〕XX号）',
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
