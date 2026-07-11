// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：7265元/月
// 更新时间：2026-06-10

// data/provinces/hebei.js
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
  2020: 5977,
  2021: 6276,
  2022: 6590,
  2023: 7122,
  2024: 7265,
   2025: 6678,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
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


const AVG_SALARY_HISTORY = {
  1993: 252.83,
  1994: 348.75,
  1995: 403.25,
  1996: 440.5,
  1997: 474.33,
  1998: 485,
  1999: 535,
  2000: 586.92,
  2001: 655.33,
  2002: 746.58,
  2003: 932.42,
  2004: 1077,
  2005: 1225.58,
  2006: 1382.5,
  2007: 1659.25,
  2008: 2063,
  2009: 2365.25,
  2010: 2692.17,
  2011: 3013.83,
  2012: 3295.17,
  2013: 3544.33,
  2014: 3853.25,
  2015: 4367.42,
  2016: 4748.92,
  2017: 5438.83,
  2018: 5969.42,
  2019: 5078.08,
  2020: 5409.17,
  2021: 5788.75,
  2022: 6211.08,
  2023: 6534.25,
  2024: 7265,
  2025: 7410,  // 2025年保定真实核定表（待全省官方文件）
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
