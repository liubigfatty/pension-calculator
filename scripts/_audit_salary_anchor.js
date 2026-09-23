/**
 * 引擎隐患排查 · 第 4 步：用「2025 年度官方缴费基数」硬锚点比对 31 省库值
 *
 * 锚点来源：各省人社厅/税务局 2025 年度缴费基数通知（人社通 2025-10-30 汇总 + 省级官网原文复核）
 *   山东 鲁人社字〔2025〕91号  安徽 皖人社秘〔2025〕154号  陕西 陕人社函〔2025〕424号
 *   湖南 湘人社 2025-09-22     浙江 浙人社发〔2025〕52号   江苏 苏人社发〔2025〕33号 …
 * 规则：某省「2025 年度执行社平」必须 = AVG_SALARY_HISTORY[2025]，否则该省年度语义错位/值有误。
 * 只读，不改任何文件。
 */
const path = require('path');
const root = path.resolve(__dirname, '..');
const data = require(path.join(root, 'cloudfunctions/calculate/provinces-data.js'));

// 2025 年度（2025-01-01~12-31 执行）全口径月社平（元/月）+ 下限 + 文号
const ANCHOR_2025 = {
  beijing:      [11937, 7162,   35811,   '京人社发〔2025〕11号'],
  tianjin:      [8540,  5124,   25620,   '津人社局发〔2025〕6号'],
  hebei:        [6678,  4007,   20034,   '冀人社字〔2025〕105号'],
  shanxi:       [6997,  4198,   20991,   '晋人社发〔2025〕35号'],
  neimenggu:    [8179,  4907,   24537,   '内人社办发〔2025〕160号'],
  liaoning:     [7264,  4359,   21792,   '辽人社 2025年度'],
  jilin:        [7322,  4393.2, 21966,   '吉人社联〔2025〕97号'],
  heilongjiang: [7570,  4542,   22710,   '黑人社函〔2024〕548号'],
  shanghai:     [12434, 7460,   37302,   '沪人社局 2025年度'],
  jiangsu:      [8254,  4952,   24762,   '苏人社发〔2025〕33号'],
  zhejiang:     [8433,  4986,   25299,   '浙人社发〔2025〕52号'],
  anhui:        [7185,  4311,   21556,   '皖人社秘〔2025〕154号'],
  fujian:       [7535,  4521,   22607,   '闽人社文〔2025〕45号'],
  jiangxi:      [6525,  3915,   19575,   '赣人社 2025年度'],
  shandong:     [7506,  4504,   22518,   '鲁人社字〔2025〕91号'],
  henan:        [6385,  3831,   19155,   '豫人社 2025年度'],
  hubei:        [7496,  4498,   22488,   '鄂人社 2025年度（分三档）'],
  hunan:        [6787,  4072,   20361,   '湘人社 2025-09-22'],
  guangdong:    [9183,  4775,   27549,   '粤人社 2025年度'],
  guangxi:      [6905,  4143,   20715,   '桂人社 2025年度'],
  hainan:       [8188,  4912.8, 24564,   '琼人社 2025年度'],
  chongqing:    [7339,  4404,   22017,   '渝人社 2025年度'],
  sichuan:      [7646,  4588,   22938,   '川人社 2025年度'],
  guizhou:      [7324.5, 4394.7, 21973.5, '黔人社 2025年度'],
  yunnan:       [7263,  4357,   21789,   '云人社 2025年度'],
  xizang:       [11777, 7066.2, 35331,   '藏人社 2025年度'],
  shaanxi:      [7750,  4650,   23250,   '陕人社函〔2025〕424号'],
  gansu:        [7338,  4403,   22014,   '甘人社 2025年度'],
  qinghai:      [8816,  5289.6, 26448,   '青人社 2025年度'],
  ningxia:      [8258,  4955,   24774,   '宁人社 2025年度'],
  xinjiang:     [8448,  5069,   25344,   '新人社 2025年度'],
};

console.log('=== 31 省「2025 年度执行社平」锚点比对 ===\n');
console.log('省份           锚点值   库[2024]  库[2025]  库[2026]   判定');
const rows = [];
for (const [code, [anchor, lo, hi, doc]] of Object.entries(ANCHOR_2025)) {
  const cfg = data.getConfig(code);
  if (!cfg) { console.log(`${code} 配置缺失`); continue; }
  const h = cfg.AVG_SALARY_HISTORY || cfg.avg_salary_history || {};
  const v24 = h[2024], v25 = h[2025], v26 = h[2026];
  const name = cfg.province_name || cfg.name || code;
  // 优先判定"锚点值实际落在库里哪个年份"，再判定是否有值错误
  let verdict;
  if (v25 != null && Math.abs(v25 - anchor) < 1) verdict = '✅[2025]命中(语义=执行年)';
  else if (v24 != null && Math.abs(v24 - anchor) < 1) verdict = '❌错位+1(锚点落在[2024])';
  else if (v26 != null && Math.abs(v26 - anchor) < 1) verdict = '❌错位-1(锚点落在[2026])';
  else if (v24 != null && Math.abs(v24 - anchor) < 60) verdict = `⚠值近[2024]差${(v24 - anchor).toFixed(1)}`;
  else if (v25 != null) verdict = `❌值不符(差${(v25 - anchor).toFixed(1)})`;
  else verdict = '❗库无[2025]且[2024]不符';
  rows.push({ code, name, anchor, v24, v25, v26, verdict, doc });
}
const pad = (s, n) => String(s ?? '—').padEnd(n);
for (const r of rows) {
  console.log(`${pad(r.name, 12)} ${pad(r.anchor, 8)} ${pad(r.v24, 9)} ${pad(r.v25, 9)} ${pad(r.v26, 9)}  ${r.verdict}`);
}
const bad = rows.filter(r => r.verdict.startsWith('❌') || r.verdict.startsWith('❗'));
console.log(`\n不一致：${bad.length} / ${rows.length}`);
console.log('\n--- 判定分布 ---');
const dist = {};
for (const r of rows) dist[r.verdict.replace(/[\d.]+/g, 'N')] = (dist[r.verdict.replace(/[\d.]+/g, 'N')] || 0) + 1;
for (const [k, v] of Object.entries(dist)) console.log(`  ${k}: ${v} 省`);
