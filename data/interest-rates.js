// 养老保险个人账户记账利率
// 数据来源：原养老金速算计算器（人社部公布 + 吉林省特殊年份）
// 改为全局变量，供浏览器直接引用

// 2016年及以后的官方记账利率
window.ACC_RATES = {
  2016: 0.0831, 2017: 0.0712, 2018: 0.0829, 2019: 0.0761,
  2020: 0.0604, 2021: 0.0669, 2022: 0.0397, 2023: 0.0397,
  2024: 0.0262, 2025: 0.015
};

// 吉林省特殊年份记账利率（2016年前，官方公布）
window.ACC_RATES_JL = {
  2005: 0.0226, 2008: 0.0393, 2009: 0.0225,
  2010: 0.0230, 2013: 0.0325
};

// 默认值
window.RATE_DEFAULT_PRE_2016 = 0.025; // 2016年前默认2.5%
window.RATE_DEFAULT = 0.015;          // 2026年及以后默认1.5%

// 个人账户建账时间（吉林省）
window.ACC_START = { year: 1995, month: 7 };

// 获取某年的记账利率（与原计算器 getAccRate() 逻辑一致）
window.getInterestRate = function(year) {
  // 2016年及以后：官方利率
  if (window.ACC_RATES[year] !== undefined) return window.ACC_RATES[year];
  // 2016年前：吉林省特殊年份有数据则用，否则用默认2.5%
  if (year < 2016) {
    return window.ACC_RATES_JL[year] !== undefined 
      ? window.ACC_RATES_JL[year] 
      : window.RATE_DEFAULT_PRE_2016;
  }
  // 2026年及以后：默认1.5%
  return window.RATE_DEFAULT;
};
