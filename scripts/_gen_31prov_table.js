// 生成 31 省横评篇正文用的 Markdown 表格（语义统一后新值）
const path = require('path');
const engine = require(path.join(__dirname, '..', 'cloudfunctions', 'calculate', 'pension-engine.js'));
const { getConfig } = require(path.join(__dirname, '..', 'cloudfunctions', 'calculate', 'provinces-data.js'));
const F = (n, p = 2) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PROVS = [
  ['beijing', '北京'], ['tianjin', '天津'], ['hebei', '河北'], ['shanxi', '山西'], ['neimenggu', '内蒙古'],
  ['liaoning', '辽宁'], ['jilin', '吉林'], ['heilongjiang', '黑龙江'], ['shanghai', '上海'], ['jiangsu', '江苏'],
  ['zhejiang', '浙江'], ['anhui', '安徽'], ['fujian', '福建'], ['jiangxi', '江西'], ['shandong', '山东'],
  ['henan', '河南'], ['hubei', '湖北'], ['hunan', '湖南'], ['guangdong', '广东'], ['guangxi', '广西'],
  ['hainan', '海南'], ['chongqing', '重庆'], ['sichuan', '四川'], ['guizhou', '贵州'], ['yunnan', '云南'],
  ['xizang', '西藏'], ['shaanxi', '陕西'], ['gansu', '甘肃'], ['qinghai', '青海'], ['ningxia', '宁夏'],
  ['xinjiang', '新疆'],
];

const rows = PROVS.map(([code, name]) => {
  const r = engine.calculate(getConfig(code), {
    gender: 'male', genderType: 'male', birthYear: 1965, birthMonth: 9,
    workYear: 1987, workMonth: 7, avgIndex: 1.0, cityType: 'prov',
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
    code, name, base, pers, trans,
    A, localB: Math.round(localB * 100) / 100,
    total: r.total, sight: r.sightYears,
  };
});
rows.sort((a, b) => b.A - a.A);
const maxA = rows[0].A, minA = rows[rows.length - 1].A;
const maxT = Math.max(...rows.map(r => r.total)), minT = Math.min(...rows.map(r => r.total));

const out = [];
rows.forEach((x, i) => {
  const rank = i + 1;
  const nm = x.name === '吉林' ? '**吉林**' : x.name;
  const aCell = (x.A === maxA || x.A === minA) ? `**${F(x.A)}**` : F(x.A);
  const tCell = (x.total === maxT || x.total === minT) ? `**${F(x.total)}**` : F(x.total);
  const bCell = x.localB ? F(x.localB) : '0';
  out.push(`| ${rank} | ${nm} | ${aCell} | ${F(x.base)} | ${F(x.trans)} | ${F(x.pers)} | ${bCell} | ${tCell} | ${F(x.sight)} |`);
});
console.log(out.join('\n'));
console.log('\n--- 汇总 ---');
console.log(`口径A 极差 ${(maxA / minA).toFixed(3)} 倍，差 ${F(maxA - minA)} 元/月`);
console.log(`到手 极差 ${(maxT / minT).toFixed(3)} 倍，差 ${F(maxT - minT)} 元/月`);
