// 数据来源：✅ 官方数据（用户提供吉林省历年社平工资表）
// 2024年计发基数：7178.5元/月
// 更新时间：2026-06-18

// 本文件 = 唯一真相源：cloudfunctions/calculate/provinces/jilin.js
// ==================== 字段定义（_definitions）====================
// 修改本文件前，先读以下语义与"索引年"口径，避免社平年/计发年错位（本项目历史高频 bug）：
//   PROV_BASE[Y]           使用年/退休年 → Y 年计发基数（元/月）。[注意]黑龙江特例：下标=社平年（见该省注释）。
//   AVG_SALARY_HISTORY[Y]  社平年/统计年 → Y 年度官方社平工资（元/月）。
//   （原 BASE_PARAMS 外推参数块与 predictBase() 已于 2026-10-24 删除，理由见文件内注释）
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

// 吉林省养老金计算数据模块

// 全省历年计发基数（元/月）
// 来源：吉林省历年社平工资表（1995-2024年官方数据）
const USE_PRE_ACCOUNT_YEARS = false;  // 吉林省不用建账前缴费年限
const NOTES = '吉林特殊算法：基础养老金与增发均为 (上一年度市县计发基数 + 上一年度全省计发基数×本人平均缴费工资指数) ÷ 2 的加权值（市县与全省两基数同处一公式，并非只用退休地基数）；过渡性养老金单用全省计发基数。此加权算法为吉林特有，不能当成各省通用规则。【内联 cases 数组为自描述测试数据·铁律】每个案例 input 必须显式带 gender/genderType 与 baseRetireInput/baseProvInput；2026 等"预发年"必须用上一年已发布计发基数作暂定（如 2026→用 2025 的 7322/7978.25），禁止依赖引擎外推。否则会因引擎默认男性(→按60岁反推退休年至2035)与计发基数外推得到错误结果（吉林-女-1976-02 曾因此被算成 2035 年退休、base 2797.87）。';
const PROV_BASE = {
  1978: 761,
  1979: 799,
  1980: 839,
  1981: 881,
  1982: 925,
  1983: 971,
  1984: 1020,
  1985: 1071,
  1986: 1124,
  1987: 1180,
  1988: 1239,
  1989: 1301,
  1990: 1366,
  1991: 1435,
  1992: 1507,
  1993: 1582,
  1994: 1661,
  1995: 369.17,
  1996: 447.5,
  1997: 472,
  1998: 545.92,
  1999: 596.5,
  2000: 660.33,
  2001: 730.92,
  2002: 832.5,
  2003: 923.42,
  2004: 1035.92,
  2005: 1200.75,
  2006: 1381.92,
  2007: 1709.42,
  2008: 1957.17,
  2009: 2185.83,
  2010: 2449.92,
  2011: 2849.75,
  2012: 3200.58,
  2013: 3570.5,
  2014: 3876.33,
  2015: 4296.5,
  2016: 4674.83,
  2017: 5120.92,
  2018: 5711.08,
  2019: 6151.08,
  2020: 5088.42,
  2021: 6004.75,
  2022: 6384.83,
  2023: 6655.33,
  2024: 7178.5,
   2025: 7322.08,  // 2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)
  // ✅ 2026 全省（不含长春、农垦）已公布：7481.50 元/月
  //   来源：吉人社联〔2026〕74号《关于公布2025年度社会保险全口径城镇单位就业人员平均工资的通知》
  //   （2026-09-01 印发、09-03 公布）——2025年全省全口径城镇单位就业人员平均工资 89778 元/年
  //   = 7481.5 元/月。吉林历年惯例：当年计发基数 = 上一年全口径社平（2025基数7322.08即2024全口径
  //   87865/12），故 2026 计发基数 = 7481.5，涨幅 +2.18%。同文公布农垦企业 28296 元/年 = 2358 元/月。
  //   ⚠️ 2026-10-01 补填：此前 2026 为空，引擎 getBase() 回退到 2025 的 7322.08，
  //      导致「2026年10月退休」被当成预发年算低；而 74 号早在退休时点之前一个多月已发布。
   2026: 7481.5,
  // ⚠️ 纪律：2027 起未发布，一律由引擎 getBase() 按「上一年已公布增幅」外推（现为 2026/2025 的 2.18%）。
  //   2026-09-14 删除了原 2027-2035 九条按 PROV_GROWTH 4.38% 外推的写死值（无官方来源）。
};;

// 历年社平工资（元/月）—— 用于个人账户余额精确计算
// 数据来源：provinces/jilin.json avg_salary_history（2020-2024 已÷12 转为元/月）
;

// 长春市历年计发基数（元/月，2020年起单列）
// 🔴 全部为官方原文口径（元/年 ÷ 12），2026-10-01 订正 2020–2023 四个年份：
//   旧值 6605.23/7023.31/7320.86 无官方来源，系 2026-09-14 被误改（当时还把 tests 里正确的
//   6927.75 断言反向"订正"成 6605.23）。现按省人社厅/省政府公报网原文恢复：
//   2020 83133（吉人社联〔2020〕123号附件《吉林省2020年基本养老金计发基数表》）
//   2021 87573（吉人社联〔2021〕209号附件《吉林省2021年基本养老金计发基数表》）
//   2022 91251（吉人社联〔2022〕149号附件）
//   2023 92720（吉人社联〔2023〕158号附件）
//   2024 94231（吉人社联〔2024〕143号） / 2025 95739（吉人社联〔2025〕97号）
//   涨幅链自洽：+5.34% → +4.20% → +1.61% → +1.63% → +1.60%
// ⚠️ 2026 长春：**官方尚未单列公布，不写死**。吉人社联〔2026〕74号只给了全省全口径 89778 元/年
//   与农垦 28296 元/年，未提长春；舆论对「长春是否已与全省并轨」存在分歧（一说缴费与计发基数
//   已统一=7481.5；一说"三数制"延续、待专门文件）。官方无专门文件 ⇒ 此处留空。
// 🔴 引擎行为（2026-10-01 起的防倒退规则，见 pension-engine.js 的 getBase 1.5 段）：
//   长春表缺 2026 时**按「预发」沿用本市 2025 的 7978.25**，绝不回退全省 7481.5。
//   理由：长春单列值高于全省，直接吃全省 ⇒ 2026 退休比 2025 退休月领少 52.88 元（缴得更多、
//   退得更晚反而拿更少），属待遇倒退，不可接受。官方专门文件出台后按新数重算补差，届时再填此表。
//   ⚠️ 无论如何都**不要把 CC_BASE[2026] 填成 7481.5**（那等于人为制造倒退）。
const CC_BASE = {
  2020: 6927.75, 2021: 7297.75, 2022: 7604.25, 2023: 7726.67, 2024: 7852.58, 2025: 7978.25
}

// ⛔【已废弃·2026-10-24 删除】原「吉林省基数增长预测参数」BASE_PARAMS 块已整块删除。
//   原内容：CC_2025 7978.25 / CC_GROWTH 0.026 / PROV_GROWTH 0.0438 / MERGE_YEAR 2031 / PROV_2025 7322
//   删除理由：
//   ① PROV_GROWTH 4.38% **无官方来源**，是早期拍的估值。用它外推的 2027-2035 九条写死基数
//      虽已于 2026-09-14 删除，但常量本身留了下来，成为"看似有据"的错误引用源
//      ——已发生过事实源表照抄 4.38%、再扩散到文章的事故。
//   ② MERGE_YEAR 2031（长春并轨全省）**没有任何官方文件**支撑，属臆设；
//      按它外推长春 2038 得 12,752，而引擎现行口径为 9,688，高算 32%。
//   ③ 本块只服务于本文件已删除的 predictBase()，而 predictBase() 全仓库**零调用**，是死代码。
//   ⇒ 现行唯一外推口径：引擎 inferGrowthRate() —— 取该基数表最近两个已公布年份的增幅，夹到 [0, 3%]。
//     吉林当前实测：全省 2.18%（7481.5/7322.08）、长春 1.60%（7978.25/7852.58）。
//   ⚠️ 不得以任何形式恢复本块。需要未来年份基数一律调用引擎 getBase(city, year, config)。

// 吉林省行政区划
const CITY_LIST = [
  '长春市', '吉林市', '四平市', '辽源市', '通化市',
  '白山市', '松原市', '白城市', '延边州'
]

// 吉林省养老保险建账时间和 cutoff 时间
const ACCOUNT_START = { year: 1995, month: 7 }  // 依据：吉政发[1995]18号
const CUTOFF_DATE   = { year: 1995, month: 6 }   // 视同缴费截止 1995-06

// ==================== 「1995-07 前参保判视同缴费 ⇒ 是否重复计算」核查结论（2026-10-09）====================
// 结论：**不算重复，是正确口径**。视同缴费年限**同时**用于两处，各有独立政策依据：
//   ① 计入基础养老金的「累计缴费年限」——吉政发〔2004〕28号 六(一) 明文：
//      "参保人员达到法定退休年龄、企业和个人累计缴费年限（**含视同缴费年限**，下同）满15年的"
//      且 基础养老金 =（退休时上一年度当地职工月平均工资 + 本人指数化月平均缴费工资）÷2 ×个人累计缴费年限×1%
//      原文（吉林省政府信息公开）：http://xxgk.jl.gov.cn/PDFfile/201812/5347702.pdf
//   ② 单独计发过渡性养老金——同文 六(二)1.：
//      过渡性养老金月标准 = 退休时上一年度全省职工月平均工资 × 本人平均缴费工资指数
//                          × 建立基本养老保险个人账户制度前**视同缴费年限** × 过渡系数（1.2%）
//      （吉政办明电〔2015〕11号：实际缴费年限累计超20年的，过渡系数由 1.2% 调整为 1.4%，2015-01-01 起）
//      长春市社保局官方答复复核：http://ccshbx.changchun.gov.cn/hdjl/wszx/202512/t20251215_3447165.html
// ⇒ 与全国通行做法一致：过渡性养老金本身就是对"建账前无个人账户积累"这段年限的补偿，
//   补偿的是**个人账户**的空账，与基础养老金按年限 1%/年计发是两笔不同性质的钱，不存在重复计发。
// ⚠️ 注意区分：吉政办明电〔2015〕11号 另一条"实际缴费年限超20年分段增发（0.15%/0.20%/0.25%）"
//    用的是**实际**缴费年限，不含视同年限（见 EXTRA_PARAMS.trigger = actual_years）——这条别混。
// 本轮不改任何数值，仅留结论消除疑虑。


// 吉林用分段系数，由引擎计算，此处设 null
const TRANS_COEF = {
  base: 0.014,
  alt: 0.012,
  get(currentActualYears) {
    return currentActualYears > 20 ? this.base : this.alt;
  }
}

// 吉林省增发养老金参数（吉政办明电〔2015〕11号）
const EXTRA_PARAMS = {
  trigger: { type: 'actual_years', threshold: 20 },
  brackets: [
    { from: 21, to: 25, rate: 0.0015, years: 5 },
    { from: 26, to: 30, rate: 0.0020, years: 5 },
    { from: 31, to: null, rate: 0.0025, years: null }  // 无上限段，动态计算
  ]
};

const PROV_TAG = 'jilin'

// 默认模块配置（吉林省，有增发，无其它加发）
const MODULES = ['base', 'extra', 'personal', 'transition']
const MODULE_LABELS = {
  base:        '基础养老金',
  extra:       '基础养老金增发部分',
  personal:    '个人账户养老金',
  transition:  '过渡性养老金',
}
const MODULE_FORMULAS = {
  base:       (legal, d) => '(' + (legal.baseRetire||0) + '+' + (legal.baseProv||0) + ') ÷ 2 × ' + ((legal.totalYears||0)).toFixed(2) + '年 × 1%',
  extra:      (legal, d) => '实际缴费年限>20年部分，分段增发（0.15%/0.20%/0.25%）',
  personal:   (legal, d) => (d.personalAccInput||d.personalAcc||0) + ' ÷ ' + (legal.months||139),
  transition: (legal, d) => (legal.baseProv||0) + ' × ' + ((legal.sightYears||0)).toFixed(2) + '年 × ' + (d.avgIndex||0).toFixed(4) + ' × ' + (legal.transRatio||'1.2%'),
}
const MODULE_COLORS = ['#1d4ed5','#0369a1','#0ea5e9','#0284c7']

// ⛔【已废弃·2026-10-24 删除】原 predictBase(year, cityType) 已删除。
//   它依赖上面已删除的 BASE_PARAMS（4.38% / 2.6% / 2031 并轨臆设），且**全仓库零调用**
//   ——引擎实际取数走的是 pension-engine.js 的 getBase()，此处属于历史遗留死代码。
//   预测未来年份计发基数请统一用 getBase(city, year, config)，外推口径见 inferGrowthRate()。

// 验证案例（从官方核定表提取）
const cases = [
  {
    name: '长春-男-1966-02（预核定表）',
    input: {
      gender: 'male', genderType: 'male',
      birthYear: 1966, birthMonth: 2,
      workYear: 1984, workMonth: 7,
      retireYear: 2026, retireMonth: 2,
      cityType: 'cc',
      avgIndex: 0.62,
      personalAccInput: 96750.01,
      totalYears: 41.67,
      sightYears: 11,
      skipDelay: true,
      baseRetireInput: 7978.25,
      baseProvInput: 7322.08,
    },
    expected: {
      base: 2608.11,
      extra: 292.14,
      personal: 696.04,
      transition: 699.11,
      total: 4295.40,
    },
  },
  {
    name: '吉林-女-1976-02（预核定表）',
    input: {
      gender: 'female', genderType: 'fw50',                 // 显式性别：防止 harness 漏解析名字而默认男性→按60岁反推退休年至2035
      baseRetireInput: 7322,                                // 2026预发年：用2025已发布计发基数(全省)作暂定，勿依赖引擎外推
      baseProvInput: 7322,
      birthYear: 1976, birthMonth: 2,
      workYear: 2008, workMonth: 6,
      retireYear: 2026, retireMonth: 2,
      cityType: 'prov',
      avgIndex: 0.75,
      personalAccInput: 112406.89,
      totalYears: 31,
      sightYears: 0.33,
      skipDelay: true,
      months: 195,
    },
    expected: {
      base: 1986.11,
      extra: 128.14,
      personal: 576.45,
      transition: 25.37,
      total: 2716.07,
    },
  },
  {
    name: '通化-男-2025-08（正式核定表）',
    input: {
      gender: 'male', genderType: 'male',
      birthYear: 1965, birthMonth: 1,
      workYear: 1980, workMonth: 1,
      cityType: 'prov',
      avgIndex: 0.46,
      personalAccInput: 83944.83,
      totalYears: 44.42,
      sightYears: 15.25,
      skipDelay: true,
    },
    expected: {
      base: 2374.30,
      extra: 286.23,
      personal: 603.92,
      transition: 719.10,
      total: 3983.55,
    },
  },
  {
    name: '吉林-男-1965-06（正式核定表）',
    input: {
      gender: 'male', genderType: 'male',
      birthYear: 1965, birthMonth: 6,
      workYear: 1984, workMonth: 10,
      cityType: 'prov',
      avgIndex: 1.74,
      personalAccInput: 241504.89,
      totalYears: 40.75,
      sightYears: 10.75,
      skipDelay: true,
    },
    expected: {
      base: 4087.73,
      extra: 445.13,
      personal: 1737.45,
      transition: 1917.43,
      total: 8187.74,
    },
  },
  {
    name: '长春-男-1965-03（预核定表）',
    input: {
      gender: 'male', genderType: 'male',
      birthYear: 1965, birthMonth: 3,
      workYear: 1982, workMonth: 12,
      cityType: 'cc',
      avgIndex: 0.60,
      personalAccInput: 84719.28,
      totalYears: 42.33,
      sightYears: 12.58,
      skipDelay: true,
    },
    expected: {
      base: 2618.43,
      extra: 298.93,
      personal: 609.49,
      transition: 773.74,
      total: 4300.59,
    },
  },
]


// ==========================================
// 引擎配置接口（将 JS 模块格式转换为引擎格式）
// ==========================================
function getEngineConfig() {
  // 将 MODULES 数组转换为 engines.modules 对象
  const modules = {};
  if (MODULES.includes('base')) modules.basic_pension = { enabled: true, rate_per_year: 0.01, formula_type: 'jilin' };
  if (MODULES.includes('extra')) {
    modules.extra_pension = { enabled: true };
    if (EXTRA_PARAMS) {
      modules.extra_pension.brackets = EXTRA_PARAMS.brackets;
      modules.extra_pension.trigger = EXTRA_PARAMS.trigger;
    }
  }
  if (MODULES.includes('personal')) modules.personal_account = { enabled: true };
  if (MODULES.includes('transition')) {
    modules.transitional_pension = { enabled: true };
    if (TRANS_COEF) {
      if (typeof TRANS_COEF === 'number') {
        modules.transitional_pension.coefficient = TRANS_COEF;
      } else if (typeof TRANS_COEF.get === 'function') {
                // 引擎认 coefficient_over_20 / coefficient_under_20
        modules.transitional_pension.coefficient_over_20 = TRANS_COEF.base;
        modules.transitional_pension.coefficient_under_20 = TRANS_COEF.alt;
      } else if (TRANS_COEF.base !== undefined) {
        modules.transitional_pension.coefficient_over_20 = TRANS_COEF.base;
        modules.transitional_pension.coefficient_under_20 = TRANS_COEF.alt;
      }
    }
  }
  if (MODULES.includes('other')) modules.special_addition = { enabled: true };

  return {
  avg_salary_history: AVG_SALARY_HISTORY,
    province: PROV_TAG,
    name: '吉林省',
    base_rates: {
      prov: PROV_BASE,
      ...(CC_BASE ? { cc: CC_BASE, '长春': CC_BASE, changchun: CC_BASE } : {}),
    },
    avg_salary_history: AVG_SALARY_HISTORY,
    modules: modules,

    account_start: ACCOUNT_START,
    cutoff_date: CUTOFF_DATE,
    usePreAccountYears: false,  // 吉林省不用建账前缴费年限
    cities: CITY_LIST || [],
    cases: cases || [],
    notes: NOTES || '',
  };
}


// SALARY_SEMANTICS_V2: avg_salary_history[Y] = Y 年度执行社平（= Y-1 统计年），2026-09-20 统一
const AVG_SALARY_HISTORY = {
  1995: 369.17,   // 首端兜底：早于数据起始年的参保年份取最早已知值（SALARY_SEMANTICS_V2）
  1996: 369.17,
  1997: 447.5,
  1998: 472,
  1999: 545.92,
  2000: 596.5,
  2001: 660.33,
  2002: 730.92,
  2003: 832.5,
  2004: 923.42,
  2005: 1035.92,
  2006: 1200.75,
  2007: 1381.92,
  2008: 1709.42,
  2009: 1957.17,
  2010: 2185.83,
  2011: 2449.92,
  2012: 2849.75,
  2013: 3200.58,
  2014: 3570.5,
  2015: 3876.33,
  2016: 4296.5,
  2017: 4674.83,
  2018: 5120.92,
  2019: 5711.08,
  2020: 6151.08,
  2021: 6004.75,
  2022: 6384.83,
  2023: 6655.33,
  2024: 7178.5,
  2025: 7322,
  2026: 7481.5,   // 2025年统计口径社平（2026年度执行）
  // 2025: 官方全口径未公布，交由引擎预发年规则外推(=2024原值)，公布后再填
};


module.exports = {
  PROV_BASE,
  CC_BASE,
  CITY_LIST,
  ACCOUNT_START,
  CUTOFF_DATE,
  TRANS_COEF,
  PROV_TAG,
  MODULES,
  MODULE_LABELS,
  MODULE_FORMULAS,
  MODULE_COLORS,
  EXTRA_PARAMS,
  cases,
  getEngineConfig,
}
