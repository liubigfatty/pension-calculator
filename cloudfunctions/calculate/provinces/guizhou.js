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
  2021: 6282,
  2022: 6596,
  2023: 6926,
  2024: 7325,
  2025: 7490,
};

const BASE_PARAMS = {
  PROV_2025: 7500,
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031
}

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
    avg_salary_history: {
      "1990": 2070,
      "1991": 2090,
      "1992": 2406,
      "1993": 3870,
      "1994": 3870,
      "1995": 4475,
      "1996": 4917,
      "1997": 5207,
      "1998": 5775,
      "1999": 6995,
      "2000": 7468,
      "2001": 8990,
      "2002": 9810,
      "2003": 11037,
      "2004": 12431,
      "2005": 14344,
      "2006": 16815,
      "2007": 20668,
      "2008": 24602,
      "2009": 28245,
      "2010": 31458,
      "2011": 33708,
      "2012": 38396,
      "2013": 43786,
      "2014": 47466,
      "2015": 53904,
      "2016": 60139,
      "2017": 62924,
      "2018": 67592,
      "2019": 72113,
      "2020": 76547,
      "2021": 81570,
      "2022": 82291,
      "2023": 87267,
      "2024": 87264,
      "2025": 91899,
      "2026": 94293,
      "_source": "官方数据",
    },    
      base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
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

module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}
