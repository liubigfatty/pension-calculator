const fs = require('fs');
const path = require('path');

const casesDir = 'C:/Users/14041/AppData/Roaming/winclaw/.openclaw/workspace/养老金计算平台/cases';

// 读取other目录的所有文件
const otherDir = path.join(casesDir, 'other');
const files = fs.readdirSync(otherDir).filter(f => f.endsWith('.json'));

console.log(`找到 ${files.length} 个文件在other目录，开始迁移数据...\n`);

const results = [];

for (const file of files) {
  const filePath = path.join(otherDir, file);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    results.push({ file, status: '❌ JSON解析失败', error: e.message });
    continue;
  }
  
  // 确定省份目录名
  const provinceMap = {
    '上海市': 'shanghai', '上海': 'shanghai',
    '云南省': 'yunnan', '云南': 'yunnan',
    '甘肃省': 'gansu', '甘肃': 'gansu',
    '北京市': 'beijing', '北京': 'beijing',
    '江苏省': 'jiangsu', '江苏': 'jiangsu',
    '四川省': 'sichuan', '四川': 'sichuan',
    '吉林省': 'jilin', '吉林': 'jilin',
    '黑龙江省': 'heilongjiang', '黑龙江': 'heilongjiang',
    '安徽省': 'anhui', '安徽': 'anhui',
    '福建省': 'fujian', '福建': 'fujian',
    '广东省': 'guangdong', '广东': 'guangdong',
    '贵州省': 'guizhou', '贵州': 'guizhou',
    '河北省': 'hebei', '河北': 'hebei',
    '河南省': 'hennan', '河南': 'hennan',
    '湖北省': 'hubei', '湖北': 'hubei',
    '湖南省': 'hunan', '湖南': 'hunan',
    '江西省': 'jiangxi', '江西': 'jiangxi',
    '辽宁省': 'liaoning', '辽宁': 'liaoning',
    '宁夏': 'ningxia', '宁夏回族自治区': 'ningxia',
    '青海省': 'qinghai', '青海': 'qinghai',
    '陕西省': 'shaanxi', '陕西': 'shaanxi',
    '山东省': 'shandong', '山东': 'shandong',
    '山西省': 'shanxi', '山西': 'shanxi',
    '天津市': 'tianjin', '天津': 'tianjin',
    '西藏自治区': 'xizang', '西藏': 'xizang',
    '浙江省': 'zhejiang', '浙江': 'zhejiang'
  };
  
  const provinceName = data.province || data.region || '';
  let provinceDir = '';
  for (const [key, val] of Object.entries(provinceMap)) {
    if (provinceName.includes(key.replace('省', '').replace('市', '').replace('自治区', ''))) {
      provinceDir = val;
      break;
    }
  }
  
  if (!provinceDir) {
    results.push({ file, status: '⚠️ 无法确定省份', province: provinceName });
    continue;
  }
  
  // 在省份目录中查找对应文件
  const targetDir = path.join(casesDir, provinceDir);
  if (!fs.existsSync(targetDir)) {
    results.push({ file, status: '⚠️ 目标目录不存在', provinceDir });
    continue;
  }
  
  // 尝试匹配文件（按case_id或文件名）
  const caseId = data.case_id;
  let targetFile = null;
  
  if (caseId) {
    // 查找包含case_id的文件
    const targetFiles = fs.readdirSync(targetDir).filter(f => f.endsWith('.json'));
    for (const tf of targetFiles) {
      const tfPath = path.join(targetDir, tf);
      try {
        const tfData = JSON.parse(fs.readFileSync(tfPath, 'utf8'));
        if (tfData.case_id == caseId) {
          targetFile = tfPath;
          break;
        }
      } catch (e) {}
    }
  }
  
  if (!targetFile) {
    // 按文件名匹配（如 25.json）
    const baseName = file.replace(/\.json$/, '');
    const possibleNames = [
      `${caseId}.json`,
      `${baseName}.json`,
      file
    ];
    for (const name of possibleNames) {
      const p = path.join(targetDir, name);
      if (fs.existsSync(p)) {
        targetFile = p;
        break;
      }
    }
  }
  
  if (!targetFile) {
    results.push({ file, status: '⚠️ 找不到目标文件', provinceDir, caseId });
    continue;
  }
  
  // 读取目标文件
  let targetData;
  try {
    targetData = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
  } catch (e) {
    results.push({ file, status: '❌ 目标文件JSON解析失败', targetFile });
    continue;
  }
  
  // 迁移数据：从other格式转换到标准格式
  // other格式: birth, work_start, retirement_date, basic_pension, total
  // 标准格式: birth_year, birth_month, work_year, work_month, retire_year, retire_month, expected.*
  
  let updated = false;
  
  // 迁移性别
  if (data.gender && (!targetData.gender || targetData.gender === '?')) {
    targetData.gender = data.gender;
    updated = true;
  }
  
  // 迁移出生日期
  if (data.birth && data.birth !== '未明示') {
    const m = data.birth.match(/(\d{4})年(\d{1,2})月/);
    if (m) {
      targetData.birth_year = parseInt(m[1]);
      targetData.birth_month = parseInt(m[2]);
      updated = true;
    }
  }
  
  // 迁移参工日期
  if (data.work_start) {
    const m = data.work_start.match(/(\d{4})年(\d{1,2})月/);
    if (m) {
      targetData.work_year = parseInt(m[1]);
      targetData.work_month = parseInt(m[2]);
      updated = true;
    }
  }
  
  // 迁移退休日期
  if (data.retirement_date) {
    const m = data.retirement_date.match(/(\d{4})年(\d{1,2})月/);
    if (m) {
      targetData.retire_year = parseInt(m[1]);
      targetData.retire_month = parseInt(m[2]);
      updated = true;
    }
  }
  
  // 迁移退休类型
  if (data.retirement_type && (!targetData.retire_type || targetData.retire_type === '')) {
    targetData.retire_type = data.retirement_type;
    updated = true;
  }
  
  // 迁移计算参数
  if (data.base_number && (!targetData.base_number || targetData.base_number === 0)) {
    targetData.base_number = data.base_number;
    updated = true;
  }
  if (data.avg_index && (!targetData.avg_index || targetData.avg_index === 0)) {
    targetData.avg_index = data.avg_index;
    updated = true;
  }
  if (data.personal_account && data.personal_account !== '未明示' && (!targetData.personal_account || targetData.personal_account === 0)) {
    targetData.personal_account = data.personal_account;
    updated = true;
  }
  if (data.months && data.months !== '未明示' && (!targetData.months || targetData.months === 0)) {
    targetData.months = data.months;
    updated = true;
  }
  
  // 迁移缴费年限
  if (data.total_years && (!targetData.total_years || targetData.total_years === 0)) {
    targetData.total_years = data.total_years;
    updated = true;
  }
  if (data.sight_years !== undefined && (!targetData.sight_years || targetData.sight_years === 0)) {
    targetData.sight_years = data.sight_years;
    updated = true;
  }
  if (data.actual_years && (!targetData.actual_years || targetData.actual_years === 0)) {
    targetData.actual_years = data.actual_years;
    updated = true;
  }
  
  // 迁移计算结果
  if (!targetData.expected) targetData.expected = {};
  if (data.basic_pension && (!targetData.expected.basic_pension || targetData.expected.basic_pension === 0)) {
    targetData.expected.basic_pension = data.basic_pension;
    updated = true;
  }
  if (data.personal_pension && data.personal_pension !== '未明示' && (!targetData.expected.personal_pension || targetData.expected.personal_pension === 0)) {
    targetData.expected.personal_pension = data.personal_pension;
    updated = true;
  }
  if (data.transition_pension && (!targetData.expected.transition_pension || targetData.expected.transition_pension === 0)) {
    targetData.expected.transition_pension = data.transition_pension;
    updated = true;
  }
  if (data.extra_pension !== undefined && (!targetData.expected.extra_pension || targetData.expected.extra_pension === 0)) {
    targetData.expected.extra_pension = data.extra_pension;
    updated = true;
  }
  if (data.total && (!targetData.expected.total || targetData.expected.total === 0)) {
    targetData.expected.total = data.total;
    updated = true;
  }
  
  // 迁移验证状态
  if (data.verified !== undefined) {
    targetData.verified = data.verified;
    updated = true;
  }
  
  // 迁移备注
  if (data.notes && (!targetData.notes || targetData.notes === '')) {
    targetData.notes = data.notes;
    updated = true;
  }
  
  // 保存
  if (updated) {
    fs.writeFileSync(targetFile, JSON.stringify(targetData, null, 2), 'utf8');
    results.push({ file, status: '✅ 已更新', targetFile });
  } else {
    results.push({ file, status: '⚠️ 无需更新', targetFile });
  }
}

console.log('\n迁移结果：');
console.log('文件 | 状态 | 目标文件');
for (const r of results) {
  console.log(`${r.file} | ${r.status} | ${r.targetFile || r.province || ''}`);
}

const success = results.filter(r => r.status.startsWith('✅')).length;
const warn = results.filter(r => r.status.startsWith('⚠')).length;
const error = results.filter(r => r.status.startsWith('❌')).length;
console.log(`\n总计：${results.length}个文件，成功：${success}，警告：${warn}，失败：${error}`);
