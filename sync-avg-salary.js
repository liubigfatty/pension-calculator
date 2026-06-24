// 批量同步 avg_salary_history 从 .json 到 .js 的 getEngineConfig() 返回值
const fs = require('fs');
const path = require('path');

const jsonDir = 'provinces';
const jsDir = 'cloudfunctions/calculate/provinces';

const jsonFiles = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'));

console.log('=== 批量同步 avg_salary_history 到 .js 文件 ===');
console.log('');

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

jsonFiles.forEach(f => {
  const prov = f.replace('.json', '');
  const jsonPath = path.join(jsonDir, f);
  const jsPath = path.join(jsDir, prov + '.js');

  if (!fs.existsSync(jsPath)) {
    console.log(`⚠️  ${prov}: .js 文件不存在，跳过`);
    skipCount++;
    return;
  }

  try {
    // 读取 .json 数据
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (!jsonData.avg_salary_history) {
      console.log(`⚠️  ${prov}: .json 里也没有 avg_salary_history，跳过`);
      skipCount++;
      return;
    }

    // 读取 .js 文件
    let jsContent = fs.readFileSync(jsPath, 'utf8');

    // 检查是否已有 avg_salary_history（在 getEngineConfig 返回值里）
    if (jsContent.match(/avg_salary_history\s*:/)) {
      console.log(`✅ ${prov}: .js 已有 avg_salary_history，跳过`);
      successCount++;
      return;
    }

    // 在 getEngineConfig() 的 return 对象里插入 avg_salary_history
    // 找到 "base_rates:" 所在行，在它后面不远处插入 avg_salary_history
    // 策略：在 "modules:" 行前面插入
    
    const avgDataStr = JSON.stringify(jsonData.avg_salary_history, null, 2)
      .split('\n').map(line => '    ' + line).join('\n');

    // 在 return { 里找插入点：在 base_rates 行之后、modules 行之前
    // 更好的策略：在 "base_rates:" 那一行后面追加
    const result = jsContent.replace(
      /(base_rates:\s*\{[^}]*\}[\s\S]*?)(\n\s+modules:\s*\{)/,
      (match, before, after) => {
        return before + ',\n    avg_salary_history: ' + avgDataStr + ',' + after;
      }
    );

    if (result === jsContent) {
      // 备用策略：在 return { 后面找 notes: 前面插入
      const result2 = jsContent.replace(
        /(return\s*\{[\s\S]*?)(notes:\s*')/,
        (match, before, after) => {
          return before + '    avg_salary_history: ' + avgDataStr + ',\n\n' + after;
        }
      );
      if (result2 === jsContent) {
        console.log(`❌ ${prov}: 无法自动插入（需手动处理）`);
        errorCount++;
        return;
      }
      fs.writeFileSync(jsPath, result2, 'utf8');
    } else {
      fs.writeFileSync(jsPath, result, 'utf8');
    }

    console.log(`✅ ${prov}: 已同步 avg_salary_history (${Object.keys(jsonData.avg_salary_history).length}年)`);
    successCount++;

  } catch (e) {
    console.log(`❌ ${prov}: 错误 - ${e.message}`);
    errorCount++;
  }
});

console.log('');
console.log('=== 汇总 ===');
console.log(`成功: ${successCount}/${jsonFiles.length}`);
console.log(`跳过: ${skipCount}/${jsonFiles.length}`);
console.log(`失败: ${errorCount}/${jsonFiles.length}`);
