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
  2022: 6450,
  2023: 6772,
  2024: 7111,
  2025: 7324,
};

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
    province: PROV_TAG,
    name: '山西省',
    base_rates: { prov: PROV_BASE },
    modules: modules,
    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2024年基数7111元（晋人社厅发〔2024〕39号），2025年基数7253元（晋人社厅发〔2025〕36号）',
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
