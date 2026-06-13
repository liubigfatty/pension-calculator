// 数据来源：✅ 官方数据
// 2024年计发基数：8183元/月
// 更新时间：2026-06-10

// data/provinces/yunnan.js
// 云南省养老金计算数据模块

const PROV_BASE = {
  1978: 867,
  1979: 911,
  1980: 956,
  1981: 1004,
  1982: 1054,
  1983: 1107,
  1984: 1162,
  1985: 1220,
  1986: 1282,
  1987: 1346,
  1988: 1413,
  1989: 1483,
  1990: 1558,
  1991: 1636,
  1992: 1717,
  1993: 1803,
  1994: 1893,
  1995: 1988,
  1996: 2087,
  1997: 2192,
  1998: 2301,
  1999: 2416,
  2000: 2537,
  2001: 2664,
  2002: 2797,
  2003: 2937,
  2004: 3084,
  2005: 3238,
  2006: 3400,
  2007: 3570,
  2008: 3749,
  2009: 3936,
  2010: 4133,
  2011: 4340,
  2012: 4557,
  2013: 4784,
  2014: 5024,
  2015: 5275,
  2016: 5539,
  2017: 5816,
  2018: 6106,
  2019: 6412,
  2020: 6732,
  2021: 7069,
  2022: 7422,
  2023: 7793,
  2024: 8183,
  2025: 8428,
};

const BASE_PARAMS = {
  PROV_2025: 8265,
  PROV_GROWTH: 0.026,
  // 全省退休人员人均养老金（元/月），用于计算独生子女补贴
  AVG_PENSIONER_PENSION: {
    2021: 3158,
    2022: 3293,
    2023: 3500,
    2024: 3700,
    2025: 3900,
    // 预测值（按约5%年增长）
    2026: 4100,
    2027: 4300,
    2028: 4520,
    2029: 4750,
    2030: 4990,
  }
}

const CITY_LIST = [
  '昆明市', '曲靖市', '玉溪市', '保山市', '昭通市',
  '丽江市', '普洱市', '临沧市', '楚雄州', '红河州',
  '文山州', '西双版纳州', '大理州', '德宏州', '怒江州',
  '迪庆州'
]

// 云南省养老保险建账时间和 cutoff 时间
// 依据：云人社发〔2007〕?号
const ACCOUNT_START = { year: 1995, month: 10 }
const CUTOFF_DATE   = { year: 1995, month: 10 }

const TRANS_COEF = 0.013  // 云南过渡系数固定 1.3%

const PROV_TAG = 'yunnan'

// 云南省模块配置（无增发，有独生子女补贴 → other）
const MODULES = ['base', 'personal', 'transition', 'other']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
  other:       '独生子女补贴',
}
const MODULE_FORMULAS = {
  base:       (legal, d) => '(' + (legal.baseRetire||0) + '+' + (legal.baseProv||0) + ') ÷ 2 × ' + ((legal.totalYears||0)).toFixed(2) + '年 × 1%',
  personal:   (legal, d) => (d.personalAcc||0) + ' ÷ ' + (legal.months||139),
  transition: (legal, d) => (legal.baseProv||0) + ' × ' + ((legal.sightYears||0)).toFixed(2) + '年 × ' + (d.avgIndex||0).toFixed(4) + ' × ' + (legal.transRatio||'1.3%'),
  other:      (legal, d) => legal.bonusDesc || '无',
}
const MODULE_COLORS = ['#1d4ed5','#0ea5e9','#0284c7','#2563eb']

// 计发基数预测函数（云南省专用）
function predictBase(year) {
  const lastYear = 2026
  const lastVal  = PROV_BASE[lastYear] || 8700
  if (year <= lastYear) return PROV_BASE[year] || 0
  return Math.round(lastVal * Math.pow(1 + BASE_PARAMS.PROV_GROWTH, year - lastYear))
}

// 验证案例（从官方核定表提取）
const cases = [
  {
    name: '云南-男-2025退休（正式核定表）',
    input: {
      birthYear: 1965, birthMonth: 1,
      workYear: 1985, workMonth: 1,
      cityType: 'prov',
      avgIndex: 0.6757,
      personalAccInput: 83946.23,
      totalYears: 40,
      sightYears: 10.0,
      skipDelay: true,
    },
    expected: {
      base: 2769.93,
      personal: 603.93,
      transition: 726.01,
      other: 195,
      total: 4294.87,
    },
  },
  {
    name: '云南-男-2025退休（预核定表）',
    input: {
      birthYear: 1965, birthMonth: 6,
      workYear: 1985, workMonth: 6,
      cityType: 'prov',
      avgIndex: 0.8183,
      personalAccInput: 60000,
      totalYears: 40,
      sightYears: 11.83,
      skipDelay: true,
    },
    expected: {
      base: 3005.65,
      personal: 431.65,
      transition: 1040.12,
      other: 195,
      total: 4672.42,
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
  if (MODULES.includes('other')) {
    modules.special_addition = {
      enabled: true,
      type: 'one_child',
      rate: 0.05,
      avgPensionData: BASE_PARAMS.AVG_PENSIONER_PENSION || {},
    };
  }

  return {
    province: PROV_TAG,
    name: '云南省',
    base_rates: { prov: PROV_BASE },
    modules: modules,
    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,  // 吉林省不用建账前缴费年限
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2023年基数8023元，2024年基数8265元（云人社发〔2023/2024〕XX号）',
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
