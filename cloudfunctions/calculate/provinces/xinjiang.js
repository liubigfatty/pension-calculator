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
