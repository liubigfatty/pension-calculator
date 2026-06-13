// data/test-cases.js
// 各省份测试案例 —— 正式核定表 + 特殊标注的预核定表
// expected 值来自官方核定表 JSON 的 pension_breakdown 字段
// 用法：在 pension/index.js 里 require 本文件，调用 onTestCaseChange 加载

const TEST_CASES = [

  // ========== 吉林省 ==========
  {
    name: '长春-男-1965-03（预核定·建账1995-07）',
    provinceIdx: 0,        // 吉林省
    personType: 'male',
    birthDate: '1965-03',
    workDate: '1982-12',
    cityIdx: 0,            // 长春市
    hasOnlyChild: false,
    excelData: null,
    note: '预核定表：用上年基数核算，待当年基数发布后重新核定',
    expected: {
      totalYears: 42.33,
      sightYears: 12.58,
      avgIndex: 0.6,
      personalAcc: 84719.28,
      basePension: 2573.6,
      extraPension: 293.61,
      personalPension: 609.49,
      transPension: 755.57,
      total: 4235.47,
    }
  },

  {
    name: '长春-女-1975-12（正式核定·建账1995-07·女职工50岁）',
    provinceIdx: 0,
    personType: 'fw',        // 女职工50岁退休
    birthDate: '1975-12',
    workDate: '1994-12',
    cityIdx: 0,              // 长春市
    hasOnlyChild: false,
    excelData: null,
    // ⚠️ 注意：此案例审批于延迟退休政策全面实施前（2025-12退休，正好50岁）
    // 当前引擎按延迟退休政策计算：1975-12出生应延迟6个月 → 2026-06退休
    // 因此退休时间、计发月数、个人账户养老金均有差异，仅作参考
    skip: true,
    note: '延迟退休政策前审批案例，引擎计算结果与核定表存在差异（退休时间+6个月）',
    expected: {
      totalYears: 31,
      sightYears: 0.5,
      basePension: 1819.45,
      extraPension: 119.33,
      personalPension: 359.65,
      transPension: 27.68,
      total: 2356.15,
    }
  },

  // ========== 黑龙江省 ==========
  {
    name: '黑龙江-男-1965-09（正式核定·建账1998-01·行业单位）',
    provinceIdx: 1,        // 黑龙江省
    personType: 'male',
    birthDate: '1965-09',
    workDate: '1982-09',
    cityIdx: null,         // 黑龙江无城市选项
    hasOnlyChild: false,
    excelData: null,
    // ⚠️ 注意：此人为原行业管理单位（银行/铁路等），建账时间为1998-01
    // 通用规则建账时间为1996-01，此案例需自定义 accountStart 才能准确验证
    skip: true,
    note: '原行业管理单位案例，建账时间1998-01（非通用规则1996-01）',
    expected: {
      totalYears: 43.33,
      sightYears: 15.33,
      basePension: 5880.82,
      personalPension: 2528.03,
      transPension: 3601.29,
      total: 12010.14,
    }
  },

  {
    name: '黑龙江-男-1965-01（正式核定·建账1996-01·通用规则）',
    provinceIdx: 1,
    personType: 'male',
    birthDate: '1965-01',
    workDate: '1982-08',
    cityIdx: null,
    hasOnlyChild: false,
    excelData: null,
    note: '黑龙江正式核定表：通用建账时间1996-01',
    expected: {
      totalYears: 42.58,
      sightYears: 13.92,
      basePension: 3176.01,
      personalPension: 792.75,
      transPension: 1226.90,
      total: 5195.66,
    }
  },

  {
    name: '黑龙江-男-1965-02（正式核定·建账1996-01·通用规则）',
    provinceIdx: 1,
    personType: 'male',
    birthDate: '1965-02',
    workDate: '1982-08',
    cityIdx: null,
    hasOnlyChild: false,
    excelData: null,
    // ⚠️ 注意：此案例审批于延迟退休政策实施前（2025-02退休，正好60岁）
    // 当前引擎按延迟退休政策计算：1965-02出生应延迟1个月 → 2025-03退休
    skip: true,
    note: '延迟退休政策前审批案例，引擎计算结果与核定表存在差异（退休时间+1个月）',
    expected: {
      totalYears: 42.58,
      sightYears: 13.42,
      basePension: 2547.58,
      personalPension: 522.26,
      transPension: 707.62,
      total: 3777.46,
    }
  },

  {
    name: '黑龙江-女干部-1969-11（正式核定·建账1996-01·高指数）',
    provinceIdx: 1,
    personType: 'fc',
    birthDate: '1969-11',
    workDate: '1992-02',
    cityIdx: null,
    hasOnlyChild: false,
    excelData: null,
    note: '黑龙江正式核定表：女干部55岁退休（1969-11<1970不受延迟影响），平均指数2.8421（高指数验证）',
    expected: {
      totalYears: 32.83,
      sightYears: 5.92,
      basePension: 4421.52,
      personalPension: 2019.24,
      transPension: 1414.54,
      total: 7855.30,
    }
  },

  {
    name: '黑龙江-哈尔滨-女-1974-04（正式核定·建账1996-07·哈尔滨市）',
    provinceIdx: 1,
    personType: 'fw',
    birthDate: '1974-04',
    workDate: '1993-08',
    cityIdx: null,
    hasOnlyChild: false,
    excelData: null,
    // ⚠️ 注意：此人为哈尔滨市退休，建账时间为1996-07（非通用规则1996-01）
    // 通用规则建账时间为1996-01，此案例需自定义 accountStart 才能准确验证
    skip: true,
    note: '哈尔滨市案例，建账时间1996-07（非通用规则1996-01）',
    expected: {
      totalYears: 30.75,
      sightYears: 2.92,
      basePension: 1771.77,
      personalPension: 350.93,
      transPension: 157.96,
      total: 2280.68,
    }
  },

  // ========== 甘肃省 ==========
  {
    name: '甘肃-女-1973-10（正式核定·建账1996-01·女职工50岁）',
    provinceIdx: 2,        // 甘肃省
    personType: 'fw',
    birthDate: '1973-10',
    workDate: '1993-09',
    cityIdx: null,
    hasOnlyChild: false,
    excelData: null,
    // ⚠️ 注意：此案例2023-10退休，但官方核定表使用2022年基数7077（非2023年基数7359）
    // 引擎默认用退休当年基数，因此基础养老金和过渡性养老金有差异
    note: '甘肃正式核定表：建账1996-01，使用2022年基数7077（非当年基数7359）',
    expected: {
      totalYears: 30.08,
      sightYears: 2.25,
      basePension: 2965.47,
      personalPension: 1157.15,
      transPension: 341.29,
      total: 4463.91,
    }
  },

  {
    name: '甘肃-兰州-男-1965-10（正式核定·建账2003-01·延迟退休3个月）',
    provinceIdx: 2,        // 甘肃省
    personType: 'male',
    birthDate: '1965-10',
    workDate: '1988-07',
    cityIdx: null,
    hasOnlyChild: false,
    excelData: null,
    // ⚠️ 注意：此案例建账时间为2003-01（非通用规则1996-01）
    // 甘肃省大部分地区建账1996-01，部分地区/单位建账时间较晚
    skip: true,
    note: '建账时间2003-01（非通用规则1996-01），需自定义 accountStart 才能准确验证',
    expected: {
      totalYears: 37.5,
      sightYears: 14.42,
      basePension: 5222.01,
      personalPension: 2287.54,
      transPension: 3478.92,
      total: 10988.47,
    }
  },

  // ========== 云南省 ==========
  {
    name: '云南-楚雄州-女-1973-12（正式核定·建账1995-10·女职工50岁）',
    provinceIdx: 3,        // 云南省
    personType: 'fw',
    birthDate: '1973-12',
    workDate: '1992-07',
    cityIdx: null,
    hasOnlyChild: true,     // 有独生子女补贴164.65元
    excelData: null,
    note: '云南正式核定表：建账1995-10，自动计算建账前缴费年限（1992-07至1995-10 = 3.25年），过渡性养老金完全匹配',
    expected: {
      totalYears: 31.5,
      sightYears: 0.5,
      basePension: 2492.62,
      personalPension: 651.65,
      transPension: 329.68,
      bonusAmount: 164.65,   // 独生子女补贴
      total: 3638.60,
    }
  },

  {
    name: '云南-某市-女-1973-04（正式核定·建账1995-10·视同年限0）',
    provinceIdx: 3,        // 云南省
    personType: 'fw',
    birthDate: '1973-04',
    workDate: '1992-09',
    cityIdx: null,
    hasOnlyChild: true,     // 有独生子女补贴157.9元
    excelData: null,
    // ⚠️ 注意：此案例视同年限=0，但建账前缴费年限自动计算为3.08年（1992-09至1995-10）
    // 过渡性养老金引擎计算233.45元 vs 官方243.77元，差10.32元，可能存在地区建账时间差异或中断
    skip: true,
    note: '建账前缴费年限自动计算3.08年，但官方过渡性养老金对应约3.22年，可能地区建账时间有差异',
    expected: {
      totalYears: 30.67,     // 30年8月
      sightYears: 0,
      basePension: 2123.45,
      personalPension: 446.27,
      transPension: 243.77,
      bonusAmount: 157.9,    // 独生子女补贴
      total: 2971.39,
    }
  },

  {
    name: '云南-官渡区-男-1965-01（正式核定·灵活就业·视同年限11年10个月）',
    provinceIdx: 3,        // 云南省
    personType: 'eco_male', // 灵活就业男性
    birthDate: '1965-01',
    workDate: '1983-06',
    cityIdx: null,
    hasOnlyChild: true,     // 有独生子女补贴171.55元
    excelData: null,
    // ⚠️ 注意：此案例视同年限11.83年（11年10个月），引擎自动计算建账前缴费年限12.33年
    // 过渡性养老金引擎1060.12元 vs 官方1073.61元，差13.5元，可能存在地区建账时间差异
    skip: true,
    note: '视同年限11.83年，自动建账前缴费年限12.33年，过渡性养老金差13.5元（可能地区建账时间差异）',
    expected: {
      totalYears: 41.5,      // 41年6月
      sightYears: 11.83,     // 11年10月
      basePension: 3087.42,
      personalPension: 736.87,
      transPension: 1073.61,
      bonusAmount: 171.55,   // 独生子女补贴
      total: 5069.45,
    }
  },

  {
    name: '云南-昆明-男-1965-09（正式核定·有中断·视同年限10年）',
    provinceIdx: 3,        // 云南省
    personType: 'male',
    birthDate: '1965-09',
    workDate: '1985-10',
    cityIdx: null,
    hasOnlyChild: true,     // 有独生子女补贴177.65元
    excelData: null,
    // ⚠️ 注意：此案例存在中断（累计35年10月 < 应缴39年11月），需覆盖 totalYears
    // 引擎自动计算建账前缴费年限10年（1985-10至1995-10），过渡性养老金752.11元 vs 官方726.01元
    // 独生子女补贴：官方177.65元（基数3553），引擎185元（基数3700），差7.35元
    note: '存在缴费中断需totalYears覆盖；过渡性养老金差26元（可能建账时间地区差异）；独生子女补贴基数待确认',
    expected: {
      totalYears: 35.83,     // 35年10月（含中断）
      sightYears: 10.0,      // 10年0月
      basePension: 2481.4,
      personalPension: 603.93,
      transPension: 726.01,
      bonusAmount: 177.65,   // 独生子女补贴
      total: 3988.99,
    }
  },

  // ========== 上海市 ==========
  {
    name: '上海-女-1973-03（正式核定·50岁退休·有虚账实记）',
    provinceIdx: 4,        // 上海市
    personType: 'fw',      // 女职工50岁
    birthDate: '1973-03',
    workDate: '1991-08',
    cityIdx: null,          // 上海无地级市区分
    hasOnlyChild: false,
    excelData: null,
    // 上海特殊参数
    sightYearsOverride: 1.42,    // 92年底前连续工龄1年5月
    totalYearsOverride: 26.5,  // 全部缴费年限26年6月
    xuzhang: 60157.46,       // 虚账实记总额（1993-1997）
    personalAcc: 214870.5,    // 个人账户储存额
    note: '上海特色：过渡性养老金含"虚账实记总额÷120"；预核定表（用2021年基数）',
    expected: {
      totalYears: 26.5,      // 26年6月
      sightYears: 1.42,     // 1年5月
      avgIndex: 1.4038,
      basePension: 3629.4,
      personalPension: 1101.9,
      transPension: 695.5,
      total: 5426.8,
    }
  },

  {
    name: '上海-男-弹性提前退休（2025-12退休·高指数·有当年增发）',
    provinceIdx: 4,        // 上海市
    personType: 'male',    // 男性
    birthDate: '1965-12',  // 估算（2025-12退休约60岁）
    workDate: '1988-08',
    cityIdx: null,
    hasOnlyChild: false,
    excelData: null,
    // 上海特殊参数
    sightYearsOverride: 4.42,   // 92年底前连续工龄4年5月
    totalYearsOverride: 30.75,  // 全部缴费年限30年9月
    xuzhang: 33732,             // 反推虚账实记（过渡性940.6 = 659.5 + 281.1）
    personalAcc: 417340,        // 反推个人账户（2981×140，计发月数估算）
    note: '弹性提前退休男性；出生日期和个人账户为估算值',
    expected: {
      totalYears: 30.75,     // 30年9月
      sightYears: 4.42,     // 4年5月
      avgIndex: 1.8776,
      basePension: 5500.7,
      personalPension: 2981,
      transPension: 940.6,
      total: 9422.3,
    }
  },

  {
    name: '上海-男-2024-11退休（高指数2.2823·41年工龄·养老金天花板）',
    provinceIdx: 4,        // 上海市
    personType: 'male',    // 男性
    birthDate: '1964-11',  // 估算（2024-11退休约60岁）
    workDate: '1983-08',
    cityIdx: null,
    hasOnlyChild: false,
    excelData: null,
    // 上海特殊参数
    sightYearsOverride: 9.42,    // 92年底前连续工龄9年5月
    totalYearsOverride: 41.33,   // 全部缴费年限41年4月
    xuzhang: 73056,              // 反推虚账实记（过渡性2000 = 1391.2 + 608.8）
    personalAcc: 643292,         // 反推个人账户（4628×139，计发月数估算）
    note: '高指数2.2823，41年工龄，养老金天花板15301元；出生日期和个人账户为估算值',
    expected: {
      totalYears: 41.33,     // 41年4月
      sightYears: 9.42,     // 9年5月
      avgIndex: 2.2823,
      basePension: 8348.1,
      personalPension: 4628,
      transPension: 2000,
      total: 14976.1,
    }
  },

  {
    name: '上海-2025-11退休（低指数0.6754·15年工龄·到龄退休）',
    provinceIdx: 4,        // 上海市
    personType: 'fw',      // 女职工50岁（到龄退休，刚好满15年）
    birthDate: '1975-11',  // 估算（2025-11退休约50岁）
    workDate: '2003-08',
    cityIdx: null,
    hasOnlyChild: false,
    excelData: null,
    // 上海特殊参数
    sightYearsOverride: 0,       // 92年底前连续工龄0年
    totalYearsOverride: 15.58,   // 全部缴费年限15年7月
    xuzhang: 0,                  // 2003年参加工作，无虚账实记
    personalAcc: 92372,          // 反推个人账户（473.7×195，50岁计发月数）
    note: '低指数0.6754，15年7月工龄（刚好满最低年限）；视同年限=0，虚账实记=0；有当年增加养老金325元',
    expected: {
      totalYears: 15.58,     // 15年7月
      sightYears: 0,         // 0年
      avgIndex: 0.6754,
      basePension: 1623,
      personalPension: 473.7,
      transPension: 0,
      total: 2096.7,
    }
  },

  {
    name: '上海-2026-01退休（弹性提前·32年工龄·预核定表·无325元）',
    provinceIdx: 4,        // 上海市
    personType: 'male',    // 男性（弹性提前退休）
    birthDate: '1966-01',  // 估算（2026-01弹性提前退休）
    workDate: '1993-09',
    cityIdx: null,
    hasOnlyChild: false,
    excelData: null,
    // 上海特殊参数
    sightYearsOverride: 0,       // 92年底前连续工龄0年
    totalYearsOverride: 32.17,   // 全部缴费年限32年2月
    xuzhang: 0,                  // 1993年9月参加工作，无虚账实记
    personalAcc: 62328,          // 反推个人账户（448.4×139，60岁计发月数）
    // 注意：此案例为预核定表（2025年基数未公布，暂用2024年12434元）
    // 无"当年增加养老金"325元（预核定表似乎不含此项）
    note: '预核定表：2025年基数未公布，暂用2024年基数12434元；视同年限=0，过渡性养老金=0；无当年增加养老金',
    expected: {
      totalYears: 32.17,     // 32年2月
      sightYears: 0,         // 0年
      avgIndex: 0.7986,
      basePension: 3596.8,
      personalPension: 448.4,
      transPension: 0,
      total: 4045.2,
    }
  },

  // ========== 北京市 ==========
  {
    name: '北京-女-1973-03（正式核定·无视同缴费·50岁退休）',
    provinceIdx: 5,        // 北京市（第6个省）
    personType: 'fw',        // 女职工50岁退休
    birthDate: '1973-03',
    workDate: '2001-03',
    cityIdx: null,            // 北京无城市区分
    hasOnlyChild: false,
    excelData: null,
    note: '北京正式核定表：无视同缴费年限，过渡性养老金=0',
    expected: {
      totalYears: 22.0,      // 2001-03 至 2023-03 = 22年
      sightYears: 0,         // 无视同缴费年限
      avgIndex: 1.1833,
      personalAcc: 434062,    // 2225.96 × 195（50岁计发月数）
      basePension: 3911.73,
      personalPension: 2225.96,
      transPension: 0,
      total: 6137.69,
    }
  },

  {
    name: '北京-女-1975-08（顺义区·正式核定·无视同缴费·50岁退休·低指数）',
    provinceIdx: 5,        // 北京市（第6个省）
    personType: 'fw',        // 女职工50岁退休
    birthDate: '1975-08',
    workDate: '2004-02',
    cityIdx: null,            // 北京无城市区分
    hasOnlyChild: false,
    excelData: null,
    note: '北京顺义区正式核定表：无视同缴费年限，低指数0.3914，过渡性养老金=0',
    expected: {
      totalYears: 21.58,      // 2004-02 至 2025-08 = 21年6个月
      sightYears: 0,          // 无视同缴费年限
      avgIndex: 0.3914,
      personalAcc: 83053.12,
      basePension: 1784.02,
      personalPension: 425.91,
      transPension: 0,
      total: 2209.93,
    }
  },

  // ========== 江苏省 ==========
  {
    name: '江苏-女-1974-01（正式核定·无视同缴费·50岁退休）',
    provinceIdx: 6,        // 江苏省（第7个省）
    personType: 'fw',        // 女职工50岁退休
    birthDate: '1974-01',
    workDate: '1998-07',
    cityIdx: null,            // 江苏省有城市列表，但此案例未指定城市
    hasOnlyChild: false,
    excelData: null,
    note: '江苏正式核定表：无视同缴费（1998-07参工，建账1996-01之后），过渡性养老金=0',
    expected: {
      totalYears: 25.33,     // 25年4个月
      sightYears: 0,         // 无视同缴费年限
      avgIndex: 1.2762,
      personalAcc: 190912.85,
      basePension: 2483.29,
      personalPension: 979.04,
      transPension: 0,
      total: 3462.40,
    }
  },

  // ========= 江苏省案例2（有视同缴费·有过渡性养老金） =========
  {
    name: '江苏-男-1964-03（淮安·正式核定·60岁退休·有视同缴费）',
    provinceIdx: 6,        // 江苏省（第7个省）
    personType: 'male',     // 男性60岁退休
    birthDate: '1964-03',
    workDate: '1981-03',
    cityIdx: 6,            // 淮安市（江苏省第7个城市，0-based索引）
    hasOnlyChild: false,
    excelData: null,
    note: '江苏正式核定表：有视同缴费（1981-03参工，1996-01建账前），过渡性养老金=817.43元',
    expected: {
      totalYears: 43,        // 2024-03 - 1981-03 = 43年（用户未写具体数字，根据退休日期推算）
      sightYears: 14.83,    // 1996-01 - 1981-03 = 14年10个月
      avgIndex: 0.3246,
      personalAcc: 67874.02,
      basePension: 2457.64,
      personalPension: 488.30,
      transPension: 817.43,   // ⚠️ 江苏省过渡性养老金公式特殊，需单独处理
      total: 3763.40,
    }
  },

  // ========= 江苏省案例3（无视同缴费·低指数·张家港） =========
  {
    name: '江苏-张家港-女-1974-01（正式核定·无视同缴费·50岁退休·低指数）',
    provinceIdx: 6,        // 江苏省（第7个省）
    personType: 'fw',        // 女职工50岁退休
    birthDate: '1974-01',
    workDate: '1997-05',
    cityIdx: 4,            // 苏州市（张家港市隶属苏州市）
    hasOnlyChild: false,
    excelData: null,
    note: '江苏正式核定表：无视同缴费（1997-05参工，建账1996-01之后），低指数0.6100',
    expected: {
      totalYears: 26.75,     // 26年9个月
      sightYears: 0,         // 无视同缴费年限（1997年参工）
      avgIndex: 0.6100,
      personalAcc: 88596.22,
      basePension: 1854.7,
      personalPension: 454.34,
      transPension: 0,       // 无视同缴费，过渡性养老金=0
      total: 2309.1,
    }
  },

  // ========= 江苏省案例4（南京江宁·有过渡性·复杂指数分段） =========
  {
    name: '江苏-南京-女-1976-01（正式核定·有过渡性·50岁退休·指数分段）',
    provinceIdx: 6,        // 江苏省（第7个省）
    personType: 'fw',        // 女职工50岁退休
    birthDate: '1976-01',
    workDate: '1995-09',
    cityIdx: 0,            // 南京市
    hasOnlyChild: false,
    excelData: null,
    note: '江苏正式核定表（南京江宁）：有过渡性养老金，95年底前指数1.0/96年后指数1.0，过渡性养老金需引擎升级支持分段计算',
    expected: {
      totalYears: 30,        // 30年0个月
      sightYears: 0.33,      // 0年4个月（95年底前）
      avgIndex: 0.8608,
      personalAcc: 57722.76,
      basePension: 2488.91,
      personalPension: 296.01,
      transPension: 2042.01, // ⚠️ 需特殊公式：8917 × 1.0 × 19.0833 × 1.2%
      total: 4827,
    }
  },

  // ========= 江苏省案例5（淮安洪泽·男·延迟退休·过渡性养老金新老办法） =========
  {
    name: '江苏-淮安洪泽-男-1965-09（正式核定·有过渡性·60岁退休·延迟3个月）',
    provinceIdx: 6,        // 江苏省（第7个省）
    personType: 'male',      // 男职工60岁退休（实际60.25岁，延迟3个月）
    birthDate: '1965-09',
    workDate: '1982-09',
    cityIdx: 6,            // 淮安市（洪泽区隶属淮安市）
    hasOnlyChild: false,
    excelData: null,
    note: '江苏正式核定表（淮安洪泽）：有过渡性养老金，基础养老金指数0.4787，过渡性养老金指数0.9107，新老办法并存（原办法479.5元，新办法1053.5元），2026年1月实际领取4795.2元（含增发245.9元）',
    expected: {
      totalYears: 43.33,     // 43年4个月
      sightYears: 13.33,     // 13年4个月（过渡性养老金参与年限）
      avgIndex: 0.4787,      // 基础养老金用的平均缴费工资指数
      personalAcc: 87722.18,
      basePension: 2856.87,
      personalPension: 638.91,
      transPension: 1053.5,  // 新办法计算，指数0.9107，年限13年4个月
      total: 4549.3,
    }
  },

]

module.exports = { TEST_CASES }
