/**
 * 修复 pension-engine.js：
 * 在 calculate() 函数开头，插入兼容 JS 模块计发基数格式的代码
 * 将 PROV_BASE/CC_BASE 转换成 base_rates 格式
 */
const fs = require('fs');
const filePath = 'engine/pension-engine.js';
let content = fs.readFileSync(filePath, 'utf8');

// 插入点：在 calculate() 函数中的 "// 解析输入" 之前
const insertPoint = '  // 解析输入\n  const data = parseInput(inputData)';
const insertCode = `  // ============ 兼容 JS 模块的计发基数格式 =============
  // 将 PROV_BASE/CC_BASE 转换成 base_rates 格式
  if (!config.base_rates && (config.PROV_BASE || config.CC_BASE)) {
    config.base_rates = {
      prov: config.PROV_BASE || {},
    };
    // 如果有城市计发基数（如吉林省的CC_BASE），也加入
    if (config.CC_BASE) {
      config.base_rates.cc = config.CC_BASE;
    }
    // 其他城市基数（如有）
    if (config.CITY_BASE) {
      Object.assign(config.base_rates, config.CITY_BASE);
    }
  }
  // ============ 兼容结束 =============\n\n`;

if (content.includes(insertPoint)) {
  content = content.replace(insertPoint, insertCode + insertPoint);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ 已修复 pension-engine.js：在 calculate() 开头插入兼容代码');
} else {
  console.log('❌ 未找到插入点');
  // 看看实际内容
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('解析输入') || line.includes('parseInput')) {
      console.log('第' + (idx+1) + '行附近内容:');
      for (let j = Math.max(0, idx-2); j < Math.min(lines.length, idx+5); j++) {
        console.log((j+1) + ': ' + lines[j]);
      }
    }
  });
}
