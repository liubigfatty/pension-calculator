const path = require('path');
const fs = require('fs');

const engine = require(path.resolve('./miniprogram/ai/pension-calc-skill/engine/pension-engine.js'));
const { calculate } = engine;

const config = require(path.resolve('./miniprogram/ai/pension-calc-skill/engine/provinces/hubei.js')).getEngineConfig();

const input = {
  name: '湖北荆州行业统筹企业案例',
  gender: 'male', birthYear: 1966, birthMonth: 4,
  workYear: 1984, workMonth: 10,
  retireDateInput: { year: 2026, month: 4 },
  cityType: '荆州',
  avgIndex: 0.8463,
  personalAcc: 90001.62,
  months: 139,
  totalYears: 499/12,
  accountStart: { year: 1998, month: 12 },
};

const res = calculate(config, input);
const leg = res.legal;
console.log('AI副本湖北荆州验证');
console.log(`基础: ${leg.basicPension.amount.toFixed(2)} (表上2767.53)`);
console.log(`个人: ${leg.personalAccount.amount.toFixed(2)} (表上647.49)`);
console.log(`过渡: ${leg.transitionalPension.amount.toFixed(2)} (表上1037.55)`);
console.log(`合计: ${leg.total.toFixed(2)} (表上4452.57)`);
