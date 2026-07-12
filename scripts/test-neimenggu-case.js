const path = require('path');
const fs = require('fs');

let engine;
const TRY_PATHS = ['./engine/pension-engine.js', './cloudfunctions/calculate/pension-engine.js'];
for (const p of TRY_PATHS) { if (fs.existsSync(p)) { engine = require(path.resolve(p)); break; } }
if (!engine) { console.error('找不到引擎'); process.exit(1); }
const { calculate } = engine;

const prov = 'neimenggu';
const config = require(path.resolve('./cloudfunctions/calculate/provinces/' + prov + '.js')).getEngineConfig();

const base = {
  name: '内蒙古案例',
  gender: 'male', birthYear: 1962, birthMonth: 9,
  workYear: 1980, workMonth: 11,
  retireDateInput: { year: 2022, month: 9 },
  avgIndex: 1.7318,
  personalAcc: 199050.07,
  months: 139,
  sightYears: 206 / 12,
  totalYears: 503 / 12,
};

function run(label, extra) {
  const input = Object.assign({}, base, extra);
  const res = calculate(config, input);
  const leg = res.legal;
  console.log('\n=== ' + label + ' ===');
  console.log('基数: ret=' + leg.baseRetire + ', prov=' + leg.baseProv);
  console.log('年限: total=' + (leg.totalYears * 12).toFixed(2) + '月 sight=' + (leg.sightYears * 12).toFixed(2) + '月 actual=' + (leg.actualYears * 12).toFixed(2) + '月');
  console.log('基础: ' + leg.basicPension.amount.toFixed(2) + '  公式:' + leg.basicPension.description);
  console.log('个人: ' + leg.personalAccount.amount.toFixed(2) + '  公式:' + leg.personalAccount.description);
  console.log('过渡: ' + leg.transitionalPension.amount.toFixed(2) + '  公式:' + leg.transitionalPension.description);
  console.log('合计: ' + leg.total.toFixed(2) + '   (核定新办法=8019.76)');
  const diff = leg.total - 8019.76;
  console.log('差额: 基础' + (leg.basicPension.amount - 4058.74).toFixed(2) + ' 个人' + (leg.personalAccount.amount - 1432.01).toFixed(2) + ' 过渡' + (leg.transitionalPension.amount - 2529.01).toFixed(2) + ' 合计' + diff.toFixed(2));
}

run('A. 默认数据库基数(2022查询)', {});
run('B. 表上基数7089', { baseRetire: 7089, baseProv: 7089 });
run('C. 表上基数+整数月(503/206)', { baseRetire: 7089, baseProv: 7089, totalYears: 503 / 12, sightYears: 206 / 12 });
run('D. 表上基数+41年11月(503/12精确)', { baseRetire: 7089, baseProv: 7089 });
