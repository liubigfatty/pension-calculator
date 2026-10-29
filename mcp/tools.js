'use strict'

// 工具定义与执行
// 铁律（与小程序、知识库一致）：
//   ① 只出「基础测算」这一档 —— 小程序本来就免费的部分；分档对比 / 回本测算 / 敏感性分析一律不在此开放
//   ② 结果必须带免责声明 + 规则出处
//   ③ 缺参数必须逐个点名回问，绝不猜、绝不填默认值凑数
//   ④ 输出采用「事实 + 动作」两段式：先说发生了什么，再说下一步做什么

const engine = require('../cloudfunctions/calculate/pension-engine.js')
const A = require('./alias.js')

const DISCLAIMER = '本结果为按现行规则的参数化估算，最终以社保经办机构核定为准。'
const CTA = '要看分档对比、回本测算等完整版，请用微信小程序「正元养老金计算引擎」。'

function money (n) {
  if (n == null || isNaN(n)) return null
  return Math.round(n * 100) / 100
}

function fmt (n) {
  const v = money(n)
  if (v == null) return '—'
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function ym (d) {
  if (!d) return '—'
  return d.year + '年' + String(d.month).padStart(2, '0') + '月'
}

// ─────────────────────────────────────────────────────────────
// 工具 1：完整测算
// ─────────────────────────────────────────────────────────────
const CALC = {
  name: 'pension_calculate',
  description:
    '测算中国企业职工基本养老金的月领取额。当用户问「我退休能拿多少」「养老金能领多少钱」「退休金大概多少」时使用。' +
    '必填参数：province（省份）、gender_type（性别身份）、birth_date（出生年月）、work_start_date（参加工作时间）、average_index（平均缴费指数）。' +
    '平均缴费指数不会算就用 1.0（按社平工资缴纳），或按缴费档位填：60档填0.6、100档填1.0、300档填3.0。' +
    'personal_account（个人账户余额）可省略，省略时引擎按历年记账利率自动复利估算。' +
    'retire_date / retire_age 也可省略，仅在用户明确说出退休时间或年龄时填写（如提前退休、特殊工种）。' +
    '返回：法定退休时间、月养老金金额及四项构成拆解。结果为估算值，须提示以社保经办核定为准。',
  inputSchema: {
    type: 'object',
    properties: {
      province: {
        type: 'string',
        description: '参保省份，中文或拼音均可，如「吉林」「jilin」「广东」。'
      },
      city: {
        type: 'string',
        description: '城市，可省略。省略时按全省平均计发基数计算。如「长春」「沈阳」。只有少数省份分城市口径。'
      },
      gender_type: {
        type: 'string',
        description: '性别与身份：填「男」（60岁档）、「女干部」（55岁档，含管理岗/技术岗）、「女工人」（50岁档）。也接受 male / fc / fw50。'
      },
      birth_date: {
        type: 'string',
        description: '出生年月，格式 YYYY-MM，如「1976-02」。也接受 1976年2月、197602。'
      },
      work_start_date: {
        type: 'string',
        description: '参加工作时间（或开始缴费时间），格式 YYYY-MM，如「1996-01」。'
      },
      average_index: {
        type: 'number',
        description: '本人平均缴费指数，通常在 0.4 到 3.0 之间。按社平工资缴填 1.0；按最低档（60%）缴填 0.6。这是年限加权平均值，不是某一年的档位。'
      },
      personal_account: {
        type: 'number',
        description: '个人账户累计储存额（元），可省略。省略时引擎按历年记账利率自动估算。'
      },
      retire_date: {
        type: 'string',
        description:
          '预计退休年月（YYYY-MM），【仅在用户明确说出退休时间时才填】。' +
          '适用场景：提前退休、特殊工种提前退、或用户说「我明年退」「我 2026 年 6 月退」。' +
          '不填则按法定退休年龄（含延迟退休）自动推算。'
      },
      retire_age: {
        type: 'number',
        description:
          '预计退休年龄（岁），【仅在用户明确说出退休年龄时才填】，如特殊工种 55 岁退填 55。' +
          '与 retire_date 二选一；同时给出时以 retire_date 为准。不填则按法定退休年龄推算。'
      }
    },
    required: ['province', 'gender_type', 'birth_date', 'work_start_date', 'average_index']
  },
  async run (args) {
    const a = args || {}

    // 缺参数必须逐个点名回问，绝不猜、绝不填默认值凑数（与小程序 missing 点名机制一致）
    const missing = []
    if (a.province == null || a.province === '') missing.push('province（参保省份）')
    if (a.gender_type == null || a.gender_type === '') missing.push('gender_type（男 / 女干部 / 女工人）')
    if (a.birth_date == null || a.birth_date === '') missing.push('birth_date（出生年月，如 1976-02）')
    if (a.work_start_date == null || a.work_start_date === '') missing.push('work_start_date（参加工作时间，如 1996-01）')
    if (a.average_index == null || a.average_index === '') missing.push('average_index（平均缴费指数，按社平缴填 1.0）')
    if (missing.length) {
      return { isError: true, text: '还缺参数，请向用户问清后再调用，不要猜测：\n' + missing.map((m) => '  · ' + m).join('\n') }
    }

    const provinceKey = A.resolveProvince(a.province)
    if (!provinceKey) {
      return { isError: true, text: '未识别的参保省份：' + (a.province || '(空)') + '\n请换成省份名称，如「吉林」「广东」；或用 pension_regions 工具查看支持哪些地区。' }
    }
    const genderType = A.resolveGenderType(a.gender_type)
    if (!genderType) {
      return { isError: true, text: '未识别的性别身份：' + (a.gender_type || '(空)') + '\n请填「男」「女干部」或「女工人」。' }
    }
    const birth = A.parseMonth(a.birth_date, 'birth')
    if (!birth) return { isError: true, text: '出生年月格式无法解析：' + (a.birth_date || '(空)') + '\n请用 YYYY-MM，如「1976-02」。' }
    const work = A.parseMonth(a.work_start_date, 'work')
    if (!work) return { isError: true, text: '参加工作时间格式无法解析：' + (a.work_start_date || '(空)') + '\n请用 YYYY-MM，如「1996-01」。' }

    const idx = parseFloat(a.average_index)
    if (isNaN(idx) || idx <= 0 || idx > 3.5) {
      return { isError: true, text: '平均缴费指数异常：' + (a.average_index || '(空)') + '\n一般在 0.4～3.0 之间，按社平工资缴填 1.0。' }
    }

    const config = A.getConfig(provinceKey)
    const cityType = A.resolveCity(provinceKey, a.city)

    // 用户明确说出退休时间/年龄时才传，否则让引擎按法定年龄（含延迟退休）推算
    let specifiedRetire = null
    // ⚠️ 必须传 'retire'：退休年是未来时，用默认(1930-2015)的出生范围会把 2026 判为非法
    const rd = a.retire_date ? A.parseMonth(a.retire_date, 'retire') : null
    if (a.retire_date && !rd) {
      return { isError: true, text: '退休年月格式无法解析：' + a.retire_date + '\n请用 YYYY-MM，如「2026-06」。' }
    }
    const ra = parseFloat(a.retire_age)
    if (rd) specifiedRetire = { year: rd.year, month: rd.month, label: '按用户指定的退休年月 ' + rd.year + '-' + String(rd.month).padStart(2, '0') }
    else if (!isNaN(ra) && ra >= 40 && ra <= 75) specifiedRetire = { age: ra, label: '按用户指定的退休年龄 ' + ra + ' 岁' }

    const input = {
      gender: A.genderOf(genderType),
      genderType,
      birthYear: birth.year,
      birthMonth: birth.month,
      workYear: work.year,
      workMonth: work.month,
      avgIndex: idx,
      personalAccInput: parseFloat(a.personal_account) || 0,
      cityType
    }
    if (specifiedRetire && specifiedRetire.year) input.retireDateInput = { year: specifiedRetire.year, month: specifiedRetire.month }
    else if (specifiedRetire && specifiedRetire.age) input.retireAgeInput = specifiedRetire.age

    let r
    try {
      r = engine.calculate(config, input)
    } catch (e) {
      return { isError: true, text: '计算失败：' + e.message }
    }

    const legal = r.legal || {}
    const total = money(legal.total)

    const lines = []
    lines.push('【事实】')
    lines.push('参保地区：' + (config.name || provinceKey) + (cityType !== 'prov' ? ' / ' + cityType : '（全省平均口径）'))
    // 用户指定了退休时间/年龄时，不能再播报「较原法定年龄延迟 X 个月」——那套说法只对法定推算成立
    if (specifiedRetire) {
      lines.push('退休时间：' + ym(legal.date) + '（' + (legal.ageStr || '—') + '，' + specifiedRetire.label + '，非法定年龄推算）')
    } else {
      lines.push('法定退休：' + ym(legal.date) + '（' + (legal.ageStr || '—') + '，较原法定年龄延迟 ' + A.getDelayMonthsSafe(birth.year, birth.month, genderType, config) + ' 个月）')
    }
    lines.push('最早可提前退休：' + ym(r.flex && r.flex.date) + '（弹性提前，需本人申请）')
    lines.push('月养老金（估算）：' + fmt(total) + ' 元')
    lines.push('  基础养老金 ' + fmt(legal.basicPension && legal.basicPension.amount) + ' 元')
    lines.push('  个人账户养老金 ' + fmt(legal.personalAccount && legal.personalAccount.amount) + ' 元')
    lines.push('  过渡性养老金 ' + fmt(legal.transitionalPension && legal.transitionalPension.amount) + ' 元')
    if (legal.extraPension && money(legal.extraPension.amount)) {
      lines.push('  加发项 ' + fmt(legal.extraPension.amount) + ' 元')
    }
    lines.push('缴费年限：累计 ' + (money(legal.totalYears) || '—') + ' 年（视同 ' + (money(legal.sightYears) || 0) + ' 年，实际 ' + (money(legal.actualYears) || '—') + ' 年）')
    lines.push('个人账户余额（估算）：' + fmt(legal.personalAccount && legal.personalAccount.balance) + ' 元')
    if (legal.baseRetire) lines.push('计发基数：' + fmt(legal.baseRetire) + ' 元/月' + (legal.baseProv && money(legal.baseProv) !== money(legal.baseRetire) ? '（全省 ' + fmt(legal.baseProv) + '）' : ''))

    lines.push('')
    lines.push('【动作】')
    lines.push('这是按「平均缴费指数 ' + idx + '」测算的单点结果。' + CTA)
    lines.push('')
    lines.push('【适用边界】本结果按正常到龄退休推算，未包含：断缴、补缴、跨省转移、' +
      '视同缴费年限的档案认定差异、以及特殊工种/病退等提前退休情形（除非已指定退休时间）。' +
      '这些情形对结果影响可达数成，若有其一请说明，或直接以社保经办核定为准。')
    lines.push('')
    lines.push('【免责】' + DISCLAIMER)
    lines.push('规则依据：参保地现行企业职工基本养老保险计发办法；延迟退休依据全国人大常委会决定（2024-09-13）及国务院实施办法。')

    return { text: lines.join('\n'), data: { total, legal, flex: r.flex } }
  }
}

// getDelayMonths 在不同省份配置下可能抛错，包一层保证工具不炸
A.getDelayMonthsSafe = function (y, m, type, config) {
  try {
    const v = engine.getDelayMonths(y, m, type, config)
    return v == null ? 0 : v
  } catch (e) {
    return 0
  }
}

// ─────────────────────────────────────────────────────────────
// 工具 2：退休时间查询（不算钱，只算时间）
// ─────────────────────────────────────────────────────────────
const RETIRE = {
  name: 'pension_retire_date',
  description:
    '查询法定退休时间、延迟退休月数、以及最早可弹性提前退休的时间。当用户问「我什么时候能退休」「延迟退休后我要多干几个月」「我几岁能退」时使用。' +
    '只算时间不算钱，比 pension_calculate 更轻，不需要缴费指数等参数。' +
    '必填：province、gender_type、birth_date。',
  inputSchema: {
    type: 'object',
    properties: {
      province: { type: 'string', description: '参保省份，中文或拼音，如「吉林」' },
      gender_type: { type: 'string', description: '「男」/「女干部」/「女工人」' },
      birth_date: { type: 'string', description: '出生年月，格式 YYYY-MM，如「1976-02」' }
    },
    required: ['province', 'gender_type', 'birth_date']
  },
  async run (args) {
    const a = args || {}
    const missing = []
    if (a.province == null || a.province === '') missing.push('province（参保省份）')
    if (a.gender_type == null || a.gender_type === '') missing.push('gender_type（男 / 女干部 / 女工人）')
    if (a.birth_date == null || a.birth_date === '') missing.push('birth_date（出生年月，如 1976-02）')
    if (missing.length) {
      return { isError: true, text: '还缺参数，请向用户问清后再调用，不要猜测：\n' + missing.map((m) => '  · ' + m).join('\n') }
    }
    const provinceKey = A.resolveProvince(a.province)
    if (!provinceKey) return { isError: true, text: '未识别的参保省份：' + (a.province || '(空)') }
    const genderType = A.resolveGenderType(a.gender_type)
    if (!genderType) return { isError: true, text: '未识别的性别身份：' + (a.gender_type || '(空)') + '（填「男」「女干部」「女工人」）' }
    const birth = A.parseMonth(a.birth_date, 'birth')
    if (!birth) return { isError: true, text: '出生年月格式无法解析：' + (a.birth_date || '(空)') + '（用 YYYY-MM）' }

    const config = A.getConfig(provinceKey)
    const base = { male: 60, fc: 55, fw50: 50 }[genderType] || 60
    const delay = A.getDelayMonthsSafe(birth.year, birth.month, genderType, config)

    const totalMonths = base * 12 + delay
    const ry = birth.year + Math.floor((birth.month - 1 + totalMonths) / 12)
    const rm = ((birth.month - 1 + totalMonths) % 12) + 1
    const years = Math.floor(totalMonths / 12)
    const months = totalMonths % 12
    const flexMonths = Math.max(base * 12, totalMonths - 36)
    const fy = birth.year + Math.floor((birth.month - 1 + flexMonths) / 12)
    const fm = ((birth.month - 1 + flexMonths) % 12) + 1

    const lines = []
    lines.push('【事实】')
    lines.push('出生：' + birth.year + '年' + String(birth.month).padStart(2, '0') + '月（' + (config.name || provinceKey) + '）')
    lines.push('原法定退休年龄：' + base + ' 岁')
    lines.push('延迟退休月数：' + delay + ' 个月')
    lines.push('法定退休时间：' + ry + '年' + String(rm).padStart(2, '0') + '月（' + years + '岁' + (months ? months + '个月' : '整') + '）')
    lines.push('最早可提前退休：' + fy + '年' + String(fm).padStart(2, '0') + '月（弹性提前，最长提前 3 年，需本人申请）')
    lines.push('')
    lines.push('【动作】')
    lines.push('延迟退休月数按出生年月逐月递进计算得出；提前退休须满足当年最低缴费年限。' + CTA)
    lines.push('')
    lines.push('【免责】' + DISCLAIMER)
    return { text: lines.join('\n'), data: { delay, retire: { year: ry, month: rm }, flex: { year: fy, month: fm } } }
  }
}

// ─────────────────────────────────────────────────────────────
// 工具 3：支持地区查询（消歧用）
// ─────────────────────────────────────────────────────────────
const REGIONS = {
  name: 'pension_regions',
  description:
    '查询本工具支持哪些参保地区，以及某个省份是否分城市计发基数。当用户说的地区无法识别、或你想确认该省是按全省还是分城市计算时调用。' +
    '传 province 查单个省的城市口径；不传则返回全部 31 个支持地区。',
  inputSchema: {
    type: 'object',
    properties: {
      province: { type: 'string', description: '可选。省份名，如「吉林」。不传则返回全部支持地区。' }
    },
    required: []
  },
  async run (args) {
    const a = args || {}
    if (!a.province) {
      const names = A.KEYS.map((k) => {
        const c = A.getConfig(k)
        return c && (c.name || k)
      }).filter(Boolean)
      return { text: '【事实】当前支持 ' + A.KEYS.length + ' 个参保地区：\n' + names.join('、') + '\n\n【动作】调用 pension_calculate 时直接用省份名即可，如「吉林」。' }
    }
    const key = A.resolveProvince(a.province)
    if (!key) return { isError: true, text: '未识别的省份：' + a.province }
    const cfg = A.getConfig(key)
    const cities = A.listCities(key)
    const lines = []
    lines.push('【事实】')
    lines.push('地区：' + (cfg.name || key) + '（key: ' + key + '）')
    if (!cities.length) {
      lines.push('计发基数口径：全省统一，无城市细分。')
    } else {
      lines.push('计发基数口径：分城市，可选 ' + cities.join(' / ') + '；不指定则按全省平均（prov）。')
    }
    lines.push('')
    lines.push('【动作】调用 pension_calculate 时，city 参数填上面列出的城市名；不填则按全省平均。')
    return { text: lines.join('\n') }
  }
}

module.exports = [CALC, RETIRE, REGIONS]
module.exports.DISCLAIMER = DISCLAIMER
