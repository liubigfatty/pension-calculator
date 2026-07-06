const fs = require('fs');
const path = require('path');

const base = 'C:/Users/14041/AppData/Roaming/winclaw/.openclaw/workspace/养老金计算平台/cloudfunctions/calculate/provinces';
const provs = ['beijing','tianjin','shanghai','chongqing','hebei','shanxi','liaoning','jilin','heilongjiang','jiangsu','zhejiang','anhui','fujian','jiangxi','shandong','henan','hubei','hunan','guangdong','hainan','sichuan','guizhou','yunnan','shaanxi','gansu','qinghai','neimenggu','guangxi','xizang','ningxia','xinjiang'];

// 北京官方值（用户提供 2020-2024）
const BEIJING_OFFICIAL = { 2020: 9407.17, 2021: 10628, 2022: 11297, 2023: 11761, 2024: 11937 };

let totalFixed = 0;
const report = [];

for (const p of provs) {
  // ---- 1. 修复 .json ----
  const jsonPath = path.join(base, p + '.json');
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (jsonData.avg_salary_history) {
    let fixed = 0;
    for (const y of Object.keys(jsonData.avg_salary_history)) {
      if (y === '_source') continue;
      let val = jsonData.avg_salary_history[y];
      if (typeof val !== 'number') continue;
      if (p === 'beijing' && BEIJING_OFFICIAL[y] != null) {
        if (jsonData.avg_salary_history[y] !== BEIJING_OFFICIAL[y]) {
          jsonData.avg_salary_history[y] = BEIJING_OFFICIAL[y];
          fixed++;
          report.push(`${p}.json ${y}: -> ${BEIJING_OFFICIAL[y]} (官方值)`);
        }
        continue;
      }
      if (val > 15000) {
        jsonData.avg_salary_history[y] = Math.round(val / 12 * 100) / 100;
        fixed++;
        totalFixed++;
        report.push(`${p}.json ${y}: ${val} -> ${jsonData.avg_salary_history[y]}`);
      }
    }
    if (fixed > 0) fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2) + '\n');
  }

  // ---- 2. 修复 .js (若含 AVG_SALARY_HISTORY 常量) ----
  const jsPath = path.join(base, p + '.js');
  let jsContent = fs.readFileSync(jsPath, 'utf8');
  if (jsContent.includes('AVG_SALARY_HISTORY')) {
    // 匹配 const AVG_SALARY_HISTORY = { ... };
    const re = /(const\s+AVG_SALARY_HISTORY\s*=\s*\{)([\s\S]*?)(\};)/;
    const m = jsContent.match(re);
    if (m) {
      let body = m[2];
      let fixedJs = 0;
      body = body.replace(/(\n\s*)(\d{4})\s*:\s*([\d.]+)/g, (mm, pre, yr, v) => {
        const num = parseFloat(v);
        if (num > 15000) {
          const fixedVal = Math.round(num / 12 * 100) / 100;
          fixedJs++;
          totalFixed++;
          report.push(`${p}.js ${yr}: ${num} -> ${fixedVal}`);
          return `${pre}${yr}: ${fixedVal}`;
        }
        return mm;
      });
      if (fixedJs > 0) {
        jsContent = jsContent.replace(re, m[1] + body + m[3]);
        fs.writeFileSync(jsPath, jsContent);
      }
    }
  }
}

console.log('=== 修复报告 ===');
console.log(report.join('\n'));
console.log(`\n总计修复: ${totalFixed} 条 (不含北京官方覆盖)`);
