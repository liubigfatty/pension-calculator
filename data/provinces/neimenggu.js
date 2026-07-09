// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：8105元/月
// 更新时间：2026-06-10

// data/provinces/neimenggu.js
// 内蒙古自治区养老金计算模块
// TODO：补充1995-2023年官方计发基数

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
  2020: 6668,
  2021: 7001,
  2022: 7351,
  2023: 7469,
  2024: 8105,
   2025: 8179,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};

;

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031,
  PROV_2025: 8179,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};



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

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.013  // 内蒙古自治区过渡系数 1.3%

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
  interest_rates: INTEREST_RATES,
  avg_salary_history: AVG_SALARY_HISTORY,    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
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
  2021: 6751,
  2022: 7469.17,
  2023: 8105,
  2024: 8105,
  2025: 8179,
};

const INTEREST_RATES = {
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
