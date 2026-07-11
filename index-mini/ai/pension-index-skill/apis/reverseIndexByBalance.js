// 原子接口：reverseIndexByBalance（倒推模式①）
// 输入：{ province, startYear, startMonth, totalMonths, knownBalance }
// 输出：原子接口标准结构 { isError, content, structuredContent, handoff }
// 已知账户余额 + 参保地 + 首缴年月 + 缴费月数 -> 反推平均缴费指数

const { inferIndexFromBalance, calculateIndex, spreadMonthsToYears, getSocialAvg } = require('../engine/calcIndex');
const { PROVINCES, GAP_ZERO_PROVINCES, resolveProvince, r4, makeErr } = require('./_shared');

async function reverseIndexByBalance({ province, startYear, startMonth, totalMonths, knownBalance }) {
  const slug = resolveProvince(province);
  if (!slug) return makeErr('未能识别参保地「' + province + '」，请使用如「吉林省」「浙江」等省份名称。', { province });

  startYear = Number(startYear); startMonth = Number(startMonth);
  totalMonths = Number(totalMonths); knownBalance = Number(knownBalance);
  if (!startYear || !startMonth || !totalMonths || totalMonths <= 0) {
    return makeErr('请填写完整的首缴年月（startYear/startMonth）与缴费月数（totalMonths）。');
  }
  if (!(knownBalance > 0)) return makeErr('账户余额必须大于 0。');

  const provinceConfig = PROVINCES[slug];
  const inf = inferIndexFromBalance({
    provinceConfig,
    contribution: { startYear, startMonth, totalMonths },
    granularity: 'C',
    knownBalance
  });
  if (inf.error) return makeErr(inf.error);

  // 用反推出的指数合成逐年，再跑一次正向得到完整 fwd（含逐年明细/余额）
  const idx = inf.inferredIndex;
  const span = spreadMonthsToYears({ startYear, startMonth, totalMonths });
  const synth = span.map(s => {
    const sa = getSocialAvg(provinceConfig.avg_salary_history, s.year);
    return { year: s.year, months: s.months, baseAvg: (sa && sa > 0) ? sa * idx : null };
  }).filter(r => r.baseAvg != null);

  const fwd = calculateIndex({
    provinceConfig,
    contribution: synth,
    granularity: 'A',
    gapYearCountsInAvg: GAP_ZERO_PROVINCES.has(slug)
  });
  if (fwd.error) return makeErr(fwd.error);

  fwd._meta = Object.assign({}, fwd._meta, {
    reverseMode: 'balance',
    inferredIndex: r4(idx),
    knownBalance: r4(knownBalance),
    converged: !!inf.converged
  });

  const text = '参保地：' + provinceConfig.name +
    '；反推平均缴费指数：' + fwd.avgIndex +
    '（基于账户余额 ¥' + Math.round(knownBalance).toLocaleString('zh-CN') + ' 反推）；' +
    '个人账户余额：约 ¥' + Math.round(fwd.accountBalance).toLocaleString('zh-CN') +
    '；累计缴费：' + fwd.totalMonths + ' 个月。';

  const payload = { result: { mode: 'forward', data: { forward: fwd } } };

  return {
    isError: false,
    content: [{ type: 'text', text }],
    structuredContent: {
      province: provinceConfig.name,
      avgIndex: fwd.avgIndex,
      accountBalance: fwd.accountBalance,
      reverseMode: 'balance',
      inferredIndex: fwd.avgIndex
    },
    handoff: () => ({ query: 'from=ai&province=' + slug, payload })
  };
}

module.exports = reverseIndexByBalance;
