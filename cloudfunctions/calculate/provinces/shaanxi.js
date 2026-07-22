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
