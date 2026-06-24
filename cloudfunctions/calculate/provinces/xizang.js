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
  2005: 4569,
  2006: 4798,
  2007: 5037,
  2008: 5289,
  2009: 5554,
  2010: 5832,
  2011: 6123,
  2012: 6429,
  2013: 6751,
  2014: 7088,
  2015: 7443,
  2016: 7815,
  2017: 8206,
  2018: 8616,
  2019: 9047,
  2020: 9499,
  2021: 9974,
  2022: 10473,
  2023: 10996,
  2024: 11777,
  2025: 11892,
};

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

  return {    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '⚠️ 2023-2025年基数待官方文件确认（西藏基数较高）',
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
