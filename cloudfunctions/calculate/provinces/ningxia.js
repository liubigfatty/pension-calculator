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
  2024: 8366,
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

const MODULES = ['base', 'personal', 'transition', 'special']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
  special:     '知识分子补贴',
}

// ==================== 特殊增发参数（知识分子补贴） ====================

const SPECIAL_ADDITION_PARAMS = {
  enabled: true,
  type: 'intellectual',
  intellectual_work: 10,     // 工龄补贴 10元/月
  intellectual_area: 8.5,    // 地区补贴 8.5元/月
  note: '知识分子补贴 = 工龄补贴10元/月 + 地区补贴8.5元/月 = 18.5元/月',
}

// ==================== 测试案例 ====================

const cases = [
  // 案例1：宁夏男2024.04退休（非知识分子）
  {
    case_id: "1",
    province: "ningxia",
    base_rates: { prov: PROV_BASE },
    city: "宁夏",
    gender: "男",
    birth_year: 1964,
    birth_month: 4,
    work_year: 1983,
    work_month: 6,
    retire_year: 2024,
    retire_month: 4,
    total_years: 40.92,
    sight_years: 7.58,
    pre_account_years: 12.58,
    personal_account: 95751.34,
    months: 139,
    expected: {
      basic_pension: 2830,
      personal_pension: 688.86,
      transitional_pension: 960.13,
      total: 4480.29
    },
    notes: "宁夏2024年4月退休男职工，1964-04生，1983-06参工。过渡系数1.3%（表上明确标注）。视同7.58年+建账前实际5年=12.58年建账前年限。usePreAccountYears=true。低指数0.7392。",
    avg_index: 0.7392,
    base_number: 7953,
    base_prov: 7953
  },
  // 案例2：宁夏男2026.01退休（知识分子）
  {
    case_id: "2",
    province: "ningxia",
    city: "宁夏",
    gender: "男",
    birth_year: 1966,
    birth_month: 1,
    work_year: 1988,
    work_month: 8,
    retire_year: 2026,
    retire_month: 1,
    total_years: 37.5,
    sight_years: 2.42,
    pre_account_years: 7.42,
    personal_account: 122313.73,
    months: 139,
    expected: {
      basic_pension: 2771.13,
      personal_pension: 879.95,
      transitional_pension: 709.05,
      total: 4378.63
    },
    notes: "宁夏2026年1月退休男职工(知识分子)，1966-01生，1988-08参工。视同2.42年+建账前实际5年=7.42年建账前年限。低指数0.7666。知识分子过渡系数1.43%(+0.13%)+地区津贴10元+工龄补贴8.5元。计发基数8366。",
    intellectual: true,
    avg_index: 0.7666,
    base_number: 8366,
    base_prov: 8366
  },
  // 案例3：宁夏男2026.01退休（知识分子，详细）
  {
    case_id: "3",
    province: "ningxia",
    city: "宁夏",
    gender: "男",
    birth_year: 1966,
    birth_month: 1,
    work_year: 1988,
    work_month: 8,
    retire_year: 2026,
    retire_month: 1,
    total_years: 37.5,
    sight_years: 7.67,
    personal_account: 122312.42,
    months: 139,
    intellectual: true,
    expected: {
      basic_pension: 2632.36,
      personal_pension: 879.95,
      transitional_pension: 658.32,
      intellectual_subsidy: 18.5,
      total: 4189.13
    },
    notes: "宁夏2026年1月退休男知识分子。知识分子工龄补贴10.00元/月+地区补贴8.50元/月=18.50元/月。过渡养老金=8082×指数化月均×视同7.67年×(1.3%+知识分子增量)。",
    avg_index: 0.7371,
    base_number: 8082,
    base_prov: 8082
  }
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
        // 知识分子过渡系数增加（1.3% → 1.43%）
        modules.transitional_pension.coefficient_intellectual = 0.0143;
      }
    }
  }
  if (MODULES.includes('special')) {
    modules.special_addition = { ...SPECIAL_ADDITION_PARAMS };
  }

  return {    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,
    base_rates: { prov: PROV_BASE },

    province: PROV_TAG,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: true,  // 宁夏使用建账前缴费年限
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '宁夏有知识分子补贴：过渡系数1.3%→1.43%（需传入intellectual:true），固定补贴18.5元/月（工龄补贴10元+地区补贴8.5元）。使用建账前缴费年限（preAccountYears）。',
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
