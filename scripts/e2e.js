/**
 * 小程序端到端自动化测试（完整版）
 * 
 * 前置步骤：
 *   1. 打开微信开发者工具
 *   2. 设置 → 安全设置 → 开启"服务端口"
 *   3. 在工具内打开本项目
 *   4. 运行：node scripts/e2e.js
 */

const { automator } = require('miniprogram-automator');
const fs = require('fs');
const path = require('path');

// ===== 工具函数 =====

// 智能等待（轮询条件）
async function waitFor(page, checkFn, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await checkFn()) return true;
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

// 通过 data-value 点击 radio 项
async function tapRadio(page, selector, value) {
  const items = await page.$$(`${selector} .radio-item`);
  for (const item of items) {
    const dataValue = await item.attribute('data-value');
    if (dataValue === value) {
      await item.tap();
      return true;
    }
  }
  return false;
}

// 设置 picker（mode=selector）的值
async function setPicker(page, pickerSelector, targetIndex) {
  const picker = await page.$(pickerSelector);
  await picker.tap();
  // 等待 picker 弹出
  await page.waitFor(800);
  // 通过 actionSheet 或 picker-view 选择（简化：直接发 change 事件）
  // 实际需用开发者工具的 picker 操控 API，这里用 JS 直接设值
  await page.data('tmpPickerIndex', targetIndex);
  await page.waitFor(300);
}

// ===== 核心：在小程序里填表单并提交 =====

async function runCaseInMiniProgram(miniProgram, caseData) {
  // 重启到首页
  await miniProgram.reLaunch({ url: '/pages/index/index' });
  await miniProgram.waitFor(600);
  let page = await miniProgram.currentPage();

  // --- Step 1：点"开始测算" ---
  const startBtn = await page.$('.btn-start');
  await startBtn.tap();
  await miniProgram.waitFor(800);
  page = await miniProgram.currentPage();

  // --- Step 2：填个人信息（step2 页面） ---
  // 性别
  await tapRadio(page, '.form-group', caseData.gender === 'male' ? 'male' : 'female');
  await miniProgram.waitFor(300);

  // 参保身份
  await tapRadio(page, '.form-group', caseData.identity === 'employee' ? 'employee' : 'flexible');
  await miniProgram.waitFor(300);

  // 女职工退休年龄（仅女性+企业职工）
  if (caseData.gender === 'female' && caseData.identity === 'employee' && caseData.femaleEmployeeAge) {
    await tapRadio(page, '.form-group', caseData.femaleEmployeeAge);
    await miniProgram.waitFor(300);
  }

  // 出生年月 → 用 JS 直接设 data（绕过 picker）
  const [birthYear, birthMonth] = (caseData.birthDate || '1968-01').split('-').map(Number);
  await page.setData({ birthYear, birthMonth });
  await miniProgram.waitFor(200);

  // 参加工作时间
  const [workYear, workMonth] = (caseData.workStartDate || '1988-01').split('-').map(Number);
  await page.setData({ workYear, workMonth });
  await miniProgram.waitFor(200);

  // 点"下一步"
  const nextBtn = await page.$('.btn-next');
  await nextBtn.tap();
  await miniProgram.waitFor(800);
  page = await miniProgram.currentPage();

  // --- Step 3：填缴费信息（step3 页面） ---
  // 选择缴费指数
  const targetIndex = caseData.averageIndex || 1.0;
  // 找最接近的预设指数按钮
  const indexGrid = await page.$('.index-grid');
  if (indexGrid) {
    // 先尝试直接设 customIndex
    await page.setData({ useCustomIndex: true, customIndex: String(targetIndex) });
    await miniProgram.waitFor(300);
  }

  // 个人账户余额
  if (caseData.personalAccount) {
    await page.setData({ accountBalance: String(caseData.personalAccount) });
    await miniProgram.waitFor(200);
  }

  // 点"计算养老金"
  const calcBtn = await page.$('.btn-calculate');
  await calcBtn.tap();

  // 等待结果页
  await miniProgram.waitFor(2000);
  page = await miniProgram.currentPage();

  // --- 读取结果 ---
  const resultData = await page.data();
  return {
    total: resultData.totalPension || resultData.total || 0,
    basePension: resultData.basePension || 0,
    personalPension: resultData.personalPension || 0,
    transitionPension: resultData.transitionPension || 0,
  };
}

// ===== 主流程 =====

async function main() {
  console.log('=== 养老金计算平台 端到端自动化测试 ===\n');

  // 连接开发者工具
  let automator;
  try {
    automator = await automator.connect({
      wsEndpoint: 'ws://127.0.0.1:9420',
    });
    console.log('✅ 已连接开发者工具\n');
  } catch (e) {
    console.error('❌ 无法连接开发者工具，请确认：');
    console.error('  1. 微信开发者工具已打开');
    console.error('  2. 设置 → 安全设置 → 开启"服务端口"');
    console.error('  3. 在工具内打开了本项目');
    console.error('  4. 端口号是否为 9420');
    process.exit(1);
  }

  const miniProgram = automator.miniProgram;

  // 加载案例
  const casesDir = path.join(__dirname, '..', 'cases');
  const allCases = [];
  for (const province of fs.readdirSync(casesDir).filter(
    f => fs.statSync(path.join(casesDir, f)).isDirectory()
  )) {
    const dir = path.join(casesDir, province);
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
      const caseData = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      allCases.push({ province, file: f, data: caseData });
    }
  }

  console.log(`共 ${allCases.length} 个案例\n`);
  let pass = 0, fail = 0;

  for (const { province, file, data } of allCases) {
    process.stdout.write(`  ${province}/${file} ... `);
    try {
      const actual = await runCaseInMiniProgram(miniProgram, data);
      const expected = data.expected || {};

      let casePass = true;
      const diffs = [];
      for (const key of ['total', 'basePension', 'personalPension']) {
        if (expected[key] !== undefined) {
          const diff = Math.abs(actual[key] - expected[key]);
          if (diff > 1) {
            casePass = false;
            diffs.push(`${key}: 预期${expected[key]} vs 实际${actual[key]}`);
          }
        }
      }

      if (casePass) {
        pass++;
        console.log('✅');
      } else {
        fail++;
        console.log(`❌ ${diffs.join('; ')}`);
      }
    } catch (e) {
      fail++;
      console.log(`❌ ${e.message}`);
    }
  }

  console.log(`\n=== 汇总 ===`);
  console.log(`通过: ${pass}  失败: ${fail}`);
  await automator.close();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('❌ 异常:', e.message);
  process.exit(1);
});
