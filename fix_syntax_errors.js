/**
 * 修复所有省份JS文件中的语法错误
 * 问题：};} 应该改为 };
 */

const fs = require('fs');
const path = require('path');

const provincesDir = path.join(__dirname, 'data', 'provinces');

const provinces = [
  'shanghai', 'beijing', 'guangdong', 'zhejiang', 'jiangsu',
  'fujian', 'shandong', 'tianjin', 'hunan', 'hebei',
  'anhui', 'sichuan', 'hubei', 'jiangxi', 'henan',
  'chongqing', 'shaanxi', 'shanxi', 'liaoning', 'jilin',
  'heilongjiang', 'hainan', 'guizhou', 'yunnan', 'xizang',
  'gansu', 'qinghai', 'ningxia', 'xinjiang', 'neimenggu',
  'guangxi'
];

let fixedCount = 0;

for (const province of provinces) {
  const filePath = path.join(provincesDir, `${province}.js`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  文件不存在: ${province}.js`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // 修复 };} 为 };
  if (content.includes('};}')) {
    content = content.replace(/\};\}/g, '};');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ 已修复: ${province}.js`);
    fixedCount++;
  }
}

console.log(`\n✅ 修复完成！共修复 ${fixedCount} 个文件`);
console.log('💡 现在可以重新运行更新脚本');
