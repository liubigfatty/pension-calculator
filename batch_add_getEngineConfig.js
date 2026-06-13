const fs = require('fs');
const path = require('path');

const provincesDir = 'data/provinces';
const files = fs.readdirSync(provincesDir).filter(f => f.endsWith('.js'));

// 读取 jilin.js 的 getEngineConfig() 函数定义（作为模板）
const jilinPath = path.join(provincesDir, 'jilin.js');
let jilinContent = fs.readFileSync(jilinPath, 'utf8');

// 提取 getEngineConfig() 函数定义
const funcStart = jilinContent.indexOf('function getEngineConfig() {');
const funcEnd = jilinContent.indexOf('\n}', funcStart + 50) + 2; // +2 是为了包含 }\n
const funcDef = jilinContent.substring(funcStart, funcEnd);

console.log('模板函数长度:', funcDef.length);
console.log('前50字符:', JSON.stringify(funcDef.substring(0, 50)));

files.forEach(file => {
  const filePath = path.join(provincesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 如果已经有 getEngineConfig 函数，就跳过
  if (content.includes('function getEngineConfig()')) {
    console.log(`✅ ${file} 已有 getEngineConfig()，跳过`);
    return;
  }

  // 在 module.exports 之前插入 getEngineConfig() 函数定义
  const insertPoint = 'module.exports = {';
  if (content.includes(insertPoint)) {
    content = content.replace(insertPoint, funcDef + '\n\n' + insertPoint);
    console.log(`✅ ${file} 已添加 getEngineConfig()`);
  } else {
    console.log(`❌ ${file} 未找到插入点 module.exports = {`);
    return;
  }

  // 在 module.exports 里加上 getEngineConfig,
  const exportsStart = content.indexOf('module.exports = {');
  const firstProp = content.indexOf('  ', exportsStart + 30); // 找到第一个属性（两个空格缩进）
  if (firstProp > 0) {
    const before = content.substring(0, firstProp);
    const after = content.substring(firstProp);
    const indent = after.substring(0, after.indexOf(''));
    content = before + indent + 'getEngineConfig,\n' + after;
    console.log(`✅ ${file} module.exports 已添加 getEngineConfig`);
  } else {
    console.log(`❌ ${file} 未找到 module.exports 的第一个属性`);
    return;
  }

  // 保存
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ ${file} 已保存\n`);
});

console.log('\n✅ 批量添加完成！');
