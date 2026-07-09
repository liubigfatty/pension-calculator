const fs = require('fs');
const path = require('path');
const DIR = 'cloudfunctions/calculate/provinces';
// 2025年度社保缴费基数对应的全口径月社平（=2024年全口径加权值，2025年官方发布）
// 来源：人社通 m12333.cn 汇总各省人社厅公布的2025年度缴费基数上下限反推（下限÷0.6）
// 交叉印证：搜狐文章（上海12434、河南6385、江浙粤下限4900-5000）
const VAL = {
  beijing:11937, tianjin:8540, hebei:6678, shanxi:6997, neimenggu:8179,
  liaoning:7264, jilin:7322, heilongjiang:7570, shanghai:12434, jiangsu:8254,
  zhejiang:8433, anhui:7185, fujian:7535, jiangxi:6525, shandong:7506,
  henan:6385, hubei:7496, hunan:6787, guangdong:9183, guangxi:6905,
  hainan:8188, chongqing:7339, sichuan:7646, guizhou:7324.5, yunnan:7263,
  xizang:11777, shaanxi:7750, gansu:7338, qinghai:8816, ningxia:8258, xinjiang:8448
};
const COMMENT = '// 2025年度社保缴费基数·2024全口径社平（官方已发布，人社通汇总）';
const re = /const AVG_SALARY_HISTORY\s*=\s*\{([\s\S]*?)\};/;
let changed = 0, skip = 0;
for (const f of fs.readdirSync(DIR).filter(x => x.endsWith('.js')).sort()) {
  const code = f.replace('.js', '');
  if (!(code in VAL)) { console.log('NO VAL for ' + code); continue; }
  const fp = path.join(DIR, f);
  let s = fs.readFileSync(fp, 'utf8');
  if (!re.test(s)) { console.log('NO BLOCK ' + code); continue; }
  const val = VAL[code];
  let blk = s.match(re)[1];
  const CRLF = blk.includes('\r') ? '\r\n' : '\n';
  // 清掉任何已有的 2025 / 2026 条目（避免重复或旧值残留）
  blk = blk
    .replace(/\r?\n[ \t]*202[56]\s*:\s*[\d.]+\s*,?\s*(?:\/\/[^\n]*)?/g, '')
    .replace(/,[ \t]*202[56]\s*:\s*[\d.]+/g, '');
  // 去尾部空白，确保末条有逗号
  blk = blk.replace(/\s+$/, '');
  if (!/,\s*$/.test(blk)) blk += ',';
  blk += CRLF + '  2025: ' + val + ',  ' + COMMENT + CRLF;
  const newBlock = 'const AVG_SALARY_HISTORY = {' + blk + '};';
  const newS = s.replace(re, newBlock);
  if (newS === s) { console.log('UNCHANGED?? ' + code); skip++; continue; }
  fs.writeFileSync(fp, newS);
  changed++;
  console.log('FILLED ' + code.padEnd(10) + '2025=' + val);
}
console.log('--- changed=' + changed + ' skip=' + skip + ' ---');
