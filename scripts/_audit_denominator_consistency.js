/**
 * 排查：31 省「缴费指数分母」是否与官方缴费基数口径自洽
 *
 * 判据（对 29 省成立）：按下限缴费者的指数 = 0.6，因为下限 = 年度社平 × 60%。
 *   ⇒ 引擎对「2025 年度缴费」取的分母，必须 = 2025 年度下限 ÷ 0.6。
 *
 * ✅ 2026-09-20 起：**31 省口径统一**，本判据对全部 31 省成立，已无例外。
 *   陕西、西藏原为 denom='current'（分母比基数口径晚一年，导致 60% 档指数只有 0.54），
 *   现已统一为 'prev' = 「当年缴费工资 ÷ 当年使用的社平基数」（2024 缴费 ÷ hist[2024]）。
 *   历史核查留痕见 `docs/08-缴费指数小程序/_核查-陕西指数分母与计发基数年份辨析（2026-09-20）.md`
 *   与 `_核查-西藏分母口径与0.6-3.0适用范围（2026-09-20）.md`。
 *
 * ⚠️ 判据的时间前提：60% 下限自 **2019-05-01**（国办发〔2019〕13号）起全国统一，
 *   故本判据只对 2019-05 之后的缴费年度成立；2019 年前各省下限普遍低于 60%，不适用。
 *
 * 锚点：各省 2025 年度缴费基数下限（官方通知），见 _audit_salary_anchor.js。
 * 只读，不改任何文件。
 */
const path = require('path');
const root = path.resolve(__dirname, '..');
const Calc = require(path.join(root, 'index-engine/calcIndex.js'));
const data = require(path.join(root, 'cloudfunctions/calculate/provinces-data.js'));

// 判据不适用的省（分母刻意晚一年，见头部说明）
const KNOWN_EXCEPTIONS = {}; // 2026-09-20：31 省口径统一，已无例外

// [2025年度下限, 文号]
const LOW_2025 = {
  beijing: [7162, '京人社发〔2025〕11号'],
  tianjin: [5124, '津人社局发〔2025〕6号'],
  hebei: [4007, '冀人社字〔2025〕105号'],
  shanxi: [4198, '晋人社发〔2025〕35号'],
  neimenggu: [4907, '内人社办发〔2025〕160号'],
  liaoning: [4359, '辽人社 2025年度'],
  jilin: [4393.2, '吉人社联〔2025〕97号'],
  heilongjiang: [4542, '黑人社函〔2024〕548号'],
  shanghai: [7460, '沪人社局 2025年度'],
  jiangsu: [4952, '苏人社发〔2025〕33号'],
  zhejiang: [4986, '浙人社发〔2025〕52号'],
  anhui: [4311, '皖人社秘〔2025〕154号'],
  fujian: [4521, '闽人社文〔2025〕45号'],
  jiangxi: [3915, '赣人社 2025年度'],
  shandong: [4504, '鲁人社字〔2025〕91号'],
  henan: [3831, '豫人社 2025年度'],
  hubei: [4498, '鄂人社 2025年度（分三档）'],
  hunan: [4072, '湘人社 2025-09-22'],
  guangdong: [4775, '粤人社 2025年度'],
  guangxi: [4143, '桂人社 2025年度'],
  hainan: [4912.8, '琼人社 2025年度'],
  chongqing: [4404, '渝人社 2025年度'],
  sichuan: [4588, '川人社 2025年度'],
  guizhou: [4394.7, '黔人社 2025年度'],
  yunnan: [4357, '云人社 2025年度'],
  xizang: [7066.2, '藏人社 2025年度'],
  shaanxi: [4650, '陕人社函〔2025〕424号'],
  gansu: [4403, '甘人社 2025年度'],
  qinghai: [5289.6, '青人社 2025年度'],
  ningxia: [4955, '宁人社 2025年度'],
  xinjiang: [5069, '新人社 2025年度'],
};

const YEAR = 2025;
console.log(`=== 31 省「${YEAR} 年度缴费」分母自洽性检验 ===\n`);
console.log('判据：分母应 = 该年度下限 ÷ 0.6（下限缴费者指数必须 = 0.6）\n');
console.log('省份         规则      下限      期望分母   引擎分母   偏差      判定');
const rows = [];
for (const [code, [lo, doc]] of Object.entries(LOW_2025)) {
  const cfg = data.getConfig(code);
  if (!cfg) { console.log(code + ' 缺配置'); continue; }
  const hist = cfg.avg_salary_history || cfg.AVG_SALARY_HISTORY || {};
  const rule = Calc.PROVINCE_RULES[code] || { denom: 'prev' };
  const expect = lo / 0.6;
  const got = Calc.getDenominator(rule, hist, YEAR);
  const name = cfg.province_name || cfg.name || code;
  const dev = got ? (got / expect - 1) * 100 : NaN;
  const ok = Math.abs(dev) < 0.5;
  const isException = !!KNOWN_EXCEPTIONS[code];
  const pad = (s, n) => String(s ?? '—').padEnd(n);
  let mark;
  if (isException) mark = '⚪ 已知例外（有意晚一年）';
  else if (ok) mark = '✅';
  else mark = '❌ 需查';
  console.log(`${pad(name, 12)} ${pad(rule.denom, 8)} ${pad(lo, 9)} ${pad(expect.toFixed(1), 10)} ${pad(got, 10)} ${pad(dev.toFixed(2) + '%', 9)} ${mark}`);
  rows.push({ code, name, denom: rule.denom, expect, got, dev, ok, isException, doc });
}
const bad = rows.filter(r => !r.ok && !r.isException);
console.log(`\n非例外省中的不自洽：${bad.length} / ${rows.filter(r => !r.isException).length}`);
if (bad.length) {
  console.log('\n--- 需查清单 ---');
  for (const r of bad) {
    console.log(`  ${r.name}（denom=${r.denom}）期望 ${r.expect.toFixed(1)}，实取 ${r.got}，偏差 ${r.dev.toFixed(2)}%  [${r.doc}]`);
  }
}
console.log('\n--- 已知例外（判据不适用，勿按本脚本改）---');
for (const r of rows.filter(r => r.isException)) {
  console.log(`  ${r.name}：实取 ${r.got}（比基数口径晚一年），偏差 ${r.dev.toFixed(2)}% —— ${KNOWN_EXCEPTIONS[r.code]}`);
}
