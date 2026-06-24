// 修复所有省份 .js 里的 avg_salary_history 块（删除后重新插入）
const fs = require('fs');
const path = require('path');

const jsonDir = 'provinces';
const jsDir = 'cloudfunctions/calculate/provinces';

const jsonFiles = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'));

console.log('=== 重新插入所有省份的 avg_salary_history（强制覆盖） ===');
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
    // 读取 .json 数据
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (!jsonData.avg_salary_history) {
      console.log(`⚠️  ${prov}: .json 也没有 avg_salary_history，跳过`);
      return;
    }

    // 读取 .js 文件
    let jsContent = fs.readFileSync(jsPath, 'utf8');

    // === 步骤1：删除已有的 avg_salary_history 块 ===
    const avgIdx = jsContent.indexOf('avg_salary_history:');
    if (avgIdx !== -1) {
      // 找到对应的结束 }（匹配花括号）
      let braceCount = 0;
      let endIdx = avgIdx;
      let started = false;
      for (let i = avgIdx; i < jsContent.length; i++) {
        if (jsContent[i] === '{') { braceCount++; started = true; }
        if (jsContent[i] === '}') { braceCount--; }
        if (started && braceCount === 0) { endIdx = i; break; }
      }

      // 往前找到逗号或换行（删除整行）
      let deleteStart = avgIdx;
      while (deleteStart > 0 && jsContent[deleteStart] !== '\n') deleteStart--;
      if (jsContent[deleteStart] === '\n') deleteStart++; // 跳过换行符，从下一行开头开始

      // 往后跳过逗号和空白
      let deleteEnd = endIdx + 1;
      while (deleteEnd < jsContent.length && (jsContent[deleteEnd] === ',' || jsContent[deleteEnd] === ' ' || jsContent[deleteEnd] === '\n')) deleteEnd++;

      jsContent = jsContent.substring(0, deleteStart) + jsContent.substring(deleteEnd);
      console.log(`  ${prov}: 已删除旧的 avg_salary_history 块`);
    }

    // === 步骤2：在 getEngineConfig() 的 return 块里插入正确的数据 ===
    // 构造格式化的 avg_salary_history 字符串
    const avgDataStr = JSON.stringify(jsonData.avg_salary_history, null, 2);
    const indented = avgDataStr.split('\n').map((line, i) => '    ' + line).join('\n');

    // 在 return { 里找到插入点：在 base_rates 块结束后、modules 前插入
    // 策略：找到 "    },\n    modules:" 这个模式
    const target = '    },\n    modules:';
    const insertStr = '    },\n    avg_salary_history: ' + indented + ',\n    modules:';

    const result = jsContent.replace(target, insertStr);

    if (result === jsContent) {
      // 备用策略：在 return { 里找到 notes: 前面插入
      const target2 = '    notes:';
      const insertStr2 = '    avg_salary_history: ' + indented + ',\n\n    notes:';
      const result2 = jsContent.replace(target2, insertStr2);
      if (result2 === jsContent) {
        console.log(`❌ ${prov}: 无法找到插入位置，需手动处理`);
        errorCount++;
        return;
      }
      fs.writeFileSync(jsPath, result2, 'utf8');
    } else {
      fs.writeFileSync(jsPath, result, 'utf8');
    }

    console.log(`✅ ${prov}: 已重新插入 avg_salary_history (${Object.keys(jsonData.avg_salary_history).length}年)`);
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
