// 养老金计算引擎 - 核心模块
// 与原养老金速算计算器逻辑保持一致
// 不使用ES6模块，直接挂载到window，供浏览器引用

(function() {
  'use strict';

  // ========== 1. 计算个人账户储存额 ==========
  // 与原计算器 calcPension 中的个人账户逻辑一致
  // params: { city, idx(缴费指数), workStart({year,month}), retireDate({year,month}) }
  // 返回：{ totalAcc, desc }
  window.calcPersonalAccount = function(params) {
    const { city, idx, workStart, retireDate } = params;
    const ACC_START = window.ACC_START || { year: 1995, month: 7 };

    // 个人账户建账前参加工作的，从建账月开始算
    let accEffStart = workStart;
    if (workStart.year < ACC_START.year ||
       (workStart.year === ACC_START.year && workStart.month < ACC_START.month)) {
      accEffStart = ACC_START;
    }

    const accSpanMonths = (retireDate.year - accEffStart.year) * 12 +
                         (retireDate.month - accEffStart.month);
    if (accSpanMonths <= 0) {
      return { totalAcc: 0, desc: '无个人账户缴费记录' };
    }

    let totalAcc = 0;

    // 第一年的部分月份
    const fY = accEffStart.year;
    const fM = accEffStart.month;
    const firstMonths = 12 - fM + 1;
    if (firstMonths > 0 && firstMonths <= 12) {
      const baseY = window.getSalaryForYear(fY, city);
      const monthPayY = baseY * idx * 0.08;
      totalAcc = (totalAcc + monthPayY * firstMonths) * (1 + window.getInterestRate(fY));
    }

    // 中间完整年份
    for (let y = fY + 1; y < retireDate.year; y++) {
      const baseYear = window.getSalaryForYear(y, city);
      const annualPay = baseYear * idx * 0.08 * 12;
      totalAcc = (totalAcc + annualPay) * (1 + window.getInterestRate(y));
    }

    // 最后一年部分月份
    const lastMonths = retireDate.month - 1;
    if (lastMonths > 0) {
      const baseRetire = window.getSalaryForYear(retireDate.year, city);
      const monthPayRetire = baseRetire * idx * 0.08;
      const rLast = window.getInterestRate(retireDate.year);
      totalAcc = (totalAcc + monthPayRetire * lastMonths) * Math.pow(1 + rLast, lastMonths / 12);
    }

    return {
      totalAcc: Math.round(totalAcc * 100) / 100,
      desc: '按历年记账利率复利估算，' + fY + '.' + fM + '-' + retireDate.year + '.' + retireDate.month
    };
  };

  // ========== 1.5 辅助：按年份查计发基数（不加 -1）==========
  // getSalary(retireYear, city) 内部会减1，这里提供一个不加减的版本供内部使用
  window.getSalaryForYear = function(year, city) {
    if (window.salaryHistoryData && window.salaryHistoryData[year]) {
      const d = window.salaryHistoryData[year];
      if (year <= 2019) return d.province;
      const isCC = (city === 'changchun' || city === 'cc');
      return isCC ? d.changchun : d.province;
    }
    // 查不到则调用 getSalary（它会自动减1）
    return window.getSalary ? window.getSalary(year + 1, city) : 5000;
  };

  // ========== 2. 平均缴费指数计算 ==========
  // contributions: [{ year, month, base }]
  window.calculateAverageIndex = function(contributions) {
    if (!contributions || contributions.length === 0) return { averageIndex: 0, details: [] };

    const details = [];
    let totalIndexed = 0;
    let totalMonths = 0;

    for (const record of contributions) {
      const { year, month, base } = record;
      // 查当年计发基数
      const salary = window.getSalaryForYear(year, 'changchun');
      if (!salary || salary <= 0) continue;
      const index = base / salary;
      details.push({ year, month, base, salary, index: Math.round(index * 10000) / 10000 });
      totalIndexed += index;
      totalMonths++;
    }

    const averageIndex = totalMonths > 0 ? Math.round((totalIndexed / totalMonths) * 10000) / 10000 : 0;
    return { averageIndex, details, totalMonths };
  };

  // ========== 3. 基础养老金计算 ==========
  // 与原 calcPension 逻辑一致
  // params: { baseRetire(市平), baseProv(省平), idx, totalYears }
  window.calculateBasePension = function(params) {
    const { baseRetire, baseProv, idx, totalYears } = params;
    if (!baseRetire || !baseProv || totalYears <= 0) return 0;
    const avgBase = (baseRetire + baseProv * idx) / 2;
    return Math.round(avgBase * totalYears * 0.01 * 100) / 100;
  };

  // ========== 4. 基础养老金增发（分段累进）==========
  // 与原 calcPension 逻辑一致
  // params: { baseRetire, baseProv, idx, actualYears, totalYears }
  window.calculateBasePensionIncrease = function(params) {
    const { baseRetire, baseProv, idx, actualYears, totalYears } = params;
    if (actualYears <= 20) return 0;

    const e25 = Math.max(0, Math.min(totalYears, 25) - 20);
    const e30 = Math.max(0, Math.min(totalYears, 30) - 25);
    const e31 = Math.max(0, totalYears - 30);
    const coef = e25 * 0.0015 + e30 * 0.0020 + e31 * 0.0025;

    const avgBase = (baseRetire + baseProv * idx) / 2;
    return Math.round(avgBase * coef * 100) / 100;
  };

  // ========== 5. 过渡性养老金 ==========
  // params: { baseProv, idx, sightYears }
  window.calculateTransitionPension = function(params) {
    const { baseProv, idx, sightYears } = params;
    if (!baseProv || !idx || sightYears <= 0) return 0;
    // 实际缴费超过20年用系数1.4%，否则1.2%
    const coef = actualYears > 20 ? 0.014 : 0.012;
    return Math.round(baseProv * sightYears * idx * coef * 100) / 100;
  };

  // ========== 6. 主计算函数 ==========
  // 与原 calcPension 对齐
  // params:
  //   birth: {year, month}
  //   workStart: {year, month}
  //   city: 'cc' | 'prov'
  //   idx: 平均缴费指数
  //   personalAccInput: 用户输入的个人账户余额（可选）
  //   retireType: 'legal' | 'flex'  // 法定退休 | 弹性提前
  window.calculatePensionFull = function(params) {
    const { birth, workStart, city, idx, personalAccInput, retireType } = params;

    // 1. 确定退休年龄和日期
    let totalMonths;
    if (retireType === 'flex') {
      // 弹性提前：取原法定年龄对应的总月数和法定退休总月数-36的较大者
      const originalAge = window.getOriginalRetireAge(city === 'cc' ? 'male' : 'male'); // 简化：都用male
      // 实际上 type 需要从 city 推断，这里用更好的方式
      const type = window.getGenderType ? window.getGenderType() : 'male';
      const legalTotal = window.getRetireTotalMonths(birth.year, birth.month, type);
      const flexTotal = Math.max(originalAge * 12, legalTotal - 36);
      totalMonths = flexTotal;
    } else {
      const type = params.genderType || 'male';
      totalMonths = window.getRetireTotalMonths(birth.year, birth.month, type);
    }

    const retireDate = window.getRetireDate(birth.year, birth.month, totalMonths);
    const retireAgeExact = totalMonths / 12;

    // 2. 查计发月数
    const months = window.getMonths(retireAgeExact);

    // 3. 查退休时计发基数（上一年度）
    const baseRetire = window.getSalary(retireDate.year, city);
    const baseProv = window.getSalary(retireDate.year, 'prov'); // 全省

    // 4. 计算缴费年限
    const ACC_START = window.ACC_START || { year: 1995, month: 7 };
    const hasSight = workStart.year < ACC_START.year ||
                   (workStart.year === ACC_START.year && workStart.month < ACC_START.month);
    const actualStart = hasSight ? ACC_START : workStart;
    const actualYears = Math.max(0, (retireDate.year - actualStart.year) +
                                  (retireDate.month - actualStart.month) / 12);
    const sightYears = hasSight ?
      ((ACC_START.year - workStart.year) + (ACC_START.month - workStart.month) / 12) : 0;
    const totalYears = actualYears + sightYears;

    // 5. 最低缴费年限检查
    const minYears = window.getMinYears ? window.getMinYears(retireDate.year) : 15;
    const meetMin = totalYears >= minYears;

    // 6. 基础养老金
    const avgBase = (baseRetire + baseProv * idx) / 2;
    const basicPension = avgBase * totalYears * 0.01;

    // 7. 增发
    let extraPension = 0;
    let extraDesc = '未触发';
    if (actualYears > 20) {
      const e25 = Math.max(0, Math.min(totalYears, 25) - 20);
      const e30 = Math.max(0, Math.min(totalYears, 30) - 25);
      const e31 = Math.max(0, totalYears - 30);
      const coef = e25 * 0.0015 + e30 * 0.0020 + e31 * 0.0025;
      extraPension = avgBase * coef;
      extraDesc = '实际缴费' + actualYears.toFixed(2) + '年>20年，系数' + (coef * 100).toFixed(2) + '%';
    }

    // 8. 个人账户养老金
    let personalPension, accDesc;
    if (personalAccInput && personalAccInput > 0) {
      personalPension = personalAccInput / months;
      accDesc = '用户输入 ' + personalAccInput.toLocaleString() + ' 元';
    } else {
      const accResult = window.calcPersonalAccount({ city, idx, workStart, retireDate });
      personalPension = accResult.totalAcc / months;
      accDesc = accResult.desc;
    }

    // 9. 过渡性养老金
    let transPension = 0;
    let transDesc = '无视同年限';
    if (sightYears > 0) {
      const transCoef = actualYears > 20 ? 0.014 : 0.012;
      transPension = baseProv * sightYears * idx * transCoef;
      transDesc = '视同' + sightYears.toFixed(2) + '年 x 系数' + (transCoef * 100).toFixed(1) + '%';
    }

    // 10. 汇总
    const total = basicPension + extraPension + personalPension + transPension;
    const rate = baseProv > 0 ? total / baseProv * 100 : 0;

    return {
      basicPension: Math.round(basicPension * 100) / 100,
      extraPension: Math.round(extraPension * 100) / 100,
      personalPension: Math.round(personalPension * 100) / 100,
      transPension: Math.round(transPension * 100) / 100,
      total: Math.round(total * 100) / 100,
      rate: Math.round(rate * 10) / 10,
      months,
      actualYears: Math.round(actualYears * 100) / 100,
      sightYears: Math.round(sightYears * 100) / 100,
      totalYears: Math.round(totalYears * 100) / 100,
      minYears,
      meetMin,
      extraDesc,
      accDesc,
      transDesc,
      retireAgeExact,
      retireDate
    };
  };

  console.log('[PensionEngine] 核心计算引擎加载完成（与原速算计算器对齐）');
})();
