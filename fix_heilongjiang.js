/**
 * 修复 heilongjiang.js：添加 base_rates 属性（兼容引擎旧格式）
 */
const fs = require('fs');
const filePath = 'data/provinces/heilongjiang.js';
let content = fs.readFileSync(filePath, 'utf8');

// 在 module.exports 之前插入 base_rates 定义
const insertPoint = 'module.exports = {';
const baseRatesDef = `// 兼容引擎的旧格式（base_rates）
const base_rates = {
  prov: PROV_BASE,
};

`;

if (content.includes(insertPoint)) {
  content = content.replace(insertPoint, baseRatesDef + insertPoint);
  
  // 在 module.exports 中添加 base_rates
  content = content.replace('  PROV_BASE,', '  PROV_BASE,\n  base_rates,');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ 已修复 heilongjiang.js：添加 base_rates 属性');
} else {
  console.log('❌ 未找到插入点');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('module.exports')) {
      console.log('第' + (idx+1) + '行实际内容:', JSON.stringify(line));
    }
  });
}
