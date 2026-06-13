/**
 * 测试新格式案例（读取 cases/ 目录下的JSON文件）
 * 用法：node test_new_format.js
 */

const { calculate } = require('./engine/pension-engine.js');
const fs = require('fs');
const path = require('path');

const CASES_DIR = path.join(__dirname, 'cases');
const PROVINCES_DIR = path.join(__dirname, 'provinces');

// 读取所有省份配置
const provinceConfigs = {};
const provinceFiles = fs.readdirSync(PROVINCES_DIR).filter(f => f.endsWith('.json'));
provinceFiles.forEach(f => {
  const code = f.replace('.json', '');
  provinceConfigs[code] = JSON.parse(fs.readFileSync(path.join(PROVINCES_DIR, f), 'utf8'));
});

// 读取所有案例
const caseDirs = fs.readdirSync(CASES_DIR).filter(f => 
  fs.statSync(path.join(CASES_DIR, f)).isDirectory() &&
  !['extracted', 'other', 'skip'].includes(f)
);

let totalCases = 0;
let passedCases = 0;
let failedCases = 0;
const failedDetails = [];

console.log('='.repeat(80));
console.log('📊 养老金计算引擎 - 新格式案例验证测试');
console.log('='.repeat(80));

caseDirs.forEach(provinceCode => {
  const caseDir = path.join(CASES_DIR, provinceCode);
  const caseFiles = fs.readdirSync(caseDir).filter(f => f.endsWith('.json'));
  
  if (caseFiles.length === 0) return;
  
  const provinceName = provinceConfigs[provinceCode]?.name || provinceCode;
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🏢 ${provinceName}（${caseFiles.length}个案例）`);
  console.log('='.repeat(80));
  
  caseFiles.forEach((caseFile, idx) => {
    totalCases++;
    const casePath = path.join(caseDir, caseFile);
    const caseData = JSON.parse(fs.readFileSync(casePath, 'utf8'));
    
    console.log(`\n📋 案例 ${idx + 1}：${caseData.case_id || caseFile}`);
    
    try {
      // 构造输入参数（映射字段名以匹配引擎期望的格式）
      const birthDate = caseData.birth_date || '';
      const workStartDate = caseData.employment_start_date || caseData.work_start_date || '';
      const retirementDate = caseData.retirement_date || '';
      
      const input = {
        province: provinceCode,
        name: caseData.name || '测试人员',
        gender: caseData.gender === '男' ? 'male' : 'female',
        // 日期格式：拆分成 year/month
        birthYear: parseInt(birthDate.split('-')[0]) || 1964,
        birthMonth: parseInt(birthDate.split('-')[1]) || 1,
        workYear: parseInt(workStartDate.split('-')[0]) || 1980,
        workMonth: parseInt(workStartDate.split('-')[1]) || 1,
        retireYear: parseInt(retirementDate.split('-')[0]) || 2024,
        retireMonth: parseInt(retirementDate.split('-')[1]) || 1,
        // 数值参数：字段名映射
        avgIndex: caseData.calculation_parameters?.average_wage_index || caseData.calculation_parameters?.average_wage_index || 1.0,
        personalAcc: caseData.calculation_parameters?.personal_account_balance || 0,
        sightYears: caseData.contribution_years?.deemed_years || 0,
        totalYears: caseData.contribution_years?.total_years || 0,
        actualYears: caseData.contribution_years?.actual_years || 0,
        // 其他参数
        retireType: caseData.retirement_type === '提前退休' ? 'early' : 'standard',
      };
      
      // 获取省份配置
      const provinceConfig = provinceConfigs[provinceCode];
      
      // 计算
      const result = calculate(provinceConfig, input);
      const legal = result?.legal;
      
      if (!legal) {
        console.log('  ❌ 引擎未返回 legal 结果');
        failedCases++;
        return;
      }
      
      // 对比结果
      const expected = caseData.pension_breakdown || caseData.expected_results;
      let casePassed = true;
      
      const check = (label, expVal, actVal) => {
        if (expVal === undefined) return;
        const exp = parseFloat(expVal);
        const act = parseFloat(actVal);
        if (isNaN(exp) || isNaN(act)) return;
        const diff = Math.abs(act - exp);
        const pass = diff < 1; // 误差≤1元视为通过
        if (!pass) casePassed = false;
        const mark = pass ? '✅' : '❌';
        console.log(`  ${mark} ${label}：期望=${exp.toFixed(2)}，实际=${act.toFixed(2)}，误差=${diff.toFixed(2)}`);
      };
      
      check('基础养老金', expected.basic_pension, legal.basicPension?.amount);
      check('个人账户养老金', expected.personal_account_pension || expected.personal_account, legal.personalAccount?.amount);
      check('过渡性养老金', expected.transitional_pension || expected.transitional, legal.transitionalPension?.amount);
      check('增发养老金', expected.other_additions || expected.extra, legal.extraPension?.amount);
      check('总养老金', expected.monthly_basic_pension_total || expected.total, legal.total);
      
      if (casePassed) {
        passedCases++;
        console.log(`  ✅ 案例 ${idx + 1} 通过`);
      } else {
        failedCases++;
        failedDetails.push({ province: provinceName, case: caseFile });
      }
      
    } catch (err) {
      console.log(`  ❌ 计算失败：${err.message}`);
      failedCases++;
    }
  });
});

console.log('\n' + '='.repeat(80));
console.log('📊 测试汇总');
console.log('='.repeat(80));
console.log(`总案例数：${totalCases}`);
console.log(`通过数：${passedCases}`);
console.log(`失败数：${failedCases}`);
console.log(`通过率：${((passedCases / totalCases) * 100).toFixed(2)}%`);
console.log('='.repeat(80));
