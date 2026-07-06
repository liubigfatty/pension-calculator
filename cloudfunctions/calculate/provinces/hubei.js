// 数据来源：❌ 2024年未公布，使用2025年数据
// 2024年计发基数：6665元/月
// 更新时间：2026-06-10

// data/provinces/hubei.js
// 湖北省养老金计算数据模块（框架版，待补充官方数据）
// TODO：补充官方计发基数、过渡系数、建账时间等

const PROV_BASE = {
  1978: 706,
  1979: 742,
  1980: 779,
  1981: 818,
  1982: 859,
  1983: 902,
  1984: 947,
  1985: 994,
  1986: 1044,
  1987: 1096,
  1988: 1151,
  1989: 1208,
  1990: 1269,
  1991: 1332,
  1992: 1399,
  1993: 1469,
  1994: 1542,
  1995: 1619,
  1996: 1700,
  1997: 1785,
  1998: 1874,
  1999: 1968,
  2000: 2067,
  2001: 2170,
  2002: 2278,
  2003: 2392,
  2004: 2512,
  2005: 2638,
  2006: 2769,
  2007: 2908,
  2008: 3053,
  2009: 3206,
  2010: 3366,
  2011: 3535,
  2012: 3711,
  2013: 3897,
  2014: 4092,
  2015: 4296,
  2016: 4511,
  2017: 4737,
  2018: 4974,
  2019: 5222,
  2020: 5483,
  2021: 5757,
  2022: 6045,
  2023: 6348,
  2024: 9112,
  2025: 6665,
};

const BASE_PARAMS = {
  PROV_2025: 7200,
  PROV_GROWTH: 0.03,
  MERGE_YEAR: 2031
}

const CITY_LIST = [
  '武汉市', '黄石市', '十堰市', '宜昌市', '襄阳市',
  '鄂州市', '荆门市', '孝感市', '荆州市', '黄冈市',
  '咸宁市', '随州市', '恩施州',
]

const ACCOUNT_START = { year: 1998, month: 1 }
const CUTOFF_DATE   = { year: 1997, month: 12 }
const TRANS_COEF = 0.012
const PROV_TAG = 'hubei'

const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

const cases = []


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/hubei.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
const AVG_SALARY_HISTORY = {
  1998: 706,
  1999: 734,
  2000: 811,
  2001: 943,
  2002: 1081,
  2003: 1144,
  2004: 1331,
  2005: 1542,
  2006: 1869,
  2007: 2239,
  2008: 2370,
  2009: 2842,
  2010: 3401,
  2011: 3923,
  2012: 4255,
  2013: 4615,
  2014: 5291,
  2015: 5901,
  2016: 6488,
  2017: 6640,
  2018: 7361,
  2019: 8170,
  2020: 5925.83,
  2021: 8206.92,
  2022: 8609,
  2023: 9177.83,
  2024: 9022,
};

function getEngineConfig() {
  return {    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
 avg_salary_history: AVG_SALARY_HISTORY,
 modules: {},
  }
}

module.exports = {
  PROV_TAG,
  PROV_BASE,
  CITY_LIST,
  MODULES,
  MODULE_LABELS,
  cases,
  getEngineConfig,
}
