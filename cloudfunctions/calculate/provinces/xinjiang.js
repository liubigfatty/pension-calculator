// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：8332元/月
// 更新时间：2026-06-10

// data/provinces/xinjiang.js
// 新疆维吾尔自治区养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 883,
  1979: 927,
  1980: 974,
  1981: 1022,
  1982: 1073,
  1983: 1127,
  1984: 1184,
  1985: 1243,
  1986: 1305,
  1987: 1370,
  1988: 1439,
  1989: 1511,
  1990: 1586,
  1991: 1665,
  1992: 1749,
  1993: 1836,
  1994: 1928,
  1995: 2024,
  1996: 2125,
  1997: 2232,
  1998: 2343,
  1999: 2460,
  2000: 2583,
  2001: 2713,
  2002: 2848,
  2003: 2991,
  2004: 3140,
  2005: 3297,
  2006: 3462,
  2007: 3635,
  2008: 3817,
  2009: 4008,
  2010: 4208,
  2011: 4419,
  2012: 4640,
  2013: 4872,
  2014: 5115,
  2015: 5371,
  2016: 5639,
  2017: 5921,
  2018: 6217,
  2019: 6528,
  2020: 6855,
  2021: 7197,
  2022: 7557,
  2023: 7935,
  2024: 8448,
  2025: 8582,
};

const BASE_PARAMS = {
  PROV_2025: 7800,
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031
}

// ==================== 城市列表 ====================

const CITY_LIST = [
  '乌鲁木齐',
  '克拉玛依',
  '吐鲁番',
  '哈密'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.014  // 新疆维吾尔自治区过渡系数 1.4000000000000001%

const PROV_TAG = 'xinjiang'

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

  return {
    avg_salary_history: {
      "1995": 5348,
      "1996": 5987,
      "1997": 6558,
      "1998": 6837,
      "1999": 7453,
      "2000": 8610,
      "2001": 10318,
      "2002": 11660,
      "2003": 13190,
      "2004": 14484,
      "2005": 15558,
      "2006": 17819,
      "2007": 21434,
      "2008": 24684,
      "2009": 25748,
      "2010": 29593,
      "2011": 36053,
      "2012": 41642,
      "2013": 45798,
      "2014": 49591,
      "2015": 53004,
      "2016": 56882,
      "2017": 60386,
      "2018": 64704,
      "2019": 68856,
      "2020": 78372,
      "2021": 85066,
      "2022": 91501,
      "2023": 99984,
      "2024": 99852,
    },    
      base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
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
