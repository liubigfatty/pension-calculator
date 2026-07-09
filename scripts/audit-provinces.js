const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

// 纯文本抽取 JS 中的 AVG_SALARY_HISTORY 对象（避免 require 副作用/崩溃）
function extractAvgHistoryFromJs(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const txt = fs.readFileSync(filePath, 'utf8');
  const start = txt.search(/AVG_SALARY_HISTORY\s*=\s*\{/);
  if (start < 0) return { __missing: true };
  const braceStart = txt.indexOf('{', start);
  let depth = 0, i = braceStart;
  for (; i < txt.length; i++) {
    if (txt[i] === '{') depth++;
    else if (txt[i] === '}') { depth--; if (depth === 0) break; }
  }
  let inner = txt.slice(braceStart + 1, i);
  inner = inner.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  try {
    const obj = eval('({' + inner + '})');
    return obj;
  } catch (e) {
    return { __error: e.message };
  }
}

function loadJsonAvg(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return j.avg_salary_history || (j.data && j.data.avg_salary_history) || null;
  } catch (e) {
    return { __error: e.message };
  }
}

// 扫描文件文本中"上一年/上年度/Y-1/错位/偏移"等年份错位标记行
function shiftMarkers(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const txt = fs.readFileSync(filePath, 'utf8');
  const lines = txt.split('\n');
  const re = /(上一年|上年度|Y-1|错位|偏移|口径|shift|prev.{0,3}year)/i;
  const out = [];
  lines.forEach((ln, i) => {
    if (re.test(ln)) out.push((i + 1) + ': ' + ln.trim().slice(0, 80));
  });
  return out;
}

// 估算行：在 AVG_SALARY_HISTORY 块内，找行尾注释含"估/预/补"的
function estimateLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const txt = fs.readFileSync(filePath, 'utf8');
  const start = txt.search(/AVG_SALARY_HISTORY\s*=\s*\{/);
  if (start < 0) return [];
  const braceStart = txt.indexOf('{', start);
  let depth = 0, i = braceStart;
  for (; i < txt.length; i++) {
    if (txt[i] === '{') depth++;
    else if (txt[i] === '}') { depth--; if (depth === 0) break; }
  }
  const block = txt.slice(braceStart, i + 1);
  const out = [];
  block.split('\n').forEach(ln => {
    if (/(估|预|补|推算|插值|待.*核实|暂)/.test(ln) && /\d{4}\s*:/.test(ln)) {
      out.push(ln.trim().slice(0, 70));
    }
  });
  return out;
}

const AUTH = path.join(ROOT, 'cloudfunctions/calculate/provinces');
const ROOTJSON = path.join(ROOT, 'provinces');
const DATAP = path.join(ROOT, 'data/provinces');
const JSP = path.join(ROOT, 'js/provinces');
const DOCSJS = path.join(ROOT, 'docs/js/provinces');
const DOCWEB = path.join(ROOT, 'docs/网页版/provinces');

const provs = fs.readdirSync(AUTH).filter(f => f.endsWith('.js')).map(f => f.replace(/\.js$/, '')).sort();

console.log('省份        | 范围         | 缺口(1995-2025)     | 下降异常                | 错位标记 | 估算行');
console.log('-'.repeat(150));

const report = [];
for (const p of provs) {
  const auth = extractAvgHistoryFromJs(path.join(AUTH, p + '.js'));
  if (!auth || auth.__error || auth.__missing) {
    console.log(p.padEnd(10) + ' | LOAD ERROR: ' + (auth ? (auth.__error || 'no AVG_SALARY_HISTORY') : 'null'));
    continue;
  }
  const yrs = Object.keys(auth).map(Number).filter(y => y >= 1992 && y <= 2025).sort((a, b) => a - b);
  const minY = yrs[0], maxY = yrs[yrs.length - 1];
  const gaps = [];
  for (let y = minY; y <= maxY; y++) {
    if (!(y in auth) || auth[y] == null) gaps.push(y);
  }
  // 1995 之前缺口不报（建账前），1995-2025 内的缺口报
  const realGaps = gaps.filter(y => y >= 1995);
  const drops = [];
  let prev = null;
  for (const y of yrs) {
    if (prev !== null && auth[y] < auth[prev] * 0.95) drops.push(prev + '→' + y);
    prev = y;
  }
  const markers = shiftMarkers(path.join(AUTH, p + '.js'));
  const est = estimateLines(path.join(AUTH, p + '.js'));

  report.push({ p, range: minY + '-' + maxY, realGaps, drops, markers, est });
  console.log(
    p.padEnd(10) + ' | ' +
    (minY + '-' + maxY).padEnd(12) + ' | ' +
    (realGaps.length ? realGaps.join(',') : '无').padEnd(22) + ' | ' +
    (drops.length ? drops.join(';') : '无').padEnd(22) + ' | ' +
    (markers.length ? ('⚠️' + markers.length + '行') : '无') + ' | ' +
    (est.length ? est.length + '行' : '无')
  );
  if (markers.length) markers.forEach(m => console.log('      ↳ [错位标记] ' + m));
  if (est.length) est.forEach(m => console.log('      ↳ [估算] ' + m));
}

// ===== 副本一致性对比 =====
console.log('\n\n══════════════════════════════════════════════════════════════════════');
console.log('二、权威副本 vs 其他副本 一致性（重叠年份偏差>0.01 计数）');
console.log('══════════════════════════════════════════════════════════════════════\n');

function diffCount(auth, other) {
  if (!other || other.__error || other.__missing) return other ? (other.__error || 'ERR') : '缺失';
  const ov = Object.keys(auth).filter(y => y in other && other[y] != null && auth[y] != null);
  if (!ov.length) return '无重叠';
  let d = 0;
  for (const y of ov) if (Math.abs(Number(auth[y]) - Number(other[y])) > 0.01) d++;
  return d === 0 ? '一致' : (d + '年差');
}

console.log('省份        | 根provinces.json | data/provinces.js | js/provinces.json | docs/js | docs网页版');
console.log('-'.repeat(110));
const diverged = [];
for (const p of provs) {
  const auth = extractAvgHistoryFromJs(path.join(AUTH, p + '.js'));
  if (!auth || auth.__error || auth.__missing) continue;
  const rj = loadJsonAvg(path.join(ROOTJSON, p + '.json'));
  const dj = extractAvgHistoryFromJs(path.join(DATAP, p + '.js'));
  const jj = loadJsonAvg(path.join(JSP, p + '.json'));
  const djs = loadJsonAvg(path.join(DOCSJS, p + '.json'));
  const dwj = loadJsonAvg(path.join(DOCWEB, p + '.json'));
  const c = {
    root: diffCount(auth, rj),
    data: diffCount(auth, dj),
    js: diffCount(auth, jj),
    docsjs: diffCount(auth, djs),
    docweb: diffCount(auth, dwj),
  };
  const isDiv = [c.root, c.data, c.js, c.docsjs, c.docweb].some(v => v !== '一致' && v !== '缺失' && v !== '无重叠' && v !== 'ERR' && !String(v).includes('ERR'));
  if (isDiv) diverged.push(p);
  console.log(
    p.padEnd(10) + ' | ' +
    String(c.root).padEnd(16) + ' | ' +
    String(c.data).padEnd(17) + ' | ' +
    String(c.js).padEnd(17) + ' | ' +
    String(c.docsjs).padEnd(8) + ' | ' +
    String(c.docweb)
  );
}
console.log('\n副本发散省份（与权威不一致）:', diverged.length ? diverged.join(', ') : '无');

// ===== 汇总 =====
console.log('\n\n══════════════════════════════════════════════════════════════════════');
console.log('三、汇总');
console.log('══════════════════════════════════════════════════════════════════════\n');
const hasMarker = report.filter(r => r.markers.length);
const hasEst = report.filter(r => r.est.length);
const hasGap = report.filter(r => r.realGaps.length);
const hasDrop = report.filter(r => r.drops.length);
console.log('含"上一年/错位"标记的省:', hasMarker.length ? hasMarker.map(r => r.p).join(', ') : '无');
console.log('含估算行的省:', hasEst.length ? hasEst.map(r => r.p).join(', ') : '无');
console.log('1995-2025 内有缺口的省:', hasGap.length ? hasGap.map(r => r.p + '[' + r.realGaps.join(',') + ']').join(', ') : '无');
console.log('序列异常下降的省:', hasDrop.length ? hasDrop.map(r => r.p).join(', ') : '无');
