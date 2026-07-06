const fs = require('fs');

// 用户提供的正确数据（元/年）
const correctData = {
  '1995': 5635,
  '1996': 6075,
  '1997': 6822,
  '1998': 7550,
  '1999': 8681,
  '2000': 10521,
  '2001': 11723,
  '2002': 13056,
  '2003': 14709,
  '2004': 17211,
  '2005': 21239,
  '2006': 26210,
  '2007': 30719,
  '2008': 34083,
  '2009': 39144,
  '2010': 44574,
  '2011': 48961,
  '2012': 52185,
  '2013': 56811,
  '2014': 62482,
  '2015': 67830,
  '2016': 72779,
  '2017': 78384,
  '2018': 82620,
  '2019': 67142,
  '2020': 73320,
  '2021': 85252,
  '2022': 91993,
  '2023': 97054,
  '2024': 98424,
  '2025': 102149,
  '_source': '用户提供官方数据'
};

// 生成正确的 avg_salary_history 字符串（JSON格式，和.js文件里的一致）
const newAvgSalary = '{\n' + Object.entries(correctData).map(([k, v]) => {
  if (k === '_source') return '    "_source": "用户提供官方数据"';
  return '    "' + k + '": ' + v;
}).join(',\n') + '\n  }';

// 修复 .js 文件
const jsFile = 'cloudfunctions/calculate/provinces/ningxia.js';
let js = fs.readFileSync(jsFile, 'utf8');

// 找到 avg_salary_history: { 的位置，然后找到配对的 }
const marker = 'avg_salary_history:';
const startIdx = js.indexOf(marker);
if (startIdx === -1) {
  console.log('❌ 未找到 avg_salary_history');
  process.exit(1);
}

// 从 marker 后面开始找配对的 }
let braceCount = 0;
let foundOpen = false;
let endIdx = -1;
for (let i = startIdx + marker.length; i < js.length; i++) {
  const c = js[i];
  if (c === '{') { braceCount++; foundOpen = true; }
  if (c === '}') {
    braceCount--;
    if (foundOpen && braceCount === 0) { endIdx = i; break; }
  }
}

if (endIdx === -1) {
  console.log('❌ 未找到 avg_salary_history 的结束 }');
  process.exit(1);
}

// 替换（保留 marker 和前面的空白）
const before = js.substring(0, startIdx + marker.length);
const after = js.substring(endIdx + 1);
js = before + '\n' + newAvgSalary + after;

fs.writeFileSync(jsFile, js, 'utf8');
console.log('✅ 宁夏 .js 文件已修复');

// 验证语法
const { execSync } = require('child_process');
try {
  execSync('node -c "' + jsFile + '"', { stdio: 'pipe' });
  console.log('✅ 语法检查通过');
} catch (e) {
  console.log('❌ 语法错误：', e.stderr.toString());
}
