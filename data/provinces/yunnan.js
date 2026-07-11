// 数据来源：✅ 官方数据（用户提供的云南省历年社平工资表）
// 2024年计发基数：7177元/月
// 更新时间：2026-06-18

// data/provinces/yunnan.js
// 云南省养老金计算数据模块

// 全省历年计发基数（元/月）
// 来源：云南省历年社平工资表（1995-2024年官方数据）
const PROV_BASE = {
  1995: 429,
  1996: 519,
  1997: 586,
  1998: 639,
  1999: 690,
  2000: 769,
  2001: 878,
  2002: 999,
  2003: 1073,
  2004: 1215,
  2005: 1345,
  2006: 1559,
  2007: 1707,
  2008: 2003,
  2009: 2250,
  2010: 2515,
  2011: 2949,
  2012: 3242,
  2013: 3682,
  2014: 3984,
  2015: 4585,
  2016: 5297,
  2017: 6126,
  2018: 6126,
  2019: 6710,
  2020: 7095,
  2021: 7455,
  2022: 7767,
  2023: 8023,
  2024: 8183,
   2025: 8183,  // 2025年计发基数尚未公布，预发暂用2024年基数8183（待公布后重新核算）
};














;

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.026,
  // 全省退休人员人均养老金（元/月），用于计算独生子女补贴
  AVG_PENSIONER_PENSION: {
    2021: 3158,
    2022: 3293,
    2023: 3431,  // 真实表确认：2023年全省退休人员月平均基本养老金3431元
    2024: 3431,  // 2024年尚未公布，预发暂用2023年值
    2025: 3431,  // 2025年尚未公布，预发暂用2023年值
    // 预测值（按约5%年增长）
    2026: 4100,
    2027: 4300,
    2028: 4520,
    2029: 4750,
    2030: 4990,
  },
  PROV_2025: 8183,  // 2025年计发基数尚未公布，预发暂用2024年基数8183
};
















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
  interest_rates: INTEREST_RATES,
  avg_salary_history: AVG_SALARY_HISTORY,    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
    name: '云南省',
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,  // 吉林省不用建账前缴费年限
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2023年基数8023元，2024年基数8265元（云人社发〔2023/2024〕XX号）',
  };
}


const AVG_SALARY_HISTORY = {
  1995: 429,
  1996: 519,
  1997: 586,
  1998: 639,
  1999: 690,
  2000: 769,
  2001: 878,
  2002: 999,
  2003: 1073,
  2004: 1215,
  2005: 1345,
  2006: 1559,
  2007: 1707,
  2008: 2003,
  2009: 2250,
  2010: 2515,
  2011: 2949,
  2012: 3242,
  2013: 3682,
  2014: 3984,
  2015: 4585,
  2016: 5297,
  2017: 6126,
  2018: 6126,
  2019: 6710,
  2020: 6284,
  2021: 6622,
  2022: 6906,
  2023: 7177,
  2024: 8183,
  2025: 8183,
};

const INTEREST_RATES = {
  1995: 0.025,
  1996: 0.025,
  1997: 0.025,
  1998: 0.025,
  1999: 0.025,
  2000: 0.025,
  2001: 0.025,
  2002: 0.025,
  2003: 0.025,
  2004: 0.025,
  2005: 0.0226,
  2006: 0.025,
  2007: 0.025,
  2008: 0.0393,
  2009: 0.0225,
  2010: 0.0325,
  2011: 0.0325,
  2012: 0.025,
  2013: 0.0325,
  2014: 0.025,
  2015: 0.025,
};
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
