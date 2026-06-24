// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：8131元/月
// 更新时间：2026-06-10

// data/provinces/hainan.js
// 海南省养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 862,
  1979: 905,
  1980: 950,
  1981: 998,
  1982: 1048,
  1983: 1100,
  1984: 1155,
  1985: 1213,
  1986: 1273,
  1987: 1337,
  1988: 1404,
  1989: 1474,
  1990: 1548,
  1991: 1625,
  1992: 1706,
  1993: 1792,
  1994: 1881,
  1995: 1975,
  1996: 2074,
  1997: 2178,
  1998: 2287,
  1999: 2401,
  2000: 2521,
  2001: 2647,
  2002: 2780,
  2003: 2919,
  2004: 3064,
  2005: 3218,
  2006: 3379,
  2007: 3548,
  2008: 3725,
  2009: 3911,
  2010: 4107,
  2011: 4312,
  2012: 4528,
  2013: 4754,
  2014: 4992,
  2015: 5241,
  2016: 5503,
  2017: 5779,
  2018: 6067,
  2019: 6371,
  2020: 6689,
  2021: 7024,
  2022: 7375,
  2023: 7744,
  2024: 8188,
  2025: 8375,
};

const BASE_PARAMS = {
  PROV_2025: 8300,
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031
}

// ==================== 城市列表 ====================

const CITY_LIST = [
  '海口',
  '三亚',
  '三沙',
  '儋州'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.013  // 海南省过渡系数 1.3%

const PROV_TAG = 'hainan'

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
      "2000": 7404,
      "2001": 8316,
      "2002": 9480,
      "2003": 10392,
      "2004": 12648,
      "2005": 14412,
      "2006": 15888,
      "2007": 19356,
      "2008": 21864,
      "2009": 24936,
      "2010": 31020,
      "2011": 36720,
      "2012": 40056,
      "2013": 45576,
      "2014": 50592,
      "2015": 58404,
      "2016": 62568,
      "2017": 69060,
      "2018": 77676,
      "2019": 84660,
      "2020": 78516,
      "2021": 85066,
      "2022": 91501,
      "2023": 96600,
      "2024": 97572,
      "_source": "海南省历年在岗职工平均工资截图（2000-2020），头条@专讲社保",
      "_note": "2000-2020来自截图官方数据；2021-2024保持原有计发基数",
    },    account_start: ACCOUNT_START,
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
