#!/usr/bin/env node
/**
 * sync-provinces-v2.js — 单一真相源同步脚本（扩展版）
 *
 * 真相源：cloudfunctions/calculate/provinces/*.js
 *   - AVG_SALARY_HISTORY  (历年全口径社平，元/月)
 *   - PROV_BASE           (历年计发基数，元/月)
 *   - BASE_PARAMS         (计发基数预测参数)
 *   - 城市单列计发基数块   SY_BASE / DL_BASE / SHENZHEN_BASE / ZHENGZHOU_BASE / CC_BASE
 *
 * 派发到所有依赖副本（均为 .json 镜像，由真相源 .js 派生）：
 *   - provinces/<p>.json                          -> 根目录镜像（base_rates.prov / avg_salary_history）
 *   - cloudfunctions/calculate/provinces/<p>.json -> 云函数目录内镜像（与真相源 .js 同目录）
 *   - docs/js/provinces/<p>.json                  -> 文档站点镜像
 *   - docs/网页版/provinces/<p>.json              -> 文档站点镜像
 *   - web/provinces-bundle.js                     -> 由 scripts/build-web.js 生成（直接读真相源，自动正确）
 *
 * ⚠️ 历史坑：脚本曾把 data/provinces(.js)、js/provinces(.json) 当作目标，但这两个目录
 *    实际并不存在，导致同步静默跳过；而真正存在的 provinces/*.json 与云函数内 *.json
 *    从未被同步、长期漂移成旧值（如湖南计发基数曾错为 5938.17/6090）。现已修正为上述真实目录。
 *
 * 用法：node scripts/sync-provinces.js
 */
const fs = require('fs');
const path = require('path');
// 解析 junction/符号链接到真实物理路径（Winclaw 工作区可能为 junction，
// 直接用 process.cwd() 拼接的 junction 路径在 node 下 readdir 会 ENOENT）
const ROOT = fs.realpathSync(process.cwd());

const AUTH = path.join(ROOT, 'cloudfunctions/calculate/provinces'); // 真相源 .js（读取）
const PROVJSON = path.join(ROOT, 'provinces');                     // 根目录 .json 镜像（写入）
const DOCSJS = path.join(ROOT, 'docs/js/provinces');
const DOCWEB = path.join(ROOT, 'docs/网页版/provinces');

// 需要同步到 .js 副本的计发基数相关 const 块（仅在副本也存在时才替换）
const BASE_BLOCKS = ['PROV_BASE', 'BASE_PARAMS', 'SY_BASE', 'DL_BASE', 'SHENZHEN_BASE', 'ZHENGZHOU_BASE', 'CC_BASE'];

// ---------- 通用：抽取真相源中 const NAME = { ... } 整块文本（含 const 前缀，不含结尾 ;） ----------
function extractBlockText(file, name) {
  const txt = fs.readFileSync(file, 'utf8');
  const re = new RegExp('const\\s+' + name + '\\s*=\\s*\\{');
  const start = txt.search(re);
  if (start < 0) return null;
  const bs = txt.indexOf('{', start);
  let depth = 0, i = bs;
  for (; i < txt.length; i++) {
    if (txt[i] === '{') depth++;
    else if (txt[i] === '}') { depth--; if (depth === 0) break; }
  }
  return txt.slice(start, i + 1); // 含 const NAME = { ... 闭合 }
}

// ---------- 通用：抽取真相源中全部顶层 const（含对象/数组/数值），供 eval 注入上下文 ----------
// 解决 guangdong 等省 AVG_SALARY_HISTORY 引用 SHENZHEN_AVG_SALARY 等外部常量导致 eval 崩溃的预存 bug
function extractAllConsts(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const map = {};
  const re = /const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*/g;
  let m;
  while ((m = re.exec(txt))) {
    const name = m[1];
    if (name in map) continue;
    let k = m.index + m[0].length;
    while (k < txt.length && /\s/.test(txt[k])) k++;
    if (txt[k] === '{' || txt[k] === '[') {
      const close = txt[k] === '{' ? '}' : ']';
      let depth = 0, i = k;
      for (; i < txt.length; i++) {
        if (txt[i] === '{' || txt[i] === '[') depth++;
        else if (txt[i] === close) { depth--; if (depth === 0) break; }
      }
      const inner = txt.slice(k, i + 1);
      try {
        const ctx = { ...map };
        const ctxKeys = Object.keys(ctx);
        const fn = new Function(...ctxKeys, 'return ' + inner + ';');
        map[name] = fn(...ctxKeys.map(k2 => ctx[k2]));
      } catch (e) { /* 跳过无法求值的函数型 const */ }
    } else {
      let j = k;
      while (j < txt.length && txt[j] !== ';' && txt[j] !== '\n') j++;
      const val = txt.slice(k, j).trim();
      try { map[name] = eval(val); } catch (e) { /* 跳过 */ }
    }
  }
  return map;
}

// ---------- 通用：把真相源的某块求值为对象（用于写入 JSON） ----------
function extractObj(file, name) {
  const b = extractBlockText(file, name);
  if (!b) return undefined;
  const open = b.indexOf('{');
  const inner = b.slice(open, b.lastIndexOf('}') + 1)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  const consts = extractAllConsts(file);
  const keys = Object.keys(consts);
  try {
    const fn = new Function(...keys, 'return ' + inner + ';');
    return fn(...keys.map(k => consts[k]));
  } catch (e) { return undefined; }
}

// ---------- .js 副本：用真相源块整体替换 const NAME = {...}; ----------
function syncJsBlock(copyFile, name, blockText) {
  const txt = fs.readFileSync(copyFile, 'utf8');
  const re = new RegExp('const\\s+' + name + '\\s*=\\s*\\{');
  const start = txt.search(re);
  if (start < 0) return false;
  const bs = txt.indexOf('{', start);
  let depth = 0, i = bs;
  for (; i < txt.length; i++) {
    if (txt[i] === '{') depth++;
    else if (txt[i] === '}') { depth--; if (depth === 0) break; }
  }
  let j = i + 1;
  while (j < txt.length && txt[j] !== '\n' && txt[j] !== ';') j++;
  if (txt[j] === ';') j++;
  const before = txt.slice(0, start);
  const after = txt.slice(j);
  fs.writeFileSync(copyFile, before + blockText + ';\n' + after);
  return true;
}

// ---------- AVG_SALARY_HISTORY：抽取 ----------
function extractAuth(file) {
  const obj = extractObj(file, 'AVG_SALARY_HISTORY');
  if (obj) return obj;
  const txt = fs.readFileSync(file, 'utf8');
  const start = txt.search(/AVG_SALARY_HISTORY\s*=\s*\{/);
  const bs = txt.indexOf('{', start);
  let depth = 0, i = bs;
  for (; i < txt.length; i++) {
    if (txt[i] === '{') depth++;
    else if (txt[i] === '}') { depth--; if (depth === 0) break; }
  }
  const inner = txt.slice(bs, i + 1).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const consts = extractAllConsts(file);
  const keys = Object.keys(consts);
  try {
    const fn = new Function(...keys, 'return ' + inner + ';');
    return fn(...keys.map(k => consts[k]));
  } catch (e) { return {}; }
}

function toJsBlock(obj) {
  const lines = Object.keys(obj).map(Number).sort((a, b) => a - b)
    .map(y => '  ' + y + ': ' + obj[y] + ',');
  return 'const AVG_SALARY_HISTORY = {\n' + lines.join('\n') + '\n};';
}

function syncJsAvg(file, block) {
  let txt = fs.readFileSync(file, 'utf8');
  const start = txt.search(/const AVG_SALARY_HISTORY\s*=\s*\{/);
  if (start < 0) return false;
  const bs = txt.indexOf('{', start);
  let depth = 0, i = bs;
  for (; i < txt.length; i++) {
    if (txt[i] === '{') depth++;
    else if (txt[i] === '}') { depth--; if (depth === 0) break; }
  }
  let j = i;
  while (j < txt.length && txt[j] !== '\n' && txt[j] !== ';') j++;
  if (txt[j] === ';') j++;
  const before = txt.slice(0, start);
  const after = txt.slice(j);
  fs.writeFileSync(file, before + block + after);
  return true;
}

function syncJsonAvg(file, obj) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  j.avg_salary_history = obj;
  fs.writeFileSync(file, JSON.stringify(j, null, 2));
}

function syncJsonBaseRates(file, provBaseObj) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!j.base_rates) j.base_rates = {};
  j.base_rates.prov = provBaseObj;
  fs.writeFileSync(file, JSON.stringify(j, null, 2));
}

const provs = fs.readdirSync(AUTH).filter(f => f.endsWith('.js')).map(f => f.replace(/\.js$/, '')).sort();
let ok = 0, skip = 0, baseBlocks = 0;

const targets = [
  { name: 'provinces (root json)', dir: PROVJSON, kind: 'json' },
  { name: 'cloudfunctions/calculate/provinces (json copy)', dir: AUTH, kind: 'json' },
  { name: 'docs/js/provinces', dir: DOCSJS, kind: 'json' },
  { name: 'docs/网页版/provinces', dir: DOCWEB, kind: 'json' },
];

for (const p of provs) {
  const authFile = path.join(AUTH, p + '.js');
  const authAvg = extractAuth(authFile);
  const provBase = extractObj(authFile, 'PROV_BASE');
  const avgBlock = toJsBlock(authAvg);

  for (const t of targets) {
    const fp = path.join(t.dir, p + (t.kind === 'js' ? '.js' : '.json'));
    if (!fs.existsSync(fp)) { skip++; continue; }

    if (t.kind === 'js') {
      syncJsAvg(fp, avgBlock); ok++;
      for (const bn of BASE_BLOCKS) {
        const bt = extractBlockText(authFile, bn);
        if (bt && syncJsBlock(fp, bn, bt)) baseBlocks++;
      }
    } else {
      syncJsonAvg(fp, authAvg); ok++;
      if (provBase) { syncJsonBaseRates(fp, provBase); baseBlocks++; }
    }
  }
}

try {
  require(path.join(ROOT, 'scripts/build-web.js'));
} catch (e) {
  console.log('build-web.js 执行失败：', e.message);
}

console.log('SYNC_DONE avg=' + ok + ' base=' + baseBlocks + ' skip=' + skip);
