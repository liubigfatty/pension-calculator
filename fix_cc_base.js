const fs = require('fs');
const path = require('path');

const provincesDir = path.join(__dirname, 'data/provinces');
const provinces = ['heilongjiang', 'yunnan', 'jiangsu', 'shanghai', 'gansu', 'sichuan', 'beijing'];

let fixedCount = 0;

provinces.forEach(prov => {
  const filePath = path.join(provincesDir, `${prov}.js`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ ${prov}.js 不存在，跳过`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 替换 base_rates 行，去掉 CC_BASE 引用
  // 从：base_rates: { prov: PROV_BASE, ...(CC_BASE ? { cc: CC_BASE } : {}) },
  // 改为：base_rates: { prov: PROV_BASE },
  const oldPattern = /base_rates:\s*\{\s*prov:\s*PROV_BASE,\s*\.\.\.\(CC_BASE\s*\?\s*\{\s*cc:\s*CC_BASE\s*\}\s*:\s*\{\}\)\s*\},/;
  
  if (oldPattern.test(content)) {
    content = content.replace(
      /(base_rates:\s*)\{\s*prov:\s*PROV_BASE,\s*\.\.\.\(CC_BASE\s*\?\s*\{\s*cc:\s*CC_BASE\s*\}\s*:\s*\{\}\)\s*\},/,
      '$1{ prov: PROV_BASE },'
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${prov}.js 已修复（去掉 CC_BASE 引用）`);
    fixedCount++;
  } else {
    console.log(`⚠️ ${prov}.js 未找到匹配模式（可能已修复）`);
  }
});

console.log(`\n✅ 修复完成！共修复 ${fixedCount} 个文件`);
