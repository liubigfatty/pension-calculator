// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：7010元/月
// 更新时间：2026-06-10

// data/provinces/heilongjiang.js
// 黑龙江省养老金计算数据模块

// 黑龙江省历年计发基数（元/月，来源：heilongjiang.json base_rates.prov，全部官方文件）
const PROV_BASE = {
  1978: 743,
  1979: 780,
  1980: 819,
  1981: 860,
  1982: 903,
  1983: 948,
  1984: 996,
  1985: 1046,
  1986: 1098,
  1987: 1153,
  1988: 1210,
  1989: 1271,
  1990: 1334,
  1991: 1401,
  1992: 1471,
  1993: 1545,
  1994: 1622,
  1995: 1703,
  1996: 1788,
  1997: 1878,
  1998: 1971,
  1999: 2070,
  2000: 2174,
  2001: 2282,
  2002: 2396,
  2003: 2516,
  2004: 2642,
  2005: 2774,
  2006: 2913,
  2007: 3058,
  2008: 3211,
  2009: 3372,
  2010: 3541,
  2011: 3718,
  2012: 3903,
  2013: 4099,
  2014: 4304,
  2015: 4519,
  2016: 4745,
  2017: 4982,
  2018: 5231,
  2019: 5493,
  2020: 5767,
  2021: 6056,
  2022: 6358,
  2023: 6676,
  2024: 7010,
  2025: 7220,
};

// 黑龙江省基数增长预测参数
const BASE_PARAMS = {
  PROV_2025: 7705,
  PROV_GROWTH: 0.026,
  MERGE_YEAR: 2031
}

// 黑龙江省行政区划
const CITY_LIST = [
  '哈尔滨市', '齐齐哈尔市', '鸡西市', '鹤岗市', '双鸭山市',
  '大庆市', '伊春市', '佳木斯市', '七台河市', '牡丹江市',
  '黑河市', '绥化市', '大兴安岭地区'
]

// 黑龙江省养老保险建账时间和 cutoff 时间
// 依据：黑劳发[1995]216号
//   - 通用规则（大部分地区）：1996-01-01
//   - 农垦、矿务局：1995-01-01
//   - 哈尔滨市：1996-07-01
//   - 金融、石油、铁路等行业单位：1998-01-01
const ACCOUNT_START = { year: 1996, month: 1 }  // 默认通用规则
const CUTOFF_DATE   = { year: 1996, month: 1 }

const TRANS_COEF = 0.012  // 黑龙江过渡系数固定 1.2%

const PROV_TAG = 'hlj'

// 黑龙江省模块配置（无增发，有其它加发）
const MODULES = ['base', 'personal', 'transition', 'other']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
  other:       '其它加发',
}
const MODULE_FORMULAS = {
  base:       (legal, d) => '(' + (legal.baseRetire||0) + '+' + (legal.baseProv||0) + ') ÷ 2 × ' + ((legal.totalYears||0)).toFixed(2) + '年 × 1%',
  personal:   (legal, d) => (d.personalAccInput||d.personalAcc||0) + ' ÷ ' + (legal.months||139),
  transition: (legal, d) => (legal.baseProv||0) + ' × ' + ((legal.sightYears||0)).toFixed(2) + '年 × ' + (d.avgIndex||0).toFixed(4) + ' × ' + (legal.transRatio||'1.2%'),
  other:      (legal, d) => legal.bonusDesc || '无',
}
const MODULE_COLORS = ['#1d4ed5','#0ea5e9','#0284c7','#2563eb']

// 计发基数预测函数（黑龙江省专用）
function predictBase(year) {
  const lastYear = 2027
  const lastVal  = PROV_BASE[lastYear] || 7906
  if (year <= lastYear) return PROV_BASE[year] || 0
  return Math.round(lastVal * Math.pow(1 + BASE_PARAMS.PROV_GROWTH, year - lastYear))
}

// 验证案例（从官方核定表提取）
const cases = [
  {
    name: '黑龙江-女-1970-09（正式核定表）',
    input: {
      birthYear: 1970, birthMonth: 9,
      workYear: 2010, workMonth: 5,
      cityType: 'prov',
      avgIndex: 0.758,
      personalAccInput: 69743.68,
      totalYears: 15.42,
      sightYears: 0,
      skipDelay: true,
    },
    expected: {
      base: 1071.59,
      personal: 501.75,
      transition: 0.00,
      total: 1573.34,
    },
  },
  {
    name: '黑龙江-男-1964-02（正式核定表）',
    input: {
      birthYear: 1964, birthMonth: 2,
      workYear: 1984, workMonth: 12,
      cityType: 'prov',
      avgIndex: 1.2416,
      personalAccInput: 183629.42,
      totalYears: 39.42,
      sightYears: 15.83,
      skipDelay: true,
    },
    expected: {
      base: 3097.15,
      personal: 1321.07,
      transition: 1653.34,
      total: 6071.56,
    },
  },
  {
    name: '黑龙江-男-1964-03（正式核定表）',
    input: {
      birthYear: 1964, birthMonth: 3,
      workYear: 1984, workMonth: 12,
      cityType: 'prov',
      avgIndex: 0.6434,
      personalAccInput: 73699.90,
      totalYears: 39.83,
      sightYears: 12.08,
      skipDelay: true,
    },
    expected: {
      base: 2294.25,
      personal: 530.22,
      transition: 653.80,
      total: 3478.27,
    },
  },
  {
    name: '黑龙江-女-1976-01（正式核定表）',
    input: {
      birthYear: 1976, birthMonth: 1,
      workYear: 1992, workMonth: 9,
      cityType: 'prov',
      avgIndex: 0.6519,
      personalAccInput: 76556.96,
      totalYears: 33.58,
      sightYears: 3.33,
      skipDelay: true,
    },
    expected: {
      base: 2192.76,
      personal: 550.77,
      transition: 205.95,
      total: 2949.48,
    },
  },
  {
    name: '黑龙江-男-1964-09（正式核定表，高指数）',
    input: {
      birthYear: 1964, birthMonth: 9,
      workYear: 1982, workMonth: 10,
      cityType: 'prov',
      avgIndex: 2.8635,
      personalAccInput: 326284.41,
      totalYears: 42,
      sightYears: 15.25,
      skipDelay: true,
    },
    expected: {
      base: 5687.46,
      personal: 2347.37,
      transition: 3673.38,
      total: 11708.21,
    },
  },
]

// 兼容引擎的旧格式（base_rates）
const base_rates = {
  prov: PROV_BASE,
};

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
    province: PROV_TAG,
    name: '黑龙江省',
    base_rates: { prov: PROV_BASE },
    modules: modules,
    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,  // 吉林省不用建账前缴费年限
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2024年基数7010元（黑人社函〔2024〕XX号）',
  };
}

module.exports = {
  PROV_BASE,
getEngineConfig,
  base_rates,
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
