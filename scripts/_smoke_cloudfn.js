/**
 * 云函数本地冒烟：不经云端验证 calculate / calcIndex 去掉 wx-server-sdk 后逻辑完好
 * 用法：node scripts/_smoke_cloudfn.js
 */
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function smoke(name, relDir, payload) {
  const dir = path.join(ROOT, relDir);
  let fn;
  try {
    fn = require(path.join(dir, 'index.js'));
  } catch (e) {
    console.log(`❌ ${name} 加载失败: ${e.message}`);
    return false;
  }
  return Promise.resolve()
    .then(() => fn.main(payload, {}))
    .then((r) => {
      const ok = r && r.success !== false;
      const total = r && r.data && r.data.legal && r.data.legal.total;
      console.log(`${ok ? '✅' : '❌'} ${name}: success=${r && r.success} total=${total}`);
      if (!ok) console.log('   ', JSON.stringify(r).slice(0, 400));
      return ok;
    })
    .catch((e) => {
      console.log(`❌ ${name} 抛异常: ${e.message}`);
      return false;
    });
}

(async () => {
  const a = await smoke('calculate(新疆)', 'cloudfunctions/calculate', {
    province: 'xinjiang', cityType: 'prov', gender: 'male', identity: 'worker',
    birthDate: '1966-10', workStartDate: '1987-10', averageIndex: 0.6085,
    personalAccount: 105263.37, extras: {}, estimateOnly: true,
  });
  const b = await smoke('calculate(上海)', 'cloudfunctions/calculate', {
    province: 'shanghai', cityType: 'prov', gender: 'male', identity: 'worker',
    birthDate: '1966-05', workStartDate: '1986-07', averageIndex: 1.0,
    personalAccount: 0, extras: {}, estimateOnly: true,
  });
  const c = await smoke('calcIndex(吉林)', 'index-mini/cloudfunctions/calcIndex', {
    province: 'jilin', cityType: 'prov',
    startYear: 1986, startMonth: 7, retireYear: 2026,
    yearlyData: [
      { year: 2024, months: 12, baseAvg: 5000 },
      { year: 2025, months: 12, baseAvg: 5200 },
      { year: 2026, months: 10, baseAvg: 5400 },
    ],
  });
  console.log(a && b && c ? '\n🎉 云函数本地冒烟全部通过' : '\n🔴 有失败，先修再部署');
})();
