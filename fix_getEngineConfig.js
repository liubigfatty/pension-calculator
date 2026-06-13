/**
 * 修复其他省的 getEngineConfig() 函数
 * 问题：从 jilin.js 复制时带上了 CC_BASE 引用，其他省没有这个常量
 * 修复：删掉 ...(CC_BASE ? { cc: CC_BASE } : {}) 这段
 */
const fs = require('fs');
const path = require('path');

const provincesDir = 'data/provinces';
const files = fs.readdirSync(provincesDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  if (file === 'jilin.js') return; // 吉林省跳过

  const filePath = path.join(provincesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  let modified = false;

  // 修复1：删掉 ...(CC_BASE ? { cc: CC_BASE } : {}) 这段
  // 在 base_rates: { prov: PROV_BASE, ...(CC_BASE ? { cc: CC_BASE } : {}) } 中
  const oldBaseRates = '... (CC_BASE ? { cc: CC_BASE } : {})';
  const newBaseRates = '';
  if (content.includes(oldBaseRates)) {
    content = content.replace(oldBaseRates, newBaseRates);
    modified = true;
  }

  // 修复2：如果 NOTES 没定义，改成 ''
  // 先检查文件里是否有 const NOTES
  if (!content.includes('const NOTES')) {
    // 把 NOTES || '' 改成 ''
    const oldNotes = 'NOTES || \'\'';
    const newNotes = '\'\'';
    if (content.includes(oldNotes)) {
      content = content.replace(oldNotes, newNotes);
      modified = true;
    }
  }

  // 修复3：如果 USE_PRE_ACCOUNT_YEARS 没定义，改成 false
  if (!content.includes('const USE_PRE_ACCOUNT_YEARS')) {
    const oldUse = 'USE_PRE_ACCOUNT_YEARS || false';
    const newUse = 'false';
    if (content.includes(oldUse)) {
      content = content.replace(oldUse, newUse);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file} 已修复 getEngineConfig()`);
  } else {
    console.log(`⚠️ ${file} 未修改（可能格式不一样）`);
  }
});

console.log('\n✅ 批量修复完成！');
