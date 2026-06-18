/**
 * 案例库自动化测试脚本（端到端，基于 verify.js 逻辑）
 * 用法：
 *   node scripts/run-cases.js              # 跑全部案例
 *   node scripts/run-cases.js --province shanxi  # 只跑山西
 *   node scripts/run-cases.js --report    # 生成 Markdown 报告
 */

const fs = require('fs');
const path = require('path');
const { calculate } = require('../engine/pension-engine.js');

// 加载省份配置
function loadProvinceData(provinceKey) {
  const filePath = path.join(__dirname, '..', 'provinces', `${provinceKey}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// 将案例 JSON 映射为引擎输入
function mapCaseToInput(caseData, provinceData) {
  const birth = caseData.birthDate || '1968-01-01';
  const workStart = caseData.workStartDate || '1988-01-01';
  const [birthYear, birthMonth] = birth.split('-').map(Number);
  const [workYear, workMonth] = workStart.split('-').map(Number);

  // 确定 genderType
  let genderType = 'male';
  if (caseData.gender === 'female') {
    if (caseData.identity === 'flexible') {
      genderType = 'fw55'; // 灵活就业女性 55 岁
    } else if (caseData.identity === 'employee') {
      genderType = caseData.femaleEmployeeAge === 55 ? 'fc' : 'fw50';
    }
  }

  return {
    province: caseData.province || 'beijing',
    cityType: 'prov',
    genderType,
    birthYear,
    birthMonth,
    workYear,
    workMonth,
    averageIndex: caseData.averageIndex || 1.0,
    personalAccount: caseData.personalAccount || 50000,
    retireDate: caseData.retireDate || `${birthYear + (genderType === 'male' ? 60 : 50)}-${String(birthMonth).padStart(2, '0')}-01`,
    config: provinceData,
  };
}

// 运行单个案例
function runSingleCase(provinceKey, caseData, caseFile) {
  const provinceData = loadProvinceData(provinceKey);
  if (!provinceData) {
    return { pass: false, reason: `省份数据 ${provinceKey}.json 不存在` };
  }

  const input = mapCaseToInput(caseData, provinceData);
  let result;
  try {
    result = calculate(provinceData, input);
  } catch (e) {
    return { pass: false, reason: `引擎报错: ${e.message}` };
  }

  // 对比预期值
  const expected = caseData.expected || {};
  const actual = {
    total: result.total,
    basePension: result.basePension,
    personalPension: result.personalPension,
    transitionPension: result.transitionPension,
  };

  let pass = true;
  let diffs = [];
  for (const key of ['total', 'basePension', 'personalPension', 'transitionPension']) {
    if (expected[key] !== undefined) {
      const diff = Math.abs(actual[key] - expected[key]);
      if (diff > 1) {
        pass = false;
        diffs.push(`${key}: 预期 ${expected[key]} vs 实际 ${actual[key]} (差 ${diff.toFixed(2)})`);
      }
    }
  }

  return {
    pass,
    reason: diffs.length > 0 ? diffs.join('; ') : '',
    expected,
    actual: { total: actual.total, basePension: actual.basePension, personalPension: actual.personalPension, transitionPension: actual.transitionPension },
  };
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  let provinceFilter = null;
  let doReport = false;
  for (const a of args) {
    if (a.startsWith('--province=')) {
      provinceFilter = a.split('=')[1];
    } else if (a === '--report') {
      doReport = true;
    }
  }

  const casesDir = path.join(__dirname, '..', 'cases');
  if (!fs.existsSync(casesDir)) {
    console.error('❌ cases/ 目录不存在');
    process.exit(1);
  }

  const provinces = fs.readdirSync(casesDir).filter(f => fs.statSync(path.join(casesDir, f)).isDirectory());
  let totalCases = 0;
  let passCount = 0;
  let failCount = 0;
  const failures = [];

  console.log('=== 案例库自动化测试 ===\n');

  for (const province of provinces) {
    if (provinceFilter && province !== provinceFilter) continue;

    const provinceCasesDir = path.join(casesDir, province);
    const caseFiles = fs.readdirSync(provinceCasesDir).filter(f => f.endsWith('.json'));

    for (const caseFile of caseFiles) {
      totalCases++;
      const caseData = JSON.parse(fs.readFileSync(path.join(provinceCasesDir, caseFile), 'utf8'));
      const result = runSingleCase(province, caseData, caseFile);

      if (result.pass) {
        passCount++;
        if (!doReport) console.log(`  ✅ ${province}/${caseFile}`);
      } else {
        failCount++;
        failures.push({ province, caseFile, reason: result.reason, expected: result.expected, actual: result.actual });
        console.log(`  ❌ ${province}/${caseFile}: ${result.reason}`);
      }
    }
  }

  console.log('\n=== 汇总 ===');
  console.log(`总计: ${totalCases}`);
  console.log(`通过: ${passCount}`);
  console.log(`失败: ${failCount}`);

  if (failures.length > 0) {
    console.log('\n=== 失败详情 ===');
    for (const f of failures) {
      console.log(`\n${f.province}/${f.caseFile}:`);
      console.log(`  原因: ${f.reason}`);
      if (f.expected) console.log(`  预期: ${JSON.stringify(f.expected)}`);
      if (f.actual) console.log(`  实际: ${JSON.stringify(f.actual)}`);
    }
  }

  // 生成报告
  if (doReport) {
    const reportPath = path.join(__dirname, '..', 'reports', `test-report-${new Date().toISOString().slice(0, 10)}.md`);
    if (!fs.existsSync(path.dirname(reportPath))) {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    }
    const md = [
      `# 养老金计算平台测试报告`,
      `生成时间: ${new Date().toLocaleString('zh-CN')}`,
      ``,
      `## 汇总`,
      `- 总计: ${totalCases}`,
      `- 通过: ${passCount}`,
      `- 失败: ${failCount}`,
      ``,
      `## 失败案例`,
      ...failures.map(f => `- **${f.province}/${f.caseFile}**: ${f.reason}`),
    ].join('\n');
    fs.writeFileSync(reportPath, md, 'utf8');
    console.log(`\n📄 报告已生成: ${reportPath}`);
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main();
