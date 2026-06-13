const fs = require('fs');
const path = require('path');

const casesDir = 'C:/Users/14041/AppData/Roaming/winclaw/.openclaw/workspace/养老金计算平台/cases';
const otherDir = path.join(casesDir, 'other');

const files = fs.readdirSync(otherDir).filter(f => f.endsWith('.json'));
console.log(`检查 ${files.length} 个文件的数据内容...\n`);

for (const file of files) {
  const filePath = path.join(otherDir, file);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.log(`❌ ${file}: 不是有效JSON`);
    continue;
  }
  
  // 提取总金额（从多种可能的位置）
  let total = 0;
  if (data.total > 0) total = data.total;
  else if (data.pension_breakdown && data.pension_breakdown.total_pension > 0) total = data.pension_breakdown.total_pension;
  else if (data.pension_breakdown && data.pension_breakdown.monthly_basic_pension_total > 0) total = data.pension_breakdown.monthly_basic_pension_total;
  else if (data.养老金分项 && data.养老金分项.待遇合计 > 0) total = data.养老金分项.待遇合计;
  else if (data.养老金分项 && data.养老金分项.基础养老金 > 0) total = data.养老金分项.基础养老金; // 可能需要加总
  
  // 提取省份
  let province = data.province || data.region || data.地区 || '';
  
  // 提取case_id
  let caseId = data.case_id || data.案例编号 || '';
  
  // 判断是否有实质数据
  const hasData = total > 0 || (data.pension_breakdown && Object.values(data.pension_breakdown).some(v => v > 0)) || (data.养老金分项 && Object.values(data.养老金分项).some(v => v > 0));
  
  if (hasData) {
    console.log(`✅ ${file}: 有数据, total=${total}, province=${province}, case_id=${caseId}`);
  } else {
    console.log(`⚠️  ${file}: 无数据, province=${province}, case_id=${caseId}`);
  }
}
