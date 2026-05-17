// 养老金计算器 - 前端交互逻辑
// 直接引用全局变量（window.xxx），不用import

(function() {
  'use strict';

  // ========== DOM元素引用 ==========
  const dom = {
    form: document.getElementById('calc-form'),
    resultDiv: document.getElementById('result'),
    modeSimple: document.getElementById('mode-simple'),
    modeAdvanced: document.getElementById('mode-advanced'),
    simpleSection: document.getElementById('simple-section'),
    advancedSection: document.getElementById('advanced-section'),
    birthYear: document.getElementById('birth-year'),
    birthMonth: document.getElementById('birth-month'),
    genderType: document.getElementById('gender-type'),
    startYear: document.getElementById('start-year'),
    startMonth: document.getElementById('start-month'),
    endYear: document.getElementById('end-year'),
    endMonth: document.getElementById('end-month'),
    city: document.getElementById('city'),
    level: document.getElementById('payment-level'),
    btnCalculate: document.getElementById('btn-calculate'),
    btnReset: document.getElementById('btn-reset')
  };

  // ========== 模式切换 ==========
  function initModeSwitch() {
    if (dom.modeSimple) {
      dom.modeSimple.addEventListener('change', function() {
        if (this.checked) {
          dom.simpleSection.style.display = 'block';
          dom.advancedSection.style.display = 'none';
        }
      });
    }
    if (dom.modeAdvanced) {
      dom.modeAdvanced.addEventListener('change', function() {
        if (this.checked) {
          dom.simpleSection.style.display = 'none';
          dom.advancedSection.style.display = 'block';
        }
      });
    }
  }

  // ========== 自动计算参数 ==========
  function autoCalcParams() {
    const birthYear = parseInt(dom.birthYear.value) || 1976;
    const birthMonth = parseInt(dom.birthMonth.value) || 1;
    const genderType = dom.genderType.value || 'male';
    const startYear = parseInt(dom.startYear.value) || 1998;
    const startMonth = parseInt(dom.startMonth.value) || 7;
    const endYear = parseInt(dom.endYear.value) || 2026;
    const endMonth = parseInt(dom.endMonth.value) || 3;
    const city = dom.city.value || 'changchun';
    const level = parseFloat(dom.level.value) || 0.6;

    // 1. 计算退休年龄+延迟+计发月数
    const retireInfo = window.calculateRetirementAge 
      ? window.calculateRetirementAge(birthYear, birthMonth, genderType)
      : { actualAge: 60, paymentMonths: 139 };

    // 2. 计算缴费年限
    const actualYears = (endYear - startYear) + (endMonth - startMonth) / 12;
    const totalYears = actualYears; // 简化处理，视同缴费年限后面再加

    // 3. 生成缴费记录（简单模式）
    const contributions = window.generateContributionsByLevel
      ? window.generateContributionsByLevel({
          startYear, startMonth, endYear, endMonth, level, city
        })
      : [];

    // 4. 计算平均缴费指数
    const indexResult = window.calculateAverageIndex 
      ? window.calculateAverageIndex(contributions)
      : { averageIndex: level };

    // 5. 计算个人账户储存额
    const accountResult = window.calculatePersonalAccount
      ? window.calculatePersonalAccount(contributions)
      : { totalAmount: 50000 };

    // 6. 获取退休时社平工资（预计）
    const retireYear = birthYear + retireInfo.actualAge;
    const citySalary = window.getSalary ? window.getSalary(retireYear, city) : 8000;
    const provinceSalary = window.getSalary ? window.getSalary(retireYear, 'province') : 7000;

    return {
      birthYear, birthMonth, genderType,
      startYear, startMonth, endYear, endMonth,
      city, level,
      retireInfo,
      actualYears: Math.round(actualYears * 100) / 100,
      totalYears: Math.round(totalYears * 100) / 100,
      averageIndex: indexResult.averageIndex,
      accountBalance: accountResult.totalAmount,
      citySalary,
      provinceSalary,
      paymentMonths: retireInfo.paymentMonths,
      contributions,
      indexDetails: indexResult.details,
      accountDetails: accountResult.details
    };
  }

  // ========== 执行计算 ==========
  function doCalculate() {
    try {
      const params = autoCalcParams();

      // 调用核心计算引擎
      const result = window.calculateTotalPension
        ? window.calculateTotalPension({
            citySalary: params.citySalary,
            provinceSalary: params.provinceSalary,
            averageIndex: params.averageIndex,
            actualYears: params.actualYears,
            totalYears: params.totalYears,
            accountBalance: params.accountBalance,
            paymentMonths: params.paymentMonths,
            pre1998Years: params.startYear < 1998 ? (1998 - params.startYear) + (7 - params.startMonth) / 12 : 0,
            hasTransition: params.startYear < 1998
          })
        : { total: 0, basePension: 0, personalPension: 0, transitionPension: 0, increase: 0 };

      // 展示结果
      displayResult(params, result);

    } catch (err) {
      console.error('计算错误:', err);
      alert('计算出错：' + err.message);
    }
  }

  // ========== 展示结果 ==========
  function displayResult(params, result) {
    if (!dom.resultDiv) return;

    let html = '<div class="result-box">';
    html += '<h3>📊 计算结果</h3>';
    html += '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%">';
    html += '<tr><th>项目</th><th>数值</th></tr>';
    html += `<tr><td>出生日期</td><td>${params.birthYear}年${params.birthMonth}月</td></tr>`;
    html += `<tr><td>实际退休年龄</td><td>${params.retireInfo.actualAge}岁${params.retireInfo.actualMonths || 0}个月</td></tr>`;
    html += `<tr><td>计发月数</td><td>${params.paymentMonths}</td></tr>`;
    html += `<tr><td>累计缴费年限</td><td>${params.totalYears}年</td></tr>`;
    html += `<tr><td>平均缴费指数</td><td>${params.averageIndex}</td></tr>`;
    html += `<tr><td>个人账户储存额</td><td>¥${params.accountBalance.toFixed(2)}</td></tr>`;
    html += '<tr><td colspan="2"><strong>—— 养老金构成 ——</strong></td></tr>';
    html += `<tr><td>基础养老金</td><td>¥${(result.basePension || 0).toFixed(2)}/月</td></tr>`;
    html += `<tr><td>个人账户养老金</td><td>¥${(result.personalPension || 0).toFixed(2)}/月</td></tr>`;
    html += `<tr><td>过渡性养老金</td><td>¥${(result.transitionPension || 0).toFixed(2)}/月</td></tr>`;
    html += `<tr><td>基础养老金增发</td><td>¥${(result.increase || 0).toFixed(2)}/月</td></tr>`;
    html += `<tr style="background:#e8f5e9"><td><strong>合计养老金</strong></td><td><strong>¥${(result.total || 0).toFixed(2)}/月</strong></td></tr>`;
    html += '</table></div>';

    dom.resultDiv.innerHTML = html;
    dom.resultDiv.style.display = 'block';
  }

  // ========== 重置表单 ==========
  function doReset() {
    if (dom.form) dom.form.reset();
    if (dom.resultDiv) dom.resultDiv.style.display = 'none';
  }

  // ========== 初始化 ==========
  function init() {
    initModeSwitch();

    if (dom.btnCalculate) {
      dom.btnCalculate.addEventListener('click', doCalculate);
    }
    if (dom.btnReset) {
      dom.btnReset.addEventListener('click', doReset);
    }

    console.log('[PensionApp] 前端交互初始化完成');
  }

  // DOM就绪后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
