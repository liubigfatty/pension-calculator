// 原子接口：reverseYearlyByTargetIndex（倒推模式③）
// 输入：{ province, startYear, startMonth, totalMonths, targetIndex }
// 输出：原子接口标准结构 { isError, content, structuredContent, handoff }
// 已知目标平均指数 + 参保地 + 首缴年月 + 缴费月数 -> 反推历年应缴基数

const { inferYearlyFromTargetIndex } = require('../engine/calcIndex');
const { PROVINCES, GAP_ZERO_PROVINCES, resolveProvince, makeErr } = require('./_shared');

async function reverseYearlyByTargetIndex({ province, startYear, startMonth, totalMonths, targetIndex }) {
  const slug = resolveProvince(province);
  if (!slug) return makeErr('未能识别参保地「' + province + '」，请使用如「吉林省」「浙江」等省份名称。', { province });

  startYear = Number(startYear); startMonth = Number(startMonth);
  totalMonths = Number(totalMonths); targetIndex = Number(targetIndex);
  if (!startYear || !startMonth || !totalMonths || totalMonths <= 0) {
    return makeErr('请填写完整的首缴年月（startYear/startMonth）与缴费月数（totalMonths）。');
  }
  if (!(targetIndex > 0)) return makeErr('目标平均指数必须大于 0。');

  const provinceConfig = PROVINCES[slug];
  const fwd = inferYearlyFromTargetIndex({
    provinceConfig,
    startYear, startMonth, totalMonths, targetIndex,
    gapYearCountsInAvg: GAP_ZERO_PROVINCES.has(slug)
  });
  if (fwd.error) return makeErr(fwd.error);

  const text = '参保地：' + provinceConfig.name +
    '；按目标平均指数 ' + targetIndex + ' 反推：每年应缴基数 = 当年社平 × ' + targetIndex +
    '，平均指数 = ' + fwd.avgIndex +
    '，个人账户余额 = 约 ¥' + Math.round(fwd.accountBalance).toLocaleString('zh-CN') +
    '；累计缴费：' + fwd.totalMonths + ' 个月。';

  const payload = { result: { mode: 'forward', data: { forward: fwd } } };

  return {
    isError: false,
    content: [{ type: 'text', text }],
    structuredContent: {
      province: provinceConfig.name,
      avgIndex: fwd.avgIndex,
      accountBalance: fwd.accountBalance,
      reverseMode: 'targetIndex',
      targetIndex: fwd._meta.targetIndex
    },
    handoff: () => ({ query: 'from=ai&province=' + slug, payload })
  };
}

module.exports = reverseYearlyByTargetIndex;
