// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：11546元/月
// 更新时间：2026-06-10

// data/provinces/xizang.js
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
  2025: 11777,
};;

// 西藏历年社平工资（元/月，用于个人账户计算）
// 数据来源：用户提供官方核定表截图（2005-2025年，元/年÷12→元/月）


const BASE_PARAMS = {
  PROV_2025: 12000,
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031
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

  return {
  interest_rates: INTEREST_RATES,
  avg_salary_history: AVG_SALARY_HISTORY,    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
    avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '⚠️ 2023-2025年基数待官方文件确认（西藏基数较高）',
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
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
  2020: 8839,
  2021: 9900,
  2022: 10791,
  2023: 11546,
  2024: 11546,
  2025: 11777,
};

const INTEREST_RATES = {
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
