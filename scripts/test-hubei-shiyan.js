const path = require('path');
const fs = require('fs');

let engine;
const TRY_PATHS = ['./engine/pension-engine.js', './cloudfunctions/calculate/pension-engine.js'];
for (const p of TRY_PATHS) { if (fs.existsSync(p)) { engine = require(path.resolve(p)); break; } }
if (!engine) { console.error('找不到引擎'); process.exit(1); }
const { calculate } = engine;

const config = require(path.resolve('./cloudfunctions/calculate/provinces/hubei.js')).getEngineConfig();

const input = {
  name: '湖北十堰案例',
  gender: 'female',
  birthYear: 1974,
  birthMonth: 7,
  workYear: 2011,
  workMonth: 7,
  retireDateInput: { year: 2026, month: 6 },
  avgIndex: 0.5841,
  personalAcc: 50643,
  months: 185.4,
  totalYears: 15,
  sightYears: 0,
  cityType: 'shiyan',
};

const res = calculate(config, input);
const leg = res.legal;
console.log('== 湖北十堰案例（2026-06 退休）==');
console.log('基数: ret=' + leg.baseRetire + ', prov=' + leg.baseProv);
console.log('年限: total=' + leg.totalYears.toFixed(4) + '(' + Math.round(leg.totalYears * 12) + '月), sight=' + leg.sightYears.toFixed(4) + ', actual=' + leg.actualYears.toFixed(4));
console.log('基础: ' + leg.basicPension.amount.toFixed(2) + ' | ' + leg.basicPension.description);
console.log('个人: ' + leg.personalAccount.amount.toFixed(2) + ' | ' + leg.personalAccount.description);
console.log('过渡: ' + leg.transitionalPension.amount.toFixed(2) + ' | ' + leg.transitionalPension.description);
console.log('合计: ' + leg.total.toFixed(2) + '   (核定表=1145.21)');
console.log('差额: 基础' + (leg.basicPension.amount - 872.05).toFixed(2) + ' 个人' + (leg.personalAccount.amount - 273.16).toFixed(2) + ' 过渡' + (leg.transitionalPension.amount - 0).toFixed(2) + ' 合计' + (leg.total - 1145.21).toFixed(2));
