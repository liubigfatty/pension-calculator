#!/usr/bin/env node
/**
 * 算例探针（golden master）：把"写文章 / 算读者案例"沉淀成引擎回归资产
 *
 * 与 cases/ 的分工：
 *   cases/   = 官方核定表，验「对不对」（第一方证据，不许塞推算值）
 *   probes/  = 自己算过的案例快照，验「变没变」（引擎一改就报漂移）
 *
 * 用法：
 *   node scripts/_probe_case.js                 全量比对（--check）
 *   node scripts/_probe_case.js --run <id>      单条体检报告
 *   node scripts/_probe_case.js --save <id>     把当前输出存为基线
 *   node scripts/_probe_case.js --save all      全量刷新基线（引擎有意改动后）
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PROBES = path.join(ROOT, 'probes');

// ===== 加载引擎：优先工作副本（与省份真相源同源）=====
// 不要先用 cloudfunctions/calculate/pension-engine.js —— 那是部署快照，常落后，会制造"假失败"
function loadEngine() {
  const tries = ['./engine/pension-engine.js', './cloudfunctions/calculate/pension-engine.js'];
  for (const t of tries) {
    const p = path.join(ROOT, t);
    if (fs.existsSync(p)) return { calculate: require(p).calculate, from: t };
  }
  throw new Error('找不到引擎');
}
// ===== 加载省份：优先真相源 .js，不要用 .json 副本（常过期）=====
function loadProv(prov) {
  const tries = [
    'cloudfunctions/calculate/provinces/' + prov + '.js',
    'cloudfunctions/calculate/provinces/' + prov + '.json',
    'provinces/' + prov + '.js',
    'provinces/' + prov + '.json',
  ];
  for (const t of tries) {
    const p = path.join(ROOT, t);
    if (fs.existsSync(p)) {
      const m = require(p);
      return { cfg: (m.getEngineConfig ? m.getEngineConfig() : m), from: t };
    }
  }
  throw new Error('找不到省份配置: ' + prov);
}

const WHOLE_MONTHS = [195, 170, 139, 132, 125, 117]; // 50/55/60/61/62/63 岁整档

function runProbe(pr) {
  const { calculate } = loadEngine();
  const { cfg, from: provFrom } = loadProv(pr.province);
  const r = calculate(cfg, pr.input);
  const L = r.legal || {};
  return {
    raw: r, cfg, provFrom,
    out: {
      months: num(L.months),
      basic: num(L.basicPension && L.basicPension.amount),
      extra: num(L.extraPension && L.extraPension.amount),
      account: num(L.personalAccount && L.personalAccount.amount),
      balance: num(L.personalAccount && L.personalAccount.balance),
      trans: num(L.transitionalPension && L.transitionalPension.amount),
      total: num(L.total),
    },
    warnings: collectWarnings(r),
  };
}
function num(v) { return (typeof v === 'number' && isFinite(v)) ? v : null; }
function collectWarnings(r) {
  const w = [];
  const push = (x) => {
    if (!x) return;
    if (Array.isArray(x)) x.forEach(i => w.push(typeof i === 'string' ? i : (i.msg || i.message || JSON.stringify(i))));
    else if (typeof x === 'string') w.push(x);
  };
  push(r.warnings); push(r.legal && r.legal.warnings); push(r.data && r.data.warnings);
  return w;
}

// ===== 体检断言：把我踩过的坑形式化 =====
function healthCheck(pr, res) {
  const o = res.out, inp = pr.input, checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });

  // 1. 四项加和 = 总计
  const parts = [o.basic, o.extra, o.account, o.trans].filter(v => v !== null);
  const sum = parts.reduce((a, b) => a + b, 0);
  add('分项加和=总计', Math.abs(sum - o.total) <= 0.05,
    `四项=${sum.toFixed(2)} 总计=${o.total} 差=${(sum - o.total).toFixed(4)}`);

  // 2. 计发月数：是否按小数年龄插值（吉林案例曾硬套 139 而漏插值）
  if (o.months !== null) {
    const isWhole = WHOLE_MONTHS.some(m => Math.abs(m - o.months) < 0.01);
    add('计发月数', true, `months=${o.months}` + (isWhole ? '（整岁档位）' : '（已按小数年龄插值，非整岁档）'));
  }

  // 3. 计发基数是否走"预发年回退"（退休年 > base_rates 最大年）
  // ⚠️ 2026-10-01 修正：城市表（如吉林 cc）缺某年时，getBase() 会回退取全省表同年的值。
  //    只按城市表算 maxY 会误报「预发年 / 官方未发布」（吉林 cc 2026 即此坑：
  //    CC_BASE 无 2026，但全省表有，实际取的是已发布的 7481.5）。
  //    故 maxY 取「城市表与全省表的较大者」，与 getBase() 的 lastYear 判定保持一致。
  const br = res.cfg && res.cfg.base_rates;
  const cityTable = (br && br[inp.cityType]) || {};
  const provTable = (br && br.prov) || {};
  const maxOf = (t) => {
    const ys = Object.keys(t).filter(k => /^\d{4}$/.test(k)).map(Number).sort((a, b) => a - b);
    return ys[ys.length - 1];
  };
  const maxY = Math.max(maxOf(cityTable) || 0, maxOf(provTable) || 0) || undefined;
  const ry = (inp.retireDateInput && inp.retireDateInput.year) || inp.retire_year || inp.retireYear;
  if (maxY && ry) {
    const cityMissing = inp.cityType && inp.cityType !== 'prov' && !(cityTable[ry] !== undefined);
    add('计发基数年份', true, `base_rates最大年=${maxY}，退休年=${ry}` +
      (ry > maxY ? ' → 预发年，基数沿用上年（官方未发布，符合规则）' : ' → 已发布值') +
      (cityMissing ? ` ⚠️ ${inp.cityType} 表无 ${ry} 年，实际回退取全省表 ${ry} 年值，请确认该市是否已并轨` : ''));
  }

  // 4. 个人账户：引擎估算时余额应 > 0
  if (inp.personalAccInput === 0 || inp.personalAccInput === undefined) {
    add('个人账户(引擎估算)', o.balance > 0, `余额=${Math.round(o.balance)}，月领=${o.account}`);
  } else {
    add('个人账户(外部传入)', Math.abs((o.balance || 0) - inp.personalAccInput) < 1,
      `传入=${inp.personalAccInput} 引擎=${Math.round(o.balance || 0)}`);
  }

  // 5. 年限自洽（若显式传了总年限 / 视同年限）
  if (inp.totalYearsInput && inp.sightYearsInput) {
    const actual = inp.totalYearsInput - inp.sightYearsInput;
    add('年限拆分', actual > 0, `总=${inp.totalYearsInput} 视同=${inp.sightYearsInput} 实际=${actual.toFixed(2)}`);
  }
  return checks;
}

function diffBaseline(pr, res) {
  const b = pr.baseline;
  if (!b) return null;
  const rows = [];
  const fields = ['months', 'basic', 'extra', 'account', 'balance', 'trans', 'total'];
  for (const f of fields) {
    const oldV = b[f], newV = res.out[f];
    if (oldV === null || oldV === undefined || newV === null) continue;
    const d = newV - oldV;
    if (Math.abs(d) > 0.005) {
      rows.push({ f, old: oldV, now: newV, d, pct: oldV !== 0 ? (d / oldV * 100) : null });
    }
  }
  return rows;
}

function fmt(n) { return n === null ? '-' : (Math.round(n * 100) / 100).toFixed(2); }

function reportOne(pr, res, opts) {
  const o = res.out;
  console.log('════════════════════════════════════════════');
  console.log('探针: ' + pr.id + '   [' + pr.province + (pr.input.cityType ? '/' + pr.input.cityType : '') + ']');
  console.log('来源: ' + (pr.source || '-'));
  if (pr.article) console.log('文章: ' + pr.article);
  console.log('────────────────────────────────────────────');
  console.log('  基础      ' + fmt(o.basic));
  console.log('  增发      ' + fmt(o.extra));
  console.log('  过渡性    ' + fmt(o.trans));
  console.log('  个人账户  ' + fmt(o.account) + '   (余额 ' + Math.round(o.balance || 0) + ' ÷ 月数 ' + fmt(o.months) + ')');
  console.log('  合计      ' + fmt(o.total));
  console.log('────────────────────────────────────────────');
  const checks = healthCheck(pr, res);
  for (const c of checks) console.log('  ' + (c.ok ? '✓' : '✗') + ' ' + c.name + '  ' + c.detail);
  if (res.warnings.length) {
    console.log('  ⚠ warnings:');
    res.warnings.forEach(w => console.log('      - ' + w));
  }
  if (pr.assumptions && pr.assumptions.length) {
    console.log('  假设项:');
    pr.assumptions.forEach(a => console.log('      · ' + a));
  }
  const diff = diffBaseline(pr, res);
  if (diff === null) console.log('  基线: 未建立（跑 --save ' + pr.id + ' 建立）');
  else if (diff.length === 0) console.log('  基线: 一致 ✓');
  else {
    console.log('  ⚠ 与基线漂移:');
    diff.forEach(r => console.log('      ' + r.f + ': ' + fmt(r.old) + ' → ' + fmt(r.now) +
      '  (' + (r.d > 0 ? '+' : '') + fmt(r.d) + (r.pct !== null ? ', ' + r.pct.toFixed(2) + '%' : '') + ')'));
  }
  return { diff, checks };
}

function saveBaseline(pr, res) {
  pr.baseline = Object.assign({}, res.out, { saved: new Date().toISOString().slice(0, 10) });
  const f = path.join(PROBES, pr.id + '.json');
  fs.writeFileSync(f, JSON.stringify(pr, null, 2), 'utf8');
  console.log('  ✓ 基线已写入 ' + pr.id + '.json');
}

// ===== main =====
const argv = process.argv.slice(2);
const cmd = argv[0] || '--check';
const arg = argv[1];

if (!fs.existsSync(PROBES)) { console.error('探针目录不存在: ' + PROBES); process.exit(1); }

let files = fs.readdirSync(PROBES).filter(f => f.endsWith('.json'));
if (cmd === '--run' || cmd === '--save') {
  if (!arg) { console.error('缺少探针 id'); process.exit(1); }
  if (arg !== 'all') files = files.filter(f => f === arg + '.json' || f.replace('.json', '') === arg);
}
if (!files.length) { console.error('没有匹配的探针'); process.exit(1); }

let driftCount = 0, failCount = 0;
for (const f of files) {
  const pr = JSON.parse(fs.readFileSync(path.join(PROBES, f), 'utf8'));
  const res = runProbe(pr);
  if (cmd === '--save') { saveBaseline(pr, res); continue; }
  const { diff, checks } = reportOne(pr, res);
  if (checks.some(c => !c.ok)) failCount++;
  if (diff && diff.length) driftCount++;
}
if (cmd === '--check' || cmd === '--run') {
  console.log('════════════════════════════════════════════');
  console.log('共 ' + files.length + ' 条探针 | 体检失败 ' + failCount + ' | 与基线漂移 ' + driftCount);
  if (driftCount) console.log('→ 引擎有改动，确认是有意订正还是回归，再决定 --save all 刷新基线');
}
