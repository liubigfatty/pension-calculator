// 临时脚本：测试 3 个反推原子接口 + 正向回归 + 金标准
const assert = require('assert');
let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name); } }

const reverseIndexByBalance = require('../index-mini/ai/pension-index-skill/apis/reverseIndexByBalance');
const reverseYearlyByCurrentBase = require('../index-mini/ai/pension-index-skill/apis/reverseYearlyByCurrentBase');
const reverseYearlyByTargetIndex = require('../index-mini/ai/pension-index-skill/apis/reverseYearlyByTargetIndex');
const calculatePensionIndex = require('../index-mini/ai/pension-index-skill/apis/calculatePensionIndex');

const BASE = { province: '北京', startYear: 2019, startMonth: 1, totalMonths: 60 };

(async () => {
  console.log('— 倒推① reverseIndexByBalance —');
  const r1 = await reverseIndexByBalance(Object.assign({}, BASE, { knownBalance: 50000 }));
  ok('isError=false', r1.isError === false);
  ok('structuredContent.avgIndex 存在', typeof r1.structuredContent.avgIndex === 'number');
  ok('handoff 是函数', typeof r1.handoff === 'function');
  const p1 = r1.handoff();
  ok('payload.result.data.forward 存在', !!(p1.payload.result.data.forward));
  ok('forward._meta.reverseMode=balance', p1.payload.result.data.forward._meta.reverseMode === 'balance');
  ok('avgIndex 合理(0.5~1.5)', r1.structuredContent.avgIndex > 0.5 && r1.structuredContent.avgIndex < 1.5);
  ok('payload 可 JSON 序列化', (() => { try { JSON.stringify(p1.payload); return true; } catch (e) { return false; } })());

  console.log('— 倒推② reverseYearlyByCurrentBase —');
  const r2 = await reverseYearlyByCurrentBase(Object.assign({}, BASE, { currentBase: 11000 }));
  ok('isError=false', r2.isError === false);
  ok('reverseMode=currentBase', r2.handoff().payload.result.data.forward._meta.reverseMode === 'currentBase');
  ok('avgIndex≈0.9544', Math.abs(r2.structuredContent.avgIndex - 0.9544) < 0.01);
  ok('currentIndex 透出', r2.structuredContent.currentIndex > 0.9 && r2.structuredContent.currentIndex < 1.0);

  console.log('— 倒推③ reverseYearlyByTargetIndex —');
  const r3 = await reverseYearlyByTargetIndex(Object.assign({}, BASE, { targetIndex: 1.5 }));
  ok('isError=false', r3.isError === false);
  ok('reverseMode=targetIndex', r3.handoff().payload.result.data.forward._meta.reverseMode === 'targetIndex');
  ok('avgIndex≈1.5', Math.abs(r3.structuredContent.avgIndex - 1.5) < 0.01);

  console.log('— 错误兜底 —');
  const e1 = await reverseIndexByBalance(Object.assign({}, BASE, { province: '火星', knownBalance: 50000 }));
  ok('未知省份 isError=true', e1.isError === true);
  const e2 = await reverseYearlyByCurrentBase(Object.assign({}, BASE, { currentBase: -5 }));
  ok('负基数 isError=true', e2.isError === true);
  const e3 = await reverseYearlyByTargetIndex(Object.assign({}, BASE, { targetIndex: 0 }));
  ok('目标指数0 isError=true', e3.isError === true);
  const e4 = await reverseIndexByBalance({ province: '北京', knownBalance: 50000 });
  ok('缺年月/月数 isError=true', e4.isError === true);

  console.log('— 正向回归（不应被改坏）—');
  const fwd = await calculatePensionIndex({
    province: '北京',
    yearlyData: [
      { year: 2019, months: 12, baseAvg: 8000 },
      { year: 2020, months: 12, baseAvg: 9000 },
      { year: 2021, months: 12, baseAvg: 0 },
      { year: 2022, months: 12, baseAvg: 10000 },
      { year: 2023, months: 12, baseAvg: 11000 }
    ]
  });
  ok('正向 isError=false', fwd.isError === false);
  ok('正向 avgIndex=0.7447', Math.abs(fwd.structuredContent.avgIndex - 0.7447) < 0.001);

  console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
  process.exit(fail ? 1 : 0);
})();
