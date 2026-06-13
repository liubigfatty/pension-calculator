// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：8202元/月
// 更新时间：2026-06-10

// data/provinces/ningxia.js
// 宁夏回族自治区养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 869,
  1979: 913,
  1980: 958,
  1981: 1006,
  1982: 1057,
  1983: 1110,
  1984: 1165,
  1985: 1223,
  1986: 1284,
  1987: 1349,
  1988: 1416,
  1989: 1487,
  1990: 1561,
  1991: 1639,
  1992: 1721,
  1993: 1807,
  1994: 1898,
  1995: 1993,
  1996: 2092,
  1997: 2197,
  1998: 2307,
  1999: 2422,
  2000: 2543,
  2001: 2670,
  2002: 2804,
  2003: 2944,
  2004: 3091,
  2005: 3246,
  2006: 3408,
  2007: 3579,
  2008: 3757,
  2009: 3945,
  2010: 4143,
  2011: 4350,
  2012: 4567,
  2013: 4796,
  2014: 5035,
  2015: 5287,
  2016: 5551,
  2017: 5829,
  2018: 6120,
  2019: 6426,
  2020: 6748,
  2021: 7085,
  2022: 7439,
  2023: 7811,
  2024: 8202,
  2025: 8448,
};

const BASE_PARAMS = {
  PROV_2025: 8100,
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031
}

// ==================== 城市列表 ====================

const CITY_LIST = [
  '银川',
  '石嘴山',
  '吴忠',
  '固原',
  '中卫'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.013  // 宁夏回族自治区过渡系数 1.3%

const PROV_TAG = 'ningxia'

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
    name: '宁夏回族自治区',
    base_rates: { prov: PROV_BASE },
    modules: modules,
    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '⚠️ 2023-2025年基数待官方文件确认',
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
