/**
 * 《看懂医保体系，算清能报多少，做好看病规划》数字验算
 * 数据源：国家医保局《2025年全国医疗保障事业发展统计公报》（2026-07-16）、相关国发/国办文件
 * 用法： node scripts/_verify_medcare_system.js
 */
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const failures = [];

function eq(actual, expected, tol, label) {
  const a = Number(actual), e = Number(expected);
  if (Math.abs(a - e) <= tol) { pass++; }
  else { fail++; failures.push(`${label}: 期望 ${e}, 实得 ${a}`); }
}
function ok(cond, label) {
  if (cond) pass++;
  else { fail++; failures.push(label); }
}

// ───────── 源数据（公报原文） ─────────
const B = {
  insuredWan: 133069.39, rate: 95,
  rev: 35921.32, exp: 30055.19,
  staffWan: 38856.12, staffUp: 907.78, poolOnlyWan: 2533.40,
  staffOnjobWan: 28062.32, staffRetWan: 10793.80,
  staffRev: 24683.60, staffExp: 19376.55,
  poolRev: 18292.91, poolExp: 13594.28,
  acctRev: 6390.69, acctExp: 5782.28,
  onjobCost: 8085.07, retCost: 10377.63,
  staffVisits: 54.86, staffDrugstore: 22.51, staffInp: 0.83,
  resWan: 94213.27, resDown: 500.46, resRev: 11237.72, resExp: 10678.63,
  resVisits: 32.68, resDrugstore: 0.50, resInp: 1.96,
  reliefTotal: 794.24, reliefSubsidize: 7666.47, reliefTimes: 19915.60,
  reliefInpAvg: 1273, reliefOutAvg: 86,
  ltcWan: 30854.76, ltcBenefitWan: 192.91, ltcRev: 369.62, ltcExp: 186.44,
  remoteVisits: 4.73, remoteCost: 8162.10,
  crossProv: 3.08, crossSaved: 2075.06, crossRate: 90,
  acctShare: 4.64, acctShareAmt: 688,
  outpatientVisits: 72.15, outpatientGrowth: 25.51,
  ruralRelief: 24629.3, ruralBurden: 1933.9,
  drugCount: 3253, drugWest: 1857, drugCn: 1396, drugNew: 114, drugNewCls1: 50,
  drugCum: 949, drugCumPay: 4600,
  staffInpRateProg: 84.1, resInpRateProg: 66.0,
  staffTertiary: 83.1, resTertiary: 61.7,
  staffAvgCost: 11522, staffTerCost: 13335,
  resAvgCost: 7339, resTerCost: 11278,
  // 机关事业（第四节的黑箱证据）
  govtWan: 6889.24,
  // 离休人员：景谷县 2025 年报告口径
  retireeCadreBudget: 90000,
  // 大病保险（2023 年全国口径）
  seriousIll2023Wan: 1156, seriousIllAvg: 8000,
};

const perCapita = (yi, wan) => (yi * 1e8) / (wan * 1e4);

console.log('═══ 派生数字验算 ═══');

// 人均基金支出
eq(perCapita(B.exp, B.insuredWan), 2258.6, 0.1, '全体人均基金支出');
eq(perCapita(B.staffExp, B.staffWan), 4986.74, 0.01, '职工人均基金支出');
eq(perCapita(B.resExp, B.resWan), 1133.45, 0.01, '居民人均基金支出');
eq(perCapita(B.staffExp, B.staffWan) / perCapita(B.resExp, B.resWan), 4.40, 0.005, '职工÷居民 支出倍数');
eq(perCapita(B.staffRev, B.staffWan), 6352.56, 0.01, '职工人均筹资');
eq(perCapita(B.resRev, B.resWan), 1192.80, 0.01, '居民人均筹资');
eq(perCapita(B.staffRev, B.staffWan) / perCapita(B.resRev, B.resWan), 5.33, 0.005, '职工÷居民 筹资倍数');

// 支付比例差
eq(B.staffInpRateProg - B.resInpRateProg, 18.1, 0.001, '住院目录内比例差（均值）');
eq(B.staffTertiary - B.resTertiary, 21.4, 0.001, '三级医院比例差');

// 退休 vs 在职
eq(perCapita(B.retCost, B.staffRetWan), 9614.44, 0.01, '退休人均医疗费用');
eq(perCapita(B.onjobCost, B.staffOnjobWan), 2881.11, 0.01, '在职人均医疗费用');
eq(perCapita(B.retCost, B.staffRetWan) / perCapita(B.onjobCost, B.staffOnjobWan), 3.34, 0.005, '退休÷在职 倍数');
eq(B.staffOnjobWan / B.staffRetWan, 2.60, 0.005, '职退比');
ok(B.retCost > B.onjobCost, '退休总费用高于在职（人少2.6倍却多花）');
eq(((B.retCost - B.onjobCost) / B.onjobCost) * 100, 28.3, 0.3, '退休比在职多花的百分比');
eq(perCapita(B.retCost, B.staffRetWan) / perCapita(B.resRev, B.resWan), 8.06, 0.005, '退休人均费÷居民人均筹资');

// 住院率与频次
eq((B.staffInp * 1e8) / (B.staffWan * 1e4) * 100, 21.36, 0.01, '职工住院率');
eq((B.resInp * 1e8) / (B.resWan * 1e4) * 100, 20.80, 0.01, '居民住院率');
eq((B.staffVisits * 1e8) / (B.staffWan * 1e4), 14.1, 0.05, '职工人均待遇次数');
eq((B.resVisits * 1e8) / (B.resWan * 1e4), 3.5, 0.05, '居民人均待遇次数');
eq((B.staffDrugstore / B.staffVisits) * 100, 41.0, 0.05, '职工药店购药占比');
eq((B.resDrugstore / B.resVisits) * 100, 1.5, 0.05, '居民药店购药占比');
ok(Math.abs((B.staffInp*1e8)/(B.staffWan*1e4)*100 - (B.resInp*1e8)/(B.resWan*1e4)*100) < 1, '两个池子住院率几乎一样');

// 第四节：并轨 + 黑箱
eq(B.retireeCadreBudget / perCapita(B.retCost, B.staffRetWan), 9.36, 0.01, '离休人均预算÷职工退休人均医疗费');
eq((B.ltcBenefitWan / B.ltcWan) * 100, 0.625, 0.001, '长护险待遇享受比例');

// 异地
eq(perCapita(B.remoteCost, B.remoteVisits * 1e4), 1725.60, 0.1, '异地就医人均费用');
eq(perCapita(B.crossSaved, B.crossProv * 1e4), 673.72, 0.1, '跨省结算人均减少垫付');

// 目录
eq(B.drugWest + B.drugCn, B.drugCount, 0, '目录品种数＝西药＋中成药');

// 第八节新增：单建统筹占比（唯一的"档"=设不设个人账户，不影响报销比例）
eq((B.poolOnlyWan / B.staffWan) * 100, 6.52, 0.01, '单建统筹占职工参保比 = 6.52%');

// ───────── 正文回填校验 ─────────
const articlePath = path.join(
  'C:/Users/14041/WorkBuddy/公众号内容库/08-总论与机关事业/_正文-看懂医保体系篇.md'
);
console.log('\n═══ 正文回填校验 ═══');
let article = '';
try {
  article = fs.readFileSync(articlePath, 'utf-8');
} catch (e) {
  console.log('  ⚠ 读不到正文，跳过回填校验：' + e.message);
}

if (article) {
  const mustContain = [
    '133069.39', '95%', '35921.32', '30055.19', '2258.6',
    '794.24', '7666.47', '19915.60', '1273 元', '86 元',
    '38856.12', '94213.27', '4986.74', '1133.45', '4.4 倍', '6352.56', '1192.80', '5.33 倍',
    '84.1%', '66.0%', '83.1%', '61.7%', '21.4 个百分点',
    '907.78', '500.46',
    '1998', '40 多年', '至少 24 个', '22 万人', '2.8 万',
    '2101103', '6889.24', '9 万元', '9.36 倍',
    '财社〔2002〕18 号', '4%', '5%', '国发〔2015〕2 号', '覆盖 100%',
    '21.36%', '20.80%', '14.1 次', '3.5 次', '41.0%', '22.51 亿人次',
    '11522 元', '7339 元', '13335 元', '11278 元',
    '8085.07', '10377.63', '9614.44', '2881.11', '3.34 倍', '2.6',
    '8.06 个',
    '3253 种', '1857 种', '1396 种', '114 种', '50 种', '949 种',
    '1725.60 元', '673.72 元', '4.73 亿人次', '8162.10 亿元', '3.08 亿人次', '2075.06 亿元',
    '30854.76 万人', '192.91 万人', '330 万', '1.2 万元', '0.625%',
    '15 个', '92 个',
    '688 亿元', '4.64 亿人次', '3 亿元', '72.15 亿人次', '25.51%',
    '1156 万人', '8000 元', '50%', '60%', '6 倍左右',
    '1933.9 亿元', '2.46 亿人次', '8000 万', '99%',
    '固原', '28.2 万', '14.3 万', '7.9 万', '3.2 万', '25.4 万', '90.1%',
    '国办发〔2021〕14 号', '2%', '50% 起步',
    '国办发〔2024〕38 号', '3 个月', '不少于 6 个月',
    '2011 年 7 月',
    '2533.40 万人', '6.52%', '淮南市医保局',
  ];
  const missing = mustContain.filter(s => !article.includes(s));
  ok(missing.length === 0, `正文缺失数字片段: ${missing.join(' | ')}`);
  console.log(`  回填检查 ${mustContain.length} 项，缺失 ${missing.length} 项`);

  // 引用纪律：不得出现未发表稿件的标题/特征串
  const banned = [
    '户籍限制', '7月1日没取消', '42,804', '4万3',
    '两个杠杆', '5.71', '第四套生命表', '计发月数',
    '泰安', '保底 1.4',
  ];
  const hit = banned.filter(s => article.includes(s));
  ok(hit.length === 0, `正文出现禁用串（未发表稿件/其他稿件特征）: ${hit.join(' | ')}`);
  console.log(`  禁用词检查 ${banned.length} 项，命中 ${hit.length} 项`);

  // 固原案例算术自洽
  eq(14.3 + 7.9 + 3.2, 25.4, 0.001, '固原三重合计');
  eq((25.4 / 28.2) * 100, 90.07, 0.05, '固原政策范围内报销比例');
}

console.log('\n═══ 结果 ═══');
console.log(`${pass} 通过 / ${fail} 失败`);
if (failures.length) failures.forEach(f => console.log('  ✗ ' + f));
process.exit(fail === 0 ? 0 : 1);
