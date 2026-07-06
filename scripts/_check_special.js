const fs = require('fs');
const xz = fs.readFileSync('C:/Users/14041/AppData/Roaming/winclaw/.openclaw/workspace/养老金计算平台/cloudfunctions/calculate/provinces/xizang.js', 'utf8');
console.log('西藏含plateau:', xz.includes('plateau'));
const m1 = xz.match(/note:\s*'([^']+)'/);
if (m1) console.log('西藏note:', m1[1]);
const gd = fs.readFileSync('C:/Users/14041/AppData/Roaming/winclaw/.openclaw/workspace/养老金计算平台/cloudfunctions/calculate/provinces/guangdong.js', 'utf8');
console.log('广东含深圳:', gd.includes('深圳'));
const m2 = gd.match(/深圳[^\n]{0,50}/);
if (m2) console.log('广东深圳:', m2[0]);
