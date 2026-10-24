/**
 * 比对 engine/pension-engine.js（工作副本）与各下游副本的差异规模，
 * 并测试「根 engine.js 是否 = web/engine.js 去掉 \r」
 * 用法：node scripts/_cmp_engine_copies.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const a = fs.readFileSync(path.join(ROOT, 'engine/pension-engine.js'), 'utf8');

const FILES = [
  'engine.js',
  'docs/js/pension-engine.js',
  'docs/js/pension-engine-browser.js',
  'docs/网页版/js/pension-engine-browser.js',
  'cloudfunctions/calculate/pension-engine.js',
  'web/engine.js',
];

for (const f of FILES) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { console.log('(不存在) '.padEnd(12) + f); continue; }
  const b = fs.readFileSync(p, 'utf8');
  if (a === b) { console.log('完全相同'.padEnd(12) + f); continue; }
  const crlf = (b.match(/\r\n/g) || []).length;
  const lf = (b.match(/\n/g) || []).length;
  console.log(`不同`.padEnd(12) + `(len=${b.length}, crlf=${crlf}/${lf}, 去\\r后与源一致=${b.replace(/\r\n/g, '\n') === a}) ` + f);
}

// 根 engine.js 是否 = web/engine.js 去 \r
const web = fs.readFileSync(path.join(ROOT, 'web/engine.js'), 'utf8');
const root = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
console.log('\n根 engine.js === web/engine.js.replace(/\\r\\n/g,"\\n") ?', web.replace(/\r\n/g, '\n') === root);
console.log('web/engine.js CRLF 行数:', (web.match(/\r\n/g) || []).length, '| 根 engine.js CRLF 行数:', (root.match(/\r\n/g) || []).length);
console.log('源 engine/pension-engine.js CRLF 行数:', (a.match(/\r\n/g) || []).length);
