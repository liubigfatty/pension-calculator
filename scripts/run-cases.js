/**
 * 案例库自动化测试 v3（完全重写，字段映射正确）
 * 用法：node scripts/run-cases.js
 */
const fs = require('fs');
const path = require('path');

// ===== 加载引擎（自动找路径）=====
// 注意：优先使用工作副本 ./engine/pension-engine.js（与省份真相源 provinces/*.js 同源），
// 不要先用 cloudfunctions/calculate/pension-engine.js —— 后者是部署快照，常落后于工作副本，
// 会制造"假失败"（如特殊待遇/独生子女分支缺失）。与生产线构建(sync)保持一致前，测试以工作副本为准。
let engine;
const TRY_PATHS = [
  './engine/pension-engine.js',
  './cloudfunctions/calculate/pension-engine.js',
  'C:/Users/14041/WorkBuddy/pension-engine/miniprogram/cloud-functions/calculate/pension-engine.js',
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
  let genderType = c.gender_type || c.genderType || '';
  if (!genderType && isFemale) {
    const m = c.months || 195;
    if (m === 170) {
      genderType = 'fw55';
    } else {
      genderType = 'fw50';
    }
  }
  if (!genderType) genderType = 'male';

  // 退休年月
  const retireYear  = c.retire_year  || (c.retireDate ? parseInt(c.retireDate) : null);
  const retireMonth = c.retire_month || (c.retireDate ? parseInt(c.retireDate.split('-')[1]) : null);

  // 预发/核定表场景：单 base_number 时默认 baseRetire=baseProv=base_number（单基数省份）；
  // 双基数省份同时给出 base_number/base_prov 时分别传入。
  // ⚠️ 双基数省份(河南等)修复：退休地有独立计发基数(city_type 为真实城市)时，
  //    baseRetire 必须用"城市基数"(从 config.base_rates[city_type] 查)，不能用 base_number(通常是省基数)，
  //    否则城市基数被省基数覆盖、双基数形同虚设（此前 8/9/10 的"通过"是假通过）。
  let baseProv = c.base_prov != null ? c.base_prov : (c.base_number != null ? c.base_number : null);
  let baseRetire = c.base_number != null ? c.base_number : null;
  if (provConfig && provConfig.base_rates && c.city_type && c.city_type !== 'prov') {
    const cityTable = provConfig.base_rates[c.city_type];
    if (cityTable) {
      const ry = c.retire_year;
      const cb = cityTable[ry] != null ? cityTable[ry]
               : cityTable[ry + 1] != null ? cityTable[ry + 1]
               : cityTable[Object.keys(cityTable).sort((a, b) => b - a)[0]];
      if (cb != null) baseRetire = cb;
    }
  }

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
    // 显式退休日期：传入后引擎直接使用，避免从出生日期反推（用于延迟/特殊退休年龄，如深圳男61岁1个月）
    retireDateInput: (retireYear && retireMonth) ? { year: retireYear, month: retireMonth } : null,
    avgIndex:       c.avg_index ?? 1.0,
    personalAcc:    c.personal_account ?? 0,
    baseRetire:      baseRetire,
    baseProv:        baseProv,
    sightYears:      c.sight_years   ?? null,
    totalYears:      c.total_years    ?? null,
    preAccountYears: c.pre_account_years ?? null,
    actualYears:     c.actual_years     ?? null,
    months:         c.months         ?? null,
    retireType:      c.retire_type    || 'standard',
    cityType:        c.city_type || c.cityType || 'prov',
    transIndex:      c.trans_index     ?? null,
    regionCategory:  c.region_category ?? null,
    tibetWorkYears:  c.tibet_work_years ?? null,
    extraRate:       c.extra_rate     ?? null,
    accountStart:    c.account_start   ?? null,
    xuzhang:         c.xuzhang        ?? null,
    oldIndexSalary:  c.old_index_salary ?? null,
    enjoymentRatio:  c.enjoyment_ratio ?? null,
    newMethodYears:  c.new_method_years ?? null,
    localPensionYears: c.local_pension_years ?? null,
    pre1992LocalYears: c.pre1992_local_years ?? null,
    oneChild:        c.one_child ?? c.oneChild ?? false,
    oneChildType:    c.one_child_type ?? c.oneChildType ?? 'parent',
    oneChildAvgPension: c.one_child_avg_pension ?? c.oneChildAvgPension ?? null,
    intellectual:    c.intellectual ?? false,
  };
}

// ===== 运行单个案例 =====
function runCase(prov, c, file) {
  // 加载省份配置：必须用真相源 .js（getEngineConfig 含 TRANS_COEF/公式等），
  // 不能先用 provinces/*.json 副本——副本常过期（如 jiangsu.json 仍 8254 vs 真相源 8917），
  // 吃过期副本会制造假失败。与生产线(index.js 走 getEngineConfig)保持一致。
  const configPaths = [
    path.join(__dirname, '..', 'cloudfunctions', 'calculate', 'provinces', `${prov}.js`),
    path.join(__dirname, '..', 'cloudfunctions', 'calculate', 'provinces', `${prov}.json`),
    path.join(__dirname, '..', 'provinces', `${prov}.js`),
    path.join(__dirname, '..', 'provinces', `${prov}.json`),
  ];
  let config = null;
  for (const p of configPaths) {
    if (!fs.existsSync(p)) continue;
    if (p.endsWith('.js')) {
      // 真相源：require 后取 getEngineConfig（含 TRANS_COEF/公式/增发等）
      try {
        const m = require(path.resolve(p));
        config = m.getEngineConfig ? m.getEngineConfig() : m;
        break;
      } catch (e) { continue; }
    } else {
      // .json 副本：解析失败（含 // 注释等非法 JSON）则跳过，回退到 .js
      try {
        config = JSON.parse(fs.readFileSync(p, 'utf8'));
        break;
      } catch (e) { continue; }
    }
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
    const av = act[key];
    if (av === null || av === undefined || Number.isNaN(av)) {
      diffs.push(key + ': 预期' + exp[key] + ' vs 实际null/NaN(引擎未计算出)');
      continue;
    }
    const d = Math.abs(av - exp[key]);
    if (d > 1) diffs.push(key + ': 预期' + exp[key] + ' vs 实际' + av.toFixed(2));
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
