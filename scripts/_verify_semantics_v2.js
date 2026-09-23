/**
 * 验证语义统一结果（执行年语义 [Y] = Y 年度执行社平 = Y-1 统计年）
 * 检查项：
 *   1. [2025] 是否等于 2025 年度官方锚点
 *   2. [2026] 是否等于 2026 年度官方值；未公布省必须留空
 *   3. 是否仍存在「后一年 < 前一年」的假回落（2020 全口径断点除外）
 *   4. 序列首端是否保留（早期参保年份有值）
 */
const d = require('../cloudfunctions/calculate/provinces-data.js');

const ANCHOR_2025 = {
  beijing: 11937, tianjin: 8540, hebei: 6678, shanxi: 6997, neimenggu: 8179,
  liaoning: 7264, jilin: 7322, heilongjiang: 7570, shanghai: 12434, jiangsu: 8254,
  zhejiang: 8433, anhui: 7185, fujian: 7535, jiangxi: 6525, shandong: 7506,
  henan: 6385, hubei: 7496, hunan: 6787, guangdong: 9183, guangxi: 6905,
  hainan: 8188, chongqing: 7339, sichuan: 7646, guizhou: 7324.5, yunnan: 7263,
  xizang: 11777, shaanxi: 7750, gansu: 7338, qinghai: 8816, ningxia: 8258,
  xinjiang: 8448,
};
const ANCHOR_2026 = {
  beijing: 12116, tianjin: 8634, hebei: 6794, shanxi: 7073, neimenggu: 8430,
  liaoning: 7555, jilin: 7481.5, heilongjiang: 7705, shanghai: 12577, anhui: 7257,
  fujian: 7631, shandong: 7621, hunan: 6843, chongqing: 7588.33, sichuan: 7831,
  guizhou: 7376.75, yunnan: 7339, xizang: 11954, shaanxi: 7895, gansu: 7542,
  ningxia: 8371, xinjiang: 8744,
};

function pickHist(cfg) {
  let h = cfg.AVG_SALARY_HISTORY || cfg.avg_salary_history;
  if (h && (h.prov || h.shenzhen)) h = h.prov;
  return h || {};
}

let fail = 0, pass = 0;
const problems = [];
console.log('省         [2025]    期望      [2026]   期望      假回落  首端');
for (const code of d.listProvinces()) {
  const cfg = d.getConfig(code);
  const name = cfg.province_name || cfg.name || cfg.province || code;
  const h = pickHist(cfg);
  const v25 = h[2025], v26 = h[2026];
  const a25 = ANCHOR_2025[code], a26 = ANCHOR_2026[code];

  // 1. [2025]
  let s25, ok25;
  if (v25 == null) { s25 = '缺失'; ok25 = false; }
  else if (Math.abs(v25 - a25) < 1.5) { s25 = String(v25); ok25 = true; }
  else { s25 = `${v25}(差${(v25 - a25).toFixed(1)})`; ok25 = false; }

  // 2. [2026]
  let s26, ok26;
  if (a26 == null) {
    ok26 = v26 == null;
    s26 = v26 == null ? '空(外推)' : `${v26}(应空)`;
  } else {
    ok26 = v26 != null && Math.abs(v26 - a26) < 1.5;
    s26 = v26 == null ? `缺(应${a26})` : (ok26 ? String(v26) : `${v26}≠${a26}`);
  }

  // 3. 假回落：只查 2021 年之后（2020 全口径切换断点右移后落在 2021）
  const ys = Object.keys(h).map(Number).sort();
  const drops = [];
  for (let i = 1; i < ys.length; i++) {
    const y = ys[i];
    if (y <= 2021) continue;              // 2021 = 原 2020 口径断点，已右移
    if (h[y] < h[ys[i - 1]] - 0.5) drops.push(y);
  }
  const okDrop = drops.length === 0;

  // 4. 首端
  const okFirst = ys.length > 0 && ys[0] <= 2000;

  const ok = ok25 && ok26 && okDrop && okFirst;
  if (ok) pass++; else { fail++; problems.push({ name, ok25, s25, a25, ok26, s26, a26, drops, first: ys[0] }); }
  console.log([
    (name || '').padEnd(9), String(s25).padEnd(9), String(a25).padEnd(8),
    String(s26).padEnd(9), String(a26 ?? '未公布').padEnd(9),
    (okDrop ? '无' : drops.join(',')).padEnd(7), String(ys[0]),
  ].join(' ') + (ok ? '' : '   ← ✗'));
}

console.log(`\n通过 ${pass} / 失败 ${fail}`);
if (problems.length) {
  console.log('\n--- 问题明细 ---');
  for (const p of problems) {
    const why = [];
    if (!p.ok25) why.push(`[2025]=${p.s25} 期望${p.a25}`);
    if (!p.ok26) why.push(`[2026]=${p.s26} 期望${p.a26 ?? '空'}`);
    if (p.drops.length) why.push(`回落年份${p.drops.join(',')}`);
    console.log(`${p.name}: ${why.join('；')}`);
  }
}
process.exit(fail ? 1 : 0);
