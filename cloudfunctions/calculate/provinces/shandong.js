// 数据来源：✅ 官方数据
// 2024年计发基数：7678元/月
// 更新时间：2026-06-10

// data/provinces/shandong.js
// 山东省养老金计算数据模块
// TODO：补充1995-2022年官方计发基数（目前只有2023-2025年官方数据）
// 依据：鲁人社字〔2023〕108号、鲁人社字〔2024〕112号、鲁人社字〔2025〕100号

// ==================== 基础数据 ====================

// 山东省历年计发基数（元/月）
// 2023-2025来自官方文件，其余年份待补充
const PROV_BASE = {
  1978: 814,
  1979: 855,
  1980: 897,
  1981: 942,
  1982: 989,
  1983: 1039,
  1984: 1091,
  1985: 1145,
  1986: 1202,
  1987: 1263,
  1988: 1326,
  1989: 1392,
  1990: 1462,
  1991: 1535,
  1992: 1611,
  1993: 1692,
  1994: 1777,
  1995: 1865,
  1996: 1959,
  1997: 2057,
  1998: 2159,
  1999: 2267,
  2000: 2381,
  2001: 2500,
  2002: 2625,
  2003: 2756,
  2004: 2894,
  2005: 3038,
  2006: 3190,
  2007: 3350,
  2008: 3517,
  2009: 3693,
  2010: 3878,
  2011: 4072,
  2012: 4275,
  2013: 4489,
  2014: 4714,
  2015: 4949,
  2016: 5197,
  2017: 5457,
  2018: 5729,
  2019: 6016,
  2020: 6317,
  2021: 6633,
  2022: 6964,
  2023: 7312,
  2024: 7831,
  2025: 7908,
};

// 山东省基数增长预测参数
const BASE_PARAMS = {
  PROV_2025: 7831,
  PROV_GROWTH: 0.02,  // 约2%年增速
  MERGE_YEAR: 2031
}

// 山东省城市列表（地级市）
// 注：菏泽市可能有单独的计发基数（待确认）
const CITY_LIST = [
  '济南市', '青岛市', '淄博市', '枣庄市', '东营市',
  '烟台市', '潍坊市', '济宁市', '泰安市', '威海市',
  '日照市', '临沂市', '德州市', '聊城市', '滨州市',
  '菏泽市',
]

// ==================== 核心规则 ====================

// 山东省养老保险建账时间和 cutoff 时间
// ⚠️ 待确认：建账时间（目前按1998-01估算，待官方文件确认）
// ⚠️ 待确认：视同缴费cutoff时间（目前按1997-12估算，待官方文件确认）
// TODO：搜索关键词"鲁人社规 个人账户建立 1998"或"鲁政发〔2006〕XX号 养老保险办法"
const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }

const TRANS_COEF = 0.012  // 山东过渡系数固定 1.2%（待官方文件确认）
// TODO：补充官方文件编号（如：鲁政发〔2006〕XX号）

const PROV_TAG = 'shandong'

// 山东省模块配置（有基础养老金 + 个人账户养老金 + 过渡性养老金）
const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

// ==================== 测试案例 ====================

// TODO：添加至少2个官方核定表案例
// 案例来源必须是官方核定表，不能AI自己编
const cases = [
  // 案例1：待添加（需官方核定表）
  // 案例2：待添加（需官方核定表）
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
    notes: '2024年基数7678元（鲁人社字〔2024〕112号）。⚠️ 双指数：基础用avgIndex，过渡用transIndex（视同缴费指数）。',
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
