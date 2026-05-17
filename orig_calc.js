var MONTHS_TABLE_INT = {
  50: 195, 51: 190, 52: 185, 53: 180, 54: 175, 55: 170,
  56: 164, 57: 158, 58: 152, 59: 145, 60: 139, 61: 132,
  62: 125, 63: 117, 64: 109, 65: 101, 66: 92
};

// 精确计发月数表（按半年细分，来源：吉林省养老金计算规则§4.4.1）
var MONTHS_TABLE_HALF = {
  50.0: 195.0, 50.5: 192.5, 51.0: 190.0, 51.5: 187.5,
  52.0: 185.0, 52.5: 182.5, 53.0: 180.0, 53.5: 177.5,
  54.0: 175.0, 54.5: 172.5, 55.0: 170.0, 55.5: 167.5,
  56.0: 164.0, 56.5: 161.5, 57.0: 158.0, 57.5: 155.5,
  58.0: 152.0, 58.5: 149.5, 59.0: 145.0, 59.5: 142.5,
  60.0: 139.0, 60.5: 136.1, 61.0: 132.0, 61.5: 128.6,
  62.0: 125.0, 62.5: 121.4, 63.0: 117.0, 63.5: 113.4
};

// 计发月数：精确到月（按半年节点线性插值）
function getMonths(ageExact) {
  var age = Math.round(ageExact * 2) / 2;
  if (MONTHS_TABLE_HALF[age] !== undefined) return MONTHS_TABLE_HALF[age];
  var lo = Math.floor(age * 2) / 2;
  var hi = lo + 0.5;
  if (MONTHS_TABLE_HALF[lo] !== undefined && MONTHS_TABLE_HALF[hi] !== undefined) {
    var frac = (ageExact - lo) / 0.5;
    return Math.round((MONTHS_TABLE_HALF[lo] + (MONTHS_TABLE_HALF[hi] - MONTHS_TABLE_HALF[lo]) * frac) * 10) / 10;
  }
  return 139;
}

// 最低缴费年限相位表
var MIN_YEARS = {
  2025:15, 2026:15, 2027:15, 2028:15, 2029:15,
  2030:15.5, 2031:16, 2032:16.5, 2033:17, 2034:17.5,
  2035:18, 2036:18.5, 2037:19, 2038:19.5,
  2039:20, 2040:20, 2041:20, 2042:20, 2043:20, 2044:20, 2045:20
};

// 历年个人账户记账利率
var ACC_RATES = {
  2016: 0.0831, 2017: 0.0712, 2018: 0.0829, 2019: 0.0761,
  2020: 0.0604, 2021: 0.0669, 2022: 0.0397, 2023: 0.0397,
  2024: 0.0262, 2025: 0.015
};
var ACC_RATES_JL = {
  2005: 0.0226, 2008: 0.0393, 2009: 0.0225, 2010: 0.0230, 2013: 0.0325
};
var RATE_DEFAULT_PRE_2016 = 0.025;
var RATE_DEFAULT = 0.015;
var ACC_START = { year: 1995, month: 7 };

// 吉林省历年计发基数（月均，元/月）
var HIST_BASES_PROV = {
  1995: 369.17, 1996: 447.50, 1997: 472.00, 1998: 545.92, 1999: 596.50,
  2000: 660.33, 2001: 730.92, 2002: 832.50, 2003: 923.42, 2004: 1035.92,
  2005: 1200.75, 2006: 1381.92, 2007: 1709.42, 2008: 1957.17, 2009: 2185.83,
  2010: 2449.92, 2011: 2849.75, 2012: 3200.58, 2013: 3570.50, 2014: 3876.33,
  2015: 4296.50, 2016: 4674.83, 2017: 5120.92, 2018: 5711.08, 2019: 6151.08,
  2020: 5088.42, 2021: 6004.75, 2022: 6384.83, 2023: 6655.33, 2024: 7178.50,
  2025: 7322.08
};
var HIST_BASES_CC = {
  2020: 6605.23, 2021: 6605.23, 2022: 7023.31, 2023: 7320.86, 2024: 7852.58,
  2025: 7978.25
};
var BASE_CC_2025 = 7978.25;
var BASE_PROV_2025 = 7322.08;
var CC_GROWTH = 0.026;
var PROV_GROWTH = 0.0438;
var MERGE_YEAR = 2031;

function getBase(city, year) {
  if (year <= 2019) {
    return HIST_BASES_PROV[year] || HIST_BASES_PROV[1995];
  }
  if (year <= 2025) {
    if (city === 'cc') return HIST_BASES_CC[year] || BASE_CC_2025;
    return HIST_BASES_PROV[year] || BASE_PROV_2025;
  }
  if (year < MERGE_YEAR) {
    if (city === 'cc') return Math.round(BASE_CC_2025 * Math.pow(1 + CC_GROWTH, year - 2025) * 100) / 100;
    return Math.round(BASE_PROV_2025 * Math.pow(1 + PROV_GROWTH, year - 2025) * 100) / 100;
  }
  var mergeBase = Math.round(BASE_CC_2025 * Math.pow(1 + CC_GROWTH, MERGE_YEAR - 2025) * 100) / 100;
  return Math.round(mergeBase * Math.pow(1 + CC_GROWTH, year - MERGE_YEAR) * 100) / 100;
}

function getBaseProv(year) {
  return getBase('prov', year);
}

function getAccRate(year) {
  if (ACC_RATES[year] !== undefined) return ACC_RATES[year];
  if (year < 2016) return ACC_RATES_JL[year] !== undefined ? ACC_RATES_JL[year] : RATE_DEFAULT_PRE_2016;
  return RATE_DEFAULT;
}

function getDelayMonths(year, month, type) {
  var baseYear, step, cap;
  if (type === 'male') { baseYear = 1965; step = 4; cap = 36; }
  else if (type === 'fc') { baseYear = 1970; step = 4; cap = 36; }
  else { baseYear = 1975; step = 2; cap = 60; }
  if (year < baseYear) return 0;
  var diff = (year - baseYear) * 12 + (month - 1);
  if (diff < 1) return 0;
  var delay = Math.floor((diff - 1) / step) + 1;
  return Math.min(delay, cap);
}

function getRetireTotalMonths(birthYear, birthMonth, type) {
  var baseAge = type === 'male' ? 60 : (type === 'fc' ? 55 : 50);
  var delay = getDelayMonths(birthYear, birthMonth, type);
  return baseAge * 12 + delay;
}

function getOriginalRetireAge(type) {
  return type === 'male' ? 60 : (type === 'fc' ? 55 : 50);
}

function getMinYears(retireYear) {
  if (MIN_YEARS[retireYear] !== undefined) return MIN_YEARS[retireYear];
  if (retireYear < 2025) return 15;
  if (retireYear > 2045) return 20;
  return 20;
}

function parseMonth(s) {
  var parts = s.split('-');
  return { year: parseInt(parts[0]), month: parseInt(parts[1]) };
}

function calcYears(start, end) {
  var totalMonths = (end.year - start.year) * 12 + (end.month - start.month);
  return Math.max(0, totalMonths / 12);
}

function getRetireDate(birthYear, birthMonth, totalMonths) {
  var y = birthYear + Math.floor(totalMonths / 12);
  var m = birthMonth + (totalMonths % 12);
  if (m > 12) { y++; m -= 12; }
  return { year: y, month: m };
}

function getAgeStr(totalMonths) {
  var years = Math.floor(totalMonths / 12);
  var remain = totalMonths % 12;
  return years + '岁' + (remain > 0 ? remain + '个月' : '');
}

function calcPension(birth, work, retireDate, totalRetireMonths, city, idx, personalAccInput) {
  var baseRetire = getBase(city, retireDate.year - 1);
  var baseProv = getBaseProv(retireDate.year - 1);
  var cutoffDate = { year: 1995, month: 7 };

  var retireAgeExact = totalRetireMonths / 12;
  var months = getMonths(retireAgeExact);

  var hasSight = work.year < 1995 || (work.year === 1995 && work.month < 7);
  var actualStart = hasSight ? cutoffDate : work;
  var actualYears = calcYears(actualStart, retireDate);
  var sightYears = hasSight ? calcYears(work, cutoffDate) : 0;
  var totalYears = actualYears + sightYears;

  var minYears = getMinYears(retireDate.year);
  var meetMin = totalYears >= minYears;

  var avgBase = (baseRetire + baseProv * idx) / 2;
  var basicPension = avgBase * totalYears * 0.01;

  var extraPension = 0;
  var extraDesc = '未触发';
  if (actualYears > 20) {
    var e25 = Math.max(0, Math.min(totalYears, 25) - 20);
    var e30 = Math.max(0, Math.min(totalYears, 30) - 25);
    var e31 = Math.max(0, totalYears - 30);
    var coef = e25 * 0.0015 + e30 * 0.0020 + e31 * 0.0025;
    extraPension = avgBase * coef;
    extraDesc = '实际缴费' + actualYears.toFixed(2) + '年>20年，系数' + (coef * 100).toFixed(2) + '%';
  }

  var personalPension, accDesc;
  if (personalAccInput && personalAccInput > 0) {
    personalPension = personalAccInput / months;
    accDesc = '用户输入 ' + personalAccInput.toLocaleString() + ' 元';
  } else {
    var accStart = ACC_START;
    var accEffStart = work;
    if (work.year < accStart.year || (work.year === accStart.year && work.month < accStart.month)) {
      accEffStart = accStart;
    }
    var accSpanMonths = (retireDate.year - accEffStart.year) * 12 + (retireDate.month - accEffStart.month);
    if (accSpanMonths <= 0) {
      personalPension = 0;
      accDesc = '无个人账户缴费记录';
    } else {
      var totalAcc = 0;
      var fY = accEffStart.year;
      var fM = accEffStart.month;
      var firstMonths = 12 - fM + 1;
      if (firstMonths > 0 && firstMonths < 12) {
        var baseY = getBase(city, fY);
        var monthPayY = baseY * idx * 0.08;
        totalAcc = (totalAcc + monthPayY * firstMonths) * (1 + getAccRate(fY));
      }
      for (var y = fY + 1; y < retireDate.year; y++) {
        var baseYear = getBase(city, y);
        var annualPay = baseYear * idx * 0.08 * 12;
        totalAcc = (totalAcc + annualPay) * (1 + getAccRate(y));
      }
      var lastMonths = retireDate.month - 1;
      if (lastMonths > 0) {
        var baseRetireAcc = getBase(city, retireDate.year);
        var monthPayRetire = baseRetireAcc * idx * 0.08;
        var rLast = getAccRate(retireDate.year);
        totalAcc = (totalAcc + monthPayRetire * lastMonths) * (1 + rLast) ** (lastMonths / 12);
      }
      personalPension = totalAcc / months;
      accDesc = '按历年记账利率复利估算，' + fY + '.' + fM + '-' + retireDate.year + '.' + retireDate.month;
    }
  }

  var transPension = 0;
  var transDesc = '无视同年限';
  if (sightYears > 0) {
    var transCoef = actualYears > 20 ? 0.014 : 0.012;
    transPension = baseProv * sightYears * idx * transCoef;
    transDesc = '视同' + sightYears.toFixed(2) + '年 x 系数' + (transCoef * 100).toFixed(1) + '%';
  }

  var total = basicPension + extraPension + personalPension + transPension;
  var rate = total / baseProv * 100;

  return {
    basicPension: basicPension,
    extraPension: extraPension,
    personalPension: personalPension,
    transPension: transPension,
    total: total,
    rate: rate,
    months: months,
    actualYears: actualYears,
    sightYears: sightYears,
    totalYears: totalYears,
    minYears: minYears,
    meetMin: meetMin,
    extraDesc: extraDesc,
    accDesc: accDesc,
    transDesc: transDesc,
    retireAgeExact: retireAgeExact
  };
}

function infoItem(label, value) {
  return '<div class="info-item"><span class="label">' + label + '</span><span class="value">' + value + '</span></div>';
}

