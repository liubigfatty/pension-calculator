// 原子接口：calculatePension
// 输入：{ province, personType|gender+identity+femaleRetireType, birthDate, workStartDate, averageIndex, personalAccount, cityType, retirePlan }
// 输出：原子接口标准结构 { isError, content, structuredContent, handoff }
// handoff payload 携带与主程序 calc_result 完全一致的结构，接力到 /pages/result/result

const engine = require('../engine/pension-engine');
const { getConfig, SLUG2CN, resolveProvince, resolvePerson, parseYM, makeErr } = require('./_shared');

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

async function calculatePension(args) {
  args = args || {};
  const { province, birthDate, workStartDate, averageIndex, personalAccount, cityType, retirePlan } = args;

  // 1) 参保地
  const slug = resolveProvince(province);
  if (!slug) {
    return makeErr('未能识别参保地「' + province + '」，请使用如「吉林省」「浙江」等省份名称。', { structuredContent: { error: '未知省份', province } });
  }
  const config = getConfig(slug);
  if (!config) {
    return makeErr('未找到省份[' + slug + ']的养老金规则配置。');
  }

  // 2) 人员类型
  const person = resolvePerson(args);

  // 3) 出生 / 参加工作年月
  const b = parseYM(birthDate);
  if (!b) return makeErr('出生年月格式无法识别，请提供如「1975-02」或「1975年2月」。');
  const w = parseYM(workStartDate);
  if (!w) return makeErr('参加工作/首次参保年月格式无法识别，请提供如「1998-07」。');

  // 4) 平均缴费指数
  const avgIndex = parseFloat(averageIndex);
  if (!avgIndex || isNaN(avgIndex) || avgIndex <= 0) {
    return makeErr('缺少本人平均缴费工资指数（如 0.6、1.0、3.0）。');
  }

  // 5) 组装引擎输入（字段名与云函数 index.js buildInput 完全一致，驼峰）
  const input = {
    gender: person.gender,
    identity: person.identity,
    genderType: person.genderType,
    birthYear: b.year,
    birthMonth: b.month,
    workYear: w.year,
    workMonth: w.month,
    avgIndex: avgIndex,
    personalAccInput: parseFloat(personalAccount) || 0, // 0 → 引擎自动复利估算
    extras: {},
    cityType: cityType || 'prov'
  };

  let result;
  try {
    result = engine.calculate(config, input);
  } catch (e) {
    return makeErr('计算失败：' + (e && e.message ? e.message : '引擎异常'));
  }

  // 6) 剥离顶层函数（getAgeStr/getDateStr），得到 JSON 安全的 data
  const data = JSON.parse(JSON.stringify({
    legal: result.legal || {},
    flex: result.flex || {},
    comparison: result.comparison || {},
    metaData: result.metaData || {}
  }));

  // 7) 选择展示数据源（弹性提前 & flex 有值 → flex，否则 legal）
  const isEarly = String(retirePlan || '').toLowerCase() === 'early';
  const source = (isEarly && data.flex && data.flex.total) ? data.flex : data.legal;
  const provinceName = SLUG2CN[slug] || slug;

  let retireDateStr = '';
  if (source && source.date && source.date.year && source.date.month) {
    retireDateStr = source.date.year + '年' + source.date.month + '月';
  }
  const monthly = round2(source && source.total);

  const text = '参保地：' + provinceName +
    '；预计退休时间：' + (retireDateStr || '—') +
    (source && source.ageStr ? ('（' + source.ageStr + '）') : '') +
    '；每月养老金约 ¥' + monthly.toLocaleString('zh-CN') + '。' +
    '（平均缴费指数 ' + avgIndex + '，仅供参考，不作待遇核定依据）';

  // 8) 接力 payload：与主程序 calc_result 结构完全一致，result.js 可直接渲染
  const calcResult = {
    _raw: data,
    retirePlan: isEarly ? 'early' : 'normal',
    averageIndex: avgIndex,
    provinceName: provinceName,
    cityLabel: ''
  };

  return {
    isError: false,
    content: [{ type: 'text', text: text }],
    structuredContent: {
      province: provinceName,
      retireDate: retireDateStr,
      retireAge: (source && source.ageStr) || '',
      monthlyPension: monthly,
      averageIndex: avgIndex
    },
    // 账号卡片点击后接力到小程序结果页
    handoff: () => ({
      query: 'from=ai&province=' + slug,
      payload: { calcResult: calcResult }
    })
  };
}

module.exports = calculatePension;
