const engine = require('./engine/pension-engine.js');

const config = require('./provinces/heilongjiang.json');

const input = {
  birthYear: 1972,
  birthMonth: 6,
  workYear: 1990,
  workMonth: 4,
  retireYear: 2022,
  retireMonth: 6,
  gender: 'female',
  cityType: 'prov',
  avgIndex: 0.5999,
  personalAcc: 54298.68,
  totalYears: 385 / 12,
  sightYears: 75 / 12,
  baseRetire: 5865,
  baseProv: 5865,
  months: 195,
};

const result = engine.calculate(config, input);
const legal = result.legal;

console.log('=== 黑龙江案例5 验证 ===');
console.log('案例：1972年6月女/1990年4月参工/2022年6月退休');
console.log('视同75个月/实际310个月/合计385个月/中断2个月/平均指数0.5999');
console.log('个人账户54298.68/基数5865/计发月数195');
console.log();

const official = {
  basic: 1505.26,
  personal: 278.45,
  transitional: 263.88,
  other: 45.00,
  total: 2092.59,  // 官方"发放金额合计"含御寒津贴45元
  payout: 2092.59,
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
console.log(`其他补贴：官方=${official.other} 元（引擎不计算固定补贴）`);
console.log(`合计(不含其他)：引擎=${legal.total} 官方=${official.total} 差异=${diff.total}`);
console.log(`发放合计：官方=${official.payout} 元`);
console.log();

if (Math.abs(parseFloat(diff.total)) < 0.01) {
  console.log('✅ 全部吻合，差异0.00元');
} else {
  console.log('❌ 有差异，需排查');
}
