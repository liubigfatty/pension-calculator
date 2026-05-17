/**
 * 养老金计算引擎 - 浏览器版本
 * 从 pension-engine.js 改编，适配浏览器环境
 */

// ==================== 核心计算函数 ====================

/**
 * 获取指定年份的退休地/全省计发基数
 */
function getBase(city, year, config) {
  const allRates = config.base_rates || {};
  const isProvince = city === 'prov';

  if (isProvince) {
    const rates = allRates['prov'];
    if (rates && typeof rates === 'object') {
      if (rates[year] !== undefined) return rates[year];
      const keys = Object.keys(rates).map(Number).sort((a, b) => a - b);
      for (let i = keys.length - 1; i >= 0; i--) {
        if (keys[i] <= year) return rates[keys[i]];
      }
      return rates[keys[keys.length - 1]] || 0;
    }
    return 0;
  }

  // 城市基数
  const cityRates = allRates[city];
  if (cityRates && typeof cityRates === 'object') {
    if (cityRates[year] !== undefined) return cityRates[year];
    const provRates = allRates['prov'];
    if (provRates && typeof provRates === 'object') {
      if (provRates[year] !== undefined) return provRates[year];
      const keys = Object.keys(provRates).map(Number).sort((a, b) => a - b);
      for (let i = keys.length - 1; i >= 0; i--) {
        if (keys[i] <= year) return provRates[keys[i]];
      }
      return provRates[keys[keys.length - 1]] || 0;
    }
  }

  // 城市代码不存在 → 直接回退全省
  const provRates = allRates['prov'];
  if (provRates && typeof provRates === 'object') {
    if (provRates[year] !== undefined) return provRates[year];
    const keys = Object.keys(provRates).map(Number).sort((a, b) => a - b);
    for (let i = keys.length - 1; i >= 0; i--) {
      if (keys[i] <= year) return provRates[keys[i]];
    }
    return provRates[keys[keys.length - 1]] || 0;
  }

  return 0;
}

/**
 * 获取记账利率
 */
function getAccRate(year, config) {
  const table = config.interest_rates || {};
  if (table[year] !== undefined) return table[year];
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  for (let i = keys.length - 1; i >= 0; i--) {
    if (keys[i] <= year) return table[keys[i]];
  }
  return year < 2016 ? 0.025 : 0.015;
}

/**
 * 计算两个日期之间的年数差
 */
function calcYears(start, end) {
  if (!start || !end) return 0;
  const totalMonths = (end.year - start.year) * 12 + (end.month - start.month);
  if (totalMonths < 0) return 0;
  return totalMonths / 12;
}

/**
 * 计算延迟退休月数
 */
function getDelayMonths(birthYear, birthMonth, type) {
  let base, step, cap;
  if (type === 'male') { base = 60; step = 4; cap = 36; }
  else if (type === 'fc') { base = 55; step = 2; cap = 30; }
  else { base = 50; step = 2; cap = 30; }

  const diff = (birthYear - (base <= 50 ? 1972 : base <= 55 ? 1965 : 1965)) * 12 + birthMonth;
  if (diff <= 0) return 0;
  const delay = Math.floor((diff - 1) / step) + 1;
  return Math.min(delay, cap);
}

/**
 * 计算法定退休总月数
 */
function getRetireTotalMonths(birthYear, birthMonth, type, config) {
  let baseAge;
  switch (type) {
    case 'male': baseAge = 60; break;
    case 'fc': baseAge = 55; break;
    case 'fw': baseAge = 50; break;
    default: baseAge = 60;
  }
  const delay = getDelayMonths(birthYear, birthMonth, type);
  return baseAge * 12 + delay;
}

/**
 * 计算退休日期
 */
function getRetireDate(birthYear, birthMonth, totalMonths) {
  const year = birthYear + Math.floor(totalMonths / 12);
  const month = birthMonth + (totalMonths % 12);
  return { year, month: month > 12 ? month - 12 : month };
}

/**
 * 获取计发月数（插值）
 */
function getRetireMonths(age, config) {
  const table = config.monthly_payment_months || {
    40: 233, 41: 230, 42: 226, 43: 221, 44: 217, 45: 212,
    46: 206, 47: 200, 48: 194, 49: 187, 50: 170, 51: 164,
    52: 158, 53: 153, 54: 145, 55: 139, 56: 133, 57: 127,
    58: 121, 59: 114, 60: 119, 61: 110, 62: 105, 63: 100,
    64: 95, 65: 90, 66: 84, 67: 78, 68: 72, 69: 65, 70: 56
  };
  const ageFloor = Math.floor(age);
  const ageCeil = Math.ceil(age);
  if (table[ageFloor] !== undefined && table[ageCeil] !== undefined && ageFloor !== ageCeil) {
    const ratio = age - ageFloor;
    return Math.round(table[ageFloor] * (1 - ratio) + table[ageCeil] * ratio);
  }
  if (table[ageFloor] !== undefined) return table[ageFloor];
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < keys.length - 1; i++) {
    if (ageFloor >= keys[i] && ageFloor < keys[i + 1]) {
      const ratio = ageFloor - keys[i];
      return Math.round(table[keys[i]] * (1 - ratio) + table[keys[i + 1]] * ratio);
    }
  }
  return 139;
}

/**
 * 获取最低缴费年限
 */
function getMinYears(retireYear, config) {
  const minTable = config.min_years || { before2025: 15, 2025: 15, 2026: 16, 2030: 20 };
  if (retireYear < 2025) return 15;
  return minTable[retireYear] || minTable[2025] || 15;
}

// ==================== 计算模块 ====================

function calcBasicPension(params) {
  const { retireBase, provBase, avgIndex, totalYears, mod } = params;
  if (!mod || !mod.enabled) return { amount: 0, description: '已禁用' };
  const rate = mod.rate_per_year || 0.01;
  const amount = Math.round((retireBase + provBase * avgIndex) / 2 * totalYears * rate * 100) / 100;
  const desc = `(${retireBase.toLocaleString()} + ${retireBase.toLocaleString()} × ${avgIndex.toFixed(2)}) / 2 × ${totalYears.toFixed(2)}年 × ${(rate * 100).toFixed(0)}% = ${amount}元`;
  return { amount, description: desc };
}

function calcExtraPension(params) {
  const { avgBase, actualYears, mod } = params;
  if (!mod || !mod.enabled) return { amount: 0, description: '已禁用' };
  const trigger = mod.trigger || { type: 'actual_years', threshold: 20 };
  const years = actualYears - trigger.threshold;
  if (years <= 0) return { amount: 0, description: `实际缴费${actualYears.toFixed(2)}年≤阈值${trigger.threshold}年` };
  const brackets = mod.brackets || [];
  let amount = 0;
  let detail = [];
  let remaining = years;
  let prevFrom = trigger.threshold;
  brackets.forEach(b => {
    const bracketSize = b.to !== null ? b.to - b.from + 1 : 9999;
    const used = Math.min(remaining, bracketSize);
    const contribution = used * b.rate;
    const bracketAmount = Math.round(avgBase * contribution * 100) / 100;
    amount += bracketAmount;
    detail.push({ range: `${b.from}-${b.to || '以上'}`, years: used, rate: b.rate, contribution, amount: bracketAmount });
    remaining -= used;
    if (remaining <= 0) return;
    prevFrom = b.to + 1;
  });
  if (detail.length > 0 && remaining > 0) {
    const last = detail[detail.length - 1];
    if (last.range.includes('以上')) {
      last.years += remaining;
      last.contribution += remaining * last.rate;
      last.amount = Math.round(avgBase * last.contribution * 100) / 100;
      amount = detail.reduce((s, d) => s + d.amount, 0);
    }
  }
  const desc = `实际缴费${actualYears.toFixed(2)}年>阈值${trigger.threshold}年，分段系数${(detail.reduce((s, d) => s + d.contribution, 0) * 10000).toFixed(0)}万分之`;
  return { amount, description: desc, bracketDetails: detail };
}

function calcPersonalAccountPension(city, avgIndex, retireDate, config, months, personalAccInput) {
  const { accountStart, actualStart, sightYears } = config;
  let balance = 0;

  if (personalAccInput !== null && personalAccInput !== undefined && personalAccInput > 0) {
    balance = personalAccInput;
  } else {
    const startYear = actualStart.year;
    const endYear = retireDate.year;
    for (let y = startYear; y < endYear; y++) {
      const monthlyBase = (y - 1 >= 1995 ? 7000 * Math.pow(1.03, y - 2015) : 3000) * avgIndex;
      const monthlyContribution = monthlyBase * 0.08;
      const interestRate = getAccRate(y, config);
      balance += monthlyContribution * 12 * Math.pow(1 + interestRate, endYear - y);
    }
    balance = Math.round(balance * 100) / 100;
  }

  const amount = months > 0 ? Math.round(balance / months * 100) / 100 : 0;
  const desc = `${actualStart.year}.${String(actualStart.month).padStart(2, '0')}-${retireDate.year}.${String(retireDate.month).padStart(2, '0')} 按记账利率复利估算，余额 ${balance.toLocaleString()} 元 ÷ ${months} 月 = ${amount}元`;
  return { balance, amount, description: desc };
}

function calcTransitionalPension(params) {
  const { provBase, sightYears, avgIndex, actualYears, mod } = params;
  if (!mod || !mod.enabled || sightYears <= 0) return { amount: 0, description: '无可视同缴费年限' };
  const coefficient = actualYears > 20 ? mod.coefficient_over_20 : mod.coefficient_under_20;
  const amount = Math.round(provBase * sightYears * avgIndex * coefficient * 100) / 100;
  const desc = `${provBase.toLocaleString()} × ${sightYears}年 × ${avgIndex.toFixed(2)} × ${(coefficient * 100).toFixed(1)}% = ${amount}元`;
  return { amount, description: desc };
}

function calcSpecialAddition(params) {
  const { mod, context } = params;
  if (!mod || !mod.enabled) return { amount: 0, description: '已禁用' };
  let amount = 0;
  const additions = mod.additions || [];
  additions.forEach(a => {
    if (a.age && context.retireAge >= a.age) amount += a.amount;
    if (a.location && context.location === a.location) amount += a.amount;
  });
  return { amount, description: amount > 0 ? `符合条件，增发${amount}元` : '不符合条件' };
}

// ==================== 输入解析 ====================

function parseInput(inputData) {
  const data = {
    name: inputData.name || '参保人员',
    gender: inputData.gender || 'male',
    birth: { year: inputData.birthYear, month: inputData.birthMonth },
    work: { year: inputData.workYear || 0, month: inputData.workMonth || 1 },
    avgIndex: inputData.avgIndex !== undefined ? parseFloat(inputData.avgIndex) : 1.0,
    personalAccInput: inputData.personalAccInput !== undefined ? parseFloat(inputData.personalAccInput) : null,
    sightYears: inputData.sightYears !== undefined ? parseInt(inputData.sightYears) : 0,
    cityType: inputData.cityType || 'prov',
    retireType: inputData.retireType || 'standard'
  };
  data.genderType = data.gender === 'male' ? 'male' : data.retireType === 'fc' ? 'fc' : 'fw';
  return data;
}

// ==================== 主函数 ====================

function calculate(config, inputData) {
  const data = parseInput(inputData);
  const legalTotalMonths = getRetireTotalMonths(data.birth.year, data.birth.month, data.genderType, config);
  const legalDate = getRetireDate(data.birth.year, data.birth.month, legalTotalMonths);

  let originalAge;
  switch (data.genderType) {
    case 'male': originalAge = 60; break;
    case 'fc': originalAge = 55; break;
    case 'fw': originalAge = 50; break;
    default: originalAge = 60;
  }
  const flexTotalMonths = Math.max(originalAge * 12, legalTotalMonths - 36);
  const flexDate = getRetireDate(data.birth.year, data.birth.month, flexTotalMonths);

  const city = data.cityType === 'cc' ? 'cc' : 'prov';
  const hasSight = data.work.year < config.account_start?.year || (data.work.year === config.account_start?.year && data.work.month < config.account_start?.month);
  const actualStart = hasSight ? config.account_start : data.work;
  const accountStart = hasSight ? config.account_start : data.work;

  const actualYears = calcYears(actualStart, legalDate);
  const sightYears = hasSight ? calcYears(data.work, config.account_start || { year: 1995, month: 7 }) : 0;
  const totalYears = actualYears + sightYears;

  const retBase = getBase(city, legalDate.year - 1, config);
  const provBase = getBase('prov', legalDate.year - 1, config);

  const retireAgeExact = legalTotalMonths / 12;
  const months = getRetireMonths(retireAgeExact, config);

  const basicPension = calcBasicPension({ retireBase: retBase, provBase: provBase, avgIndex: data.avgIndex, totalYears, mod: config.modules?.basic_pension || { enabled: true, rate_per_year: 0.01 } });
  const extraPension = calcExtraPension({ avgBase: Math.round((retBase + provBase * data.avgIndex) / 2 * 100) / 100, actualYears, mod: config.modules?.extra_pension || { enabled: false } });
  const personalAccount = calcPersonalAccountPension(city, data.avgIndex, legalDate, { accountStart, actualStart, sightYears }, config, months, data.personalAccInput);
  const transPension = calcTransitionalPension({ provBase, sightYears, avgIndex: data.avgIndex, actualYears, mod: config.modules?.transitional_pension || { enabled: false, coefficient_over_20: 0.014, coefficient_under_20: 0.012 } });
  const specialAddition = calcSpecialAddition({ mod: config.modules?.special_addition || { enabled: false }, context: { retireAge: retireAgeExact, location: data.cityType } });

  const total = Math.round((basicPension.amount + extraPension.amount + personalAccount.amount + transPension.amount + specialAddition.amount) * 100) / 100;

  const flexMonths = getRetireMonths(originalAge, config);
  const flexBasic = calcBasicPension({ retireBase: retBase, provBase: provBase, avgIndex: data.avgIndex, totalYears, mod: config.modules?.basic_pension || { enabled: true, rate_per_year: 0.01 } });
  const flexExtra = calcExtraPension({ avgBase: Math.round((retBase + provBase * data.avgIndex) / 2 * 100) / 100, actualYears, mod: config.modules?.extra_pension || { enabled: false } });
  const flexPersonal = calcPersonalAccountPension(city, data.avgIndex, flexDate, { accountStart, actualStart, sightYears }, config, flexMonths, data.personalAccInput);
  const flexTrans = calcTransitionalPension({ provBase, sightYears, avgIndex: data.avgIndex, actualYears, mod: config.modules?.transitional_pension || { enabled: false, coefficient_over_20: 0.014, coefficient_under_20: 0.012 } });
  const flexTotal = Math.round((flexBasic.amount + flexExtra.amount + flexPersonal.amount + flexTrans.amount + specialAddition.amount) * 100) / 100;

  const canFlex = flexTotalMonths < legalTotalMonths;
  const flexAdvance = legalTotalMonths - flexTotalMonths;

  return {
    legal: {
      date: legalDate, age: retireAgeExact, ageStr: `${Math.floor(retireAgeExact)}岁${Math.round((retireAgeExact % 1) * 12)}个月`,
      months, basicPension, extraPension, personalAccount, transitionalPension: transPension, specialAddition,
      total, totalYears, actualYears, sightYears,
      minYears: getMinYears(legalDate.year, config),
      meet: totalYears >= getMinYears(legalDate.year, config),
      rate: total / provBase * 100, baseRetire: retBase, baseProv: provBase
    },
    flex: {
      date: flexDate, age: originalAge, ageStr: `${originalAge}岁`,
      months: flexMonths, basicPension: flexBasic, extraPension: flexExtra, personalAccount: flexPersonal,
      transitionalPension: flexTrans, specialAddition, total: flexTotal,
      totalYears, actualYears, sightYears, baseRetire: retBase, baseProv: provBase
    },
    comparison: {
      legalDate, flexDate, legalTotalMonths, flexTotalMonths, canFlex,
      flexAdvance: canFlex ? flexAdvance : 0,
      amountDiff: Math.round((flexTotal - total) * 100) / 100,
      diffPercent: Math.round((flexTotal / total - 1) * 10000) / 100
    },
    metaData: { name: data.name, city: data.cityType, avgIndex: data.avgIndex, totalYears, actualYears, sightYears, months, flexMonths }
  };
}

/**
 * 对外暴露：退休年龄查询（不依赖省份配置）
 */
function getDelayResult(birthYear, birthMonth, type) {
  // type: 'male' | 'fc' (女干部) | 'fw' (女工人)
  let baseAge;
  switch (type) {
    case 'male': baseAge = 60; break;
    case 'fc': baseAge = 55; break;
    default: baseAge = 50;
  }
  const delay = getDelayMonths(birthYear, birthMonth, type);
  const totalMonths = baseAge * 12 + delay;
  const retireYear = birthYear + Math.floor(totalMonths / 12);
  const retireMonth = birthMonth + (totalMonths % 12);
  const retireDateStr = retireMonth > 12 
    ? `${retireYear + 1}年${retireMonth - 12}月` 
    : `${retireYear}年${retireMonth}月`;
  const newAgeStr = `${Math.floor(totalMonths / 12)}岁${(totalMonths % 12) > 0 ? (totalMonths % 12) + '个月' : ''}`;
  
  return {
    originalAge: baseAge,
    originalAgeStr: `${baseAge}岁`,
    delayMonths: delay,
    newAgeStr,
    retireDate: retireDateStr
  };
}

// ==================== 导出 ====================
window.pensionEngine = { calculate, getDelayMonths, getDelayResult };
