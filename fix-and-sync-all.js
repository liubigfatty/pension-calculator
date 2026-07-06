const fs = require('fs');

// ========== 第一步：修复 .json 文件中的元/月数据 ==========
console.log('========== 第一步：检查并修复 .json 文件 ==========\n');

const jxJSON = JSON.parse(fs.readFileSync('provinces/jiangxi.json', 'utf8'));
const jxAvg = jxJSON.avg_salary_history || {};

const jsonDir = 'provinces';
const jsonFiles = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'));

let jsonFixedCount = 0;
const jsonFixReport = [];

for (const file of jsonFiles) {
  const prov = file.replace('.json', '');
  if (prov === 'jiangxi') continue; // 跳过基准
  
  const jsonPath = jsonDir + '/' + file;
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  if (!data.avg_salary_history) continue;
  
  let needsFix = false;
  let fixedYears = 0;
  
  for (const [y, v] of Object.entries(data.avg_salary_history)) {
    if (!/^\d{4}$/.test(y)) continue;
    const val = Number(v);
    const jxVal = jxAvg[y];
    if (!jxVal || !val || val <= 0) continue;
    
    const ratio = val / jxVal;
    // 元/月特征：比值 < 0.65, > 0.05, 且数值 < 20000
    if (ratio < 0.65 && ratio > 0.05 && val < 20000) {
      data.avg_salary_history[y] = Math.round(val * 12);
      needsFix = true;
      fixedYears++;
    }
  }
  
  if (needsFix) {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
    jsonFixReport.push({ prov, fixedYears });
    jsonFixedCount++;
  }
}

console.log('修复了 ' + jsonFixedCount + ' 个 .json 文件：\n');
for (const r of jsonFixReport) {
  console.log('  ✅ ' + r.prov.padEnd(14) + ': ' + r.fixedYears + ' 年份 ×12');
}

// ========== 第二步：同步 .json 到 .js 文件的 getEngineConfig() ==========
console.log('\n========== 第二步：同步到 .js 文件 ==========\n');

const jsDir = 'cloudfunctions/calculate/provinces';
const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js') && f !== 'template.js');

let syncedCount = 0;
let skippedNoData = 0;
const syncReport = [];

for (const file of jsFiles) {
  const prov = file.replace('.js', '');
  const jsPath = jsDir + '/' + file;
  let jsContent = fs.readFileSync(jsPath, 'utf8');
  
  // 读取对应的 .json 数据
  const jsonPath = 'provinces/' + prov + '.json';
  if (!fs.existsSync(jsonPath)) { skippedNoData++; continue; }
  
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const avgSalary = jsonData.avg_salary_history;
  if (!avgSalary || Object.keys(avgSalary).length === 0) { skippedNoData++; continue; }
  
  // 找到 return { 在 getEngineConfig 函数内的位置
  const funcIdx = jsContent.indexOf('function getEngineConfig()');
  if (funcIdx === -1) { console.log(prov + ': 无 getEngineConfig'); continue; }
  
  // 找 return { （在函数内第一个）
  const returnSearchStart = funcIdx;
  const returnIdx = jsContent.indexOf('  return {', returnSearchStart);
  if (returnIdx === -1) { 
    // 尝试其他格式
    const returnIdx2 = jsContent.indexOf('return {', returnSearchStart);
    if (returnIdx2 === -1) { console.log(prov + ': 无 return'); continue; }
  }
  const actualReturnIdx = returnIdx !== -1 ? returnIdx : jsContent.indexOf('return {', returnSearchStart);
  
  // 生成 avg_salary_history 字段字符串
  let avgStr = '\n    avg_salary_history: {\n';
  for (const [k, v] of Object.entries(avgSalary)) {
    if (k === '_source') {
      avgStr += '      "_source": "' + v + '",\n';
    } else {
      avgStr += '      "' + k + '": ' + v + ',\n';
    }
  }
  avgStr += '    },';
  
  // 判断文件是否已有 avg_salary_history
  if (jsContent.includes('avg_salary_history')) {
    // 替换已有的
    // 用更精确的方式：找到 "avg_salary_history: {" 到对应 "}" 的范围
    // 但为了安全，直接用整块替换
    const oldAvgPattern = /avg_salary_history:\s*\{[^}]+\}/;
    const newContent = jsContent.replace(oldAvgPattern, avgStr.trim());
    if (newContent !== jsContent) {
      jsContent = newContent;
      fs.writeFileSync(jsPath, jsContent, 'utf8');
      syncReport.push({ prov: prov, action: '替换' });
      syncedCount++;
    } else {
      syncReport.push({ prov: prov, action: '匹配失败' });
    }
  } else {
    // 新增：插入到 return { 后面的第一个字段前
    const insertPos = actualReturnIdx + '  return {'.length;
    jsContent = jsContent.substring(0, insertPos) + avgStr + jsContent.substring(insertPos);
    fs.writeFileSync(jsPath, jsContent, 'utf8');
    syncReport.push({ prov: prov, action: '新增' });
    syncedCount++;
  }
}

console.log('处理结果：\n');
console.log('  同步成功: ' + syncedCount);
console.log('  跳过(无数据): ' + skippedNoData);

// ========== 第三步：验证语法 ==========
console.log('\n========== 第三步：语法验证 ==========\n');
let pass = 0, fail = 0;
const failFiles = [];
for (const file of jsFiles) {
  try {
    require('vm').compileFunction(
      fs.readFileSync(jsDir + '/' + file, 'utf8'), []
    );
    pass++;
  } catch(e) {
    fail++;
    failFiles.push(file.replace('.js','') + ': ' + e.message.substring(0,50));
  }
}
console.log('通过: ' + pass + '/31  失败: ' + fail);
if (failFiles.length > 0) {
  console.log('\n失败详情:');
  for (const f of failFiles) console.log('  ❌ ' + f);
}
