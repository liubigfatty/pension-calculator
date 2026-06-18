/**
 * 批量修复：给所有缺少 base_rates 的省份配置
 * 在 getEngineConfig() return 块里的 province: PROV_TAG, 行之后插入 base_rates: { prov: PROV_BASE },
 */
const fs = require('fs');
const path = require('path');

const provinceDir = path.join(__dirname, '..', 'data', 'provinces');
const files = fs.readdirSync(provinceDir).filter(f => f.endsWith('.js')).sort();

let fixed = 0;
let skipped = 0;
let errors = 0;

files.forEach(f => {
  const filePath = path.join(provinceDir, f);
  let content = fs.readFileSync(filePath, 'utf8');

  // 已经有 base_rates 了，跳过
  if (content.includes('base_rates:')) {
    skipped++;
    return;
  }

  // 找 return { 块里 province: 那一行（4个空格缩进）
  // 匹配 "    province: PROV_TAG," 或 "    province: 'xxx',"
  const target = /\n(\s+province:\s*\S+,\n)/;
  const match = content.match(target);
  if (!match) {
    console.error(`  ❌ 找不到 province 行: ${f}`);
    errors++;
    return;
  }

  // 在 province 行之后插入 base_rates
  const insertPos = match.index + match[0].length;
  const toInsert = '    base_rates: { prov: PROV_BASE },\n';
  content = content.slice(0, insertPos) + toInsert + content.slice(insertPos);

  fs.writeFileSync(filePath, content, 'utf8');
  fixed++;
  console.log(`  ✅ ${f}`);
});

console.log(`\n汇总: 修复 ${fixed} 个, 跳过 ${skipped} 个, 失败 ${errors} 个`);
