/**
 * 检查工作副本引擎与备份版的行尾/结尾一致性（防止编辑器改动整文件 diff）
 * 用法：node scripts/_check_eol.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function stat(p, label) {
  const t = fs.readFileSync(p, 'utf8');
  const crlf = (t.match(/\r\n/g) || []).length;
  const lf = (t.match(/\n/g) || []).length;
  console.log(`${label}: crlf=${crlf} 总\\n=${lf} len=${t.length} 末尾=${JSON.stringify(t.slice(-8))}`);
}

stat(path.join(ROOT, 'engine/pension-engine.js'), '现在');
stat(path.join(ROOT, '_backup_规则修正_20261009/engine/_engine-pension-engine.js'), '原来');
