const path = require('path');
const fs = require('fs');

const enginePath = path.resolve('miniprogram/ai/pension-calc-skill/engine/pension-engine.js');
const engine = require(enginePath);
const { calculate } = engine;

const config = require(path.resolve('miniprogram/ai/pension-calc-skill/engine/provinces/hubei.js')).getEngineConfig();

const input = {
  name: '湖北十堰案例（AI 副本）',
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
console.log('== AI 副本 湖北十堰案例 ==');
console.log('基数: ret=' + leg.baseRetire + ', prov=' + leg.baseProv);
console.log('基础: ' + leg.basicPension.amount.toFixed(2));
console.log('个人: ' + leg.personalAccount.amount.toFixed(2));
console.log('过渡: ' + leg.transitionalPension.amount.toFixed(2));
console.log('合计: ' + leg.total.toFixed(2) + ' (期望 1145.21)');
console.log('差额: ' + (leg.total - 1145.21).toFixed(2));
