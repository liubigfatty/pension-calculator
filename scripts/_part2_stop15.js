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

console.log('\n═══ 结果：' + pass + ' 通过 / ' + fail + ' 失败 ═══');
process.exit(fail === 0 ? 0 : 1);
