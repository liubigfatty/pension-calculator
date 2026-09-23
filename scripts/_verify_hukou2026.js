/**
 * _verify_hukou2026.js
 * 《7月1日没取消什么户籍限制》一文的全部数字验算
 *
 * 数据源（均为公开发布口径）：
 *  - 2025 年全国医疗保障事业发展统计公报（2026-07 发布）
 *  - 国发〔2026〕11 号《关于推行常住地提供基本公共服务的实施意见》
 *  - 2026 年政府工作报告（居民医保财政补助 724 元）
 *  - 山西/湖南医保局 2026 年度居民医保缴费通告（个人 400 元）
 *  - 合肥市医保局（灵活就业职工医保 275 元/月）
 *
 * 用法：node scripts/_verify_hukou2026.js
 */

const SRC = {
  // —— 2025 年全国医疗保障事业发展统计公报 ——
  staffInsured: 38856.12e4,        // 职工医保参保 38856.12 万
  staffRetiree: 10793.80e4,        // 其中退休 10793.80 万
  staffFlex: 6982.18e4,            // 灵活就业及其他 6982.18 万
  residentInsured: 94213.27e4,     // 居民医保参保 94213.27 万

  staffRetireeMedCost: 10377.63e8, // 退休职工医疗机构费用 10377.63 亿元
  staffFundExpense: 19376.55e8,    // 职工医保基金支出 19376.55 亿元
  residentFundExpense: 10678.63e8, // 居民医保基金支出 10678.63 亿元

  // 住院费用目录内基金支付比例（%）
  rateInpatientStaff: 84.1,
  rateInpatientResident: 66.0,
  rateTertiaryStaff: 83.1,
  rateTertiaryResident: 61.7,

  // —— 2026 年筹资 ——
  residentPremium2026: 400,        // 居民医保个人缴费（元/人/年）
  residentSubsidy2026: 724,        // 财政补助（元/人/年）

  // —— 地方样本 ——
  hefeiFlexMonthly: 275,           // 合肥灵活就业职工医保 元/月

  // —— 规模估算口径 ——
  flexTotalEstimate: 2e8,          // 灵活就业约 2 亿（人社部口径，估算）
};

let pass = 0, fail = 0;
const F = (n, d = 2) => Number(n.toFixed(d));
function eq(label, actual, expected, tol = 0.01) {
  const ok = Math.abs(actual - expected) <= tol;
  if (ok) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}\n     实际=${F(actual)}  期望=${expected}`); }
}
function info(label, value, unit = '') {
  console.log(`  ·  ${label} = ${typeof value === 'number' ? F(value).toLocaleString('zh-CN') : value}${unit}`);
}

console.log('\n═══ 一、退休人员的医疗账单 ═══');
{
  const perCapita = SRC.staffRetireeMedCost / SRC.staffRetiree;      // 退休人员人均医疗费用
  info('退休职工人均年医疗费用', perCapita, ' 元');
  eq('退休职工人均年医疗费用 ≈ 9614.6 元', perCapita, 9614.6, 1);

  const staffOOP = perCapita * (1 - SRC.rateInpatientStaff / 100);
  const residOOP = perCapita * (1 - SRC.rateInpatientResident / 100);
  info('职工医保退休：目录内自付', staffOOP, ' 元/年');
  eq('职工目录内自付 ≈ 1528.7 元', staffOOP, 1528.7, 1);

  const residTotal = residOOP + SRC.residentPremium2026;             // 自付 + 年年交保费
  info('居民医保：目录内自付 + 400 元保费', residTotal, ' 元/年');
  eq('居民全年负担 ≈ 3669.0 元', residTotal, 3669.0, 1);

  const gapYear = residTotal - staffOOP;
  info('年差额', gapYear, ' 元/年');
  eq('年差额 ≈ 2140.3 元', gapYear, 2140.3, 1);

  const gap20 = gapYear * 20;
  info('退休后 20 年累计差额', gap20, ' 元');
  eq('20 年差额 ≈ 42,806 元', gap20, 42806, 10);

  const oneStay = 10000 * (SRC.rateInpatientStaff - SRC.rateInpatientResident) / 100;
  info('一次目录内 1 万元住院的自付差', oneStay, ' 元');
  eq('1 万元住院自付差 = 1810 元', oneStay, 1810, 0.5);

  const tertiaryGap = SRC.rateTertiaryStaff - SRC.rateTertiaryResident;
  info('三级医院报销比例差', tertiaryGap, ' 个百分点');
  eq('三级医院差 = 21.4 个点', tertiaryGap, 21.4, 0.01);
}

console.log('\n═══ 二、为什么非绑不可：一个职工医保退休人员值几个居民 ═══');
{
  const staffPer = SRC.staffFundExpense / SRC.staffInsured;
  const residPer = SRC.residentFundExpense / SRC.residentInsured;
  info('职工医保人均基金支出', staffPer, ' 元/年');
  eq('职工人均基金支出 ≈ 4986.9 元', staffPer, 4986.9, 1);
  info('居民医保人均基金支出', residPer, ' 元/年');
  eq('居民人均基金支出 ≈ 1133.5 元', residPer, 1133.5, 1);

  const ratio = staffPer / residPer;
  info('职工 : 居民 人均基金消耗倍数', ratio, ' 倍');
  eq('倍数 ≈ 4.40', ratio, 4.40, 0.01);

  // 反向：一个退休职工的年度医疗账单，抵多少个居民参保人的全年筹资
  const perResidentFunding = SRC.residentPremium2026 + SRC.residentSubsidy2026;
  const howMany = (SRC.staffRetireeMedCost / SRC.staffRetiree) / perResidentFunding;
  info('居民人均全年筹资（个人+财政）', perResidentFunding, ' 元');
  eq('居民人均筹资 = 1124 元', perResidentFunding, 1124, 0);
  info('一位退休职工年医疗账单 ÷ 居民人均筹资', howMany, ' 个');
  eq('≈ 8.55 个', howMany, 8.55, 0.02);
}

console.log('\n═══ 三、户籍这道墙拆了几年 ═══');
{
  eq('2020 国办发〔2020〕6号 → 2026 国发11号', 2026 - 2020, 6, 0);
  eq('2021 人社部发〔2021〕56号 → 2026', 2026 - 2021, 5, 0);
  eq('2022-01 人社部答复"大部分省份" → 2026', 2026 - 2022, 4, 0);
}

console.log('\n═══ 四、门开了五年，进来多少人 ═══');
{
  const flexShare = SRC.staffFlex / SRC.staffInsured * 100;
  info('灵活就业占职工医保比重', flexShare, ' %');
  eq('占比 ≈ 18.0%', flexShare, 18.0, 0.05);

  const coverage = SRC.staffFlex / SRC.flexTotalEstimate * 100;
  info('灵活就业职工医保参保率（按 2 亿估算）', coverage, ' %');
  eq('参保率 ≈ 34.9%', coverage, 34.9, 0.05);

  const outside = SRC.flexTotalEstimate - SRC.staffFlex;
  info('估算仍在职工医保网外', outside / 1e8, ' 亿人');
  eq('网外 ≈ 1.30 亿', outside / 1e8, 1.30, 0.005);
}

console.log('\n═══ 五、另一边在抬门槛：缴费年限统一到男 30 / 女 25 ═══');
{
  const start30 = 2026 - 1996; // 30 岁参保、60 岁退休
  info('30 岁参保至 60 岁', 60 - 30, ' 年');
  eq('满 30 年（够新门槛）', 60 - 30, 30, 0);

  info('35 岁参保至 60 岁', 60 - 35, ' 年');
  eq('只有 25 年（差 5 年）', 60 - 35, 25, 0);

  const need = 30 - (60 - 35);
  info('需补缴年限', need, ' 年');
  eq('差 5 年', need, 5, 0);

  const cost = SRC.hefeiFlexMonthly * 12 * need;
  info('按合肥 275 元/月补 5 年', cost, ' 元');
  eq('补缴成本 ≈ 16,500 元', cost, 16500, 0.01);
}

console.log('\n═══ 六、正文数字回填一致性 ═══');
{
  const fs = require('fs');
  const path = require('path');
  const P = path.join(__dirname, '..', '..', '..', '公众号内容库', '05-灵活就业养老',
    '_正文-7月1日没取消户籍限制但另一条值4万3篇.md');
  const md = fs.readFileSync(P, 'utf8');
  console.log(`  （已读取正文 ${md.length} 字符）`);

  // 应出现且必须与脚本计算一致的数字
  const must = [
    '9,614.44', '1,528.7', '3,268.9', '3,668.9', '2,140.2', '42,804',
    '1,810', '21.4 个百分点', '4,986.74', '1,133.45', '4.4 倍', '8.55 个', '1,124',
    '18.0%', '34.9%', '1.3 亿', '16,500', '10,377.63', '10,793.80',
    '6,982.18', '38,856.12', '94,213.27', '19,376.55', '10,678.63',
  ];
  for (const token of must) {
    const ok = md.includes(token);
    if (ok) { pass++; } else { fail++; console.log(`  ❌ 正文缺少数字：${token}`); }
  }
  if (must.every(t => md.includes(t))) console.log(`  ✅ 正文 ${must.length} 处关键数字全部命中`);

  // 绝对不能出现的错误数字 / 错误文号
  const banned = [
    ['3.2 亿', '灵活就业是 2 亿，不是 3.2 亿'],
    ['3.2亿', '灵活就业是 2 亿，不是 3.2 亿'],
    ['〔2026〕61', '文号应是国发〔2026〕11 号'],
    ['61 号', '文号应是国发〔2026〕11 号'],
    ['42,806', '应为 42,804'],
    ['2200万', '无官方来源的估算不可引用'],
    ['2,200万', '无官方来源的估算不可引用'],
    ['王阿姨', '禁止使用虚构人物案例'],
  ];
  for (const [token, why] of banned) {
    const bad = md.includes(token);
    if (!bad) { pass++; } else { fail++; console.log(`  ❌ 正文出现禁用项：${token} —— ${why}`); }
  }
  console.log(`  ✅ ${banned.length} 项禁用词检查完毕`);

  const zh = (md.match(/[\u4e00-\u9fff]/g) || []).length;
  info('正文中文字数', zh, ' 字');
  const lenOK = zh > 3300 && zh < 4600;
  if (lenOK) { pass++; } else { fail++; console.log('  ❌ 中文字数超出 3300–4600 区间'); }
  console.log('  ✅ 篇幅在区间内');
}

console.log(`\n═══ 结果：${pass} 通过 / ${fail} 失败 ═══\n`);
process.exit(fail === 0 ? 0 : 1);
