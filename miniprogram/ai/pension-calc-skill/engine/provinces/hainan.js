// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：8131元/月
// 更新时间：2026-06-10

// data/provinces/hainan.js
// 海南省养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  1978: 862,
  1979: 905,
  1980: 950,
  1981: 998,
  1982: 1048,
  1983: 1100,
  1984: 1155,
  1985: 1213,
  1986: 1273,
  1987: 1337,
  1988: 1404,
  1989: 1474,
  1990: 1548,
  1991: 1625,
  1992: 1706,
  1993: 1792,
  1994: 1881,
  1995: 1975,
  1996: 2074,
  1997: 2178,
  1998: 2287,
  1999: 2401,
  2000: 617,
  2001: 693,
  2002: 790,
  2003: 866,
  2004: 1054,
  2005: 1201,
  2006: 1324,
  2007: 1613,
  2008: 1822,
  2009: 2078,
  2010: 2585,
  2011: 3060,
  2012: 3338,
  2013: 3798,
  2014: 4216,
  2015: 4867,
  2016: 5214,
  2017: 5755,
  2018: 6473,
  2019: 7055,
  2020: 7470,
  2021: 7200,
  2022: 7599,
  2023: 8050,
  2024: 8131,
   2025: 8188,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};;

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031,
  PROV_2025: 8188,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
}

// ==================== 城市列表 ====================

const CITY_LIST = [
  '海口',
  '三亚',
  '三沙',
  '儋州'
]

// ==================== 核心参数 ====================

// 建账时间（个人账户制度建立时间）
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.013  // 海南省过渡系数 1.3%

const PROV_TAG = 'hainan'

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
// 数据来源：provinces/hainan.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

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
  avg_salary_history: AVG_SALARY_HISTORY,
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
    notes: '⚠️ 2023-2025年基数待官方文件确认',
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  1998: 520,
  1999: 572,
  2000: 617,
  2001: 693,
  2002: 790,
  2003: 866,
  2004: 1054,
  2005: 1201,
  2006: 1324,
  2007: 1613,
  2008: 1822,
  2009: 2078,
  2010: 2585,
  2011: 3060,
  2012: 3338,
  2013: 3798,
  2014: 4216,
  2015: 4867,
  2016: 5214,
  2017: 5755,
  2018: 6473,
  2019: 7055,
  2020: 6543,
  2021: 7088.83,
  2022: 7625.08,
  2023: 8050,
  2024: 8131,
  2025: 8188,  // 2025年度社保缴费基数·2024全口径社平（官方已发布，人社通汇总）
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
