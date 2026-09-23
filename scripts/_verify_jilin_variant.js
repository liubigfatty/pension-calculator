// 吉林版：居民养老顶格 vs 灵活就业最低档（对照武汉/湖北）
// 全部参数均为 2025 年官方口径，见 _审校-居民养老vs灵活就业（吉林版）2026-09-18.md

let pass = 0, fail = 0;
const ok = (c, msg) => { c ? pass++ : (fail++, console.log('  ✗ ' + msg)); };
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg}: 期望 ${b}, 实得 ${a.toFixed(2)}`);
const m = n => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ───────── 源数据 ─────────
const JL = {
  // 居民养老（吉政发〔2014〕29号 + 吉人社联〔2025〕135号）
  resBaseProv: 154,      // 省最低标准 2025-07 起（通化社保局口径）
  resBaseCounty: 174,    // 县市普遍执行（农安/抚松/梅河口口径）
  resMaxTier: 5000,      // 最高档次
  resSubsidy: 230,       // 2025 年度执行（舒兰/抚松口径）；135号文自2025-12-31起高档改 170
  resRate: 3.61,         // 吉林 2025 居民养老记账利率（19省清单）
  resFuneral: 580,       // 4 个月 × 上年末省最低基础养老金 145 元
  resYearAdd: y => Math.max(0, y - 15) * 5,   // 超 15 年后每多缴 1 年 +5 元（15 年本身不加发）
  // 职工养老（吉人社联〔2025〕97号，2025-07-01~2026-06-30）
  flex60Annual: 10543.68,  // 60% 档年缴费额（基数 4393.2×20%×12）
  flexBaseMin: 4393.2,
  staffRate: 1.50,         // 全国 2025 年职工养老记账利率
  jiFaProv: 7322,          // 全省计发基数（=2024 全口径社平）
  jiFaCC: 7978.25,         // 长春
  // 遗属待遇基数：吉林 2025 城镇常住居民人均可支配收入 40817 元/年
  survivorMonthly: 40817 / 12,
};
const HB = {  // 武汉对照（见 2026-09-18 武汉版报告）
  resBase: 367, resMaxTier: 9600, resSubsidy: 402, resRateRes: 1.18,
  resFuneral: 3670,
  flex60Total: 124750, flex60Monthly: 1609, resTotal: 989, resPrincipal: 70800,
  survivorMonthly: 3915.5, jiFa: 9112, flexBaseMin: 4498,
};

console.log('═══ 一、吉辽 vs 武汉：参数对照 ═══');
console.log(`  吉林遗属待遇基数 = 40817÷12 = ${m(JL.survivorMonthly)} 元/月`);
console.log(`  吉林居民顶格 ${JL.resMaxTier} 元（补贴 ${JL.resSubsidy}） | 武汉 ${HB.resMaxTier} 元（补贴 ${HB.resSubsidy}）`);
console.log(`  吉林基础养老金 ${JL.resBaseCounty} 元 | 武汉 ${HB.resBase} 元`);

// ───────── 二、核心发现：计发基数 ÷ 全口径社平 ─────────
console.log('\n═══ 二、计发基数 ÷ 全口径社平（缴费基数下限÷0.6）═══');
const jlAvg = JL.flexBaseMin / 0.6;
const hbAvg = HB.flexBaseMin / 0.6;
near(jlAvg, 7322, 1, '吉林全口径社平（反推自缴费基数下限 4393.2）');
near(hbAvg, 7496.67, 1, '武汉全口径社平（反推自 4498）');
const ratioJL = JL.jiFaProv / jlAvg, ratioHB = HB.jiFa / hbAvg, ratioCC = JL.jiFaCC / jlAvg;
console.log(`  吉林全省：${JL.jiFaProv} ÷ ${m(jlAvg)} = ${ratioJL.toFixed(4)}`);
console.log(`  吉林长春：${JL.jiFaCC} ÷ ${m(jlAvg)} = ${ratioCC.toFixed(4)}`);
console.log(`  武汉    ：${HB.jiFa} ÷ ${m(hbAvg)} = ${ratioHB.toFixed(4)}`);
near(ratioJL, 1.0, 0.001, '吉林：计发基数＝全口径社平（已并轨）');
ok(ratioHB > 1.2, `武汉：计发基数比社平高 ${((ratioHB - 1) * 100).toFixed(1)}% ⇒ 同档次下武汉退休更划算`);
console.log(`  ⇒ 这就是两省结论不同的根源：武汉"尺子"长 ${((ratioHB / ratioJL - 1) * 100).toFixed(1)}%`);

// ───────── 三、静态 15 年测算（均按 2025 年参数，年末缴费）─────────
console.log('\n═══ 三、吉林静态 15 年测算（标注：未考虑基数增长与档次变迁）═══');
const fv = (pmt, r, n) => pmt * ((Math.pow(1 + r / 100, n) - 1) / (r / 100));
// 居民顶格
const jlResAcct = fv(JL.resMaxTier + JL.resSubsidy, JL.resRate, 15);
const jlResAcctP = jlResAcct / 139;
const jlResTotal = JL.resBaseCounty + JL.resYearAdd(15) + jlResAcctP;
const jlResPrincipal = JL.resMaxTier * 15;
console.log(`  居民顶格：年缴 ${JL.resMaxTier}+补贴${JL.resSubsidy}，15 年账户 ${m(jlResAcct)} 元`);
console.log(`    = ${JL.resBaseCounty}(基础) + ${JL.resYearAdd(15)}(年限加发) + ${jlResAcctP.toFixed(1)}(账户) = ${jlResTotal.toFixed(1)} 元/月`);
console.log(`    总缴费 ${m(jlResPrincipal)} | 回本 ${(jlResPrincipal / jlResTotal).toFixed(1)} 个月 | 导数 ${(jlResTotal / jlResPrincipal * 100).toFixed(3)}%`);
// 灵活就业 60 档
const jlFlexAcct = fv(JL.flex60Annual * 0.4, JL.staffRate, 15);
const jlFlexAcctP = jlFlexAcct / 139;
const jlFlexBase = JL.jiFaProv * ((1 + 0.6) / 2) * 15 * 0.01;
const jlFlexTotal = jlFlexBase + jlFlexAcctP;
const jlFlexPrincipal = JL.flex60Annual * 15;
console.log(`  灵活就业60档：年缴 ${m(JL.flex60Annual)}，15 年账户 ${m(jlFlexAcct)} 元`);
console.log(`    = ${jlFlexBase.toFixed(1)}(基础) + ${jlFlexAcctP.toFixed(1)}(账户) = ${jlFlexTotal.toFixed(1)} 元/月`);
console.log(`    总缴费 ${m(jlFlexPrincipal)} | 回本 ${(jlFlexPrincipal / jlFlexTotal).toFixed(1)} 个月 | 导数 ${(jlFlexTotal / jlFlexPrincipal * 100).toFixed(3)}%`);
near(jlFlexBase, 878.64, 0.5, '基础养老金 = 7322×(1+0.6)/2×15×1%');
// 长春口径
const jlFlexBaseCC = JL.jiFaCC * 0.12, jlFlexTotalCC = jlFlexBaseCC + jlFlexAcctP;
console.log(`    [长春] 计发基数 ${JL.jiFaCC} → 基础 ${jlFlexBaseCC.toFixed(1)}，合计 ${jlFlexTotalCC.toFixed(1)} 元/月`);

// ───────── 四、增量分析（吉林 vs 武汉）─────────
console.log('\n═══ 四、增量回本：吉林 vs 武汉 ═══');
const jlDPay = jlFlexPrincipal - jlResPrincipal, jlDGet = jlFlexTotal - jlResTotal;
const hbDPay = HB.flex60Total - HB.resPrincipal, hbDGet = HB.flex60Monthly - HB.resTotal;
const jlPB = jlDPay / jlDGet, hbPB = hbDPay / hbDGet;
console.log(`  吉林：多缴 ${m(jlDPay)}，多领 ${jlDGet.toFixed(1)} 元/月 → ${jlPB.toFixed(1)} 个月（${(jlPB / 12).toFixed(1)} 年）→ ${(60 + jlPB / 12).toFixed(1)} 岁`);
console.log(`  武汉：多缴 ${m(hbDPay)}，多领 ${hbDGet.toFixed(1)} 元/月 → ${hbPB.toFixed(1)} 个月（${(hbPB / 12).toFixed(1)} 年）→ ${(60 + hbPB / 12).toFixed(1)} 岁`);
ok(jlPB > hbPB * 1.5, `吉林增量回本 ${jlPB.toFixed(0)} 个月，比武汉 ${hbPB.toFixed(0)} 个月慢 ${(jlPB - hbPB).toFixed(0)} 个月`);
ok(60 + jlPB / 12 < 76.7, '吉林：回本年龄仍低于男性预期寿命 76.7 岁（但余量仅 ' + (76.7 - 60 - jlPB / 12).toFixed(1) + ' 年）');

// ───────── 五、遗属待遇（无需假设的硬数据）─────────
console.log('\n═══ 五、遗属待遇：吉林 vs 武汉 ═══');
const jlStaff = JL.survivorMonthly * 11, jlResF = JL.resFuneral;
const hbStaff = HB.survivorMonthly * 11, hbResF = HB.resFuneral;
console.log(`  吉林：职工 ${m(jlStaff)}（丧葬 ${m(JL.survivorMonthly * 2)} + 抚恤 ${m(JL.survivorMonthly * 9)}） | 居民 ${jlResF} | 差 ${m(jlStaff - jlResF)}`);
console.log(`  武汉：职工 ${m(hbStaff)} | 居民 ${hbResF} | 差 ${m(hbStaff - hbResF)}`);
near(jlStaff, 37415.58, 1, '吉林职工 15 年遗属待遇');
near(jlStaff / jlResF, 64.5, 0.6, '吉林职工遗属待遇 ÷ 居民 = 64.5 倍（武汉仅 11.7 倍）');

// ───────── 六、家庭总账（活到 78 岁 = 216 个月）─────────
console.log('\n═══ 六、家庭总账（60 岁退休，活到 78 岁＝216 个月，含遗属）═══');
const mo = 216;
const jlNetF = jlFlexTotal * mo + jlStaff - jlFlexPrincipal;
const jlNetR = jlResTotal * mo + jlResF - jlResPrincipal;
const hbNetF = HB.flex60Monthly * mo + hbStaff - HB.flex60Total;
const hbNetR = HB.resTotal * mo + hbResF - HB.resPrincipal;
console.log(`  吉林：职工净 ${m(jlNetF)} | 居民净 ${m(jlNetR)} | 差 ${m(jlNetF - jlNetR)}（增量投入 ${m(jlDPay)}）`);
console.log(`  武汉：职工净 ${m(hbNetF)} | 居民净 ${m(hbNetR)} | 差 ${m(hbNetF - hbNetR)}（增量投入 ${m(hbDPay)}）`);
console.log(`  吉林增量回报率 ${((jlNetF - jlNetR) / jlDPay * 100).toFixed(0)}% | 武汉 ${((hbNetF - hbNetR) / hbDPay * 100).toFixed(0)}%`);

// ───────── 七、年限加发：吉林 vs 湖北（居民养老）─────────
console.log('\n═══ 七、居民养老缴费年限加发：吉林 5 元/年 vs 湖北分段 ═══');
const hbYearAdd = y => { let s = 0, p = 0; for (const [c, v] of [[15, 1], [25, 2], [Infinity, 3]]) { const g = Math.min(y, c) - p; if (g > 0) s += g * v; p = c; if (y <= c) break; } return s; };
[15, 20, 25, 30].forEach(y => {
  console.log(`  缴 ${y} 年：吉林 ${JL.resYearAdd(y)} 元 | 湖北 ${hbYearAdd(y)} 元 ${JL.resYearAdd(y) > hbYearAdd(y) ? '（吉林高）' : ''}`);
});
ok(JL.resYearAdd(30) > hbYearAdd(30), '吉林长缴激励强于湖北（30 年 75 > 50 元）');
near(JL.resYearAdd(15), 0, 0, '吉林缴满 15 年当年不加发（与湖北不同：湖北 15 年给 15 元）');

// ───────── 八、静态假设的偏差方向：用吉林真实社平历史校正 ─────────
console.log('\n═══ 八、静态假设偏差校正（吉林历年社平，项目数据）═══');
const JL_SALARY = {
  2011: 2849.75, 2012: 3200.58, 2013: 3570.5, 2014: 3876.33, 2015: 4296.5,
  2016: 4674.83, 2017: 5120.92, 2018: 5711.08, 2019: 6151.08, 2020: 5088.42,
  2021: 6004.75, 2022: 6709.83, 2023: 7058.67, 2024: 7178.5, 2025: 7322,
};
let realSum = 0;
const rows = [];
for (const y of Object.keys(JL_SALARY).map(Number).sort()) {
  const annual = JL_SALARY[y] * 0.6 * 0.2 * 12;   // 60% 档：社平×60%×20%×12
  realSum += annual;
  rows.push(`${y}:${annual.toFixed(0)}`);
}
console.log(`  逐年 60 档年缴费（元）：${rows.join(' ')}`);
console.log(`  真实累计 ${m(realSum)} 元 | 静态假设 ${m(jlFlexPrincipal)} 元 | 静态高估 ${((jlFlexPrincipal / realSum - 1) * 100).toFixed(1)}%`);
ok(jlFlexPrincipal > realSum, '静态假设高估了职工侧缴费 ⇒ 真实历史下职工侧回本更快');
near(JL_SALARY[2025] / JL_SALARY[2011], 2.569, 0.01, '吉林社平 15 年涨 1.57 倍（2849.75→7322）');
// 按真实缴费重算回本（个人账户按同一利率折算，简化：账户按比例缩至 70,356×realSum/158,155）
const realAcct = jlFlexAcct * (realSum / jlFlexPrincipal);
const realAcctP = realAcct / 139;
const realTotal = jlFlexBase + realAcctP;
const realPB = realSum / realTotal;
const realDPay = realSum - jlResPrincipal, realDGet = realTotal - jlResTotal;
console.log(`  [参考] 真实缴费口径：职工月领 ${realTotal.toFixed(1)} 元，回本 ${realPB.toFixed(1)} 个月`);
console.log(`  [参考] 增量：多缴 ${m(realDPay)}，多领 ${realDGet.toFixed(1)} → ${(realDPay / realDGet).toFixed(1)} 个月（${(realDPay / realDGet / 12).toFixed(1)} 年）→ ${(60 + realDPay / realDGet / 12).toFixed(1)} 岁`);
ok(60 + realDPay / realDGet / 12 < 74.5, '真实历史口径下，吉林换职工的回本年龄优于静态口径');

console.log(`\n═══ 结果：${pass} 通过 / ${fail} 失败 ═══\n`);
process.exit(fail === 0 ? 0 : 1);
