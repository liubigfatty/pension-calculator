/**
 * 案例库自动化测试 v3（完全重写，字段映射正确）
 * 用法：node scripts/run-cases.js
 */
const fs = require('fs');
const path = require('path');

// ===== 加载引擎（自动找路径）=====
let engine;
const TRY_PATHS = [
  './cloudfunctions/calculate/pension-engine.js',
  'C:/Users/14041/WorkBuddy/pension-engine/miniprogram/cloud-functions/calculate/pension-engine.js',
  './engine/pension-engine.js',
];
for (const p of TRY_PATHS) {
  if (fs.existsSync(p)) { engine = require(path.resolve(p)); break; }
}
if (!engine) { console.error('❌ 找不到引擎'); process.exit(1); }
const { calculate } = engine;
console.log('✅ 引擎已加载\n');

// ===== 字段映射：案例文件 → 引擎 inputData =====
function mapCaseToInput(c, provConfig) {
  // 性别
  const isFemale = (c.gender === '女' || c.gender === 'female');
  const gender = isFemale ? 'female' : 'male';

  // genderType：优先用案例里的，否则根据 months 判断
  let genderType = c.genderType || '';
  if (!genderType && isFemale) {
    const m = c.months || 195;
    if (m === 170) {
      // 170个月=55岁：看 notes 是否含"女干部"
      genderType = (c.notes && c.notes.includes('女干部')) ? 'fc' : 'fw55';
    } else {
      genderType = 'fw50';
    }
  }
  if (!genderType) genderType = 'male';

  // 退休年月
  const retireYear  = c.retire_year  || (c.retireDate ? parseInt(c.retireDate) : null);
  const retireMonth = c.retire_month || (c.retireDate ? parseInt(c.retireDate.split('-')[1]) : null);

  return {
    name:           c.case_id || '测试',
    province:       c.province || provConfig.provinceKey || 'beijing',
    gender,
    genderType,
    birthYear:      c.birth_year,
    birthMonth:     c.birth_month,
    workYear:       c.work_year,
    workMonth:      c.work_month,
    retireYear,
    retireMonth,
    avgIndex:       c.avg_index ?? 1.0,
    personalAcc:    c.personal_account ?? 0,
    sightYears:      c.sight_years   ?? null,
    totalYears:      c.total_years    ?? null,
    preAccountYears: c.pre_account_years ?? null,
    actualYears:     c.actual_years     ?? null,
    months:         c.months         ?? null,
    retireType:      c.retire_type    || 'standard',
    cityType:        c.city_type      || 'prov',
    transIndex:      c.trans_index     ?? null,
  };
}

// ===== 运行单个案例 =====
function runCase(prov, c, file) {
  // 加载省份配置（优先用 provinces/*.json，与 verify.js 一致）
  const configPaths = [
    path.join(__dirname, '..', 'provinces', `${prov}.json`),
    path.join(__dirname, '..', 'cloudfunctions', 'calculate', 'provinces', `${prov}.json`),
  ];
  let config = null;
  for (const p of configPaths) {
    if (fs.existsSync(p)) { config = JSON.parse(fs.readFileSync(p, 'utf8')); break; }
    // 也支持 .js
    const jsPath = p.replace(/\.json$/, '.js');
    if (fs.existsSync(jsPath)) { config = require(path.resolve(jsPath)); break; }
  }
  if (!config) return { ok: false, msg: `省份配置 ${prov} 不存在` };

  const input = mapCaseToInput(c, config);
  let result;
  try {
    result = calculate(config, input);
  } catch(e) {
    return { ok: false, msg: `引擎报错: ${e.message}` };
  }

  // 期望值（案例文件里的）
  const exp = c.expected || {};
  // 实际值（引擎返回的 legal 路径）
  const legal = result.legal || result;
  const act = {
    basic_pension:       legal.basicPension?.amount       ?? legal.basicPension       ?? 0,
    personal_pension:     legal.personalAccount?.amount   ?? legal.personalAccountPension ?? 0,
    transitional_pension: legal.transitionalPension?.amount ?? legal.transitionalPension ?? 0,
    total:               legal.total                    ?? 0,
  };

  // 对比（允许1元误差）
  const diffs = [];
  for (const key of ['basic_pension', 'personal_pension', 'transitional_pension', 'total']) {
    if (exp[key] === undefined) continue;
    const d = Math.abs(act[key] - exp[key]);
    if (d > 1) diffs.push(`${key}: 预期${exp[key]} vs 实际${act[key].toFixed(2)}`);
  }

  return {
    ok: diffs.length === 0,
    msg: diffs.join('; '),
    expected: exp,
    actual:   act,
  };
}

// ===== 主流程 =====
function main() {
  const casesDir = './cases';
  if (!fs.existsSync(casesDir)) { console.error('❌ cases/ 不存在'); process.exit(1); }

  const provinces = fs.readdirSync(casesDir)
    .filter(f => fs.statSync(path.join(casesDir, f)).isDirectory());

  let total = 0, pass = 0, fail = 0;
  const failures = [];

  console.log('=== 养老金计算平台 全量测试 ===\n');

  for (const prov of provinces) {
    const provDir = path.join(casesDir, prov);
    const files = fs.readdirSync(provDir).filter(f => f.endsWith('.json'));

    for (const f of files) {
      total++;
      const c = JSON.parse(fs.readFileSync(path.join(provDir, f), 'utf8'));
      const r = runCase(prov, c, f);

      if (r.ok) {
        console.log(`  ✅ ${prov}/${f}`);
        pass++;
      } else {
        console.log(`  ❌ ${prov}/${f}: ${r.msg}`);
        fail++;
        failures.push({ prov, file: f, msg: r.msg, expected: r.expected, actual: r.actual });
      }
    }
  }

  console.log(`\n=== 汇总 ===`);
  console.log(`总计: ${total}`);
  console.log(`通过: ${pass}`);
  console.log(`失败: ${fail}`);

  if (failures.length > 0) {
    console.log(`\n=== 失败详情 ===`);
    for (const x of failures) {
      console.log(`\n${x.prov}/${x.file}:`);
      console.log(`  原因: ${x.msg}`);
      if (x.expected) console.log(`  预期: ${JSON.stringify(x.expected)}`);
      if (x.actual)   console.log(`  实际: ${JSON.stringify(x.actual)}`);
    }
  }
}

// 导出（供 verify.js 复用）
module.exports = { mapCaseToInput };

// 只有直接运行此脚本时才执行主流程
if (require.main === module) {
  main();
}
