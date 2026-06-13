// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：7727元/月
// 更新时间：2026-06-10

// data/provinces/shaanxi.js
// 陕西省养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 819,
  1979: 860,
  1980: 903,
  1981: 948,
  1982: 996,
  1983: 1045,
  1984: 1098,
  1985: 1152,
  1986: 1210,
  1987: 1271,
  1988: 1334,
  1989: 1401,
  1990: 1471,
  1991: 1544,
  1992: 1622,
  1993: 1703,
  1994: 1788,
  1995: 1877,
  1996: 1971,
  1997: 2070,
  1998: 2173,
  1999: 2282,
  2000: 2396,
  2001: 2516,
  2002: 2641,
  2003: 2774,
  2004: 2912,
  2005: 3058,
  2006: 3211,
  2007: 3371,
  2008: 3540,
  2009: 3717,
  2010: 3903,
  2011: 4098,
  2012: 4303,
  2013: 4518,
  2014: 4744,
  2015: 4981,
  2016: 5230,
  2017: 5491,
  2018: 5766,
  2019: 6054,
  2020: 6357,
  2021: 6675,
  2022: 7009,
  2023: 7359,
  2024: 7727,
  2025: 7959,
};

const BASE_PARAMS = {
  PROV_2025: 7881,
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031
}

// ==================== 城市列表 ====================

const CITY_LIST = [
  '西安',
  '铜川',
  '宝鸡',
  '咸阳',
  '渭南',
  '延安',
  '汉中',
  '榆林',
  '安康',
  '商洛'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1996, month: 1 }
const CUTOFF_DATE   = { year: 1995, month: 12 }

const TRANS_COEF = 0.013  // 陕西省过渡系数 1.3%

const PROV_TAG = 'shaanxi'

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
    name: '陕西省',
    base_rates: { prov: PROV_BASE },
    modules: modules,
    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2024年基数7727元，2025年基数7881元（陕人社发〔2024/2025〕XX号）',
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
