const fs = require('fs');

// 江西作为基准（已知正确，元/年）
const jxConfig = require('./cloudfunctions/calculate/provinces/jiangxi.js').getEngineConfig();
const jxAvg = jxConfig.avg_salary_history || {};

const dir = 'cloudfunctions/calculate/provinces';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'template.js');

let fixedCount = 0;
const fixReport = [];
const skipProv = ['jiangxi', 'qinghai', 'ningxia']; // 已验证正确的跳过

for (const file of files) {
  const prov = file.replace('.js', '');
  if (skipProv.includes(prov)) continue;
  
  let jsContent = fs.readFileSync(dir + '/' + file, 'utf8');
  
  // 检查是否有 avg_salary_history
  if (!jsContent.includes('avg_salary_history')) continue;
  
  // 先提取所有 "YYYY": NNNNN 模式的数值
  const yearPattern = /"(\d{4})":\s*(\d+\.?\d*)/g;
  let match;
  const yearValues = {};
  while ((match = yearPattern.exec(jsContent)) !== null) {
    const y = match[1];
    const v = parseFloat(match[2]);
    // 只在 avg_salary_history 区域内的才记录
    const avgIdx = jsContent.indexOf('avg_salary_history');
    if (match.index > avgIdx) {
      // 简单判断：在 avg_salary_history 之后、下一个顶层字段之前
      yearValues[y] = { value: v, pos: match.index, fullMatch: match[0] };
    }
  }
  
  let needsFix = false;
  const replacements = []; // {oldStr, newStr}
  
  for (const [y, info] of Object.entries(yearValues)) {
    const val = info.value;
    const jxVal = jxAvg[parseInt(y)];
    if (!jxVal || !val || val <= 0) continue;
    
    const ratio = val / jxVal;
    
    // 判断条件：比值 < 0.65 且 > 0.05，且数值 < 20000 → 元/月
    if (ratio < 0.65 && ratio > 0.05 && val < 20000) {
      const newVal = Math.round(val * 12);
      const oldStr = info.fullMatch;
      const newStr = '"' + y + '": ' + newVal;
      replacements.push({ oldStr, newStr });
      needsFix = true;
    }
  }
  
  if (needsFix && replacements.length > 0) {
    // 执行替换（从后往前替换，避免位置偏移）
    replacements.sort((a, b) => 
      jsContent.lastIndexOf(a.oldStr) - jsContent.lastIndexOf(b.oldStr)
    );
    
    // 实际上应该按位置从后往前
    const sorted = [...replacements].sort((a, b) => 
      jsContent.lastIndexOf(a.oldStr) - jsContent.lastIndexOf(b.oldStr)
    );
    
    for (const r of sorted) {
      jsContent = jsContent.replace(r.oldStr, r.newStr);
    }
    
    fs.writeFileSync(dir + '/' + file, jsContent, 'utf8');
    fixReport.push({ prov: prov, fixedYears: replacements.length });
    fixedCount++;
  }
}

console.log('========== 批量修复结果（只改数值不改结构）=========\n');
console.log('共修复 ' + fixedCount + ' 个省份：\n');
for (const r of fixReport) {
  console.log('  ✅ ' + r.prov.padEnd(14) + ': 修复了 ' + r.fixedYears + ' 年份(×12)');
}

// 验证语法
console.log('\n========== 语法验证 ==========\n');
let syntaxOk = 0, syntaxErr = 0;
const errFiles = [];
for (const file of files) {
  const result = require('child_process').spawnSync(
    process.execPath, ['-c', dir + '/' + file],
    { encoding: 'utf8' }
  );
  if (result.status === 0) syntaxOk++; else { syntaxErr++; errFiles.push(file); }
}
console.log('通过: ' + syntaxOk + '/31  失败: ' + syntaxErr);
if (errFiles.length > 0) console.log('失败文件: ' + errFiles.join(', '));
