// 语义统一（SALARY_SEMANTICS_V2）后，重算 31 省横评篇的全部关键数字
// 输出：排名表 + 极值/极差 + 60%档对照 + 过渡性占比
const ROOT = 'C:/Users/14041/WorkBuddy/2026-07-31-15-34-37/../2026-07-16-10-20-33/养老金计算平台';
const path = require('path');
const engine = require(path.join(__dirname, '..', 'cloudfunctions', 'calculate', 'pension-engine.js'));
const { getConfig } = require(path.join(__dirname, '..', 'cloudfunctions', 'calculate', 'provinces-data.js'));
const F = (n, p = 2) => Number(n).toFixed(p);

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
    birthYear: 1965, birthMonth: 9, workYear: 1987, workMonth: 7,
    avgIndex: tier, cityType: 'prov',
    retireDateInput: { year: 2025, month: 12 },
  }).legal;
  const tp = r.transitionalPension || {};
  const base = r.basicPension ? r.basicPension.amount : 0;
  const pers = r.personalAccount ? r.personalAccount.amount : 0;
  const trans = (tp.amount || 0) + (tp._adjustment || 0);
  const localB = (r.extraPension ? r.extraPension.amount : 0)
    + (r.specialAddition ? r.specialAddition.amount : 0)
    + (r.adjustmentFund ? r.adjustmentFund.amount : 0);
  const A = Math.round((base + pers + trans) * 100) / 100;
  return {
    code, base, pers, trans,
    A, localB: Math.round(localB * 100) / 100, total: r.total,
    sight: r.sightYears, actual: r.actualYears, baseRetire: r.baseRetire,
  };
}

function report(tier, label) {
  const rows = PROVS.map(([c, n]) => ({ ...run(c, tier), name: n }));
  const byA = [...rows].sort((a, b) => b.A - a.A);
  const byT = [...rows].sort((a, b) => b.total - a.total);
  console.log(`\n${'='.repeat(70)}\n【${label}】\n${'='.repeat(70)}`);
  console.log('名次  省     基础      个账      过渡性     A口径     地方B     到手');
  byA.forEach((x, i) => {
    console.log([
      String(i + 1).padStart(3), x.name.padEnd(5),
      F(x.base).padStart(9), F(x.pers).padStart(9), F(x.trans).padStart(9),
      F(x.A).padStart(9), F(x.localB).padStart(8), F(x.total).padStart(9),
    ].join('  '));
  });
  const maxA = byA[0], minA = byA[byA.length - 1];
  const maxT = byT[0], minT = byT[byT.length - 1];
  console.log(`\n口径A 最高=${maxA.name} ${F(maxA.A)}  最低=${minA.name} ${F(minA.A)}  极差=${F(maxA.A / minA.A, 3)}倍  差额=${F(maxA.A - minA.A)}`);
  console.log(`到手  最高=${maxT.name} ${F(maxT.total)}  最低=${minT.name} ${F(minT.total)}  极差=${F(maxT.total / minT.total, 3)}倍  差额=${F(maxT.total - minT.total)}`);
  // 过渡性占比
  const ratio = rows.map(x => ({ name: x.name, r: x.trans / x.A }));
  const rs = [...ratio].sort((a, b) => b.r - a.r);
  console.log(`过渡性占比 最高=${rs[0].name} ${F(rs[0].r * 100, 1)}%  最低=${rs[rs.length - 1].name} ${F(rs[rs.length - 1].r * 100, 1)}%  极差=${F(rs[0].r / rs[rs.length - 1].r, 3)}倍`);
  // 剔除过渡性后极差
  const noT = rows.map(x => ({ name: x.name, v: x.base + x.pers })).sort((a, b) => b.v - a.v);
  console.log(`剔除过渡性(基础+个账) 最高=${noT[0].name} ${F(noT[0].v)}  最低=${noT[noT.length - 1].name} ${F(noT[noT.length - 1].v)}  极差=${F(noT[0].v / noT[noT.length - 1].v, 3)}倍`);
  // 单块极差
  const ext = f => {
    const s = rows.map(x => ({ name: x.name, v: f(x) })).sort((a, b) => b.v - a.v);
    return `${s[0].name}/${s[s.length - 1].name} ${F(s[0].v / s[s.length - 1].v, 3)}倍`;
  };
  console.log(`基础养老金极差: ${ext(x => x.base)}`);
  console.log(`个人账户极差:   ${ext(x => x.pers)}`);
  console.log(`过渡性极差:     ${ext(x => x.trans)}`);
  return { rows, byA, byT };
}

const r100 = report(1.0, '100% 档');
const r60 = report(0.6, '60% 档');

// 名次变动
const rankA100 = {}; r100.byA.forEach((x, i) => rankA100[x.code] = i + 1);
const rankA60 = {}; r60.byA.forEach((x, i) => rankA60[x.code] = i + 1);
let changed = 0;
for (const [c] of PROVS) if (rankA100[c] !== rankA60[c]) changed++;
console.log(`\n100%档 vs 60%档：口径A 名次变动 ${changed}/31 省`);
console.log(`60%档 口径A 最高=${r60.byA[0].name} 最低=${r60.byA[r60.byA.length - 1].name}`);
console.log(`100%档 口径A 最高=${r100.byA[0].name} 最低=${r100.byA[r100.byA.length - 1].name}`);

// 关键对照
const g = (rows, code) => rows.find(x => x.code === code);
for (const [a, b] of [['shanghai', 'xizang'], ['jilin', 'shanghai'], ['jilin', 'henan']]) {
  const x = g(r100.rows, a), y = g(r100.rows, b);
  console.log(`${x.name} vs ${y.name}: A差=${F(x.A - y.A)}  到手差=${F(x.total - y.total)}`);
}
const sh = g(r100.rows, 'shanghai'), xz = g(r100.rows, 'xizang');
console.log(`\n上海 A=${F(sh.A)} 到手=${F(sh.total)} / 西藏 A=${F(xz.A)} 到手=${F(xz.total)}`);
console.log(`西藏到手反超上海 ${F(xz.total - sh.total)} 元；上海A比西藏 ${F(sh.A - xz.A)} 元`);
