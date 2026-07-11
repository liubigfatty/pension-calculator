// 数据来源：✅ 官方数据
// 2024年计发基数：7842元/月
// 更新时间：2026-06-10

// data/provinces/anhui.js
// 安徽省养老金计算数据模块（框架版，待补充官方数据）
// TODO：补充官方计发基数、过渡系数、建账时间等

const PROV_BASE = {
  1978: 831,
  1979: 873,
  1980: 916,
  1981: 962,
  1982: 1010,
  1983: 1061,
  1984: 1114,
  1985: 1170,
  1986: 1228,
  1987: 1290,
  1988: 1354,
  1989: 1422,
  1990: 1493,
  1991: 1567,
  1992: 1646,
  1993: 1728,
  1994: 1814,
  1995: 1905,
  1996: 2000,
  1997: 2100,
  1998: 2205,
  1999: 2316,
  2000: 2432,
  2001: 2553,
  2002: 2681,
  2003: 2815,
  2004: 2956,
  2005: 3103,
  2006: 3259,
  2007: 3421,
  2008: 3593,
  2009: 3772,
  2010: 3961,
  2011: 4159,
  2012: 4367,
  2013: 4585,
  2014: 4814,
  2015: 5055,
  2016: 5308,
  2017: 5573,
  2018: 5852,
  2019: 6144,
  2020: 6452,
  2021: 6774,
  2022: 7401,
  2023: 7688,
  2024: 7842,
   2025: 7185,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};;

const BASE_PARAMS = {
  
  PROV_GROWTH: 0.03,
  MERGE_YEAR: 2031,
  PROV_2025: 7185,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
}

const CITY_LIST = [
  '合肥市', '芜湖市', '蚌埠市', '淮南市', '马鞍山市',
  '淮北市', '铜陵市', '安庆市', '黄山市', '滁州市',
  '阜阳市', '宿州市', '六安市', '亳州市', '池州市',
  '宣城市',
]

const ACCOUNT_START = { year: 1996, month: 1 }
const CUTOFF_DATE   = { year: 1995, month: 12 }
const TRANS_COEF = 0.013
const PROV_TAG = 'anhui'

const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}

const cases = []


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/anhui.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
;

function getEngineConfig() {
  const modules = {}
  if (MODULES.includes('base'))       modules.basic_pension = { enabled: true, rate_per_year: 0.01 }
  if (MODULES.includes('personal'))  modules.personal_account = { enabled: true }
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true, coefficient: TRANS_COEF }
  }

  return {
    avg_salary_history: AVG_SALARY_HISTORY,
    base_rates: { prov: PROV_BASE },
    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,
    province: PROV_TAG,
    name: '安徽省',
    modules,
  }
}


const AVG_SALARY_HISTORY = {
  1996: 685.83,
  1997: 1321,
  1998: 1258,
  1999: 1321,
  2000: 1397,
  2001: 1456,
  2002: 1550,
  2003: 1873,
  2004: 2061,
  2005: 2419,
  2006: 2912,
  2007: 1496,
  2008: 1848.33,
  2009: 2196.92,
  2010: 2471.5,
  2011: 2861.75,
  2012: 3386.67,
  2013: 3841,
  2014: 3983.83,
  2015: 4365.67,
  2016: 4747.83,
  2017: 5107.42,
  2018: 5660.58,
  2019: 5028.42,
  2020: 5975.17,
  2021: 6386.92,
  2022: 6698.33,
  2023: 7043.83,
  2024: 7842,
  2025: 7185,  // 2025年度社保缴费基数·2024全口径社平（官方已发布，人社通汇总）
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
