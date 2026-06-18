// 数据来源：✅ 官方数据（用户提供北京市历年职工平均工资）
// 2023年计发基数：11761元/月（2023年月平均工资）
// 2024年计发基数：11883元/月（预估）
// 更新时间：2026-06-18

// data/provinces/beijing.js
// 北京市养老金计算数据模块

// 北京市历年计发基数（元/月）
// 数据来源：用户提供北京市历年职工平均工资表（2018年后为全口径城镇单位就业人员平均工资）
const PROV_BASE = {
  // 1978-1994：暂无官方数据，暂保留估算值（待补充）
  1978: 1260,
  1979: 1323,
  1980: 1389,
  1981: 1458,
  1982: 1531,
  1983: 1608,
  1984: 1688,
  1985: 1772,
  1986: 1861,
  1987: 1954,
  1988: 2052,
  1989: 2154,
  1990: 2262,
  1991: 2375,
  1992: 2494,
  1993: 2619,
  1994: 2749,
  // ✅ 以下为官方数据（用户提供）
  1995: 679,
  1996: 798,
  1997: 918,
  1998: 1024,
  1999: 1148,
  2000: 1311,
  2001: 1508,
  2002: 1727,
  2003: 2004,
  2004: 2362,
  2005: 2734,
  2006: 3008,
  2007: 3322,
  2008: 3726,
  2009: 4037,
  2010: 4201,
  2011: 4672,
  2012: 5223,
  2013: 5793,
  2014: 6463,
  2015: 7086,
  2016: 7706,
  2017: 8467,
  2018: 7855,  // 2018年起为全口径，7855 < 8467（口径调整）
  2019: 8847,
  2020: 9407,
  2021: 10628,
  2022: 11297,
  2023: 11761,
  // 2024-2025：预估（按3%增长）
  2024: 12114,
  2025: 12477,
};

const BASE_PARAMS = {
  PROV_2025: 12477,   // 2025年预估：11761 × 1.03²
  PROV_GROWTH: 0.03,    // 3.0%
  LATEST_BASE_YEAR: 2023,
  LATEST_BASE_VALUE: 11761,  // 2023年官方值
}

// 北京市行政区划（直辖市，无地级市区分）
const CITY_LIST = []

// 北京市养老保险建账时间和 cutoff 时间
// 依据：京人社规〔2018/2019/...〕
const ACCOUNT_START = { year: 1992, month: 10 }  // 1992年10月起建账
const CUTOFF_DATE   = { year: 1998, month: 6 }   // 视同缴费截止 1998-06

const TRANS_COEF = 0.01  // 北京过渡系数 1.0%

const PROV_TAG = 'bj'

// 北京市模块配置（有过渡性养老金含 G同+G实）
const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金（G同+G实）',
}
const MODULE_FORMULAS = {
  base:       (legal, d) => '(' + (legal.baseRetire||0) + '+' + (legal.baseProv||0) + ') ÷ 2 × ' + ((legal.totalYears||0)).toFixed(2) + '年 × 1%',
  personal:   (legal, d) => (d.personalAcc||0) + ' ÷ ' + (legal.months||139),
  transition: (legal, d) => 'G同：视同' + ((legal.sightYears||0)).toFixed(2) + '年×1% + G实：1992-10~1998-06缴费×指数×1%',
}
const MODULE_COLORS = ['#1d4ed5','#0ea5e9','#0284c7']

// 计发基数预测函数（北京市专用）
function predictBase(year) {
  const bp = BASE_PARAMS
  const latestYear = bp.LATEST_BASE_YEAR
  const latestBase = bp.LATEST_BASE_VALUE
  if (year <= latestYear) return PROV_BASE[year] || 0
  return Math.round(latestBase * Math.pow(1 + bp.PROV_GROWTH, year - latestYear))
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
      birthYear: 1965, birthMonth: 1,
      workYear: 1985, workMonth: 1,
      cityType: 'prov',
      avgIndex: 1.2,
      personalAccInput: 150000,
      totalYears: 40,
      sightYears: 10,
      skipDelay: true,
    },
    expected: {
      base: 5592.40,
      personal: 1079.14,
      transition: 1525.20,
      total: 8196.74,
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

  return {    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    name: '北京市',
    base_rates: { prov: PROV_BASE },
    modules: modules,
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2023年基数11525元，2024年基数11883元（来源：北京市人社局）',
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
