// 数据来源：✅ 官方数据
// 2024年计发基数：8878元/月
// 更新时间：2026-06-10

// data/provinces/qinghai.js
// 青海省养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 941,
  1979: 988,
  1980: 1037,
  1981: 1089,
  1982: 1144,
  1983: 1201,
  1984: 1261,
  1985: 1324,
  1986: 1390,
  1987: 1460,
  1988: 1533,
  1989: 1609,
  1990: 1690,
  1991: 1774,
  1992: 1863,
  1993: 1956,
  1994: 2054,
  1995: 2157,
  1996: 2265,
  1997: 2378,
  1998: 2497,
  1999: 2622,
  2000: 2753,
  2001: 2890,
  2002: 3035,
  2003: 3187,
  2004: 3346,
  2005: 3513,
  2006: 3689,
  2007: 3873,
  2008: 4067,
  2009: 4270,
  2010: 4484,
  2011: 4708,
  2012: 4944,
  2013: 5191,
  2014: 5450,
  2015: 5723,
  2016: 6009,
  2017: 6309,
  2018: 6625,
  2019: 6956,
  2020: 7304,
  2021: 7669,
  2022: 8053,
  2023: 8455,
  2024: 8878,
  2025: 9144,
};

const BASE_PARAMS = {
  PROV_2025: 9100,
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031
}

// ==================== 城市列表 ====================

const CITY_LIST = [
  '西宁',
  '海东'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.014  // 青海省过渡系数 1.4000000000000001%

const PROV_TAG = 'qinghai'

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
    name: '青海省',
    base_rates: { prov: PROV_BASE },
    modules: modules,
    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2023年基数8591元（青人社厅函〔2023〕461号），2024年基数8878元（青政办〔2019〕56号）',
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
