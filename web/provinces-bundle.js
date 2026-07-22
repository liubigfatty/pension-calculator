// AUTO-GENERATED — 请勿手改，改省份配置后重跑 scripts/build-web.js
window.PROVINCE_CONFIGS = {};
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：✅ 官方数据
// 2024年计发基数：7842元/月
// 更新时间：2026-06-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/anhui.js
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

// 安徽省养老金计算数据模块（框架版，待补充官方数据）
// TODO：补充官方计发基数、过渡系数、建账时间等

const PROV_BASE = {
  1978: 831,
  1979: 873,
  1980: 916,
  1981: 962,
  1982: 1010,
  1983: 1061,
  1984: 1114,
  1985: 1170,
  1986: 1228,
  1987: 1290,
  1988: 1354,
  1989: 1422,
  1990: 1493,
  1991: 1567,
  1992: 1646,
  1993: 1728,
  1994: 1814,
  1995: 1905,
  1996: 2000,
  1997: 2100,
  1998: 2205,
  1999: 2316,
  2000: 2432,
  2001: 2553,
  2002: 2681,
  2003: 2815,
  2004: 2956,
  2005: 3103,
  2006: 3259,
  2007: 3421,
  2008: 3593,
  2009: 3772,
  2010: 3961,
  2011: 4159,
  2012: 4367,
  2013: 4585,
  2014: 4814,
  2015: 5055,
  2016: 5308,
  2017: 5573,
  2018: 5852,
  2019: 6144,
  2020: 6780,
  2021: 7103,
  2022: 7401,
  2023: 7688,
  2024: 7842,
   2025: 7999,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};;

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.03,
  MERGE_YEAR: 2031,
  PROV_2025: 7185,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
}

const CITY_LIST = [
  '合肥市', '芜湖市', '蚌埠市', '淮南市', '马鞍山市',
  '淮北市', '铜陵市', '安庆市', '黄山市', '滁州市',
  '阜阳市', '宿州市', '六安市', '亳州市', '池州市',
  '宣城市',
]

const ACCOUNT_START = { year: 1996, month: 1 }
const CUTOFF_DATE   = { year: 1995, month: 12 }
const TRANS_COEF = 0.013
const PROV_TAG = 'anhui'

const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

const cases = []


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/anhui.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

function getEngineConfig() {
  const modules = {}
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 }
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true }
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true, coefficient: TRANS_COEF }
  }

  return {
    avg_salary_history: AVG_SALARY_HISTORY,
    base_rates: { prov: PROV_BASE },
    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,
    province: PROV_TAG,
    name: '安徽省',
    modules,
  }
}


const AVG_SALARY_HISTORY = {
  1996: 685.83,
  1997: 1321,
  1998: 1258,
  1999: 1321,
  2000: 1397,
  2001: 1456,
  2002: 1550,
  2003: 1873,
  2004: 2061,
  2005: 2419,
  2006: 2912,
  2007: 1496,
  2008: 1848.33,
  2009: 2196.92,
  2010: 2471.5,
  2011: 2861.75,
  2012: 3386.67,
  2013: 3841,
  2014: 3983.83,
  2015: 4365.67,
  2016: 4747.83,
  2017: 5107.42,
  2018: 5660.58,
  2019: 5028.42,
  2020: 5975.14,
  2021: 6386.91,
  2022: 6698.08,
  2023: 7044.38,
  2024: 7185,
  2025: 7426,  // 2025年度社保缴费基数·2024全口径社平（官方已发布，人社通汇总）
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["anhui"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：✅ 官方数据（用户提供北京市历年职工平均工资）
// 2024年计发基数：11883元/月
// 2025年计发基数：12049元/月（2024年度全口径社平144588元/年，表上“上年职工平均工资”÷12）
// 2026年计发基数：未公布；2026年退休者按2025年基数预发，年底公布后重算
// 更新时间：2026-07-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/beijing.js
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

// 北京市养老金计算数据模块

// 北京市历年计发基数（元/月）
// 数据来源：用户提供北京市历年职工平均工资表（2018年后为全口径城镇单位就业人员平均工资）
const PROV_BASE = {
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
  1995: 608.03,
  1996: 701.92,
  1997: 754.12,
  1998: 769.95,
  1999: 845.47,
  2000: 963.77,
  2001: 1087.5,
  2002: 1232.38,
  2003: 1376.05,
  2004: 1582.56,
  2005: 1876.55,
  2006: 2323.38,
  2007: 2760.32,
  2008: 3190.48,
  2009: 3587.3,
  2010: 4075.59,
  2011: 4590.7,
  2012: 5144.48,
  2013: 5757.95,
  2014: 6338.92,
  2015: 7032.14,
  2016: 7680.4,
  2017: 8374.36,
  2018: 7855,
  2019: 9262,
  2020: 9910,
  2021: 10534,
  2022: 11082,
  2023: 11525,
  2024: 11883,
  2025: 12049,  // 2025年计发基数=2024年度全口径社平144588元/年÷12（北京核定表口径）
};;

const BASE_PARAMS = {
  PROV_GROWTH: 0.03,    // 3.0%
  LATEST_BASE_YEAR: 2025,
  LATEST_BASE_VALUE: 12049,  // 2025年官方值（2024年度全口径社平144588元/年÷12）
  PROV_2025: 12049,  // 2025年计发基数=2024年度全口径社平
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


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/beijing.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
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
    modules.transitional_pension = { enabled: true, formula_type: 'beijing' };
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
    name: '北京市',
    base_rates: { prov: PROV_BASE },
    avg_salary_history: AVG_SALARY_HISTORY,
    modules: modules,
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2024年基数11883元，2025年基数12049元（2024年度全口径社平144588元/年÷12）；2026年基数未公布，退休者按2025年基数预发'
  };
}


const AVG_SALARY_HISTORY = {
  1995: 608,
  1996: 701.92,
  1997: 754.08,
  1998: 769.92,
  1999: 845.5,
  2000: 963.75,
  2001: 1087.5,
  2002: 1232.42,
  2003: 1376.08,
  2004: 1582.58,
  2005: 1876.58,
  2006: 2323.42,
  2007: 2760.33,
  2008: 3190.5,
  2009: 3587.33,
  2010: 4075.58,
  2011: 4590.67,
  2012: 5144.5,
  2013: 5757.92,
  2014: 6338.92,
  2015: 7032.17,
  2016: 7680.42,
  2017: 8374.33,
  2018: 7855,
  2019: 9262,
  2020: 9407,
  2021: 10628,
  2022: 11297,
  2023: 11761,
  2024: 11937,
  // 2025: 官方全口径未公布，交由引擎预发年规则外推(=2024原值)，公布后再填
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

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["beijing"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：8160元/月
// 更新时间：2026-06-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/chongqing.js
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

// 重庆市养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 865,
  1979: 908,
  1980: 954,
  1981: 1001,
  1982: 1051,
  1983: 1104,
  1984: 1159,
  1985: 1217,
  1986: 1278,
  1987: 1342,
  1988: 1409,
  1989: 1479,
  1990: 1553,
  1991: 1631,
  1992: 1713,
  1993: 1798,
  1994: 1888,
  1995: 1982,
  1996: 2082,
  1997: 2186,
  1998: 2295,
  1999: 2410,
  2000: 2530,
  2001: 2657,
  2002: 2789,
  2003: 2929,
  2004: 3075,
  2005: 3229,
  2006: 3391,
  2007: 3560,
  2008: 3738,
  2009: 3925,
  2010: 4121,
  2011: 4327,
  2012: 4544,
  2013: 4252,
  2014: 5488,
  2015: 5174,
  2016: 5616,
  2017: 6106,
  2018: 5439,
  2019: 6577,
  2020: 7155,
  2021: 7438,
  2022: 7750,
  2023: 7988,
  2024: 8160,
   2025: 8240,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};;

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031,
  PROV_2025: 7339,  // 2025年全口径社平=2024全口径社平(7339)；2025计发基数见PROV_BASE[2025]=8240
}

// ==================== 城市列表 ====================

const CITY_LIST = []

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.014  // 重庆市过渡系数 1.4%(渝办发〔2006〕205号)

const PROV_TAG = 'chongqing'

// ==================== 模块配置 ====================

const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

// ==================== 测试案例 ====================

const cases = [
  // 案例1：待用户提供官方核定表
  // 案例2：待用户提供官方核定表
]

// ==================== 引擎配置 ====================


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/chongqing.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

function getEngineConfig() {
  const modules = {};
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true };
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF;
      }
    }
  }

  return {
  avg_salary_history: AVG_SALARY_HISTORY,
base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
 avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '⚠️ 2023-2025年基数待官方文件确认',
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  1991: 275,
  1992: 220.75,
  1993: 262.08,
  1994: 355.17,
  1995: 404.17,
  1996: 447.92,
  1997: 458.5,
  1998: 475.83,
  1999: 525,
  2000: 581.67,
  2001: 695,
  2002: 821.92,
  2003: 1036.67,
  2004: 1196.42,
  2005: 1385.83,
  2006: 1601.25,
  2007: 1924.83,
  2008: 2248.75,
  2009: 2580.42,
  2010: 2943.83,
  2011: 3336.83,
  2012: 3782.67,
  2013: 4251.25,
  2014: 4737.67,
  2015: 5174.25,
  2016: 5616,
  2017: 6106,
  2018: 5469,
  2019: 5819,
  2020: 6165,
  2021: 6594.42,
  2022: 6862.33,
  2023: 7264.08,
  2024: 7339,
  // 2025: 官方全口径未公布，交由引擎预发年规则外推(=2024原值)，公布后再填
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["chongqing"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：✅ 官方数据
// 2024年计发基数：7776元/月
// 更新时间：2026-06-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/fujian.js
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

// 福建省养老金计算数据模块
// TODO：补充1995-2023年官方计发基数（目前只有2024-2025年数据）
// 依据：闽人社规〔2024〕?号、闽人社规〔2025〕?号

// ==================== 基础数据 ====================

// 福建省历年计发基数（元/月）
// 2024-2025来自官方数据，其余年份待补充
const PROV_BASE = {
  1978: 824,
  1979: 865,
  1980: 909,
  1981: 954,
  1982: 1002,
  1983: 1052,
  1984: 1105,
  1985: 1160,
  1986: 1218,
  1987: 1279,
  1988: 1343,
  1989: 1410,
  1990: 1480,
  1991: 1554,
  1992: 1632,
  1993: 1714,
  1994: 1799,
  1995: 423.67,
  1996: 525.92,
  1997: 619.42,
  1998: 710.92,
  1999: 790.83,
  2000: 882,
  2001: 1001.08,
  2002: 1108.83,
  2003: 1192.5,
  2004: 1300.25,
  2005: 1428.83,
  2006: 1609.83,
  2007: 1856.92,
  2008: 2141.83,
  2009: 2388.83,
  2010: 2720.58,
  2011: 3249.08,
  2012: 3748.25,
  2013: 4110.67,
  2014: 4519.58,
  2015: 4893.25,
  2016: 5261.5,
  2017: 5752.42,
  2018: 6355.5,
  2019: 7031.17,
  2020: 6699,
  2021: 6933,
  2022: 7238,
  2023: 7528,
  2024: 7776,
   2025: 7932,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};;

// 福建省基数增长预测参数
const BASE_PARAMS = {
  
  PROV_GROWTH: 0.02,  // 约2%年增速
  MERGE_YEAR: 2031,
  PROV_2025: 7535,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
}

// 福建省城市列表（地级市）
const CITY_LIST = [
  '福州市', '厦门市', '泉州市', '漳州市', '莆田市',
  '三明市', '南平市', '龙岩市', '宁德市',
]

// ==================== 核心规则 ====================

// 福建省养老保险建账时间和 cutoff 时间
// TODO：确认官方建账时间（暂参照大多数省份设1998-01）
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.013  // 福建过渡系数约1.3%（核定表备注"约1.3%"；待官方文件编号确认）
// TODO：补充官方文件编号（如：闽政发〔2006〕XX号）

const PROV_TAG = 'fujian'

// 福建省模块配置（有基础养老金 + 个人账户养老金 + 过渡性养老金）
const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

// ==================== 测试案例 ====================

// TODO：添加至少2个官方核定表案例
// 案例来源必须是官方核定表，不能AI自己编
const cases = [
  // 案例1：待添加（需官方核定表）
  // 案例2：待添加（需官方核定表）
]

// ==================== 引擎配置 ====================


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/fujian.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

function getEngineConfig() {
  const modules = {};
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true };
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF;
      }
    }
  }

  return {
  avg_salary_history: AVG_SALARY_HISTORY,
base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
 avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '福建过渡系数约1.3%（核定表备注）；基础养老金与过渡性养老金均使用平均缴费指数(单指数)。',
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  1978: 47.17,
  1979: 49.42,
  1980: 55.67,
  1981: 58,
  1982: 61.67,
  1983: 68,
  1984: 75.17,
  1985: 79.25,
  1986: 97.25,
  1987: 100.5,
  1988: 108.33,
  1989: 132.83,
  1990: 181.42,
  1991: 194.83,
  1992: 218.75,
  1993: 251.33,
  1994: 325.25,
  1995: 423.67,
  1996: 525.92,
  1997: 619.42,
  1998: 710.92,
  1999: 790.83,
  2000: 882,
  2001: 1001.08,
  2002: 1108.83,
  2003: 1192.5,
  2004: 1300.25,
  2005: 1428.83,
  2006: 1609.83,
  2007: 1856.92,
  2008: 2141.83,
  2009: 2388.83,
  2010: 2720.58,
  2011: 3249.08,
  2012: 3748.25,
  2013: 4110.67,
  2014: 4519.58,
  2015: 4893.25,
  2016: 5261.5,
  2017: 5752.42,
  2018: 6355.5,
  2019: 7031.17,
  2020: 6126.42,
  2021: 6654,
  2022: 7020,
  2023: 7388,
  2024: 7535,
  2025: 7770,  // 2025年度社保缴费基数·2024全口径社平（官方已发布，人社通汇总）
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["fujian"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
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
   2025: 7746,  // 2025年计发基数=7746（2026-01退休核定表确认；2025-05退休时尚未公布，暂按2024基数7594预发）
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
    notes: '官方数据(用户提供)：2023缴费基数6861/计发基数7359，2024缴费基数7194/计发基数7594，2025缴费基数7338/计发基数7746（2026-01退休核定表确认；2025-05退休时尚未公布，暂按2024基数7594预发）',
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

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["gansu"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：✅ 官方数据
// 2024年计发基数：9307元/月
// 更新时间：2026-06-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/guangdong.js
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

// 广东省养老金计算数据模块
// TODO：补充1995-2021年官方计发基数（目前只有2022-2025年官方数据）
// 依据：粤人社发〔2022〕33号、粤人社发〔2023〕?号、粤人社发〔2024〕34号、粤人社发〔2025〕32号

// ==================== 基础数据 ====================

// 广东省历年计发基数（元/月）
// 数据来源：用户提供近十年平均工资表（2026-06-18）
// 注：2018年以后为全口径城镇单位就业人员平均工资
const PROV_BASE = {
  1978: 987,
  1979: 1036,
  1980: 1088,
  1981: 1142,
  1982: 1199,
  1983: 1259,
  1984: 1322,
  1985: 1388,
  1986: 1458,
  1987: 1530,
  1988: 1607,
  1989: 1687,
  1990: 1772,
  1991: 1860,
  1992: 1953,
  1993: 2051,
  1994: 2153,
  1995: 2261,
  1996: 2374,
  1997: 2493,
  1998: 2618,
  1999: 2748,
  2000: 2886,
  2001: 3030,
  2002: 3182,
  2003: 3341,
  2004: 3508,
  2005: 3683,
  2006: 3867,
  2007: 4061,
  2008: 4264,
  2009: 4477,
  2010: 4701,
  2011: 4936,
  2012: 5182,
  2013: 4443.17,
  2014: 4956.75,
  2015: 5482.33,
  2016: 6071,
  2017: 6598.58,
  2018: 6338,
  2019: 6756,
  2020: 7860,
  2021: 8332,
  2022: 8682,
  2023: 9028,
  2024: 9307,
   2025: 9493,  // 粤人社发〔2025〕32号：2025年全省计发基数9493元/月(2025-01-01至12-31)
};;

// 深圳市单独计发基数（深人社发〔2024〕57号、〔2023〕?号）
// 机关事业单位按全省基数执行，此处为企业职工基数
const SHENZHEN_BASE = {
  2020: 9774,  // 深人社发〔2021〕48号：深圳2020企业职工计发基数
  2021: 10360, // 深人社发〔2022〕4号：深圳2021企业职工计发基数
  2022: 10795, // 深人社发〔2022〕51号：深圳2022企业职工计发基数
  2023: 10795, // 深人社发〔2023〕?号
  2024: 11181, // 深人社发〔2024〕57号（企业）
  2025: 11293, // 深圳2025企业职工计发基数；粤人社发〔2025〕32号明确"深圳市计发基数另行公布"，深圳人社局2025-11-17官网问答确认11293元/月
};

// 深圳市独立社平工资（元/月，用于计算深圳参保人缴费指数）
// 数据来源：深圳市历年社平工资表（社保年度口径，用户2026-07-21提供，1990–2020）
// 口径说明：表按"社保年度"发布（如社保年度1998 = 1998.07–1999.06），
//   实务中近似映射为自然年使用（即"X年社平"对应社保年度X）。
// ⚠️ 2021–2024 深圳社平官方表待补充，引擎将按 GROWTH_RATE 从2020=9309外推。
const SHENZHEN_AVG_SALARY = {
  1990: 322,
  1991: 359,
  1992: 418,
  1993: 494,
  1994: 679,
  1995: 881,
  1996: 1023,
  1997: 1209,
  1998: 1378,
  1999: 1532,
  2000: 1726,
  2001: 1920,
  2002: 2162,
  2003: 2352,
  2004: 2551,
  2005: 2661,
  2006: 2706,
  2007: 2926,
  2008: 3233,
  2009: 3621,
  2010: 3894,
  2011: 4205,
  2012: 4595,
  2013: 4918,
  2014: 5218,
  2015: 6054,
  2016: 6753,
  2017: 7480,
  2018: 8348,
  2019: 9309,
  2020: 9309,  // 社保年度2020(2020.07-2021.06)，官方表截断显示93xx，按延续值9309
  // 以下2021–2024由深圳计发基数倒推（计发基数=退休上年全口径社平，粤人社发/深人社文件背书）：
  //   2022计发基数10795→2021社平；2023计发基数10795→2022社平；2024计发基数11181→2023社平；2025计发基数11293→2024社平
  2021: 10795,
  2022: 10795,
  2023: 11181,
  2024: 11293,
}

// 广东省历年平均工资（元/月，用于计算缴费指数）
// 数据来源：用户提供近十年平均工资表（2026-06-18）
// 注：2018年以后为全口径城镇单位就业人员平均工资
// 结构：{ prov: 全省社平, shenzhen/'深圳': 深圳独立社平 }
//   —— 深圳参保人必须用深圳社平算指数（深圳社平显著高于全省，早期高40–67%），
//      否则指数偏低→养老金偏低。getBase() 城市级查找已支持本结构。


// 广东省1993年底前"视同缴费指数"查表（粤府函〔2021〕294号 附表一、二）
// 数据来源：《1994国家统计年鉴》《1994年广东省统计年鉴》《1994年广东农村统计年鉴》
// 用途：具有1993年底前视同缴费年限（或1993年底前实际缴费）的参保人，
//       其视同缴费指数(D)按本表查找；引擎在 transIndex 未注入时自动查表。
// 键名规则：地级市用简称（与引擎 CITY_NORMALIZE 一致），同时保留全称键；
//         区县用表中原名（含"市/县"后缀，因1993年行政区划与今不同）。
// 默认行为：用户选地级市时用地级市"平均"行 D 值；精确区县需额外传入 district。
// 附注：现云浮市区、云安区（原云安县）采用本表原云浮市标准。
const GUANGDONG_SIGHT_INDEX_MAP = {
  // ── 全省基准 ──
  '全省': 1.000,
  '省直': 1.327,
  '省农垦': 0.610,

  // ── 广州市（平均 1.191）─────────────────────────────────────
  '广州': 1.191,   '广州市': 1.191,
  '广州市区': 1.201,
  '花都市': 0.962,    // 今花都区
  '增城市': 1.021,    // 今增城区
  '番禺市': 1.305,    // 今番禺区
  '从化县': 0.772,    // 今从化区

  // ── 深圳市（平均 1.529）─────────────────────────────────────
  '深圳': 1.529,   '深圳市': 1.529,
  '深圳市区': 1.565,
  '宝安区': 1.087,
  '龙岗区': 1.602,

  // ── 珠海市（平均 1.389）─────────────────────────────────────
  '珠海': 1.389,   '珠海市': 1.389,
  '珠海市区': 1.441,
  '斗门县': 1.087,    // 今斗门区

  // ── 汕头市（平均 0.821）─────────────────────────────────────
  '汕头': 0.821,   '汕头市': 0.821,
  '汕头市区': 0.909,
  '澄阳市': 0.551,    // 今澄海区（原澄海市）
  '澄海县': 0.570,
  '南澳县': 0.597,

  // ── 韶关市（平均 0.836）─────────────────────────────────────
  '韶关': 0.836,   '韶关市': 0.836,
  '韶关市区': 0.946,
  '仁化县': 0.768,
  '南雄县': 0.693,
  '始兴县': 0.658,
  '翁源县': 0.693,
  '新丰县': 0.690,
  '曲江县': 0.749,    // 今曲江区
  '乳源县': 0.771,
  '乐昌县': 0.748,    // 今乐昌市

  // ── 河源市（平均 0.512）─────────────────────────────────────
  '河源': 0.512,   '河源市': 0.512,
  '河源市区': 0.614,  // 今源城区
  '和平县': 0.451,
  '龙川县': 0.444,
  '紫金县': 0.499,
  '连平县': 0.535,
  '东源县': 0.555,

  // ── 梅州市（平均 0.638）─────────────────────────────────────
  '梅州': 0.638,   '梅州市': 0.638,
  '梅州市区': 0.729,  // 今梅江区
  '梅县': 0.677,      // 今梅县区
  '蕉岭县': 0.687,
  '大埔县': 0.578,
  '丰顺县': 0.550,
  '五华县': 0.621,
  '兴宁县': 0.598,    // 今兴宁市
  '平远县': 0.605,

  // ── 惠州市（平均 0.961）─────────────────────────────────────
  '惠州': 0.961,   '惠州市': 0.961,
  '惠州市区': 1.101,  // ⭐ 核定表 D=1.101 来源！
  '惠东县': 0.911,
  '惠阳县': 0.974,    // 今惠阳区
  '博罗县': 0.770,
  '龙门县': 0.636,

  // ── 汕尾市（平均 0.584）─────────────────────────────────────
  '汕尾': 0.584,   '汕尾市': 0.584,
  '汕尾市区': 0.689,  // 今城区
  '海丰县': 0.589,
  '陆河县': 0.598,
  '陆丰县': 0.515,    // 今陆丰市

  // ── 东莞市 ─────────────────────────────────────────────────
  '东莞': 1.169,   '东莞市': 1.169,

  // ── 中山市（平均 0.963）─────────────────────────────────────
  '中山': 0.963,   '中山市': 0.963,
  '中山市区': 1.076,

  // ── 江门市（新会市区 1.066）────────────────────────────────
  '江门': 1.066,   '江门市': 1.066,
  '新会市': 1.066,    // 今新会区
  '台山市': 0.932,
  '开平市': 0.760,
  '鹤山市': 0.933,
  '恩平县': 0.862,    // 今恩平市

  // ── 佛山市（平均 1.304）─────────────────────────────────────
  '佛山': 1.304,   '佛山市': 1.304,
  '佛山市区': 1.378,
  '南海市': 1.316,    // 今南海区
  '顺德市': 1.359,    // 今顺德区
  '三水市': 1.110,    // 今三水区
  '高明县': 0.934,    // 今高明区

  // ── 阳江市（平均 0.678）─────────────────────────────────────
  '阳江': 0.678,   '阳江市': 0.678,
  '阳江市区': 0.704,
  '阳东县': 0.598,    // 今阳东区
  '阳西县': 0.594,
  '阳春县': 0.698,    // 今阳春市

  // ── 湛江市（平均 0.742）─────────────────────────────────────
  '湛江': 0.742,   '湛江市': 0.742,
  '湛江市区': 0.905,
  '廉江市': 0.570,
  '吴川市': 0.605,
  '徐闻县': 0.648,
  '海康县': 0.583,    // 今雷州市
  '遂溪县': 0.726,

  // ── 茂名市（平均 0.712）─────────────────────────────────────
  '茂名': 0.712,   '茂名市': 0.712,
  '茂名市区': 1.028,
  '高州市': 0.627,
  '信宜县': 0.611,
  '电白县': 0.496,
  '化州县': 0.538,    // 今化州市

  // ── 肇庆市（平均 0.761）─────────────────────────────────────
  '肇庆': 0.761,   '肇庆市': 0.761,
  '肇庆市区': 0.941,
  '高要市': 0.770,
  '四会市': 0.573,
  '广宁县': 0.640,
  '德庆县': 0.667,
  '封开县': 0.635,
  '怀集县': 0.606,

  // ── 云浮市 ─────────────────────────────────────────────────
  '云浮': 0.902,   '云浮市': 0.902,
  '罗定市': 0.737,
  '郁南县': 0.659,
  '新兴县': 0.725,

  // ── 清远市（平均 0.725）─────────────────────────────────────
  '清远': 0.725,   '清远市': 0.725,
  '清远市区': 0.743,  // 今清城区
  '清新县': 0.705,    // 今清新区
  '英德县': 0.792,    // 今英德市
  '佛冈县': 0.698,
  '连山县': 0.717,    // 今连山壮族瑶族自治县
  '连南县': 0.632,    // 今连南瑶族自治县
  '连县': 0.675,      // 今连州市
  '阳县': 0.678,      // 阳山县

  // ── 潮州市（平均 0.602）─────────────────────────────────────
  '潮州': 0.602,   '潮州市': 0.602,
  '潮州市区': 0.638,
  '饶平县': 0.541,
  '潮安县': 0.584,    // 今潮安区

  // ── 揭阳市（平均 0.546）─────────────────────────────────────
  '揭阳': 0.546,   '揭阳市': 0.546,
  '揭阳市区': 0.610,
  '普宁市': 0.659,
  '揭东县': 0.515,    // 今揭东区
  '惠来县': 0.436,
  '揭西县': 0.452,
}

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.040,  // 约 4.0%/年
  MERGE_YEAR: 2031,
  PROV_2025: 9183,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
}

// 广东省城市列表（地级市）
// 注：深圳市单列计发基数已由粤人社发〔2025〕32号确认("深圳市计发基数另行公布")，SHENZHEN_BASE 为深圳自行公布值
const CITY_LIST = [
  '广州市', '深圳市', '珠海市', '东莞市', '佛山市',
  '中山市', '惠州市', '江门市', '肇庆市', '汕头市',
  '潮州市', '揭阳市', '汕尾市', '湛江市', '茂名市',
  '阳江市', '云浮市', '韶关市', '清远市', '梅州市',
  '河源市',
]

// ==================== 核心规则 ====================

// 广东省养老保险建账时间和 cutoff 时间
// ⚠️ 待确认：建账时间（目前按1998-01估算，待官方文件确认）
// ⚠️ 待确认：视同缴费cutoff时间（目前按1997-12估算，待官方文件确认）
// TODO：搜索关键词"粤人社规 个人账户建立 1998"或"粤府〔2006〕XX号 养老保险办法"
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.012  // 广东过渡系数固定 1.2%（待官方文件确认）
// TODO：补充官方文件编号（如：粤府〔2006〕XX号）

const PROV_TAG = 'guangdong'

// 广东省模块配置（有基础养老金 + 个人账户养老金 + 过渡性养老金）
const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

// ==================== 测试案例 ====================

// TODO：添加至少2个官方核定表案例
// 案例来源必须是官方核定表，不能AI自己编
const cases = [
  // 案例1：待添加（需官方核定表）
  // 案例2：待添加（需官方核定表）
]

// ==================== 引擎配置 ====================

function getEngineConfig() {
  return {
  avg_salary_history: AVG_SALARY_HISTORY,
account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    name: '广东省',
    base_rates: {
      prov: PROV_BASE,
      shenzhen: SHENZHEN_BASE,
    },
    avg_salary_history: AVG_SALARY_HISTORY,
    modules: {
      basic_pension: { enabled: true, formula_type: 'guangdong', rate_per_year: 0.01 },
      personal_account: { enabled: true },
      transitional_pension: { enabled: true, formula_type: 'guangdong', coefficient: 0.012, old_transition_coefficient: 120 },
      special_addition: { enabled: false },
      adjustment_fund: { enabled: true, type: 'shenzhen', tiers: { 2021: 250, 2022: 200, 2023: 150, 2024: 50, 2025: 0 } },
    },
    // 广东视同缴费指数查表（粤府函〔2021〕294号 附表一/二）
    // 引擎在 transIndex 未注入时按 city 自动查表取 D 值
    sight_index_map: GUANGDONG_SIGHT_INDEX_MAP,

    // 深圳市独立体系：城市级模块覆盖（仅 city==='sz' 时生效）
    sz_modules: {
      basic_pension: { enabled: true, rate_per_year: 0.01, formula_type: 'shenzhen' },
      transitional_pension: { enabled: true, formula_type: 'shenzhen', coefficient: 0.012 },
      special_addition: { enabled: true, type: 'shenzhen_local' },
    },
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  prov: {
    1994: 529,
    1995: 619.67,
    1996: 712.42,
    1997: 786.92,
    1998: 847,
    1999: 926.08,
    2000: 1031.17,
    2001: 1165.08,
    2002: 1301.42,
    2003: 1494.92,
    2004: 1736.5,
    2005: 1865.33,
    2006: 2077.58,
    2007: 2302.33,
    2008: 2523.33,
    2009: 2706.58,
    2010: 3016.92,
    2011: 3401.5,
    2012: 3803.08,
    2013: 4259.75,
    2014: 4668.17,
    2015: 5324.33,
    2016: 5962.58,
    2017: 6711.58,
    2018: 6320.17,
    2019: 6524.5,
    2020: 7647,
    2021: 8310,
    2022: 8807,
    2023: 9167,
    2024: 9183,
    // 2025: 官方全口径未公布，交由引擎预发年规则外推(=2024原值)，公布后再填
  },
  shenzhen: SHENZHEN_AVG_SALARY,
  '深圳': SHENZHEN_AVG_SALARY,
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["guangdong"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：6847元/月
// 更新时间：2026-06-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/guangxi.js
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

// 广西壮族自治区养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 726,
  1979: 762,
  1980: 800,
  1981: 840,
  1982: 882,
  1983: 926,
  1984: 973,
  1985: 1021,
  1986: 1072,
  1987: 1126,
  1988: 1182,
  1989: 1241,
  1990: 1303,
  1991: 1369,
  1992: 1437,
  1993: 1509,
  1994: 1584,
  1995: 1663,
  1996: 1747,
  1997: 1834,
  1998: 1926,
  1999: 2022,
  2000: 2123,
  2001: 2229,
  2002: 2341,
  2003: 2458,
  2004: 2581,
  2005: 2710,
  2006: 2845,
  2007: 2987,
  2008: 3137,
  2009: 3294,
  2010: 3458,
  2011: 3631,
  2012: 3813,
  2013: 4003,
  2014: 4203,
  2015: 4414,
  2016: 4634,
  2017: 4866,
  2018: 5109,
  2019: 5365,
  2020: 5889,
  2021: 6184,
  2022: 6442,
  2023: 6629,
  2024: 6847,
   2025: 6983,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};;

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031,
  PROV_2025: 6905,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
}

// ==================== 城市列表 ====================

const CITY_LIST = [
  '南宁',
  '柳州',
  '桂林',
  '梧州',
  '北海',
  '防城港',
  '钦州',
  '贵港',
  '玉林',
  '百色',
  '贺州',
  '河池',
  '来宾',
  '崇左'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1996, month: 7 }
const CUTOFF_DATE   = { year: 1996, month: 6 }

const TRANS_COEF = 0.014  // 广西壮族自治区过渡系数 1.4000000000000001%

const PROV_TAG = 'guangxi'

// ==================== 模块配置 ====================

const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

// ==================== 测试案例 ====================

const cases = [
  // 案例1：待用户提供官方核定表
  // 案例2：待用户提供官方核定表
]

// ==================== 引擎配置 ====================


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/guangxi.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

function getEngineConfig() {
  const modules = {};
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true };
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF;
      }
    }
  }

  return {
  avg_salary_history: AVG_SALARY_HISTORY,
base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
 avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: true,
    round_to_jiao: true,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '⚠️ 2023-2025年基数待官方文件确认',
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  1995: 425.42,
  1996: 449.75,
  1997: 461.67,
  1998: 517.33,
  1999: 564.67,
  2000: 637.58,
  2001: 756.25,
  2002: 839.5,
  2003: 996.08,
  2004: 1131.58,
  2005: 1288.42,
  2006: 1505.33,
  2007: 1824.83,
  2008: 2138.33,
  2009: 2358.5,
  2010: 2653.5,
  2011: 2838.67,
  2012: 3134.5,
  2013: 3553.08,
  2014: 3903.83,
  2015: 4581.92,
  2016: 5019.92,
  2017: 5538,
  2018: 5883.83,
  2019: 6373.25,
  2020: 5819,
  2021: 6197,
  2022: 6439,
  2023: 6756,
  2024: 6905,
  // 2025: 官方全口径未公布，交由引擎预发年规则外推(=2024原值)，公布后再填
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["guangxi"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：7272元/月
// 更新时间：2026-06-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/guizhou.js
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

// 贵州省养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 771,
  1979: 809,
  1980: 850,
  1981: 892,
  1982: 937,
  1983: 984,
  1984: 1033,
  1985: 1085,
  1986: 1139,
  1987: 1196,
  1988: 1256,
  1989: 1318,
  1990: 1384,
  1991: 1453,
  1992: 1526,
  1993: 1602,
  1994: 1683,
  1995: 1767,
  1996: 1855,
  1997: 1948,
  1998: 2045,
  1999: 2147,
  2000: 2255,
  2001: 2368,
  2002: 2486,
  2003: 2610,
  2004: 2741,
  2005: 2878,
  2006: 3022,
  2007: 3173,
  2008: 3331,
  2009: 3498,
  2010: 3673,
  2011: 3856,
  2012: 4049,
  2013: 4252,
  2014: 4464,
  2015: 4688,
  2016: 4922,
  2017: 5168,
  2018: 5426,
  2019: 5698,
  2020: 6009.42,
  2021: 6378.92,
  2022: 6798,
  2023: 6857.58,
  2024: 7272,
   2025: 7324.5,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};;

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031,
  PROV_2025: 7324.5,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
}

// ==================== 城市列表 ====================

const CITY_LIST = [
  '贵阳',
  '六盘水',
  '遵义',
  '安顺',
  '毕节',
  '铜仁'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.014  // 贵州省过渡系数 1.4%（黔劳社厅发〔2006〕20号；备份核定表 transition_coefficient=0.014）

const PROV_TAG = 'guizhou'

// ==================== 模块配置 ====================

const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

// ==================== 测试案例 ====================

const cases = [
  // 案例1：待用户提供官方核定表
  // 案例2：待用户提供官方核定表
]

// ==================== 引擎配置 ====================


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/guizhou.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

function getEngineConfig() {
  const modules = {};
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true };
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF;
      }
    }
  }
  // 贵州独生子女父母退休奖励：5% × (基础+个人+过渡)，依据黔劳社厅发〔2006〕20号
  modules.special_addition = {
    enabled: true,
    type: 'one_child',
    rate: 0.05,
  };

  return {
  avg_salary_history: AVG_SALARY_HISTORY,
base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
 avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: true,  // 贵州过渡性养老金按建账前缴费年限计（工作起始→1998-01建账），非仅视同年限
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2023年基数6857.58元（黔人社通〔2024〕53号），2024年基数7272元（黔人社发〔2025〕16号）；过渡系数1.4%（黔劳社厅发〔2006〕20号）；独生子女奖励5%×(基础+个人+过渡)。',
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  1990: 172.5,
  1991: 174.17,
  1992: 200.5,
  1993: 322.5,
  1994: 322.5,
  1995: 372.92,
  1996: 409.75,
  1997: 433.92,
  1998: 481.25,
  1999: 582.92,
  2000: 622.33,
  2001: 749.17,
  2002: 817.5,
  2003: 919.75,
  2004: 1035.92,
  2005: 1195.33,
  2006: 1401.25,
  2007: 1722.33,
  2008: 2050.17,
  2009: 2353.75,
  2010: 2621.5,
  2011: 2809,
  2012: 3199.67,
  2013: 3648.83,
  2014: 3955.5,
  2015: 4492,
  2016: 5011.58,
  2017: 5243.67,
  2018: 5632.67,
  2019: 6009.42,
  2020: 6378.92,
  2021: 6797.5,
  2022: 6857.58,
  2023: 7272.25,
  2024: 7324.5,
  // 2025: 官方全口径未公布，交由引擎预发年规则外推(=2024原值)，公布后再填
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["guizhou"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：8131元/月
// 更新时间：2026-06-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/hainan.js
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

// 海南省养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 862,
  1979: 905,
  1980: 950,
  1981: 998,
  1982: 1048,
  1983: 1100,
  1984: 1155,
  1985: 1213,
  1986: 1273,
  1987: 1337,
  1988: 1404,
  1989: 1474,
  1990: 1548,
  1991: 1625,
  1992: 1706,
  1993: 1792,
  1994: 1881,
  1995: 1975,
  1996: 2074,
  1997: 2178,
  1998: 2287,
  1999: 2401,
  2000: 617,
  2001: 693,
  2002: 790,
  2003: 866,
  2004: 1054,
  2005: 1201,
  2006: 1324,
  2007: 1613,
  2008: 1822,
  2009: 2078,
  2010: 2585,
  2011: 3060,
  2012: 3338,
  2013: 3798,
  2014: 4216,
  2015: 4867,
  2016: 5214,
  2017: 5755,
  2018: 6473,
  2019: 7055,
  2020: 6829,
  2021: 7169,
  2022: 7599,
  2023: 8050,
  2024: 8131,
   2025: 8188,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};;

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031,
  PROV_2025: 8188,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
}

// ==================== 城市列表 ====================

const CITY_LIST = [
  '海口',
  '三亚',
  '三沙',
  '儋州'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.014  // 海南省过渡系数 1.4%（琼府〔2022〕40号）

const PROV_TAG = 'hainan'

// ==================== 模块配置 ====================

const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

// ==================== 测试案例 ====================

const cases = [
  // 案例1：待用户提供官方核定表
  // 案例2：待用户提供官方核定表
]

// ==================== 引擎配置 ====================


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/hainan.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

function getEngineConfig() {
  const modules = {};
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true };
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF;
      }
    }
  }

  return {
  avg_salary_history: AVG_SALARY_HISTORY,
base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
 avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: true,  // 海南过渡性养老金使用1997年底前实际缴费年限+视同缴费年限
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '⚠️ 2023-2025年基数待官方文件确认',
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  1998: 520,
  1999: 572,
  2000: 617,
  2001: 693,
  2002: 790,
  2003: 866,
  2004: 1054,
  2005: 1201,
  2006: 1324,
  2007: 1613,
  2008: 1822,
  2009: 2078,
  2010: 2585,
  2011: 3060,
  2012: 3338,
  2013: 3798,
  2014: 4216,
  2015: 4867,
  2016: 5214,
  2017: 5755,
  2018: 6473,
  2019: 7055,
  2020: 6543,
  2021: 7486,
  2022: 8050,
  2023: 8131,
  2024: 8188,
  // 2025: 官方全口径未公布，交由引擎预发年规则外推(=2024原值)，公布后再填
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["hainan"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：7265元/月
// 更新时间：2026-06-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/hebei.js
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

// 河北省养老金计算数据模块（框架版，待补充官方数据）
// TODO：补充官方计发基数、过渡系数、建账时间等

const PROV_BASE = {
  1978: 770,
  1979: 809,
  1980: 849,
  1981: 891,
  1982: 936,
  1983: 983,
  1984: 1032,
  1985: 1084,
  1986: 1138,
  1987: 1195,
  1988: 1254,
  1989: 1317,
  1990: 1383,
  1991: 1452,
  1992: 1525,
  1993: 1601,
  1994: 1681,
  1995: 1765,
  1996: 1853,
  1997: 1946,
  1998: 2043,
  1999: 2145,
  2000: 2253,
  2001: 2365,
  2002: 2484,
  2003: 2608,
  2004: 2738,
  2005: 2875,
  2006: 3019,
  2007: 3170,
  2008: 3328,
  2009: 3495,
  2010: 3669,
  2011: 3853,
  2012: 4045,
  2013: 4248,
  2014: 4460,
  2015: 4683,
  2016: 4917,
  2017: 5163,
  2018: 5421,
  2019: 5692,
  2020: 6291,
  2021: 6575,
  2022: 6849,
  2023: 7122,
  2024: 7265,
   2025: 7410,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};;

const BASE_PARAMS = {
  PROV_GROWTH: 0.03,
  MERGE_YEAR: 2031,
  PROV_2025: 7410,  // 2025年保定真实核定表（待全省官方文件）
}

const CITY_LIST = [
  '石家庄市', '唐山市', '秦皇岛市', '邯郸市', '邢台市',
  '保定市', '张家口市', '承德市', '沧州市', '廊坊市',
  '衡水市',
]

const ACCOUNT_START = { year: 1996, month: 1 }
const CUTOFF_DATE   = { year: 1995, month: 12 }
const TRANS_COEF = 0.013
const PROV_TAG = 'hebei'

const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

const cases = []


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/hebei.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

function getEngineConfig() {
  const modules = {}
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 }
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true }
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true, formula_type: 'hebei' }
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF
      }
    }
  }

  return {
    avg_salary_history: AVG_SALARY_HISTORY,
    base_rates: { prov: PROV_BASE },
    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,
    province: PROV_TAG,
    name: '河北省',
    modules,
  }
}


const AVG_SALARY_HISTORY = {
  1993: 252.83,
  1994: 348.75,
  1995: 403.25,
  1996: 440.5,
  1997: 474.33,
  1998: 485,
  1999: 535,
  2000: 586.92,
  2001: 655.33,
  2002: 746.58,
  2003: 932.42,
  2004: 1077,
  2005: 1225.58,
  2006: 1382.5,
  2007: 1659.25,
  2008: 2063,
  2009: 2365.25,
  2010: 2692.17,
  2011: 3013.83,
  2012: 3295.17,
  2013: 3544.33,
  2014: 3853.25,
  2015: 4367.42,
  2016: 4748.92,
  2017: 5438.83,
  2018: 5969.42,
  2019: 5078.08,
  2020: 5409.17,
  2021: 5788.75,
  2022: 6211.08,
  2023: 6534.25,
  2024: 6678,
  2025: 6794,  // 2025年保定真实核定表（待全省官方文件）
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["hebei"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：7010元/月
// 更新时间：2026-06-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/heilongjiang.js
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

// 黑龙江省养老金计算数据模块

// 黑龙江省历年计发基数（元/月，来源：用户提供的黑龙江省社平工资表，全部官方文件）
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
  1992: 191,
  1993: 222,
  1994: 281,
  1995: 345,
  1996: 380,
  1997: 407,
  1998: 520,
  1999: 591,
  2000: 653,
  2001: 743,
  2002: 819,
  2003: 920,
  2004: 1046,
  2005: 1205,
  2006: 1375,
  2007: 1614,
  2008: 1814,
  2009: 2031,
  2010: 2278,
  2011: 2541,
  2012: 2843,
  2013: 3181,
  2014: 3558,
  2015: 3920,
  2016: 4315,
  2017: 4645,
  2018: 4608,
  2019: 4835,
  2020: 5120,
  2021: 5865,
  2022: 6430,
  2023: 7010,
  2024: 7570,
  2025: 7705,
  2027: 7906,
};;

// 黑龙江省基数增长预测参数
const BASE_PARAMS = {
  
  PROV_GROWTH: 0.026,
  MERGE_YEAR: 2031,
  PROV_2025: 7705,  // 2025年计发基数=2025年预发基数（2026-01退休核定表确认上年全省平均工资7705元）
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
//   - 农垦、矿务局：1995-01-01（农垦计发基数执行省平，不单独建模，按用户 2026-07-12 决定）
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


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/heilongjiang.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
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
    name: '黑龙江省',
 avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,  // 吉林省不用建账前缴费年限
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2024年基数7010元（黑人社函〔2024〕XX号）',
  };
}


const AVG_SALARY_HISTORY = {
  1990: 154.17,
  1991: 172.5,
  1992: 191,
  1993: 222,
  1994: 281,
  1995: 345,
  1996: 380,
  1997: 407,
  1998: 520,
  1999: 591,
  2000: 653,
  2001: 743,
  2002: 819,
  2003: 920,
  2004: 1046,
  2005: 1205,
  2006: 1375,
  2007: 1614,
  2008: 1814,
  2009: 2031,
  2010: 2278,
  2011: 2541,
  2012: 2843,
  2013: 3181,
  2014: 3558,
  2015: 3920,
  2016: 4315,
  2017: 4645,
  2018: 4608,
  2019: 4835,
  2020: 5120,
  2021: 5865,
  2022: 6430,
  2023: 7010,
  2024: 7570,
  2025: 7705,
};


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

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["heilongjiang"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：❌ 2024年未公布，使用2025年数据
// 2024年计发基数：6738元/月
// 更新时间：2026-06-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/henan.js
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

// 河南省养老金计算数据模块
// TODO：补充1995-2022年官方计发基数（目前只有2023-2024年数据）
// 依据：豫人社发〔2023〕?号、豫人社发〔2024〕?号、豫人社发〔2025〕61号

// ==================== 基础数据 ====================

// 河南省历年计发基数（元/月）
// 2023-2024来自百度文库（待官方文件确认），其余年份待补充
const PROV_BASE = {
  1978: 714,
  1979: 750,
  1980: 787,
  1981: 827,
  1982: 868,
  1983: 912,
  1984: 957,
  1985: 1005,
  1986: 1055,
  1987: 1108,
  1988: 1163,
  1989: 1222,
  1990: 1283,
  1991: 1347,
  1992: 1414,
  1993: 1485,
  1994: 1559,
  1995: 1637,
  1996: 1719,
  1997: 1805,
  1998: 1895,
  1999: 1990,
  2000: 2089,
  2001: 2194,
  2002: 2303,
  2003: 2419,
  2004: 2539,
  2005: 2666,
  2006: 2800,
  2007: 2940,
  2008: 3087,
  2009: 3241,
  2010: 3403,
  2011: 3573,
  2012: 3752,
  2013: 3940,
  2014: 4137,
  2015: 4343,
  2016: 4561,
  2017: 4789,
  2018: 5028,
  2019: 5279,
  2020: 5635,
  2021: 5907,
  2022: 6155,
  2023: 6401,
  2024: 6606,  // 2024年全省企业计发基数（豫人社发及真实表验证）
  2025: 6738,  // 2025年全省企业计发基数（豫人社发〔2025〕61号及真实表验证）
  2026: 6738,  // 2026年退休暂用2025年全省基数（预发）
};;

// 洛阳市单独计发基数（2023年6457元，洛阳市社保局问政公开回复确认；2024/2025暂用6573，待官方公布）
const LUOYANG_BASE = { ...PROV_BASE };
LUOYANG_BASE[2024] = 6573;  // 2024年洛阳企业在岗职工月平均工资（2025年计发基数）
LUOYANG_BASE[2025] = 6573;  // 2025年洛阳企业计发基数
LUOYANG_BASE[2026] = 6573;  // 2026年退休暂用2025年基数（预发）

// 郑州市单独计发基数（仅用于过渡性养老金 + 郑州过渡性补贴）
// ⚠️ 河南双基数模型：基础养老金用全省 PROV_BASE；过渡性养老金/过渡性补贴用退休地（郑州）本地计发基数
// 注：原 6757 实为"郑州市2024全口径社平"（非计发基数），2026-07-12 核实后更正为本地计发基数
const ZHENGZHOU_BASE = { ...PROV_BASE };
ZHENGZHOU_BASE[2020] = 7290;  // ≈（估算待官方确认）：2021=7454 倒推，TODO 补充官方值
ZHENGZHOU_BASE[2021] = 7454;  // 郑州市2021本地计发基数（联网查证）
ZHENGZHOU_BASE[2022] = 7647;  // 郑州市2022本地计发基数（联网查证）
ZHENGZHOU_BASE[2023] = 7800;  // 郑州市2023本地计发基数（腾讯/法律网/头条核定表多源确认）
ZHENGZHOU_BASE[2024] = 7925;  // 郑州市2024本地计发基数（2025年2月退休真实核定表："郑州市7925元"）
ZHENGZHOU_BASE[2025] = 7933;  // 郑州市2025本地计发基数（引擎 baseRef 验证）
ZHENGZHOU_BASE[2026] = 7933;  // 2026年退休暂用郑州2025本地基数（预发，2026官方未公布）


// 信阳市：6260 已由官方核定表证实（cases/henan/9.json 信阳市本级 2025-10 退休核定表："信阳本地基数6260"，verified=true）。
// 与平顶山同值6260，同属非核心地市低基数档，不再标"疑似误标"。
const XINYANG_BASE = { ...PROV_BASE };
XINYANG_BASE[2024] = 6260;
XINYANG_BASE[2025] = 6260;
XINYANG_BASE[2026] = 6260;  // 2026年退休暂用2025年基数（预发）

// 开封市：6385 已由官方核定表证实为真实本地计发基数（cases/henan/10.json 开封鼓楼 2026-02 退休核定表："开封本地基数6385"，verified=true）。
// 原疑"6385=全省全口径社平2024年值(非计发基数)"不成立——新乡市本级核定表(cases/henan/6.json 等)亦独立证实6385为真实地市计发基数，
// 二者同为河南非核心地市低基数档，各自维护、非误标。
const KAIFFENG_BASE = { ...PROV_BASE };
KAIFFENG_BASE[2024] = 6385;
KAIFFENG_BASE[2025] = 6385;
KAIFFENG_BASE[2026] = 6385;  // 2026年退休暂用2025年基数（预发）

// 平顶山市：6260 元（2024年真实核定表确认：平顶山企业女工退休核定表"本年当地基本养老金计发基数6260元"）
// ⚠️ 与信阳撞值（同为6260），可能河南非核心地市共用此低基数；待更多地市案例交叉验证
const PDS_BASE = { ...PROV_BASE };
PDS_BASE[2024] = 6260;
PDS_BASE[2025] = 6260;   // 2025年退休暂用2024年基数（预发）
PDS_BASE[2026] = 6260;

// 新乡市：6385 元（2026年真实核定表确认：新乡企业女职工退休核定表"上年当地基本养老金计发基数6385元"）
// 注：与开封KAIFFENG_BASE撞值(同为6385)，但为独立城市各自维护
const XINXIANG_BASE = { ...PROV_BASE };
XINXIANG_BASE[2024] = 6385;
XINXIANG_BASE[2025] = 6385;
XINXIANG_BASE[2026] = 6385;  // 2026年退休暂用2025年基数（预发）

// 信阳市：6260（平顶山核定表证实6260为真实地市计发基数，信阳可能同属"非核心地市低基数档"，不再标"疑似误标"）
// 郑州过渡性补贴参数表（郑劳社〔2007〕36号 附表二）
// 查表维度：视同缴费年限（见月进年，取整，非零小数进1）× 过渡性养老金平均指数（保留1位小数，第2位向上进位）
// 已知坐标（均来自真实核定表/官方案例验证）：
//   (sight=1,  idx=0.7)→4.62  [cases/henan/6.json 郑州2025-12，补贴453.51]
//   (sight=5,  idx=0.9)→5.26  [官方案例]
//   (sight=12, idx=2.6)→8.85  [官方案例]
//   (sight=13, idx=0.6)→6.32  [官方案例]
//   (sight=14, idx=0.9)→6.45  [cases/henan/3.json 郑州2024-01，补贴419.9，反推参数6.445取6.45]
// ⚠️ 完整官方附表二尚未获取，当前为稀疏表（仅5个确认坐标）；缺失坐标返回 null 引擎报 warning 并算 0
const ZZ_SUBSIDY_PARAM_TABLE = {
  // 格式：[视同年限][指数字符串] = 参数值
  1:  { '0.7': 4.62 },
  5:  { '0.9': 5.26 },
  12: { '2.6': 8.85 },
  13: { '0.6': 6.32 },
  14: { '0.9': 6.45 },
}

/**
 * 查询郑州过渡性补贴参数
 * @param {number} sightYears - 视同缴费年限（年）
 * @param {number} transIndex - 过渡性养老金平均缴费指数
 * @returns {number|null} 参数值，查不到返回 null
 */
function lookupZZSubsidyParam(sightYears, transIndex) {
  const sightKey = Math.ceil(sightYears)  // 见月进年：非零小数进1
  if (sightKey < 1) return null  // 无视同年限不享受补贴
  // 指数保留1位小数，第2位向上进位
  const idxKey = Math.ceil(transIndex * 10) / 10
  const idxStr = idxKey.toFixed(1)
  return (ZZ_SUBSIDY_PARAM_TABLE[sightKey] || {})[idxStr] || null
}

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.03,  // 约3%年增速
  MERGE_YEAR: 2031,
  PROV_2025: 6738,  // 2025年全省企业计发基数（豫人社发〔2025〕61号及真实表验证）
}

// 河南省城市列表（地级市）
const CITY_LIST = [
  '郑州市', '开封市', '洛阳市', '平顶山市', '安阳市',
  '鹤壁市', '新乡市', '焦作市', '濮阳市', '许昌市',
  '漯河市', '三门峡市', '南阳市', '商丘市', '信阳市',
  '周口市', '驻马店市', '济源市',
]
// 注：焦作市执行省平（无独立计发基数，不单独建模，按用户 2026-07-12 决定）；其余未单列城市同理。

// ==================== 核心规则 ====================

// 河南省养老保险建账时间和 cutoff 时间
// 建账时间官方依据：豫政办〔1995〕74号 附件一第二条一项"从1995年1月起建立个人帐户"；河南省社保中心官网(2023-01-16)、郑州市社保中心均确认 1995-01-01 为视同/实缴分界
// 视同缴费 cutoff：河南走 formula_type:'henan'，视同年限仅由 account_start 判定（见 pension-engine.js L1525）；cutoff_date 河南不读取，设为与建账同值仅作数据整洁
const ACCOUNT_START = { year: 1995, month: 1 }  // 豫政办〔1995〕74号，个人账户建账1995-01（官方坐实）
const CUTOFF_DATE   = { year: 1995, month: 1 }  // 河南无北京式cutoff用法；对齐建账1995-01（2025-07-17核实更正：原1997-12无官方依据）

const TRANS_COEF = 0.013  // 豫政[2006]29号文：1.3%  // 河南过渡系数固定 1.2%（待官方文件确认）
// TODO：补充官方文件编号（如：豫政发〔2006〕XX号）

const PROV_TAG = 'henan'

// 河南省模块配置（有基础养老金 + 个人账户养老金 + 过渡性养老金 + 郑州过渡性补贴）
const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

// ==================== 测试案例 ====================

// TODO：添加至少2个官方核定表案例
// 案例来源必须是官方核定表，不能AI自己编
const cases = [
  // 案例1：待添加（需官方核定表）
  // 案例2：待添加（需官方核定表）
]

// ==================== 引擎配置 ====================


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/henan.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

function getEngineConfig() {
  return {
  avg_salary_history: AVG_SALARY_HISTORY,
account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,
    province: PROV_TAG,
    name: '河南省',
    base_rates: {
      prov: PROV_BASE,
      zhengzhou: ZHENGZHOU_BASE,
      luoyang: LUOYANG_BASE,
      xinyang: XINYANG_BASE,
      kaifeng: KAIFFENG_BASE,
      pingdingshan: PDS_BASE,
      xinxiang: XINXIANG_BASE,
    },
    avg_salary_history: AVG_SALARY_HISTORY,
    lookupZZSubsidyParam: lookupZZSubsidyParam,
    modules: {
      basic_pension: { enabled: true, formula_type: 'henan' },
      transitional_pension: { enabled: true, formula_type: 'henan', coefficient: TRANS_COEF },
      special_addition: { enabled: true, type: 'zhengzhou_subsidy', subsidy_param: 8.85 },
    },
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  1995: 362,
  1996: 410.33,
  1997: 435.42,
  1998: 470.08,
  1999: 511.33,
  2000: 573.08,
  2001: 655.67,
  2002: 809.5,
  2003: 886.58,
  2004: 997.5,
  2005: 1190.17,
  2006: 1415.08,
  2007: 1744.58,
  2008: 2068,
  2009: 2279.75,
  2010: 2525.25,
  2011: 2850.25,
  2012: 3163.17,
  2013: 3233.67,
  2014: 3555.83,
  2015: 3826.67,
  2016: 4169,
  2017: 4666.42,
  2018: 5345.67,
  2019: 5692.08,
  2020: 5328,
  2021: 5681,
  2022: 5965,
  2023: 6260,
  2024: 6385,  // 2024年全省全口径社平（豫人社发及真实表验证）
  // 2025: 官方全口径未公布，交由引擎预发年规则外推(=2024原值)，公布后再填
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
  ZZ_SUBSIDY_PARAM_TABLE,
  lookupZZSubsidyParam,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["henan"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：湖北各地市养老金计发基数官方公布/权威汇总
// 2024/2025年各地市基数取自用户提供的全省汇总表（2026-07-11）
// 2025年省直/武汉计发基数=9112元/月，2024年=9022元/月
// 湖北为省内多城市分别确定计发基数，需使用城市键查询。

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/hubei.js
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

// 湖北省养老金计算数据模块（多城市计发基数版）

const PROV_BASE = {
  1978: 706,
  1979: 742,
  1980: 779,
  1981: 818,
  1982: 859,
  1983: 902,
  1984: 947,
  1985: 994,
  1986: 1044,
  1987: 1096,
  1988: 1151,
  1989: 1208,
  1990: 1269,
  1991: 1332,
  1992: 1399,
  1993: 1469,
  1994: 1542,
  1995: 1619,
  1996: 1700,
  1997: 1785,
  1998: 1874,
  1999: 1968,
  2000: 2067,
  2001: 2170,
  2002: 2278,
  2003: 2392,
  2004: 2512,
  2005: 2638,
  2006: 2769,
  2007: 2908,
  2008: 3053,
  2009: 3206,
  2010: 3366,
  2011: 3535,
  2012: 3711,
  2013: 3897,
  2014: 4092,
  2015: 4296,
  2016: 4511,
  2017: 4737,
  2018: 4974,
  2019: 5222,
  2020: 7753,
  2021: 8125,
  2022: 8531,
  2023: 8880,
  2024: 9022,
  2025: 9112,  // 武汉/省直2025年计发基数（一档城市）
};

// 湖北第二档城市：宜昌、黄石、十堰、襄阳、恩施、荆门、随州
const TIER2_BASE = {
  yichang:   { 2024: 7232, 2025: 7424 },
  huangshi:  { 2024: 7048, 2025: 7347 },
  shiyan:    { 2024: 7079, 2025: 7340 },
  xiangyang: { 2024: 7141, 2025: 7325 },
  enshi:     { 2024: 6989, 2025: 7309 },
  jingmen:   { 2024: 6957, 2025: 7309 },
  suizhou:   { 2024: 7079, 2025: 7304 },
  // 中文键兼容
  宜昌: { 2024: 7232, 2025: 7424 },
  黄石: { 2024: 7048, 2025: 7347 },
  十堰: { 2024: 7079, 2025: 7340 },
  襄阳: { 2024: 7141, 2025: 7325 },
  恩施: { 2024: 6989, 2025: 7309 },
  恩施州: { 2024: 6989, 2025: 7309 },
  荆门: { 2024: 6957, 2025: 7309 },
  随州: { 2024: 7079, 2025: 7304 },
};

// 湖北第三档城市：潜江、仙桃、天门、鄂州、咸宁、孝感、黄冈、神农架、荆州
const TIER3_BASE = {
  qianjiang:   { 2024: 6954, 2025: 7320 },
  xiantao:     { 2024: 6954, 2025: 7301 },
  tianmen:     { 2024: 6896, 2025: 7277 },
  ezhou:       { 2024: 6955, 2025: 7275 },
  xianning:    { 2024: 6958, 2025: 7257 },
  xiaogan:     { 2024: 6871, 2025: 7238 },
  huanggang:   { 2024: 6816, 2025: 7221 },
  shennongjia: { 2024: 6810, 2025: 7215 },
  jingzhou:    { 2024: 6826, 2025: 7210 },
  // 中文键兼容
  潜江:   { 2024: 6954, 2025: 7320 },
  仙桃:   { 2024: 6954, 2025: 7301 },
  天门:   { 2024: 6896, 2025: 7277 },
  鄂州:   { 2024: 6955, 2025: 7275 },
  咸宁:   { 2024: 6958, 2025: 7257 },
  孝感:   { 2024: 6871, 2025: 7238 },
  黄冈:   { 2024: 6816, 2025: 7221 },
  神农架: { 2024: 6810, 2025: 7215 },
  神农架林区: { 2024: 6810, 2025: 7215 },
  荆州:   { 2024: 6826, 2025: 7210 },
};

// 湖北缴费基数月标准（全口径社平）分档参考 —— 仅备查，引擎 AVG_SALARY_HISTORY 仍用第一档(武汉/省直)序列
// 注：缴费基数月标准(年度Y) = 全口径社平(社平年Y-1)；故 2024年度→社平年2023，2025年度→社平年2024
// 数据来源：用户提供的2025年全省汇总明细（2026-07-12）
const CONTRIB_BASE_TIERS = {
  2023: { tier1: 7489, tier2: 6948, tier3: 6805 }, // 2024年度缴费基数月标准：第一档(武汉/省直) / 第二档 / 第三档
  2024: { tier1: 7496, tier2: 7226, tier3: 7154 }, // 2025年度缴费基数月标准
  // 2025: { tier1: ?, tier2: ?, tier3: ? }, // 2026年度缴费基数月标准(=社平年2025全口径)待官方公布
};

const BASE_PARAMS = {
  PROV_GROWTH: 0.03,
  MERGE_YEAR: 2031,
  PROV_2025: 9112,  // 武汉/省直2025年计发基数
};

const CITY_LIST = [
  '武汉市', '黄石市', '十堰市', '宜昌市', '襄阳市',
  '鄂州市', '荆门市', '孝感市', '荆州市', '黄冈市',
  '咸宁市', '随州市', '恩施州', '潜江市', '仙桃市',
  '天门市', '神农架林区',
];

const ACCOUNT_START = { year: 1996, month: 1 };  // 鄂政发〔1995〕111号：湖北1996-01全省实施统账结合（建账）；1998-07并轨全国统一口径，非建账年
const CUTOFF_DATE   = { year: 1995, month: 12 };  // 建账前截止（视同缴费年限截止）
const TRANS_COEF = 0.012;
const PROV_TAG = 'hubei';

const MODULES = ['base', 'personal', 'transition'];
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
};

const cases = [];


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/hubei.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

function getEngineConfig() {
  const modules = {};
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true, formula_type: 'hubei' };
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF;
      }
    }
  }

  return {
    avg_salary_history: AVG_SALARY_HISTORY,
    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,
    province: PROV_TAG,
    base_rates: {
      prov: PROV_BASE,
      ...TIER2_BASE,
      ...TIER3_BASE,
    },
    avg_salary_history: AVG_SALARY_HISTORY,
    modules: modules,
    contrib_base_tiers: CONTRIB_BASE_TIERS,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '湖北过渡系数1.2%（鄂政发〔2006〕42号）；省内各地市独立计发基数，预发表使用退休地上年计发基数。',
  };
}


const AVG_SALARY_HISTORY = {
  1998: 706,
  1999: 734,
  2000: 811,
  2001: 943,
  2002: 1081,
  2003: 1144,
  2004: 1331,
  2005: 1542,
  2006: 1869,
  2007: 2239,
  2008: 2370,
  2009: 2842,
  2010: 3401,
  2011: 3923,
  2012: 4255,
  2013: 4615,
  2014: 5291,
  2015: 5901,
  2016: 6488,
  2017: 6640,
  2018: 7361,
  2019: 8170,
  2020: 6233,
  2021: 6795,
  2022: 7040,
  2023: 7489,
  2024: 7496,
  // 2025: 官方全口径未公布，交由引擎预发年规则外推(=2024原值)，公布后再填
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["hubei"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：✅ 官方数据（三张核定表）
// 2024年计发基数：7417元/月（湖南女2024-09预发表确认）
// 2025年正式计发基数：7694元/月（株洲2025-11核定表确认）
// 2025年缴费基准值：7180元/月（湖南男2025-07预发表确认）
// 更新时间：2026-07-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/hunan.js
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

// 湖南省养老金计算数据模块
// 依据：湘人社规〔2024〕10号、湘人社发〔2025〕53号

// ==================== 基础数据 ====================

const PROV_BASE = {
  1978: 816,
  1979: 856,
  1980: 899,
  1981: 944,
  1982: 991,
  1983: 1041,
  1984: 1093,
  1985: 1148,
  1986: 1205,
  1987: 1265,
  1988: 1328,
  1989: 1395,
  1990: 1465,
  1991: 1538,
  1992: 1615,
  1993: 1695,
  1994: 1780,
  1995: 342,   // 1995年计发基数（待官方文件确认，暂用缴费基准值）
  1996: 400,
  1997: 425,
  1998: 444,
  1999: 456,
  2000: 495,
  2001: 543,
  2002: 641,
  2003: 728,
  2004: 821,
  2005: 955,
  2006: 1305,
  2007: 1487,
  2008: 1795,
  2009: 1940,
  2010: 2270,
  2011: 2540,
  2012: 2960,
  2013: 3336,
  2014: 3658,
  2015: 4044,
  2016: 4491,
  2017: 4491,
  2018: 4491,
  2019: 4764,
  2020: 6413,
  2021: 6728,
  2022: 7132,
  2023: 7417,
  2024: 7618,  // 2024年计发基数（湖南女2024-09预发表确认）
  2025: 7694,  // 2025年正式计发基数（株洲2025-11核定表确认）
};;;;

// 湖南省基数增长预测参数
const BASE_PARAMS = {
  PROV_GROWTH: 0.026,
  LATEST_BASE_YEAR: 2024,
  LATEST_BASE_VALUE: 7417,
  PROV_2025: 7694,  // 2025年正式计发基数（株洲2025-11核定表确认）
}

// 湖南省城市列表（地级市+自治州）
const CITY_LIST = [
  '长沙市', '株洲市', '湘潭市', '衡阳市', '邵阳市',
  '岳阳市', '常德市', '张家界市', '益阳市', '郴州市',
  '永州市', '怀化市', '娄底市', '湘西州',
]

// ==================== 核心规则 ====================

// 湖南省养老保险建账时间和 cutoff 时间
// ⚠️ 待确认：建账时间（目前按1995-10估算，待官方文件确认）
// ⚠️ 待确认：视同缴费cutoff时间（目前按1995-09估算，待官方文件确认）
// TODO：搜索关键词"湘人社规 个人账户建立 1995"或"湘政发〔2006〕XX号 养老保险办法"
const ACCOUNT_START = { year: 1995, month: 10 }
const CUTOFF_DATE   = { year: 1995, month: 9 }

const TRANS_COEF = 0.013  // 湖南过渡系数固定 1.3%
// 依据：m12333.cn（湖南省退休人员养老金计算办法）
// TODO：补充官方文件编号（如：湘政发〔2006〕XX号）

const PROV_TAG = 'hunan'

// 湖南省模块配置（有基础养老金 + 个人账户养老金 + 过渡性养老金）
const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}
const MODULE_FORMULAS = {
  base:       (legal, d) => '(' + (legal.baseRetire||0) + '+' + (legal.baseProv||0) + ') ÷ 2 × ' + ((legal.totalYears||0)).toFixed(2) + '年 × 1%',
  personal:   (legal, d) => (d.personalAcc||0) + ' ÷ ' + (legal.months||139),
  transition: (legal, d) => (legal.baseProv||0) + ' × ' + ((legal.sightYears||0)).toFixed(2) + '年 × 1.3%',
}
const MODULE_COLORS = ['#1d4ed5','#0ea5e9','#0284c7']

// ==================== 测试案例 ====================
// TODO：替换为湖南省官方核定表数据
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
    note: '⚠️ 案例数据待替换为官方核定表',
    input: {
      birthYear: 1965, birthMonth: 6,
      workYear: 1985, workMonth: 7,
      cityType: 'prov',
      avgIndex: 0.85,
      personalAccInput: 85000,
      totalYears: 40,
      sightYears: 10.0,
      skipDelay: true,
    },
    expected: {
      base: 2846.78,
      personal: 611.51,
      transition: 850.19,
      total: 4308.48,
    },
  },
  {
    name: '湖南-女-2025退休（待验证）',
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
    note: '⚠️ 案例数据待替换为官方核定表',
    input: {
      birthYear: 1975, birthMonth: 3,
      workYear: 1995, workMonth: 4,
      cityType: 'prov',
      avgIndex: 0.72,
      personalAccInput: 42000,
      totalYears: 30,
      sightYears: 0.25,
      skipDelay: true,
    },
    expected: {
      base: 1985.05,
      personal: 302.16,
      transition: 18.00,
      total: 2305.21,
    },
  },
]

// ==================== 引擎配置 ====================


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/hunan.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

function getEngineConfig() {
  const modules = {};
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true };
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF;
      }
    }
  }

  return {
  avg_salary_history: AVG_SALARY_HISTORY,
base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
    name: '湖南省',
 avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2024-2025年计发基数与缴费基准值经三张核定表核对',
  };
}


const AVG_SALARY_HISTORY = {
  1990: 169.83,
  1991: 181.42,
  1992: 210.5,
  1993: 261.83,
  1994: 342,
  1995: 342,   // 1995.04-1996.03 社保缴费年度基准值
  1996: 400,   // 1996.04-1997.03
  1997: 425,   // 1997.04-1998.03
  1998: 444,   // 1998.04-1999.03（两张表一致，425为单个月份异常值）
  1999: 456,
  2000: 495,
  2001: 543,
  2002: 641,
  2003: 728,
  2004: 821,
  2005: 955,
  2006: 1305,
  2007: 1487,
  2008: 1795,
  2009: 1940,
  2010: 2270,  // 2010年起为自然年度
  2011: 2540,
  2012: 2960,
  2013: 3336,
  2014: 3658,
  2015: 4044,
  2016: 4491,
  2017: 4491,
  2018: 4491,
  2019: 4764,
  2020: 5054,  // 2020年社平（核定表实测，原5460错位一年已修正）
  2021: 5460,
  2022: 5977,
  2023: 6284,
  2024: 6711,  // 原6787错位一年已修正
  2025: 6787,  // 2025年社平（核定表实测）
};


module.exports = {
  PROV_BASE,
  BASE_PARAMS,
  CITY_LIST,
  ACCOUNT_START,
  CUTOFF_DATE,
  TRANS_COEF,
  PROV_TAG,
  MODULES,
  getEngineConfig,
  cases,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["hunan"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：8785元/月
// 更新时间：2026-06-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/jiangsu.js
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
  2020: 7602,
  2021: 7974,
  2022: 8309,
  2023: 8613,
  2024: 8785,
   2025: 8917,  // 2025年计发基数（苏州2026-02核定表使用值）
};;

// 江苏省基数增长预测参数
const BASE_PARAMS = {
  
  PROV_GROWTH: 0.018,  // 1.8%
  MERGE_YEAR: 2031,
  PROV_2025: 8917,  // 2025年计发基数（苏州2026-02核定表使用值）
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
  2018: 7215.83,
  2019: 5614,
  2020: 6862,
  2021: 7273.67,
  2022: 8014,
  2023: 8132,
  2024: 8254,  // 2024年度缴费基数·2023全口径社平（江苏税务2024-10-08：上限24396/下限4879→4879÷0.6=8132）
  2025: 8537,  // 2025年度社保缴费基数·2024全口径社平（官方已发布，人社通汇总）
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

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["jiangsu"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：✅ 官方数据（江西省统计局·城镇非私营单位口径）
// 计发基数/社平：2020=78182 2021=83766 2022=87972 2023=92794 2024=95750 2025=99446 元/年，均÷12
// 2026=投影(99446×1.039÷12)。注：2024 全口径缴费基数=6525(78300/年)为另一口径，本配置未采用。
// 更新时间：2026-07-07

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/jiangxi.js
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

// 江西省养老金计算模块
// 1995-2026 官方非私营社平已补全（统计局公布）

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 733,
  1979: 770,
  1980: 808,
  1981: 849,
  1982: 891,
  1983: 936,
  1984: 982,
  1985: 1032,
  1986: 1083,
  1987: 1137,
  1988: 1194,
  1989: 1254,
  1990: 1316,
  1991: 153.5,
  1992: 179.5,
  1993: 208.08,
  1994: 287.5,
  1995: 350.92,
  1996: 404.33,
  1997: 424.08,
  1998: 448.67,
  1999: 562.42,
  2000: 584.5,
  2001: 668.83,
  2002: 771.83,
  2003: 876.75,
  2004: 988.33,
  2005: 1140.67,
  2006: 1280.83,
  2007: 1512,
  2008: 1716.42,
  2009: 2013.75,
  2010: 2363.58,
  2011: 2769.92,
  2012: 3209.33,
  2013: 3539.42,
  2014: 3851.5,
  2015: 4244.33,
  2016: 4678,
  2017: 5119.08,
  2018: 5714.42,
  2019: 6143.75,
  2020: 6000,
  2021: 6306,
  2022: 6569,
  2023: 6747,
  2024: 6916,
   2025: 7054,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};;

// ==================== 社平工资历史（元/月）====================
// 引擎 getBase() 返回值用于个人账户计算时假设为 元/月
// 年缴额 = base(元/月) × avgIndex × 8% × 12个月
// 数据来源：用户官方截图 + m12333.cn 全口径汇总表

;

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031,
  PROV_2025: 6525,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
}

// ==================== 城市列表 ====================

const CITY_LIST = [
  '南昌',
  '景德镇',
  '萍乡',
  '九江',
  '新余',
  '鹰潭',
  '赣州',
  '吉安',
  '宜春',
  '抚州',
  '上饶'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1995, month: 10 }
const CUTOFF_DATE   = { year: 1995, month: 9 }

const TRANS_COEF = 0.013  // 江西省过渡系数 1.3%

const PROV_TAG = 'jiangxi'

// ==================== 模块配置 ====================

const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

// ==================== 测试案例 ====================

const cases = [
  // 案例1：待用户提供官方核定表
  // 案例2：待用户提供官方核定表
]

// ==================== 引擎配置 ====================

function getEngineConfig() {
  const modules = {};
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true };
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF;
      }
    }
  }

  return {
  avg_salary_history: AVG_SALARY_HISTORY,
base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
    avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '官方口径校正(2026-07-07)：2020年起养老金计发基数改用江西省人社厅公布的『基本养老金月计发基数』(全口径过渡值)，社平工资(avg_salary_history)改用『全口径城镇单位就业人员月平均工资』。计发基数PROV：2020=6000,2021=6306,2022=6569,2023=6747,2024=6916,2025=7054；全口径社平ASH：2020=5548,2021=5880,2022=6098,2023=6397,2024=6525,2025=6723。2026为投影。1995-2019仍用非私营社平(÷12)。',
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  1991: 153.5,
  1992: 179.5,
  1993: 208.08,
  1994: 287.5,
  1995: 350.92,
  1996: 404.33,
  1997: 424.08,
  1998: 448.67,
  1999: 562.42,
  2000: 584.5,
  2001: 668.83,
  2002: 771.83,
  2003: 876.75,
  2004: 988.33,
  2005: 1140.67,
  2006: 1280.83,
  2007: 1512,
  2008: 1716.42,
  2009: 2013.75,
  2010: 2363.58,
  2011: 2769.92,
  2012: 3209.33,
  2013: 3539.42,
  2014: 3851.5,
  2015: 4244.33,
  2016: 4678,
  2017: 5119.08,
  2018: 5714.42,
  2019: 6143.75,
  2020: 5548,
  2021: 5880,
  2022: 6098,
  2023: 6397,
  2024: 6525,
  2025: 6723,  // 2025年度社保缴费基数·2024全口径社平（官方已发布，人社通汇总）
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["jiangxi"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：✅ 官方数据（用户提供吉林省历年社平工资表）
// 2024年计发基数：7178.5元/月
// 更新时间：2026-06-18

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/jilin.js
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

// 吉林省养老金计算数据模块

// 全省历年计发基数（元/月）
// 来源：吉林省历年社平工资表（1995-2024年官方数据）
const USE_PRE_ACCOUNT_YEARS = false;  // 吉林省不用建账前缴费年限
const NOTES = '吉林特殊算法：基础养老金与增发均为 (上一年度市县计发基数 + 上一年度全省计发基数×本人平均缴费工资指数) ÷ 2 的加权值（市县与全省两基数同处一公式，并非只用退休地基数）；过渡性养老金单用全省计发基数。此加权算法为吉林特有，不能当成各省通用规则。【内联 cases 数组为自描述测试数据·铁律】每个案例 input 必须显式带 gender/genderType 与 baseRetireInput/baseProvInput；2026 等"预发年"必须用上一年已发布计发基数作暂定（如 2026→用 2025 的 7322/7978.25），禁止依赖引擎外推。否则会因引擎默认男性(→按60岁反推退休年至2035)与计发基数外推得到错误结果（吉林-女-1976-02 曾因此被算成 2035 年退休、base 2797.87）。';
const PROV_BASE = {
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
  2020: 5088.42,
  2021: 6004.75,
  2022: 6709.83,
  2023: 7058.67,
  2024: 7178.5,
  2027: 7977.54,
  2028: 8326.96,
  2029: 8691.68,
  2030: 9072.37,
  2031: 9308.26,
  2032: 9550.27,
  2033: 9798.58,
  2034: 10053.34,
  2035: 10314.73,
   2025: 7322,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};;

// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/jilin.json avg_salary_history（2020-2024 已÷12 转为元/月）
;

// 长春市历年计发基数（元/月，2020年起单列）
const CC_BASE = {
  2020: 6605.23, 2021: 6605.23, 2022: 7023.31, 2023: 7320.86, 2024: 7852.58, 2025: 7978.25
}

// 吉林省基数增长预测参数
const BASE_PARAMS = {
  CC_2025: 7978.25,
  
  CC_GROWTH: 0.026,
  PROV_GROWTH: 0.0438,
  MERGE_YEAR: 2031,
  PROV_2025: 7322,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
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
      gender: 'male', genderType: 'male',
      birthYear: 1966, birthMonth: 2,
      workYear: 1984, workMonth: 7,
      retireYear: 2026, retireMonth: 2,
      cityType: 'cc',
      avgIndex: 0.62,
      personalAccInput: 96750.01,
      totalYears: 41.67,
      sightYears: 11,
      skipDelay: true,
      baseRetireInput: 7978.25,
      baseProvInput: 7322.08,
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
      gender: 'female', genderType: 'fw50',                 // 显式性别：防止 harness 漏解析名字而默认男性→按60岁反推退休年至2035
      baseRetireInput: 7322,                                // 2026预发年：用2025已发布计发基数(全省)作暂定，勿依赖引擎外推
      baseProvInput: 7322,
      birthYear: 1976, birthMonth: 2,
      workYear: 2008, workMonth: 6,
      retireYear: 2026, retireMonth: 2,
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
      gender: 'male', genderType: 'male',
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
      gender: 'male', genderType: 'male',
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
      gender: 'male', genderType: 'male',
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
  if (MODULES.includes('base')) modules.basic_pension = { enabled: true, rate_per_year: 0.01, formula_type: 'jilin' };
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
  2024: 7322,
  // 2025: 官方全口径未公布，交由引擎预发年规则外推(=2024原值)，公布后再填
};


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

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["jilin"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：✅ 官方数据
// 2025年计发基数：7346元/月（辽人社〔2025〕17号）；2024年全省7201、沈阳8266、大连8823
// 2025年缴费基数上下限：上限21792元/月、下限4359元/月（辽人社〔2025〕17号第一条）；2024年全省城镇居民人均可支配收入47982元/年（月3999，丧抚待遇口径）
// 更新时间：2026-06-24
// 注：沈阳8266元/月、大连8823元/月（单独计发基数）

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/liaoning.js
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

// 辽宁省养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  1992: 226,
  1993: 275,
  1994: 356,
  1995: 406.42,
  1996: 439.08,
  1997: 465.92,
  1998: 469.75,
  1999: 505.58,
  2000: 553.25,
  2001: 620.33,
  2002: 740.67,
  2003: 848.67,
  2004: 992.58,
  2005: 1444.25,
  2006: 1635.33,
  2007: 1933.5,
  2008: 2310.75,
  2009: 2592,
  2010: 2921.42,
  2011: 3226.08,
  2012: 3541.92,
  2013: 3859.17,
  2014: 4092.5,
  2015: 4454.83,
  2016: 4762.33,
  2017: 5212.08,
  2018: 4801,
  2019: 5238.25,
  2020: 6057,
  2021: 6340,
  2022: 6720,
  2023: 6987,
  2024: 7201,
  2025: 7346,  // 辽人社〔2025〕17号：全省(不含沈阳､大连)月计发基数7346元
};


// 沈阳市单独计发基数（沈人社发）
const SY_BASE = {
  2020: 7195,  // 辽人社〔2020〕34号：沈阳市月计发基数7195元
  2021: 7530,  // 辽人社〔2021〕32号：沈阳市月计发基数7530元
  2022: 7982,  // 辽人社〔2022〕32号：沈阳市月计发基数7982元
  2023: 8141,  // 辽人社〔2023〕26号：沈阳市月计发基数8141元
  2024: 8266,  // 辽人社〔2024〕17号：沈阳市月计发基数8266元
  2025: 8390,  // 辽人社〔2025〕17号：沈阳市月计发基数8390元
};

// 大连市单独计发基数（大人社发）
const DL_BASE = {
  2020: 7679,
  2021: 8038,
  2022: 8520,
  2023: 8690,
  2024: 8823,
  2025: 8956,  // 辽人社〔2025〕17号：大连市月计发基数8956元
};

const BASE_PARAMS = {
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031,
  PROV_2025: 7346,  // 辽人社〔2025〕17号
}

// ==================== 城市列表 ====================

const CITY_LIST = [
  '沈阳',
  '大连',
  '鞍山',
  '抚顺',
  '本溪',
  '丹东',
  '锦州',
  '营口',
  '阜新',
  '辽阳',
  '盘锦',
  '铁岭',
  '朝阳',
  '葫芦岛'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.014  // 辽宁省过渡系数 1.4%（辽劳社发〔2006〕81号）

const PROV_TAG = 'liaoning'

// ==================== 模块配置 ====================

const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

// ==================== 增发养老金参数 ====================

const EXTRA_PARAMS = {
  // 辽宁增发规则（从案例中反推）
  // 增发比例约 0.3-0.5%，与视同缴费年限和平均指数相关
  extraRate: 0.004,  // 增发比例（待官方文件确认）
  extraNote: '⚠️ 辽宁增发规则待官方文件确认，当前为案例反推值',
}

// ==================== 测试案例 ====================

const cases = [
  // 案例1：沈阳女工人50岁2023.07退休
  {
    case_id: "1",
    province: "liaoning",
    city: "沈阳市",
    gender: "female",
    birth_year: 1973,
    birth_month: 7,
    work_year: 1990,
    work_month: 12,
    retire_year: 2023,
    retire_month: 7,
    actual_years: 30.83,
    sight_years: 1.83,
    total_years: 32.67,
    avg_index: 1.2907,
    base_number: 8141,
    base_prov: 6987,
    personal_account: 170205.99,
    months: 195,
    expected: {
      basic_pension: 3046.25,
      extra_pension: 0,
      personal_pension: 872.85,
      transitional_pension: 238.89,
      total: 4157.99
    },
    notes: "辽宁沈阳女工人50岁2023.07退休。单指数（过渡性养老金用平均缴费指数）。⚠️增发207.41在核定表上未单独列出，表total=3896.56不含增发，引擎total=4103.75含增发。需确认辽宁增发规则。",
  },
  // 案例2：全省男60岁2026.03退休
  {
    case_id: "2",
    province: "liaoning",
    city: "辽宁省",
    gender: "male",
    birth_year: 1966,
    birth_month: 7,
    work_year: 1984,
    work_month: 12,
    retire_year: 2026,
    retire_month: 3,
    actual_years: 30.09,
    sight_years: 11.08,
    total_years: 41.17,
    avg_index: 0.8684,
    base_number: 7346,
    base_prov: 7346,
    personal_account: 100018.84,
    months: 139,
    expected: {
      basic_pension: 2825.35,
      extra_pension: 0,
      personal_pension: 719.56,
      transitional_pension: 1064.53,
      total: 4609.44
    },
    notes: "辽宁全省基数男60岁2026.03退休。单指数（过渡性养老金用平均缴费指数）。累计41.17年（实际30.09+视同11.08）。过渡=7346×0.842×11.08×1.4%。增发193.50未在表上显示",
  },
  // 案例3：鞍山男60岁2025.08退休
  {
    case_id: "3",
    province: "liaoning",
    city: "鞍山市",
    gender: "male",
    birth_year: 1965,
    birth_month: 10,
    work_year: 1983,
    work_month: 11,
    retire_year: 2025,
    retire_month: 8,
    actual_years: 32.75,
    sight_years: 9.92,
    total_years: 42.67,
    avg_index: 1.3398,
    base_number: 7346,
    base_prov: 7346,
    personal_account: 102280.37,
    months: 139,
    expected: {
      basic_pension: 3667.1,
      extra_pension: 0,
      personal_pension: 735.83,
      transitional_pension: 1193.55,
      total: 5596.48
    },
    notes: "辽宁鞍山男60岁2025.08退休。单指数（过渡性养老金用平均缴费指数）。累计42.67年（实际32.75+视同9.92）。过渡=7346×1.31×9.92×1.4%。增发405.65未在表上显示",
  },
  // 案例4：全省男60岁2023.08退休
  {
    case_id: "4",
    province: "liaoning",
    city: "辽宁省",
    gender: "male",
    birth_year: 1963,
    birth_month: 8,
    work_year: 1982,
    work_month: 10,
    retire_year: 2023,
    retire_month: 8,
    actual_years: 26.17,
    sight_years: 15.25,
    total_years: 40.92,
    avg_index: 0.9587,
    base_number: 6987,
    base_prov: 6987,
    personal_account: 129872.37,
    months: 139,
    expected: {
      basic_pension: 2800.1,
      extra_pension: 0,
      personal_pension: 934.33,
      transitional_pension: 1460.92,
      total: 5195.29
    },
    notes: "辽宁男60岁2023.08退休。建账1998-01（地区差异/补缴），建账前缴费15.25年(1982.10-1998.01)。视同15.25年。单指数（过渡性养老金用平均缴费指数）。⚠️增发339.25表上未显示",
  }
]

// ==================== 引擎配置 ====================


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/liaoning.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

function getEngineConfig() {
  const modules = {};
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true, formula_type: 'weighted_transition' };
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF;
      }
    }
  }
  if (MODULES.includes('extra')) {
    modules.extra_pension = { enabled: true, type: 'transition_subsidy', ...EXTRA_PARAMS };
  }

  return {
  avg_salary_history: AVG_SALARY_HISTORY,
account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,
    province: PROV_TAG,
    name: '辽宁省',
    base_rates: {
      prov: PROV_BASE,
      '沈阳': SY_BASE,
      '大连': DL_BASE,
      // 兼容拼音键（小程序 cityType 可能传拼音）
      shenyang: SY_BASE,
      dalian: DL_BASE,
    },
    // 城市计发基数（新格式，供引擎 getBase() 新格式分支使用）
    CITY_BASE: {
      '沈阳': SY_BASE,
      '大连': DL_BASE,
      shenyang: SY_BASE,
      dalian: DL_BASE,
    },
    avg_salary_history: AVG_SALARY_HISTORY,
    modules: modules,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2024年基数：全省7201元、沈阳8266元、大连8823元（辽人社〔2024〕17号）。⚠️ 沈阳、大连基数需根据用户选择的城市动态匹配。',
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  1990: 114.25,
  1991: 119.92,
  1992: 125.92,
  1993: 1587,
  1994: 1666,
  1995: 1749,
  1996: 1837,
  1997: 1929,
  1998: 2025,
  1999: 2126,
  2000: 2233,
  2001: 2344,
  2002: 2462,
  2003: 2585,
  2004: 2714,
  2005: 2850,
  2006: 2992,
  2007: 3142,
  2008: 3299,
  2009: 3464,
  2010: 3637,
  2011: 3819,
  2012: 4010,
  2013: 4210,
  2014: 4421,
  2015: 4642,
  2016: 4874,
  2017: 5118,
  2018: 5373,
  2019: 5642,
  2020: 5709,
  2021: 6383,
  2022: 6843,
  2023: 7121,

  2024: 7265,
  // 2025: 官方全口径未公布，交由引擎预发年规则外推(=2024原值)，公布后再填
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["liaoning"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：内蒙古人社厅官方文件(内人社办发〔2024〕152号)/公开报道核实
// 历年计发基数(元/月，逐年核实)：2021=6803、2022=7089、2023=7469、2024=8105
// 更新时间：2026-07-11（纠正早期占位值 2021:7001→6803、2022:7351→7089）

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/neimenggu.js
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

// 内蒙古自治区养老金计算模块
// 官方计发基数已核实：2021年度6803、2022年度7089、2023年度7469、2024年度8105

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 859,
  1979: 902,
  1980: 947,
  1981: 995,
  1982: 1044,
  1983: 1096,
  1984: 1151,
  1985: 1209,
  1986: 1269,
  1987: 1333,
  1988: 1399,
  1989: 1469,
  1990: 1543,
  1991: 1620,
  1992: 1701,
  1993: 1786,
  1994: 1875,
  1995: 1969,
  1996: 2068,
  1997: 2171,
  1998: 2279,
  1999: 2393,
  2000: 2513,
  2001: 2639,
  2002: 2771,
  2003: 2909,
  2004: 3055,
  2005: 3207,
  2006: 3368,
  2007: 3536,
  2008: 3713,
  2009: 3899,
  2010: 4094,
  2011: 4298,
  2012: 4513,
  2013: 4739,
  2014: 4976,
  2015: 5225,
  2016: 5486,
  2017: 5760,
  2018: 6048,
  2019: 6350,
  2020: 6485,
  2021: 6803,  // 2021年度计发基数（官方6803元/月）
  2022: 7089,  // 2022年度计发基数（官方7089元/月，2022-09退休官方核定表案例验证）
  2023: 7469,
  2024: 8105,
   2025: 8179,  // 2025年计发基数未公布，预发用2024基数8105（用户示例确认；官方公布后替换）
};;

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031,
  PROV_2025: 8105,  // 2025年计发基数未公布，预发用2024基数8105
}

// ==================== 城市列表 ====================

const CITY_LIST = [
  '呼和浩特',
  '包头',
  '乌海',
  '赤峰',
  '通辽',
  '鄂尔多斯',
  '呼伦贝尔',
  '巴彦淖尔',
  '乌兰察布'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）：多数1996-01，最迟1998-01（例：1984-07参工、1998-01建账）
// 视同缴费年限固定至1997-12（统账结合前），与建账具体月份无关
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.012  // 内蒙古自治区过渡系数 1.2%（内养老发〔2006〕?号）。过渡=指数化月均工资×统账结合前年限×1.2%；平均缴费指数<1时按1计过渡

const PROV_TAG = 'neimenggu'

// ==================== 模块配置 ====================

const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

// ==================== 测试案例 ====================

const cases = [
  // 案例1(官方核定表,2026-07-11验证)：男1962-09生/1980-11参工/1998-01建账/2022-09退
  //   累计503月(41年11月)、视同206月(17年2月)、实际297月(24年9月)；平均指数1.7318
  //   个人账户199050.07、计发月数139、计发基数7089(2022年度)
  //   基础4058.74+个人1432.01+过渡2529.01=8019.76(新办法)；引擎逐项吻合(差0.01四舍五入)
  //   注：本案例验证 PROV_BASE[2022] 由占位值7351纠正为官方7089
]

// ==================== 引擎配置 ====================


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/neimenggu.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

function getEngineConfig() {
  const modules = {};
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    // index_floor_one：内蒙古规定平均缴费工资指数<1时，过渡性养老金按1计算（基础养老金仍用真实指数）
    modules.transitional_pension = { enabled: true, index_floor_one: true };
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF;
      }
    }
  }

  return {
  avg_salary_history: AVG_SALARY_HISTORY,
base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
 avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '内蒙古企业养老金：基础=(基数+基数×Q)/2×缴费年限×1%；个人=个账/计发月数；过渡=指数化月均工资×统账结合前(视同)年限×1.2%，平均缴费指数<1时按1计过渡。建账多数1996-01、最迟1998-01；视同=参加工作至1997-12。全口径社平=计发基数。2025基数未公布时(预发)用2024基数8105。',
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  1990: 153.83,
  1991: 167.67,
  1992: 194.92,
  1993: 233,
  1994: 306.25,
  1995: 344.5,
  1996: 393,
  1997: 427,
  1998: 482.67,
  1999: 528.92,
  2000: 581.17,
  2001: 687.5,
  2002: 806.92,
  2003: 939.92,
  2004: 1110.33,
  2005: 1332.08,
  2006: 1622.42,
  2007: 1817,
  2008: 2176.17,
  2009: 2558.25,
  2010: 2958.92,
  2011: 3456.75,
  2012: 3921.08,
  2013: 4282.33,
  2014: 4538.33,
  2015: 4822.5,
  2016: 5166.17,
  2017: 5640.67,
  2018: 6131.25,
  2019: 6508.67,
  2020: 6344,
  2021: 6751.42,
  2022: 7469.17,
  2023: 8105,
  2024: 8179,
  2025: 8430,  // 2025年度社保缴费基数·2024全口径社平（官方已发布，人社通汇总）
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["neimenggu"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：8202元/月
// 更新时间：2026-06-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/ningxia.js
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

// 宁夏回族自治区养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 869,
  1979: 913,
  1980: 958,
  1981: 1006,
  1982: 1057,
  1983: 1110,
  1984: 1165,
  1985: 1223,
  1986: 1284,
  1987: 1349,
  1988: 1416,
  1989: 1487,
  1990: 1561,
  1991: 1639,
  1992: 1721,
  1993: 1807,
  1994: 1898,
  1995: 1993,
  1996: 2092,
  1997: 2197,
  1998: 2307,
  1999: 2422,
  2000: 2543,
  2001: 2670,
  2002: 2804,
  2003: 2944,
  2004: 3091,
  2005: 3246,
  2006: 3408,
  2007: 3579,
  2008: 3757,
  2009: 3945,
  2010: 4143,
  2011: 4350,
  2012: 4567,
  2013: 4796,
  2014: 5035,
  2015: 5287,
  2016: 5551,
  2017: 5829,
  2018: 6120,
  2019: 6426,
  2020: 6885,
  2021: 7215,
  2022: 7648,
  2023: 7953,
  2024: 8202,
   2025: 8366,  // 2025年计发基数=8366（银川2026-01真实表：暂用2024年全口径社平作为2025年计发基数）
};;

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031,
  PROV_2025: 8366,  // 2025年计发基数=8366（银川2026-01真实表确认）
}

// ==================== 城市列表 ====================

const CITY_LIST = [
  '银川',
  '石嘴山',
  '吴忠',
  '固原',
  '中卫'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1996, month: 1 }
const CUTOFF_DATE   = { year: 1995, month: 12 }

const TRANS_COEF = 0.013  // 宁夏回族自治区过渡系数 1.3%
const PROV_TAG = 'ningxia'

// ==================== 模块配置 ====================

const MODULES = ['base', 'personal', 'transition', 'special']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
  special:     '知识分子补贴',
}

// ==================== 特殊增发参数（知识分子补贴） ====================

const SPECIAL_ADDITION_PARAMS = {
  enabled: true,
  type: 'intellectual',
  intellectual_area: 10,    // 知识分子地区津贴（真实表：10.00元/月）
  intellectual_work: 8.5,   // 知识分子工龄补贴（真实表：8.50元/月）
  note: '知识分子补贴 = 地区津贴10元/月 + 工龄补贴8.5元/月 = 18.5元/月（宁政办发[2006]126号及相关规定）',
}

// ==================== 测试案例 ====================

const cases = [
  // 案例1：宁夏男2024.04退休（非知识分子）
  {
    case_id: "1",
    province: "ningxia",
    base_rates: { prov: PROV_BASE },
    city: "宁夏",
    gender: "男",
    birth_year: 1964,
    birth_month: 4,
    work_year: 1983,
    work_month: 6,
    retire_year: 2024,
    retire_month: 4,
    total_years: 40.92,
    sight_years: 7.58,
    pre_account_years: 12.58,
    personal_account: 95751.34,
    months: 139,
    expected: {
      basic_pension: 2830,
      personal_pension: 688.86,
      transitional_pension: 960.13,
      total: 4480.29
    },
    notes: "宁夏2024年4月退休男职工，1964-04生，1983-06参工。过渡系数1.3%（表上明确标注）。视同7.58年+建账前实际5年=12.58年建账前年限。usePreAccountYears=true。低指数0.7392。",
    avg_index: 0.7392,
    base_number: 7953,
    base_prov: 7953
  },
  // 案例2：宁夏男2026.01退休（知识分子）
  {
    case_id: "2",
    province: "ningxia",
    city: "宁夏",
    gender: "男",
    birth_year: 1966,
    birth_month: 1,
    work_year: 1988,
    work_month: 8,
    retire_year: 2026,
    retire_month: 1,
    total_years: 37.5,
    sight_years: 2.42,
    pre_account_years: 7.42,
    personal_account: 122313.73,
    months: 139,
    expected: {
      basic_pension: 2771.13,
      personal_pension: 879.95,
      transitional_pension: 680.50,
      total: 4350.08
    },
    notes: "宁夏2026年1月银川退休男职工（知识分子），1966-01生，1988-08参工。视同2.42年+建账前实际5年=7.42年建账前年限。平均指数0.7666（建账前年限下取整7年，累计缴费年限上取整38年，(7×1+22.1315)/38=0.7666）。知识分子过渡系数1.43%(1.3%+0.13%)；地区津贴10元/月+工龄补贴8.5元/月=18.5元/月。2025年计发基数8366。",
    intellectual: true,
    avg_index: 0.7666,
    base_number: 8366,
    base_prov: 8366
  },
  // 案例3：宁夏男2026.01退休（知识分子，详细）
  {
    case_id: "3",
    province: "ningxia",
    city: "宁夏",
    gender: "男",
    birth_year: 1966,
    birth_month: 1,
    work_year: 1988,
    work_month: 8,
    retire_year: 2026,
    retire_month: 1,
    total_years: 37.5,
    sight_years: 7.67,
    personal_account: 122312.42,
    months: 139,
    intellectual: true,
    expected: {
      basic_pension: 2632.36,
      personal_pension: 879.95,
      transitional_pension: 658.32,
      intellectual_subsidy: 18.5,
      total: 4189.13
    },
    notes: "宁夏2026年1月退休男知识分子。知识分子工龄补贴10.00元/月+地区补贴8.50元/月=18.50元/月。过渡养老金=8082×指数化月均×视同7.67年×(1.3%+知识分子增量)。",
    avg_index: 0.7371,
    base_number: 8082,
    base_prov: 8082
  }
]

// ==================== 引擎配置 ====================


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/ningxia.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

function getEngineConfig() {
  const modules = {};
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true };
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF;
        // 知识分子过渡系数增加（1.3% → 1.43%）
        modules.transitional_pension.coefficient_intellectual = 0.0143;
      }
    }
  }
  if (MODULES.includes('special')) {
    modules.special_addition = { ...SPECIAL_ADDITION_PARAMS };
  }

  return {
  avg_salary_history: AVG_SALARY_HISTORY,
base_rates: {
      prov: PROV_BASE
    },
    
      base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,
    base_rates: { prov: PROV_BASE },

    province: PROV_TAG,
 avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: true,  // 宁夏使用建账前缴费年限
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '宁夏平均缴费工资指数算法：建账前各年缴费指数均视同为1；建账后按实际缴费工资÷上年社平计算当年指数；建账前年限下取整，累计缴费年限上取整，平均指数=(建账前年限下取整×1+建账后指数和)÷累计缴费年限上取整。知识分子过渡系数1.3%→1.43%，并发放地区津贴10元/月+工龄补贴8.5元/月。使用建账前缴费年限（preAccountYears）。',
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  1995: 469.58,
  1996: 506.25,
  1997: 568.5,
  1998: 629.17,
  1999: 723.42,
  2000: 876.75,
  2001: 976.92,
  2002: 1088,
  2003: 1225.75,
  2004: 1434.25,
  2005: 1769.92,
  2006: 2184.17,
  2007: 2559.92,
  2008: 2840.25,
  2009: 3262,
  2010: 3714.5,
  2011: 4080.08,
  2012: 4348.75,
  2013: 4734.25,
  2014: 5206.83,
  2015: 5652.5,
  2016: 6064.92,
  2017: 6532,
  2018: 6885,
  2019: 5595.17,
  2020: 6110,
  2021: 7104,
  2022: 7666,
  2023: 8088,
  2024: 8258,
  2025: 8574,  // 2025年度社保缴费基数·2024全口径社平（官方已发布，人社通汇总）
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["ningxia"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：✅ 官方数据
// 2024年计发基数：8878元/月
// 更新时间：2026-06-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/qinghai.js
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

// 青海省养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 941,
  1979: 988,
  1980: 1037,
  1981: 1089,
  1982: 1144,
  1983: 1201,
  1984: 1261,
  1985: 1324,
  1986: 1390,
  1987: 1460,
  1988: 1533,
  1989: 1609,
  1990: 1690,
  1991: 1774,
  1992: 1863,
  1993: 1956,
  1994: 2054,
  1995: 2157,
  1996: 2265,
  1997: 2378,
  1998: 2497,
  1999: 2622,
  2000: 2753,
  2001: 2890,
  2002: 3035,
  2003: 3187,
  2004: 3346,
  2005: 3513,
  2006: 3689,
  2007: 3873,
  2008: 4067,
  2009: 4270,
  2010: 4484,
  2011: 4708,
  2012: 4944,
  2013: 5191,
  2014: 5450,
  2015: 5723,
  2016: 6009,
  2017: 6309,
  2018: 6625,
  2019: 6956,
  2020: 7516,
  2021: 7908,
  2022: 8261,
  2023: 8591,
  2024: 8878,
   2025: 9056,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};;

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031,
  PROV_2025: 8816,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
}

// ==================== 城市列表 ====================

const CITY_LIST = [
  '西宁',
  '海东'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.014  // 青海省过渡系数 1.4000000000000001%

const PROV_TAG = 'qinghai'

// ==================== 模块配置 ====================

const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

// ==================== 测试案例 ====================

const cases = [
  // 案例1：待用户提供官方核定表
  // 案例2：待用户提供官方核定表
]

// ==================== 引擎配置 ====================


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/qinghai.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

function getEngineConfig() {
  const modules = {};
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true, coefficient: TRANS_COEF, formula_type: 'weighted_transition' };
  }

  // 青海青劳社厅发[2004]27号：提高企业退休人员待遇（西宁地区+12，其他地区+13）
  modules.special_addition = {
    enabled: true,
    type: 'qinghai_27_doc',
    xining_addition: 12,
    other_addition: 13
  };

  return {
  avg_salary_history: AVG_SALARY_HISTORY,
base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
 avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: true,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2023年基数8591元（青人社厅函〔2023〕461号），2024年基数8878元（青政办〔2019〕56号）；过渡性按1997-12-31前年限（含视同）计；青劳社厅发[2004]27号西宁地区+12元/月，其他地区+13元/月。',
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  1995: 479.42,
  1996: 557.25,
  1997: 590.92,
  1998: 667.58,
  1999: 756.75,
  2000: 837.5,
  2001: 1075.5,
  2002: 1206,
  2003: 1279.67,
  2004: 1435.75,
  2005: 1590.33,
  2006: 1889.92,
  2007: 2180.5,
  2008: 2581.92,
  2009: 2796.75,
  2010: 3098.5,
  2011: 3541.08,
  2012: 3902.25,
  2013: 4342.08,
  2014: 4817,
  2015: 5155.67,
  2016: 5620.92,
  2017: 6377.92,
  2018: 5682.83,
  2019: 6084.5,
  2020: 7023,
  2021: 7604,
  2022: 8029,
  2023: 8643,
  2024: 8816,
  // 2025: 官方全口径未公布，交由引擎预发年规则外推(=2024原值)，公布后再填
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["qinghai"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：7727元/月
// 更新时间：2026-06-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/shaanxi.js
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

// 陕西省养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 819,
  1979: 860,
  1980: 903,
  1981: 948,
  1982: 996,
  1983: 1045,
  1984: 1098,
  1985: 1152,
  1986: 1210,
  1987: 1271,
  1988: 1334,
  1989: 1401,
  1990: 1471,
  1991: 1544,
  1992: 1622,
  1993: 1703,
  1994: 1788,
  1995: 1877,
  1996: 1971,
  1997: 2070,
  1998: 2173,
  1999: 2282,
  2000: 2396,
  2001: 2516,
  2002: 2641,
  2003: 2774,
  2004: 2912,
  2005: 3058,
  2006: 3211,
  2007: 3371,
  2008: 3540,
  2009: 3717,
  2010: 3903,
  2011: 4098,
  2012: 4303,
  2013: 4518,
  2014: 4744,
  2015: 4981,
  2016: 5230,
  2017: 5491,
  2018: 5766,
  2019: 6054,
  2020: 6594,
  2021: 6914,
  2022: 7202,
  2023: 7489,
  2024: 7727,
   2025: 7881,  // 2025年计发基数尚未公布，2025年退休预发暂用2024年基数7727
};;

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031,
  PROV_2025: 7727,  // 2025年计发基数尚未公布，预发暂用2024年基数7727
}

// ==================== 城市列表 ====================

const CITY_LIST = [
  '西安',
  '铜川',
  '宝鸡',
  '咸阳',
  '渭南',
  '延安',
  '汉中',
  '榆林',
  '安康',
  '商洛'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1996, month: 1 }
const CUTOFF_DATE   = { year: 1995, month: 12 }

const TRANS_COEF = 0.014  // 陕西省过渡系数 1.4%（陕政发〔2006〕20号）

const PROV_TAG = 'shaanxi'

// ==================== 模块配置 ====================

const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

// ==================== 测试案例 ====================

const cases = [
  // 案例1：待用户提供官方核定表
  // 案例2：待用户提供官方核定表
]

// ==================== 引擎配置 ====================


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/shaanxi.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

function getEngineConfig() {
  const modules = {};
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true };
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF;
      }
    }
  }

  return {
  avg_salary_history: AVG_SALARY_HISTORY,
base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
 avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    sight_cutoff_by_payment_start: true,  // 陕西特殊：过渡性年限截止到实际缴费开始时间
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2024年计发基数7727元。2025年计发基数尚未公布，2025年退休预发暂用2024年基数7727，待公布后重新核算。过渡系数1.4%。陕西特殊：过渡性养老金年限截止到“实际缴费开始时间”，不是全省统账时间1996-01；统账前已有实际缴费的年限不计入过渡性年限。例如1993-01参加工作并同时缴费者，无视同缴费年限，过渡性养老金为0。计算平均缴费指数时，分母为“应缴纳年限”（含断缴时间）。',
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  1992: 212.08,
  1993: 240.83,   // 2890元/年 ÷12，陕西全省在岗职工年工资
  1994: 316.92,   // 3803元/年 ÷12
  1995: 366.33,
  1996: 406.83,
  1997: 473.67,
  1998: 502.42,
  1999: 577.58,
  2000: 650.33,
  2001: 760,
  2002: 862.58,
  2003: 955.08,
  2004: 1085.33,
  2005: 1233,
  2006: 1409.83,
  2007: 1782.58,  // 21391元/年 ÷12，按核定表附表修正
  2008: 2115.92,
  2009: 2524.42,
  2010: 2858.25,
  2011: 3253.58,
  2012: 3694.17,
  2013: 4071.08,
  2014: 4343.25,
  2015: 4741.33,
  2016: 5135.5,
  2017: 5619.42,
  2018: 6249.42,
  2019: 6594,
  2020: 6053,
  2021: 6543,
  2022: 7029,
  2023: 7598,
  2024: 7750,
  2025: 8031,  // 2025年度社保缴费基数·2024全口径社平（官方已发布，人社通汇总）
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["shaanxi"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：✅ 官方数据
// 2024年计发基数：7678元/月
// 更新时间：2026-06-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/shandong.js
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

// 山东省养老金计算数据模块
// TODO：补充1995-2022年官方计发基数（目前只有2023-2025年官方数据）
// 依据：鲁人社字〔2023〕108号、鲁人社字〔2024〕112号、鲁人社字〔2025〕100号

// ==================== 基础数据 ====================

// 山东省历年计发基数（元/月）
// 2023-2025来自官方文件，其余年份待补充
const PROV_BASE = {
  1978: 814,
  1979: 855,
  1980: 897,
  1981: 942,
  1982: 989,
  1983: 1039,
  1984: 1091,
  1985: 1145,
  1986: 1202,
  1987: 1263,
  1988: 1326,
  1989: 1392,
  1990: 1462,
  1991: 1535,
  1992: 1611,
  1993: 1692,
  1994: 1777,
  1995: 419.33,
  1996: 484.08,
  1997: 520.08,
  1998: 531,
  1999: 583.08,
  2000: 664.67,
  2001: 750,
  2002: 849.92,
  2003: 949,
  2004: 1091.42,
  2005: 1294.17,
  2006: 1602.33,
  2007: 1903.67,
  2008: 2200.33,
  2009: 2474,
  2010: 2810.75,
  2011: 3166,
  2012: 3547.92,
  2013: 3971,
  2014: 4371.67,
  2015: 4849.75,
  2016: 5296.83,
  2017: 5775.42,
  2018: 5448.58,
  2019: 5761.33,
  2020: 6573,
  2021: 6893,
  2022: 7182.5,
  2023: 7468,
  2024: 7678,
   2025: 7831,  // 2025年计发基数（济南2026-01正式核定表，2025-09预发仍用7678）
};;

// 山东省基数增长预测参数
const BASE_PARAMS = {
  
  PROV_GROWTH: 0.02,  // 约2%年增速
  MERGE_YEAR: 2031,
  PROV_2025: 7831,  // 2025年计发基数（济南2026-01正式核定表，2025-09预发仍用7678）
}

// 山东省城市列表（地级市）
// 菏泽市执行省平（不单独建模；图片中 7506 系旧口径，不作为独立计发基数，按用户 2026-07-12 决定）
const CITY_LIST = [
  '济南市', '青岛市', '淄博市', '枣庄市', '东营市',
  '烟台市', '潍坊市', '济宁市', '泰安市', '威海市',
  '日照市', '临沂市', '德州市', '聊城市', '滨州市',
  '菏泽市',
]

// ==================== 核心规则 ====================

// 山东省养老保险建账时间和 cutoff 时间
// ⚠️ 待确认：建账时间（目前按1998-01估算，待官方文件确认）
// ⚠️ 待确认：视同缴费cutoff时间（目前按1997-12估算，待官方文件确认）
// TODO：搜索关键词"鲁人社规 个人账户建立 1998"或"鲁政发〔2006〕XX号 养老保险办法"
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.013  // 山东过渡系数固定 1.3%（鲁政发[2006]92号，济南2026-01临时待遇核定表确认）（待官方文件确认）
// TODO：补充官方文件编号（如：鲁政发〔2006〕XX号）

const PROV_TAG = 'shandong'

// 山东省模块配置（有基础养老金 + 个人账户养老金 + 过渡性养老金）
const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

// ==================== 测试案例 ====================

// TODO：添加至少2个官方核定表案例
// 案例来源必须是官方核定表，不能AI自己编
const cases = [
  // 案例1：待添加（需官方核定表）
  // 案例2：待添加（需官方核定表）
]

// ==================== 引擎配置 ====================


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/shandong.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

function getEngineConfig() {
  const modules = {};
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true };
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF;
      }
    }
  }
  return {
  avg_salary_history: AVG_SALARY_HISTORY,
base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
 avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2024年基数7678元（鲁人社字〔2024〕112号）；济南2026-01临时待遇基数7831元。过渡系数1.3%。',
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  1996: 419.33,
  1997: 484.08,
  1998: 520.08,
  1999: 531,
  2000: 583.08,
  2001: 664.67,
  2002: 750,
  2003: 849.92,
  2004: 949,
  2005: 1091.42,
  2006: 1294.17,
  2007: 1602.33,
  2008: 1903.67,
  2009: 2200.33,
  2010: 2474,
  2011: 2810.75,
  2012: 3166,
  2013: 3547.92,
  2014: 3971,
  2015: 4371.67,
  2016: 4849.75,
  2017: 5296.83,
  2018: 5775.42,
  2019: 5448.58,
  // 2020起=全口径城镇单位就业人员平均工资(元/月)，来源：山东省官方社平工资表
  // 1996-2019=城镇非私营单位在岗职工平均工资；2020起口径切换
  // 2026-07-22核对：用户提供的"山东历年在岗职工平均工资大全"(1996-2023)逐行订正，
  //   原2020-2024段错位一年(原2020值=实际2021,依此类推)，已按官方表修正
  2020: 5761.33,    // 69136÷12
  2021: 6242.17,    // 74906÷12
  2022: 6633.08,    // 79597÷12
  2023: 7069.25,    // 84831÷12
  2024: 7506,       // 待官方表确认（原错位值上移后，此值来源待核实）
  2025: 7774,       // 2025年度社保缴费基数·2024全口径社平（官方已发布，人社通汇总）
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["shandong"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
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
  1995: 595.45,
  1996: 687.39,
  1997: 738.51,
  1998: 754.02,
  1999: 827.97,
  2000: 943.83,
  2001: 1065,
  2002: 1206.89,
  2003: 1347.58,
  2004: 1549.82,
  2005: 1837.72,
  2006: 2275.31,
  2007: 2703.21,
  2008: 3124.47,
  2009: 3513.08,
  2010: 3991.26,
  2011: 4495.72,
  2012: 5038.05,
  2013: 5638.82,
  2014: 6207.77,
  2015: 6886.64,
  2016: 7521.5,
  2017: 8201.1,
  2018: 7736.98,
  2019: 8181.09,
  2020: 9580,
  2021: 10338,
  2022: 11396,
  2023: 12183,
  2024: 12307,
   2025: 12434,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};;

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.045,
  MERGE_YEAR: 2031,
  PROV_2025: 12434,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
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


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/shanghai.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

function getEngineConfig() {
  // 将 MODULES 数组转换为 engines.modules 对象
  const modules = {};
  if (MODULES.includes('base')) modules.basic_pension = { enabled: true, rate_per_year: 0.01, formula_type: 'shanghai' };
  if (MODULES.includes('extra')) {
    modules.extra_pension = { enabled: true };
    if (EXTRA_PARAMS) {
      modules.extra_pension.brackets = EXTRA_PARAMS.brackets;
      modules.extra_pension.trigger = EXTRA_PARAMS.trigger;
    }
  }
  if (MODULES.includes('personal')) modules.personal_account = { enabled: true, round_to_jiao: true };
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
  avg_salary_history: AVG_SALARY_HISTORY,
base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

      province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
      name: '上海市',
    avg_salary_history: AVG_SALARY_HISTORY,
    modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2023年基数12183元，2024年基数12307元，2025年基数12434元（沪人社规〔2023/2024/2025〕XX号）。上海特有指数保底：视同按1；1993-2010年低于1按1；2011年不低于1、2012年不低于0.85、2013年不低于0.75；2014年起按实际（最低约0.6）。引擎输入的avg_index应为保底后的最终值。基础养老金计发(沪人社规〔2021〕27号)：满整年后的剩余月数按0.083%/月计发(非整年换算1%/年)，且基础/个人/过渡三项均"分进角"(四舍五入到角)。"当年增加养老金"：上海每年地方固定额（如2026年度325元），非公式计算，由输入 current_year_increase 提供并计入月基本养老金总额。',
  };
}


const AVG_SALARY_HISTORY = {
  1990: 195.25,
  1991: 205,
  1992: 215.25,
  1993: 226,
  1994: 237.33,
  1995: 249.17,
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
  2020: 10338,
  2021: 11396.42,
  2022: 12183,
  2023: 12307,
  2024: 12434,
  // 2025: 官方全口径未公布，交由引擎预发年规则外推(=2024原值)，公布后再填
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

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["shanghai"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：✅ 官方数据
// 2024年计发基数：7111元/月
// 更新时间：2026-06-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/shanxi.js
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

// 山西省养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 754,
  1979: 791,
  1980: 831,
  1981: 873,
  1982: 916,
  1983: 962,
  1984: 1010,
  1985: 1061,
  1986: 1114,
  1987: 1169,
  1988: 1228,
  1989: 1289,
  1990: 1354,
  1991: 1421,
  1992: 1492,
  1993: 1567,
  1994: 1645,
  1995: 1728,
  1996: 1814,
  1997: 1905,
  1998: 2000,
  1999: 2100,
  2000: 2205,
  2001: 2315,
  2002: 2431,
  2003: 2552,
  2004: 2680,
  2005: 2814,
  2006: 2955,
  2007: 3103,
  2008: 3258,
  2009: 3421,
  2010: 3592,
  2011: 3771,
  2012: 3960,
  2013: 4158,
  2014: 4366,
  2015: 4584,
  2016: 4813,
  2017: 5054,
  2018: 5306,
  2019: 5572,
  2020: 5921,
  2021: 6257,
  2022: 6695,
  2023: 6897,
  2024: 7111,
   2025: 7253,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};;

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031,
  PROV_2025: 6997,  // 2025年社平/缴费基数=6997元/月（晋人社厅发〔2025〕35号），非计发基数(计发基数见 PROV_BASE[2025]=7253)
}

// ==================== 城市列表 ====================

const CITY_LIST = [
  '太原',
  '大同',
  '阳泉',
  '长治',
  '晋城',
  '朔州',
  '晋中',
  '运城',
  '忻州',
  '临汾',
  '吕梁'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1997, month: 7 }  // 个人账户建立=1997-07(官方核定表"建账缴费时间1997年7月")；晋政发〔1998〕21号中人分界1998-07-01是另一概念(资格线)
const CUTOFF_DATE   = { year: 1997, month: 6 }  // 视同缴费截止=建账前一月(1997-06)，与核定表视同155个月=12.9167年一致

const TRANS_COEF = 0.013  // 山西省过渡系数 1.3%

const PROV_TAG = 'shanxi'

// ==================== 模块配置 ====================

const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

// ==================== 测试案例 ====================

const cases = [
  // 案例1：待用户提供官方核定表
  // 案例2：待用户提供官方核定表
]

// ==================== 引擎配置 ====================


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/shanxi.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

function getEngineConfig() {
  const modules = {};
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true };
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF;
      }
    }
  }

  return {
  avg_salary_history: AVG_SALARY_HISTORY,
base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
 avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2024年基数7111元（晋人社厅发〔2024〕39号），2025年基数7253元（晋人社厅发〔2025〕36号）',
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  // 山西为「当年」口径：槽位Y存Y年度官方社平值（元/年÷12）。
  // 原序列整体错位一年（槽位Y=Y-1值，如2010槽=2009/12），已整体【上移一年】纠正为本年口径。
  // 2025=6997 取自晋人社厅发〔2025〕35号（2025年缴费基数6997元/月，下限4198/上限20991，2025-01-01起执行），即2025年度社平/缴费基数。计发基数另见 PROV_BASE[2025]=7253（晋人社厅发〔2025〕36号），二者不可混。
  1992: 210.83,
  1993: 252.08,
  1994: 333.08,
  1995: 393.42,
  1996: 431.92,
  1997: 443.33,
  1998: 470.08,
  1999: 505.42,
  2000: 576.5,
  2001: 676.83,
  2002: 779.75,
  2003: 894.17,
  2004: 1078.58,
  2005: 1303.75,
  2006: 1525,
  2007: 1793.75,
  2008: 2152.33,
  2009: 2372.42,
  2010: 2795.33,
  2011: 3325.25,
  2012: 3745.25,
  2013: 3867.25,
  2014: 4080.75,
  2015: 4413.33,
  2016: 4581,
  2017: 5129,
  2018: 4656,  // 2018年山西切入全口径(官方表标注全口径),与第二列4656一致

  2019: 4832,    // 官方表(图3)第二列2019社平=4832(原5392.33系与2020重复,已修正)

  2020: 5392.33, // 官方表第二列2020社平=5392,吻合
  2021: 5914,
  2022: 6438.08,
  2023: 6854.58,
  2024: 6997,
  2025: 6997,  // 2025年缴费基数=6997元/月（晋人社厅发〔2025〕35号），即2025年度社平/缴费基数
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["shanxi"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：8321元/月
// 更新时间：2026-06-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/sichuan.js
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

// 四川省养老金计算数据模块
// 同时支持新格式（Mini Program）和旧格式（引擎）

// ==================== 新格式（Mini Program 用）====================

// 四川省历年计发基数（元/月）
// 数据来源：用户提供历年平均工资表（2026-06-18），全口径城镇单位就业人员平均工资
// 注：2018年后为全口径，2013-2017年为在岗职工平均工资
const PROV_BASE = {
  1978: 882,
  1979: 926,
  1980: 972,
  1981: 1021,
  1982: 1072,
  1983: 1126,
  1984: 1182,
  1985: 1241,
  1986: 1303,
  1987: 1368,
  1988: 1437,
  1989: 1509,
  1990: 1584,
  1991: 1663,
  1992: 1746,
  1993: 1834,
  1994: 1925,
  1995: 2022,
  1996: 2123,
  1997: 2229,
  1998: 2340,
  1999: 2457,
  2000: 2580,
  2001: 2709,
  2002: 2845,
  2003: 2987,
  2004: 3136,
  2005: 3293,
  2006: 3458,
  2007: 3630,
  2008: 3812,
  2009: 4003,
  2010: 4203,
  2011: 4413,
  2012: 4633,
  2013: 4865,
  2014: 5108,
  2015: 5364,
  2016: 5632,
  2017: 5914,
  2018: 6209,
  2019: 6520,
  2020: 7041,
  2021: 7379,
  2022: 7822,
  2023: 8079,
  2024: 8321,
  2027: 9018,
  2028: 9255,
  2029: 9497,
  2030: 9745,
  2031: 10000,
  2032: 10260,
  2033: 10517,
  2034: 10780,
  2035: 11049,
   2025: 8462,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};;

// 四川省历年平均工资（元/月，用于计算缴费基数）
// 1996-2013：用户提供官方数据（元/年÷12→元/月）
// 2014-2025：全口径城镇单位就业人员平均工资（用户提供）


// 四川省基数增长预测参数
// 数据来源：用户提供历年平均工资表（2026-06-18）
// 2023年月平均工资：7518.33元
// 2024年：7894元（增长5.0%，历史参考）
// 2025年全口径社平：7646元（=2024全口径社平，国办发〔2019〕13号口径，官方已发布）；2025计发基数见PROV_BASE[2025]=8462
const BASE_PARAMS = {
  
  PROV_GROWTH: 0.050,  // 约 5.0%/年
  MERGE_YEAR: 2031,
  PROV_2025: 7646,  // 2025年全口径社平=2024全口径社平(7646)；2025计发基数见PROV_BASE[2025]=8462
}

// 四川省行政区划（全省统筹，无地级市区分）
const CITY_LIST = [
  { code: 'prov', name: '全省（默认）' }
]

// 四川省养老保险建账时间和 cutoff 时间
// 依据：川劳社发〔2006〕17号
const ACCOUNT_START = { year: 1996, month: 1 }  // 1996年1月1日起建账
const CUTOFF_DATE   = { year: 1995, month: 12 }  // 视同缴费截止 1995-12

const TRANS_COEF = 0.013  // 四川过渡系数固定 1.3%

const PROV_TAG = 'sichuan'

// 四川省模块配置（有基础养老金 + 增发养老金 + 个人账户养老金 + 过渡性养老金）
const MODULES = ['base', 'extra', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  extra:       '增发养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}
const MODULE_FORMULAS = {
  base:       (legal, d) => '(' + (legal.baseRetire||0) + '+' + (legal.baseProv||0) + ') ÷ 2 × ' + ((legal.totalYears||0)).toFixed(2) + '年 × 1%',
  extra:      (legal, d) => '指数化工资' + ((legal.baseRetire||0) * (d.avgIndex||0)).toFixed(2) + '×' + ((d.extraRate||0.001) * 100).toFixed(1) + '%×' + ((legal.totalYears||0)).toFixed(2) + '年',
  personal:   (legal, d) => (d.personalAcc||0) + ' ÷ ' + (legal.months||139),
  transition: (legal, d) => '(' + (legal.baseRetire||0) + '+' + (legal.baseProv||0) + ') ÷ 2 × ' + ((legal.preAccountYears||0)).toFixed(2) + '年 × 1.3%',
}
const MODULE_COLORS = ['#1d4ed5','#0369a1','#0ea5e9','#0284c7']

// ==================== 旧格式（引擎用）====================
// 引擎 calculate(config, inputData) 需要的格式
// 通过 getEngineConfig() 获取

const VIEWING_START = { year: 1996, month: 1 }
const USE_PRE_ACCOUNT_YEARS = true

// 计发月数表（引擎用 monthly_payment_months 字段名）
const MONTHLY_PAYMENT_MONTHS = {
  50.0: 195, 50.5: 192.5, 51.0: 190, 51.5: 187.5,
  52.0: 185, 52.5: 182.5, 53.0: 180, 53.5: 177.5,
  54.0: 175, 54.5: 172.5, 55.0: 170, 55.5: 167.5,
  56.0: 164, 56.5: 161.5, 57.0: 158, 57.5: 155.5,
  58.0: 152, 58.5: 149.5, 59.0: 145, 59.5: 142.5,
  60.0: 139, 60.5: 136.1, 61.0: 132, 61.5: 128.6,
  62.0: 125, 62.5: 121.4, 63.0: 117, 63.5: 113.4
}

const MIN_YEARS_CONFIG = {
  2025: 15, 2026: 15, 2027: 15, 2028: 15, 2029: 15,
  2030: 15.5, 2031: 16, 2032: 16.5, 2033: 17, 2034: 17.5,
  2035: 18, 2036: 18.5, 2037: 19, 2038: 19.5,
  2039: 20, 2040: 20, 2041: 20, 2042: 20, 2043: 20, 2044: 20, 2045: 20
}

const DELAY_RETIREMENT = {
  effective_date: "2026-01-01",
  male:   { base_year: 1965, step: 4, cap_months: 36 },
  fc:     { base_year: 1970, step: 4, cap_months: 36 },
  fw55:   { base_year: 1975, step: 2, cap_months: 60 }
}

// 引擎用的 modules 格式（含 enabled、formula_type、formula 等字段）
const ENGINE_MODULES = {
  basic_pension: {
    enabled: true,
    rate_per_year: 0.01,
    formula: "(月计发基数 + 指数化月平均缴费工资) / 2 × 累计缴费年限 × 1%"
  },
  extra_pension: {
    enabled: true,
    formula_type: "sichuan",
    rate: 0.001,
    formula: "指数化月平均缴费工资 × 0.1% × 累计缴费年限"
  },
  personal_account: {
    enabled: true,
    formula: "个人账户累计储存额 / 计发月数"
  },
  transitional_pension: {
    enabled: true,
    formula_type: "sichuan",
    coefficient: 0.013,
    formula: "(月计发基数 + 指数化月平均缴费工资) / 2 × 1995年底前未建账缴费年限 × 1.3%"
  },
  special_addition: {
    enabled: false
  }
}

const CITIES = [
  { code: 'prov', name: '全省（默认）' }
]

const NOTES = {
  policy: "四川省企业职工基本养老保险按照川劳社发〔2006〕17号及相关文件执行。",
  base_pension_formula: "基础养老金 = (月计发基数 + 指数化月平均缴费工资) ÷ 2 × 累计缴费年限 × 1%",
  transitional_pension_formula: "过渡性养老金 = (月计发基数 + 指数化月平均缴费工资) ÷ 2 × 1995年12月31日及以前未建立个人账户的累计缴费年限 × 1.3%",
  extra_pension_formula: "月增发养老金 = 指数化月平均缴费工资 × 0.1% × 累计缴费年限 + 定额（根据条件确定）",
  account_start: "建账时间为1996年1月1日",
  transition_coefficient: "过渡系数统一为1.3%",
  data_source: "计发基数：2023年8079元（2024年初退休按此预发）、2024年8321元、2025年8462元，均来自官方核定表；2024年全口径社平7646元、2023年7518.33元来自用户提供。",
  special_notes: "四川省增发养老金为地方性政策，增发比例0.1%~0.4%+（因人而异），具体条件和定额标准需根据川劳社发〔2006〕18号细则确定。定额部分（如6.83元）需根据个人具体情况确定。"
}

/**
 * 获取引擎格式的配置对象
 * 引擎 calculate(config, inputData) 需要此格式
 * @returns {Object} 引擎配置对象
 */
function getEngineConfig() {
  return {
  avg_salary_history: AVG_SALARY_HISTORY,
    province: 'sichuan',
    name: '四川省',
    
      base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    viewing_start: VIEWING_START,
    usePreAccountYears: USE_PRE_ACCOUNT_YEARS,
    base_rates: {
      prov: PROV_BASE
    },
    avg_salary_history: AVG_SALARY_HISTORY,
    monthly_payment_months: MONTHLY_PAYMENT_MONTHS,
    min_years: MIN_YEARS_CONFIG,
    delay_retirement: DELAY_RETIREMENT,
    modules: ENGINE_MODULES,
    cities: CITIES,
    cases: cases,
    notes: NOTES
  }
}

// ==================== 新格式（Mini Program 用）====================
const cases = [
  {
    name: "四川案例1（2024年退休，女，50岁，无视同缴费）",
    birthYear: 1974,
    birthMonth: 1,
    workYear: 2007,
    workMonth: 1,
    retireYear: 2024,
    retireMonth: 4,
    cityType: "prov",
    sightYears: 0,
    totalYears: 17.33,
    actualYears: 17.33,
    personalAcc: 91147.87,
    avgIndex: 0.84,
    baseRetire: 8079,
    baseProv: 8079,
    months: 195,
    isPreApproval: false,
    results: {
      basePension: 1288.08,
      personalPension: 467.42,
      transitionalPension: 0,
      extraPension: 117.61,
      totalPension: 1873.11
    },
    officialDocument: "四川省社会保险业务办理结果通知单（2024-04）",
    note: "2024-04退休；月计发基数8079元；平均缴费指数0.84；指数化月平均工资6786.36元；无视同缴费；实际缴费208个月；个人账户91147.87元；增发养老金117.61元（指数化工资×0.1%×累计缴费年限）"
  },
  {
    name: "四川案例3（2025年退休，男，60岁1个月，有过渡性养老金）",
    birthYear: 1965,
    birthMonth: 11,
    workYear: 1982,
    workMonth: 12,
    retireYear: 2025,
    retireMonth: 12,
    cityType: "prov",
    sightYears: 10.83,
    totalYears: 43.08,
    actualYears: 32.25,
    preAccountYears: 13.08,
    personalAcc: 111640.05,
    avgIndex: 0.872,
    baseRetire: 8462,
    baseProv: 8462,
    months: 138.4,
    isPreApproval: false,
    results: {
      basePension: 3412.12,
      personalPension: 806.65,
      transitionalPension: 1346.79,
      extraPension: 317.88,
      totalPension: 5883.44
    },
    officialDocument: "四川省社会保险业务办理结果通知单（2025-12）",
    note: "2025-12退休；月计发基数8462元；平均缴费指数0.872；指数化月平均工资7378.86元；视同缴费130个月(10.83年)；实际缴费387个月(32.25年)；累计缴费517个月(43.08年)；1995年底前未建账157个月(13.08年)；个人账户111640.05元；增发养老金317.92元"
  },
  {
    name: "四川案例4（2024年退休，女，50岁，有预核定→核定过程）",
    birthYear: 1974,
    birthMonth: 6,
    workYear: 1992,
    workMonth: 9,
    retireYear: 2024,
    retireMonth: 6,
    cityType: "prov",
    sightYears: 0,
    totalYears: 31.83,
    actualYears: 31.83,
    preAccountYears: 3.33,
    personalAcc: 150397.22,
    avgIndex: 0.935,
    baseRetire: 8321,
    baseProv: 8321,
    months: 195,
    isPreApproval: false,
    results: {
      basePension: 2562.50,
      personalPension: 771.27,
      transitionalPension: 348.51,
      extraPension: 247.64,
      totalPension: 3929.92
    },
    officialDocument: "四川省社会保险业务办理结果通知单（2024-06，重核后）",
    note: "2024-06退休；月计发基数8321元；平均缴费指数0.935；指数化月平均工资7780.14元；无视同缴费；实际缴费382个月(31.83年)；累计缴费382个月(31.83年)；1995年底前未建账40个月(3.33年)；个人账户150397.22元；增发养老金247.64元（指数化工资×0.1%×累计缴费年限，定额0）；初始预核定3916.03元，重核后3929.92元"
  },
  {
    name: "四川案例5（2024年退休，男，55岁，政策性提前退，增发0.4%）",
    birthYear: 1969,
    birthMonth: 3,
    workYear: 1986,
    workMonth: 11,
    retireYear: 2024,
    retireMonth: 3,
    cityType: "prov",
    sightYears: 5.08,
    totalYears: 37.08,
    actualYears: 32.00,
    preAccountYears: 8.83,
    personalAcc: 88960.59,
    avgIndex: 0.726,
    baseRetire: 8079,
    baseProv: 8079,
    months: 170,
    extraRate: 0.004,
    isPreApproval: false,
    results: {
      basePension: 2585.28,
      personalPension: 523.30,
      transitionalPension: 800.34,
      extraPension: 869.95,
      totalPension: 4778.87
    },
    officialDocument: "四川省社会保险业务办理结果通知单（2024-03）",
    note: "2024-03退休，男，55岁，政策性提前退；月计发基数8079元；平均缴费指数0.726；指数化月平均工资5865.35元；视同缴费61个月(5.08年)；实际缴费384个月(32年)；累计缴费445个月(37.08年)；1995年底前未建账106个月(8.83年)；个人账户88960.59元；计发月数170；增发养老金869.95元（比例0.4%=指数化工资×0.4%×累计缴费年限+定额）"
  },
  {
    name: "四川案例6（2025年退休，男，60岁，正常退休，增发0.1%）",
    birthYear: 1965,
    birthMonth: 11,
    workYear: 1982,
    workMonth: 12,
    retireYear: 2025,
    retireMonth: 12,
    cityType: "prov",
    sightYears: 10.83,
    totalYears: 43.08,
    actualYears: 32.25,
    preAccountYears: 13.08,
    personalAcc: 111640.05,
    avgIndex: 0.872,
    baseRetire: 8462,
    baseProv: 8462,
    months: 138.4,
    extraRate: 0.001,
    isPreApproval: false,
    results: {
      basePension: 3412.12,
      personalPension: 806.65,
      transitionalPension: 1346.79,
      extraPension: 317.88,
      totalPension: 5883.44
    },
    officialDocument: "四川省社会保险业务办理结果通知单（2025-12）",
    note: "2025-12退休，男，60岁，正常退休；月计发基数8462元；平均缴费指数0.872；指数化月平均工资7378.86元；视同缴费130个月(10.83年)；实际缴费387个月(32.25年)；累计缴费517个月(43.08年)；1995年底前未建账157个月(13.08年)；个人账户111640.05元；计发月数138.4；增发养老金317.88元（比例0.1%=指数化工资×0.1%×累计缴费年限+定额）"
  }
]

// 计发基数预测函数（四川省专用）
function predictBase(year) {
  const lastYear = 2026
  const lastVal  = PROV_BASE[lastYear] || 8462
  if (year <= lastYear) return PROV_BASE[year] || 0
  return Math.round(lastVal * Math.pow(1 + BASE_PARAMS.PROV_GROWTH, year - lastYear))
}


const AVG_SALARY_HISTORY = {
  1995: 2022,
  1996: 2123,
  1997: 2229,
  1998: 2340,
  1999: 2457,
  2000: 2580,
  2001: 2709,
  2002: 2845,
  2003: 2987,
  2004: 3136,
  2005: 3293,
  2006: 3458,
  2007: 3630,
  2008: 3812,
  2009: 4003,
  2010: 4203,
  2011: 4413,
  2012: 4633,
  2013: 4865,
  2014: 5108,
  2015: 5364,
  2016: 5632,
  2017: 5914,
  2018: 6209,
  2019: 6520,
  2020: 6210,
  2021: 6785,
  2022: 7076,
  2023: 7518.33,
  2024: 7646,
  // 2025: 官方全口径未公布，交由引擎预发年规则外推(=2024原值)，公布后再填
};


module.exports = {
  PROV_BASE,
  AVG_SALARY_HISTORY,
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
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["sichuan"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：✅ 官方数据
// 2024年计发基数：9232元/月
// 更新时间：2026-06-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/tianjin.js
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

// 天津市养老金计算模块
// 计发基数(PROV_BASE)状态：1992-2019 经用户官方表(2026-07-18)确认=社平口径；
// 2023(9016)/2024(9232)/2025(9417) 经案例核定表+津人社办发〔2024〕49号确认；
// 2020-2022(7940/8324/8672) 为改革后单独公布值，待官方红头逐年限核。

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 979,
  1979: 1027,
  1980: 1079,
  1981: 1133,
  1982: 1189,
  1983: 1249,
  1984: 1311,
  1985: 1377,
  1986: 1446,
  1987: 1518,
  1988: 1594,
  1989: 1674,
  1990: 1757,
  1991: 1845,
  1992: 260,
  1993: 334,
  1994: 447,
  1995: 542,
  1996: 637,
  1997: 690,
  1998: 829,
  1999: 921,
  2000: 1040,
  2001: 1192,
  2002: 1355,
  2003: 1554,
  2004: 1813,
  2005: 2106,
  2006: 2370,
  2007: 2823,
  2008: 3465,
  2009: 3731,
  2010: 4266,
  2011: 4836,
  2012: 5320,
  2013: 5714,
  2014: 6047,
  2015: 6350,
  2016: 6731,
  2017: 7073,
  2018: 7540,
  2019: 6323,
  2020: 7940,
  2021: 8324,
  2022: 8672,
  2023: 9016,
  2024: 9232,
   2025: 9417,  // 2025年计发基数（天津官方公布；案例1核定表实测：2026-03退休使用9417。计发基数由天津单独公布，≠社平8540）
};;

const BASE_PARAMS = {
  PROV_GROWTH: 0.026,
  LATEST_BASE_YEAR: 2024,
  LATEST_BASE_VALUE: 8540,
  PROV_2025: 8540,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
}

// ==================== 城市列表 ====================

const CITY_LIST = []

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.010  // 天津市过渡系数 1.0%（真实表核定：过渡=基数×全部平均工资指数×1997年底前年限×1%）

const PROV_TAG = 'tianjin'

// ==================== 模块配置 ====================

const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

// ==================== 测试案例 ====================

const cases = [
  // 案例1：待用户提供官方核定表
  // 案例2：待用户提供官方核定表
]

// ==================== 引擎配置 ====================


// 历年社平工资（元/月）—— 用于缴费指数分母(计算Y年指数用Y-1年本市在岗职工月平均工资)
// 数据来源：用户提供的"天津市历年在岗职工月平均工资大全"(2026-07-18，元/月，1992-2024)
//   → 1992-2024 已逐行核对一致；2025=8861为外推值待官方公布；1990-1991不在表范围。


function getEngineConfig() {
  const modules = {};
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true };
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF;
      }
    }
  }

  return {
  avg_salary_history: AVG_SALARY_HISTORY,
base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
 avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2023年基数9016元（津人社局发〔2023〕15号），2024年基数9232元（津人社办发〔2024〕49号）',
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  // ⚠️ 1990-1991 不在用户提供的官方表范围(表自1992年起)，保留引擎原值但未核对；
  //    天津建账1998-01，实际计算不使用1990-1991，待官方表补齐。
  1990: 146.42,
  1991: 153.75,
  // 以下1992-2024 = 用户提供的"天津市历年在岗职工月平均工资大全"(2026-07-18，单位元/月)。
  // 该表=缴费指数分母(官方说明：计算Y年指数用Y-1年本市在岗职工月平均工资)。
  // 1992-2019 与 PROV_BASE(计发基数)重合，因2020改革前天津计发基数=社平工资；
  // 2020起社平(全口径)与计发基数脱钩，社平走低、计发基数单独公布(见PROV_BASE)。
  1992: 260,
  1993: 334,
  1994: 447,
  1995: 542,
  1996: 637,
  1997: 690,
  1998: 829,
  1999: 921,
  2000: 1040,
  2001: 1192,
  2002: 1355,
  2003: 1554,
  2004: 1813,
  2005: 2106,
  2006: 2370,
  2007: 2823,
  2008: 3465,
  2009: 3731,
  2010: 4266,
  2011: 4836,
  2012: 5320,
  2013: 5714,
  2014: 6047,
  2015: 6350,
  2016: 6731,
  2017: 7073,
  2018: 7540,
  2019: 6323,   // 2020全口径切换前最后一年(在岗职工口径)；2019<2018为口径切换下凹
  2020: 6777,   // 2020起全口径城镇单位就业人员平均工资(与PROV_BASE计发基数脱钩)
  2021: 7478,
  2022: 7919,
  2023: 8355,
  2024: 8540,   // 2024全口径社平=计算2025缴费指数分母(用户表注明)
  2025: 8861,   // 2025年度社保缴费基数(外推，待官方公布)
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["tianjin"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：2024计发基数7750元/月、2025计发基数8448元/月 已官方确认
//   - 2024计发基数7750（官方确认，依据：新人社函〔2025〕168号称"较2024年的7750元上涨698元"）
//   - 2025计发基数8448 = 2024全口径社平 101381元/月（新人社函〔2025〕168号，2025-08-25发布）
//   - 社平AVG_SALARY_HISTORY(1995–2022)已于2026-07-18经用户提供官方表(元/年)逐月÷12核对一致；计发基数PROV_BASE(1995–2022)仍为暂存值待官方核
// 更新时间：2026-07-18

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/xinjiang.js
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

// 新疆维吾尔自治区养老金计算模块
// TODO：补充1995-2022年官方计发基数(PROV_BASE)待核（社平AVG_SALARY_HISTORY已官方确认，2026-07-18）

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 883,
  1979: 927,
  1980: 974,
  1981: 1022,
  1982: 1073,
  1983: 1127,
  1984: 1184,
  1985: 1243,
  1986: 1305,
  1987: 1370,
  1988: 1439,
  1989: 1511,
  1990: 1586,
  1991: 1665,
  1992: 1749,
  1993: 1836,
  1994: 1928,
  1995: 2024,
  1996: 2125,
  1997: 2232,
  1998: 2343,
  1999: 2460,
  2000: 2583,
  2001: 2713,
  2002: 2848,
  2003: 2991,
  2004: 3140,
  2005: 3297,
  2006: 3462,
  2007: 3635,
  2008: 3817,
  2009: 4008,
  2010: 4208,
  2011: 4419,
  2012: 4640,
  2013: 4872,
  2014: 5115,
  2015: 5371,
  2016: 5639,
  2017: 5921,
  2018: 6217,
  2019: 6528,
  2020: 5738,
  2021: 6531,
  2022: 7089,
  2023: 7625,
  2024: 7750,    // 2024年计发基数(官方确认)
   2025: 8448,  // 2025年计发基数=2024全口径社平101381元/年=8448元/月(新人社函〔2025〕168号，2025-08-25发布)
};;

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031,
  PROV_2025: 8448,  // 2025年计发基数=2024全口径社平101381元/年=8448元/月(新人社函〔2025〕168号)
}

// ==================== 城市列表 ====================

const CITY_LIST = [
  '乌鲁木齐',
  '克拉玛依',
  '吐鲁番',
  '哈密'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
// 新疆个人账户建立时间：新政发〔1997〕107号 / 新政发〔2006〕59号，统一为1996年1月1日
const ACCOUNT_START = { year: 1996, month: 1 }
const CUTOFF_DATE   = { year: 1995, month: 12 }

const TRANS_COEF = 0.013  // 新疆维吾尔自治区过渡系数 1.3%（新政发〔2006〕59号）

const PROV_TAG = 'xinjiang'

// ==================== 模块配置 ====================

const MODULES = ['base', 'personal', 'transition', 'other']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

// ==================== 测试案例 ====================

const cases = [
  // 案例1：待用户提供官方核定表
  // 案例2：待用户提供官方核定表
]

// ==================== 引擎配置 ====================


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/xinjiang.json avg_salary_history（已统一为元/月格式，2025-07-06 校验；2026-07-18 经用户提供官方历年社平表(元/年)逐月÷12限核一致）
;

function getEngineConfig() {
  const modules = {};
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true };
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF;
      }
    }
  }

  // 冬季采暖补贴 120元/月（新政办发[2010]167号）
  if (MODULES.includes('other')) {
    modules.special_addition = { enabled: true, type: 'fixed', amount: 120, label: '冬季采暖补贴' };
  }

  return {
  avg_salary_history: AVG_SALARY_HISTORY,
base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
 avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2024计发基数7750、2025计发基数8448（新人社函〔2025〕168号已确认）；1995-2022历史年表待官方逐年限核',
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  1995: 445.67,
  1996: 498.92,
  1997: 546.5,
  1998: 569.75,
  1999: 621.08,
  2000: 717.5,
  2001: 859.83,
  2002: 971.67,
  2003: 1099.17,
  2004: 1207,
  2005: 1296.5,
  2006: 1484.92,
  2007: 1786.17,
  2008: 2057,
  2009: 2145.67,
  2010: 2466.08,
  2011: 3004.42,
  2012: 3470.17,
  2013: 3816.5,
  2014: 4132.58,
  2015: 4417,
  2016: 4740.17,
  2017: 5032.17,
  2018: 5392,
  2019: 5738,
  2020: 6531,
  2021: 7089,
  2022: 7625.08,  // 91501元/年÷12=7625.08（用户提供官方表，2026-07-18确认）
  2023: 8332,
  2024: 8448,
  // 2025: 官方全口径未公布，交由引擎预发年规则外推(=2024原值)，公布后再填
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  TRANS_COEF,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["xinjiang"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：官方（西藏统计局/人社厅发布）
// 2024年计发基数：11546元/月
// 更新时间：2026-07-09

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/xizang.js
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

// 西藏自治区养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 1224,
  1979: 1285,
  1980: 1349,
  1981: 1417,
  1982: 1488,
  1983: 1562,
  1984: 1640,
  1985: 1722,
  1986: 1808,
  1987: 1899,
  1988: 1994,
  1989: 2093,
  1990: 2198,
  1991: 2308,
  1992: 2423,
  1993: 2544,
  1994: 2671,
  1995: 2805,
  1996: 2945,
  1997: 3093,
  1998: 3247,
  1999: 3410,
  2000: 3580,
  2001: 3759,
  2002: 3947,
  2003: 4144,
  2004: 4352,
  2005: 1550,
  2006: 2300,
  2007: 2500,
  2008: 2800,
  2009: 2900,
  2010: 3000,
  2011: 3200,
  2012: 3500,
  2013: 3600,
  2014: 4000,
  2015: 5100,
  2016: 5929,
  2017: 6708,
  2018: 7587,
  2019: 7815,
  2020: 8143,
  2021: 8839,
  2022: 9900,
  2023: 10791,
  2024: 11546,
   2025: 11777,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};;

// 西藏历年社平工资（元/月，用于个人账户计算）
// 数据来源：用户提供官方核定表截图（2005-2025年，元/年÷12→元/月）


const BASE_PARAMS = {
  
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031,
  PROV_2025: 11777,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
}

// ==================== 城市列表 ====================

const CITY_LIST = [
  '拉萨',
  '日喀则',
  '昌都',
  '林芝',
  '山南',
  '那曲'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.014  // 西藏自治区过渡系数 1.4000000000000001%

// 西藏特殊待遇分项（按地区类别，单位：元/月）
// 数据来源：用户提供的西藏企业职工基本养老金核定表（拉萨·二类地区，case_id 24 / 新女表）
// 高原补贴为动态值：= 指数化月平均缴费工资 × 高原补贴比例
//   指数化月平均缴费工资 = 退休地计发基数 × 平均缴费指数
//   高原补贴比例按"在西藏工作年限"：满10年不满15年→5%；满15年不满20年→10%；20年以上→15%
//   交通/取暖/福利为地区固定金额（二类地区：交通30、取暖39.88、福利260）
// 注：高原补贴计入"基本养老待遇"段，交通+采暖+福利计入"其他待遇"段，合计均纳入月总待遇
const XIZANG_SUBSIDIES = {
  '二类地区': { transport_fee: 30.0, heating_fee: 39.88, welfare_fund: 260.0 },
  // 其他地区待补充官方核定表
}

const PROV_TAG = 'xizang'

// ==================== 模块配置 ====================

const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

// ==================== 测试案例 ====================

const cases = [
  // 案例1：待用户提供官方核定表
  // 案例2：待用户提供官方核定表
]

// ==================== 引擎配置 ====================

function getEngineConfig() {
  const modules = {};
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true };
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF;
      }
    }
  }
  // 西藏特殊待遇：高原补贴 + 采暖 + 交通 + 福利（按地区类别分项）
  modules.special_addition = {
    enabled: true,
    type: 'xizang_subsidies',
    subsidies: XIZANG_SUBSIDIES,
  };

  return {
  avg_salary_history: AVG_SALARY_HISTORY,
base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
    avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,

    // 西藏灵活就业退休年龄（藏政发〔2006〕37号等）：女45岁、男55岁
    // 引擎 getRetireTotalMonths 识别此配置后，自动取对应法定退休年龄与计发月数
    flex_retire_age: { male: 55, female: 45 },

    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '社平数据：1998-2004=西藏统计局官方（当年口径，元/年÷12）；2005-2025=社保核验表逐行确认（2025-12-10出具，缴费指数=缴费工资÷社平工资精确匹配）。口径=当年（非上年度）。特殊待遇按地区类别分项计发。',
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  // 西藏为「当年」口径：槽位Y存Y年度真实月均值（元/年÷12）
  // 数据来源：
  //   1998-2004：西藏统计局发布（元/年），用户提供官方截图核对
  //   2005-2025：西藏社保经办机构核验表逐行确认（2025-12-10出具）
  // 核验依据：缴费指数=缴费工资÷社平工资（元/年），10行全部精确匹配
  1998: 915.58,    // ✅ 官方：1998年度 10987÷12
  1999: 1080.17,   // ✅ 官方：1999年度 12962÷12
  2000: 1248.00,   // ✅ 官方：2000年度 14976÷12
  2001: 1595.33,   // ✅ 官方：2001年度 19144÷12
  2002: 2063.83,   // ✅ 官方：2002年度 24766÷12
  2003: 2244.25,   // ✅ 官方：2003年度 26931÷12
  2004: 2572.75,   // ✅ 官方：2004年度 30873÷12
  // --- 2005-2025：社保核验表逐行确认（2025-12-10出具）---
  // 核验依据：缴费指数=缴费工资(元/年)÷社平工资(元/年)，全部精确匹配
  2005: 1550,       // ✅ 核验表 18600÷12
  2006: 2300,       // ✅ 27600÷12
  2007: 2500,       // ✅ 30000÷12
  2008: 2800,       // ✅ 33600÷12
  2009: 2900,       // ✅ 34800÷12
  2010: 3000,
  2011: 3200,
  2012: 3500,
  2013: 3600,
  2014: 4000,
  2015: 5100,
  2016: 5929,
  2017: 6708,
  2018: 7587,
  2019: 7815,
  2020: 8839,       // ✅ 核验表 97716÷12（原8839❌错位）
  2021: 9900,       // ✅ 核验表 106068÷12（原9900❌错位）
  2022: 10791,       // ✅ 核验表 118800÷12（原10791❌错位）
  2023: 11546,      // ✅ 核验表 129492÷12（原11546❌错位）
  2024: 11777,      // ✅ 核验表"退休时上年在岗月平均工资"=11777（原11546❌）,
  // 2025: 官方全口径未公布，交由引擎预发年规则外推(=2024原值)，公布后再填
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  AVG_SALARY_HISTORY,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["xizang"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：✅ 官方数据（用户提供的云南省历年社平工资表）
// 2024年计发基数：7177元/月
// 更新时间：2026-06-18

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/yunnan.js
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
   2025: 8265,  // 2025年计发基数=2024年全省全口径社平（真实表 2025-09 确认）
};;

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
  PROV_2025: 8265,  // 2025年计发基数=2024年全省全口径社平（真实表 2025-09 确认）
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


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/yunnan.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
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
  if (MODULES.includes('other')) {
    modules.special_addition = {
      enabled: true,
      type: 'one_child',
      rate: 0.05,
      avgPensionData: BASE_PARAMS.AVG_PENSIONER_PENSION || {},
    };
  }

  return {
  avg_salary_history: AVG_SALARY_HISTORY,
base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
    name: '云南省',
 avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: true,  // 云南省过渡性养老金使用建账前缴费年限（含视同+建账前实际），真实表确认
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2024年计发基数8183元/月（真实表确认）；2025年计发基数8265元/月（2025-09 真实表确认，2025-01 退休预发时暂用2024年基数8183）。过渡性养老金=指数化月均工资×建账前缴费年限×1.3%。独生子女补贴=上年度全省退休人员月平均基本养老金×5%（无过渡性调节金时）；2025-01 退休暂用2023年值3431元，2025-09 退休使用2024年值3553元。',
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
  2024: 7263,
  2025: 7427,  // 2025年计发基数尚未公布，预发暂用2024年基数8183
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

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["yunnan"] = cfg;
})();
(function () {
  var module = { exports: {} };
  var exports = module.exports;
// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：8310元/月
// 更新时间：2026-06-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/zhejiang.js
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

// 浙江省养老金计算数据模块
// TODO：补充1995-2022年官方计发基数（目前只有2023-2025年数据）
// 依据：浙人社规〔2023〕?号、浙人社规〔2024〕?号、浙人社规〔2025〕?号

// ==================== 基础数据 ====================

// 浙江省历年计发基数（元/月）
// 2023-2025来自官方数据，其余年份待补充
const PROV_BASE = {
  1978: 881,
  1979: 925,
  1980: 971,
  1981: 1020,
  1982: 1071,
  1983: 1124,
  1984: 1180,
  1985: 1239,
  1986: 1301,
  1987: 1366,
  1988: 1435,
  1989: 1507,
  1990: 1582,
  1991: 1661,
  1992: 1744,
  1993: 1831,
  1994: 1923,
  1995: 2019,
  1996: 2120,
  1997: 2226,
  1998: 2337,
  1999: 2454,
  2000: 2577,
  2001: 2705,
  2002: 2841,
  2003: 2983,
  2004: 3132,
  2005: 3289,
  2006: 3453,
  2007: 3626,
  2008: 3807,
  2009: 3997,
  2010: 4197,
  2011: 4407,
  2012: 4627,
  2013: 4859,
  2014: 5102,
  2015: 5357,
  2016: 5625,
  2017: 5906,
  2018: 6201,
  2019: 6511,
  2020: 5960,
  2021: 6594,
  2022: 7437,
  2023: 8020,
  2024: 8310,
   2025: 8433,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};;

// 浙江省基数增长预测参数
const BASE_PARAMS = {
  
  PROV_GROWTH: 0.015,  // 约1.5%年增速
  MERGE_YEAR: 2031,
  PROV_2025: 8433,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
}

// 浙江省城市列表（地级市）
const CITY_LIST = [
  '杭州市', '宁波市', '温州市', '嘉兴市', '湖州市',
  '绍兴市', '金华市', '衢州市', '舟山市', '台州市',
  '丽水市',
]

// ==================== 核心规则 ====================

// 浙江省养老保险建账时间和 cutoff 时间
// ⚠️ 待确认：建账时间（目前按1998-01估算，待官方文件确认）
// ⚠️ 待确认：视同缴费cutoff时间（目前按1997-12估算，待官方文件确认）
// TODO：搜索关键词"浙人社规 个人账户建立 1998"或"浙政发〔2006〕XX号 养老保险办法"
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.014  // 浙江过渡系数固定 1.4%（浙劳社老〔2006〕142号）
// TODO：补充官方文件编号（如：浙政发〔2006〕XX号）

const PROV_TAG = 'zhejiang'

// 浙江省模块配置（有基础养老金 + 个人账户养老金 + 过渡性养老金）
const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

// ==================== 测试案例 ====================

// TODO：添加至少2个官方核定表案例
// 案例来源必须是官方核定表，不能AI自己编
const cases = [
  // 案例1：待添加（需官方核定表）
  // 案例2：待添加（需官方核定表）
]

// ==================== 引擎配置 ====================

function getEngineConfig() {
  return {
    avg_salary_history: AVG_SALARY_HISTORY,
    base_rates: { prov: PROV_BASE },
    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,
    province: PROV_TAG,
    name: '浙江省',
    usePreAccountYears: true,
    viewing_start: { year: 1998, month: 1, _note: '过渡性养老金用1997年底前年限，calcYears截止1998-01代表含1997年12月在内' },
    round_to_jiao: true,
    modules: {
      basic_pension: { enabled: true, rate_per_year: 0.01, formula: '全省计发基数与指数化工资均值乘以累计缴费年限乘以1%' },
      personal_account: { enabled: true, formula: '个人账户累计储存额除以计发月数' },
      transitional_pension: { enabled: true, coefficient: 0.014, formula: '全省计发基数乘以1997年底前平均缴费指数乘以1997年底前缴费年限乘以1.4%' },
      extra_pension: { enabled: true, formula_type: 'zhejiang_subsidy', amount: 150, formula: '基本养老金补贴150元每月（浙人社发2011 146号）' },
      adjustment_fund: { enabled: true, type: 'zhejiang', base_amount: 480, coefficient: 3, formula: '过渡调节金等于480加平均缴费指数乘以缴费年限乘以3（浙人社发2018 102号）' },
      special_addition: { enabled: false }
    }
  }
}
// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  1992: 240.33,
  1993: 327.67,
  1994: 466.42,
  1995: 551.58,
  1996: 617.75,
  1997: 698.83,
  1998: 771.33,
  1999: 886,
  2000: 1034.5,
  2001: 1314.17,
  2002: 1363.92,
  2003: 1465.33,
  2004: 1557.42,
  2005: 1676.08,
  2006: 1839.17,
  2007: 2050.25,
  2008: 2159.83,
  2009: 2290,
  2010: 2554.17,
  2011: 2977.58,
  2012: 3340.58,
  2013: 3709,
  2014: 4034,
  2015: 4288,
  2016: 4698,
  2017: 5091,
  2018: 5492,
  2019: 5690,
  2020: 6594.42,
  2021: 7436.67,
  2022: 8020,
  2023: 8310.17,
  2024: 8432.83,
  2025: 8746,  // 2025年度社保缴费基数·2024全口径社平（官方已发布，人社通汇总）
};


module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}

  var cfg = (typeof getEngineConfig === "function") ? getEngineConfig() : module.exports.getEngineConfig();
  window.PROVINCE_CONFIGS["zhejiang"] = cfg;
})();
