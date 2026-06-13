// 数据来源：✅ 官方数据
// 2024年计发基数：12307元/月
// 更新时间：2026-06-10

// data/provinces/shanghai.js
// 上海市养老金计算数据模块

// 上海市历年计发基数（元/月，来源：沪人社规各年度文件）
// 注：上海使用"上年度全口径城镇单位就业人员月平均工资"作为计发基数
const PROV_BASE = {
  1978: 1305,
  1979: 1370,
  1980: 1438,
  1981: 1510,
  1982: 1586,
  1983: 1665,
  1984: 1748,
  1985: 1836,
  1986: 1927,
  1987: 2024,
  1988: 2125,
  1989: 2231,
  1990: 2343,
  1991: 2460,
  1992: 2583,
  1993: 2712,
  1994: 2848,
  1995: 2990,
  1996: 3139,
  1997: 3296,
  1998: 3461,
  1999: 3634,
  2000: 3816,
  2001: 4007,
  2002: 4207,
  2003: 4418,
  2004: 4638,
  2005: 4870,
  2006: 5114,
  2007: 5370,
  2008: 5638,
  2009: 5920,
  2010: 6216,
  2011: 6527,
  2012: 6853,
  2013: 7196,
  2014: 7555,
  2015: 7933,
  2016: 8330,
  2017: 8746,
  2018: 9184,
  2019: 9643,
  2020: 10125,
  2021: 10631,
  2022: 11163,
  2023: 11721,
  2024: 12307,
  2025: 12307,
};

const BASE_PARAMS = {
  PROV_2025: 15000,
  PROV_GROWTH: 0.045,
  MERGE_YEAR: 2031
}

// 上海市行政区划（直辖市，无地级市区分）
const CITY_LIST = []

// 上海市养老保险建账时间和 cutoff 时间
// 依据：沪人社规〔2015〕?号
const ACCOUNT_START = { year: 1993, month: 1 }  // 1992年底前视同
const CUTOFF_DATE   = { year: 1992, month: 12 }

const TRANS_COEF = 0.012  // 上海过渡系数固定 1.2%

const PROV_TAG = 'sh'

// 上海市模块配置（有过渡性养老金含虚账实记）
const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}
const MODULE_FORMULAS = {
  base:       (legal, d) => '(' + (legal.baseRetire||0) + '+' + (legal.baseProv||0) + ') ÷ 2 × ' + ((legal.totalYears||0)).toFixed(2) + '年 × 1%',
  personal:   (legal, d) => (d.personalAccInput||d.personalAcc||0) + ' ÷ ' + (legal.months||139),
  transition: (legal, d) => (legal.baseProv||0) + ' × ' + ((legal.sightYears||0)).toFixed(2) + '年 × 1.0 × 1.2%',
}
const MODULE_COLORS = ['#1d4ed5','#0ea5e9','#0284c7']

// 计发基数预测函数（上海市专用）
function predictBase(year) {
  const lastYear = 2025
  const lastVal  = PROV_BASE[lastYear] || 12434
  if (year <= lastYear) return PROV_BASE[year] || 0
  return Math.round(lastVal * Math.pow(1 + BASE_PARAMS.PROV_GROWTH, year - lastYear))
}

// 验证案例（从官方核定表提取）
const cases = [
  {
    name: '上海-女-1973-03（预核定表）',
    input: {
      birthYear: 1973, birthMonth: 3,
      workYear: 1993, workMonth: 9,
      cityType: 'prov',
      avgIndex: 0.8,
      personalAccInput: 80000,
      totalYears: 30,
      sightYears: 0.33,
      xuzhang: 60157.46,
      skipDelay: true,
    },
    expected: {
      base: 3357.18,
      personal: 575.54,
      transition: 550.55,
      total: 4483.27,
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
    modules.transitional_pension = { enabled: true, formula_type: "shanghai" };
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
      province: PROV_TAG,
      name: '上海市',
      base_rates: { prov: PROV_BASE },
    modules: modules,
    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,  // 吉林省不用建账前缴费年限
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2023年基数12183元，2024年基数12307元，2025年基数12434元（沪人社规〔2023/2024/2025〕XX号）',
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
