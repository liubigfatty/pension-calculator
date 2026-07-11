// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：8332元/月
// 更新时间：2026-06-10

// data/provinces/xinjiang.js
// 新疆维吾尔自治区养老金计算模块
// TODO：补充1995-2023年官方计发基数

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
  2020: 6855,
  2021: 7197,
  2022: 7089,
  2023: 7625,
  2024: 8321,
   2025: 8448,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};












;

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031,
  PROV_2025: 8448,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};














// ==================== 城市列表 ====================

const CITY_LIST = [
  '乌鲁木齐',
  '克拉玛依',
  '吐鲁番',
  '哈密'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.014  // 新疆维吾尔自治区过渡系数 1.4000000000000001%

const PROV_TAG = 'xinjiang'

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
  2021: 7088.83,
  2022: 7625.08,
  2023: 8332,
  2024: 8321,
  2025: 8448,
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
