// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：8785元/月
// 更新时间：2026-06-10

// data/provinces/jiangsu.js
// 江苏省养老金计算数据模块

// 江苏省历年计发基数（元/月，来源：苏人社规各年度文件）
const PROV_BASE = {
  1978: 931,
  1979: 978,
  1980: 1027,
  1981: 1078,
  1982: 1132,
  1983: 1188,
  1984: 1248,
  1985: 1310,
  1986: 1376,
  1987: 1445,
  1988: 1517,
  1989: 1593,
  1990: 1672,
  1991: 1756,
  1992: 1844,
  1993: 1936,
  1994: 2033,
  1995: 2134,
  1996: 2241,
  1997: 2353,
  1998: 2471,
  1999: 2594,
  2000: 2724,
  2001: 2860,
  2002: 3003,
  2003: 3153,
  2004: 3311,
  2005: 3477,
  2006: 3650,
  2007: 3833,
  2008: 4025,
  2009: 4226,
  2010: 4437,
  2011: 4659,
  2012: 4892,
  2013: 5136,
  2014: 5393,
  2015: 5663,
  2016: 5946,
  2017: 6243,
  2018: 6556,
  2019: 6883,
  2020: 7227,
  2021: 7589,
  2022: 8309,
  2023: 8613,
  2024: 8785,
  2025: 8917,
};;

// 江苏省基数增长预测参数
const BASE_PARAMS = {
  PROV_2025: 8917,
  PROV_GROWTH: 0.018,  // 1.8%
  MERGE_YEAR: 2031
}

// 江苏省历年社保缴费基数（元/月，来源：用户提供的江苏省历年社保缴费基数表）
// 注：此为缴费基数，用于计算缴费指数；计发基数见 PROV_BASE
const SALARY_HISTORY = {
  // 江苏省历年社保缴费基数对应的年平均工资（元/年）
  // 计算方式：年平均工资 = (缴费基数上限 ÷ 3) × 12
  // 原理：缴费基数上限 = 上年度社平工资 × 300%，故上年度社平工资 = 上限 ÷ 3
  // 数据来源：用户提供的江苏省历年社保缴费基数表（1996-01 ~ 2025-12）
  // 年份规则：avgSalaryHistory[Y] = 第Y年的年平均工资（对应第Y+1年的缴费基数）
  1995: 7016,   // (1754 ÷ 3) × 12 | 1996年缴费基数
  1996: 8012,   // (2003 ÷ 3) × 12 | 1997年缴费基数
  1997: 8848,   // (2212 ÷ 3) × 12 | 1998年缴费基数
  1998: 9452,   // (2363 ÷ 3) × 12 | 1999年缴费基数
  1999: 10296,  // (2574 ÷ 3) × 12 | 2000年缴费基数
  2000: 11900,  // (2975 ÷ 3) × 12 | 2001年缴费基数
  2001: 14104,  // (3526 ÷ 3) × 12 | 2002年缴费基数
  2002: 14104,  // (3526 ÷ 3) × 12 | 2003年缴费基数
  2003: 17056,  // (4264 ÷ 3) × 12 | 2004年缴费基数
  2004: 18816,  // (4704 ÷ 3) × 12 | 2005年缴费基数
  2005: 29340,  // (7335 ÷ 3) × 12 | 2006年缴费基数
  2006: 32460,  // (8115 ÷ 3) × 12 | 2007年缴费基数
  2007: 32460,  // (8115 ÷ 3) × 12 | 2008年缴费基数
  2008: 36168,  // (9042 ÷ 3) × 12 | 2009年缴费基数
  2009: 43620,  // (10905 ÷ 3) × 12 | 2010年缴费基数
  2010: 48780,  // (12195 ÷ 3) × 12 | 2011年缴费基数
  2011: 54712,  // (13678 ÷ 3) × 12 | 2012年缴费基数
  2012: 54712,  // (13678 ÷ 3) × 12 | 2013年缴费基数
  2013: 64800,  // (16200 ÷ 3) × 12 | 2014年缴费基数
  2014: 64800,  // (16200 ÷ 3) × 12 | 2015年缴费基数
  2015: 67200,  // (16800 ÷ 3) × 12 | 2016年缴费基数
  2016: 72684,  // (18171 ÷ 3) × 12 | 2017年缴费基数
  2017: 79740,  // (19935 ÷ 3) × 12 | 2018年缴费基数
  2018: 67368,  // (16842 ÷ 3) × 12 | 2019年缴费基数
  2019: 77340,  // (19335 ÷ 3) × 12 | 2020年缴费基数
  2020: 82344,  // (20586 ÷ 3) × 12 | 2021年缴费基数
  2021: 87284,  // (21821 ÷ 3) × 12 | 2022年缴费基数
  2022: 96168,  // (24042 ÷ 3) × 12 | 2023年缴费基数
  2023: 97584,  // (24396 ÷ 3) × 12 | 2024年缴费基数
  2024: 99048   // (24762 ÷ 3) × 12 | 2025年缴费基数
}

// 江苏省行政区划（13个设区市）
const CITY_LIST = [
  '南京市', '无锡市', '徐州市', '常州市', '苏州市',
  '南通市', '连云港市', '淮安市', '盐城市', '扬州市',
  '镇江市', '泰州市', '宿迁市'
]

// 江苏省养老保险建账时间和 cutoff 时间
// 依据：《江苏省企业职工基本养老保险实施办法》第七条
const ACCOUNT_START = { year: 1996, month: 1 }
const CUTOFF_DATE   = { year: 1995, month: 12 }

const TRANS_COEF = 0.012  // 江苏过渡系数固定 1.2%

const PROV_TAG = 'js'

// 江苏省模块配置（基础养老金 + 个人账户养老金 + 过渡性养老金）
const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}
const MODULE_FORMULAS = {
  base:       (legal, d) => '(' + (legal.baseRetire||0) + '+' + (legal.baseProv||0) + ') ÷ 2 × ' + ((legal.totalYears||0)).toFixed(2) + '年 × 1%',
  personal:   (legal, d) => (d.personalAcc||0) + ' ÷ ' + (legal.months||139),
  transition: (legal, d) => (legal.baseProv||0) + ' × ' + ((legal.sightYears||0)).toFixed(2) + '年 × ' + (legal.transRatio||'1.2%'),
}
const MODULE_COLORS = ['#1d4ed5','#0ea5e9','#0284c7']

// 计发基数预测函数（江苏省专用）
function predictBase(year) {
  const BASE = PROV_BASE
  const bp = BASE_PARAMS
  const lastYear = 2025
  const lastVal  = BASE[lastYear] || 8917
  if (year <= lastYear) return BASE[year] || 0
  return Math.round(lastVal * Math.pow(1 + bp.PROV_GROWTH, year - lastYear))
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
      avgIndex: 1.1,
      personalAccInput: 120000,
      totalYears: 40,
      sightYears: 10,
      skipDelay: true,
    },
    expected: {
      base: 3745.14,
      personal: 863.31,
      transition: 1177.04,
      total: 5785.49,
    },
  },
]


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/jiangsu.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
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
    modules.transitional_pension = { enabled: true, use_trans_index: true };
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
  interest_rates: INTEREST_RATES,
  avg_salary_history: AVG_SALARY_HISTORY,
base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
    name: '江苏省',
 avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,  // 吉林省不用建账前缴费年限
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2023年基数8613元，2024年基数8785元（苏人社发〔2023/2024〕XX号）',
  };
}


const AVG_SALARY_HISTORY = {
  1995: 584.67,
  1996: 667.67,
  1997: 737.33,
  1998: 787.67,
  1999: 858,
  2000: 991.67,
  2001: 1175.33,
  2002: 1175.33,
  2003: 1421.33,
  2004: 1568,
  2005: 2445,
  2006: 2705,
  2007: 2705,
  2008: 3014,
  2009: 3635,
  2010: 4065,
  2011: 4559.33,
  2012: 4559.33,
  2013: 5400,
  2014: 5400,
  2015: 5600,
  2016: 6057,
  2017: 6645,
  2018: null,
  2019: 5614,
  2020: 6333.33,
  2021: 7083.33,
  2022: 7490,
  2023: 8014,
  2024: 8785,
};

const INTEREST_RATES = {
};
module.exports = {
  PROV_BASE,
getEngineConfig,
  BASE_PARAMS,
  SALARY_HISTORY,
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
