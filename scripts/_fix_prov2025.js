'use strict';
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'cloudfunctions', 'calculate', 'provinces');

// 提取 const X = { ... } 内部文本（括号匹配，兼容 CRLF）
function extractBlockInner(text, anchorRe) {
  const m = text.match(anchorRe);
  if (!m) return null;
  const start = m.index + m[0].length;
  let i = start;
  while (i < text.length && text[i] !== '{') i++;
  if (i >= text.length) return null;
  let depth = 0, j = i;
  for (; j < text.length; j++) {
    if (text[j] === '{') depth++;
    else if (text[j] === '}') { depth--; if (depth === 0) break; }
  }
  return { inner: text.slice(i + 1, j), openIdx: i, closeIdx: j };
}

// 从块内部删除某年份行（兼容 CRLF、带注释）
function removeYear(inner, year) {
  return inner
    .replace(new RegExp('\\r?\\n[ \\t]*' + year + '\\s*:\\s*[\\d.]+\\s*,?\\s*(?:\\/\\/[^\\n]*)?', 'g'), '')
    .replace(new RegExp(',[ \\t]*' + year + '\\s*:\\s*[\\d.]+\\s*(?:\\/\\/[^\\n]*)?', 'g'), '')
    .replace(new RegExp('[ \\t]*' + year + '\\s*:\\s*[\\d.]+\\s*(?:\\/\\/[^\\n]*)?', 'g'), '');
}

// 向块内部末尾插入年份，保证逗号、无双逗号
function insertYear(inner, year, val, comment) {
  let s = inner.replace(/[ \t\r\n]+$/, '');
  if (!/,[ \t]*$/.test(s)) s += ',';
  s += '\r\n   ' + year + ': ' + val + ',  // ' + comment + '\r\n';
  s = s.replace(/,{2,}/g, ',');
  return s;
}

// 取 ASH[y]
function getASH(code, year) {
  const fp = path.join(DIR, code + '.js');
  const text = fs.readFileSync(fp, 'utf8');
  const b = extractBlockInner(text, /const AVG_SALARY_HISTORY\s*=\s*/);
  if (!b) return null;
  const mm = b.inner.match(new RegExp('\\n[ \\t]*' + year + '\\s*:\\s*([\\d.]+)'));
  return mm ? parseFloat(mm[1]) : null;
}

const COMMENT = '2025年计发基数=2024全口径社平(国办发〔2019〕13号口径，官方已发布)';

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.js')).sort();
let changed = 0;
for (const f of files) {
  const code = f.replace('.js', '');
  const fp = path.join(DIR, f);
  let text = fs.readFileSync(fp, 'utf8');
  const ash2025 = getASH(code, 2025);
  if (ash2025 == null) { console.log('SKIP ' + code + ': 无 ASH2025'); continue; }
  const ash2024 = getASH(code, 2024);
  let modified = false;

  // 1) PROV_BASE
  {
    const blk = extractBlockInner(text, /const PROV_BASE\s*=\s*/);
    if (blk) {
      let inner = removeYear(blk.inner, 2025);
      inner = removeYear(inner, 2026);
      inner = insertYear(inner, 2025, ash2025, COMMENT);
      const newBlock = 'const PROV_BASE = {' + inner + '};';
      const re = /const PROV_BASE\s*=\s*\{[\s\S]*?\};/;
      const before = text;
      text = text.replace(re, newBlock);
      if (text !== before) modified = true;
    }
  }

  // 2) BASE_PARAMS.PROV_2025 / 删 2026
  {
    const blk = extractBlockInner(text, /const BASE_PARAMS\s*=\s*/);
    if (blk) {
      let inner = blk.inner.replace(/PROV_2025\s*:\s*[^\n,]+,?/g, '');
      inner = inner.replace(/PROV_2026\s*:\s*[^\n,]+,?/g, '');
      inner = inner.replace(/\r?\n[ \t]*\/\/[^\n]*预估[^\n]*/g, '');
      inner = inner.replace(/[ \t\r\n]+$/, '');
      if (!/,[ \t]*$/.test(inner)) inner += ',';
      inner += '\r\n  PROV_2025: ' + ash2025 + ',  // ' + COMMENT + '\r\n';
      inner = inner.replace(/,{2,}/g, ',');
      const newBlock = 'const BASE_PARAMS = {' + inner + '}';
      const re = /const BASE_PARAMS\s*=\s*\{[\s\S]*?\}/;
      const before = text;
      text = text.replace(re, newBlock);
      if (text !== before) modified = true;
    }
  }

  // 3) 城市单列：辽宁 SY_BASE / DL_BASE，广东 SHENZHEN_BASE
  const cityMap = { liaoning: ['SY_BASE', 'DL_BASE'], guangdong: ['SHENZHEN_BASE'] };
  if (cityMap[code]) {
    const provRef = (() => {
      const blk = extractBlockInner(text, /const PROV_BASE\s*=\s*/);
      const mm = blk && blk.inner.match(/\n[ \t]*2024\s*:\s*([\d.]+)/);
      if (mm) return parseFloat(mm[1]);
      return ash2024;
    })();
    const ratio = provRef ? ash2025 / provRef : 1;
    for (const cname of cityMap[code]) {
      const blk = extractBlockInner(text, new RegExp('const ' + cname + '\\s*=\\s*\\{'));
      if (!blk) continue;
      const cy2024m = blk.inner.match(/\n[ \t]*2024\s*:\s*([\d.]+)/);
      if (!cy2024m) continue;
      const cy2024 = parseFloat(cy2024m[1]);
      const cy2025 = Math.round(cy2024 * ratio);
      let inner = removeYear(blk.inner, 2025);
      inner = removeYear(inner, 2026);
      inner = insertYear(inner, 2025, cy2025, '按2024城市值×省2025/省2024官方比例推算(待各市官方2025计发基数)');
      const newBlock = 'const ' + cname + ' = {' + inner + '};';
      const re = new RegExp('const ' + cname + '\\s*=\\s*\\{[\\s\\S]*?\\};');
      const before = text;
      text = text.replace(re, newBlock);
      if (text !== before) modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(fp, text);
    changed++;
    console.log('FIXED ' + code.padEnd(10) + ' PROV_BASE[2025]=' + ash2025 + (cityMap[code] ? ' (含城市单列)' : ''));
  } else {
    console.log('no-change ' + code);
  }
}
console.log('--- changed=' + changed + ' / total=' + files.length + ' ---');
