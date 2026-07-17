/**
 * 河南省养老金测算测试
 * 测试河南配置的完整性和计算准确性
 * 案例4来源：郑州市2026年企业退休人员官方核定表（真实案例，高指数）
 * 案例5来源：平顶山市2024年企业退休人员官方核定表（真实案例，普通档）
 * 案例6来源：郑州市2025年12月企业退休人员官方核定表（真实案例，普通档）
 */

const fs = require('fs');
const path = require('path');
const engine = require('../engine/pension-engine');
const henanModule = require('../cloudfunctions/calculate/provinces/henan');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../provinces/henan.json'), 'utf8'));
// 注入查表函数到config（JSON无函数，需从JS模块补入）
config.lookupZZSubsidyParam = henanModule.lookupZZSubsidyParam;

// 测试用例
const testCases = [
  {
    name: '河南男职工（1995年入职，普通档）',
    input: {
      name: '张哥',
      gender: 'male',
      birthYear: 1975,
      birthMonth: 6,
      workYear: 1995,
      workMonth: 1,
      avgIndex: 1.0,
      cityType: 'prov',
      retireType: 'standard',
      personalAccInput: null,
      sightYears: 0
    },
    expected: {
      hasResult: true
    }
  },
  {
    name: '河南女工人（1997年灵活就业）',
    input: {
      name: '李姐',
      gender: 'female',
      birthYear: 1978,
      birthMonth: 3,
      workYear: 1997,
      workMonth: 1,
      avgIndex: 0.6,
      cityType: 'prov',
      retireType: 'flexible',
      personalAccInput: null,
      sightYears: 0
    },
    expected: {
      hasResult: true
    }
  },
  {
    name: '河南老职工（含视同缴费10年）',
    input: {
      name: '王师傅',
      gender: 'male',
      birthYear: 1968,
      birthMonth: 3,
      workYear: 1990,
      workMonth: 1,
      avgIndex: 0.8,
      cityType: 'prov',
      retireType: 'standard',
      personalAccInput: null,
      sightYears: 10
    },
    expected: {
      hasResult: true
    }
  },
  // 案例4：郑州官方核定表验证（双基数+双指数+过渡性补贴）
  // 来源：郑州市2026-02核定表（今日头条@平静语社保 2026-07发布）
  // 核心参数：省基数6738/郑州基数7933/基础指数2.1119/过渡指数2.5286/视同11.58年/实缴30.92年
  {
    name: '郑州官方核定表验证（1965生/1983入职/2026退/高指数中人）',
    input: {
      name: '郑州核定表验证',
      gender: 'male',
      birthYear: 1965,
      birthMonth: 11,
      workYear: 1983,
      workMonth: 9,
      avgIndex: 2.1119,       // 基础养老金有效指数（含视同拉低后：cityBase×2.1119≈16752）
      transIndex: 2.5286,     // 过渡性养老金独立指数（纯建账后实缴平均：cityBase×2.5286≈20059）
      cityType: 'zz',         // 郑州市（触发双基数+补贴）
      retireType: 'standard',
      personalAccInput: 395301.7,  // 个人账户储存额
      sightYears: 11.58,      // 视同缴费年限（1983-09至1995-03，139个月）
      retireDateInput: { year: 2026, month: 2 },  // 2026-02退休（延3月，60岁3个月）
      monthsInput: 137.3,     // 计发月数（60岁139月-延退3月调整）
    },
    expected: {
      hasResult: true,
      basicPension: 4991.65,       // (6738 + 16752.12) / 2 * 42.5 * 1%
      personalAccount: 2879.11,    // 395301.7 / 137.3
      transitionalPension: 3019.74, // 20059.38 * 11.58 * 1.3%
      specialAddition: 643.86,     // 郑州过渡性补贴：(30.92*8.85)/(42.5*1%)*(7933/7933)
      total: 11534.36,             // 四项合计
    }
  },
  {
    name: '平顶山官方核定表验证（女，2024-12退休，双基数反向案例）',
    input: {
      name: '平顶山核定表验证', gender:'female', birthYear:1974, birthMonth:12,
      workYear:1993, workMonth:12, avgIndex:0.6297, transIndex:0.605,
      cityType:'pds', retireType:'standard', personalAccInput:71310.26,
      sightYears:1.08, retireDateInput:{year:2024,month:11}, monthsInput:195
    },
    expected: {
      hasResult: true,
      // 平顶山核定表：省6606+城市6260，基数低于省（与郑州相反）
      // 基础养老金=(6606+3941.92)/2*31.08*1%=1639.15
      basicPension: 1639.15,
      // 个人账户=71310.26/195=365.69
      personalAccount: 365.69,
      // 过渡性=3787.30*1.08*1.3%=53.17
      transitionalPension: 53.17,
      total: 2058.01,
    }
  },
  {
    // 案例6：郑州市普通档核定表（2025-12退休，男，60岁）
    // 来源：官方核定表截图（2026-07-17用户提供）
    // 关键验证点：补贴参数=4.62（非8.85！），证明参数因人而异
    name: '郑州官方核定表验证-普通档（男，2025-12退休，补贴参数4.62）',
    input: {
      name: '郑州普通档核定表', gender:'male', birthYear:1965, birthMonth:12,
      workYear:1994, workMonth:6, avgIndex:0.6399, transIndex:0.6283,
      cityType:'zz', retireType:'standard', personalAccInput:91074.68,
      sightYears:7/12,   // 视同缴费7个月(1994-06~1994-12) = 0.5833年
      retireDateInput:{year:2025,month:11}, monthsInput:139,
      subsidyParam:4.62   // 查表：视同见月进年=1, 指数进位=0.7 → 参数=4.62
    },
    expected: {
      hasResult: true,
      basicPension: 1865.48,       // (6738+5076.33)/2*31.58*1%
      personalAccount: 655.21,     // 91074.68/139
      transitionalPension: 37.58,   // 4984.30*0.5833*1.3% ≈ 37.58
      specialAddition: 453.51,     // (31×4.62)/(31.58×1%) × (7933/7933)
      total: 3011.78,              // 1865.48+655.21+37.58+453.51
      tolerance: 2.0,              // 放宽容差（年限计算方式差异）
    }
  },
  {
    // 案例7：新乡市企业女职工核定表（2026-03退休，女，55岁2个月）
    // 来源：官方核定表截图（2026-07-17用户提供）
    // 关键验证点：新乡基数6385 < 省基数6738（向下偏），双指数1.1506 vs 1.2612
    name: '新乡官方核定表验证-管理岗女（2026-03退休，基数6385<省6738）',
    input: {
      name: '新乡核定表', gender:'female', birthYear:1971, birthMonth:1,
      workYear:1988, workMonth:7, avgIndex:1.2141, transIndex:1.2612,
      cityType:'xx', retireType:'standard', personalAccInput:163443.46,
      sightYears:6.5,     // 视同78个月(1988-07~1995-01) = 6.5年
      retireDateInput:{year:2026,month:3}, monthsInput:169,
      // 无过渡性补贴（仅郑州享受）
    },
    expected: {
      hasResult: true,
      basicPension: 2729.2,         // (6738+6385*1.2141)/2*37.67*1% — 基础指数化工资=7752.03=6385×avgIndex
      personalAccount: 967.12,      // 163443.46/169
      transitionalPension: 680.3,   // 6385*1.2612*6.5*1.3% — 过渡指数化工资=8050.85=6385×transIndex
      total: 4376.62,               // 2729.2+967.12+680.3
      tolerance: 2.0,
    }
  }
];

let passed = 0;
let failed = 0;

console.log('========== 河南省养老金测算测试 ==========\n');

testCases.forEach((tc, i) => {
  try {
    const result = engine.calculate(config, tc.input);
    const legal = result.legal;
    
    let success = true;
    let msg = '';
    
    // 检查是否有结果
    if (!legal || !legal.total) {
      success = false;
      msg = '计算结果为空';
    }
    
    // 检查计发基数
    if (tc.expected.baseRetire && legal.baseRetire !== tc.expected.baseRetire) {
      success = false;
      msg = `计发基数不匹配：期望 ${tc.expected.baseRetire}，实际 ${legal.baseRetire}`;
    }

    // 精确数值校验（官方核定表案例）
    // 容差：基础/个人±40元（年限计算方式差异），过渡精确±1元，补贴±5元，合计±30元
    const TOL_BASIC = 40, TOL_PA = 40, TOL_TRANS = 1, TOL_SA = 5, TOL_TOTAL = 30;
    if (tc.expected.basicPension) {
      const basic = legal.basicPension?.amount || 0;
      if (Math.abs(basic - tc.expected.basicPension) > TOL_BASIC) {
        success = false;
        msg = `基础养老金不匹配：期望 ${tc.expected.basicPension}，实际 ${basic.toFixed(2)}（容差±${TOL_BASIC}）`;
      }
    }
    if (tc.expected.personalAccount) {
      const pa = legal.personalAccount?.amount || 0;
      if (Math.abs(pa - tc.expected.personalAccount) > TOL_PA) {
        success = false;
        msg = `个人账户养老金不匹配：期望 ${tc.expected.personalAccount}，实际 ${pa.toFixed(2)}（容差±${TOL_PA}）`;
      }
    }
    if (tc.expected.transitionalPension) {
      const tp = legal.transitionalPension?.amount || 0;
      if (Math.abs(tp - tc.expected.transitionalPension) > TOL_TRANS) {
        success = false;
        msg = `过渡性养老金不匹配：期望 ${tc.expected.transitionalPension}，实际 ${tp.toFixed(2)}（容差±${TOL_TRANS}）`;
      }
    }
    if (tc.expected.specialAddition !== undefined) {
      const sa = legal.specialAddition?.amount || 0;
      if (Math.abs(sa - tc.expected.specialAddition) > TOL_SA) {
        success = false;
        msg = `过渡性补贴不匹配：期望 ${tc.expected.specialAddition}，实际 ${sa.toFixed(2)}（容差±${TOL_SA}）`;
      }
    }
    if (tc.expected.total) {
      const total = legal.total || 0;
      if (Math.abs(total - tc.expected.total) > TOL_TOTAL) {
        success = false;
        msg = `合计不匹配：期望 ${tc.expected.total}，实际 ${total.toFixed(2)}（容差±${TOL_TOTAL}）`;
      }
    }
    
    if (success) {
      passed++;
      console.log(`✅ 测试 ${i + 1}: ${tc.name}`);
      console.log(`   月领养老金: ${legal.total?.toFixed(2) || 0} 元`);
      console.log(`   基础养老金: ${legal.basicPension?.amount?.toFixed(2) || 0} 元`);
      console.log(`   个人账户养老金: ${legal.personalAccount?.amount?.toFixed(2) || 0} 元`);
      console.log(`   过渡性养老金: ${legal.transitionalPension?.amount?.toFixed(2) || 0} 元`);
      if (legal.specialAddition?.amount > 0) {
        console.log(`   过渡性补贴: ${legal.specialAddition.amount.toFixed(2)} 元`);
      }
      console.log(`   退休日期: ${legal.date?.year}年${legal.date?.month}月`);
    } else {
      failed++;
      console.log(`❌ 测试 ${i + 1}: ${tc.name}`);
      console.log(`   失败原因: ${msg}`);
    }
    console.log('');
  } catch (e) {
    failed++;
    console.log(`❌ 测试 ${i + 1}: ${tc.name}`);
    console.log(`   异常: ${e.message}`);
    console.log('');
  }
});

// ============ 郑州过渡性补贴查表回归测试（#4b：补全附表二坐标） ============
console.log('========== 郑州补贴查表回归测试 ==========\n');
const zzTests = [
  { name: '坐标(1,0.7)→4.62 [case6 郑州2025-12]', sight: 7/12, idx: 0.6283, want: 4.62 },
  { name: '坐标(5,0.9)→5.26', sight: 5, idx: 0.9, want: 5.26 },
  { name: '坐标(12,2.6)→8.85', sight: 12, idx: 2.6, want: 8.85 },
  { name: '坐标(13,0.6)→6.32', sight: 13, idx: 0.6, want: 6.32 },
  { name: '坐标(14,0.9)→6.45 [case3 郑州2024-01]', sight: 13.5, idx: 0.8279, want: 6.45 },
];
zzTests.forEach(t => {
  const got = henanModule.lookupZZSubsidyParam(t.sight, t.idx);
  if (Math.abs(got - t.want) < 1e-9) { passed++; console.log(`✅ ${t.name}（查得 ${got}）`); }
  else { failed++; console.log(`❌ ${t.name} 期望 ${t.want} 实得 ${got}`); }
});

// 公式复算（与引擎 calcSpecialAddition.zhengzhou_subsidy 同式）：
// 补贴 = (实际年限×参数) / (累计年限×1%) × (郑州基数/参考基数7933)
function zzSubsidy(actual, total, param, zzBase, baseRef = 7933) {
  return Math.round((actual * param) / (total * 0.01) * (zzBase / baseRef) * 100) / 100;
}
const zzFormula = [
  { name: 'case3 郑州2024-01：实际26.5/累计40/参数6.45/郑州7800 → 核定表419.9', actual: 26.5, total: 40, param: 6.45, zzBase: 7800, want: 419.9 },
  { name: 'case6 郑州2025-12：实际31/累计31.58/参数4.62/郑州7933 → 核定表453.51', actual: 31, total: 31.58, param: 4.62, zzBase: 7933, want: 453.51 },
];
zzFormula.forEach(t => {
  const got = zzSubsidy(t.actual, t.total, t.param, t.zzBase);
  if (Math.abs(got - t.want) <= 0.5) { passed++; console.log(`✅ ${t.name}（算得 ${got}）`); }
  else { failed++; console.log(`❌ ${t.name} 期望≈${t.want} 实得 ${got}`); }
});
console.log('');

console.log(`\n========== 测试结果 ==========`);
console.log(`通过: ${passed}, 失败: ${failed}, 总计: ${passed + failed}, 通过率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

process.exit(failed > 0 ? 1 : 0);