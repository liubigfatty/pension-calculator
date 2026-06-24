// 最终修复：精准替换 avg_salary_history 块（只用字符串操作）
const fs = require('fs');
const path = require('path');

const jsonDir = 'provinces';
const jsDir = 'cloudfunctions/calculate/provinces';

const jsonFiles = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'));

console.log('=== 最终修复：替换 avg_salary_history 块 ===');
console.log('');

let successCount = 0;
let errorCount = 0;

jsonFiles.forEach(f => {
  const prov = f.replace('.json', '');
  const jsonPath = path.join(jsonDir, f);
  const jsPath = path.join(jsDir, prov + '.js');

  if (!fs.existsSync(jsPath)) {
    console.log(`⚠️  ${prov}: .js 文件不存在，跳过`);
    return;
  }

  try {
    // 1. 读取 .json 数据
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (!jsonData.avg_salary_history) {
      console.log(`⚠️  ${prov}: .json 里也没有 avg_salary_history，跳过`);
      return;
    }

    // 2. 生成正确格式的 avg_salary_history 字符串（缩进4空格）
    const avgDataStr = JSON.stringify(jsonData.avg_salary_history, null, 2);
    const indented = avgDataStr.split('\n').map((line, i) => '    ' + line).join('\n');

    // 3. 读取 .js 文件
    let jsContent = fs.readFileSync(jsPath, 'utf8');

    // 4. 找到 avg_salary_history: 的位置
    const idx = jsContent.indexOf('avg_salary_history:');
    if (idx === -1) {
      // 没有 avg_salary_history，需要插入到 return { 里
      // 找到 return { 里的 base_rates 块，在它后面插入
      const baseRatesIdx = jsContent.indexOf('base_rates:');
      if (baseRatesIdx === -1) {
        console.log(`❌ ${prov}: 无法找到插入位置`);
        errorCount++;
        return;
      }
      // 找到 base_rates 对应的结束 }
      let braceCount = 0;
      let baseEnd = baseRatesIdx;
      let inBase = false;
      for (let i = baseRatesIdx; i < jsContent.length; i++) {
        if (jsContent[i] === '{') { braceCount++; inBase = true; }
        if (jsContent[i] === '}') { braceCount--; }
        if (inBase && braceCount === 0) { baseEnd = i; break; }
      }
      // 在 base_rates 块结束后插入 avg_salary_history
      const before = jsContent.substring(0, baseEnd + 1);
      const after = jsContent.substring(baseEnd + 1);
      jsContent = before + ',\n    avg_salary_history: ' + indented + ',' + after;
      fs.writeFileSync(jsPath, jsContent, 'utf8');
      console.log(`✅ ${prov}: 已插入 avg_salary_history (${Object.keys(jsonData.avg_salary_history).length}年)`);
      successCount++;
      return;
    }

    // 5. 找到 avg_salary_history: 对应的结束 }
    let braceCount = 0;
    let endIdx = idx;
    let started = false;
    for (let i = idx; i < jsContent.length; i++) {
      if (jsContent[i] === '{') { braceCount++; started = true; }
      if (jsContent[i] === '}') { braceCount--; }
      if (started && braceCount === 0) { endIdx = i; break; }
    }

    // 6. 删除旧的块（从 idx 到 endIdx）
    // 往前找到换行符（整行删除）
    let deleteStart = idx;
    while (deleteStart > 0 && jsContent[deleteStart] !== '\n') deleteStart--;
    deleteStart++; // 跳过换行符，从下一行开头开始

    let deleteEnd = endIdx + 1;
    // 往后跳过逗号和空白
    while (deleteEnd < jsContent.length && (jsContent[deleteEnd] === ',' || jsContent[deleteEnd] === ' ' || jsContent[deleteEnd] === '\n')) deleteEnd++;

    // 7. 插入正确的数据
    const before = jsContent.substring(0, deleteStart);
    const after = jsContent.substring(deleteEnd);
    const newBlock = '    avg_salary_history: ' + indented;
    jsContent = before + newBlock + ',\n' + after;

    fs.writeFileSync(jsPath, jsContent, 'utf8');
    console.log(`✅ ${prov}: 已替换 avg_salary_history (${Object.keys(jsonData.avg_salary_history).length}年)`);
    successCount++;

  } catch (e) {
    console.log(`❌ ${prov}: 错误 - ${e.message}`);
    errorCount++;
  }
});

console.log('');
console.log('=== 汇总 ===');
console.log(`成功: ${successCount}/${jsonFiles.length}`);
console.log(`失败: ${errorCount}/${jsonFiles.length}`);
