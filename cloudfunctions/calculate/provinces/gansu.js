// 数据来源：✅ 官方数据
// 2024年计发基数：7594元/月
// 更新时间：2026-06-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/gansu.js
// ==================== 字段定义（_definitions）====================
// 修改本文件前，先读以下语义与"索引年"口径，避免社平年/计发年错位（本项目历史高频 bug）：
//   PROV_BASE[Y]           使用年/退休年 → Y 年计发基数（元/月）。[注意]黑龙江特例：下标=社平年（见该省注释）。
//   AVG_SALARY_HISTORY[Y]  社平年/统计年 → Y 年度官方社平工资（元/月）。
//   BASE_PARAMS           { PROV_GROWTH, MERGE_YEAR, PROV_YYYY } 外推参数。
//   MODULES/MODULE_LABELS 养老金分项模块开关 / 中文标签。
//   CITY_LIST             本省城市清单（仅用于城市选择，不代表有独立基数）。
//   TRANS_COEF            过渡系数。
//   PROV_TAG/ACCOUNT_START 省份标识 / 建账时间。
//   formula_type          公式类型（见手册 5.6）。
// 核心等式：某年计发基数 = 上一年社平工资（如 2024社平→2025计发基数；2025社平7705→2026计发/缴费基数）。
// 未发布年份不写固定值，由引擎 getBase() 按 GROWTH_RATE（默认2%）外推产生。
// 各省特有城市级常量（CC_BASE/SY_BASE/DL_BASE/SHENZHEN_BASE/ZHENGZHOU_BASE/XIZANG_SUBSIDIES/CONTRIB_BASE_TIERS 等）均有独立行内注释。
// ==============================================================

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
  1995: 457.75,
  1996: 490.17,
  1997: 515.17,
  1998: 534.83,
  1999: 577.33,
  2000: 659.42,
  2001: 764.75,
  2002: 856,
  2003: 951.58,
  2004: 1135.25,
  2005: 1244.92,
  2006: 1437.17,
  2007: 1748.92,
  2008: 2001.42,
  2009: 2264.75,
  2010: 2465.67,
  2011: 2742.17,
  2012: 3203.33,
  2013: 3675.75,
  2014: 4039.17,
  2015: 4537.83,
  2016: 4962.42,
  2017: 5477.17,
  2018: 6142,
  2019: 5155.75,
  2020: 6474,
  2021: 6791,
  2022: 7077,
  2023: 7359,
  2024: 7594,
   2025: 7746,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};;

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.026,
  account_start: 1996,
  trans_coef: 0.012,
  PROV_2025: 7338,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
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


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/gansu.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

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
  avg_salary_history: AVG_SALARY_HISTORY,
base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
    name: '甘肃省',
 avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,  // 吉林省不用建账前缴费年限
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '官方数据(用户提供)：2023缴费基数6861/计发基数7359，2024缴费基数7194/计发基数7594，2025缴费基数7338(计发基数未公布沿用7594)',
  };
}


const AVG_SALARY_HISTORY = {
  1995: 457.75,
  1996: 490.17,
  1997: 515.17,
  1998: 534.83,
  1999: 577.33,
  2000: 659.42,
  2001: 764.75,
  2002: 856,
  2003: 951.58,
  2004: 1059.25,
  2005: 1181,
  2006: 1380.42,
  2007: 1679.75,
  2008: 1941.75,
  2009: 2214.75,
  2010: 2465.67,
  2011: 2742.17,
  2012: 3203.33,
  2013: 3675.75,
  2014: 4039.17,
  2015: 4537.83,
  2016: 4962.42,
  2017: 5477.17,
  2018: 6142,
  2019: 5155.75,
  2020: 6063,
  2021: 6400,
  2022: 6816,
  2023: 7194,
  2024: 7338,
  2025: 7729,  // 2025年度社保缴费基数·2024全口径社平（官方已发布，人社通汇总）
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
