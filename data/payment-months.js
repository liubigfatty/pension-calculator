// 养老金计发月数表 + 延迟退休规则
// 数据来源：原养老金速算计算器（与原计算器完全一致）
// 改为全局变量，供浏览器直接引用

// 精确计发月数表（按半年细分，来源：吉林省养老金计算规则§4.4.1）
// 格式：年龄(含半年) : 计发月数
window.MONTHS_TABLE_HALF = {
  50.0: 195.0, 50.5: 192.5, 51.0: 190.0, 51.5: 187.5,
  52.0: 185.0, 52.5: 182.5, 53.0: 180.0, 53.5: 177.5,
  54.0: 175.0, 54.5: 172.5, 55.0: 170.0, 55.5: 167.5,
  56.0: 164.0, 56.5: 161.5, 57.0: 158.0, 57.5: 155.5,
  58.0: 152.0, 58.5: 149.5, 59.0: 145.0, 59.5: 142.5,
  60.0: 139.0, 60.5: 136.1, 61.0: 132.0, 61.5: 128.6,
  62.0: 125.0, 62.5: 121.4, 63.0: 117.0, 63.5: 113.4
};

// 计发月数查询：精确到月（按半年节点线性插值）
// ageExact: 实际退休年龄（含小数，如 61.0 或 60.5）
window.getMonths = function(ageExact) {
  const age = Math.round(ageExact * 2) / 2;
  if (window.MONTHS_TABLE_HALF[age] !== undefined) return window.MONTHS_TABLE_HALF[age];
  const lo = Math.floor(age * 2) / 2;
  const hi = lo + 0.5;
  if (window.MONTHS_TABLE_HALF[lo] !== undefined && window.MONTHS_TABLE_HALF[hi] !== undefined) {
    const frac = (ageExact - lo) / 0.5;
    return Math.round((window.MONTHS_TABLE_HALF[lo] + (window.MONTHS_TABLE_HALF[hi] - window.MONTHS_TABLE_HALF[lo]) * frac) * 10) / 10;
  }
  return 139; // 默认
};

// 最低缴费年限表（人社部发〔2024〕94号）
window.MIN_YEARS = {
  2025: 15, 2026: 15, 2027: 15, 2028: 15, 2029: 15,
  2030: 15.5, 2031: 16, 2032: 16.5, 2033: 17, 2034: 17.5,
  2035: 18, 2036: 18.5, 2037: 19, 2038: 19.5,
  2039: 20, 2040: 20, 2041: 20, 2042: 20, 2043: 20, 2044: 20, 2045: 20
};

// 获取最低缴费年限
window.getMinYears = function(retireYear) {
  if (window.MIN_YEARS[retireYear] !== undefined) return window.MIN_YEARS[retireYear];
  if (retireYear < 2025) return 15;
  if (retireYear > 2045) return 20;
  return 20;
};

// 延迟退休月数计算（与原计算器 getDelayMonths() 完全一致）
// 人社部发〔2024〕94号
// year: 出生年份, month: 出生月份, type: 'male'|'fc'|'fw'
window.getDelayMonths = function(year, month, type) {
  let baseYear, step, cap;
  if (type === 'male') { baseYear = 1965; step = 4; cap = 36; }
  else if (type === 'fc') { baseYear = 1970; step = 4; cap = 36; }
  else { baseYear = 1975; step = 2; cap = 60; }
  
  if (year < baseYear) return 0;
  const diff = (year - baseYear) * 12 + (month - 1);
  if (diff < 1) return 0;
  const delay = Math.floor((diff - 1) / step) + 1;
  return Math.min(delay, cap);
};

// 计算退休时总月数（用于后续算退休年龄）
// 返回：从出生到退休的总月数
window.getRetireTotalMonths = function(birthYear, birthMonth, type) {
  const baseAge = type === 'male' ? 60 : (type === 'fc' ? 55 : 50);
  const delay = window.getDelayMonths(birthYear, birthMonth, type);
  return baseAge * 12 + delay;
};

// 计算原法定退休年龄（弹性提前退休的基准）
window.getOriginalRetireAge = function(type) {
  return type === 'male' ? 60 : (type === 'fc' ? 55 : 50);
};

// 从总月数计算退休日期
window.getRetireDate = function(birthYear, birthMonth, totalMonths) {
  let y = birthYear + Math.floor(totalMonths / 12);
  let m = birthMonth + (totalMonths % 12);
  if (m > 12) { y++; m -= 12; }
  return { year: y, month: m };
};

// 从总月数计算年龄字符串
window.getAgeStr = function(totalMonths) {
  const years = Math.floor(totalMonths / 12);
  const remain = totalMonths % 12;
  return years + '岁' + (remain > 0 ? remain + '个月' : '');
};

// 人员类型枚举（与原计算器一致：male/fc/fw）
window.GenderType = {
  MALE: 'male',
  FEMALE_CADRE: 'fc',   // 女性干部
  FEMALE_WORKER: 'fw'     // 女性工人
};
