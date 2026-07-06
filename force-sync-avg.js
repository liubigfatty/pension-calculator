// 强制重新同步 avg_salary_history 从 .json 到 .js（替换已存在的）
const fs = require('fs');
const path = require('path');

const jsonDir = 'provinces';
const jsDir = 'cloudfunctions/calculate/provinces';

const jsonFiles = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'));

console.log('=== 强制重新同步（替换模式）===');
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
      console.log(`⚠️  ${prov}: .json 里也没有 avg_salary_history，跳过`);
      return;
    }

    // 读取 .js 文件
    let jsContent = fs.readFileSync(jsPath, 'utf8');

    // 构造要插入的字符串（正确缩进）
    const avgDataStr = JSON.stringify(jsonData.avg_salary_history, null, 2);
    const indented = avgDataStr.split('\n').map((line, i) => '    ' + line).join('\n');

    // 删除已有的 avg_salary_history 块（如果有）
    // 查找 "avg_salary_history:" 的位置
    const idx = jsContent.indexOf('avg_salary_history:');
    if (idx !== -1) {
      // 找到对应的结束 }（从 idx 开始，匹配花括号）
      let braceCount = 0;
      let endIdx = idx;
      let started = false;
      for (let i = idx; i < jsContent.length; i++) {
        if (jsContent[i] === '{') { braceCount++; started = true; }
        if (jsContent[i] === '}') { braceCount--; }
        if (started && braceCount === 0) { endIdx = i; break; }
      }
      // 删除从 idx 到 endIdx 的内容（包括前面的空格和后面的逗号）
      let deleteStart = idx;
      // 往前找到换行符
      while (deleteStart > 0 && jsContent[deleteStart] !== '\n') deleteStart--;
      deleteStart++; // 跳过换行符
      let deleteEnd = endIdx + 1;
      // 往后跳过逗号和空白
      while (deleteEnd < jsContent.length && (jsContent[deleteEnd] === ',' || jsContent[deleteEnd] === ' ' || jsContent[deleteEnd] === '\n')) deleteEnd++;

      jsContent = jsContent.substring(0, deleteStart) + jsContent.substring(deleteEnd);
    }

    // 现在插入到 getEngineConfig() 的 return 块里（在 base_rates 后面）
    // 找到 "base_rates:" 所在行，在它后面不远处的 "}," 之后插入
    const insertPoint = jsContent.indexOf('    base_rates:');
    if (insertPoint === -1) {
      console.log(`❌ ${prov}: 无法找到插入点，需手动处理`);
      errorCount++;
      return;
    }

    // 在 base_rates 块结束后（找到对应的 }）插入
    // 简单策略：在 "base_rates: { ... }," 之后插入
    const afterBase = jsContent.indexOf('    },\n', insertPoint);
    if (afterBase === -1) {
      console.log(`❌ ${prov}: 无法找到 base_rates 结束位置`);
      errorCount++;
      return;
    }

    const insertPos = afterBase + '    },\n'.length;
    const before = jsContent.substring(0, insertPos);
    const after = jsContent.substring(insertPos);
    const newContent = before + '    avg_salary_history: ' + indented + ',\n' + after;

    fs.writeFileSync(jsPath, newContent, 'utf8');
    console.log(`✅ ${prov}: 已强制重新同步 (${Object.keys(jsonData.avg_salary_history).length}年)`);
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
