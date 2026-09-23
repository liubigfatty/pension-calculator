// 31省横评验算：同一个人换个省退休（D + F 合并）
// 口径：男职工 1965-09 生 · 22岁(1987-07)参工 · 按当地社平100%缴(avgIndex=1.0) · 2025-12退 · 全省口径 · 不断缴
//
// 【口径分层】
//   A 全国公式（国发〔2005〕38号三块）= 基础 + 个账 + 过渡性   ← 主排名用这个，全国可比
//   B 地方加项 = 长缴增发 + 地方补贴 + 过渡调节金 + 特殊待遇
//   合计 = A + B
// 【修正记录】
//   1. 广东过渡性须加 _adjustment（过渡期调整额单列计入总额），否则只有 252 而非 1353.08
//   2. 贵州 specialAddition 为「独生子女增发 5%」，引擎无条件计发（需《独生子女证》），
//      属条件性待遇，横评计入口径 B 并显式标注，不参与口径 A
const ROOT = 'C:/Users/14041/WorkBuddy/2026-07-16-10-20-33/养老金计算平台';
const engine = require(ROOT + '/cloudfunctions/calculate/pension-engine.js');
const { getConfig } = require(ROOT + '/cloudfunctions/calculate/provinces-data.js');

const F = (n, p = 2) => Number(n).toFixed(p);
let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ ' + msg + (extra ? '  → ' + extra : '')); }
}
function eq(a, b, tol, msg) { ok(Math.abs(a - b) <= tol, msg + '  [' + F(a) + ' vs ' + F(b) + ']'); }

const PROVS = [
  ['beijing', '北京'], ['tianjin', '天津'], ['hebei', '河北'], ['shanxi', '山西'], ['neimenggu', '内蒙古'],
  ['liaoning', '辽宁'], ['jilin', '吉林'], ['heilongjiang', '黑龙江'], ['shanghai', '上海'], ['jiangsu', '江苏'],
  ['zhejiang', '浙江'], ['anhui', '安徽'], ['fujian', '福建'], ['jiangxi', '江西'], ['shandong', '山东'],
  ['henan', '河南'], ['hubei', '湖北'], ['hunan', '湖南'], ['guangdong', '广东'], ['guangxi', '广西'],
  ['hainan', '海南'], ['chongqing', '重庆'], ['sichuan', '四川'], ['guizhou', '贵州'], ['yunnan', '云南'],
  ['xizang', '西藏'], ['shaanxi', '陕西'], ['gansu', '甘肃'], ['qinghai', '青海'], ['ningxia', '宁夏'],
  ['xinjiang', '新疆'],
];

function run(code, tier) {
  const r = engine.calculate(getConfig(code), {
    gender: 'male', genderType: 'male',
    birthYear: 1965, birthMonth: 9,
    workYear: 1987, workMonth: 7,
    avgIndex: tier === undefined ? 1.0 : tier, cityType: 'prov',
    retireDateInput: { year: 2025, month: 12 },
  }).legal;
  const tp = r.transitionalPension || {};
  const adj = tp._adjustment || 0;                       // 广东/深圳过渡期调整额
  const base = r.basicPension ? r.basicPension.amount : 0;
  const pers = r.personalAccount ? r.personalAccount.amount : 0;
  const trans = (tp.amount || 0) + adj;
  const extra = r.extraPension ? r.extraPension.amount : 0;
  const spec = r.specialAddition ? r.specialAddition.amount : 0;
  const fund = r.adjustmentFund ? r.adjustmentFund.amount : 0;
  const localB = Math.round((extra + spec + fund) * 100) / 100;
  const A = Math.round((base + pers + trans) * 100) / 100;
  return {
    code,
    base, pers, trans, transSplit: tp.amount || 0, transAdj: adj,
    extra, spec, fund, localB, A,
    total: r.total,
    sight: r.sightYears, actual: r.actualYears, totalY: r.totalYears,
    months: r.months, baseRetire: r.baseRetire,
    desc: tp.description || '',
    specDesc: r.specialAddition ? r.specialAddition.description : '',
  };
}

console.log('═══ 第一部分：31 省全量（100 档 · 男 60 岁 3 个月 · 2025-12 退 · 全省口径）═══\n');
const rows = [];
for (const [code, nm] of PROVS) {
  try { rows.push(Object.assign({ nm }, run(code))); }
  catch (e) { console.log('  ERR ' + nm + ': ' + e.message.slice(0, 60)); }
}
ok(rows.length === 31, '31 省全部跑通', '实际 ' + rows.length);

// 主排名：口径 A（全国公式三块）
const rankA = [...rows].sort((a, b) => b.A - a.A);
console.log('\n【口径 A · 全国统一公式三块：基础 + 个账 + 过渡性】');
console.log('排名 | 省     |  A合计  | 基础     | 过渡     | 个账     | B地方项 | 合计到手 | 视同年 | 每年视同值 | 过渡占A');
rankA.forEach((r, i) => {
  const per = r.sight > 0 ? r.trans / r.sight : 0;
  console.log(
    String(i + 1).padStart(3) + '  | ' + r.nm.padEnd(5) + ' | ' + F(r.A).padStart(7) +
    ' | ' + F(r.base).padStart(8) + ' | ' + F(r.trans).padStart(8) + ' | ' + F(r.pers).padStart(8) +
    ' | ' + F(r.localB).padStart(7) + ' | ' + F(r.total).padStart(8) +
    ' | ' + F(r.sight).padStart(5) + ' | ' + F(per).padStart(9) + ' | ' + F(r.trans / r.A * 100, 1).padStart(5) + '%');
});

const aTop = rankA[0], aBot = rankA[rankA.length - 1];
console.log('\n口径 A 极差 ' + F(aTop.A / aBot.A, 3) + ' 倍 | 最高 ' + aTop.nm + ' ' + F(aTop.A) +
  ' | 最低 ' + aBot.nm + ' ' + F(aBot.A) + ' | 差额 ' + F(aTop.A - aBot.A) + ' 元/月');
const rTop = [...rows].sort((a, b) => b.total - a.total);
console.log('合计到手极差 ' + F(rTop[0].total / rTop[rTop.length - 1].total, 3) + ' 倍 | 最高 ' +
  rTop[0].nm + ' ' + F(rTop[0].total) + ' | 最低 ' + rTop[rTop.length - 1].nm + ' ' + F(rTop[rTop.length - 1].total) +
  ' | 差额 ' + F(rTop[0].total - rTop[rTop.length - 1].total));

console.log('\n【断言 · 全量口径】');
ok(rows.every(r => r.total > 0), '全部 31 省月领 > 0');
ok(rankA[0].nm === '西藏', '口径 A（纯公式）最高为西藏（地方项前仅领先上海 59.97）', rankA[0].nm);
ok(rTop[0].nm === '西藏', '合计到手最高为西藏（靠 918.73 地方补贴反超）', rTop[0].nm);
ok(rankA[rankA.length - 1].nm === '河南', '口径 A 最低为河南', rankA[rankA.length - 1].nm);
// 浙江见分进角（round_to_jiao）：合计向上取整到角，容差放宽到 0.1
eq(rows.reduce((s, r) => Math.abs(r.A + r.localB - r.total) > 0.1 ? s + 1 : s, 0), 0, 0, 'A + B = 合计到手（容差 0.1，浙江见分进角）');
eq(rows.find(r => r.nm === '西藏').localB, 918.73, 0.01, '西藏地方项 = 918.73（高原补贴588.85+过渡期福利260+取暖39.88+交通30）');
eq(rows.find(r => r.nm === '西藏').A - rows.find(r => r.nm === '上海').A, 59.97, 0.01, '西藏口径A比上海高 59.97（到手反超 978.70）');
eq(rows.find(r => r.nm === '广东').trans, 1353.08, 0.01, '广东过渡性 = 1353.08（分项 252.00 + 调整额 1101.08）');
eq(rows.find(r => r.nm === '广东').transSplit, 252.00, 0.01, '广东过渡性分项仍为 252.00');
eq(rows.find(r => r.nm === '广东').transAdj, 1101.08, 0.01, '广东过渡期调整额 = 1101.08');
eq(rows.find(r => r.nm === '吉林').extra, 282.20, 0.01, '吉林长缴增发 = 282.20（计入口径 B，不参与 A 排名）');
eq(rows.find(r => r.nm === '贵州').spec, 0, 0.01, '贵州独生子女增发：引擎修复后默认 0（须 data.oneChild，2026-09-19）');

console.log('\n【断言 · 计发月数不是 139】');
eq(rows[0].months, 137.3, 0.01, '延迟到 60 岁 3 个月，计发月数 = 137.3（非 139）');
ok(rows.every(r => Math.abs(r.months - 137.3) < 0.01), '全部 31 省计发月数 = 137.3');

console.log('\n═══ 第二部分：F 核心 · 同样一年「视同缴费」，各省值多少钱 ═══\n');
const withSight = rows.filter(r => r.sight > 0).map(r => ({
  nm: r.nm, sight: r.sight, trans: r.trans, per: r.trans / r.sight, ratio: r.trans / r.A * 100,
})).sort((a, b) => b.per - a.per);
console.log('排名 | 省     | 视同年 | 过渡性   | 每年视同值 | 占口径A');
withSight.forEach((r, i) => console.log(
  String(i + 1).padStart(3) + '  | ' + r.nm.padEnd(5) + ' | ' + F(r.sight).padStart(5) +
  ' | ' + F(r.trans).padStart(8) + ' | ' + F(r.per).padStart(9) + ' | ' + F(r.ratio, 1).padStart(5) + '%'));
const pTop = withSight[0], pBot = withSight[withSight.length - 1];
console.log('\n每年视同值 极差 ' + F(pTop.per / pBot.per, 2) + ' 倍（' + pTop.nm + ' ' + F(pTop.per) +
  ' vs ' + pBot.nm + ' ' + F(pBot.per) + '）');
console.log('视同年限区间 ' + F(Math.min(...withSight.map(r => r.sight))) + ' ~ ' + F(Math.max(...withSight.map(r => r.sight))) + ' 年');
ok(pTop.nm === '北京', '每年视同值最高为北京', pTop.nm);
ok(pBot.nm === '河南', '每年视同值最低为河南', pBot.nm);
ok(withSight.length === 31, '31 省全部有视同缴费年限');

console.log('\n═══ 第三部分：视同年限从哪来 —— 各省建账时点 ═══\n');
const bySight = rows.map(r => ({ nm: r.nm, sight: r.sight, per: r.trans / r.sight, trans: r.trans }))
  .sort((a, b) => b.sight - a.sight);
console.log('省     | 视同年 | 推算建账时点 | 每年视同值 | 过渡性合计');
bySight.forEach(r => {
  const mTotal = 1987 * 12 + 7 + Math.round(r.sight * 12);
  const y = Math.floor(mTotal / 12), m = mTotal % 12;
  console.log(r.nm.padEnd(5) + ' | ' + F(r.sight).padStart(5) + ' | ' +
    (y + '-' + String(m === 0 ? 12 : m).padStart(2, '0')).padStart(12) +
    ' | ' + F(r.per).padStart(9) + ' | ' + F(r.trans).padStart(8));
});
const sightSpread = F(Math.max(...rows.map(r => r.sight)) / Math.min(...rows.map(r => r.sight)), 2);
const perSpread = F(pTop.per / pBot.per, 2);
console.log('\n【双因子框架：过渡性 = 视同年限 × 每年视同值】');
eq(sightSpread, '2.48', 0.01, '视同年限极差 = 2.48 倍（西藏 13 年 vs 北京 5.25 年）');
eq(perSpread, '2.88', 0.01, '每年视同值极差 = 2.88 倍（北京 252.46 vs 河南 87.59）');
ok(Number(sightSpread) * Number(perSpread) > 7, '两因子相乘可解释 7 倍以上的过渡性差异');

console.log('\n【两个因子是否互相抵消？相关系数】');
function corr(xs, ys) {
  const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); dx += (xs[i] - mx) ** 2; dy += (ys[i] - my) ** 2; }
  return num / Math.sqrt(dx * dy);
}
const cc = corr(rows.map(r => r.sight), rows.map(r => r.sight > 0 ? r.trans / r.sight : 0));
console.log('  视同年限 vs 每年视同值 的相关系数 r = ' + F(cc, 4));
console.log('  r < 0 ⇒ 建账越晚的省（视同年越长），每年定价反而越低，两个因子部分相互抵消');
ok(cc < 0, '两个因子负相关（r = ' + F(cc, 4) + ' < 0）');
const ratioSpread = F(Math.max(...rows.map(r => r.trans / r.A * 100)) / Math.min(...rows.map(r => r.trans / r.A * 100)), 2);
console.log('  过渡性占口径 A 比重：西藏 ' + F(rows.find(r => r.nm === '西藏').trans / rows.find(r => r.nm === '西藏').A * 100, 1) +
  '% ~ 上海 ' + F(rows.find(r => r.nm === '上海').trans / rows.find(r => r.nm === '上海').A * 100, 1) + '%，极差 ' + ratioSpread + ' 倍');
ok(Math.abs(Number(ratioSpread) - 2.59) < 0.02, '过渡性占比极差 = 2.59 倍');

console.log('\n═══ 第四部分：视同制度贡献了多少省际差距 ═══\n');
const noTrans = rows.map(r => ({ nm: r.nm, v: r.base + r.pers })).sort((a, b) => b.v - a.v);
const ntSpread = F(noTrans[0].v / noTrans[noTrans.length - 1].v, 3);
console.log('剔除过渡性后（只比基础+个账）极差 ' + ntSpread + ' 倍 | 最高 ' + noTrans[0].nm +
  ' ' + F(noTrans[0].v) + ' | 最低 ' + noTrans[noTrans.length - 1].nm + ' ' + F(noTrans[noTrans.length - 1].v));
console.log('含过渡性（口径 A）极差 ' + F(aTop.A / aBot.A, 3) + ' 倍');
console.log('⇒ 过渡性把省际差距从 ' + ntSpread + ' 倍放大到 ' + F(aTop.A / aBot.A, 3) + ' 倍，放大幅度 ' +
  F((aTop.A / aBot.A) / (noTrans[0].v / noTrans[noTrans.length - 1].v) * 100 - 100, 1) + '%');

console.log('\n═══ 第五部分：稳健性检验 —— 换成 60 档，排序稳不稳 ═══\n');
const rows60 = [];
for (const [code, nm] of PROVS) { try { rows60.push(Object.assign({ nm }, run(code, 0.6))); } catch (e) { } }
const rank60A = [...rows60].sort((a, b) => b.A - a.A);
const rankMap = {}; rankA.forEach((r, i) => rankMap[r.nm] = i + 1);
const rank60 = {}; rank60A.forEach((r, i) => rank60[r.nm] = i + 1);
let moved = 0, maxMove = 0, maxMoveNm = '';
rows.forEach(r => {
  const d = Math.abs(rankMap[r.nm] - rank60[r.nm]);
  if (d > 0) moved++;
  if (d > maxMove) { maxMove = d; maxMoveNm = r.nm; }
});
console.log('60 档 vs 100 档（口径 A）：名次变动 ' + moved + '/31 省，最大变动 ' + maxMove + ' 位（' + maxMoveNm + '）');
console.log('60 档前三：' + rank60A.slice(0, 3).map(r => r.nm + ' ' + F(r.A)).join(' / '));
console.log('60 档后三：' + rank60A.slice(-3).map(r => r.nm + ' ' + F(r.A)).join(' / '));
console.log('60 档极差 ' + F(rank60A[0].A / rank60A[rank60A.length - 1].A, 3) + ' 倍');
ok(rank60A[0].nm === '上海', '换档后最高仍是上海', rank60A[0].nm);
ok(rank60A[rank60A.length - 1].nm === '河南', '换档后最低仍是河南', rank60A[rank60A.length - 1].nm);

console.log('\n═══ 第六部分：差距来自哪一块 ═══\n');
const spread = (f) => {
  const v = rows.map(f).filter(x => x > 0);
  return F(Math.max(...v) / Math.min(...v), 3);
};
console.log('四块各自的省际极差：');
console.log('  基础养老金 ' + spread(r => r.base) + ' 倍 | 过渡性 ' + spread(r => r.trans) +
  ' 倍 | 个人账户 ' + spread(r => r.pers) + ' 倍');
console.log('  计发基数   ' + F(Math.max(...rows.map(r => r.baseRetire)) / Math.min(...rows.map(r => r.baseRetire)), 3) +
  ' 倍（' + F(Math.max(...rows.map(r => r.baseRetire))) + ' vs ' + F(Math.min(...rows.map(r => r.baseRetire))) + '）');
console.log('\n吉林（' + F(rows.find(r => r.nm === '吉林').A) + '）与头尾对比：');
const jl = rows.find(r => r.nm === '吉林');
[aTop, aBot].forEach(r => {
  console.log('  ' + r.nm.padEnd(4) + ' A ' + F(r.A).padStart(8) +
    '  基础差 ' + F(r.base - jl.base).padStart(9) +
    '  过渡差 ' + F(r.trans - jl.trans).padStart(9) +
    '  个账差 ' + F(r.pers - jl.pers).padStart(9));
});


// 第四部分派生：剔除过渡性后的极差（正文第六节新增段落）
const ntSpreadNum = noTrans[0].v / noTrans[noTrans.length - 1].v;
eq(ntSpreadNum, 2.061, 0.002, '正文：剔除过渡性后极差 2.061 倍');
eq(aTop.A / aBot.A, 1.947, 0.002, '正文：含过渡性极差 1.947 倍');
ok(ntSpreadNum > aTop.A / aBot.A, '正文：过渡性叠加后总差距略收窄（2.061 → 1.947）');
eq((1 - (aTop.A / aBot.A) / ntSpreadNum) * 100, 5.5, 0.2, '正文：收窄约 5.6%');
eq(rows.find(r => r.nm === '西藏').baseRetire, 11777, 0.01, '正文：西藏计发基数 11,777（全国第二高）');

console.log('\n═══ 第七部分：正文回填校验 ═══\n');
const fs = require('fs');
const ART = 'C:/Users/14041/WorkBuddy/公众号内容库/09-测算案例与规划/_正文-同一个人换个省退休养老金差4833元篇.md';
const art = fs.readFileSync(ART, 'utf8');
const G = (nm) => rows.find(r => r.nm === nm);
const has = (s) => ok(art.includes(s), '正文含「' + s + '」');

// 事实串：正文写出的值必须与脚本计算完全一致
eq(rTop[0].total - rTop[rTop.length - 1].total, 4833.69, 0.01, '正文：到手差额 4,833.69 元/月');
eq(aTop.A - aBot.A, 3914.96, 0.01, '正文：口径 A 差额 3,914.96 元/月');
eq(rTop[0].total - G('上海').total, 978.70, 0.01, '正文：西藏到手反超上海 978.70 元');
eq(pTop.per, 252.46, 0.01, '正文：北京每年视同值 252.46 元');
eq(pBot.per, 87.59, 0.01, '正文：河南每年视同值 87.59 元');
eq(pTop.per / pBot.per, 2.88, 0.01, '正文：每年视同值极差 2.88 倍');
eq(cc, -0.2273, 0.0001, '正文：相关系数 r = −0.2273');
eq(G('西藏').sight - G('北京').sight, 7.75, 0.01, '正文：北京与西藏视同年差 7.75 年');
eq(G('西藏').trans / G('西藏').A * 100, 26.6, 0.05, '正文：西藏过渡性占比 26.6%');
eq(G('上海').trans / G('上海').A * 100, 10.3, 0.05, '正文：上海过渡性占比 10.3%');
eq(G('西藏').trans / G('西藏').A / (G('上海').trans / G('上海').A), 2.59, 0.02, '正文：过渡性占比极差 2.59 倍');
eq(spread(r => r.trans), 3.263, 0.002, '正文：过渡性省际极差 3.263 倍');
eq(spread(r => r.pers), 2.752, 0.002, '正文：个账省际极差 2.752 倍');
eq(spread(r => r.base), 1.845, 0.002, '正文：基础养老金省际极差 1.845 倍');
eq(spread(r => r.trans) / spread(r => r.base), 1.769, 0.01, '正文：过渡性离散度是计发基数的 1.77 倍');
eq(Math.max(...rows.map(r => r.baseRetire)), 12434, 0.01, '正文：计发基数最高 12,434（上海）');
eq(Math.min(...rows.map(r => r.baseRetire)), 6738, 0.01, '正文：计发基数最低 6,738（河南）');
eq(G('上海').A - G('吉林').A, 3399.49, 0.01, '正文：吉林口径A比上海少 3,399.49 元');
eq(G('吉林').total - G('河南').total, 737.70, 0.01, '正文：吉林到手比河南多 737.70 元');
eq(G('吉林').A - G('河南').A, 455.50, 0.01, '正文：吉林口径A比河南多 455.50 元');
eq(G('吉林').trans, 820.06, 0.01, '正文：吉林过渡性 820.06 元');
eq(G('西藏').trans, 2143.41, 0.01, '正文：西藏过渡性 2,143.41 元');

// 正文必须出现的字符串
['4,134.71', '8,968.40', '4,833.69', '7,989.70', '8,049.67', '918.73', '588.85', '260.00', '39.88',
 '3,914.96', '1.947', '2.027', '252.46', '87.59', '2.88', '137.3', '13.00', '5.25', '7.75',
 '26.6%', '10.3%', '2.59', '3.263', '2.752', '1.845', '12,434', '6,738', '4,590.21', '4,872.41',
 '3,399.49', '737.70', '820.06', '2,143.41', '595.25', '282.20', '325.08', '248.70', '1,353.08',
 '252.00', '1,101.08', '国办发〔2009〕66 号', '137.3', '户籍优先，从长从后'
].forEach(has);

// 引用纪律：不得指向未发表稿件
console.log('\n【引用纪律】');
['缴满15年', '两个杠杆', '5.71', '第四套生命表', '看懂医保体系', '2亿灵活就业', '7月1日没取消'
].forEach(k => ok(!art.includes(k), '正文未引用未发表稿件关键词「' + k + '」'));

console.log('\n═══ 结果：' + pass + ' 通过 / ' + fail + ' 失败 ═══\n');
process.exit(fail === 0 ? 0 : 1);
