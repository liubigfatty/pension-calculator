'use strict';
// 全量数据审计：社平质量 + 副本一致性 + 估算残留
// 只审计、不改写。输出所有异常供人工判断。
const fs = require('fs');
const path = require('path');

const ROOT = __dirname.replace(/[\\/]scripts$/, '');
const SRC = path.join(ROOT, 'cloudfunctions', 'calculate', 'provinces');
const DATA = path.join(ROOT, 'data', 'provinces');
const JS = path.join(ROOT, 'js', 'provinces');
const DOCS = path.join(ROOT, 'docs', '网页版', 'provinces');
const MINI = path.join(ROOT, 'index-mini', 'cloudfunctions', 'calcIndex', 'provinces-data.js');

const PROV_CODES = ['beijing','tianjin','hebei','shanxi','neimenggu','liaoning','jilin','heilongjiang','shanghai','jiangsu','zhejiang','anhui','fujian','jiangxi','shandong','henan','hubei','hunan','guangdong','guangxi','hainan','chongqing','sichuan','guizhou','yunnan','xizang','shaanxi','gansu','qinghai','ningxia','xinjiang'];

// 解析 JS 块文本为 {year:{val,comment}}
function parseBlock(block) {
  const out = {};
  if (!block) return out;
  for (const raw of block.split(/\r?\n/)) {
    const ln = raw.trim();
    if (!/^\d{4}\s*:/.test(ln)) continue;
    const mm = ln.match(/^(\d{4})\s*:\s*([\d.]+)\s*,?\s*(?:\/\/\s*(.*))?$/);
    if (mm) out[mm[1]] = { val: parseFloat(mm[2]), comment: (mm[3] || '').trim() };
  }
  return out;
}
// 解析对象 {year:val} 为 {year:{val,comment:''}}（副本比较用，只看 val）
function parseObj(obj) {
  const out = {};
  for (const y of Object.keys(obj)) out[y] = { val: parseFloat(obj[y]), comment: '' };
  return out;
}
function read(p) { return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }

// 提取 JS 对象内部文本（锚点不含 {）
function extractObject(text, anchorRegex) {
  const m = text.match(anchorRegex);
  if (!m) return null;
  let i = m.index + m[0].length;
  while (i < text.length && text[i] !== '{') i++;
  if (i >= text.length) return null;
  let depth = 0, j = i;
  for (; j < text.length; j++) {
    if (text[j] === '{') depth++;
    else if (text[j] === '}') { depth--; if (depth === 0) break; }
  }
  return text.slice(i + 1, j);
}

const REPORT = [];
function note(level, prov, msg) { REPORT.push(`[${level}] ${prov}: ${msg}`); }

console.log('========================================\n  一、源社平数据质量审计（31省）\n========================================');
const srcMaps = {};
for (const code of PROV_CODES) {
  const text = read(path.join(SRC, code + '.js'));
  if (!text) { note('ERROR', code, '源文件缺失'); continue; }
  const blk = extractObject(text, /const\s+AVG_SALARY_HISTORY\s*=\s*/);
  if (!blk) { note('ERROR', code, '无 AVG_SALARY_HISTORY 块'); continue; }
  const map = parseBlock(blk);
  srcMaps[code] = map;
  const years = Object.keys(map).map(Number).sort((a, b) => a - b);
  if (years.length === 0) { note('ERROR', code, 'AVG_SALARY_HISTORY 解析为空'); continue; }

  if (!(2025 in map)) note('WARN', code, '2025 缺值（官方已发布，须补）');
  if (2026 in map) note('WARN', code, '2026 有值（用户要求保持空）');

  for (const y of years) {
    if (y < 2025 && map[y].val > 15000) note('ERROR', code, `${y} 值=${map[y].val} 疑似元/年（未÷12，月值不应>15000）`);
    const c = map[y].comment;
    if (/估算|外推|投影|预估|推测|预测|CAGR|待发布|待补充|沿用未核实/.test(c))
      note('ERROR', code, `${y} 注释含估算/外推标记：${c}`);
    if (/上一年度|上年度.*错位|存为次年|延后一年/.test(c))
      note('ERROR', code, `${y} 注释疑似口径错位：${c}`);
  }
  // 相邻涨幅 >200% 视为混入元/年（如 8000→28000）
  for (let i = 1; i < years.length; i++) {
    const y0 = years[i - 1], y1 = years[i];
    if (map[y1].val > map[y0].val * 3)
      note('ERROR', code, `${y0}→${y1} 暴涨 ${((map[y1].val / map[y0].val - 1) * 100).toFixed(0)}%（${map[y0].val}→${map[y1].val}），疑似混入年值未÷12`);
  }
  // 倒挂（相邻下降>10%，INFO 供确认）
  for (let i = 1; i < years.length; i++) {
    const y0 = years[i - 1], y1 = years[i];
    if (map[y1].val < map[y0].val * 0.9) {
      const drop = ((map[y0].val - map[y1].val) / map[y0].val * 100).toFixed(1);
      note('INFO', code, `${y0}→${y1} 下降 ${drop}%（${map[y0].val}→${map[y1].val}），请确认是否真实口径调整`);
    }
  }
}

console.log('\n========================================\n  二、副本一致性审计（社平 avg_salary_history）\n========================================');
function loadCopy(kind, code) {
  if (kind === 'js' || kind === 'docs') {
    const fp = path.join(kind === 'js' ? JS : DOCS, code + '.json');
    if (!fs.existsSync(fp)) return null;
    try { const o = JSON.parse(read(fp)); return o.avg_salary_history ? parseObj(o.avg_salary_history) : null; }
    catch (e) { return null; }
  }
  if (kind === 'data') {
    const t = read(path.join(DATA, code + '.js'));
    if (!t) return null;
    const blk = extractObject(t, /const\s+AVG_SALARY_HISTORY\s*=\s*/);
    return blk ? parseBlock(blk) : null;
  }
  return null;
}
let miniMaps = {};
try { miniMaps = require(MINI); } catch (e) { note('ERROR', 'index-mini', 'require 失败：' + e.message); }

for (const code of PROV_CODES) {
  const src = srcMaps[code];
  if (!src || Object.keys(src).length === 0) { note('WARN', code, '源社平为空，跳过副本比对'); continue; }
  for (const kind of ['data', 'js', 'docs', 'mini']) {
    let cmap = kind === 'mini' ? (miniMaps[code] && miniMaps[code].avg_salary_history && parseObj(miniMaps[code].avg_salary_history)) : loadCopy(kind, code);
    if (!cmap) { note('WARN', code, `副本[${kind}]缺失/解析失败`); continue; }
    const sy = new Set(Object.keys(src)), cy = new Set(Object.keys(cmap));
    const diff = [];
    for (const y of new Set([...sy, ...cy])) {
      if (!sy.has(y) && cy.has(y)) diff.push(`+${y}=${cmap[y].val}`);
      else if (sy.has(y) && !cy.has(y)) diff.push(`-${y}`);
      else if (src[y].val !== cmap[y].val) diff.push(`${y}:${src[y].val}≠${cmap[y].val}`);
    }
    if (diff.length) note('ERROR', code, `副本[${kind}]与源不一致：${diff.slice(0, 12).join(', ')}${diff.length > 12 ? ' …' : ''}`);
  }
}

console.log('\n========================================\n  三、估算/外推残留扫描（AVG_SALARY_HISTORY / PROV_2025 / base_rates）\n========================================');
// 扫描任意年份(2024-2026)且带估算标记的整行
const EST = /估算|外推|投影|预估|推测|预测|CAGR|待发布|待补充|沿用|暂估/;
function scanEstimates(fp, label) {
  if (!fs.existsSync(fp)) return;
  read(fp).split(/\r?\n/).forEach((ln, i) => {
    if (/\b(202[4-6])\b/.test(ln) && EST.test(ln))
      note('ERROR', label, `L${i + 1}: ${ln.trim().slice(0, 110)}`);
  });
}
for (const code of PROV_CODES) {
  scanEstimates(path.join(SRC, code + '.js'), code + '(src)');
  scanEstimates(path.join(DATA, code + '.js'), code + '(data)');
  scanEstimates(path.join(JS, code + '.json'), code + '(js)');
  scanEstimates(path.join(DOCS, code + '.json'), code + '(docs)');
}
if (fs.existsSync(MINI)) scanEstimates(MINI, 'index-mini');

console.log('\n========================================\n  四、脏副本 / 多余文件扫描\n========================================');
if (fs.existsSync(JS)) {
  for (const f of fs.readdirSync(JS)) {
    if (!f.endsWith('.json')) continue;
    const code = f.replace('.json', '');
    if (!PROV_CODES.includes(code)) note('WARN', code, `js/provinces 非标准命名文件 ${f}（疑似脏副本）`);
  }
}

console.log('\n========================================\n  审计报告汇总\n========================================');
if (REPORT.length === 0) console.log('✅ 未发现异常。');
else {
  const order = { ERROR: 0, WARN: 1, INFO: 2 };
  REPORT.sort((a, b) => (order[a.slice(1, 6)] ?? 3) - (order[b.slice(1, 6)] ?? 3));
  for (const r of REPORT) console.log(r);
  const cnt = { ERROR: 0, WARN: 0, INFO: 0 };
  REPORT.forEach(r => { const k = r.slice(1, 6); if (k in cnt) cnt[k]++; });
  console.log(`\n--- 统计：ERROR=${cnt.ERROR} WARN=${cnt.WARN} INFO=${cnt.INFO} ---`);
}
