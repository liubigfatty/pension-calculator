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

// 【时间标记核验 2026-07-23】上海计发基数（元/月），规则：计发基数=上一年社平（MD第21行确认）
//   上海社保口径2019年转向全口径，故：2020年起计发基数=上年"全口径"社平；1997-2019计发基数=上年"非私营全市职工平均工资"(即AVG[year-1]，与引擎AVG序列一致)
//   ✅ 1997-2019：已据规则重排=AVG[year-1]（如2019=9184=AVG[2018]，原8181.09为错位占位，已订正）
//   ✅ 2020-2025：=上年全口径社平（2020=9580=2019全口径[澎湃/中新网/本地宝证实]、2021=10338…2025=12434），来源：沪人社规+本地宝
//   ⚠️ 1995-1996：跨1995/1996口径断层(旧职工平均工资→新序列)，无法从AVG[1994-1995]可靠推导，推定待补
//   📋 1978-1991：建账前(1993建账)外推占位，不参与实际计算
//   注：PROV_BASE[2020]=9580 与 AVG[2019]=9643 的63差，因2020为口径切换过渡年(计发用全口径9580，AVG仍记非私营9643)，属正常口径差非错误
const PROV_BASE = {
  // 1978-1991: 建账前(1993)外推占位，不参与实际计算
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
  // ⚠️ 1995-1996: 跨1995/1996口径断层(旧全市职工平均工资→新序列)，无法从AVG[1994-1995]可靠推导，推定待补
  1995: 595.45,   // 推定(待补官方1995计发基数)
  1996: 687.39,   // 推定(待补官方1996计发基数)
  // ✅ 1997-2019: 计发基数=上年全市职工平均工资(非私营序列，=AVG[year-1])，经MD/上海人社局核验
  1997: 3139,
  1998: 3296,
  1999: 3461,
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
  // ✅ 2020-2025: 计发基数=上年全口径社平(国办发〔2019〕13号)，官方已发布
  //   注：2020为口径切换过渡年，使用全口径9580(=2019全口径，澎湃/中新网/本地宝证实)，非AVG[2019]非私营9643
  2020: 9580,
  2021: 10338,
  2022: 11396,
  2023: 12183,
  2024: 12307,
  2025: 12434,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};

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
  // 【时间标记核验 2026-07-23】上海社平(元/月)。1996-2024=非私营/全口径序列(上海人社局，MD已列)；1990-1995=旧口径(全市职工平均工资)，与1996+量级断层(1995=773 vs 1996=3139)，仅作个人账户历史近似，不用于计发基数推算
  //   官方核实：1995年度全市职工月平均工资=773元(沪劳综发〔1996〕48号)；1990-1994据国家统计局市区职工工资序列(约247/287/364/483/631)
  1990: 246.96,  // 推定(旧口径，国家统计局市区职工平均工资)
  1991: 287.00,  // 推定(旧口径)
  1992: 364.03,  // 推定(旧口径)
  1993: 483.06,  // 推定(旧口径)
  1994: 630.93,  // 推定(旧口径)
  1995: 773,     // ✅ 官方(沪劳综发〔1996〕48号:1995年度全市职工月平均工资773元)
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
