const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/14041/AppData/Roaming/winclaw/.openclaw/workspace/养老金计算平台/provinces';

// 全国表（来自 pension-engine.js)
const NATIONAL_PRE = {
  1996:0.0804,1997:0.0567,1998:0.0447,1999:0.0225,2000:0.0225,2001:0.0225,2002:0.0225,
  2003:0.0198,2004:0.0198,2005:0.0225,2006:0.0252,2007:0.0414,2008:0.0414,2009:0.0225,
  2010:0.0225,2011:0.0350,2012:0.0350,2013:0.0300,2014:0.0350,2015:0.0350
};
const NATIONAL_POST = {
  2016:0.0831,2017:0.0712,2018:0.0829,2019:0.0761,2020:0.0604,2021:0.0669,2022:0.0397,
  2023:0.0397,2024:0.0262,2025:0.0150
};

const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
const data = {};
for (const f of files) {
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (!cfg.interest_rates) { console.log('NO interest_rates:', f); continue; }
  data[cfg.province || f] = cfg.interest_rates;
}

// 年份范围
const years = new Set();
for (const k in data) for (const y in data[k]) years.add(Number(y));
const ymin = Math.min(...years), ymax = Math.max(...years);
console.log('31省 interest_rates 年份范围:', ymin, '-', ymax);

// 各省之间是否一致
const sigs = {};
for (const k in data) sigs[k] = JSON.stringify(data[k]);
const distinct = new Set(Object.values(sigs));
console.log('31省中互不相同(互有差异)的 interest_rates 配置数:', distinct.size);

const groups = {};
for (const k in sigs) { (groups[sigs[k]] = groups[sigs[k]] || []).push(k); }
let gi = 0;
for (const s in groups) {
  gi++;
  console.log(`\n--- 配置组 ${gi} (含 ${groups[s].length} 省) ---`);
  console.log('省份:', groups[s].join(', '));
  const sample = data[groups[s][0]];
  console.log('利率值:', JSON.stringify(sample));
}

// 每省与 NATIONAL_PRE2016 (1996-2015) 的差异
console.log('\n=== 各省 vs 全国 pre2016 表 (1996-2015) 差异 ===');
let diffCount = 0;
for (const k in data) {
  const r = data[k];
  const diffs = [];
  for (let y = 1996; y <= 2015; y++) {
    if (!(String(y) in r)) { diffs.push(`${y}:缺失`); continue; }
    if (Math.abs(r[String(y)] - NATIONAL_PRE[y]) > 1e-9) diffs.push(`${y}:${r[String(y)]}≠${NATIONAL_PRE[y]}`);
  }
  if (diffs.length) { diffCount++; console.log(`${k}: ${diffs.join(' | ')}`); }
}
console.log(`\n与全国 pre2016 表存在差异的省份数: ${diffCount} / ${Object.keys(data).length}`);

console.log('\n=== 全国表 1996-2025 完整参考 ===');
const full = Object.assign({}, NATIONAL_PRE, NATIONAL_POST);
for (let y = 1996; y <= 2025; y++) {
  console.log(`${y}: ${(full[y]*100).toFixed(2)}%`);
}
