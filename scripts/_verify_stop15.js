// ═══════════════════════════════════════════════════════════════
// 缴满15年就停 vs 一直缴到退休（吉林·长春）
// 独立复刻吉林四件套公式 —— 不依赖 pension-engine 的年限逻辑（它不支持中途断缴）
// 校验方式：先复现引擎"缴到退休"结果，逐项对齐后再算停缴场景
// 数据源：cloudfunctions/calculate/provinces-data.js 的 jilin
// 政策源：吉政发〔1995〕18号（建账）、吉政发〔1998〕28号（长缴增发）
//        TRANS_COEF 过20年1.4% / 未过1.2%（引擎 L731）
// 2026-09-19
// ═══════════════════════════════════════════════════════════════
const ROOT = 'C:/Users/14041/WorkBuddy/2026-07-16-10-20-33/养老金计算平台';
const CF = ROOT + '/cloudfunctions/calculate';
const engine = require(CF + '/pension-engine.js');
const { getConfig } = require(CF + '/provinces-data.js');

const CONF = getConfig('jilin');
const CC = CONF.base_rates.cc;        // 长春计发基数
const PV = CONF.base_rates.prov;      // 全省计发基数
const SAL = CONF.avg_salary_history;  // 历年社平（缴费口径）

// 个人账户记账利率（与 pension-engine.js INTEREST_RATES 完全一致）
// 2016年起全国统一由人社部/财政部公布；2026=内蒙古社保台账反推，尚未正式发文
const IR = {
  1995: 0.0225, 1996: 0.0804, 1997: 0.0567, 1998: 0.0447, 1999: 0.0225,
  2000: 0.0225, 2001: 0.0225, 2002: 0.0225, 2003: 0.0198, 2004: 0.0198,
  2005: 0.0225, 2006: 0.0252, 2007: 0.0414, 2008: 0.0414, 2009: 0.0225,
  2010: 0.0225, 2011: 0.0350, 2012: 0.0350, 2013: 0.0300, 2014: 0.0350,
  2015: 0.0350, 2016: 0.0831, 2017: 0.0712, 2018: 0.0829, 2019: 0.0761,
  2020: 0.0604, 2021: 0.0669, 2022: 0.0612, 2023: 0.0397, 2024: 0.0262,
  2025: 0.0150, 2026: 0.0260,
};

const abs = (y, m) => y * 12 + m;
const F = (n, p = 2) => Number(n).toFixed(p);

// 个人账户养老金计发月数（国发〔2005〕38号）；非整岁按线性插值（引擎同口径）
const MDIV = { 60: 139, 61: 132, 62: 125, 63: 117, 64: 109, 65: 101, 66: 93, 67: 84, 68: 75, 69: 65, 70: 56 };
function monthsDivisor(ageYears) {
  const lo = Math.floor(ageYears), hi = lo + 1;
  if (!MDIV[lo] || !MDIV[hi]) return MDIV[60];
  return Math.round((MDIV[lo] + (MDIV[hi] - MDIV[lo]) * (ageYears - lo)) * 10) / 10;
}

// ── 独立实现：吉林养老金四件套 ──────────────────────────────
function jilinPension({ workY, workM, stopY, stopM, payMonths, retireY, retireM, idx, city }) {
  const work = abs(workY, workM);
  const accSta = abs(1995, 7);              // 建账起点
  const retire = abs(retireY, retireM);
  // 停缴月份（最后缴的一个月）；也可直接指定实缴月数（扫描用）
  let stopRaw;
  if (payMonths != null) stopRaw = accSta + payMonths - 1;
  else stopRaw = (stopY && stopM) ? abs(stopY, stopM) : Infinity;
  const stop = Math.min(stopRaw, retire - 1);

  // 年限（月）
  const sightM = Math.max(accSta - work, 0);
  const payM = Math.max(stop - accSta + 1, 0);
  const totalM = sightM + payM;
  const sightY = sightM / 12, actualY = payM / 12, totalY = totalM / 12;

  const cityBase = city === 'cc' ? CC[retireY] : PV[retireY];
  const provBase = PV[retireY];
  const avgBase = (cityBase + provBase * idx) / 2;

  // ① 基础养老金 = (市县基数 + 全省基数×指数)/2 × 累计年限 × 1%
  const basic = Math.round(avgBase * totalY * 0.01 * 100) / 100;

  // ② 过渡性养老金 = 全省基数 × 视同年限 × 指数 × 系数（过20年1.4%，否则1.2%）
  const coef = actualY > 20 ? 0.014 : 0.012;
  const trans = sightM > 0 ? Math.round(provBase * sightY * idx * coef * 100) / 100 : 0;

  // ③ 长缴增发（实缴超20年触发，按累计年限分档累进）
  let extra = 0;
  if (actualY > 20) {
    const brackets = [[21, 25, 0.0015, 5], [26, 30, 0.0020, 5], [31, null, 0.0025, null]];
    let sum = 0;
    for (const [from, to, rate, width] of brackets) {
      if (totalY >= from) {
        const seg = (to === null) ? Math.max(totalY - from + 1, 0)
          : Math.min(Math.max(totalY - from + 1, 0), width);
        sum += seg * rate;
      }
    }
    extra = Math.round(avgBase * sum * 100) / 100;
  }

  // ④ 个人账户（逐年：上年末余额计息 + 本年存入，本年存入不计当年利息）
  let acc = 0, paidMonths = 0, payAmount = 0;
  let detail = [];
  for (let y = 1995; y <= retireY; y++) {
    let mn = 0;                                   // 本年缴费月数
    if (stop >= accSta) {
      const yStart = Math.max(abs(y, 1), accSta);
      const yEnd = Math.min(abs(y, 12), stop);
      mn = Math.max(yEnd - yStart + 1, 0);
    }
    const r = IR[y] ?? 0.0225;
    // 社平口径：优先当年社平；缺失时降级到全省计发基数（与引擎 getSalaryBase 实测一致：
    //   引擎 2025 年取 7322 而非长春 7978.25 —— 见 description 反推验证）
    const src = SAL[y] ?? PV[y];
    const monthPay = src * idx * 0.08;
    // 退休当年按实际月数单利计息；其余年份：上年末余额计息 + 本年存入（本年存入不计当年利息）
    acc = (y === retireY)
      ? acc * Math.pow(1 + r, mn / 12) + monthPay * mn
      : acc * (1 + r) + monthPay * mn;
    paidMonths += mn;
    payAmount += monthPay * mn;
    detail.push({ y, mn, end: Math.round(acc * 100) / 100 });
  }
  acc = Math.round(acc * 100) / 100;

  // 计发月数：延迟到非整岁后按线性插值（引擎实测 60岁3个月=137.3，不是139）
  const monthsDiv = monthsDivisor(60.25);
  const personal = Math.round(acc / monthsDiv * 100) / 100;

  const total = Math.round((basic + personal + trans + extra) * 100) / 100;
  return { sightY, actualY, totalY, basic, trans, extra, personal, acc, total, paidMonths, payAmount, coef, detail };
}

// ── 引擎基准（缴到退休，不断缴）──────────────────────────────
function engineBase(idx, city, workY, workM) {
  const r = engine.calculate(getConfig('jilin'), {
    gender: 'male', genderType: 'male',
    birthYear: 1965, birthMonth: 9,
    workYear: workY, workMonth: workM,
    avgIndex: idx, cityType: city,
    retireDateInput: { year: 2025, month: 12 },
  }).legal;
  return {
    sightY: r.sightYears, actualY: r.actualYears, totalY: r.totalYears,
    basic: r.basicPension.amount, trans: r.transitionalPension.amount,
    extra: r.extraPension.amount, personal: r.personalAccount.amount,
    acc: r.personalAccount.balance, total: r.total,
  };
}

let pass = 0, fail = 0;
function eq(a, b, tol, label) {
  const ok = Math.abs(a - b) <= tol;
  ok ? pass++ : fail++;
  console.log((ok ? '  ✅ ' : '  ❌ ') + label + '  自算 ' + F(a) + ' vs 基准 ' + F(b) + (ok ? '' : '  差 ' + F(a - b)));
}

// ═══ 第一部分：校准（必须全绿才可信）═════════════════════════
console.log('═══ 校准：独立公式 vs 引擎（缴到退休，无断缴）═══\n');
[[1.0, 'cc'], [0.6, 'cc'], [1.0, 'prov']].forEach(([idx, city]) => {
  console.log('— idx=' + idx + ' city=' + city + ' —');
  const mine = jilinPension({ workY: 1987, workM: 7, retireY: 2025, retireM: 12, idx, city });
  const base = engineBase(idx, city, 1987, 7);
  eq(mine.sightY, base.sightY, 0.01, '视同年限');
  eq(mine.actualY, base.actualY, 0.01, '实缴年限');
  eq(mine.totalY, base.totalY, 0.01, '累计年限');
  eq(mine.basic, base.basic, 1.0, '基础养老金');
  eq(mine.trans, base.trans, 1.0, '过渡性养老金');
  eq(mine.extra, base.extra, 1.0, '长缴增发');
  eq(mine.acc, base.acc, 100, '个人账户储存额');
  eq(mine.personal, base.personal, 1.0, '个人账户养老金');
  eq(mine.total, base.total, 2.0, '月合计');
  console.log('');
});

if (fail > 0) {
  console.log('═══ 校准失败，后续结果不可信 ═══');
  process.exit(1);
}
console.log('═══ 校准通过：独立公式与引擎完全一致 ═══\n');
// ─────────────────────────────────────────────────────────────
// 以下为场景分析（校准通过后执行）
// ─────────────────────────────────────────────────────────────

// ═══ 第二部分：角色设定 ═══════════════════════════════════════
const IDX = 0.6;          // 灵活就业按 60 档（最低档）缴
const CITY = 'cc';        // 长春
const W = { workY: 1987, workM: 7, retireY: 2025, retireM: 12, idx: IDX, city: CITY };
const MAX_PAY = 365;      // 缴到退休的实缴月数（1995.07 ~ 2025.11）

console.log('═══ 场景 ═══');
console.log('主角：老陈，男，1965-09 生，1987-07 进厂（22 岁），2002 年下岗后在长春以灵活就业身份');
console.log('      按 60 档自缴，2025-12 退休（法定 60 岁 3 个月）。');
console.log('      吉林建账 1995-07 ⇒ 视同 8.00 年，2002 年时累计年限刚满 15 年。\n');

console.log('累计 | 实缴 |过渡系数| 基础 | 过渡 | 增发 | 个账 | 月合计 | 较上年+');
console.log('─────┼──────┼────────┼──────┼──────┼──────┼──────┼────────┼───────');
const data = [];
for (let payM = 84; payM <= 360; payM += 12) {
  data.push({ payM, ...jilinPension({ ...W, payMonths: payM }) });
}
data.push({ payM: MAX_PAY, ...jilinPension({ ...W, payMonths: MAX_PAY }) });

let prev = null;
data.forEach(r => {
  const inc = prev ? r.total - prev.total : 0;
  console.log(
    F(r.totalY, 1).padStart(4) + ' | ' + F(r.actualY, 1).padStart(4) + ' | ' +
    (r.coef * 100).toFixed(1).padStart(5) + '% | ' +
    F(r.basic, 0).padStart(4) + ' | ' + F(r.trans, 0).padStart(4) + ' | ' +
    F(r.extra, 0).padStart(4) + ' | ' + F(r.personal, 0).padStart(4) + ' | ' +
    F(r.total, 0).padStart(6) + ' | ' + (prev ? F(inc, 0).padStart(6) : '     –'));
  prev = r;
});

// ═══ 第三部分：实缴 20 年的那一道门槛 ═════════════════════════
console.log('\n═══ 关键发现：实缴年限跨过 20 年那一瞬间（多缴 1 个月）═══');
const a = jilinPension({ ...W, payMonths: 240 });   // 实缴 20.00 年
const b = jilinPension({ ...W, payMonths: 241 });   // 实缴 20.083 年
console.log('                  实缴20.00年   实缴20.083年   差');
console.log('累计年限        ' + F(a.totalY, 2).padStart(10) + F(b.totalY, 2).padStart(14) + F(b.totalY - a.totalY, 2).padStart(8));
console.log('过渡性系数      ' + (a.coef * 100).toFixed(1).padStart(9) + '%' + (b.coef * 100).toFixed(1).padStart(13) + '%');
console.log('基础养老金      ' + F(a.basic).padStart(10) + F(b.basic).padStart(14) + F(b.basic - a.basic).padStart(8));
console.log('过渡性养老金    ' + F(a.trans).padStart(10) + F(b.trans).padStart(14) + F(b.trans - a.trans).padStart(8));
console.log('长缴增发        ' + F(a.extra).padStart(10) + F(b.extra).padStart(14) + F(b.extra - a.extra).padStart(8));
console.log('个人账户养老金  ' + F(a.personal).padStart(10) + F(b.personal).padStart(14) + F(b.personal - a.personal).padStart(8));
console.log('月合计          ' + F(a.total).padStart(10) + F(b.total).padStart(14) + F(b.total - a.total).padStart(8));
const jump = b.total - a.total;
console.log('⇒ 多缴这 1 个月，月领跳增 ' + F(jump) + ' 元；一年就是 ' + F(jump * 12) + ' 元');
console.log('  触发条件是【实际缴费年限 > 20】，8 年视同不作数 ⇒ 老陈要累计到 28.08 年才跨过这道关');

// ═══ 第四部分：缴满 15 年就停，到底损失多少 ═══════════════════
const r15 = data[0], rFull = data[data.length - 1];
console.log('\n═══ 缴满 15 年就停（2002 年停缴）vs 缴到退休 ═══');
console.log('                  15年就停      缴到退休        差');
console.log('累计缴费年限    ' + F(r15.totalY, 2).padStart(10) + F(rFull.totalY, 2).padStart(14) + F(rFull.totalY - r15.totalY, 2).padStart(8));
console.log('月领（元）      ' + F(r15.total).padStart(10) + F(rFull.total).padStart(14) + F(rFull.total - r15.total).padStart(8));
console.log('  其中基础      ' + F(r15.basic).padStart(10) + F(rFull.basic).padStart(14) + F(rFull.basic - r15.basic).padStart(8));
console.log('  其中过渡      ' + F(r15.trans).padStart(10) + F(rFull.trans).padStart(14) + F(rFull.trans - r15.trans).padStart(8));
console.log('  其中增发      ' + F(r15.extra).padStart(10) + F(rFull.extra).padStart(14) + F(rFull.extra - r15.extra).padStart(8));
console.log('  其中个账      ' + F(r15.personal).padStart(10) + F(rFull.personal).padStart(14) + F(rFull.personal - r15.personal).padStart(8));
console.log('⇒ 少缴 ' + F(rFull.totalY - r15.totalY, 2) + ' 年，月领只剩 ' + F(r15.total / rFull.total * 100, 1) + '%，每月少 ' +
  F(rFull.total - r15.total) + ' 元');

// 增量账：停缴省下的钱，多久被少领的养老金吃回去
const cost15 = r15.payAmount / 0.08 * 0.20;      // 灵活就业 20% 全自付（其中 8% 进个账）
const costFull = rFull.payAmount / 0.08 * 0.20;
const deltaCost = costFull - cost15;
const deltaMonthly = rFull.total - r15.total;
const payback = deltaCost / deltaMonthly;         // 月
const LIFE = 78.6;                                // 2024-09 人社部部长王晓萍人大发布会口径
const takeYears = LIFE - 60.25;
const gross = deltaMonthly * 12 * takeYears;
console.log('\n— 增量账：这道选择题到底值多少钱 —');
console.log('前 15 年实际掏         ' + F(cost15, 0).padStart(9) + ' 元（1995.07–2002.06，按当年社平 60% 的 20%）');
console.log('若一直缴到退休，累计掏 ' + F(costFull, 0).padStart(9) + ' 元');
console.log('多掏                   ' + F(deltaCost, 0).padStart(9) + ' 元，换来每月多领 ' + F(deltaMonthly) + ' 元');
console.log('扯平年限               ' + F(payback, 1).padStart(9) + ' 个月 = ' + F(payback / 12, 1) + ' 年 ⇒ 约 ' +
  F(60.25 + payback / 12, 1) + ' 岁之后全是净赚');
console.log('按人均预期寿命 ' + LIFE + ' 岁计，可领 ' + F(takeYears, 1) + ' 年：');
console.log('  多领合计 ' + F(gross, 0) + ' 元 − 多缴 ' + F(deltaCost, 0) + ' 元 = 净 ' + F(gross - deltaCost, 0) + ' 元');

// ═══ 第五部分：停缴后个人账户继续复利 ═════════════════════════
console.log('\n═══ 停缴 23 年，个人账户自己长了多少 ═══');
const atStop = r15.detail.find(d => d.y === 2002).end;
console.log('2002 年停缴时余额 ' + F(atStop, 0) + ' 元');
console.log('2025 年退休时余额 ' + F(r15.acc, 0) + ' 元');
console.log('停缴期间账户自行增值 ' + F(r15.acc - atStop, 0) + ' 元（+' + F((r15.acc / atStop - 1) * 100, 1) + '%）');
console.log('⇒ 断缴不清零、不销户：只是停止注入，已存进去的钱继续按当年记账利率复利');

// ═══ 第六部分：边际效率（多缴一年的钱，多久回本）═════════════
console.log('\n═══ 边际账：每多缴一年，多花多少钱、多领多少钱 ═══');
console.log('区间（累计年限）| 多缴(元) | 月领+(元) | 回本(月) | 每万元 Efficiency');
console.log('────────────────┼──────────┼───────────┼──────────┼─────────');
// 灵活就业 20% 全自付；8% 进个账 ⇒ 总缴费 = payAmount / 0.08 * 0.20
function stepSummary(fromIdx, toIdx) {
  const p = data[fromIdx], q = data[toIdx];
  const costDiff = (q.payAmount - p.payAmount) / 0.08 * 0.20;
  const gain = q.total - p.total;
  return { costDiff, gain, months: gain > 0 ? costDiff / gain : 0 };
}
[[0, 5], [5, 13], [13, 20], [20, 22], [22, data.length - 1]].forEach(([i, j]) => {
  const s = stepSummary(i, j);
  const label = F(data[i].totalY, 1) + '→' + F(data[j].totalY, 1) + '年';
  const eff = s.costDiff > 0 ? s.gain / s.costDiff * 10000 : 0;
  console.log(label.padEnd(15) + ' | ' + F(s.costDiff, 0).padStart(8) + ' | ' +
    F(s.gain, 0).padStart(9) + ' | ' + (s.months ? F(s.months, 0).padStart(8) : '      –') + ' | ' +
    F(eff, 1).padStart(7) + ' 元/月');
});
console.log('（每万元 efficiency = 每投入 1 万元带来的月领增量；回本 = 多缴的钱 ÷ 月领增量）');

// ═══ 第七部分：2030 起最低年限提到 20 年 ══════════════════════
console.log('\n═══ 2030-01-01 起，最低缴费年限 15 → 20 年（每年 +6 个月）═══');
console.log('政策：全国人大常委会《关于实施渐进式延迟法定退休年龄的决定》第二条');
console.log('退休年份 | 要求年限');
for (let yr = 2029; yr <= 2039; yr++) {
  const req = yr <= 2029 ? 15 : Math.min(15 + (yr - 2029) * 0.5, 20);
  console.log('   ' + yr + '   |  ' + F(req, 1) + ' 年' + (yr === 2039 ? '   ← 封顶' : ''));
}

// ═══ 第八部分：延迟退休的补偿 —— 计发月数变小 ═════════════════
console.log('\n═══ 一个容易被忽略的补偿：计发月数从 139 变成 137.3 ═══');
console.log('60 周岁计发月数 139；每延后一年递减约 7 个月（61 岁 132）');
console.log('60 岁 3 个月 ⇒ 137.3（线性插值），个人账户养老金被放大 ' +
  F((139 / 137.3 - 1) * 100, 2) + '%');

// ═══ 第九部分：按出生年月划线——你被要求缴多少年 ══════════════
console.log('\n═══ 2030 起提高最低年限：谁还能按 15 年，谁不能 ═══');
console.log('规则：要求年限按【法定退休年份】确定（决定原文每年 +6 个月，2039 年封顶 20 年）');

function minYearsOf(by, bm, gender) {
  const r = engine.calculate(getConfig('jilin'), {
    gender, genderType: gender, birthYear: by, birthMonth: bm,
    workYear: by + 22, workMonth: 7, avgIndex: IDX, cityType: CITY,
  }).legal;
  return { year: r.date.year, month: r.date.month, min: r.minYears };
}

// 自动定位临界：某身份下 minYears 首次跳到目标值的出生年月
function critical(gender, target) {
  for (let by = 1955; by <= 1995; by++) {
    for (let bm = 1; bm <= 12; bm++) {
      const i = minYearsOf(by, bm, gender);
      if (i.min >= target) {
        const pBy = bm === 1 ? by - 1 : by, pBm = bm === 1 ? 12 : bm - 1;
        return { by, bm, ...i, prev: { by: pBy, bm: pBm, ...minYearsOf(pBy, pBm, gender) } };
      }
    }
  }
  return null;
}

const LINES = [['male', '男职工（原60岁）'], ['fc', '女干部/灵活就业（原55岁）'], ['fw', '女工人（原50岁）']];
const crit = {};
LINES.forEach(([g, label]) => {
  const c155 = critical(g, 15.5), c20 = critical(g, 20);
  crit[g] = { c155, c20 };
  console.log('\n— ' + label + ' —');
  console.log('  最后一批能按 15 年：' + c155.prev.by + '-' + String(c155.prev.bm).padStart(2, '0') +
    ' 前出生（' + c155.prev.year + '-' + String(c155.prev.month).padStart(2, '0') + ' 退休）');
  console.log('  首批提高到 15.5 年：' + c155.by + '-' + String(c155.bm).padStart(2, '0') +
    ' 起（' + c155.year + '-' + String(c155.month).padStart(2, '0') + ' 退休）');
  console.log('  首批达到满 20 年 ：' + c20.by + '-' + String(c20.bm).padStart(2, '0') +
    ' 起（' + c20.year + '-' + String(c20.month).padStart(2, '0') + ' 退休）');
});

console.log('\n— 代表年份速查 —');
console.log('出生年月 | 身份 | 法定退休(年-月) | 要求年限');
[[1965, 9, 'male', '男'], [1968, 12, 'male', '男'], [1969, 1, 'male', '男'], [1970, 1, 'male', '男'],
[1975, 1, 'male', '男'], [1980, 1, 'male', '男'],
[1973, 12, 'fc', '女干部'], [1974, 1, 'fc', '女干部'], [1980, 1, 'fc', '女干部'],
[1978, 11, 'fw', '女工人'], [1980, 1, 'fw', '女工人'], [1985, 1, 'fw', '女工人']]
  .forEach(([by, bm, g, nm]) => {
    const i = minYearsOf(by, bm, g);
    console.log(by + '-' + String(bm).padStart(2, '0') + '  | ' + nm.padEnd(4) + ' | ' +
      (i.year + '-' + String(i.month).padStart(2, '0')).padStart(10) + '     |  ' + F(i.min, 1) + ' 年');
  });

// 断言：临界点必须稳定（可回归）
console.log('');
eq(minYearsOf(1965, 9, 'male').min, 15, 0, '1965-09 男要求 15 年');
eq(minYearsOf(1968, 12, 'male').min, 15, 0, '1968-12 男仍要求 15 年');
eq(minYearsOf(1969, 1, 'male').min, 15.5, 0, '1969-01 男起 15.5 年');
eq(minYearsOf(1980, 1, 'male').min, 20, 0, '1980-01 男起 20 年');
eq(minYearsOf(1973, 12, 'fc').min, 15, 0, '1973-12 女干部仍要求 15 年');
eq(minYearsOf(1974, 1, 'fc').min, 15.5, 0, '1974-01 女干部起 15.5 年');
eq(minYearsOf(1985, 1, 'fw').min, 20, 0, '1985-01 女工人起 20 年');

// ═══ 第十部分：正文回填校验 ══════════════════════════════════
const fs = require('fs');
const ART_PATH = 'C:/Users/14041/WorkBuddy/公众号内容库/09-测算案例与规划/_正文-缴满15年可以不缴了吗吉林这笔账里有一道20年的坎篇.md';
const ART = fs.existsSync(ART_PATH) ? fs.readFileSync(ART_PATH, 'utf8') : '';

if (!ART) {
  console.log('\n⚠️ 未找到正文文件，跳过回填校验：' + ART_PATH);
} else {
  console.log('\n═══ 正文回填校验 ═══');
  // 脚本算出的值 → 正文中必须出现（千分位格式）
  const num2str = (n, p) => Number(n).toLocaleString('en-US', { minimumFractionDigits: p, maximumFractionDigits: p });
  const CHECKS = [
    [r15.total, 2, '月领·15年就停'], [rFull.total, 2, '月领·缴到退休'],
    [rFull.total - r15.total, 2, '月领差额'],
    [r15.basic, 2, '基础·15年'], [rFull.basic, 2, '基础·缴满'],
    [r15.trans, 2, '过渡·15年'], [rFull.trans, 2, '过渡·缴满'],
    [rFull.extra, 2, '增发·缴满'], [r15.personal, 2, '个账月领·15年'], [rFull.personal, 2, '个账月领·缴满'],
    [jump, 2, '跨越20年那一步的跳增'], [jump * 12, 2, '跳增折年'],
    [a.total, 2, '跳变前月领'], [b.total, 2, '跳变后月领'],
    [b.trans - a.trans, 2, '过渡系数跳档带来的差额'],
    [b.extra - a.extra, 2, '长缴增发跳变额'],
    [atStop, 0, '停缴时个账余额'], [r15.acc, 0, '退休时个账余额'],
    [(r15.acc / atStop - 1) * 100, 1, '停缴期间个账增幅'],
    [cost15, 0, '前15年实际掏的钱'], [costFull, 0, '缴到退休累计掏的钱'],
    [deltaCost, 0, '多掏的钱'], [payback, 1, '扯平月数'],
    [payback / 12, 1, '扯平年数'], [gross, 0, '生命周期多领合计'],
    [gross - deltaCost, 0, '生命周期净收益'],
    [r15.total / rFull.total * 100, 1, '占缴满比例'],
  ];
  CHECKS.forEach(([v, p, label]) => {
    const s = num2str(v, p);
    const ok = ART.includes(s);
    ok ? pass++ : fail++;
    console.log((ok ? '  ✅ ' : '  ❌ ') + label + ' → 「' + s + '」');
  });

  // 静态事实字符串
  ['137.3', '139', '132', '1969-01', '1976-03', '1974-01', '1981-03', '1978-05', '1984-05',
    '人社部发〔2016〕132 号', '吉政发〔1995〕18 号', '吉政发〔1998〕28 号', '78.6', '369.17',
    '8.31', '7.12', '8.29', '7.61', '6.04', '6.69', '7,322', '7,978.25', '660.33', '1.24%']
    .forEach(s => {
      const ok = ART.includes(s);
      ok ? pass++ : fail++;
      console.log((ok ? '  ✅ ' : '  ❌ ') + '事实串「' + s + '」');
    });

  // 禁用词：不得指向未发表稿件
  console.log('  — 引用纪律（不得出现未发表稿件标记）—');
  ['户籍限制', '42,804', '42,804 元', '5.71', '两个杠杆', '第四套生命表', '看懂医保体系',
    '居民养老', '取脚第二段']
    .forEach(s => {
      const ok = !ART.includes(s);
      ok ? pass++ : fail++;
      console.log((ok ? '  ✅ ' : '  ❌ ') + '未引用「' + s + '」');
    });
}

console.log('\n═══ 结果：' + pass + ' 通过 / ' + fail + ' 失败 ═══');
process.exit(fail === 0 ? 0 : 1);
