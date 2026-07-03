// 数据来源：✅ 官方数据（用户提供吉林省历年社平工资表）
// 2024年计发基数：7178.5元/月
// 更新时间：2026-06-18

// data/provinces/jilin.js
// 吉林省养老金计算数据模块

// 全省历年计发基数（元/月）
// 来源：吉林省历年社平工资表（1995-2024年官方数据）
const USE_PRE_ACCOUNT_YEARS = false;  // 吉林省不用建账前缴费年限
const NOTES = '';  // 吉林省无特殊说明
const PROV_BASE = {
  // 1978-1994: 暂无官方数据（待补充），沿用旧估算值
  1978: 761,
  1979: 799,
  1980: 839,
  1981: 881,
  1982: 925,
  1983: 971,
  1984: 1020,
  1985: 1071,
  1986: 1124,
  1987: 1180,
  1988: 1239,
  1989: 1301,
  1990: 1366,
  1991: 1435,
  1992: 1507,
  1993: 1582,
  1994: 1661,
  // 1995-2024: ✅ 官方社平工资数据（用户提供）
  1995: 369.17,
  1996: 447.5,
  1997: 472,
  1998: 545.92,
  1999: 596.5,
  2000: 660.33,
  2001: 730.92,
  2002: 832.5,
  2003: 923.42,
  2004: 1035.92,
  2005: 1200.75,
  2006: 1381.92,
  2007: 1709.42,
  2008: 1957.17,
  2009: 2185.83,
  2010: 2499.92,
  2011: 2849.75,
  2012: 3200.58,
  2013: 3570.5,
  2014: 3876.33,
  2015: 4296.5,
  2016: 4674.83,
  2017: 5120.92,
  2018: 5711.08,
  2019: 6151.08,
  2020: 5088.42,
  2021: 6004.75,
  2022: 6384.83,
  2023: 6655.33,
  2024: 7178.5,
  // 2025: 待更新
  2025: 7322.08,
};

// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/jilin.json avg_salary_history（2020-2024 已÷12 转为元/月）
const AVG_SALARY_HISTORY = {
  1995: 369.17,
  1996: 447.5,
  1997: 472,
  1998: 545.92,
  1999: 596.5,
  2000: 660.33,
  2001: 730.92,
  2002: 832.5,
  2003: 923.42,
  2004: 1035.92,
  2005: 1200.75,
  2006: 1381.92,
  2007: 1709.42,
  2008: 1957.17,
  2009: 2185.83,
  2010: 2449.92,
  2011: 2849.75,
  2012: 3200.58,
  2013: 3570.5,
  2014: 3876.33,
  2015: 4296.5,
  2016: 4674.83,
  2017: 5120.92,
  2018: 5711.08,
  2019: 6151.08,
  2020: 6004.75,
  2021: 6384.83,
  2022: 6655.33,
  2023: 7178.5,
  2024: 7178.5,
  2025: 7322.08,
  2026: 7642.79,
};

// 长春市历年计发基数（元/月，2020年起单列）
const CC_BASE = {
  2020: 6605.23, 2021: 6605.23, 2022: 7023.31, 2023: 7320.86, 2024: 7852.58, 2025: 7978.25
}

// 吉林省基数增长预测参数
const BASE_PARAMS = {
  CC_2025: 7978.25,
  PROV_2025: 7322.08,
  CC_GROWTH: 0.026,
  PROV_GROWTH: 0.0438,
  MERGE_YEAR: 2031
}

// 吉林省行政区划
const CITY_LIST = [
  '长春市', '吉林市', '四平市', '辽源市', '通化市',
  '白山市', '松原市', '白城市', '延边州'
]

// 吉林省养老保险建账时间和 cutoff 时间
const ACCOUNT_START = { year: 1995, month: 7 }  // 依据：吉政发[1995]18号
const CUTOFF_DATE   = { year: 1995, month: 6 }   // 视同缴费截止 1995-06


// 吉林用分段系数，由引擎计算，此处设 null
const TRANS_COEF = {
  base: 0.014,
  alt: 0.012,
  get(currentActualYears) {
    return currentActualYears > 20 ? this.base : this.alt;
  }
}

// 吉林省增发养老金参数（吉政发〔1998〕28号）
const EXTRA_PARAMS = {
  trigger: { type: 'actual_years', threshold: 20 },
  brackets: [
    { from: 21, to: 25, rate: 0.0015, years: 5 },
    { from: 26, to: 30, rate: 0.0020, years: 5 },
    { from: 31, to: null, rate: 0.0025, years: null }  // 无上限段，动态计算
  ]
};

const PROV_TAG = 'jilin'

// 默认模块配置（吉林省，有增发，无其它加发）
const MODULES = ['base', 'extra', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  extra:       '基础养老金增发部分',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}
const MODULE_FORMULAS = {
  base:       (legal, d) => '(' + (legal.baseRetire||0) + '+' + (legal.baseProv||0) + ') ÷ 2 × ' + ((legal.totalYears||0)).toFixed(2) + '年 × 1%',
  extra:      (legal, d) => '实际缴费年限>20年部分，分段增发（0.15%/0.20%/0.25%）',
  personal:   (legal, d) => (d.personalAccInput||d.personalAcc||0) + ' ÷ ' + (legal.months||139),
  transition: (legal, d) => (legal.baseProv||0) + ' × ' + ((legal.sightYears||0)).toFixed(2) + '年 × ' + (d.avgIndex||0).toFixed(4) + ' × ' + (legal.transRatio||'1.2%'),
}
const MODULE_COLORS = ['#1d4ed5','#0369a1','#0ea5e9','#0284c7']

// 计发基数预测函数（吉林省专用）
function predictBase(year, cityType) {
  // 2031年起长春/全省合并，用全省基数（不再区分cityType）
  if (year >= BASE_PARAMS.MERGE_YEAR) {
    const lastYear = 2025
    const lastVal  = PROV_BASE[lastYear] || 7322.08
    if (year <= lastYear) return PROV_BASE[year] || 0
    return Math.round(lastVal * Math.pow(1 + BASE_PARAMS.PROV_GROWTH, year - lastYear))
  }
  // 2031年前：长春/全省分开预测
  if (cityType === 'cc') {
    const lastYear = 2025
    const lastVal  = CC_BASE[lastYear] || 7978.25
    if (year <= lastYear) return CC_BASE[year] || 0
    return Math.round(lastVal * Math.pow(1 + BASE_PARAMS.CC_GROWTH, year - lastYear))
  }
  // 全省（非长春）
  const lastYear = 2025
  const lastVal  = PROV_BASE[lastYear] || 7322.08
  if (year <= lastYear) return PROV_BASE[year] || 0
  return Math.round(lastVal * Math.pow(1 + BASE_PARAMS.PROV_GROWTH, year - lastYear))
}

// 验证案例（从官方核定表提取）
const cases = [
  {
    name: '长春-男-1966-02（预核定表）',
    input: {
      birthYear: 1966, birthMonth: 2,
      workYear: 1984, workMonth: 10,
      cityType: 'cc',
      avgIndex: 0.62,
      personalAccInput: 96750.01,
      totalYears: 41.67,
      sightYears: 11,
      skipDelay: true,
    },
    expected: {
      base: 2608.11,
      extra: 292.14,
      personal: 696.04,
      transition: 699.11,
      total: 4295.40,
    },
  },
  {
    name: '吉林-女-1976-02（预核定表）',
    input: {
      birthYear: 1976, birthMonth: 2,
      workYear: 2008, workMonth: 6,
      cityType: 'prov',
      avgIndex: 0.75,
      personalAccInput: 112406.89,
      totalYears: 31,
      sightYears: 0.33,
      skipDelay: true,
      months: 195,
    },
    expected: {
      base: 1986.11,
      extra: 128.14,
      personal: 576.45,
      transition: 25.37,
      total: 2716.07,
    },
  },
  {
    name: '通化-男-2025-08（正式核定表）',
    input: {
      birthYear: 1965, birthMonth: 1,
      workYear: 1980, workMonth: 1,
      cityType: 'prov',
      avgIndex: 0.46,
      personalAccInput: 83944.83,
      totalYears: 44.42,
      sightYears: 15.25,
      skipDelay: true,
    },
    expected: {
      base: 2374.30,
      extra: 286.23,
      personal: 603.92,
      transition: 719.10,
      total: 3983.55,
    },
  },
  {
    name: '吉林-男-1965-06（正式核定表）',
    input: {
      birthYear: 1965, birthMonth: 6,
      workYear: 1984, workMonth: 10,
      cityType: 'prov',
      avgIndex: 1.74,
      personalAccInput: 241504.89,
      totalYears: 40.75,
      sightYears: 10.75,
      skipDelay: true,
    },
    expected: {
      base: 4087.73,
      extra: 445.13,
      personal: 1737.45,
      transition: 1917.43,
      total: 8187.74,
    },
  },
  {
    name: '长春-男-1965-03（预核定表）',
    input: {
      birthYear: 1965, birthMonth: 3,
      workYear: 1982, workMonth: 12,
      cityType: 'cc',
      avgIndex: 0.60,
      personalAccInput: 84719.28,
      totalYears: 42.33,
      sightYears: 12.58,
      skipDelay: true,
    },
    expected: {
      base: 2618.43,
      extra: 298.93,
      personal: 609.49,
      transition: 773.74,
      total: 4300.59,
    },
  },
]


// ==========================================
// 引擎配置接口（将 JS 模块格式转换为引擎格式）
// ==========================================
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
    name: '吉林省',
    base_rates: {
      prov: PROV_BASE,
      ...(CC_BASE ? { cc: CC_BASE, '长春': CC_BASE, changchun: CC_BASE } : {}),
    },
    avg_salary_history: AVG_SALARY_HISTORY,
    modules: modules,
    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,  // 吉林省不用建账前缴费年限
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: NOTES || '',
  };
}

module.exports = {
  PROV_BASE,
  CC_BASE,
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
  EXTRA_PARAMS,
  cases,
  getEngineConfig,
  predictBase,
}
