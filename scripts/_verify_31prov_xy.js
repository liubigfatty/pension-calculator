const base = 'C:/Users/14041/WorkBuddy/2026-07-16-10-20-33/养老金计算平台/cloudfunctions/calculate/';
const { getConfig } = require(base + 'provinces-data.js');
const { calculate } = require(base + 'pension-engine.js');

const cases = {
  yunnan: '云南', hubei: '湖北', hunan: '湖南',
  beijing: '北京', shanghai: '上海', xizang: '西藏',
  henan: '河南', chongqing: '重庆', guangxi: '广西'
};
const provs = Object.keys(cases);

function topYear(obj) {
  return Object.keys(obj).filter(y => /^20\d\d$/.test(y)).map(Number).sort((a, b) => b - a);
}

console.log('省\t计发基数(最新年)\t全口径社平(同年)\t溢价%\t同人月领(100%档)');
for (const p of provs) {
  const cfg = getConfig(p);
  const brYears = topYear(cfg.base_rates.prov || cfg.base_rates);
  const by = brYears[0];
  const br = (cfg.base_rates.prov || cfg.base_rates)[by];
  const hist = cfg.avg_salary_history || cfg.salaryHistory;
  const sal = hist[by];
  const premium = ((br / sal) - 1) * 100;
  let monthly = 'ERR';
  try {
    const r = calculate({
      province: p, gender: 'male', birthDate: '1970-07', workStartDate: '1996-07',
      averageIndex: 1.0, contributionRate: 1.0, retireDateInput: { year: 2025, month: 12 }
    }, {});
    if (r.success) monthly = Math.round(r.data.legal.total);
    else monthly = 'FAIL:' + r.message;
  } catch (e) { monthly = 'EX:' + e.message; }
  console.log(cases[p] + '\t' + br + '\t' + sal + '\t' + premium.toFixed(1) + '\t' + monthly);
}
