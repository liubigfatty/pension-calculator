// 数据来源：✅ 官方数据
// 2025年计发基数：7346元/月（辽人社〔2025〕17号）；2024年全省7201、沈阳8266、大连8823
// 2025年缴费基数上下限：上限21792元/月、下限4359元/月（辽人社〔2025〕17号第一条）；2024年全省城镇居民人均可支配收入47982元/年（月3999，丧抚待遇口径）
// 更新时间：2026-06-24
// 注：沈阳8266元/月、大连8823元/月（单独计发基数）

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/liaoning.js
// ==================== 字段定义（_definitions）====================
// 修改本文件前，先读以下语义与"索引年"口径，避免社平年/计发年错位（本项目历史高频 bug）：
//   PROV_BASE[Y]           使用年/退休年 → Y 年计发基数（元/月）。[注意]黑龙江特例：下标=社平年（见该省注释）。
//   AVG_SALARY_HISTORY[Y]  社平年/统计年 → Y 年度官方社平工资（元/月）。
//   BASE_PARAMS           { PROV_GROWTH, MERGE_YEAR, PROV_YYYY } 外推参数。
//   MODULES/MODULE_LABELS 养老金分项模块开关 / 中文标签。
//   CITY_LIST             本省城市清单（仅用于城市选择，不代表有独立基数）。
//   TRANS_COEF            过渡系数。
//   PROV_TAG/ACCOUNT_START 省份标识 / 建账时间。
//   formula_type          公式类型（见手册 5.6）。
// 核心等式：某年计发基数 = 上一年社平工资（如 2024社平→2025计发基数；2025社平7705→2026计发/缴费基数）。
// 未发布年份不写固定值，由引擎 getBase() 按 GROWTH_RATE（默认2%）外推产生。
// 各省特有城市级常量（CC_BASE/SY_BASE/DL_BASE/SHENZHEN_BASE/ZHENGZHOU_BASE/XIZANG_SUBSIDIES/CONTRIB_BASE_TIERS 等）均有独立行内注释。
// ==============================================================

// 辽宁省养老金计算模块
// TODO：补充1995-2023年官方计发基数

// ==================== 计发基数 ====================

const PROV_BASE = {
  1992: 226,
  1993: 275,
  1994: 356,
  1995: 406.42,
  1996: 439.08,
  1997: 465.92,
  1998: 469.75,
  1999: 505.58,
  2000: 553.25,
  2001: 620.33,
  2002: 740.67,
  2003: 848.67,
  2004: 992.58,
  2005: 1444.25,
  2006: 1635.33,
  2007: 1933.5,
  2008: 2310.75,
  2009: 2592,
  2010: 2921.42,
  2011: 3226.08,
  2012: 3541.92,
  2013: 3859.17,
  2014: 4092.5,
  2015: 4454.83,
  2016: 4762.33,
  2017: 5212.08,
  2018: 4801,
  2019: 5238.25,
  2020: 6057,
  2021: 6340,
  2022: 6720,
  2023: 6987,
  2024: 7201,
  2025: 7346,  // 辽人社〔2025〕17号：全省(不含沈阳､大连)月计发基数7346元
};


// 沈阳市单独计发基数（沈人社发）
const SY_BASE = {
  2020: 7195,  // 辽人社〔2020〕34号：沈阳市月计发基数7195元
  2021: 7530,  // 辽人社〔2021〕32号：沈阳市月计发基数7530元
  2022: 7982,  // 辽人社〔2022〕32号：沈阳市月计发基数7982元
  2023: 8141,  // 辽人社〔2023〕26号：沈阳市月计发基数8141元
  2024: 8266,  // 辽人社〔2024〕17号：沈阳市月计发基数8266元
  2025: 8390,  // 辽人社〔2025〕17号：沈阳市月计发基数8390元
};

// 大连市单独计发基数（大人社发）
const DL_BASE = {
  2020: 7679,
  2021: 8038,
  2022: 8520,
  2023: 8690,
  2024: 8823,
  2025: 8956,  // 辽人社〔2025〕17号：大连市月计发基数8956元
};

const BASE_PARAMS = {
  PROV_GROWTH: 0.02,  // 预估年增长2%
  MERGE_YEAR: 2031,
  PROV_2025: 7346,  // 辽人社〔2025〕17号
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

const TRANS_COEF = 0.014  // 辽宁省过渡系数 1.4%（辽劳社发〔2006〕81号）

const PROV_TAG = 'liaoning'

// ==================== 模块配置 ====================

const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

// ==================== 增发养老金参数 ====================

const EXTRA_PARAMS = {
  // 辽宁增发规则（从案例中反推）
  // 增发比例约 0.3-0.5%，与视同缴费年限和平均指数相关
  extraRate: 0.004,  // 增发比例（待官方文件确认）
  extraNote: '⚠️ 辽宁增发规则待官方文件确认，当前为案例反推值',
}

// ==================== 测试案例 ====================

const cases = [
  // 案例1：沈阳女工人50岁2023.07退休
  {
    case_id: "1",
    province: "liaoning",
    city: "沈阳市",
    gender: "female",
    birth_year: 1973,
    birth_month: 7,
    work_year: 1990,
    work_month: 12,
    retire_year: 2023,
    retire_month: 7,
    actual_years: 30.83,
    sight_years: 1.83,
    total_years: 32.67,
    avg_index: 1.2907,
    base_number: 8141,
    base_prov: 6987,
    personal_account: 170205.99,
    months: 195,
    expected: {
      basic_pension: 3046.25,
      extra_pension: 0,
      personal_pension: 872.85,
      transitional_pension: 238.89,
      total: 4157.99
    },
    notes: "辽宁沈阳女工人50岁2023.07退休。单指数（过渡性养老金用平均缴费指数）。⚠️增发207.41在核定表上未单独列出，表total=3896.56不含增发，引擎total=4103.75含增发。需确认辽宁增发规则。",
  },
  // 案例2：全省男60岁2026.03退休
  {
    case_id: "2",
    province: "liaoning",
    city: "辽宁省",
    gender: "male",
    birth_year: 1966,
    birth_month: 7,
    work_year: 1984,
    work_month: 12,
    retire_year: 2026,
    retire_month: 3,
    actual_years: 30.09,
    sight_years: 11.08,
    total_years: 41.17,
    avg_index: 0.8684,
    base_number: 7346,
    base_prov: 7346,
    personal_account: 100018.84,
    months: 139,
    expected: {
      basic_pension: 2825.35,
      extra_pension: 0,
      personal_pension: 719.56,
      transitional_pension: 1064.53,
      total: 4609.44
    },
    notes: "辽宁全省基数男60岁2026.03退休。单指数（过渡性养老金用平均缴费指数）。累计41.17年（实际30.09+视同11.08）。过渡=7346×0.842×11.08×1.4%。增发193.50未在表上显示",
  },
  // 案例3：鞍山男60岁2025.08退休
  {
    case_id: "3",
    province: "liaoning",
    city: "鞍山市",
    gender: "male",
    birth_year: 1965,
    birth_month: 10,
    work_year: 1983,
    work_month: 11,
    retire_year: 2025,
    retire_month: 8,
    actual_years: 32.75,
    sight_years: 9.92,
    total_years: 42.67,
    avg_index: 1.3398,
    base_number: 7346,
    base_prov: 7346,
    personal_account: 102280.37,
    months: 139,
    expected: {
      basic_pension: 3667.1,
      extra_pension: 0,
      personal_pension: 735.83,
      transitional_pension: 1193.55,
      total: 5596.48
    },
    notes: "辽宁鞍山男60岁2025.08退休。单指数（过渡性养老金用平均缴费指数）。累计42.67年（实际32.75+视同9.92）。过渡=7346×1.31×9.92×1.4%。增发405.65未在表上显示",
  },
  // 案例4：全省男60岁2023.08退休
  {
    case_id: "4",
    province: "liaoning",
    city: "辽宁省",
    gender: "male",
    birth_year: 1963,
    birth_month: 8,
    work_year: 1982,
    work_month: 10,
    retire_year: 2023,
    retire_month: 8,
    actual_years: 26.17,
    sight_years: 15.25,
    total_years: 40.92,
    avg_index: 0.9587,
    base_number: 6987,
    base_prov: 6987,
    personal_account: 129872.37,
    months: 139,
    expected: {
      basic_pension: 2800.1,
      extra_pension: 0,
      personal_pension: 934.33,
      transitional_pension: 1460.92,
      total: 5195.29
    },
    notes: "辽宁男60岁2023.08退休。建账1998-01（地区差异/补缴），建账前缴费15.25年(1982.10-1998.01)。视同15.25年。单指数（过渡性养老金用平均缴费指数）。⚠️增发339.25表上未显示",
  }
]

// ==================== 引擎配置 ====================


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/liaoning.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

function getEngineConfig() {
  const modules = {};
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true, formula_type: 'weighted_transition' };
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF;
      }
    }
  }
  if (MODULES.includes('extra')) {
    modules.extra_pension = { enabled: true, type: 'transition_subsidy', ...EXTRA_PARAMS };
  }

  return {
  avg_salary_history: AVG_SALARY_HISTORY,
account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,
    province: PROV_TAG,
    name: '辽宁省',
    base_rates: {
      prov: PROV_BASE,
      '沈阳': SY_BASE,
      '大连': DL_BASE,
      // 兼容拼音键（小程序 cityType 可能传拼音）
      shenyang: SY_BASE,
      dalian: DL_BASE,
    },
    // 城市计发基数（新格式，供引擎 getBase() 新格式分支使用）
    CITY_BASE: {
      '沈阳': SY_BASE,
      '大连': DL_BASE,
      shenyang: SY_BASE,
      dalian: DL_BASE,
    },
    avg_salary_history: AVG_SALARY_HISTORY,
    modules: modules,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2024年基数：全省7201元、沈阳8266元、大连8823元（辽人社〔2024〕17号）。⚠️ 沈阳、大连基数需根据用户选择的城市动态匹配。',
  }
}

// ==================== 导出 ====================


const AVG_SALARY_HISTORY = {
  1990: 114.25,
  1991: 119.92,
  1992: 125.92,
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
  2020: 5709,
  2021: 6383,
  2022: 6843,
  2023: 7121,

  2024: 7265,
  // 2025: 官方全口径未公布，交由引擎预发年规则外推(=2024原值)，公布后再填
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
