/**
 * 标定脚本：把 case 的 expected 更新为真相源引擎(.js)的实际输出。
 * 仅用于"引擎已用真实核定表验证正确"的省，避免 1269a37 式无脑回填假绿。
 * 用法：node scripts/_recalibrate.js [--write] jilin liaoning jiangsu xinjiang
 *   默认 dry-run（只打印将要改动），加 --write 才落盘。
 */
const fs = require('fs');
const path = require('path');

const engine = require(path.resolve('./cloudfunctions/calculate/pension-engine.js'));
const { calculate } = engine;

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const PROVINCES = args.filter(a => a !== '--write');

function loadConfig(prov) {
  const paths = [
    path.join(__dirname, '..', 'cloudfunctions', 'calculate', 'provinces', `${prov}.js`),
    path.join(__dirname, '..', 'provinces', `${prov}.js`),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      const m = require(path.resolve(p));
      return m.getEngineConfig ? m.getEngineConfig() : m;
    }
  }
  return null;
}

// 与 run-cases.js 的 mapCaseToInput 保持一致（复用已验证的字段映射）
function mapCaseToInput(c, provConfig) {
  const isFemale = (c.gender === '女' || c.gender === 'female');
  const gender = isFemale ? 'female' : 'male';
  let genderType = c.gender_type || c.genderType || '';
  if (!genderType && isFemale) {
    const m = c.months || 195;
    if (m === 170) genderType = 'fw55';
    else genderType = 'fw50';
  }
  if (!genderType) genderType = 'male';
  const retireYear  = c.retire_year  || (c.retireDate ? parseInt(c.retireDate) : null);
  const retireMonth = c.retire_month || (c.retireDate ? parseInt(c.retireDate.split('-')[1]) : null);
  return {
    name: c.case_id || '测试',
    province: c.province || provConfig.provinceKey || 'beijing',
    gender, genderType,
    birthYear: c.birth_year, birthMonth: c.birth_month,
    workYear: c.work_year, workMonth: c.work_month,
    retireYear, retireMonth,
    avgIndex: c.avg_index ?? 1.0,
    personalAcc: c.personal_account ?? 0,
    baseRetire: c.base_number != null ? c.base_number : null,
    baseProv: c.base_prov != null ? c.base_prov : (c.base_number != null ? c.base_number : null),
    sightYears: c.sight_years ?? null,
    totalYears: c.total_years ?? null,
    preAccountYears: c.pre_account_years ?? null,
    actualYears: c.actual_years ?? null,
    months: c.months ?? null,
    retireType: c.retire_type || 'standard',
    cityType: c.city_type || 'prov',
    transIndex: c.trans_index ?? null,
    extraRate: c.extra_rate ?? null,
    accountStart: c.account_start ?? null,
    xuzhang: c.xuzhang ?? null,
  };
}

const num = v => (v == null || Number.isNaN(v)) ? null : Math.round(v * 100) / 100;

let changeCount = 0, skipCount = 0;
for (const prov of PROVINCES) {
  const config = loadConfig(prov);
  if (!config) { console.log(`SKIP ${prov}: 无真相源配置`); continue; }
  const dir = path.join(__dirname, '..', 'cases', prov);
  if (!fs.existsSync(dir)) { console.log(`SKIP ${prov}: 无 cases 目录`); continue; }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  for (const f of files) {
    const fp = path.join(dir, f);
    const c = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const input = mapCaseToInput(c, config);
    let result;
    try { result = calculate(config, input); }
    catch (e) { console.log(`  ERR ${prov}/${f}: 引擎报错 ${e.message}`); skipCount++; continue; }
    const L = result.legal || result;
    const basic = num(L.basicPension?.amount ?? L.basicPension);
    const personal = num(L.personalAccount?.amount ?? L.personalAccount);
    const trans = num(L.transitionalPension?.amount ?? L.transitionalPension);
    const total = num(L.total);
    // 引擎输出有 null/NaN 则不标定（避免写 0 假值）
    if ([basic, personal, trans, total].some(v => v === null)) {
      console.log(`  SKIP ${prov}/${f}: 引擎输出含 null/NaN（basic=${basic} personal=${personal} trans=${trans} total=${total}），需人工查`);
      skipCount++; continue;
    }
    const newExpected = { basic_pension: basic, personal_pension: personal, transitional_pension: trans, total };
    const ep = L.extraPension?.amount ?? L.extraPension;
    if (ep) newExpected.extra_pension = num(ep); // 仅当真有增发才写，避免 extra_pension:0 噪声
    const old = c.expected || {};
    // 比较：核心4项 + extra_pension（旧0/新缺 视为相同，避免无谓改写）
    const coreKeys = ['basic_pension', 'personal_pension', 'transitional_pension', 'total'];
    const coreMatches = coreKeys.every(k => Math.abs((old[k] ?? 0) - (newExpected[k] ?? 0)) < 0.005);
    const oldEp = old.extra_pension ?? 0;
    const newEp = newExpected.extra_pension ?? 0;
    const epMatches = Math.abs(oldEp - newEp) < 0.005;
    if (coreMatches && epMatches) {
      console.log(`  ok   ${prov}/${f}`);
      continue;
    }
    console.log(`  ${WRITE ? 'WRITE' : 'WOULD'} ${prov}/${f}: ${JSON.stringify(old)} -> ${JSON.stringify(newExpected)}`);
    if (WRITE) {
      c.expected = newExpected;
      fs.writeFileSync(fp, JSON.stringify(c, null, 2) + '\n', 'utf8');
      changeCount++;
    }
  }
}
console.log(`\n${WRITE ? '已写入' : '预览'}：${PROVINCES.join('/')} ；改动 ${changeCount} 个，跳过 ${skipCount} 个`);
