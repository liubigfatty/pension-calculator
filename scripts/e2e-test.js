/**
 * 小程序端到端自动化测试
 * 需要：微信开发者工具已打开（自动化模式）
 * 用法：node scripts/e2e-test.js
 */

const path = require('path');
const { Automator } = require('C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\code\\package.nw\\js\\common\\automator\\out\\index.js');

// 案例列表（从 cases/ 读取）
function loadAllCases() {
  const fs = require('fs');
  const casesDir = path.join(__dirname, '..', 'cases');
  const results = [];
  const provinces = fs.readdirSync(casesDir).filter(f =>
    fs.statSync(path.join(casesDir, f)).isDirectory()
  );
  for (const p of provinces) {
    const dir = path.join(casesDir, p);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      const caseData = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      results.push({ province: p, file: f, data: caseData });
    }
  }
  return results;
}

async function main() {
  console.log('=== 小程序端到端自动化测试 ===\n');
  console.log('连接微信开发者工具...');
  const automator = new Automator();
  await automator.connect('127.0.0.1', 9420); // 自动化端口
  console.log('✅ 已连接\n');

  const miniProgram = automator.miniProgram;
  const cases = loadAllCases();
  console.log(`共 ${cases.length} 个案例\n`);

  let pass = 0, fail = 0;

  for (const c of cases) {
    const { province, file, data } = c;
    process.stdout.write(`  ${province}/${file} ... `);
    try {
      // 重启到首页
      await miniProgram.reLaunch({ url: '/pages/index/index' });
      await miniProgram.waitFor(500);

      // TODO: 根据 case data 填写表单并点计算
      // 这里需要先看清楚小程序的页面结构

      pass++;
      console.log('✅');
    } catch (e) {
      fail++;
      console.log(`❌ ${e.message}`);
    }
  }

  console.log(`\n=== 汇总 ===`);
  console.log(`通过: ${pass}  失败: ${fail}`);
  await automator.close();
}

main().catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
