// scripts/check-prov-base.js
// 批量检查各省 PROV_BASE 与 avgSalaryHistory 的一致性
// avgSalaryHistory 存的是年工资（元/年），PROV_BASE 应该是月工资（元/月）= avgSalaryHistory / 12

const fs = require('fs');
const path = require('path');

const provincesDir = 'data/provinces';
const jsonDir = 'provinces';  // JSON 数据源在 provinces/ 目录

const jsFiles = fs.readdirSync(provincesDir)
  .filter(f => f.endsWith('.js'))
  .sort();

console.log('省份,有JSON,1992_PROV,1992_JSON月,一致,1995_PROV,1995_JSON月,一致,2000_PROV,2000_JSON月,一致,问题');
console.log('---');

const results = [];

for (const jsFile of jsFiles) {
  const provCode = jsFile.replace('.js', '');
  const jsPath = path.resolve(provincesDir, jsFile);
  const jsonPath = path.resolve(jsonDir, provCode + '.json');

  // 加载 JS 模块（用绝对路径）
  delete require.cache[jsPath];
  const mod = require(jsPath);
  const PROV_BASE = mod.PROV_BASE || {};

  // 加载 JSON 文件
  let avgSalaryHistory = null;
  let hasJson = false;
  if (fs.existsSync(jsonPath)) {
    hasJson = true;
    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    avgSalaryHistory = json.avgSalaryHistory || null;
  }

  // 检查关键年份
  const checkYears = [1992, 1995, 2000, 2005, 2010];
  const issues = [];

  for (const year of checkYears) {
    const provVal = PROV_BASE[year];
    if (!avgSalaryHistory || avgSalaryHistory[year] === undefined) continue;
    const correctVal = Math.round(avgSalaryHistory[year] / 12);
    if (provVal === undefined) {
      issues.push(`${year}:缺失`);
    } else if (Math.abs(provVal - correctVal) > 1) {
      issues.push(`${year}:${provVal}≠${correctVal}`);
    }
  }

  // 输出对比行（选几个关键年份）
  const y1992_prov = PROV_BASE[1992] || '—';
  const y1992_json = avgSalaryHistory && avgSalaryHistory[1992] ? Math.round(avgSalaryHistory[1992]/12) : '—';
  const y1992_ok = (y1992_prov !== '—' && y1992_json !== '—') ? (Math.abs(y1992_prov - y1992_json) <= 1 ? '✅' : '❌') : '?';

  const y1995_prov = PROV_BASE[1995] || '—';
  const y1995_json = avgSalaryHistory && avgSalaryHistory[1995] ? Math.round(avgSalaryHistory[1995]/12) : '—';
  const y1995_ok = (y1995_prov !== '—' && y1995_json !== '—') ? (Math.abs(y1995_prov - y1995_json) <= 1 ? '✅' : '❌') : '?';

  const y2000_prov = PROV_BASE[2000] || '—';
  const y2000_json = avgSalaryHistory && avgSalaryHistory[2000] ? Math.round(avgSalaryHistory[2000]/12) : '—';
  const y2000_ok = (y2000_prov !== '—' && y2000_json !== '—') ? (Math.abs(y2000_prov - y2000_json) <= 1 ? '✅' : '❌') : '?';

  const issueStr = issues.length > 0 ? issues.join('; ') : '—';

  console.log([
    provCode,
    hasJson ? '✅' : '❌',
    y1992_prov, y1992_json, y1992_ok,
    y1995_prov, y1995_json, y1995_ok,
    y2000_prov, y2000_json, y2000_ok,
    issueStr
  ].join(','));

  if (issues.length > 0) {
    results.push({ provCode, issues });
  }
}

console.log('\n=== 汇总 ===');
if (results.length === 0) {
  console.log('✅ 所有省份 PROV_BASE 与 avgSalaryHistory 一致');
} else {
  console.log(`❌ 发现 ${results.length} 个省份数据不一致：`);
  for (const r of results) {
    console.log(`  - ${r.provCode}: ${r.issues.join('; ')}`);
  }
}
