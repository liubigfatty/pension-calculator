// scripts/fix-prov-base-from-json.js
// 用 provinces/*.json 里的 avgSalaryHistory 重建 PROV_BASE（月工资 = 年工资/12）
// 只处理 JSON 里有 avgSalaryHistory 的省份

const fs = require('fs');
const path = require('path');

const provincesDir = 'data/provinces';
const jsonDir = 'provinces';

const TARGETS = ['liaoning', 'yunnan'];

for (const provCode of TARGETS) {
  const jsPath = path.join(provincesDir, provCode + '.js');
  const jsonPath = path.join(jsonDir, provCode + '.json');

  if (!fs.existsSync(jsonPath)) {
    console.log(`⚠️  ${provCode}.json 不存在，跳过`);
    continue;
  }

  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const avg = json.avgSalaryHistory;
  if (!avg) {
    console.log(`⚠️  ${provCode}.json 没有 avgSalaryHistory，跳过`);
    continue;
  }

  // 读 JS 文件内容
  let content = fs.readFileSync(jsPath, 'utf8');

  // 提取现有 PROV_BASE 块（用于保留没有 avgSalaryHistory 的年份）
  // 更简单的方式：直接重建整个 PROV_BASE
  const newBase = {};
  for (const yearStr of Object.keys(avg).sort()) {
    const year = parseInt(yearStr);
    newBase[year] = Math.round(avg[year] / 12);
  }

  // 找到 PROV_BASE 对象的位置并替换
  // 匹配 const PROV_BASE = { ... };
  const provBaseRegex = /(const PROV_BASE\s*=\s*\{[\s\S]*?\n\})/m;
  const match = content.match(provBaseRegex);
  if (!match) {
    console.log(`❌ ${provCode}.js 找不到 PROV_BASE，跳过`);
    continue;
  }

  // 重建 PROV_BASE 源码
  const years = Object.keys(newBase).map(Number).sort((a, b) => a - b);
  const minYear = years[0];
  const maxYear = years[years.length - 1];

  let newBlock = 'const PROV_BASE = {\n';
  for (const y of years) {
    const comment = y === minYear ? '  // ' + provCode + ' 历年计发基数（元/月，来源：avgSalaryHistory 年鉴数据）' : '';
    newBlock += '  ' + y + ': ' + newBase[y] + ',' + comment + '\n';
  }
  newBlock += '};\n';

  // 替换
  content = content.replace(provBaseRegex, newBlock);

  // 备份
  fs.copyFileSync(jsPath, jsPath + '.bak');
  fs.writeFileSync(jsPath, content, 'utf8');

  console.log(`✅ ${provCode}.js PROV_BASE 已更新（${minYear}-${maxYear}，共${years.length}年）`);
  console.log(`   备份在 ${jsPath}.bak`);
}

console.log('\n完成。请运行 node scripts/verify.js 验证。');
