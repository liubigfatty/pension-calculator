// 数据来源：✅ 官方数据
// 2024年计发基数：7111元/月
// 更新时间：2026-06-10

// data/provinces/shanxi.js
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
  2020: 5850,
  2021: 6143,
  2022: 6695,
  2023: 6897,
  2024: 7111,
  2025: 7253,
  2026: 7253,
};;

const BASE_PARAMS = {
  PROV_2025: 7253,
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031
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
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

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
    notes: '2024年基数7111元（晋人社厅发〔2024〕39号），2025年基数7253元（晋人社厅发〔2025〕36号）',
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  1992: 188.92,
  1993: 210.83,
  1994: 252.08,
  1995: 333.08,
  1996: 393.42,
  1997: 431.92,
  1998: 443.33,
  1999: 470.08,
  2000: 505.42,
  2001: 576.5,
  2002: 676.83,
  2003: 779.75,
  2004: 894.17,
  2005: 1078.58,
  2006: 1303.75,
  2007: 1525,
  2008: 1793.75,
  2009: null,
  2010: 2372.42,
  2011: 2795.33,
  2012: 3325.25,
  2013: 3745.25,
  2014: 3867.25,
  2015: 4080.75,
  2016: 4413.33,
  2017: 4581,
  2018: 5129,
  2019: 4656,
  2020: 5392.33,
  2021: 5914,
  2022: 6438.08,
  2023: 6854.58,
  2024: 7111,
  2025: 7111,
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
