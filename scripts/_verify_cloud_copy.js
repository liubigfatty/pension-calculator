/**
 * 云端云函数副本回验：download 下来的副本里真跑一遍 31 省
 * 用法：node scripts/_verify_cloud_copy.js <副本目录> [样本输出省]
 * 「deploy 成功」≠「线上正确」，唯一可信的验证就是拉回副本本地跑。
 */
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
const sampleProv = process.argv[3] || '';
if (!dir) { console.error('用法: node scripts/_verify_cloud_copy.js <副本目录> [省]'); process.exit(1); }

const fn = require(path.resolve(dir, 'index.js'));

// 省份清单：优先 provinces/ 子目录，其次 provinces-data.js
let provs = [];
const pdir = path.join(dir, 'provinces');
if (fs.existsSync(pdir)) {
  provs = fs.readdirSync(pdir).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''));
} else {
  const txt = fs.readFileSync(path.join(dir, 'provinces-data.js'), 'utf8');
  provs = [...new Set([...txt.matchAll(/^\s*'?([a-z]+)'?\s*:\s*\(function/gm)].map((m) => m[1]))];
}
provs.sort();

const payload = (p) => ({
  province: p, cityType: 'prov', gender: 'male', identity: 'worker',
  birthDate: '1966-05', workStartDate: '1986-07', averageIndex: 1.0,
  personalAccount: 0, extras: {}, estimateOnly: true,
});

(async () => {
  let ok = 0; const bad = [];
  let sample = null;
  for (const p of provs) {
    try {
      const r = await fn.main(payload(p), {});
      const good = r && r.success !== false;
      if (good) ok++; else bad.push(`${p}: ${(r && r.error) || JSON.stringify(r).slice(0, 120)}`);
      if (sampleProv && p === sampleProv) sample = r;
    } catch (e) {
      bad.push(`${p}: 抛异常 ${e.message}`);
    }
  }
  console.log(`省份数 ${provs.length}｜通过 ${ok}｜失败 ${bad.length}`);
  bad.forEach((b) => console.log('  ❌', b));
  if (sample) console.log(`\n样本 ${sampleProv} 返回:\n`, JSON.stringify(sample).slice(0, 1200));
  console.log(bad.length === 0 ? '\n🎉 云端副本 31/31 通过' : '\n🔴 云端副本有失败，别发');
})();
