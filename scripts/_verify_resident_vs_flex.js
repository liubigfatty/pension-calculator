// 居民养老 vs 灵活就业（武汉 46 岁男 15 年）——投喂稿核对
// 源见 _审校-居民养老vs灵活就业原文核对（2026-09-18）.md

let pass = 0, fail = 0;
const ok = (c, msg) => { c ? pass++ : (fail++, console.log('  ✗ ' + msg)); };
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg}: 期望 ${b}, 实得 ${a.toFixed(2)}`);
const money = n => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

console.log('═══ 一、源数据 ═══');
const S = {
  // 武汉 2025-07-01 起基础养老金（江夏区政府公告：原 347 + 20）
  wuhanBase: 367,
  // 湖北省最低标准 180；武汉 367
  hubeiMinBase: 180,
  // 武汉 2025 计发基数（网易/顶端新闻口径 9022~9112，取中位验证）
  wuhanJiFa: 9112,
  wuhanJiFaAlt: 9022,
  // 缴费年限加发（湖北省：≤15年 1元/年；15~25年 2元/年；>25年 3元/年）
  addYearRule: [[15, 1], [25, 2], [Infinity, 3]],
  // 湖北居民养老记账利率
  resRate: { 2022: 4.01, 2023: 1.50, 2024: 2.12, 2025: 3.32 },
  // 湖北 2025 居民养老缴费档次 / 补贴
  resTiers: { min: 300, max: 9000, subsidyMax: 402, subsidyMin: 45 },
  // 遗属待遇基数（湖北上年度城镇居民月人均可支配收入，反推自 7831/2）
  survivorBase: 3915.5,
  // 文中数据
  art: {
    resPrincipal: 70800, resAcct: 84432, resAcctPension: 607, resAddYear: 30, resTotal: 1004,
    flexEqualAcct: 38528, flexEqualAcctP: 277, flexEqualBase: 902, flexEqualTotal: 1180,
    flexIndex: 0.3206,
    flex60Total: 124750, flex60Acct: 71645, flex60Principal: 49900, flex60Interest: 21745,
    flex60AcctP: 515, flex60Base: 1093, flex60Total2: 1609,
    resDeriv: 1.42, flexDeriv: 1.29,
    resPayback: 70, flexPaybackEqual: 60, flexPayback60: 78,
  },
};
console.log(`  武汉基础养老金 ${S.wuhanBase} 元 | 武汉计发基数 ${S.wuhanJiFa} 元`);
console.log(`  遗属待遇基数 ${S.survivorBase} 元/月（反推自丧葬费 7831÷2）`);

// ───────── 二、文中算术自洽性 ─────────
console.log('\n═══ 二、文中算术自洽性 ═══');
const A = S.art;
// 居民养老
near(A.resAcct - A.resPrincipal, 13632, 0.5, '居民利息＝账户−本金');
near((A.resAcct / A.resPrincipal - 1) * 100, 19.25, 0.05, '居民 15 年总收益率 %');
near((Math.pow(A.resAcct / A.resPrincipal, 1 / 15) - 1) * 100, 1.18, 0.02, '居民年化复利 %');
near(A.resAcct / 139, A.resAcctPension, 0.5, '居民个人账户养老金＝账户÷139');
near(S.wuhanBase + A.resAddYear + A.resAcctPension, A.resTotal, 0.5, '居民合计＝基础+加发+账户');
near(A.resPrincipal / A.resTotal, A.resPayback, 0.6, '居民回本月数');
near(A.resTotal / A.resPrincipal * 100, A.resDeriv, 0.01, '居民导数（月领÷总缴）%');

// 灵活就业（等额 70800）
near(A.flexEqualAcct / 139, A.flexEqualAcctP, 0.5, '等额档个人账户养老金');
const jiFaFromEqual = A.flexEqualBase / ((1 + A.flexIndex) / 2 * 15 * 0.01);
near(jiFaFromEqual, 9107, 2, '等额档反推计发基数（应落在 9022~9112）');
ok(jiFaFromEqual >= S.wuhanJiFaAlt - 5 && jiFaFromEqual <= S.wuhanJiFa + 5, '反推计发基数落在武汉真实区间');
near(A.flexEqualBase + A.flexEqualAcctP, A.flexEqualTotal, 1, '等额档合计');
near(A.resPrincipal / A.flexEqualTotal, A.flexPaybackEqual, 0.6, '等额档回本月数');

// 灵活就业 60 档
near(A.flex60Total * 0.4, A.flex60Principal, 1, '60档本金＝总缴×40%（8%÷20%）');
near(A.flex60Acct - A.flex60Principal, A.flex60Interest, 1, '60档利息');
near((Math.pow(A.flex60Acct / A.flex60Principal, 1 / 15) - 1) * 100, 2.44, 0.02, '60档年化复利 %');
near(A.flex60Acct / 139, A.flex60AcctP, 0.5, '60档个人账户养老金');
const jiFaFrom60 = A.flex60Base / ((1 + 0.6) / 2 * 15 * 0.01);
near(jiFaFrom60, 9108, 2, '60档反推计发基数（与等额档须一致）');
near(Math.abs(jiFaFrom60 - jiFaFromEqual), 0, 2, '两处反推计发基数互相印证');
near(A.flex60Base + A.flex60AcctP, A.flex60Total2, 1, '60档合计');
near(A.flex60Total / A.flex60Total2, A.flexPayback60, 0.6, '60档回本月数');
near(A.flex60Total2 / A.flex60Total * 100, A.flexDeriv, 0.01, '60档导数 %');

// ───────── 三、硬伤一：缴费年限加发算错 ─────────
console.log('\n═══ 三、缴费年限加发（湖北省真实口径）═══');
const yearAdd = y => {
  let s = 0, prev = 0;
  for (const [cap, per] of S.addYearRule) {
    const seg = Math.min(y, cap) - prev;
    if (seg > 0) s += seg * per;
    prev = cap;
    if (y <= cap) break;
  }
  return s;
};
[[15, 30], [20, 45], [25, null], [30, null]].forEach(([y, art]) => {
  const real = yearAdd(y);
  const tag = art !== null ? `（文中 ${art} 元）` : '';
  console.log(`  缴 ${y} 年：真实 ${real} 元 ${tag}`);
  if (art !== null) ok(real === art, `文中 ${y} 年加发 ${art} 元 应为 ${real} 元`);
});
near(yearAdd(15), 15, 0, '15 年加发 = 15 元（文中 30 元，翻倍）');
near(yearAdd(20), 25, 0, '20 年加发 = 25 元（文中 45 元）');

// ───────── 四、硬伤二：遗属待遇完全遗漏 ─────────
console.log('\n═══ 四、遗属待遇（人社部发〔2021〕18号 vs 居民）═══');
const survivorStaff = y => {
  const months = y <= 15 ? 9 : Math.min(24, 9 + (y - 15));
  return S.survivorBase * (2 + months); // 丧葬 2 个月 + 抚恤
};
const survivorRes = base => base * 10; // 湖北：不低于死亡当月基础养老金 10 个月
[15, 20, 25, 30].forEach(y => {
  const st = survivorStaff(y), rs = survivorRes(S.wuhanBase);
  console.log(`  缴 ${y} 年：职工 ${money(st)} 元（抚恤 ${9 + (y <= 15 ? 0 : Math.min(15, y - 15))} 月） | 居民 ${money(rs)} 元 | 差 ${money(st - rs)} 元`);
});
near(S.survivorBase * 2, 7831, 1, '丧葬费 = 2 个月 × 3915.5（对照公开口径 7831 元）');
near(S.survivorBase * 9, 35240, 15, '抚恤金（15年）= 9 个月（对照公开口径 35240 元）');
near(survivorStaff(15), 43071, 20, '职工 15 年遗属待遇合计 = 43071 元');

// ───────── 五、修正居民养老月领额 ─────────
console.log('\n═══ 五、修正后重算 ═══');
const resTotalFix = S.wuhanBase + yearAdd(15) + A.resAcctPension;
console.log(`  居民 15 年：367 + ${yearAdd(15)} + ${A.resAcctPension} = ${resTotalFix} 元（文中 ${A.resTotal}）`);
near(resTotalFix, 989, 0.5, '修正后居民月领');
near(A.resPrincipal / resTotalFix, 71.6, 0.6, '修正后居民回本月数（文中 70）');

// ───────── 六、增量分析：这才是该问的问题 ─────────
console.log('\n═══ 六、增量分析（多缴的钱换多少）═══');
// 6.1 居民顶格 → 灵活就业 60 档
const dPay1 = A.flex60Total - A.resPrincipal;
const dGet1 = A.flex60Total2 - resTotalFix;
console.log(`  ① 居民顶格 → 灵活就业60档：多缴 ${money(dPay1)} 元，多领 ${money(dGet1)} 元/月`);
console.log(`     增量回本 ${(dPay1 / dGet1).toFixed(1)} 个月 = ${(dPay1 / dGet1 / 12).toFixed(1)} 年`);
near(dPay1 / dGet1, 87.0, 1.0, '增量回本 ≈ 87 个月');

// 6.2 居民最低档 → 居民顶格（估算：300元档，补贴45元/年，利息按 19.25% 总收益近似）
const resMinPrincipal = 300 * 15, resMinSubsidy = 45 * 15;
const resMinAcct = (resMinPrincipal + resMinSubsidy) * (A.resAcct / A.resPrincipal);
const resMinAcctP = resMinAcct / 139;
const resMinTotal = S.wuhanBase + yearAdd(15) + resMinAcctP;
const dPay2 = A.resPrincipal - resMinPrincipal;
const dGet2 = resTotalFix - resMinTotal;
console.log(`  ② 居民最低档 → 顶格：多缴 ${money(dPay2)} 元，多领 ${money(dGet2)} 元/月（最低档月领约 ${resMinTotal.toFixed(0)} 元）`);
console.log(`     增量回本 ${(dPay2 / dGet2).toFixed(1)} 个月 = ${(dPay2 / dGet2 / 12).toFixed(1)} 年`);
ok(dPay2 / dGet2 > dPay1 / dGet1, '② 的增量回本慢于 ① ⇒ 从顶格再往上换职工，比在居民内部提档更有效率');

// 6.3 把遗属待遇算进去
console.log('\n  ── 家庭总账（含遗属待遇，60岁退休，活到 78 岁＝216 个月）──');
const months216 = 216;
const famFlex = A.flex60Total2 * months216 + survivorStaff(15);
const famRes = resTotalFix * months216 + survivorRes(S.wuhanBase);
console.log(`  灵活就业60档：领取 ${money(A.flex60Total2 * months216)} + 遗属 ${money(survivorStaff(15))} = ${money(famFlex)}，投入 ${money(A.flex60Total)}`);
console.log(`  居民顶格    ：领取 ${money(resTotalFix * months216)} + 遗属 ${money(survivorRes(S.wuhanBase))} = ${money(famRes)}，投入 ${money(A.resPrincipal)}`);
const netFlex = famFlex - A.flex60Total, netRes = famRes - A.resPrincipal;
console.log(`  净收益：灵活就业 ${money(netFlex)} | 居民 ${money(netRes)} | 差 ${money(netFlex - netRes)}`);
console.log(`  增量投入 ${money(dPay1)} → 增量净收益 ${money(netFlex - netRes)}（回报率 ${((netFlex - netRes) / dPay1 * 100).toFixed(0)}%）`);
ok(netFlex - netRes > dPay1, '18 年视角下，多缴的 53,950 元换回的净增量 > 本金 ⇒ 不亏');

// 6.4 回本年龄
console.log('\n  ── 回本年龄（60 岁起算）──');
const pbFlex = A.flex60Total / A.flex60Total2, pbRes = A.resPrincipal / resTotalFix;
console.log(`  灵活就业60档 回本 ${pbFlex.toFixed(1)} 个月 → ${(60 + pbFlex / 12).toFixed(1)} 岁`);
console.log(`  居民顶格     回本 ${pbRes.toFixed(1)} 个月 → ${(60 + pbRes / 12).toFixed(1)} 岁`);
console.log(`  增量回本 ${(dPay1 / dGet1).toFixed(1)} 个月 → ${(60 + dPay1 / dGet1 / 12).toFixed(1)} 岁`);
ok(60 + dPay1 / dGet1 / 12 < 76.7, '增量回本年龄 < 男性预期寿命 76.7 岁 ⇒ 划算');

console.log(`\n═══ 结果：${pass} 通过 / ${fail} 失败 ═══\n`);
process.exit(fail === 0 ? 0 : 1);
