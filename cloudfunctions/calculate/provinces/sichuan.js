// 数据来源：⚠️ 搜索结果（待官方文件确认）
// 2024年计发基数：8321元/月
// 更新时间：2026-06-10

// data/provinces/sichuan.js
// 四川省养老金计算数据模块
// 同时支持新格式（Mini Program）和旧格式（引擎）

// ==================== 新格式（Mini Program 用）====================

// 四川省历年计发基数（元/月）
// 数据来源：用户提供历年平均工资表（2026-06-18），全口径城镇单位就业人员平均工资
// 注：2018年后为全口径，2013-2017年为在岗职工平均工资
const PROV_BASE = {
  1978: 882,
  1979: 926,
  1980: 972,
  1981: 1021,
  1982: 1072,
  1983: 1126,
  1984: 1182,
  1985: 1241,
  1986: 1303,
  1987: 1368,
  1988: 1437,
  1989: 1509,
  1990: 1584,
  1991: 1663,
  1992: 1746,
  1993: 1834,
  1994: 1925,
  1995: 2022,
  1996: 2123,
  1997: 2229,
  1998: 2340,
  1999: 2457,
  2000: 2580,
  2001: 2709,
  2002: 2845,
  2003: 2987,
  2004: 3136,
  2005: 3293,
  2006: 3458,
  2007: 3630,
  2008: 3812,
  2009: 4003,
  2010: 4203,
  2011: 4413,
  2012: 4633,
  2013: 4865,
  2014: 5108,
  2015: 5364,
  2016: 5632,
  2017: 5914,
  2018: 6209,
  2019: 6520,
  2020: 7041,
  2021: 7379,
  2022: 7822,
  2023: 8079,
  2024: 8332,
  2027: 9018,
  2028: 9255,
  2029: 9497,
  2030: 9745,
  2031: 10000,
  2032: 10260,
  2033: 10517,
  2034: 10780,
  2035: 11049,
   2025: 7646,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
};;

// 四川省历年平均工资（元/月，用于计算缴费基数）
// 1996-2013：用户提供官方数据（元/年÷12→元/月）
// 2014-2025：全口径城镇单位就业人员平均工资（用户提供）


// 四川省基数增长预测参数
// 数据来源：用户提供历年平均工资表（2026-06-18）
// 2023年月平均工资：7518.33元
// 2024年：7894元（增长5.0%，历史参考）
// 2025年计发基数：7646元（=2024全口径社平，国办发〔2019〕13号口径，官方已发布）
const BASE_PARAMS = {
  
  PROV_GROWTH: 0.050,  // 约 5.0%/年
  MERGE_YEAR: 2031,
  PROV_2025: 7646,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
}

// 四川省行政区划（全省统筹，无地级市区分）
const CITY_LIST = [
  { code: 'prov', name: '全省（默认）' }
]

// 四川省养老保险建账时间和 cutoff 时间
// 依据：川劳社发〔2006〕17号
const ACCOUNT_START = { year: 1996, month: 1 }  // 1996年1月1日起建账
const CUTOFF_DATE   = { year: 1995, month: 12 }  // 视同缴费截止 1995-12

const TRANS_COEF = 0.013  // 四川过渡系数固定 1.3%

const PROV_TAG = 'sichuan'

// 四川省模块配置（有基础养老金 + 增发养老金 + 个人账户养老金 + 过渡性养老金）
const MODULES = ['base', 'extra', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  extra:       '增发养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}
const MODULE_FORMULAS = {
  base:       (legal, d) => '(' + (legal.baseRetire||0) + '+' + (legal.baseProv||0) + ') ÷ 2 × ' + ((legal.totalYears||0)).toFixed(2) + '年 × 1%',
  extra:      (legal, d) => '指数化工资' + ((legal.baseRetire||0) * (d.avgIndex||0)).toFixed(2) + '×' + ((d.extraRate||0.001) * 100).toFixed(1) + '%×' + ((legal.totalYears||0)).toFixed(2) + '年',
  personal:   (legal, d) => (d.personalAcc||0) + ' ÷ ' + (legal.months||139),
  transition: (legal, d) => '(' + (legal.baseRetire||0) + '+' + (legal.baseProv||0) + ') ÷ 2 × ' + ((legal.preAccountYears||0)).toFixed(2) + '年 × 1.3%',
}
const MODULE_COLORS = ['#1d4ed5','#0369a1','#0ea5e9','#0284c7']

// ==================== 旧格式（引擎用）====================
// 引擎 calculate(config, inputData) 需要的格式
// 通过 getEngineConfig() 获取

const VIEWING_START = { year: 1996, month: 1 }
const USE_PRE_ACCOUNT_YEARS = true

// 计发月数表（引擎用 monthly_payment_months 字段名）
const MONTHLY_PAYMENT_MONTHS = {
  50.0: 195, 50.5: 192.5, 51.0: 190, 51.5: 187.5,
  52.0: 185, 52.5: 182.5, 53.0: 180, 53.5: 177.5,
  54.0: 175, 54.5: 172.5, 55.0: 170, 55.5: 167.5,
  56.0: 164, 56.5: 161.5, 57.0: 158, 57.5: 155.5,
  58.0: 152, 58.5: 149.5, 59.0: 145, 59.5: 142.5,
  60.0: 139, 60.5: 136.1, 61.0: 132, 61.5: 128.6,
  62.0: 125, 62.5: 121.4, 63.0: 117, 63.5: 113.4
}

const MIN_YEARS_CONFIG = {
  2025: 15, 2026: 15, 2027: 15, 2028: 15, 2029: 15,
  2030: 15.5, 2031: 16, 2032: 16.5, 2033: 17, 2034: 17.5,
  2035: 18, 2036: 18.5, 2037: 19, 2038: 19.5,
  2039: 20, 2040: 20, 2041: 20, 2042: 20, 2043: 20, 2044: 20, 2045: 20
}

const DELAY_RETIREMENT = {
  effective_date: "2026-01-01",
  male:   { base_year: 1965, step: 4, cap_months: 36 },
  fc:     { base_year: 1970, step: 4, cap_months: 36 },
  fw55:   { base_year: 1975, step: 2, cap_months: 60 }
}

// 引擎用的 modules 格式（含 enabled、formula_type、formula 等字段）
const ENGINE_MODULES = {
  basic_pension: {
    enabled: true,
    rate_per_year: 0.01,
    formula: "(月计发基数 + 指数化月平均缴费工资) / 2 × 累计缴费年限 × 1%"
  },
  extra_pension: {
    enabled: true,
    formula_type: "sichuan",
    rate: 0.001,
    formula: "指数化月平均缴费工资 × 0.1% × 累计缴费年限"
  },
  personal_account: {
    enabled: true,
    formula: "个人账户累计储存额 / 计发月数"
  },
  transitional_pension: {
    enabled: true,
    formula_type: "sichuan",
    coefficient: 0.013,
    formula: "(月计发基数 + 指数化月平均缴费工资) / 2 × 1995年底前未建账缴费年限 × 1.3%"
  },
  special_addition: {
    enabled: false
  }
}

const CITIES = [
  { code: 'prov', name: '全省（默认）' }
]

const NOTES = {
  policy: "四川省企业职工基本养老保险按照川劳社发〔2006〕17号及相关文件执行。",
  base_pension_formula: "基础养老金 = (月计发基数 + 指数化月平均缴费工资) ÷ 2 × 累计缴费年限 × 1%",
  transitional_pension_formula: "过渡性养老金 = (月计发基数 + 指数化月平均缴费工资) ÷ 2 × 1995年12月31日及以前未建立个人账户的累计缴费年限 × 1.3%",
  extra_pension_formula: "月增发养老金 = 指数化月平均缴费工资 × 0.1% × 累计缴费年限 + 定额（根据条件确定）",
  account_start: "建账时间为1996年1月1日",
  transition_coefficient: "过渡系数统一为1.3%",
  data_source: "计发基数：2024年8079元、2025年8321元、2026年8462元来自官方核定表；平均工资：2023年7518.33元来自用户提供。",
  special_notes: "四川省增发养老金为地方性政策，增发比例0.1%~0.4%+（因人而异），具体条件和定额标准需根据川劳社发〔2006〕18号细则确定。定额部分（如6.83元）需根据个人具体情况确定。"
}

/**
 * 获取引擎格式的配置对象
 * 引擎 calculate(config, inputData) 需要此格式
 * @returns {Object} 引擎配置对象
 */
function getEngineConfig() {
  return {
  avg_salary_history: AVG_SALARY_HISTORY,
    province: 'sichuan',
    name: '四川省',
    
      base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    viewing_start: VIEWING_START,
    usePreAccountYears: USE_PRE_ACCOUNT_YEARS,
    base_rates: {
      prov: PROV_BASE
    },
    avg_salary_history: AVG_SALARY_HISTORY,
    monthly_payment_months: MONTHLY_PAYMENT_MONTHS,
    min_years: MIN_YEARS_CONFIG,
    delay_retirement: DELAY_RETIREMENT,
    modules: ENGINE_MODULES,
    cities: CITIES,
    cases: cases,
    notes: NOTES
  }
}

// ==================== 新格式（Mini Program 用）====================
const cases = [
  {
    name: "四川案例1（2024年退休，女，50岁，无视同缴费）",
    birthYear: 1974,
    birthMonth: 1,
    workYear: 2007,
    workMonth: 1,
    retireYear: 2024,
    retireMonth: 4,
    cityType: "prov",
    sightYears: 0,
    totalYears: 17.33,
    actualYears: 17.33,
    personalAcc: 91147.87,
    avgIndex: 0.84,
    baseRetire: 8079,
    baseProv: 8079,
    months: 195,
    isPreApproval: false,
    results: {
      basePension: 1288.08,
      personalPension: 467.42,
      transitionalPension: 0,
      extraPension: 117.61,
      totalPension: 1873.11
    },
    officialDocument: "四川省社会保险业务办理结果通知单（2024-04）",
    note: "2024-04退休；月计发基数8079元；平均缴费指数0.84；指数化月平均工资6786.36元；无视同缴费；实际缴费208个月；个人账户91147.87元；增发养老金117.61元（指数化工资×0.1%×累计缴费年限）"
  },
  {
    name: "四川案例3（2025年退休，男，60岁1个月，有过渡性养老金）",
    birthYear: 1965,
    birthMonth: 11,
    workYear: 1982,
    workMonth: 12,
    retireYear: 2025,
    retireMonth: 12,
    cityType: "prov",
    sightYears: 10.83,
    totalYears: 43.08,
    actualYears: 32.25,
    preAccountYears: 13.08,
    personalAcc: 111640.05,
    avgIndex: 0.872,
    baseRetire: 8462,
    baseProv: 8462,
    months: 138.4,
    isPreApproval: false,
    results: {
      basePension: 3412.12,
      personalPension: 806.65,
      transitionalPension: 1346.79,
      extraPension: 317.88,
      totalPension: 5883.44
    },
    officialDocument: "四川省社会保险业务办理结果通知单（2025-12）",
    note: "2025-12退休；月计发基数8462元；平均缴费指数0.872；指数化月平均工资7378.86元；视同缴费130个月(10.83年)；实际缴费387个月(32.25年)；累计缴费517个月(43.08年)；1995年底前未建账157个月(13.08年)；个人账户111640.05元；增发养老金317.92元"
  },
  {
    name: "四川案例4（2024年退休，女，50岁，有预核定→核定过程）",
    birthYear: 1974,
    birthMonth: 6,
    workYear: 1992,
    workMonth: 9,
    retireYear: 2024,
    retireMonth: 6,
    cityType: "prov",
    sightYears: 0,
    totalYears: 31.83,
    actualYears: 31.83,
    preAccountYears: 3.33,
    personalAcc: 150397.22,
    avgIndex: 0.935,
    baseRetire: 8321,
    baseProv: 8321,
    months: 195,
    isPreApproval: false,
    results: {
      basePension: 2562.50,
      personalPension: 771.27,
      transitionalPension: 348.51,
      extraPension: 247.64,
      totalPension: 3929.92
    },
    officialDocument: "四川省社会保险业务办理结果通知单（2024-06，重核后）",
    note: "2024-06退休；月计发基数8321元；平均缴费指数0.935；指数化月平均工资7780.14元；无视同缴费；实际缴费382个月(31.83年)；累计缴费382个月(31.83年)；1995年底前未建账40个月(3.33年)；个人账户150397.22元；增发养老金247.64元（指数化工资×0.1%×累计缴费年限，定额0）；初始预核定3916.03元，重核后3929.92元"
  },
  {
    name: "四川案例5（2024年退休，男，55岁，政策性提前退，增发0.4%）",
    birthYear: 1969,
    birthMonth: 3,
    workYear: 1986,
    workMonth: 11,
    retireYear: 2024,
    retireMonth: 3,
    cityType: "prov",
    sightYears: 5.08,
    totalYears: 37.08,
    actualYears: 32.00,
    preAccountYears: 8.83,
    personalAcc: 88960.59,
    avgIndex: 0.726,
    baseRetire: 8079,
    baseProv: 8079,
    months: 170,
    extraRate: 0.004,
    isPreApproval: false,
    results: {
      basePension: 2585.28,
      personalPension: 523.30,
      transitionalPension: 800.34,
      extraPension: 869.95,
      totalPension: 4778.87
    },
    officialDocument: "四川省社会保险业务办理结果通知单（2024-03）",
    note: "2024-03退休，男，55岁，政策性提前退；月计发基数8079元；平均缴费指数0.726；指数化月平均工资5865.35元；视同缴费61个月(5.08年)；实际缴费384个月(32年)；累计缴费445个月(37.08年)；1995年底前未建账106个月(8.83年)；个人账户88960.59元；计发月数170；增发养老金869.95元（比例0.4%=指数化工资×0.4%×累计缴费年限+定额）"
  },
  {
    name: "四川案例6（2025年退休，男，60岁，正常退休，增发0.1%）",
    birthYear: 1965,
    birthMonth: 11,
    workYear: 1982,
    workMonth: 12,
    retireYear: 2025,
    retireMonth: 12,
    cityType: "prov",
    sightYears: 10.83,
    totalYears: 43.08,
    actualYears: 32.25,
    preAccountYears: 13.08,
    personalAcc: 111640.05,
    avgIndex: 0.872,
    baseRetire: 8462,
    baseProv: 8462,
    months: 138.4,
    extraRate: 0.001,
    isPreApproval: false,
    results: {
      basePension: 3412.12,
      personalPension: 806.65,
      transitionalPension: 1346.79,
      extraPension: 317.88,
      totalPension: 5883.44
    },
    officialDocument: "四川省社会保险业务办理结果通知单（2025-12）",
    note: "2025-12退休，男，60岁，正常退休；月计发基数8462元；平均缴费指数0.872；指数化月平均工资7378.86元；视同缴费130个月(10.83年)；实际缴费387个月(32.25年)；累计缴费517个月(43.08年)；1995年底前未建账157个月(13.08年)；个人账户111640.05元；计发月数138.4；增发养老金317.88元（比例0.1%=指数化工资×0.1%×累计缴费年限+定额）"
  }
]

// 计发基数预测函数（四川省专用）
function predictBase(year) {
  const lastYear = 2026
  const lastVal  = PROV_BASE[lastYear] || 8462
  if (year <= lastYear) return PROV_BASE[year] || 0
  return Math.round(lastVal * Math.pow(1 + BASE_PARAMS.PROV_GROWTH, year - lastYear))
}


const AVG_SALARY_HISTORY = {
  1995: 2022,
  1996: 2123,
  1997: 2229,
  1998: 2340,
  1999: 2457,
  2000: 2580,
  2001: 2709,
  2002: 2845,
  2003: 2987,
  2004: 3136,
  2005: 3293,
  2006: 3458,
  2007: 3630,
  2008: 3812,
  2009: 4003,
  2010: 4203,
  2011: 4413,
  2012: 4633,
  2013: 4865,
  2014: 5108,
  2015: 5364,
  2016: 5632,
  2017: 5914,
  2018: 6209,
  2019: 6520,
  2020: 6210,
  2021: 6785,
  2022: 7076,
  2023: 7518.33,
  2024: 8332,
  2025: 7646,  // 2025年度社保缴费基数·2024全口径社平（官方已发布，人社通汇总）
};


module.exports = {
  PROV_BASE,
  AVG_SALARY_HISTORY,
  BASE_PARAMS,
  CITY_LIST,
  ACCOUNT_START,
  CUTOFF_DATE,
  TRANS_COEF,
  PROV_TAG,
  MODULES,
  MODULE_LABELS,
  MODULE_FORMULAS,
  MODULE_COLORS,
  cases,
  predictBase,
  getEngineConfig,
}
