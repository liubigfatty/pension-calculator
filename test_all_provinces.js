/**
 * 测试所有省份的案例验证（自动发现模式，修正字段名）
 * 引擎返回格式：result.legal = { basicPension, personalAccount, transitionalPension, ... }
 * 每项是个对象 { amount, description }
 */
const { calculate } = require('./engine/pension-engine.js');
const fs = require('fs');
const path = require('path');

const PROV_DIR = path.join(__dirname, 'data/provinces');
const provFiles = fs.readdirSync(PROV_DIR)
  .filter(f => f.endsWith('.js'))
  .map(f => path.join(PROV_DIR, f));

// 清除模块缓存
provFiles.forEach(f => {
  const resolved = require.resolve(f);
  if (require.cache[resolved]) delete require.cache[resolved];
});

// 构建省份列表
const provinces = provFiles.map(f => {
  const mod = require(f);
  const cfg = (typeof mod.getEngineConfig === 'function') ? mod.getEngineConfig() : mod;
  const name = cfg.name || path.basename(f, '.js');
  return { name, mod, key: path.basename(f, '.js') };
});

let totalCases = 0, passedCases = 0, failedCases = 0;

console.log('='.repeat(80));
console.log('📊 养老金计算引擎 - 全省份案例验证测试（自动发现模式）');
console.log('已发现省份：' + provinces.map(p => p.name).join('、'));
console.log('='.repeat(80));

provinces.forEach(({ name, mod }) => {
  const cases = mod.cases || [];
  if (cases.length === 0) {
    console.log(`\n⚠️  ${name}：无案例数据`);
    return;
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🏢 ${name}（${cases.length}个案例）`);
  console.log('='.repeat(80));

  cases.forEach((testCase, idx) => {
    totalCases++;
    console.log(`\n📋 案例 ${idx + 1}：${testCase.name}`);

    try {
      const input = testCase.input ? { ...testCase.input } : { ...testCase };
      delete input.name;
      delete input.results;
      delete input.officialDocument;
      delete input.note;
      delete input.expected;

      const engineConfig = (typeof mod.getEngineConfig === 'function')
        ? mod.getEngineConfig()
        : mod;
      const result = calculate(engineConfig, input);
      const expected = testCase.expected || testCase.results || {};
      let casePassed = true;

      const legal = result && result.legal ? result.legal : null;
      if (!legal) {
        console.log('  ❌ 引擎未返回 legal 结果');
        failedCases++;
        return;
      }

      // 辅助函数：安全比对抗
      const check = (label, expVal, actVal) => {
        if (expVal === undefined) return;
        const exp = parseFloat(expVal);
        const act = parseFloat(actVal);
        if (isNaN(exp) || isNaN(act)) {
          console.log(`  ⚠️  ${label}：无法比较（期望=${expVal}，实际=${actVal}）`);
          return;
        }
        const pass = Math.abs(act - exp) < 0.1;
        const mark = pass ? '✅' : '❌';
        console.log(`  ${mark} ${label}：${act.toFixed(2)} vs ${exp} ${pass ? '✅' : '❌'}`);
        if (!pass) casePassed = false;
      };

      // 按引擎实际返回字段名比对
      check('基础养老金',       expected.base,        legal.basicPension?.amount);
      check('增发养老金',       expected.extra,       legal.extraPension?.amount);
      check('个人账户养老金', expected.personal,    legal.personalAccount?.amount);
      check('过渡性养老金',     expected.transition,   legal.transitionalPension?.amount);
      check('其他补贴',         expected.other,       legal.specialAddition?.amount);
      check('总养老金',         expected.total,       legal.total);

      if (casePassed) {
        passedCases++;
        console.log(`  ✅ 案例 ${idx + 1} 通过`);
      } else {
        failedCases++;
        console.log(`  ❌ 案例 ${idx + 1} 失败`);
      }

    } catch (err) {
      failedCases++;
      console.log(`  ❌ 案例 ${idx + 1} 异常：${err.message}`);
    }
  });
});

console.log(`\n${'='.repeat(80)}`);
console.log('📊 测试总结');
console.log('='.repeat(80));
console.log(`总案例数: ${totalCases}`);
console.log(`通过案例: ${passedCases} ✅`);
console.log(`失败案例: ${failedCases} ❌`);
const rate = totalCases > 0 ? ((passedCases / totalCases) * 100).toFixed(2) : '0.00';
console.log(`通过率: ${rate}%`);
console.log('='.repeat(80));
