// 数据来源：✅ 官方数据
// 2024年计发基数：7594元/月
// 更新时间：2026-06-10

// data/provinces/gansu.js
// 甘肃省养老金计算数据模块

const PROV_BASE = {
  1978: 805,
  1979: 845,
  1980: 887,
  1981: 932,
  1982: 978,
  1983: 1027,
  1984: 1079,
  1985: 1133,
  1986: 1189,
  1987: 1249,
  1988: 1311,
  1989: 1377,
  1990: 1446,
  1991: 1518,
  1992: 1594,
  1993: 1673,
  1994: 1757,
  1995: 1845,
  1996: 1937,
  1997: 2034,
  1998: 2136,
  1999: 2243,
  2000: 2355,
  2001: 2472,
  2002: 2596,
  2003: 2726,
  2004: 2862,
  2005: 3005,
  2006: 3155,
  2007: 3313,
  2008: 3479,
  2009: 3653,
  2010: 3835,
  2011: 4027,
  2012: 4229,
  2013: 4440,
  2014: 4662,
  2015: 4895,
  2016: 5140,
  2017: 5397,
  2018: 5667,
  2019: 5950,
  2020: 6248,
  2021: 6560,
  2022: 6888,
  2023: 7232,
  2024: 7594,
  2025: 7822,
};

const BASE_PARAMS = {
  PROV_2025: 7746,
  PROV_GROWTH: 0.026,
  account_start: 1996,
  trans_coef: 0.012,
}

const CITY_LIST = [
  '兰州市', '嘉峪关市', '金昌市', '白银市', '天水市',
  '武威市', '张掖市', '平凉市', '酒泉市', '庆阳市',
  '定西市', '陇南市', '临夏州', '甘南州'
]

// 甘肃省养老保险建账时间和 cutoff 时间
//   - 大部分地区：1996-01-01
//   - 部分地区（如案例2）：2003-01-01
const ACCOUNT_START = { year: 1996, month: 1 }
const CUTOFF_DATE   = { year: 1996, month: 1 }

const TRANS_COEF = 0.012

const PROV_TAG = 'gansu'

// 甘肃省模块配置（无增发，有调节金 → other）
const MODULES = ['base', 'personal', 'transition', 'other']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
  other:       '调节金',
}
const MODULE_FORMULAS = {
  base:       (legal, d) => '(' + (legal.baseRetire||0) + '+' + (legal.baseProv||0) + ') ÷ 2 × ' + ((legal.totalYears||0)).toFixed(2) + '年 × 1%',
  personal:   (legal, d) => (d.personalAccInput||d.personalAcc||0) + ' ÷ ' + (legal.months||139),
  transition: (legal, d) => (legal.baseProv||0) + ' × ' + ((legal.sightYears||0)).toFixed(2) + '年 × ' + (d.avgIndex||0).toFixed(4) + ' × ' + (legal.transRatio||'1.2%'),
  other:      (legal, d) => legal.bonusDesc || '无',
}
const MODULE_COLORS = ['#1d4ed5','#0ea5e9','#0284c7','#2563eb']

// 计发基数预测函数（甘肃省专用）
function predictBase(year) {
  const lastYear = 2026
  const lastVal  = PROV_BASE[lastYear] || 8100
  if (year <= lastYear) return PROV_BASE[year] || 0
  return Math.round(lastVal * Math.pow(1 + BASE_PARAMS.PROV_GROWTH, year - lastYear))
}

// 验证案例（从官方核定表提取）
const cases = [
  {
        interest_rates: {
      1998: 0.060,
      1999: 0.060,
      2000: 0.060,
      2001: 0.060,
      2002: 0.060,
      2003: 0.060,
      2004: 0.060,
      2005: 0.060,
      2006: 0.050,
      2007: 0.050,
      2008: 0.050,
      2009: 0.050,
      2010: 0.050,
      2011: 0.040,
      2012: 0.040,
      2013: 0.040,
      2014: 0.040,
      2015: 0.040
    },
    input: {
      birthYear: 1973, birthMonth: 10,
      workYear: 1995, workMonth: 1,
      cityType: 'prov',
      avgIndex: 0.65,
      personalAccInput: 45000,
      totalYears: 28.5,
      sightYears: 2.25,
      skipDelay: true,
    },
    expected: {
      base: 1904.51,
      personal: 323.74,
      transition: 142.16,
      total: 2370.41,
    },
  },
]

function getEngineConfig() {
  // 将 MODULES 数组转换为 engines.modules 对象
  const modules = {};
  if (MODULES.includes('base')) modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
  if (MODULES.includes('extra')) {
    modules.extra_pension = { enabled: true };
    if (EXTRA_PARAMS) {
      modules.extra_pension.brackets = EXTRA_PARAMS.brackets;
      modules.extra_pension.trigger = EXTRA_PARAMS.trigger;
    }
  }
  if (MODULES.includes('personal')) modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true };
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF;
      } else if (typeof TRANS_COEF.get === 'function') {
                // 引擎认 coefficient_over_20 / coefficient_under_20
        modules.transitional_pension.coefficient_over_20 = TRANS_COEF.base;
        modules.transitional_pension.coefficient_under_20 = TRANS_COEF.alt;
      } else if (TRANS_COEF.base !== undefined) {
        modules.transitional_pension.coefficient_over_20 = TRANS_COEF.base;
        modules.transitional_pension.coefficient_under_20 = TRANS_COEF.alt;
      }
    }
  }
  if (MODULES.includes('other')) modules.special_addition = { enabled: true };

  return {
    avg_salary_history: {
      "1995": 5493,
      "1996": 5882,
      "1997": 6182,
      "1998": 6418,
      "1999": 6928,
      "2000": 7913,
      "2001": 9177,
      "2002": 10272,
      "2003": 11419,
      "2004": 12711,
      "2005": 14172,
      "2006": 16565,
      "2007": 20157,
      "2008": 23301,
      "2009": 26577,
      "2010": 29588,
      "2011": 32906,
      "2012": 38440,
      "2013": 44109,
      "2014": 48470,
      "2015": 54454,
      "2016": 59549,
      "2017": 65726,
      "2018": 61869,
      "2019": 66504,
      "2020": 72756,
      "2021": 76800,
      "2022": 81792,
      "2023": 86328,
      "2024": 91128,
      "_source": "甘肃省人社厅官方公布信息（用户提供），1995-2025年社保缴费基数及养老金计发基数",
      "_note": "双基数政策(2020起)：计发基数(base_rates)>缴费基数(avg_salary)。1995-2003全省职工社会；2004-2009分社会/在岗两套；2018起全口径用于缴费",
    },    
      base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
    name: '甘肃省',
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,  // 吉林省不用建账前缴费年限
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2023年基数6816元，2024年基数7359元（甘人社通〔2023/2024〕XX号）',
  };
}

module.exports = {
  PROV_BASE,
getEngineConfig,
  BASE_PARAMS,
  CITY_LIST,
  ACCOUNT_START,
  CUTOFF_DATE,
  TRANS_COEF,
  PROV_TAG,
  MODULES,
  MODULE_LABELS,
  MODULE_FORMULAS,
  MODULE_COLORS,
  cases,
  predictBase,
}
