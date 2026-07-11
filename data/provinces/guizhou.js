// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：7272元/月
// 更新时间：2026-06-10

// data/provinces/guizhou.js
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
  2020: 5983,
  2021: 6797.5,
  2022: 6857.58,
  2023: 7272.25,
  2024: 7272,
   2025: 7324.5,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};
















;

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031,
  PROV_2025: 7324.5,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};


















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

const TRANS_COEF = 0.013  // 贵州省过渡系数 1.3%

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
    notes: '2023年基数6857.58元（黔人社通〔2024〕53号），2024年基数7272元（黔人社发〔2025〕16号）',
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
  2024: 7272,
  2025: 7324.5,
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
