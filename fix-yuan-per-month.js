const fs = require('fs');

// 江西作为基准（已知正确，元/年）
const jxConfig = require('./cloudfunctions/calculate/provinces/jiangxi.js').getEngineConfig();
const jxAvg = jxConfig.avg_salary_history || {};

const dir = 'cloudfunctions/calculate/provinces';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'template.js');

let fixedCount = 0;
const fixReport = [];

for (const file of files) {
  const prov = file.replace('.js', '');
  
  let jsContent = fs.readFileSync(dir + '/' + file, 'utf8');
  
  // 找到 avg_salary_history 对象的位置
  const avgStartIdx = jsContent.indexOf('avg_salary_history:');
  if (avgStartIdx === -1) continue;
  
  // 用花括号计数法找到对象结束位置
  let braceCount = 0;
  let objStart = -1, objEnd = -1;
  let inString = false;
  let stringChar = '';
  
  for (let i = avgStartIdx; i < jsContent.length; i++) {
    const c = jsContent[i];
    if (!inString) {
      if (c === '"' || c === "'") { inString = true; stringChar = c; continue; }
      if (c === '{') { if (objStart === -1) objStart = i; braceCount++; }
      if (c === '}') { braceCount--; if (braceCount === 0) { objEnd = i; break; } }
    } else {
      if (c === stringChar && jsContent[i-1] !== '\\') inString = false;
    }
  }
  
  if (objStart === -1 || objEnd === -1) continue;
  
  // 提取对象内容并解析
  const objStr = jsContent.substring(objStart, objEnd + 1);
  let data;
  try { data = eval('(' + objStr + ')'); } catch(e) { console.log(prov + ': 解析失败, 跳过'); continue; }
  
  // 检查每个年份的值是否偏低（和江西比值<0.65，说明可能是元/月）
  let needsFix = false;
  let fixedYears = 0;
  const yearKeys = Object.keys(data).filter(k => /^\d{4}$/.test(k)).map(Number);
  
  for (const y of yearKeys) {
    const val = data[y];
    const jxVal = jxAvg[y];
    if (!jxVal || !val || val <= 0) continue;
    const ratio = val / jxVal;
    
    // 如果比值 < 0.65 且 > 0.05（排除完全错误的数据），且数值<20000 → 元/月
    if (ratio < 0.65 && ratio > 0.05 && val < 20000) {
      data[y] = Math.round(val * 12);
      needsFix = true;
      fixedYears++;
    }
  }
  
  if (needsFix) {
    // 生成新的对象字符串
    let newObjStr = '    {\n';
    for (const [k, v] of Object.entries(data)) {
      if (k === '_source') {
        newObjStr += '      "_source": "' + v + '"\n';
      } else {
        newObjStr += '      "' + k + '": ' + v + ',\n';
      }
    }
    newObjStr += '    }';
    
    // 替换原对象
    jsContent = jsContent.substring(0, objStart) + newObjStr + jsContent.substring(objEnd + 1);
    fs.writeFileSync(dir + '/' + file, jsContent, 'utf8');
    
    fixReport.push({ prov: prov, fixedYears });
    fixedCount++;
    
    // 验证语法
    try {
      require('vm').compileFunction(jsContent, []);
    } catch(e) {
      console.log(prov + ': ⚠️ 修复后语法错误! ' + e.message.substring(0, 60));
    }
  }
}

console.log('\n========== 批量修复结果 ==========');
console.log('共修复 ' + fixedCount + ' 个省份：\n');
for (const r of fixReport) {
  console.log('  ✅ ' + r.prov + ': 修复了 ' + r.fixedYears + ' 年份数据(×12)');
}

// 验证：重新跑对比
console.log('\n========== 修复后验证 ==========\n');
for (const r of fixReport) {
  delete require.cache[require.resolve('./' + dir + '/' + r.prov + '.js')];
  const cfg = require('./' + dir + '/' + r.prov + '.js').getEngineConfig();
  const avg = cfg.avg_salary_history || {};
  
  let sumRatio = 0, count = 0;
  for (let y = 1998; y <= 2025; y++) {
    const pv = avg[y], jv = jxAvg[y];
    if (!pv || !jv) continue;
    sumRatio += pv / jv; count++;
  }
  const avgR = sumRatio / count;
  const status = avgR >= 0.7 ? '✅ 合理' : '⚠️ 仍然偏低';
  console.log(r.prov.padEnd(14) + ' 平均比值: ' + avgR.toFixed(3) + '  ' + status);
}
