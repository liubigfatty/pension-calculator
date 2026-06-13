const fs = require('fs');
const path = require('path');

const casesDir = 'C:/Users/14041/AppData/Roaming/winclaw/.openclaw/workspace/养老金计算平台/cases';

const provinces = [
  'anhui','beijing','fujian','gansu','guangdong','guizhou','hebei','heilongjiang',
  'hennan','hubei','hunan','jiangsu','jiangxi','jilin','liaoning','ningxia',
  'qinghai','shaanxi','shandong','shanghai','shanxi','sichuan','tianjin','xizang',
  'yunnan','zhejiang'
];

function extractCaseInfo(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const j = JSON.parse(content);
  const fileName = path.basename(filePath);
  
  let gender = '', retireType = '', retireAge = '', verified = false;
  let birthYear = 0, birthMonth = 0, retireYear = 0, retireMonth = 0;
  let basicPension = 0, personalPension = 0, transitionPension = 0, total = 0;
  
  // 格式1：扁平结构（beijing/27.json风格）
  if (j.gender !== undefined) gender = j.gender;
  if (j.retirement_type !== undefined) retireType = j.retirement_type;
  if (j.retirement_age !== undefined) retireAge = j.retirement_age;
  if (j.verified !== undefined) verified = j.verified === true;
  
  // 提取日期
  if (j.birth) {
    const m = j.birth.match(/(\d{4})年(\d{1,2})月/);
    if (m) { birthYear = parseInt(m[1]); birthMonth = parseInt(m[2]); }
  }
  if (j.retirement_date) {
    const m = j.retirement_date.match(/(\d{4})年(\d{1,2})月/);
    if (m) { retireYear = parseInt(m[1]); retireMonth = parseInt(m[2]); }
  }
  
  // 提取金额
  if (j.basic_pension !== undefined) basicPension = j.basic_pension;
  if (j.personal_pension !== undefined) personalPension = j.personal_pension;
  if (j.transition_pension !== undefined) transitionPension = j.transition_pension;
  if (j.total !== undefined) total = j.total;
  
  // 格式2：嵌套结构（jilin风格）
  if (j.calculation_parameters) {
    if (!gender && j.calculation_parameters.gender) gender = j.calculation_parameters.gender;
  }
  if (j.pension_breakdown) {
    if (!basicPension && j.pension_breakdown.basic_pension) basicPension = j.pension_breakdown.basic_pension;
    if (!personalPension && j.pension_breakdown.personal_account_pension) personalPension = j.pension_breakdown.personal_account_pension;
    if (!transitionPension && j.pension_breakdown.transitional_pension) transitionPension = j.pension_breakdown.transitional_pension;
    if (!total && j.pension_breakdown.monthly_basic_pension_total) total = j.pension_breakdown.monthly_basic_pension_total;
  }
  
  // 从nested结构提取日期
  if (j.birth_date) {
    const m = j.birth_date.match(/^(\d{4})-(\d{1,2})/);
    if (m) { birthYear = parseInt(m[1]); birthMonth = parseInt(m[2]); }
  }
  if (j.retirement_date) {
    const m = j.retirement_date.match(/^(\d{4})-(\d{1,2})/);
    if (m) { retireYear = parseInt(m[1]); retireMonth = parseInt(m[2]); }
  }
  
  if (j.age_at_retirement && !retireAge) retireAge = j.age_at_retirement + '岁';
  if (j.retirement_type && !retireType) retireType = j.retirement_type;
  
  return {
    province: j.province || j.region || path.basename(path.dirname(filePath)),
    file: fileName,
    gender: String(gender).replace(/[男Mm]/, '男').replace(/[女Ff]/, '女') || '?',
    retireType,
    retireAge: String(retireAge),
    birthYear, birthMonth, retireYear, retireMonth,
    basicPension, personalPension, transitionPension, total,
    verified,
    hasData: (basicPension > 0 || total > 0)
  };
}

const results = [];

for (const province of provinces) {
  const dir = path.join(casesDir, province);
  if (!fs.existsSync(dir)) continue;
  
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const filePath = path.join(dir, file);
    try {
      const info = extractCaseInfo(filePath);
      results.push(info);
    } catch (e) {
      results.push({ province, file, gender: '?', retireType: '?', retireAge: '?', verified: false, hasData: false, error: e.message });
    }
  }
}

// 按省份分组输出
const byProvince = {};
for (const r of results) {
  const p = r.province;
  if (!byProvince[p]) byProvince[p] = [];
  byProvince[p].push(r);
}

console.log('='.repeat(100));
console.log('完整31省案例分布清单（含性别、退休年龄、验证状态）');
console.log('='.repeat(100));

for (const province of Object.keys(byProvince).sort()) {
  const cases = byProvince[province];
  console.log(`\n【${province}】(${cases.length}个文件)`);
  console.log('  文件 | 性别 | 退休年龄 | 退休类型 | 总金额 | 已验证 | 有数据');
  for (const c of cases) {
    const totalStr = c.total > 0 ? c.total.toFixed(2) : '-';
    const dataStr = c.hasData ? '✅' : '❌';
    const verifiedStr = c.verified ? '✅' : '❌';
    console.log(`  ${c.file} | ${c.gender} | ${c.retireAge} | ${c.retireType} | ${totalStr} | ${verifiedStr} | ${dataStr}`);
  }
}

// 统计
console.log('\n' + '='.repeat(100));
console.log('统计：');
const totalFiles = results.length;
const verifiedFiles = results.filter(r => r.verified).length;
const hasDataFiles = results.filter(r => r.hasData).length;
const maleCount = results.filter(r => r.gender === '男').length;
const femaleCount = results.filter(r => r.gender === '女').length;
console.log(`总文件数: ${totalFiles}`);
console.log(`已验证: ${verifiedFiles}`);
console.log(`有计算数据: ${hasDataFiles}`);
console.log(`男职工: ${maleCount}`);
console.log(`女职工: ${femaleCount}`);
console.log('='.repeat(100));
