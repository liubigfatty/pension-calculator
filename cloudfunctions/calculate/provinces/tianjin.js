// 数据来源：✅ 官方数据
// 2024年计发基数：9232元/月
// 更新时间：2026-06-10

// data/provinces/tianjin.js
// 天津市养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  // 1978-1991年：暂无官方数据，暂时保留旧值
  1978: 979,
  1979: 1027,
  1980: 1079,
  1981: 1133,
  1982: 1189,
  1983: 1249,
  1984: 1311,
  1985: 1377,
  1986: 1446,
  1987: 1518,
  1988: 1594,
  1989: 1674,
  1990: 1757,
  1991: 1845,
  // ============ 1992-2024年：用户提供的官方数据（2026-06-18）============
  // 数据来源：天津市历年在岗职工月平均工资大全
  1992: 260,
  1993: 334,
  1994: 447,
  1995: 542,
  1996: 637,
  1997: 690,
  1998: 829,
  1999: 921,
  2000: 1040,
  2001: 1192,
  2002: 1355,
  2003: 1554,
  2004: 1813,
  2005: 2106,
  2006: 2370,
  2007: 2823,
  2008: 3465,
  2009: 3731,
  2010: 4266,
  2011: 4836,
  2012: 5320,
  2013: 5714,
  2014: 6047,
  2015: 6350,
  2016: 6731,
  2017: 7073,
  2018: 7540,
  2019: 6323,  // ⚠️ 2019年及以后与全口径一致（津人社局数据）
  2020: 6777,
  2021: 7478,
  2022: 7919,
  2023: 8355,
  2024: 9417,
  2025: 9417,  // 预估：8540 × 1.026
};

const BASE_PARAMS = {
  PROV_2025: 8762,  // 2024年8540，按2.6%增长预估
  PROV_GROWTH: 0.026,
  LATEST_BASE_YEAR: 2024,
  LATEST_BASE_VALUE: 8540,
}

// ==================== 城市列表 ====================

const CITY_LIST = []

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.012  // 天津市过渡系数 1.2%

const PROV_TAG = 'tianjin'

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


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/tianjin.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
const AVG_SALARY_HISTORY = {
  1990: 146.42,
  1991: 153.75,
  1992: 161.42,
  1993: 169.5,
  1994: 2136,
  1995: 2243,
  1996: 2355,
  1997: 2473,
  1998: 2596,
  1999: 2726,
  2000: 2863,
  2001: 3006,
  2002: 3156,
  2003: 3314,
  2004: 3479,
  2005: 3653,
  2006: 3836,
  2007: 4028,
  2008: 4229,
  2009: 4441,
  2010: 4663,
  2011: 4896,
  2012: 5141,
  2013: 5398,
  2014: 5668,
  2015: 5951,
  2016: 6249,
  2017: 6561,
  2018: 6889,
  2019: 7234,
  2020: 6777,
  2021: 7478,
  2022: 7919,
  2023: 8355,
  2024: 9232,
  2025: 9509,
};

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
base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
 avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2023年基数9016元（津人社局发〔2023〕15号），2024年基数9232元（津人社办发〔2024〕49号）',
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
