/**
 * 引擎隐患排查 · 第 3 步：31 省社平序列一致性诊断
 *
 * 背景：AVG_SALARY_HISTORY[Y] 的官方定义 = "Y 年度执行的社平" = Y-1 自然年统计口径。
 *       但各省历史数据在历次人工/脚本填充中，年度语义可能不一致（错位 1 年）。
 * 本脚本做**不依赖外部数据**的内部体检：
 *   ① 逐年名义增长率是否合理（0~15%）
 *   ② 是否存在"回落"（社平下降，正常年份不应出现）
 *   ③ 头部注释声明的口径 vs 数组实际形状
 * 只读，不改任何文件。
 */
const path = require('path');
const root = path.resolve(__dirname, '..');
const data = require(path.join(root, 'cloudfunctions/calculate/provinces-data.js'));
const fs = require('fs');

const CODES = data.listProvinces();
const out = [];
for (const code of CODES) {
  const cfg = data.getConfig(code);
  const h = cfg.AVG_SALARY_HISTORY || cfg.avg_salary_history || {};
  const ys = Object.keys(h).map(Number).filter(y => y >= 2015).sort();
  const seq = ys.map(y => [y, h[y]]);
  const issues = [];
  for (let i = 1; i < seq.length; i++) {
    const [y0, v0] = seq[i - 1], [y1, v1] = seq[i];
    if (y1 !== y0 + 1) { issues.push(`断年 ${y0}→${y1}`); continue; }
    if (!(v0 > 0) || !(v1 > 0)) continue;
    const g = (v1 / v0 - 1) * 100;
    if (g < -0.05) issues.push(`${y1} 回落 ${g.toFixed(2)}% (${v0}→${v1})`);
    else if (g > 15) issues.push(`${y1} 暴涨 ${g.toFixed(2)}% (${v0}→${v1})`);
    else if (g < 0.3) issues.push(`${y1} 停滞 ${g.toFixed(2)}% (${v0}→${v1})`);
  }
  out.push({ code, name: cfg.province_name || cfg.name || code, seq, issues, maxY: ys[ys.length - 1] });
}

console.log('=== 31 省社平序列体检（2015 起）===\n');
let bad = 0;
for (const r of out.sort((a, b) => b.issues.length - a.issues.length)) {
  const tail = r.seq.slice(-6).map(([y, v]) => `${y}:${v}`).join(' ');
  if (r.issues.length) bad++;
  console.log(`${r.name}(${r.code}) 尾6: ${tail}`);
  if (r.issues.length) for (const i of r.issues) console.log(`     ⚠ ${i}`);
}
console.log(`\n有异常信号的省份：${bad} / ${out.length}`);
console.log('\n=== 末年份覆盖情况 ===');
const noMax = out.filter(r => r.maxY < 2026);
console.log(`末年份 < 2026 的省份（未入 2025 统计口径）：${noMax.length} 个`);
for (const r of noMax) console.log(`   ${r.name}(${r.code}) 末年=${r.maxY} 末值=${r.seq[r.seq.length - 1][1]}`);
