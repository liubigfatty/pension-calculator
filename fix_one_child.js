// 临时脚本：修复 one_child 分支 + 补 retireYear context
const fs = require('fs');
const path = require('path');

const ENGINE = path.join(__dirname, 'engine/pension-engine.js');
let content = fs.readFileSync(ENGINE, 'utf8');

// --- 修复1：one_child 分支改用 avgPensionData 按年查表 ---
const oldBranch = `  } else if (mod.type === 'one_child') {
    // 独生子女补贴：全省退休人员人均养老金 × 比例
    // 云南：云人社发〔2023〕41号，全省人均养老金 3293元/月，比例 5%
    const avgPension = mod.avgPension || 0;
    const rate = mod.rate || 0.05;
    const amount = Math.round(avgPension * rate * 100) / 100;
    return {
      amount,
      description: \`独生子女补贴：全省人均养老金\${avgPension}元 × \${(rate * 100)}% = \${amount.toFixed(2)}元\`
    }
  }`;

const newBranch = `  } else if (mod.type === 'one_child') {
    // 独生子女补贴：全省退休人员人均养老金 × 比例
    // 云南：云人社发〔2023〕41号，比例 5%
    const retireYear = params?.context?.retireYear || 2025;
    const avgPensionData = mod.avgPensionData || {};
    const avgPension = avgPensionData[retireYear] || avgPensionData[2023] || 0;
    const rate = mod.rate || 0.05;
    const amount = Math.round(avgPension * rate * 100) / 100;
    return {
      amount,
      description: \`独生子女补贴：全省人均养老金\${avgPension}元(\${retireYear}年) × \${(rate * 100)}% = \${amount.toFixed(2)}元\`
    }
  }`;

if (content.includes(oldBranch)) {
  content = content.replace(oldBranch, newBranch);
  console.log('✅ 修复 one_child 分支');
} else {
  console.log('⚠️ 未找到 one_child 旧分支，跳过');
}

// --- 修复2：calcSpecialAddition 调用处补 retireYear context ---
const oldContext = `    context: { retireAge: retireAgeExact, location: data.cityType }`;
const newContext = `    context: { retireAge: retireAgeExact, location: data.cityType, retireYear: legalDate.year }`;

if (content.includes(oldContext)) {
  content = content.replace(oldContext, newContext);
  console.log('✅ 补 retireYear 到 context');
} else {
  console.log('⚠️ 未找到 context 旧字符串，跳过');
}

fs.writeFileSync(ENGINE, content, 'utf8');
console.log('完成，已写入', ENGINE);
