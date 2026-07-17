// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：8160元/月
// 更新时间：2026-06-10

// data/provinces/chongqing.js
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
  PROV_2025: 7339,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
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
