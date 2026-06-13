// 临时脚本：按行号精确替换 one_child 分支
const fs = require('fs');
const path = require('path');

const ENGINE = path.join(__dirname, 'engine/pension-engine.js');
let lines = fs.readFileSync(ENGINE, 'utf8').split('\n');

// 行号来自刚才的输出（474-484，0-based 是 473-483）
// 替换为新分支：用 avgPensionData 按 retireYear 查表
const newLines = [
  "  } else if (mod.type === 'one_child') {",
  "    // 独生子女补贴：全省退休人员人均养老金 × 比例",
  "    // 云南：云人社发〔2023〕41号，比例 5%",
  "    const retireYear = params?.context?.retireYear || 2025;",
  "    const avgPensionData = mod.avgPensionData || {};",
  "    const avgPension = avgPensionData[retireYear] || avgPensionData[2023] || 0;",
  "    const rate = mod.rate || 0.05;",
  "    const amount = Math.round(avgPension * rate * 100) / 100;",
  "    return {",
  "      amount,",
  `      description: \`独生子女补贴：全省人均养老金\${avgPension}元(\${retireYear}年) × \${(rate * 100)}% = \${amount.toFixed(2)}元\``,
  "    }",
  "  }",
];

// 找到 one_child 分支的起始和结束行
let startIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("mod.type === 'one_child'")) {
    startIdx = i;
    break;
  }
}

if (startIdx < 0) {
  console.log('❌ 未找到 one_child 分支');
  process.exit(1);
}

// 找到分支结束的 '}'（后面是空行或下一个 else/return）
let endIdx = -1;
for (let i = startIdx + 1; i < lines.length; i++) {
  if (lines[i].trim() === '}') {
    endIdx = i;
    break;
  }
}

if (endIdx < 0) {
  console.log('❌ 未找到 one_child 分支结束位置');
  process.exit(1);
}

console.log(`替换行 ${startIdx + 1} 到 ${endIdx + 1}`);
lines.splice(startIdx, endIdx - startIdx + 1, ...newLines);

fs.writeFileSync(ENGINE, lines.join('\n'), 'utf8');
console.log('✅ one_child 分支已更新');
