const fs = require('fs');
const path = require('path');

const casesDir = 'C:\\Users\\14041\\AppData\\Roaming\\winclaw\\.openclaw\\workspace\\养老金计算平台\\cases';

// 8个已完成省份
const completedProvinces = ['jilin', 'heilongjiang', 'yunnan', 'gansu', 'shanghai', 'beijing', 'jiangsu', 'sichuan'];

const results = {};

// 遍历每个省份目录
completedProvinces.forEach(province => {
  const provinceDir = path.join(casesDir, province);
  results[province] = {
    male: { count: 0, cases: [] },
    female: { count: 0, cases: [] },
    unknown: { count: 0, cases: [] },
    total: 0
  };

  if (!fs.existsSync(provinceDir)) {
    console.log(`目录不存在: ${provinceDir}`);
    return;
  }

  const files = fs.readdirSync(provinceDir).filter(f => f.endsWith('.json'));

  files.forEach(file => {
    const filePath = path.join(provinceDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      results[province].total++;

      // 提取性别
      let gender = 'unknown';
      if (data.gender) {
        if (data.gender.includes('男')) gender = 'male';
        else if (data.gender.includes('女')) gender = 'female';
      }

      // 提取退休年龄
      let retirementAge = null;
      if (data.retirement_age) retirementAge = data.retirement_age;
      else if (data.age_at_retirement) retirementAge = data.age_at_retirement;
      else if (data.pension_breakdown && data.pension_breakdown.payment_months) {
        const months = data.pension_breakdown.payment_months;
        if (months == 139) retirementAge = 50;
        else if (months == 170) retirementAge = 55;
        else if (months == 195) retirementAge = 60;
      }

      const caseInfo = {
        file: file,
        gender: gender,
        retirementAge: retirementAge,
        retirementType: data.retirement_type || '未知'
      };

      if (gender === 'male') {
        results[province].male.count++;
        results[province].male.cases.push(caseInfo);
      } else if (gender === 'female') {
        results[province].female.count++;
        results[province].female.cases.push(caseInfo);
      } else {
        results[province].unknown.count++;
        results[province].unknown.cases.push(caseInfo);
      }

    } catch (err) {
      console.error(`读取文件失败: ${filePath}`, err.message);
    }
  });
});

// 输出结果
console.log('=== 8个已完成省份案例分布分析 ===\n');
console.log('（按省份分类，统计性别和退休年龄）\n');

Object.keys(results).forEach(province => {
  const data = results[province];
  console.log(`## ${province} (${data.total}个案例)`);
  console.log(`- 男职工: ${data.male.count}个`);
  data.male.cases.forEach(c => {
    console.log(`  - ${c.file}: ${c.retirementAge}岁, ${c.retirementType}`);
  });
  console.log(`- 女职工: ${data.female.count}个`);
  data.female.cases.forEach(c => {
    console.log(`  - ${c.file}: ${c.retirementAge}岁, ${c.retirementType}`);
  });
  if (data.unknown.count > 0) {
    console.log(`- 未知: ${data.unknown.count}个`);
  }
  console.log('');
});

// 汇总
console.log('=== 汇总统计 ===\n');
let totalMale = 0, totalFemale = 0, totalUnknown = 0;
Object.keys(results).forEach(province => {
  totalMale += results[province].male.count;
  totalFemale += results[province].female.count;
  totalUnknown += results[province].unknown.count;
});
console.log(`男职工总计: ${totalMale}个`);
console.log(`女职工总计: ${totalFemale}个`);
console.log(`未知性别: ${totalUnknown}个`);
console.log(`总计: ${totalMale + totalFemale + totalUnknown}个`);
