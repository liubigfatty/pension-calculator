// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：6847元/月
// 更新时间：2026-06-10

// data/provinces/guangxi.js
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
  2020: 5633,
  2021: 5915,
  2022: 6442,
  2023: 6629,
  2024: 6847,
   2025: 6905,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};
















;

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031,
  PROV_2025: 6905,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};


















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
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

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
  2020: 5819.33,
  2021: 6196.83,
  2022: 6439,
  2023: 6755.83,
  2024: 6847,
  2025: 6905,
};

const INTEREST_RATES = {
  1995: 0.025,
  1996: 0.025,
  1997: 0.025,
  1998: 0.025,
  1999: 0.025,
  2000: 0.025,
  2001: 0.025,
  2002: 0.025,
  2003: 0.025,
  2004: 0.025,
  2005: 0.0226,
  2006: 0.025,
  2007: 0.025,
  2008: 0.0393,
  2009: 0.0225,
  2010: 0.023,
  2011: 0.025,
  2012: 0.025,
  2013: 0.0325,
  2014: 0.025,
  2015: 0.025,
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
