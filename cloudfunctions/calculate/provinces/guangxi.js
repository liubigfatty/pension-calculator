// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：6847元/月
// 更新时间：2026-06-10

// data/provinces/guangxi.js
// 广西壮族自治区养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 726,
  1979: 762,
  1980: 800,
  1981: 840,
  1982: 882,
  1983: 926,
  1984: 973,
  1985: 1021,
  1986: 1072,
  1987: 1126,
  1988: 1182,
  1989: 1241,
  1990: 1303,
  1991: 1369,
  1992: 1437,
  1993: 1509,
  1994: 1584,
  1995: 1663,
  1996: 1747,
  1997: 1834,
  1998: 1926,
  1999: 2022,
  2000: 2123,
  2001: 2229,
  2002: 2341,
  2003: 2458,
  2004: 2581,
  2005: 2710,
  2006: 2845,
  2007: 2987,
  2008: 3137,
  2009: 3294,
  2010: 3458,
  2011: 3631,
  2012: 3813,
  2013: 4003,
  2014: 4203,
  2015: 4414,
  2016: 4634,
  2017: 4866,
  2018: 5109,
  2019: 5365,
  2020: 5633,
  2021: 5915,
  2022: 6210,
  2023: 6521,
  2024: 6983,
  2025: 7052,
};

const BASE_PARAMS = {
  PROV_2025: 7000,
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031
}

// ==================== 城市列表 ====================

const CITY_LIST = [
  '南宁',
  '柳州',
  '桂林',
  '梧州',
  '北海',
  '防城港',
  '钦州',
  '贵港',
  '玉林',
  '百色',
  '贺州',
  '河池',
  '来宾',
  '崇左'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.014  // 广西壮族自治区过渡系数 1.4000000000000001%

const PROV_TAG = 'guangxi'

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
      "1995": 5105,
      "1996": 5397,
      "1997": 5540,
      "1998": 6208,
      "1999": 6776,
      "2000": 7651,
      "2001": 9075,
      "2002": 10074,
      "2003": 11953,
      "2004": 13579,
      "2005": 15461,
      "2006": 18064,
      "2007": 21898,
      "2008": 25660,
      "2009": 28302,
      "2010": 31842,
      "2011": 34064,
      "2012": 37614,
      "2013": 42637,
      "2014": 46846,
      "2015": 54983,
      "2016": 60239,
      "2017": 66456,
      "2018": 70606,
      "2019": 76479,
      "2020": 69832,
      "2021": 74362,
      "2022": 77268,
      "2023": 81070,
      "2024": 82164,
      "_source": "广西统计局公布+用户提供（2016-2020城镇非私营年工资÷12）",
      "_note": "1995-2017原有数据保持；2018-2020来自用户提供的非私营单位年工资；2021-2024按趋势估算待官方确认",
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
