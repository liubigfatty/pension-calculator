const { calculateIndex, inferIndexFromBalance } = require('../index-engine/calcIndex.js');
const PROVINCES = require('../index-mini/cloudfunctions/calcIndex/provinces-data.js');
const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '_xls_yearly.json'), 'utf8'));
const pc = PROVINCES['jilin'];
const { start_year, start_month, total_months, monthly_avg, principal_sum, yearly } = data;

function buildUniform(sy, sm, tm, mb) {
  const out = []; let rem = tm, y = sy, m = sm;
  while (rem > 0) {
    const mty = 13 - m; const mm = Math.min(rem, mty > 0 ? mty : 12);
    out.push({ year: y, months: mm, baseAvg: mb }); rem -= mm; y += 1; m = 1;
  }
  return out;
}

console.log('========== 模式A 金标准：逐年明细正向 ==========');
const rStd = calculateIndex({ provinceConfig: pc, contribution: yearly, granularity: 'A' });
console.log(`平均指数=${rStd.avgIndex.toFixed(4)}  估算余额(含息)=${rStd.accountBalance.toFixed(2)}  月数=${rStd.totalMonths}`);

console.log('\n========== 模式1 月均基数：uniform 正向 ==========');
const rUni = calculateIndex({ provinceConfig: pc, contribution: buildUniform(start_year, start_month, total_months, monthly_avg), granularity: 'A' });
console.log(`平均指数=${rUni.avgIndex.toFixed(4)}  估算余额(含息)=${rUni.accountBalance.toFixed(2)}`);

console.log('\n========== 模式2 余额反推：用金标准含息余额 ==========');
const rInfStd = inferIndexFromBalance({ provinceConfig: pc, contribution: { startYear: start_year, startMonth: start_month, totalMonths: total_months }, granularity: 'C', knownBalance: rStd.accountBalance });
console.log('反推返回字段:', Object.keys(rInfStd));
console.log(`反推指数=${rInfStd.inferredIndex.toFixed(4)}  收敛=${rInfStd.converged}`);

console.log('\n========== 模式2b 余额反推：用本金和(不含息, 演示偏低) ==========');
const rInfPri = inferIndexFromBalance({ provinceConfig: pc, contribution: { startYear: start_year, startMonth: start_month, totalMonths: total_months }, granularity: 'C', knownBalance: principal_sum });
console.log(`反推指数=${rInfPri.inferredIndex.toFixed(4)}  收敛=${rInfPri.converged}`);

console.log('\n========== 模式3 两者都填：对照 ==========');
console.log(`正向(月均)=${rUni.avgIndex.toFixed(4)}  vs  反推(含息余额)=${rInfStd.inferredIndex.toFixed(4)}`);

const result = {
  province: 'jilin', start_year, start_month, total_months, monthly_avg, principal_sum,
  std: { avgIndex: +rStd.avgIndex.toFixed(4), balance: +rStd.accountBalance.toFixed(2) },
  uniform: { avgIndex: +rUni.avgIndex.toFixed(4), balance: +rUni.accountBalance.toFixed(2) },
  infer_from_std: +rInfStd.inferredIndex.toFixed(4),
  infer_from_principal: +rInfPri.inferredIndex.toFixed(4),
  yearly
};
fs.writeFileSync(path.join(__dirname, '_xls_result.json'), JSON.stringify(result, null, 2), 'utf8');
console.log('\n已保存 scripts/_xls_result.json');
