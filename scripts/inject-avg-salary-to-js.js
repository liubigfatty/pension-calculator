const fs = require('fs');
const path = require('path');

const provBase = 'C:/Users/14041/AppData/Roaming/winclaw/.openclaw/workspace/养老金计算平台/cloudfunctions/calculate/provinces';

// 已有 avg_salary_history 的省（jilin/jiangxi/sichuan/xizang），跳过
const alreadyHas = ['jilin', 'jiangxi', 'sichuan', 'xizang'];

const provs = ['beijing','tianjin','shanghai','chongqing','hebei','shanxi','liaoning',
  'heilongjiang','jiangsu','zhejiang','anhui','fujian','shandong','henan','hubei',
  'hunan','guangdong','hainan','guizhou','yunnan','shaanxi','gansu','qinghai',
  'neimenggu','guangxi','ningxia','xinjiang'];

let done = 0, skipped = 0, errors = [];

for (const p of provs) {
  if (alreadyHas.includes(p)) { skipped++; continue; }
  const jsPath = path.join(provBase, p + '.js');
  const jsonPath = path.join(provBase, p + '.json');
  try {
    const js = fs.readFileSync(jsPath, 'utf8');
    if (js.includes('avg_salary_history:')) { skipped++; continue; } // 已有返回字段

    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const hist = jsonData.avg_salary_history;
    if (!hist) { errors.push(p + ': .json 无 avg_salary_history'); continue; }

    // 生成常量体（排除 _source/_note，按年份排序）
    const years = Object.keys(hist)
      .filter(k => k !== '_source' && k !== '_note' && typeof hist[k] === 'number')
      .map(Number).sort((a, b) => a - b);
    if (years.length === 0) { errors.push(p + ': 无有效年份'); continue; }
    const body = years.map(y => `  ${y}: ${hist[y]},`).join('\n');
    const constDecl =
      `\n// 历年社平工资（元/月）—— 用于个人账户余额精确计算\n` +
      `// 数据来源：provinces/${p}.json avg_salary_history（已统一为元/月格式，2025-07-06 校验）\n` +
      `const AVG_SALARY_HISTORY = {\n${body}\n};\n`;

    // 1) 在 function getEngineConfig() 前插入常量
    const fnIdx = js.indexOf('function getEngineConfig');
    if (fnIdx < 0) { errors.push(p + ': 找不到 getEngineConfig'); continue; }
    let newJs = js.substring(0, fnIdx) + constDecl + '\n' + js.substring(fnIdx);

    // 2) 在 return 的 modules: modules, 前插入 avg_salary_history 字段
    const modIdx = newJs.indexOf('modules: modules,');
    if (modIdx < 0) { errors.push(p + ': 找不到 modules: modules,'); continue; }
    // 找到该行行首，插入
    const lineStart = newJs.lastIndexOf('\n', modIdx) + 1;
    const indent = (newJs.substring(lineStart, modIdx).match(/^\s*/) || [''])[0];
    newJs = newJs.substring(0, lineStart) + indent + `avg_salary_history: AVG_SALARY_HISTORY,\n` + newJs.substring(lineStart);

    fs.writeFileSync(jsPath, newJs);
    done++;
    console.log(`✅ ${p}: 注入 ${years.length} 个年份`);
  } catch (e) {
    errors.push(p + ': ' + e.message);
  }
}

console.log(`\n完成：注入 ${done} 省，跳过 ${skipped} 省`);
if (errors.length) { console.log('❌ 错误：'); errors.forEach(e => console.log('  ' + e)); }
