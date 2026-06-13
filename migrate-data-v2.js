const fs = require('fs');
const path = require('path');

const casesDir = 'C:/Users/14041/AppData/Roaming/winclaw/.openclaw/workspace/养老金计算平台/cases';
const otherDir = path.join(casesDir, 'other');

const files = fs.readdirSync(otherDir).filter(f => f.endsWith('.json'));
console.log(`处理 ${files.length} 个文件...\n`);

let success = 0, warn = 0, error = 0;

for (const file of files) {
  const filePath = path.join(otherDir, file);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.log(`❌ ${file}: JSON解析失败`);
    error++;
    continue;
  }
  
  // 确定省份目录
  const provinceName = data.province || data.region || data.省份 || '';
  let provinceDir = '';
  
  // 直接匹配province字段
  if (data.province === 'gansu') provinceDir = 'gansu';
  else if (data.province === 'shanghai') provinceDir = 'shanghai';
  else if (data.province === 'yunnan') provinceDir = 'yunnan';
  else if (data.province === 'beijing') provinceDir = 'beijing';
  else if (data.province === 'jiangsu') provinceDir = 'jiangsu';
  else if (data.province === 'sichuan') provinceDir = 'sichuan';
  else if (data.province === 'jilin') provinceDir = 'jilin';
  else if (data.province === 'heilongjiang') provinceDir = 'heilongjiang';
  else if (data.province === 'anhui') provinceDir = 'anhui';
  else if (data.province === 'fujian') provinceDir = 'fujian';
  else if (data.province === 'guangdong') provinceDir = 'guangdong';
  else if (data.province === 'guizhou') provinceDir = 'guizhou';
  else if (data.province === 'hebei') provinceDir = 'hebei';
  else if (data.province === 'henan') provinceDir = 'hennan';
  else if (data.province === 'hubei') provinceDir = 'hubei';
  else if (data.province === 'hunan') provinceDir = 'hunan';
  else if (data.province === 'jiangxi') provinceDir = 'jiangxi';
  else if (data.province === 'liaoning') provinceDir = 'liaoning';
  else if (data.province === 'ningxia') provinceDir = 'ningxia';
  else if (data.province === 'qinghai') provinceDir = 'qinghai';
  else if (data.province === 'shaanxi') provinceDir = 'shaanxi';
  else if (data.province === 'shandong') provinceDir = 'shandong';
  else if (data.province === 'shanxi') provinceDir = 'shanxi';
  else if (data.province === 'tianjin') provinceDir = 'tianjin';
  else if (data.province === 'xizang') provinceDir = 'xizang';
  else if (data.province === 'zhejiang') provinceDir = 'zhejiang';
  // 通过region字段匹配
  else if (provinceName.includes('甘肃')) provinceDir = 'gansu';
  else if (provinceName.includes('云南')) provinceDir = 'yunnan';
  else if (provinceName.includes('吉林')) provinceDir = 'jilin';
  else if (provinceName.includes('黑龙江')) provinceDir = 'heilongjiang';
  else if (provinceName.includes('上海')) provinceDir = 'shanghai';
  else if (provinceName.includes('北京')) provinceDir = 'beijing';
  else if (provinceName.includes('江苏')) provinceDir = 'jiangsu';
  else if (provinceName.includes('四川')) provinceDir = 'sichuan';
  else if (provinceName.includes('安徽')) provinceDir = 'anhui';
  else if (provinceName.includes('福建')) provinceDir = 'fujian';
  else if (provinceName.includes('广东')) provinceDir = 'guangdong';
  else if (provinceName.includes('贵州')) provinceDir = 'guizhou';
  else if (provinceName.includes('河北')) provinceDir = 'hebei';
  else if (provinceName.includes('河南')) provinceDir = 'hennan';
  else if (provinceName.includes('湖北')) provinceDir = 'hubei';
  else if (provinceName.includes('湖南')) provinceDir = 'hunan';
  else if (provinceName.includes('江西')) provinceDir = 'jiangxi';
  else if (provinceName.includes('辽宁')) provinceDir = 'liaoning';
  else if (provinceName.includes('宁夏')) provinceDir = 'ningxia';
  else if (provinceName.includes('青海')) provinceDir = 'qinghai';
  else if (provinceName.includes('陕西')) provinceDir = 'shaanxi';
  else if (provinceName.includes('山东')) provinceDir = 'shandong';
  else if (provinceName.includes('山西')) provinceDir = 'shanxi';
  else if (provinceName.includes('天津')) provinceDir = 'tianjin';
  else if (provinceName.includes('西藏')) provinceDir = 'xizang';
  else if (provinceName.includes('浙江')) provinceDir = 'zhejiang';
  
  if (!provinceDir) {
    console.log(`⚠️  ${file}: 无法确定省份 (province=${data.province}, region=${data.region})`);
    warn++;
    continue;
  }
  
  // 查找目标文件
  const targetDir = path.join(casesDir, provinceDir);
  if (!fs.existsSync(targetDir)) {
    console.log(`⚠️  ${file}: 目标目录不存在 ${provinceDir}`);
    warn++;
    continue;
  }
  
  const caseId = data.case_id;
  let targetFile = null;
  
  // 按case_id匹配
  if (caseId) {
    const targetFiles = fs.readdirSync(targetDir).filter(f => f.endsWith('.json'));
    for (const tf of targetFiles) {
      const tfPath = path.join(targetDir, tf);
      try {
        const tfData = JSON.parse(fs.readFileSync(tfPath, 'utf8'));
        if (String(tfData.case_id) === String(caseId)) {
          targetFile = tfPath;
          break;
        }
      } catch (e) {}
    }
  }
  
  if (!targetFile) {
    console.log(`⚠️  ${file}: 找不到目标文件 (case_id=${caseId})`);
    warn++;
    continue;
  }
  
  // 读取目标文件
  let targetData;
  try {
    targetData = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
  } catch (e) {
    console.log(`❌ ${file}: 目标文件JSON解析失败`);
    error++;
    continue;
  }
  
  // 提取数据（支持多种格式）
  let updated = false;
  
  // 格式A：扁平结构 (birth, work_start, retirement_date, basic_pension, total)
  // 格式B：嵌套结构 (basic_info.birth_date, work_history.*, pension_breakdown.*)
  
  // 性别
  const gender = data.gender || (data.basic_info && data.basic_info.gender) || '';
  if (gender && (!targetData.gender || targetData.gender === '?' || targetData.gender === '')) {
    targetData.gender = gender;
    updated = true;
  }
  
  // 出生日期
  let birthDate = '';
  if (data.birth && data.birth !== '未明示') birthDate = data.birth;
  if (data.basic_info && data.basic_info.birth_date) birthDate = data.basic_info.birth_date;
  if (birthDate) {
    const m = birthDate.match(/(\d{4})[^\d]?(\d{1,2})/);
    if (m) {
      targetData.birth_year = parseInt(m[1]);
      targetData.birth_month = parseInt(m[2]);
      updated = true;
    }
  }
  
  // 参工日期
  let workDate = '';
  if (data.work_start) workDate = data.work_start;
  if (data.basic_info && data.basic_info.employment_start_date) workDate = data.basic_info.employment_start_date;
  if (workDate) {
    const m = workDate.match(/(\d{4})[^\d]?(\d{1,2})/);
    if (m) {
      targetData.work_year = parseInt(m[1]);
      targetData.work_month = parseInt(m[2]);
      updated = true;
    }
  }
  
  // 退休日期
  let retireDate = '';
  if (data.retirement_date) retireDate = data.retirement_date;
  if (data.basic_info && data.basic_info.retirement_date) retireDate = data.basic_info.retirement_date;
  if (retireDate) {
    const m = retireDate.match(/(\d{4})[^\d]?(\d{1,2})/);
    if (m) {
      targetData.retire_year = parseInt(m[1]);
      targetData.retire_month = parseInt(m[2]);
      updated = true;
    }
  }
  
  // 退休类型
  const retireType = data.retirement_type || (data.basic_info && data.basic_info.retirement_type) || '';
  if (retireType && (!targetData.retire_type || targetData.retire_type === '')) {
    targetData.retire_type = retireType;
    updated = true;
  }
  
  // 计发基数
  let baseNumber = data.base_number || (data.insurance_data && data.insurance_data.base_retire) || (data.calculation_parameters && data.calculation_parameters.pension_base) || 0;
  if (baseNumber && (!targetData.base_number || targetData.base_number === 0)) {
    targetData.base_number = baseNumber;
    updated = true;
  }
  
  // 平均缴费指数
  let avgIndex = data.avg_index || (data.insurance_data && data.insurance_data.avg_index) || (data.calculation_parameters && data.calculation_parameters.average_wage_index) || 0;
  if (avgIndex && (!targetData.avg_index || targetData.avg_index === 0)) {
    targetData.avg_index = avgIndex;
    updated = true;
  }
  
  // 个人账户余额
  let personalAccount = data.personal_account || (data.insurance_data && data.insurance_data.personal_account_balance) || (data.calculation_parameters && data.calculation_parameters.personal_account_balance) || 0;
  if (personalAccount && personalAccount !== '未明示' && (!targetData.personal_account || targetData.personal_account === 0 || targetData.personal_account === '未明示')) {
    targetData.personal_account = personalAccount;
    updated = true;
  }
  
  // 计发月数
  let months = data.months || (data.calculation_parameters && data.calculation_parameters.payment_months) || 0;
  if (months && months !== '未明示' && (!targetData.months || targetData.months === 0 || targetData.months === '未明示')) {
    targetData.months = months;
    updated = true;
  }
  
  // 缴费年限
  if (data.total_years && (!targetData.total_years || targetData.total_years === 0)) {
    targetData.total_years = data.total_years;
    updated = true;
  }
  if (data.sight_years !== undefined && (!targetData.sight_years || targetData.sight_years === 0)) {
    targetData.sight_years = data.sight_years;
    updated = true;
  }
  let actualYears = data.actual_years || (data.work_history && data.work_history.actual_years) || 0;
  if (actualYears && (!targetData.actual_years || targetData.actual_years === 0)) {
    targetData.actual_years = actualYears;
    updated = true;
  }
  
  // 计算结果
  if (!targetData.expected) targetData.expected = {};
  
  // 从多种可能的位置提取计算结果
  let basicPension = data.basic_pension || (data.pension_breakdown && data.pension_breakdown.base_pension) || (data.pension_breakdown && data.pension_breakdown.basic_pension) || 0;
  let personalPension = data.personal_pension || (data.pension_breakdown && data.pension_breakdown.personal_account_pension) || (data.pension_breakdown && data.pension_breakdown.personal_pension) || 0;
  let transitionPension = data.transition_pension || (data.pension_breakdown && data.pension_breakdown.transitional_pension) || (data.pension_breakdown && data.pension_breakdown.transition_pension) || 0;
  let extraPension = data.extra_pension || (data.pension_breakdown && data.pension_breakdown.basic_pension_increase_by_tenure) || (data.pension_breakdown && data.pension_breakdown.extra_pension) || 0;
  let total = data.total || (data.pension_breakdown && data.pension_breakdown.total_pension) || (data.pension_breakdown && data.pension_breakdown.monthly_basic_pension_total) || 0;
  
  if (basicPension && (!targetData.expected.basic_pension || targetData.expected.basic_pension === 0)) {
    targetData.expected.basic_pension = basicPension;
    updated = true;
  }
  if (personalPension && personalPension !== '未明示' && (!targetData.expected.personal_pension || targetData.expected.personal_pension === 0)) {
    targetData.expected.personal_pension = personalPension;
    updated = true;
  }
  if (transitionPension && (!targetData.expected.transition_pension || targetData.expected.transition_pension === 0)) {
    targetData.expected.transition_pension = transitionPension;
    updated = true;
  }
  if (extraPension && (!targetData.expected.extra_pension || targetData.expected.extra_pension === 0)) {
    targetData.expected.extra_pension = extraPension;
    updated = true;
  }
  if (total && (!targetData.expected.total || targetData.expected.total === 0)) {
    targetData.expected.total = total;
    updated = true;
  }
  
  // 验证状态
  if (data.verified !== undefined) {
    targetData.verified = data.verified === true;
    updated = true;
  }
  
  // 保存
  if (updated) {
    fs.writeFileSync(targetFile, JSON.stringify(targetData, null, 2), 'utf8');
    console.log(`✅ ${file} -> ${path.basename(targetFile)}`);
    success++;
  } else {
    console.log(`⚠️  ${file}: 无需更新`);
    warn++;
  }
}

console.log(`\n完成: 成功=${success}, 警告=${warn}, 失败=${error}`);
