/**
 * 诊断失败案例：打印引擎完整返回（含 extra/specialAddition/warnings），
 * 并支持强制指定 baseRetire 做反推验证。
 * 用法：node scripts/_diag_cases.js jilin 2 [强制基数]
 */
const fs = require('fs');
const path = require('path');
const { calculate } = require(path.resolve('./engine/pension-engine.js'));

const [prov, id, forceBase] = process.argv.slice(2);
const c = JSON.parse(fs.readFileSync(path.join('cases', prov, `${id}.json`), 'utf8'));
const cfgMod = require(path.resolve(`./cloudfunctions/calculate/provinces/${prov}.js`));
const config = cfgMod.getEngineConfig ? cfgMod.getEngineConfig() : cfgMod;

const input = {
  name: c.case_id || id,
  province: c.province,
  gender: c.gender === '女' || c.gender === 'female' ? 'female' : 'male',
  genderType: c.gender_type || c.genderType || (c.gender === '女' ? (c.months === 170 ? 'fw55' : 'fw50') : 'male'),
  birthYear: c.birth_year,
  birthMonth: c.birth_month,
  workYear: c.work_year,
  workMonth: c.work_month,
  retireYear: c.retire_year,
  retireMonth: c.retire_month,
  retireDateInput: { year: c.retire_year, month: c.retire_month },
  avgIndex: c.avg_index ?? 1.0,
  personalAcc: c.personal_account ?? 0,
  baseRetire: forceBase ? Number(forceBase) : (c.base_number != null ? c.base_number : null),
  baseProv: c.base_prov != null ? c.base_prov : (c.base_number != null ? c.base_number : null),
  sightYears: c.sight_years ?? null,
  totalYears: c.total_years ?? null,
  preAccountYears: c.pre_account_years ?? null,
  actualYears: c.actual_years ?? null,
  months: c.months ?? null,
  cityType: c.city_type || 'prov',
  oneChild: c.one_child != null ? !!c.one_child : undefined,
  transIndex: c.trans_index ?? null,
};

const r = calculate(config, input);
console.log('=== 输入 ===');
console.log(JSON.stringify(input, null, 1));
console.log('\n=== 引擎返回全字段 ===');
const dump = (o, ind = '') => {
  for (const [k, v] of Object.entries(o || {})) {
    if (v && typeof v === 'object') { console.log(`${ind}${k}:`); dump(v, ind + '  '); }
    else console.log(`${ind}${k}: ${v}`);
  }
};
dump(r);
console.log('\n=== 案例 expected ===');
console.log(JSON.stringify(c.expected));
if (forceBase) {
  const e = c.expected;
  console.log(`\n=== 强制基数 ${forceBase} 反推校验 ===`);
  console.log(`basic 预期 ${e.basic_pension} / 实际 ${r.base ?? r.basic ?? '?'}`);
  console.log(`trans 预期 ${e.transitional_pension} / 实际 ${r.transition ?? r.transitional ?? '?'}`);
}
