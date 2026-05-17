// 历年计发基数（养老金计算用，单位：元/月）
// 数据来源：原养老金速算计算器（吉人社联〔2025〕97号，官方数据）
// 改为全局变量，供浏览器直接引用
// 
// 说明：
// - 1995-2019年：全省统一（长春=全省）
// - 2020-2025年：分长春/全省两档
// - 2026年及以后：用增长率预估（长春2.6%，全省4.38%，2031年起统一）

window.salaryHistoryData = {
  // 1995-2019：全省统一（province = changchun）
  1995: { province: 369.17, changchun: 369.17 },
  1996: { province: 447.50, changchun: 447.50 },
  1997: { province: 472.00, changchun: 472.00 },
  1998: { province: 545.92, changchun: 545.92 },
  1999: { province: 596.50, changchun: 596.50 },
  2000: { province: 660.33, changchun: 660.33 },
  2001: { province: 730.92, changchun: 730.92 },
  2002: { province: 832.50, changchun: 832.50 },
  2003: { province: 923.42, changchun: 923.42 },
  2004: { province: 1035.92, changchun: 1035.92 },
  2005: { province: 1200.75, changchun: 1200.75 },
  2006: { province: 1381.92, changchun: 1381.92 },
  2007: { province: 1709.42, changchun: 1709.42 },
  2008: { province: 1957.17, changchun: 1957.17 },
  2009: { province: 2185.83, changchun: 2185.83 },
  2010: { province: 2449.92, changchun: 2449.92 },
  2011: { province: 2849.75, changchun: 2849.75 },
  2012: { province: 3200.58, changchun: 3200.58 },
  2013: { province: 3570.50, changchun: 3570.50 },
  2014: { province: 3876.33, changchun: 3876.33 },
  2015: { province: 4296.50, changchun: 4296.50 },
  2016: { province: 4674.83, changchun: 4674.83 },
  2017: { province: 5120.92, changchun: 5120.92 },
  2018: { province: 5711.08, changchun: 5711.08 },
  2019: { province: 6151.08, changchun: 6151.08 },
  // 2020起：长春/全省分开
  2020: { province: 5088.42, changchun: 6605.23 },
  2021: { province: 6004.75, changchun: 6605.23 },
  2022: { province: 6384.83, changchun: 7023.31 },
  2023: { province: 6655.33, changchun: 7320.86 },
  2024: { province: 7178.50, changchun: 7852.58 },
  2025: { province: 7322.08, changchun: 7978.25 }
};

// 未来年份预估参数（原计算器同款）
window.BASE_CC_2025 = 7978.25;
window.BASE_PROV_2025 = 7322.08;
window.CC_GROWTH = 0.026;     // 长春增长率
window.PROV_GROWTH = 0.0438;  // 全省增长率
window.MERGE_YEAR = 2031;      // 2031年起长春/全省统一

// 获取某年计发基数（退休上一年度）
// city: 'province' | 'changchun'
// year: 退休年份（函数内部自动取上一年）
window.getSalary = function(retireYear, city) {
  const y = retireYear - 1;
  
  // 2025及以前：查表
  if (y <= 2025) {
    const d = window.salaryHistoryData[y];
    if (!d) return 0;
    if (y <= 2019) return d.province;
    // 支持 'changchun' 和 'cc' 两种城市代码
    const isCC = (city === 'changchun' || city === 'cc');
    return isCC ? d.changchun : d.province;
  }
  
  // 2026-2030：按增长率预估
  if (y < window.MERGE_YEAR) {
    const isCC = (city === 'changchun' || city === 'cc');
    if (isCC) {
      return Math.round(window.BASE_CC_2025 * Math.pow(1 + window.CC_GROWTH, y - 2025) * 100) / 100;
    }
    return Math.round(window.BASE_PROV_2025 * Math.pow(1 + window.PROV_GROWTH, y - 2025) * 100) / 100;
  }
  
  // 2031及以后：统一基数
  const mergeBase = Math.round(window.BASE_CC_2025 * Math.pow(1 + window.CC_GROWTH, window.MERGE_YEAR - 2025) * 100) / 100;
  return Math.round(mergeBase * Math.pow(1 + window.CC_GROWTH, y - window.MERGE_YEAR) * 100) / 100;
};
