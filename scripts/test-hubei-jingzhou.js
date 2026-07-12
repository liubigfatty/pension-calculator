const path = require('path');
const fs = require('fs');

let engine;
const TRY_PATHS = ['./engine/pension-engine.js', './cloudfunctions/calculate/pension-engine.js'];
for (const p of TRY_PATHS) { if (fs.existsSync(p)) { engine = require(path.resolve(p)); break; } }
if (!engine) { console.error('找不到引擎'); process.exit(1); }
const { calculate } = engine;

const prov = 'hubei';
const config = require(path.resolve(`./cloudfunctions/calculate/provinces/${prov}.js`)).getEngineConfig();

const base = {
  name: '湖北荆州行业统筹企业案例',
  gender: 'male', birthYear: 1966, birthMonth: 4,
  workYear: 1984, workMonth: 10,
  retireDateInput: { year: 2026, month: 4 },
  cityType: '荆州',
  avgIndex: 0.8463,
  personalAcc: 90001.62,
  months: 139,
  // 表上给出的精确年限
  totalYears: 499/12,   // 41年7个月 = 41.58年(表上)
  sightYears: 170/12,   // 14年2个月 = 14.17年(表上)
  actualYears: 329/12,  // 27年5个月 = 27.41年(表上)
};

function run(label, extra) {
  const input = { ...base, ...extra };
  const res = calculate(config, input);
  const leg = res.legal;
  console.log(`\n=== ${label} ===`);
  console.log(`城市: ${input.cityType || '(无)'}, 基数: ret=${leg.baseRetire}, prov=${leg.baseProv}`);
  console.log(`年限: total=${leg.totalYears.toFixed(4)}(${Math.round(leg.totalYears*12)}月) sight=${leg.sightYears.toFixed(4)}(${Math.round(leg.sightYears*12)}月) actual=${leg.actualYears.toFixed(4)}(${Math.round(leg.actualYears*12)}月)`);
  console.log(`基础: ${leg.basicPension.amount.toFixed(2)}  公式:${leg.basicPension.description}`);
  console.log(`个人: ${leg.personalAccount.amount.toFixed(2)}  公式:${leg.personalAccount.description}`);
  console.log(`过渡: ${leg.transitionalPension.amount.toFixed(2)}  公式:${leg.transitionalPension.description}`);
  console.log(`合计: ${leg.total.toFixed(2)}   (核定表=4452.57)`);
  const diff = leg.total - 4452.57;
  console.log(`差额: 基础${(leg.basicPension.amount-2767.53).toFixed(2)} 个人${(leg.personalAccount.amount-647.49).toFixed(2)} 过渡${(leg.transitionalPension.amount-1037.55).toFixed(2)} 合计${diff.toFixed(2)}`);
}

run('A. 默认accountStart(1998-01), 传表上年限');
run('B. 默认accountStart, 不传年限(让引擎自动算)');
run('C. accountStart=1998-12(行业统筹), 传表上年限');
run('D. accountStart=1998-12, 不传年限(让引擎自动算)');
run('E. 用默认accountStart但cutoff_date=1997-12, 自动算');
run('F. 手动用基数7210+表上年限', { baseRetire: 7210, baseProv: 7210 });
run('G. 手动用基数7210+accountStart=1998-12+自动算年限', { baseRetire: 7210, baseProv: 7210, accountStart: { year: 1998, month: 12 } });
