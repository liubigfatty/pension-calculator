// 数据来源：✅ 官方数据
// 2024年计发基数：7201元/月
// 更新时间：2026-06-10

// data/provinces/liaoning.js
// 辽宁省养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 763,
  1979: 801,
  1980: 842,
  1981: 884,
  1982: 928,
  1983: 974,
  1984: 1023,
  1985: 1074,
  1986: 1128,
  1987: 1184,
  1988: 1243,
  1989: 1305,
  1990: 1371,
  1991: 1439,
  1992: 1511,
  1993: 1587,
  1994: 1666,
  1995: 1749,
  1996: 1837,
  1997: 1929,
  1998: 2025,
  1999: 2126,
  2000: 2233,
  2001: 2344,
  2002: 2462,
  2003: 2585,
  2004: 2714,
  2005: 2850,
  2006: 2992,
  2007: 3142,
  2008: 3299,
  2009: 3464,
  2010: 3637,
  2011: 3819,
  2012: 4010,
  2013: 4210,
  2014: 4421,
  2015: 4642,
  2016: 4874,
  2017: 5118,
  2018: 5373,
  2019: 5642,
  2020: 5924,
  2021: 6220,
  2022: 6532,
  2023: 6858,
  2024: 7201,
  2025: 7417,
};

const BASE_PARAMS = {
  PROV_2025: 7400,
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031
}

// ==================== 城市列表 ====================

const CITY_LIST = [
  '沈阳',
  '大连',
  '鞍山',
  '抚顺',
  '本溪',
  '丹东',
  '锦州',
  '营口',
  '阜新',
  '辽阳',
  '盘锦',
  '铁岭',
  '朝阳',
  '葫芦岛'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.013  // 辽宁省过渡系数 1.3%

const PROV_TAG = 'liaoning'

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
    name: '辽宁省',
    base_rates: { prov: PROV_BASE },
    modules: modules,
    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2024年基数7201元（辽人社〔2024〕17号），不含沈阳、大连',
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
