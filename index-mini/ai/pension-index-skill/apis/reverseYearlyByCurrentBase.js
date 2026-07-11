// 原子接口：reverseYearlyByCurrentBase（倒推模式②）
// 输入：{ province, startYear, startMonth, totalMonths, currentBase }
// 输出：原子接口标准结构 { isError, content, structuredContent, handoff }
// 已知当前月缴费基数 + 参保地 + 首缴年月 + 缴费月数 -> 反推历年基数 + 平均指数 + 账户余额

const { inferYearlyFromCurrentBase } = require('../engine/calcIndex');
const { PROVINCES, GAP_ZERO_PROVINCES, resolveProvince, makeErr } = require('./_shared');

async function reverseYearlyByCurrentBase({ province, startYear, startMonth, totalMonths, currentBase }) {
  const slug = resolveProvince(province);
  if (!slug) return makeErr('未能识别参保地「' + province + '」，请使用如「吉林省」「浙江」等省份名称。', { province });

  startYear = Number(startYear); startMonth = Number(startMonth);
  totalMonths = Number(totalMonths); currentBase = Number(currentBase);
  if (!startYear || !startMonth || !totalMonths || totalMonths <= 0) {
    return makeErr('请填写完整的首缴年月（startYear/startMonth）与缴费月数（totalMonths）。');
  }
  if (!(currentBase > 0)) return makeErr('当前月缴费基数必须大于 0。');

  const provinceConfig = PROVINCES[slug];
  const fwd = inferYearlyFromCurrentBase({
    provinceConfig,
    startYear, startMonth, totalMonths, currentBase,
    gapYearCountsInAvg: GAP_ZERO_PROVINCES.has(slug)
  });
  if (fwd.error) return makeErr(fwd.error);

  const text = '参保地：' + provinceConfig.name +
    '；基于当前月缴费基数 ¥' + currentBase + ' 反推：平均缴费指数 = ' + fwd.avgIndex +
    '，个人账户余额 = 约 ¥' + Math.round(fwd.accountBalance).toLocaleString('zh-CN') +
    '；累计缴费：' + fwd.totalMonths + ' 个月（当下指数 ' + fwd._meta.currentIndex + '）。';

  const payload = { result: { mode: 'forward', data: { forward: fwd } } };

  return {
    isError: false,
    content: [{ type: 'text', text }],
    structuredContent: {
      province: provinceConfig.name,
      avgIndex: fwd.avgIndex,
      accountBalance: fwd.accountBalance,
      reverseMode: 'currentBase',
      currentIndex: fwd._meta.currentIndex
    },
    handoff: () => ({ query: 'from=ai&province=' + slug, payload })
  };
}

module.exports = reverseYearlyByCurrentBase;
