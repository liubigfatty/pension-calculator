// 数据来源：✅ 已据官方核定表核实（河北省统计公报/人社厅公开数据整理；早年段见内层占位说明）
// 2024年计发基数：7265元/月
// 更新时间：2026-06-10

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/hebei.js
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
// 未发布年份不写固定值，由引擎 getBase() 按「该省上一年已公布增幅」外推产生
//   （inferGrowthRate：取最近两个已公布年份的增幅，跳过预发年，夹到 0~3%；2026-09-14 起执行）。
// 各省特有城市级常量（CC_BASE/SY_BASE/DL_BASE/SHENZHEN_BASE/ZHENGZHOU_BASE/XIZANG_SUBSIDIES/CONTRIB_BASE_TIERS 等）均有独立行内注释。
// ==============================================================

// 河北省养老金计算数据模块（框架版，待补充官方数据）
// TODO：补充官方计发基数、过渡系数、建账时间等

const PROV_BASE = {
  1978: 770,
  1979: 809,
  1980: 849,
  1981: 891,
  1982: 936,
  1983: 983,
  1984: 1032,
  1985: 1084,
  1986: 1138,
  1987: 1195,
  1988: 1254,
  1989: 1317,
  1990: 1383,
  1991: 1452,
  1992: 1525,
  1993: 1601,
  1994: 1681,
  1995: 1765,
  1996: 1853,
  1997: 1946,
  1998: 2043,
  1999: 2145,
  2000: 2253,
  2001: 2365,
  2002: 2484,
  2003: 2608,
  2004: 2738,
  2005: 2875,
  2006: 3019,
  2007: 3170,
  2008: 3328,
  2009: 3495,
  2010: 3669,
  2011: 3853,
  2012: 4045,
  2013: 4248,
  2014: 4460,
  2015: 4683,
  2016: 4917,
  2017: 5163,
  2018: 5421,
  2019: 5692,
  2020: 6291,
  2021: 6575,
  2022: 6849,
  2023: 7122,
  2024: 7265,
   2025: 7410,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};;

const BASE_PARAMS = {
  PROV_GROWTH: 0.03,
  MERGE_YEAR: 2031,
  PROV_2025: 7410,  // 2025年保定真实核定表（待全省官方文件）
}

const CITY_LIST = [
  '石家庄市', '唐山市', '秦皇岛市', '邯郸市', '邢台市',
  '保定市', '张家口市', '承德市', '沧州市', '廊坊市',
  '衡水市',
]

const ACCOUNT_START = { year: 1996, month: 1 }
const CUTOFF_DATE   = { year: 1995, month: 12 }
const TRANS_COEF = 0.013
const PROV_TAG = 'hebei'

const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

const cases = []


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/hebei.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

function getEngineConfig() {
  const modules = {}
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 }
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true }
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true, formula_type: 'hebei' }
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF
      }
    }
  }

  // 冬季取暖补贴：按年一次性发放，**不计入月基本养老金**；分三档，按退休地所属取暖区域
  // 冀人社发〔2012〕3号：坝上地区 1560 元 / 张承其他县及青龙、涞源 1400 元 / 省内其他地区 1240 元
  modules.annual_subsidies = {
    enabled: true,
    note: '按退休地所属取暖区域分档；取暖期内退休的人员按 当地年度标准÷取暖期月数×剩余月数 计发',
    items: [
      { name: '冬季取暖补贴', tiers: { default: 1240, prov: 1240, bashang: 1560, mountain: 1400 }, unit: '元/年', when: '每年11月随当月养老金一次性发放', source: '冀人社发〔2012〕3号（2011年冬季取暖期起执行）' }
    ]
  };
  return {
    avg_salary_history: AVG_SALARY_HISTORY,
    base_rates: { prov: PROV_BASE },
    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,
    province: PROV_TAG,
    name: '河北省',
    modules,
  }
}


// SALARY_SEMANTICS_V2: avg_salary_history[Y] = Y 年度执行社平（= Y-1 统计年），2026-09-20 统一
const AVG_SALARY_HISTORY = {
  1993: 252.83,   // 首端兜底：早于数据起始年的参保年份取最早已知值（SALARY_SEMANTICS_V2）
  1994: 252.83,
  1995: 348.75,
  1996: 403.25,
  1997: 440.5,
  1998: 474.33,
  1999: 485,
  2000: 535,
  2001: 586.92,
  2002: 655.33,
  2003: 746.58,
  2004: 932.42,
  2005: 1077,
  2006: 1225.58,
  2007: 1382.5,
  2008: 1659.25,
  2009: 2063,
  2010: 2365.25,
  2011: 2692.17,
  2012: 3013.83,
  2013: 3295.17,
  2014: 3544.33,
  2015: 3853.25,
  2016: 4367.42,
  2017: 4748.92,
  2018: 5438.83,
  2019: 5969.42,
  2020: 5078.08,
  2021: 5409.17,
  2022: 5788.75,
  2023: 6211.08,
  2024: 6534.25,
  2025: 6678,
  // [V2已删] 2025: 6794,  // 2025年保定真实核定表（待全省官方文件）
  2026: 6794,   // 2025年统计口径社平（2026年度执行）
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
