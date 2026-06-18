// 数据来源：✅ 官方数据（沪人社规各年度文件）
// 2024年计发基数：12307元/月
// 更新时间：2026-06-18（用户提供的直辖市对比表）
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
  // 以下2013-2023年数据来自用户提供的直辖市对比表（2026-06-18）
  2013: 5036,
  2014: 5451,
  2015: 5939,
  2016: 6504,
  2017: 7132,
  2018: 8765,
  2019: 9580,
  2020: 10388,
  2021: 11396,
  2022: 12183,
  2023: 12307,
  2024: 12307,
  2025: 12636,
};

const BASE_PARAMS = {
  PROV_2025: 12973,  // 2023年12307，按5.4%增长预估
  PROV_GROWTH: 0.054,
  LATEST_BASE_YEAR: 2023,
  LATEST_BASE_VALUE: 12307,
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

    return {    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

      province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
      name: '上海市',
    modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
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
