// 原子接口：calculatePensionIndex
// 输入：{ province, yearlyData:[{year, months, baseAvg}] }
// 输出：原子接口标准结构 { isError, content, structuredContent }

const { calculateIndex } = require('../engine/calcIndex');
const PROVINCES = require('../engine/provinces-data');

// 断缴年份计入平均指数分母（指数记 0）的省份：北京/天津/陕西/浙江/云南
const GAP_ZERO_PROVINCES = new Set(['beijing', 'tianjin', 'shaanxi', 'zhejiang', 'yunnan']);

// 中文省名 -> slug（含直辖市/自治区全称）
const CN2SLUG = {
  '北京市': 'beijing', '天津市': 'tianjin', '河北省': 'hebei', '山西省': 'shanxi',
  '内蒙古自治区': 'neimenggu', '辽宁省': 'liaoning', '吉林省': 'jilin', '黑龙江省': 'heilongjiang',
  '上海市': 'shanghai', '江苏省': 'jiangsu', '浙江省': 'zhejiang', '安徽省': 'anhui',
  '福建省': 'fujian', '江西省': 'jiangxi', '山东省': 'shandong', '河南省': 'henan',
  '湖北省': 'hubei', '湖南省': 'hunan', '广东省': 'guangdong', '广西壮族自治区': 'guangxi',
  '海南省': 'hainan', '重庆市': 'chongqing', '四川省': 'sichuan', '贵州省': 'guizhou',
  '云南省': 'yunnan', '西藏自治区': 'xizang', '陕西省': 'shaanxi', '甘肃省': 'gansu',
  '青海省': 'qinghai', '宁夏回族自治区': 'ningxia', '新疆维吾尔自治区': 'xinjiang'
};

const STRIP = /(省|市|自治区|维吾尔|壮族|回族|特别行政区)/g;

function resolveProvince(province) {
  if (!province) return null;
  const p = String(province).trim();
  if (PROVINCES[p]) return p;                 // 直接 slug
  const norm = p.replace(STRIP, '');
  if (PROVINCES[norm]) return norm;          // 去后缀后匹配 slug
  if (CN2SLUG[p]) return CN2SLUG[p];          // 中文全称
  for (const cn of Object.keys(CN2SLUG)) {
    if (cn.replace(STRIP, '') === norm) return CN2SLUG[cn]; // 中文去后缀匹配
  }
  return null;
}

async function calculatePensionIndex({ province, yearlyData }) {
  const slug = resolveProvince(province);
  if (!slug) {
    return {
      isError: true,
      content: [{ type: 'text', text: '未能识别参保地「' + province + '」，请使用如「吉林省」「浙江」等省份名称。' }],
      structuredContent: { error: '未知省份', province }
    };
  }
  if (!Array.isArray(yearlyData) || yearlyData.length === 0) {
    return {
      isError: true,
      content: [{ type: 'text', text: '缺少逐年缴费明细。请提供每一年（或每年区间）的月均缴费基数。' }],
      structuredContent: { error: '缺少逐年明细' }
    };
  }

  const provinceConfig = PROVINCES[slug];
  const fwd = calculateIndex({
    provinceConfig,
    contribution: yearlyData,
    granularity: 'A',
    gapYearCountsInAvg: GAP_ZERO_PROVINCES.has(slug)
  });

  if (fwd.error) {
    return { isError: true, content: [{ type: 'text', text: fwd.error }], structuredContent: { error: fwd.error } };
  }

  const text = '参保地：' + provinceConfig.name +
    '；平均缴费工资指数：' + fwd.avgIndex +
    '；个人账户余额：约 ¥' + Math.round(fwd.accountBalance).toLocaleString('zh-CN') +
    '；累计缴费：' + fwd.totalMonths + ' 个月（' + fwd.totalYears + ' 年）。';

  return {
    isError: false,
    content: [{ type: 'text', text }],
    structuredContent: {
      province: provinceConfig.name,
      avgIndex: fwd.avgIndex,
      accountBalance: fwd.accountBalance,
      totalMonths: fwd.totalMonths,
      totalYears: fwd.totalYears,
      gapYears: fwd._meta.gapYears
    }
  };
}

module.exports = calculatePensionIndex;
