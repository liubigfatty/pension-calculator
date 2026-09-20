/**
 * 验证假设：引擎 avg_salary_history[Y] 实际是「Y 统计年」=「Y+1 年度执行」
 * 方法：用 2025 年度官方锚点（锚点表第一节）去比对 h[2024]
 * 命中 => 统计年语义，需右移 1 年
 * 未命中 => 检查 h[2025] 是否命中（即已是执行年语义）
 */
const d = require('../cloudfunctions/calculate/provinces-data.js');

// 2025 年度官方锚点（docs/06-数据 锚点表第一节）
const ANCHOR_2025 = {
  beijing: 11937, tianjin: 8540, hebei: 6678, shanxi: 6997, neimenggu: 8179,
  liaoning: 7264, jilin: 7322, heilongjiang: 7570, shanghai: 12434, jiangsu: 8254,
  zhejiang: 8433, anhui: 7185, fujian: 7535, jiangxi: 6525, shandong: 7506,
  henan: 6385, hubei: 7496, hunan: 6787, guangdong: 9183, guangxi: 6905,
  hainan: 8188, chongqing: 7339, sichuan: 7646, guizhou: 7324.5, yunnan: 7263,
  xizang: 11777, shaanxi: 7750, gansu: 7338, qinghai: 8816, ningxia: 8258,
  xinjiang: 8448,
};

// 2026 年度已核实（22 省）
const ANCHOR_2026 = {
  beijing: 12116, tianjin: 8634, hebei: 6794, shanxi: 7073, neimenggu: 8430,
  liaoning: 7555, jilin: 7481.5, heilongjiang: 7705, shanghai: 12577, anhui: 7257,
  fujian: 7631, shandong: 7621, hunan: 6843, chongqing: 7588.33, sichuan: 7831,
  guizhou: 7376.75, yunnan: 7339, xizang: 11954, shaanxi: 7895, gansu: 7542,
  ningxia: 8371, xinjiang: 8744,
};

function pickHist(cfg) {
  let h = cfg.AVG_SALARY_HISTORY || cfg.avg_salary_history;
  if (h && (h.prov || h.shenzhen)) h = h.prov; // 广东类嵌套结构
  return h || {};
}

const rows = [];
for (const code of d.listProvinces()) {
  const cfg = d.getConfig(code);
  const name = cfg.province_name || cfg.name || cfg.province || code;
  const h = pickHist(cfg);
  const a25 = ANCHOR_2025[code];
  const v24 = h[2024], v25 = h[2025], v26 = h[2026];
  let sem = '?', note = '';
  if (a25 == null) { sem = '⚪'; note = '无锚点'; }
  else if (v24 != null && Math.abs(v24 - a25) < 1.5) { sem = '统计年'; note = 'h[2024]命中2025年度 ⇒ 右移1'; }
  else if (v25 != null && Math.abs(v25 - a25) < 1.5) { sem = '执行年'; note = 'h[2025]命中2025年度 ⇒ 不动'; }
  else {
    const near = [2023, 2024, 2025, 2026].filter(y => h[y] != null && Math.abs(h[y] - a25) < 1.5);
    sem = near.length ? '⚠️其他位' : '❌未命中';
    note = near.length ? `锚点落在[${near.join(',')}]` : `h24=${v24 ?? '-'} h25=${v25 ?? '-'} 锚=${a25}`;
  }
  const a26 = ANCHOR_2026[code];
  const v26state = a26 == null
    ? (v26 != null ? `有值${v26}(未公布省)` : '空(走外推)')
    : (v26 != null ? (Math.abs(v26 - a26) < 1.5 ? `${v26}✅` : `${v26}≠${a26}❌`) : `缺(应${a26})`);
  rows.push({ code, name, sem, note, v24, v25, v26, v26state });
}

console.log('省       判定      h[2024]  h[2025]  h[2026]   2026状态        备注');
for (const r of rows) {
  console.log([
    (r.name || '').padEnd(8), r.sem.padEnd(8),
    String(r.v24 ?? '-').padEnd(8), String(r.v25 ?? '-').padEnd(8),
    String(r.v26 ?? '-').padEnd(8), r.v26state.padEnd(14), r.note,
  ].join(' '));
}
const c = {};
for (const r of rows) c[r.sem] = (c[r.sem] || 0) + 1;
console.log('\n判定分布:', JSON.stringify(c));
console.log('需右移(统计年):', rows.filter(r => r.sem === '统计年').map(r => r.name).join('、'));
console.log('不动(执行年):', rows.filter(r => r.sem === '执行年').map(r => r.name).join('、') || '无');
console.log('未命中/异常:', rows.filter(r => !['统计年', '执行年'].includes(r.sem)).map(r => `${r.name}(${r.sem})`).join('、') || '无');
