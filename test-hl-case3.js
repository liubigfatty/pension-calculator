const engine = require('./engine/pension-engine.js');

const config = require('./provinces/heilongjiang.json');

const input = {
  birthYear: 1964,
  birthMonth: 3,
  workYear: 1984,
  workMonth: 12,
  retireYear: 2024,
  retireMonth: 3,
  gender: 'male',
  cityType: 'prov',
  avgIndex: 0.6434,
  personalAcc: 73699.90,
  totalYears: 472 / 12,
  sightYears: 145 / 12,
  baseRetire: 7010,
  baseProv: 7010,
  months: 139,
};

const result = engine.calculate(config, input);
const legal = result.legal;

console.log('=== 黑龙江案例3 验证 ===');
console.log('案例：1964年3月男/1984年12月参工/2024年3月退休');
console.log('视同145个月/实际327个月/合计472个月/平均指数0.6434');
console.log('个人账户73699.90/基数7010/计发月数139');
console.log();

const official = {
  basic: 2265.65,
  personal: 530.22,
  transitional: 653.98,
  total: 3449.85,
};

const diff = {
  basic: (legal.basicPension.amount - official.basic).toFixed(2),
  personal: (legal.personalAccount.amount - official.personal).toFixed(2),
  transitional: (legal.transitionalPension.amount - official.transitional).toFixed(2),
  total: (legal.total - official.total).toFixed(2),
};

console.log(`基础养老金：引擎=${legal.basicPension.amount} 官方=${official.basic} 差异=${diff.basic}`);
console.log(`个人账户：引擎=${legal.personalAccount.amount} 官方=${official.personal} 差异=${diff.personal}`);
console.log(`过渡性：引擎=${legal.transitionalPension.amount} 官方=${official.transitional} 差异=${diff.transitional}`);
console.log(`合计：引擎=${legal.total} 官方=${official.total} 差异=${diff.total}`);
console.log();

if (Math.abs(parseFloat(diff.total)) < 0.01) {
  console.log('✅ 全部吻合，差异0.00元');
} else {
  console.log('❌ 有差异，需排查');
}
