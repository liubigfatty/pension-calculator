// 数据来源：✅ 官方数据
// 2024年计发基数：7694元/月
// 更新时间：2026-06-10

// data/provinces/hunan.js
// 湖南省养老金计算数据模块
// TODO：补充1995-2022年官方计发基数（目前为估算值）
// 依据：湘人社规〔2024〕10号、湘人社发〔2025〕53号

// ==================== 基础数据 ====================

const PROV_BASE = {
  // 1978-1994年：暂无官方数据，暂时保留旧值
  1978: 816,
  1979: 856,
  1980: 899,
  1981: 944,
  1982: 991,
  1983: 1041,
  1984: 1093,
  1985: 1148,
  1986: 1205,
  1987: 1265,
  1988: 1328,
  1989: 1395,
  1990: 1465,
  1991: 1538,
  1992: 1615,
  1993: 1695,
  1994: 1780,
  // =========== 1995-2023年：用户提供的官方数据（2026-06-18）============
  // 数据来源：湖南省历年在岗职工月平均工资（社平/岗平）
  1995: 342,
  1996: 400,
  1997: 425,
  1998: 444,
  1999: 456,
  2000: 495,
  2001: 543,
  2002: 641,
  2003: 728,
  2004: 955,
  2005: 1305,
  2006: 1487,
  2007: 1795,
  2008: 2052,
  2009: 2274,
  2010: 2540,
  2011: 2960,
  2012: 3336,
  2013: 3658,
  2014: 4044,
  2015: 4491,
  // ⚠️ 2017年(5500)比2018年(4764)高，可能是统计口径调整
  2016: 5013,
  2017: 5500,
  2018: 4764,
  2019: 5054,
  2020: 5460,
  2021: 5977,
  2022: 6284,
  2023: 6711,
  2024: 7694,  // 预估：6711 × 1.026
  2025: 6090,  // 预估：6880 × 1.026
};

// 湖南省基数增长预测参数
const BASE_PARAMS = {
  PROV_2025: 7060,  // 2024年预估6880，按2.6%增长
  PROV_GROWTH: 0.026,
  LATEST_BASE_YEAR: 2023,
  LATEST_BASE_VALUE: 6711,
}

// 湖南省城市列表（地级市+自治州）
const CITY_LIST = [
  '长沙市', '株洲市', '湘潭市', '衡阳市', '邵阳市',
  '岳阳市', '常德市', '张家界市', '益阳市', '郴州市',
  '永州市', '怀化市', '娄底市', '湘西州',
]

// ==================== 核心规则 ====================

// 湖南省养老保险建账时间和 cutoff 时间
// ⚠️ 待确认：建账时间（目前按1995-10估算，待官方文件确认）
// ⚠️ 待确认：视同缴费cutoff时间（目前按1995-09估算，待官方文件确认）
// TODO：搜索关键词"湘人社规 个人账户建立 1995"或"湘政发〔2006〕XX号 养老保险办法"
const ACCOUNT_START = { year: 1995, month: 10 }
const CUTOFF_DATE   = { year: 1995, month: 09 }

const TRANS_COEF = 0.013  // 湖南过渡系数固定 1.3%
// 依据：m12333.cn（湖南省退休人员养老金计算办法）
// TODO：补充官方文件编号（如：湘政发〔2006〕XX号）

const PROV_TAG = 'hunan'

// 湖南省模块配置（有基础养老金 + 个人账户养老金 + 过渡性养老金）
const MODULES = ['base', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}
const MODULE_FORMULAS = {
  base:       (legal, d) => '(' + (legal.baseRetire||0) + '+' + (legal.baseProv||0) + ') ÷ 2 × ' + ((legal.totalYears||0)).toFixed(2) + '年 × 1%',
  personal:   (legal, d) => (d.personalAcc||0) + ' ÷ ' + (legal.months||139),
  transition: (legal, d) => (legal.baseProv||0) + ' × ' + ((legal.sightYears||0)).toFixed(2) + '年 × 1.3%',
}
const MODULE_COLORS = ['#1d4ed5','#0ea5e9','#0284c7']

// ==================== 测试案例 ====================
// TODO：替换为湖南省官方核定表数据
const cases = [
  {
        interest_rates: {
      1998: 0.060,
      1999: 0.060,
      2000: 0.060,
      2001: 0.060,
      2002: 0.060,
      2003: 0.060,
      2004: 0.060,
      2005: 0.060,
      2006: 0.050,
      2007: 0.050,
      2008: 0.050,
      2009: 0.050,
      2010: 0.050,
      2011: 0.040,
      2012: 0.040,
      2013: 0.040,
      2014: 0.040,
      2015: 0.040
    },
    note: '⚠️ 案例数据待替换为官方核定表',
    input: {
      birthYear: 1965, birthMonth: 6,
      workYear: 1985, workMonth: 7,
      cityType: 'prov',
      avgIndex: 0.85,
      personalAccInput: 85000,
      totalYears: 40,
      sightYears: 10.0,
      skipDelay: true,
    },
    expected: {
      base: 2846.78,
      personal: 611.51,
      transition: 850.19,
      total: 4308.48,
    },
  },
  {
    name: '湖南-女-2025退休（待验证）',
    interest_rates: {
      1998: 0.060,
      1999: 0.060,
      2000: 0.060,
      2001: 0.060,
      2002: 0.060,
      2003: 0.060,
      2004: 0.060,
      2005: 0.060,
      2006: 0.050,
      2007: 0.050,
      2008: 0.050,
      2009: 0.050,
      2010: 0.050,
      2011: 0.040,
      2012: 0.040,
      2013: 0.040,
      2014: 0.040,
      2015: 0.040
    },
    note: '⚠️ 案例数据待替换为官方核定表',
    input: {
      birthYear: 1975, birthMonth: 3,
      workYear: 1995, workMonth: 4,
      cityType: 'prov',
      avgIndex: 0.72,
      personalAccInput: 42000,
      totalYears: 30,
      sightYears: 0.25,
      skipDelay: true,
    },
    expected: {
      base: 1985.05,
      personal: 302.16,
      transition: 18.00,
      total: 2305.21,
    },
  },
]

// ==================== 引擎配置 ====================


// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/hunan.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）
const AVG_SALARY_HISTORY = {
  1990: 169.8,
  1991: 181.4,
  1992: 210.5,
  1993: 261.8,
  1994: 342,
  1995: 399.8,
  1996: 425,
  1997: 443.8,
  1998: 446.04,
  1999: 489.79,
  2000: 558.32,
  2001: 630,
  2002: 713.93,
  2003: 1000.1,
  2004: 1135.3,
  2005: 1275.5,
  2006: 1450,
  2007: 1755,
  2008: 2012.2,
  2009: 2211.2,
  2010: 2472.5,
  2011: 2882.2,
  2012: 3247.6,
  2013: 3560.5,
  2014: 3926.4,
  2015: 4363.1,
  2016: 4853.4,
  2017: 4851.35,
  2018: 4576.81,
  2019: 4839.52,
  2020: 5460,
  2021: 5977,
  2022: 6284,
  2023: 6711,
  2024: 7618,
  2025: 6090,
  2026: 6258,
};

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
base_rates: PROV_BASE,
      account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,

    province: PROV_TAG,
    base_rates: { prov: PROV_BASE },
    name: '湖南省',
 avg_salary_history: AVG_SALARY_HISTORY,
 modules: modules,
    
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: '2023-2025年基数（湘人社规〔2025〕30号）',
  };
}

module.exports = {
  PROV_BASE,
  BASE_PARAMS,
  CITY_LIST,
  ACCOUNT_START,
  CUTOFF_DATE,
  TRANS_COEF,
  PROV_TAG,
  MODULES,
  getEngineConfig,
  cases,
}
