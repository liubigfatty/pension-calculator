const path = require('path');
const fs = require('fs');

let engine;
const TRY_PATHS = ['./engine/pension-engine.js', './cloudfunctions/calculate/pension-engine.js'];
for (const p of TRY_PATHS) { if (fs.existsSync(p)) { engine = require(path.resolve(p)); break; } }
if (!engine) { console.error('找不到引擎'); process.exit(1); }
const { calculate } = engine;

const prov = 'hubei';
const config = require(path.resolve(`./cloudfunctions/calculate/provinces/${prov}.js`)).getEngineConfig();

function run(label, input) {
  const res = calculate(config, input);
  const leg = res.legal;
  console.log(`\n=== ${label} ===`);
  console.log(`年限: total=${(leg.totalYears*12).toFixed(2)}月 sight=${(leg.sightYears*12).toFixed(2)}月 actual=${(leg.actualYears*12).toFixed(2)}月`);
  console.log(`基础: ${leg.basicPension.amount.toFixed(2)}`);
  console.log(`个人: ${leg.personalAccount.amount.toFixed(2)}`);
  console.log(`过渡: ${leg.transitionalPension.amount.toFixed(2)}`);
  console.log(`合计: ${leg.total.toFixed(2)}`);
}

run('只传 accountStart + total_years', {
  name: '湖北荆州行业统筹',
  gender: 'male', birthYear: 1966, birthMonth: 4,
  workYear: 1984, workMonth: 10,
  retireDateInput: { year: 2026, month: 4 },
  cityType: '荆州',
  avgIndex: 0.8463,
  personalAcc: 90001.62,
  months: 139,
  accountStart: { year: 1998, month: 12 },
  totalYears: 499/12,
});
