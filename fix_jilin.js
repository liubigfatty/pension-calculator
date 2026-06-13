const fs = require('fs');
const filePath = 'data/provinces/jilin.js';
let content = fs.readFileSync(filePath, 'utf8');

// 在 const PROV_TAG = 'jilin' 之前插入 EXTRA_PARAMS 定义
const insertPoint = "const PROV_TAG = 'jilin'";
const extraParamsDef = `// 吉林省增发养老金参数（吉政发〔1998〕28号）\nconst EXTRA_PARAMS = {\n  trigger: { type: 'actual_years', threshold: 20 },\n  brackets: [\n    { from: 21, to: 25, rate: 0.0015, years: 5 },\n    { from: 26, to: 30, rate: 0.0020, years: 5 },\n    { from: 31, to: null, rate: 0.0025, years: null }  // 无上限段，动态计算\n  ]\n};\n\n`;

if (content.includes(insertPoint)) {
  content = content.replace(insertPoint, extraParamsDef + insertPoint);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ 已添加 EXTRA_PARAMS 定义到 jilin.js');
} else {
  console.log('❌ 未找到插入点');
  // 看看实际内容
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('PROV_TAG')) {
      console.log('第' + (idx+1) + '行实际内容:', JSON.stringify(line));
    }
  });
}
