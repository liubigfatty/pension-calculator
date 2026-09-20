/**
 * 审计：[0.6, 3.0] 封顶保底的适用范围
 *
 * 核心问题：引擎对每一年都 clamp(rawIdx, 0.6, 3.0)。
 * 但「缴费基数下限 = 社平 60%」这条规则是 2016 年底（人社部发〔2016〕132号）
 * 才被强制统一的；此前各省下限长期低于 60%，甚至低到 21%。
 * 若参保人当年合法按最低档缴费，其真实指数 <0.6，被引擎抬到 0.6 即高估。
 *
 * 数据源：各地官方公布的历年缴费基数上下限（公开文件/官网表）
 * 反推法：社平 = 缴费基数上限 ÷ 3（上限长期稳定为 300%）
 */
'use strict'

// 北京市基本养老保险历年缴费基数上下限（西城区政府官网公布，2026-08-31）
// [执行起始年, 下限(元/月), 上限(元/月), 备注]
const BJ = [
  [1992, 144, 480], [1993, 170, 567], [1994, 226, 1131], [1995, 327, 1635],
  [1996, 327, 1635], [1997, 407, 2036], [1998, 290, 2395], [1999, 310, 2755],
  [2000, 400, 3071], [2001, 412, 3444], [2002, 435, 3932], [2003, 465, 5182],
  [2004, 465, 6011], [2005, 545, 7087], [2006, 580, 8202], [2007, 1203, 9024, '下限1203(社平40%)，农村劳动力640'],
  [2008, 1329, 9966, '农村730'], [2009, 1490, 11178, '农村800'], [2010, 1615, 12111],
  [2011, 1680, 12603], [2012, 1869, 14016], [2013, 2089, 15669], [2014, 2317, 17379],
  [2015, 2585, 19389], [2016, 2834, 21258, '下限=社平40%（京社保发〔2017〕12号口径）'],
  [2017, 3082, 23118], [2018, 3387, 25401], [2019, 3613, 23565, '全口径切换，下限≈46%'],
  [2020, 3613, 26541], [2021, 5360, 28221], [2022, 5869, 31884], [2023, 6326, 33891],
  [2024, 6821, 35283], [2025, 7162, 35811], [2026, 7270, 36348]
]

function auditBeijing() {
  console.log('=== 北京：官方缴费基数下限 ÷ 社平（社平=上限÷3）===')
  console.log('年度   下限    上限     社平(反推)  下限比例   引擎clamp后   偏差')
  let rows = []
  for (const [y, lo, hi, note] of BJ) {
    const social = hi / 3
    const ratio = lo / social
    const engine = Math.max(0.6, ratio)
    const bias = engine - ratio
    rows.push({ y, lo, hi, social, ratio, engine, bias, note })
    console.log(
      String(y).padEnd(6) +
      String(lo).padStart(6) + String(hi).padStart(8) +
      social.toFixed(0).padStart(11) +
      (ratio * 100).toFixed(1).padStart(9) + '%' +
      engine.toFixed(2).padStart(11) +
      (bias > 0.0001 ? '  +' + bias.toFixed(3) : '    0.000')
    )
  }
  const lt = rows.filter(r => r.ratio < 0.599)
  console.log(`\n低于 0.6 的年份：${lt.length}/${rows.length}（${lt.map(r => r.y).join(', ')}）`)
  return rows
}

function auditSichuan() {
  // 四川：川人社发〔2013〕54号 2014-01-01 起下限 40%
  //       川办发〔2018〕59号 2018-2021 依次 45%/50%/55%/60%
  console.log('\n=== 四川：官方文件明确的缴费基数下限（2014-2021）===')
  const sc = { 2014: 0.40, 2015: 0.40, 2016: 0.40, 2017: 0.40, 2018: 0.45, 2019: 0.50, 2020: 0.55, 2021: 0.60 }
  for (const y of Object.keys(sc)) {
    console.log(`  ${y}  下限 ${(sc[y] * 100).toFixed(0)}%   引擎 clamp → 0.60   高估 ${(0.6 - sc[y]).toFixed(2)}`)
  }
  console.log('  依据：川人社发〔2013〕54号 / 川办发〔2018〕59号 / 人社部发〔2016〕132号')
}

function impactDemo(rows) {
  // 演示：某人 2000-2024 年每年都按当地最低档缴费，比较两种算法的平均指数
  console.log('\n=== 影响测算：某人 2000-2024 全程按最低档缴费（北京）===')
  const win = rows.filter(r => r.y >= 2000 && r.y <= 2024)
  const realSum = win.reduce((s, r) => s + r.ratio, 0)
  const engSum = win.reduce((s, r) => s + r.engine, 0)
  const realAvg = realSum / win.length
  const engAvg = engSum / win.length
  console.log(`  真实平均指数  = ${realAvg.toFixed(4)}（按官方下限实算）`)
  console.log(`  引擎平均指数  = ${engAvg.toFixed(4)}（逐年 clamp 到 0.6）`)
  console.log(`  指数高估      = ${(engAvg - realAvg).toFixed(4)}（${(((engAvg / realAvg) - 1) * 100).toFixed(1)}%）`)
  // 基础养老金 = 计发基数 × (1+指数) ÷ 2 × 年限 × 1%
  const base = 11937 // 北京 2024 计发基数（示意）
  const years = 25
  const pReal = base * (1 + realAvg) / 2 * years * 0.01
  const pEng = base * (1 + engAvg) / 2 * years * 0.01
  console.log(`  基础养老金  真实 ${pReal.toFixed(2)} 元/月  vs  引擎 ${pEng.toFixed(2)} 元/月  → 月高估 ${(pEng - pReal).toFixed(2)} 元`)
  console.log(`  说明：未含过渡性养老金与个人账户，实际总高估还会更大`)
}

const rows = auditBeijing()
auditSichuan()
impactDemo(rows)
