/**
 * ════════════════════════════════════════════════════════
 *  calcIndex — 本人平均缴费工资指数计算引擎（逐省一致版 v2）
 *  版本: 2.3.0 | 2026-09-21
 *
 *  功能:
 *    正向: 缴费信息 + 省规 → 平均指数(avgIndex) + 过渡指数(transIndex) + 个人账户余额
 *    反推: 账户余额 + 缴费信息 → 反推平均指数
 *    支持: 三颗粒度输入 (A详细/B中等/C最简)
 *
 *  逐省一致（依据 docs/08 矩阵 09 + 规则 06 v2，四方印证官网）：
 *    D1 分母口径社平：**31 省统一** = 当年缴费工资 ÷ 当年使用的社平基数
 *       （hist[Y] = Y 年度执行社平 = Y-1 统计年；即 2024 年缴费 ÷ hist[2024] = 2023 年统计年社平）
 *       ⚠️ 2026-09-20：取消陕西/西藏「当年统计年」特例，全国一口径
 *    D2 视同年进指数分母：20省进 / 11省不进（逐省开关）
 *    D3 双指数/双基数：京/津/晋/苏/吉=真双指数(transIndex独立)；辽/吉=双基数加权
 *    D4 视同指数：默认1.0；广东查表；浙江替代指数；江苏/江西分段
 *    D5 指数修正：**不做通用 [0.6,3.0] 夹取**（2026-09-21 起）。60%/300% 是缴费端
 *       基数核定口径（国办发〔2019〕13号），非计算端规则；合规数据指数天然在区间内，
 *       夹取为恒等变换。且跨省流动按国办发〔2009〕66号用**退休地社平**作分母，
 *       指数跑出区间是制度既定结果，夹取即篡改国家算法。
 *       仅保留省级明文：沪 1993-2013 分段保底；渝上限分段；桂建账前<1按1。
 *       超区间年份**不改数值**，由 yearsDetail.outOfRange + warnings[] 暴露提示。
 *    D6 断缴计入分母：京/津/陕/浙/云(GAP_ZERO,记0)；黑龙江(gapFloor=0.6,记0.6)
 *
 *  数据源:
 *    - 利率表: UNIFIED_RATES (1996-2025, 剪刀财经)
 *    - 社平工资: 省份 config.avg_salary_history
 *
 *  依赖: 无 (纯函数, Node.js / 浏览器均可运行)
 * ════════════════════════════════════════════════════════
 */

// ─── 统一利率表（1996-2025，剪刀财经《缴费基数&记账利率》）──>
const UNIFIED_RATES = {
  1996: 0.0804, 1997: 0.0567, 1998: 0.0447, 1999: 0.0225, 2000: 0.0225,
  2001: 0.0225, 2002: 0.0225, 2003: 0.0198, 2004: 0.0198, 2005: 0.0225,
  2006: 0.0252, 2007: 0.0414, 2008: 0.0414, 2009: 0.0225, 2010: 0.0225,
  2011: 0.0350, 2012: 0.0350, 2013: 0.0300, 2014: 0.0350, 2015: 0.0350,
  2016: 0.0831, 2017: 0.0712, 2018: 0.0829, 2019: 0.0761, 2020: 0.0604,
  2021: 0.0669, 2022: 0.0612, 2023: 0.0397, 2024: 0.0262, 2025: 0.0150, 2026: 0.0260
}

/**
 * 获取某年记账利率
 */
function getRate(year) {
  if (UNIFIED_RATES[year] !== undefined) return UNIFIED_RATES[year]
  if (year > 2025) return UNIFIED_RATES[2025]  // 1.50%
  return 0.025  // 兜底
}

/**
 * 获取某年社平工资（元/月）
 * @param {Object} avgSalaryHistory - 省份的 avg_salary_history 对象 { year: 元/月 }
 * @param {number} year - 年份
 * @returns {number|null}
 */
function getSocialAvg(avgSalaryHistory, year) {
  if (!avgSalaryHistory || !avgSalaryHistory[year]) return null
  return avgSalaryHistory[year]
}

// ════════════════════════════════════════════════════════
//  逐省规则表（依据 09 矩阵 + 06 v2，四方印证官网查实）
//  字段说明：
//    denom:        'prev' 当年使用的社平基数(31省统一) | 'current' 当年统计年社平(2026-09-20起无省份使用)
//    deemedInDenom:true=视同年进指数分母(20省) | false=不进(11省)
//    deemedIndex:  '1.0' 默认 | 'table_gd' 广东查表 | 'replace_zj' 浙江替代指数
//                  | 'segmented_js' 江苏分段 | 'segmented_jx' 江西分段
//    cap:          'default'[0.6,3.0] | 'shanghai' | 'chongqing' | 'guangxi'
//    dualIndex:    false | 'trans'(京/津/晋/苏/吉) | 'dualBase'(辽/吉)
//    gapZero:      true=断缴年计入分母指数记0(京/津/陕/浙/云)
//    gapFloor:     number=断缴年计入分母指数记该值(黑龙江=0.6)；null=不启用
//    accountStart: 建账年月(YYYY-MM)，用于建账前特殊处理
// ════════════════════════════════════════════════════════
const PROVINCE_RULES = {
  beijing:    { denom: 'prev',    deemedInDenom: true,  deemedIndex: '1.0',          cap: 'default',   dualIndex: 'trans',    gapZero: true,  accountStart: '1992-10' },
  tianjin:    { denom: 'prev',    deemedInDenom: true,  deemedIndex: '1.0',          cap: 'default',   dualIndex: 'trans',    gapZero: true,  accountStart: '1994-10' },
  hebei:      { denom: 'prev',    deemedInDenom: true,  deemedIndex: '1.0',          cap: 'default',   dualIndex: false,      gapZero: false, accountStart: '1996-01' },
  shanxi:     { denom: 'prev',    deemedInDenom: true,  deemedIndex: '1.0',          cap: 'default',   dualIndex: 'trans',    gapZero: false, accountStart: '1997-07' },
  neimenggu:  { denom: 'prev',    deemedInDenom: false, deemedIndex: '1.0',          cap: 'default',   dualIndex: false,      gapZero: false, accountStart: '1998-01' },
  liaoning:   { denom: 'prev',    deemedInDenom: false, deemedIndex: '1.0',          cap: 'default',   dualIndex: 'dualBase', gapZero: false, accountStart: '1996-01' },
  jilin:      { denom: 'prev',    deemedInDenom: true,  deemedIndex: '1.0',          cap: 'default',   dualIndex: 'dualBase', gapZero: false, accountStart: '1995-07' },
  heilongjiang:{ denom: 'prev',   deemedInDenom: false, deemedIndex: '1.0',          cap: 'default',   dualIndex: false,      gapZero: false, gapFloor: 0.6, accountStart: '1996-01' },
  shanghai:   { denom: 'prev',    deemedInDenom: true,  deemedIndex: '1.0',          cap: 'shanghai', dualIndex: false,      gapZero: false, accountStart: '1993-01' },
  jiangsu:    { denom: 'prev',    deemedInDenom: true,  deemedIndex: 'segmented_js', cap: 'default',   dualIndex: 'trans',    gapZero: false, accountStart: '1996-01' },
  zhejiang:   { denom: 'prev',    deemedInDenom: true,  deemedIndex: 'replace_zj',   cap: 'default',   dualIndex: false,      gapZero: true,  accountStart: '1998-01' },
  anhui:      { denom: 'prev',    deemedInDenom: true,  deemedIndex: '1.0',          cap: 'default',   dualIndex: false,      gapZero: false, accountStart: '1996-01' },
  fujian:     { denom: 'prev',    deemedInDenom: true,  deemedIndex: '1.0',          cap: 'default',   dualIndex: false,      gapZero: false, accountStart: '1996-01' },
  jiangxi:    { denom: 'prev',    deemedInDenom: true,  deemedIndex: 'segmented_jx', cap: 'default',   dualIndex: false,      gapZero: false, accountStart: '1995-10' },
  shandong:   { denom: 'prev',    deemedInDenom: false, deemedIndex: '1.0',          cap: 'default',   dualIndex: false,      gapZero: false, accountStart: '1996-01' },
  henan:      { denom: 'prev',    deemedInDenom: true,  deemedIndex: '1.0',          cap: 'default',   dualIndex: false,      gapZero: false, accountStart: '1995-01' },
  hubei:      { denom: 'prev',    deemedInDenom: true,  deemedIndex: '1.0',          cap: 'default',   dualIndex: false,      gapZero: false, accountStart: '1996-01' },
  hunan:      { denom: 'prev',    deemedInDenom: true,  deemedIndex: '1.0',          cap: 'default',   dualIndex: false,      gapZero: false, accountStart: '1995-10' },
  guangdong:  { denom: 'prev',    deemedInDenom: true,  deemedIndex: 'table_gd',     cap: 'default',   dualIndex: false,      gapZero: false, accountStart: '1998-07' },
  guangxi:    { denom: 'prev',    deemedInDenom: true,  deemedIndex: '1.0',          cap: 'guangxi',  dualIndex: false,      gapZero: false, accountStart: '1996-07' },
  hainan:     { denom: 'prev',    deemedInDenom: true,  deemedIndex: '1.0',          cap: 'default',   dualIndex: false,      gapZero: false, accountStart: '1998-01' },
  chongqing:  { denom: 'prev',    deemedInDenom: false, deemedIndex: '1.0',          cap: 'chongqing',dualIndex: false,      gapZero: false, accountStart: '1996-01' },
  sichuan:    { denom: 'prev',    deemedInDenom: false, deemedIndex: '1.0',          cap: 'default',   dualIndex: false,      gapZero: false, accountStart: '1996-01' },
  guizhou:    { denom: 'prev',    deemedInDenom: true,  deemedIndex: '1.0',          cap: 'default',   dualIndex: false,      gapZero: false, accountStart: '1998-01' },
  yunnan:     { denom: 'prev',    deemedInDenom: true,  deemedIndex: '1.0',          cap: 'default',   dualIndex: false,      gapZero: true,  accountStart: '1995-10' },
  xizang:     { denom: 'prev',    deemedInDenom: false, deemedIndex: '1.0',          cap: 'default',   dualIndex: false,      gapZero: false, accountStart: '2000-07' },
  shaanxi:    { denom: 'prev',    deemedInDenom: false, deemedIndex: '1.0',          cap: 'default',   dualIndex: false,      gapZero: true,  accountStart: '1996-01' },
  gansu:      { denom: 'prev',    deemedInDenom: false, deemedIndex: '1.0',          cap: 'default',   dualIndex: false,      gapZero: false, accountStart: '1996-01' },
  qinghai:    { denom: 'prev',    deemedInDenom: false, deemedIndex: '1.0',          cap: 'default',   dualIndex: false,      gapZero: false, accountStart: '1996-01' },
  ningxia:    { denom: 'prev',    deemedInDenom: true,  deemedIndex: '1.0',          cap: 'default',   dualIndex: false,      gapZero: false, accountStart: '1996-01' },
  xinjiang:   { denom: 'prev',    deemedInDenom: false, deemedIndex: '1.0',          cap: 'default',   dualIndex: false,      gapZero: false, accountStart: '1996-01' }
}

const DEFAULT_RULE = { denom: 'prev', deemedInDenom: false, deemedIndex: '1.0', cap: 'default', dualIndex: false, gapZero: false, gapFloor: null, accountStart: '1996-01', indexWeight: 'month', numeratorType: 'level', retireYearInIndex: true, firstYearFull: false, autoFillGapYears: false, unpaidMonthsFill: false, unpaidIndex: null, denomByYear: null }

// ════════════════════════════════════════════════════════
//  2026-10-29 新增：指数「权重算子」表（三维度 ②③）
//  依据（三份核查文档，均已在公众号内容库/_政策文件库/ 落盘）：
//    _核查-31省平均缴费指数三维度口径-20261029.md
//    _核查-吉林模式年指数与退休当年是否计入-20261029.md
//    _核查-黑龙江断缴指数与6省待核-20261029.md
//
//  ⚠️ 先决认知（改这段代码前必须读懂）：
//    yearIndex = rec.baseAvg ÷ 月社平，而 rec.baseAvg 是「**月平均**缴费基数」
//    ⇒ yearIndex **已经是"水平/年化"口径**。某年只缴 1 个月且按 300% 缴时，
//      yearIndex 天然 = 3.0。**决定这一年是否被摊薄的，是权重，不是分子。**
//
//      现行 `rec.months` 权重 ≡ 「按月加权」≡ 「年限折算到月」，两者完全等价；
//      真正的差异来自那些**每年计 1 个名额**的省。
//
//  indexWeight       每年计入分母 N 的单位
//    'month'  该年月数（≡ 按月加权/年限折算到月，默认）
//    'year'   恒 1（吉林模式：N 取整年，年指数不受缴费月数影响）
//    'half'   福建省级：尾数 ≤6 个月取 0.5、≥7 个月取 1（闽政〔2006〕24号官方范例）
//  numeratorType     分子口径
//    'level'      月均水平（默认）
//    'annualSum'  年度基数和 ÷ 年社平（不足整年被稀释；陕西 B-3 已核定）
//  retireYearInIndex 退休当年是否计入指数（false = 吉/辽/冀/宁/甘/琼/皖 7 省）
//  firstYearFull     安徽：首次参保当年权重取 1；中间结算年度 ÷12
//  autoFillGapYears  应缴年限省：首末缴费年之间的缺年自动补记（否则断缴年不会进 N）
//  unpaidMonthsFill  年内欠缴月份按 unpaidIndex 补记（黑龙江：未缴月份按 60% 基数核定）
//  denomByYear       { until } —— ≤until 的缴费年走「同年比同年」（取 hist[Y+1]）；
//                    详见 `resolveDenom`；只给有省级文号支持的省配，其余保持 null
// ════════════════════════════════════════════════════════
const INDEX_WEIGHT_RULES = {
  // ① 吉林模式：年化指数 + 整年分母 ⇒ 某年缴 1 个月 300% 档，该年指数 = 3.0
  jilin:        { indexWeight: 'year', retireYearInIndex: false },
  liaoning:     { indexWeight: 'year', retireYearInIndex: false },
  hebei:        { indexWeight: 'year', retireYearInIndex: false },
  gansu:        { indexWeight: 'year', retireYearInIndex: false },
  henan:        { indexWeight: 'year' },
  qinghai:      { indexWeight: 'year' },
  neimenggu:    { indexWeight: 'year' },
  hunan:        { indexWeight: 'year' },
  beijing:      { indexWeight: 'year', autoFillGapYears: true },
  yunnan:       { indexWeight: 'year' },
  // 陕西：N 用**应缴年限**（含断缴年，autoFillGapYears 已配）+ 分子用年度总额。
  //   ⚠️ 关于「2020 前后两套 X/C 配对」：已按官方实算点复核，**暂不启用 denomByYear**：
  //      · 2020 前：2017 年缴费，官方公布分母 = 5619.42 = hist[2017]（现行行为已吻合）
  //      · 2020 后：2024 年按下限 4650 缴，指数恰好 0.6 ⇒ 分母 = hist[2024] = 7750（同样吻合）
  //      ⇒ 拿 hist[Y+1] 当「同年统计年」会与两个官方实算实例冲突，偏差达 −9.9%。
  //      另有口径隐患：hist 存的是**在岗职工**口径，而陕人社函〔2020〕422号说的是**全口径**，两者不同。
  //      待拿到「分口径、分年份」的社平表后，再用 denomByYear 机制接入。
  shaanxi:      { indexWeight: 'year', numeratorType: 'annualSum', autoFillGapYears: true },
  // ② 福建省级统筹：年权重按「年限尾数」取整，不是按月
  fujian:       { indexWeight: 'half' },
  // ③ 同样「截止退休上年」，但分子口径不等价 ⇒ **不能**归入吉林模式
  ningxia:      { retireYearInIndex: false },
  hainan:       { retireYearInIndex: false },
  anhui:        { retireYearInIndex: false, firstYearFull: true },
  // ④ 分母 N 为「应缴/应当计算的年限」⇒ 断缴年度必须补记进 N
  tianjin:      { autoFillGapYears: true },
  // ⑤ 黑龙江：N 取「应当计算的年限」，且**年内欠缴月份**按 60% 基数核定
  //    （2020-10-23 修订版：「未缴费年度当年缴费工资指数按0.6计算（含缴费年度中欠缴的月份）……
  //      Xn（未缴费月份按60%基数核定）」）
  //    ⚠️ 仅在能确定「该年应缴月数」时才补，避免把年中参保/年中退休误判成欠缴 ⇒ 见 payableMonthsOf
  heilongjiang: { autoFillGapYears: true, unpaidMonthsFill: true, unpaidIndex: 0.6 }
}

/**
 * 该年计入分母 N 的权重单位（原 L431/L432 写死的 rec.months 已被替换）
 */
function indexWeightUnits(rule, rec, firstContribYear) {
  const m = Math.max(0, rec.months || 0)
  // 安徽：首次参保当年分子按「实缴额÷实缴月数」取，不被稀释 ⇒ 权重取整年 1
  if (rule.firstYearFull && firstContribYear != null && rec.year === firstContribYear) return m > 0 ? 1 : 0
  switch (rule.indexWeight) {
    case 'year':
      return m > 0 ? 1 : 0
    case 'half': {
      const full = Math.floor(m / 12)
      const tail = m % 12
      if (tail === 0) return full
      return full + (tail >= 7 ? 1 : 0.5)
    }
    case 'month':
    default:
      return m
  }
}

// ════════════════════════════════════════════════════════
//  2026-10-29 ②：社保年度「分段取社平」规则
//  依据 `_核查-31省社平执行周期与缴费年度-20261029.md` §三 A 型省
//
//  ⚠️ 前置结论（改这段前必须读懂）：
//    社平**统计口径 31 省一律自然年**；跨年的只是「适用期」。
//    7-6 式省份的社保年度 Y = Y.7.1 ～ (Y+1).6.30，**整段用同一档社平**
//    = (Y−1) 自然年社平 = `avg_salary_history[Y]`（与既有 hist 语义一致）。
//
//    ⇒ 一个**自然年**被劈成两半：
//        1–6 月 属社保年度 (Y−1) ⇒ 用 hist[Y−1]
//        7–12 月 属社保年度 Y    ⇒ 用 hist[Y]
//    现行引擎全年共用 hist[Y]，把上半年系统性**高估约一档工资涨幅 g**
//    （全年平均指数偏高约 g/2 ≈ 1%，传导到基础养老金约 10 元/月量级）。
//
//    🔴 反例别一并改：北京、河南虽也是 7-6 式**缴费年度**，但它们的
//       X/C 是「自然年对齐」（Xₙ÷Cₙ₋₁，一个自然年＝一段）⇒ **不需要分段**，改了反而错。
// ════════════════════════════════════════════════════════
const SOCIAL_YEAR_SPLIT = {
  guangdong: { startMonth: 7 },
  shanghai:  { startMonth: 7 },
  hubei:     { startMonth: 7 },
  jilin:     { startMonth: 7 }
}

/**
 * clamp 到合法月份
 */
function clampMonth(m) {
  const v = Math.round(Number(m) || 1)
  return Math.min(12, Math.max(1, v))
}

/**
 * 该年缴费覆盖的起始月份
 *   显式的 rec.startMonth > 首缴起始月 > 缺省 1 月
 */
function firstMonthOfYear(rec, ctx) {
  if (rec.startMonth) return clampMonth(rec.startMonth)
  if (ctx.firstContribYear === rec.year && ctx.firstStartMonth) return clampMonth(ctx.firstStartMonth)
  return 1
}

/**
 * 按社保年度把该年的缴费月切成若干段。
 * 未配置分段的省 ⇒ 返回单一整段（targetYear = year）⇒ **与原实现完全等价**（零回归的关键）。
 *
 * @returns {Array<{months:number, targetYear:number, fromMonth:number}>}
 */
function splitYearRange(from, m, year, split) {
  if (m <= 0) return []
  if (!split) return [{ months: m, targetYear: year, fromMonth: from }]
  const sm = split.startMonth
  const to = Math.min(from + m - 1, 12)   // 年内 clamp，保证段数守恒

  const segs = []
  // 上半段：落在 [1, sm-1] 的月 ⇒ 归社保年度 (year-1)
  const lowTo = Math.min(to, sm - 1)
  const low = from <= lowTo ? (lowTo - from + 1) : 0
  if (low > 0) segs.push({ months: low, targetYear: year - 1, fromMonth: from })
  // 下半段：落在 [sm, 12] 的月 ⇒ 归社保年度 year
  const highFrom = Math.max(from, sm)
  const high = to >= highFrom ? (to - highFrom + 1) : 0
  if (high > 0) segs.push({ months: high, targetYear: year, fromMonth: highFrom })

  if (segs.length === 0) return [{ months: m, targetYear: year, fromMonth: from }]
  // 权重守恒：clamp 造成的差额补回最后一段
  const got = segs.reduce((s, x) => s + x.months, 0)
  if (got < m) segs[segs.length - 1].months += (m - got)
  return segs
}

/**
 * 生成该年的「月度计算单元」——每段携带自己的基数与分母年份
 *   ① 年内多条记录（7-6 式省份上下半年基数不同）⇒ 归一为 `_parts`
 *   ② 社保年度分段 ⇒ 每段还可能再被社保年度劈成两半
 *
 * 无 _parts 且无 split 时退化为单一整段 ⇒ **与改造前逐位等价**（零回归的关键）
 */
function buildYearSegments(rec, ctx, split) {
  const hasParts = rec._parts && rec._parts.length > 0
  const parts = hasParts ? rec._parts : [{ months: rec.months || 0, baseAvg: rec.baseAvg || 0, startMonth: rec.startMonth }]
  let cursor = firstMonthOfYear(rec, ctx)
  const out = []
  for (const p of parts) {
    const m = Math.max(0, p.months || 0)
    if (m <= 0) continue
    const from = p.startMonth ? clampMonth(p.startMonth) : cursor
    const base = (p.baseAvg != null ? p.baseAvg : (rec.baseAvg || 0))
    for (const s of splitYearRange(from, m, rec.year, split)) {
      out.push(Object.assign({ baseAvg: base }, s))
    }
    cursor = Math.min(from + m, 13)
  }
  if (out.length === 0) {
    out.push({
      months: Math.max(0, rec.months || 0), targetYear: rec.year,
      fromMonth: firstMonthOfYear(rec, ctx), baseAvg: rec.baseAvg || 0
    })
  }
  return out
}

/**
 * 旧名兼容：单条记录形式的分段入口（供反推与测试调用）
 */
function splitBySocialYear(rec, ctx, split) {
  return buildYearSegments(rec, ctx, split)
}

/**
 * 2026-10-29 ③：X/C 配对分界 —— 统一的分母入口
 *   denomByYear: { until } ⇒ ≤until 的**缴费年**走「同年比同年」（hist[Y+1]，= 同年统计年社平）
 *   其余走既有 D1 口径（hist[Y] = Y 年执行 = Y−1 统计年）
 */
function resolveDenom(rule, salaryHist, year) {
  const dy = rule.denomByYear
  const eff = (dy && year <= dy.until) ? year + 1 : year
  const v = getSocialAvg(salaryHist, eff)
  if (v && v > 0) return v
  return getSocialAvg(salaryHist, eff + 1)   // 兜底：本年缺则用次年（更新的统计年）
}

/**
 * 该年「应缴月数」——仅用于黑龙江年内欠缴补记。
 * 无法确定时返回 null ⇒ **不补**（避免把年中参保/年中退休误判为欠缴）。
 */
function payableMonthsOf(rec, ctx) {
  if (ctx.retireYear != null && rec.year === ctx.retireYear) {
    return ctx.retireMonth ? clampMonth(ctx.retireMonth) : null
  }
  if (ctx.firstContribYear === rec.year) {
    return ctx.firstStartMonth ? (13 - clampMonth(ctx.firstStartMonth)) : null
  }
  return 12
}

/**
 * 广东视同缴费指数查表（粤府函〔2014〕294 附表，D值）。
 * 计算器未强制要求市，注入 city 时优先查表，否则按 1.0 计（主引擎 transIndex 走同表）。
 */
// 广东省1993年底前"视同缴费指数"查表（粤府函〔2021〕294号 附表一、二）
// 来源：主引擎 cloudfunctions/calculate/provinces/guangdong.js GUANGDONG_SIGHT_INDEX_MAP
// 键：地级市"平均"行 D 值（与1994年统计年鉴口径一致）。未选市默认全省=1.000。
// 深圳参保人另取独立社平（见 resolveSalaryHist），此处 D 值也用深圳平均 1.529。
const GUANGDONG_SIGHT_INDEX_MAP = {
  '全省': 1.000, '省直': 1.327, '省农垦': 0.610,
  '广州': 1.191, '广州市': 1.191,
  '深圳': 1.529, '深圳市': 1.529,
  '珠海': 1.389, '珠海市': 1.389,
  '汕头': 0.821, '汕头市': 0.821,
  '韶关': 0.836, '韶关市': 0.836,
  '河源': 0.512, '河源市': 0.512,
  '梅州': 0.638, '梅州市': 0.638,
  '惠州': 0.961, '惠州市': 0.961,
  '汕尾': 0.584, '汕尾市': 0.584,
  '东莞': 1.169, '东莞市': 1.169,
  '中山': 0.963, '中山市': 0.963,
  '江门': 1.066, '江门市': 1.066,
  '佛山': 1.304, '佛山市': 1.304,
  '阳江': 0.678, '阳江市': 0.678,
  '湛江': 0.742, '湛江市': 0.742,
  '茂名': 0.712, '茂名市': 0.712,
  '肇庆': 0.761, '肇庆市': 0.761,
  '云浮': 0.902, '云浮市': 0.902,
  '清远': 0.725, '清远市': 0.725,
  '潮州': 0.602, '潮州市': 0.602,
  '揭阳': 0.546, '揭阳市': 0.546
}

/**
 * 解析省份社平历史：兼容扁平 {year:value} 与嵌套（广东等）{prov:{...}, shenzhen:{...}}。
 * 嵌套时，city=深圳/广州 选对应市子集；其余（含 undefined）默认 prov（全省）。
 */
function resolveSalaryHist(avgSalaryHistory, city) {
  if (!avgSalaryHistory) return {}
  if (avgSalaryHistory.prov) {
    let sub = avgSalaryHistory.prov
    if (city) {
      const c = String(city).replace(/市$/, '')
      if (avgSalaryHistory[c]) sub = avgSalaryHistory[c]
      else if (avgSalaryHistory[c + '市']) sub = avgSalaryHistory[c + '市']
    }
    return sub
  }
  return avgSalaryHistory
}

// ─── 规则辅助函数 ───

function parseAccountStartYear(accountStart) {
  if (!accountStart) return 1996
  const y = parseInt(String(accountStart).split('-')[0], 10)
  return isNaN(y) ? 1996 : y
}

/**
 * D1 分母口径（2026-09-20 起 31 省统一）
 *
 * 口径定义：当年缴费工资 ÷ **当年使用的社平基数**
 *   例：2024 年缴费工资 ÷ hist[2024]（= 2024 年度执行社平 = 2023 统计年社平）
 *
 * ⚠️ 年度语义（SALARY_SEMANTICS_V2，2026-09-20 统一）：
 *    salaryHist[Y] = Y 年度执行社平 = Y-1 统计年社平
 *    故「缴费年 year 用当年使用基数」 ⇒ 取 [year]
 *   （'current' 分支取 [year+1] = 当年统计年社平，2026-09-20 起已无省份使用，保留备用）
 */
/**
 * 合并后的省规（PROVINCE_RULES 基础 + INDEX_WEIGHT_RULES 覆盖 + DEFAULT 兜底）
 * ⚠️ 反推链路也必须走这里，否则 `denomByYear` 之类的算子只在正向生效，
 *    「按目标指数反推缴费基数」会与正向不对齐。
 */
function mergedRule(provinceCode) {
  return Object.assign({}, DEFAULT_RULE, PROVINCE_RULES[provinceCode] || {}, INDEX_WEIGHT_RULES[provinceCode] || {})
}

function getDenominator(rule, salaryHist, year) {
  if (rule.denom === 'current') {
    return getSocialAvg(salaryHist, year + 1) || getSocialAvg(salaryHist, year) // 当年
  }
  const prev = getSocialAvg(salaryHist, year) // 上年
  if (prev && prev > 0) return prev
  return getSocialAvg(salaryHist, year + 1) // 兜底：本年缺则用次年（更新的统计年）
}

/**
 * 该年「等效单档社平」——7-6 式省份按 12 个月分布做两段加权平均。
 * 供反推（按目标指数/当前基数生成缴费基数序列）使用：
 * 只要正向对该年也是同样的两段分布，正向重算即可还原同一个指数。
 */
function blendedSocialAvg(provinceCode, salaryHist, year) {
  const rule = mergedRule(provinceCode)
  const split = SOCIAL_YEAR_SPLIT[provinceCode] || null
  if (!split) return resolveDenom(rule, salaryHist, year)
  const segs = splitBySocialYear({ year, months: 12 }, { firstContribYear: year, firstStartMonth: 1 }, split)
  let sum = 0, tot = 0
  for (const seg of segs) {
    const d = resolveDenom(rule, salaryHist, seg.targetYear)
    if (d && d > 0) { sum += d * seg.months; tot += seg.months }
  }
  return tot > 0 ? sum / tot : resolveDenom(rule, salaryHist, year)
}

/**
 * D5 省级明文指数修正（2026-09-21 修订：**取消通用 [0.6, 3.0] 夹取**）
 *
 * ⚠️ 关键区分：**缴费端约束 ≠ 计算端规则**
 *    「60% 保底 / 300% 封顶」是**缴费基数核定**口径（国办发〔2019〕13号），
 *    约束的是「能缴多少」，不是「指数怎么算」。合规数据的指数天然落在 [0.6, 3.0]
 *    ——实测 30 省按参保地 60%/300% 档缴费者，raw 恰好 = 0.6000 / 3.0000，
 *    夹取为恒等变换，零作用。
 *
 *    且国办发〔2009〕66号明文规定跨省流动人员：
 *    「以本人在**各参保地的缴费工资**和**待遇领取地相对应各年度职工平均工资**
 *      计算本人的缴费工资指数」
 *    ⇒ 参保地下限按参保地社平核定，指数分母却是退休地社平；两地社平不一致时
 *      指数**必然**跑出 [0.6, 3.0]，这是制度既定结果。夹取即篡改国家规定算法。
 *
 * 故：**仅保留省级明文规定的计算端修正规则**，其余一律按实际比值。
 *    - 上海：1993–2013 分段保底（沪人社规〔2021〕32号「1993–2010 指数<1 按 1」+ 过渡安排）
 *    - 重庆：上限分段 1993–1997 为 2、1998 后为 3（渝劳社发〔2006〕41号）
 *    - 广西：建账前实际缴费年 <1 按 1
 *    - 黑龙江：未缴费年按 0.6（gapFloor，属 D6，不在此处）
 *
 * 超出 [0.6, 3.0] 的年份**不做数值修改**，仅由 `yearsDetail.outOfRange` 与
 * 顶层 `warnings[]` 暴露，交由前端提示用户核对（可能是跨省流动的正常结果，
 * 也可能是基数填错）。
 *
 * 详见 `docs/08-缴费指数小程序/_核查-0.6-3.0是缴费端约束还是计算端约束（2026-09-21）.md`
 */
function applyCap(rule, rawIdx, year, accountStartYear) {
  // 上海：省级明文分段保底；2014 起无明文 ⇒ 按实际比值
  if (rule.cap === 'shanghai') {
    const floor = shanghaiFloor(year)
    return floor != null ? Math.max(floor, rawIdx) : rawIdx
  }
  // 重庆：上限分段为省级明文（全时段）；无明文下限
  if (rule.cap === 'chongqing') {
    const max = (year >= 1993 && year <= 1997) ? 2.0 : 3.0
    return Math.min(max, rawIdx)
  }
  // 广西：建账前 <1 按 1 为省级明文；无明文下限/上限
  if (rule.cap === 'guangxi') {
    return (year < accountStartYear && rawIdx < 1) ? 1.0 : rawIdx
  }
  // 其余（29 省）：按实际比值——缴费端约束不适用于计算端
  return rawIdx
}

/** 指数是否超出常规区间 [0.6, 3.0]——仅用于提示，不改变数值 */
function outOfRangeFlag(idx) {
  if (idx == null || !isFinite(idx)) return null
  if (idx < 0.6 - 1e-9) return 'low'
  if (idx > 3.0 + 1e-9) return 'high'
  return null
}

/**
 * 上海分段保底：93-2011 年 <1 按 1；2012 年 ≥0.85；2013 年 ≥0.75；
 * 2014 年起无省级明文 ⇒ 返回 null（按实际比值）
 */
function shanghaiFloor(year) {
  if (year >= 1993 && year <= 2011) return 1.0
  if (year === 2012) return 0.85
  if (year === 2013) return 0.75
  return null
}

/**
 * D4 视同指数取值
 */
function getDeemedIndexValue(rule, year, opts) {
  opts = opts || {}
  switch (rule.deemedIndex) {
    case 'replace_zj': // 浙江替代指数：1992.12前≈1.279(温州1.1)，1993.1后=1.0
      if (year <= 1992) return opts.city === '温州' ? 1.1 : (opts.zhejiangReplace || 1.279)
      return 1.0
    case 'segmented_js': // 江苏：1985.6前=1.0；1985.7-1991 按A段联动(近似1.0)
      if (year < 1985) return 1.0
      if (year <= 1991) return opts.jiangsuARatio || 1.0
      return 1.0
    case 'segmented_jx': // 江西：1992.9前=1.0；1992.10-1995.9 按设区市/全省比
      if (year < 1992) return 1.0
      if (year <= 1995) return opts.jiangxiRatio || 1.0
      return 1.0
    case 'table_gd': // 广东查表
      if (opts.sightIndexMap && opts.city) {
        const c = String(opts.city).replace(/市$/, '')
        return opts.sightIndexMap[c] || opts.sightIndexMap[c + '市'] || opts.sightIndexMap[opts.city] || 1.0
      }
      return 1.0
    default:
      return 1.0
  }
}

/**
 * D2 视同年并入指数分母：按年累加视同指数×12
 */
function getDeemedSum(rule, deemedYears, deemedStartYear, opts) {
  if (!deemedYears || deemedYears <= 0) return { sum: 0, weight: 0 }
  // 2026-10-29：视同权重必须与实缴权重同单位，否则 N 会量纲不一致。
  //   indexWeight='year'/'half' ⇒ N 以「年」为单位 ⇒ 视同年也按年（福建官方范例 (23+5+10.5) 即此写法）
  //   indexWeight='month'       ⇒ N 以月为单位 ⇒ 视同年 ×12（原行为）
  const unit = (rule.indexWeight === 'year' || rule.indexWeight === 'half') ? 1 : 12
  const weight = deemedYears * unit
  // 广东查表：D 值按城市固定（年份无关），直接用城市 D 值累乘
  if (rule.deemedIndex === 'table_gd') {
    const d = getDeemedIndexValue(rule, deemedStartYear || 1990, opts)
    return { sum: d * weight, weight }
  }
  const periodBased = (rule.deemedIndex === 'replace_zj' || rule.deemedIndex === 'segmented_js' || rule.deemedIndex === 'segmented_jx')
  if (periodBased && deemedStartYear) {
    let sum = 0
    for (let i = 0; i < deemedYears; i++) {
      const y = deemedStartYear + i
      sum += getDeemedIndexValue(rule, y, opts) * unit
    }
    return { sum, weight }
  }
  // 默认 1.0（含分段省但未提供起始年）
  return { sum: 1.0 * weight, weight }
}

// ════════════════════════════════════════════════════════
//  核心计算函数
// ════════════════════════════════════════════════════════

/**
 * 正向计算：缴费信息 + 省规 → 平均指数(avgIndex) + 过渡指数(transIndex) + 个人账户余额
 *
 * @param {Object} params
 * @param {Object} params.provinceConfig - 省份配置（需含 avg_salary_history）
 * @param {string} params.provinceCode - 省份代码（slug，如 'beijing'），驱动逐省规则
 * @param {Array|Object} params.contribution - 缴费记录（三颗粒度之一）
 * @param {string} params.granularity - 'A'详细(逐月) / 'B'中等(年汇总+部分明细) / 'C'最简(仅起止)
 * @param {number} [params.deemedYears] - 视同缴费年限（年），进分母省用于指数计算
 * @param {number} [params.deemedStartYear] - 视同起始年（用于浙江/江苏/江西分段取值）
 * @param {string} [params.city] - 地市（广东查表用）
 * @param {boolean} [params.gapYearCountsInAvg] - 覆盖开关（默认由省规 gapZero 决定）
 * @param {number} [params.retireYear] - 退休年份（7 省需要判断是否排除退休当年）
 * @param {number} [params.retireMonth] - 退休月份（1-12，用于退休当年应缴月数）
 * @param {Object} [params.contributionStart] - 首缴年月 { year, month }，用于首年应缴月数与月分布推断
 * @returns {Object} { avgIndex, transIndex, accountBalance, totalMonths, totalYears, yearsDetail }
 */
function calculateIndex({ provinceConfig, provinceCode, contribution, granularity = 'A', deemedYears = 0, deemedStartYear = null, city = null, gapYearCountsInAvg = null, retireYear = null, retireMonth = null, contributionStart = null }) {
  const salaryHist = resolveSalaryHist(provinceConfig.avg_salary_history, city)
  const rule = mergedRule(provinceCode)
  const gapZero = (gapYearCountsInAvg != null) ? gapYearCountsInAvg : rule.gapZero
  const gapFloor = rule.gapFloor || null
  const accountStartYear = parseAccountStartYear(rule.accountStart)
  const opts = { city, sightIndexMap: GUANGDONG_SIGHT_INDEX_MAP }

  // ── C 颗粒度无基数数据，正向无法计算 ──>
  if (granularity === 'C') {
    return {
      error: 'C 颗粒度（最简）仅支持反推模式。请切换到"反推"模式并填写账户余额，或改用 A/B 颗粒度输入逐年缴费基数。',
      code: 'C_GRANULARITY_FORWARD_NOT_SUPPORTED'
    }
  }

  // ── 根据颗粒度解析为统一年记录格式 ──>
  const yearlyRecords = normalizeToYearly(contribution, granularity)

  if (!yearlyRecords || yearlyRecords.length === 0) {
    return { error: '无有效缴费数据' }
  }

  let totalIndexSum = 0      // 实际缴费年指数加权和（N 单位由 rule.indexWeight 决定）
  let weightSum = 0          // 指数分母 N 的累加（月数 / 年数 / 福建尾数）
  let monthsSum = 0          // 实际缴费月数（与 N 单位解耦，供个人账户与年限展示）
  let unpaidMonthsTotal = 0  // 黑龙江：年内欠缴补记月数（累计，用于 _meta 暴露）
  let accountBalance = 0      // 个人账户余额（复利累计）
  const yearsDetail = []       // 逐年明细
  const warnings = []          // 超常规区间 [0.6,3.0] 的年份提示（仅提示，不改数值）

  // 按年份排序
  yearlyRecords.sort((a, b) => a.year - b.year)

  // 首次/末次有缴费的年份（断缴判定、安徽首年判定、退休当年退化判定都用它）
  const contribYears = yearlyRecords.filter(r => r.baseAvg > 0).map(r => r.year)
  const firstContribYear = contribYears.length ? Math.min(...contribYears) : null
  const lastContribYear = contribYears.length ? Math.max(...contribYears) : null

  // 退休当年：显式入参优先；缺省退化为「最后有缴费记录的年份」
  const retireY = (retireYear != null && retireYear > 0) ? Number(retireYear) : lastContribYear
  const retireYearInferred = !(retireYear != null && retireYear > 0)
  const retireM = (retireMonth != null && retireMonth > 0) ? clampMonth(retireMonth) : null

  // 首缴起始月：显式 contributionStart 优先；否则取末年之外 records 自带的 startMonth
  let firstStartMonth = null
  if (contributionStart && contributionStart.year && contributionStart.year === firstContribYear) {
    firstStartMonth = clampMonth(contributionStart.month)
  } else {
    const firstRec = yearlyRecords.find(r => r.year === firstContribYear)
    if (firstRec && firstRec.startMonth) firstStartMonth = clampMonth(firstRec.startMonth)
  }

  // 社保年度分段规则（粤/沪/鄂/吉）
  const salSplit = SOCIAL_YEAR_SPLIT[provinceCode] || null
  const ctx = {
    retireYear: retireY, retireMonth: retireM,
    firstContribYear, firstStartMonth
  }

  // ── 应缴年限省：首末缴费年之间的缺年自动补记（否则断缴年永远进不了分母 N）──>
  let workRecords = yearlyRecords
  if (rule.autoFillGapYears && firstContribYear != null && lastContribYear != null) {
    const have = new Set(yearlyRecords.map(r => r.year))
    const filled = yearlyRecords.slice()
    for (let y = firstContribYear; y <= lastContribYear; y++) {
      if (!have.has(y)) filled.push({ year: y, months: 12, baseAvg: 0, _autoFilled: true })
    }
    filled.sort((a, b) => a.year - b.year)
    workRecords = filled
  }

  for (const rec of workRecords) {
    const year = rec.year

    // ── 断缴/空年处理 ──>
    if (rec.baseAvg <= 0) {
      const gapSocial = getSocialAvg(salaryHist, year)
      const isGapYear = firstContribYear != null && year >= firstContribYear
      // D6 断缴年处理：gapZero→记0(京/津/陕/浙/云)；gapFloor→记0.6(黑龙江)；其余→跳过
      const gapValue = gapZero ? 0 : (gapFloor != null ? gapFloor : null)
      if (isGapYear && gapSocial && gapSocial > 0 && gapValue !== null) {
        // 断缴年计入平均指数分母（指数记 gapValue），已有余额照常计息
        const grate = getRate(year)
        accountBalance = accountBalance * (1 + grate)
        const gw = indexWeightUnits(rule, rec, firstContribYear)
        totalIndexSum += gapValue * gw
        weightSum += gw
        monthsSum += (rec.months || 0)
        yearsDetail.push({
          year, months: rec.months, baseAvg: 0, indexWeight: gw,
          socialAvg: resolveDenom(rule, salaryHist, year), index: gapValue, weightedIndex: gapValue * gw, rate: grate,
          accountContribution: 0, balanceAfterYear: accountBalance, gap: true, gapCounted: true, autoFilled: !!rec._autoFilled
        })
      } else {
        const note = (gapSocial && gapSocial > 0)
          ? (gapValue !== null
              ? (year >= firstContribYear ? '断缴年份（计入平均指数，指数记' + gapValue + '）' : '未缴费年度（首次缴费年前，不计入）')
              : '断缴年份（不计入平均指数）')
          : '缺少' + year + '年社平'
        yearsDetail.push({
          year, months: rec.months, baseAvg: 0,
          socialAvg: (gapSocial && gapSocial > 0) ? resolveDenom(rule, salaryHist, year) : null,
          index: null, gap: true, skipped: true,
          note
        })
      }
      continue
    }

    // ── D1 分母：按社保年度分段取社平（粤/沪/鄂/吉）；其余省恒为整段 ──>
    //    单段时 months≣段月数 ⇒ monthRatio ≡ baseAvg/denom，**与原实现逐位等价**（零回归）
    const segs = buildYearSegments(rec, ctx, salSplit)
    let ratioMonthSum = 0       // Σ(该段月比值 × 段月数)
    let missingSeg = false
    const segDetail = []
    for (const seg of segs) {
      const d = resolveDenom(rule, salaryHist, seg.targetYear)
      if (!d || d <= 0) { missingSeg = true; continue }
      segDetail.push({ months: seg.months, fromMonth: seg.fromMonth, targetYear: seg.targetYear, denom: d })
      ratioMonthSum += (seg.baseAvg / d) * seg.months
    }
    const segMonths = segDetail.reduce((s, x) => s + x.months, 0)

    if (missingSeg || segMonths <= 0) {
      yearsDetail.push({
        year, months: rec.months, baseAvg: rec.baseAvg,
        socialAvg: null, index: null,
        accountContribution: 0, note: `缺少${year}年社平`
      })
      continue
    }

    // 代表性的单档社平（供明细展示：多段时取按段月数加权平均）
    const socialAvg = segDetail.length === 1
      ? segDetail[0].denom
      : segDetail.reduce((s, x) => s + x.denom * x.months, 0) / segMonths

    // ── 计算该年平均缴费指数 + D5 省级明文修正 ──>
    //    rec.baseAvg 是「月平均缴费基数」⇒ 'level' 下年指数 = 各段月比值的**按段月数加权平均**，
    //    不足整年也不会被稀释。
    //    'annualSum'：分子改用「年度基数和 ÷ 年社平」（陕西 陕劳社发〔2006〕84号），
    //    不足整年时自然被稀释（÷12 方向的 months/12 缩放）。
    const monthRatio = ratioMonthSum / segMonths
    const yearIndexRaw = (rule.numeratorType === 'annualSum')
      ? monthRatio * ((rec.months || 0) / 12)
      : monthRatio
    const yearIndex = applyCap(rule, yearIndexRaw, year, accountStartYear)

    // ── 退休当年不计入指数（吉/辽/冀/宁/甘/琼/皖 7 省）──>
    //    注意：钱照缴、账户照滚，只是这一年的比值不进平均指数。
    //    ⚠️ 必须放在分段之后：否则该年只会用单档分母，7-6 式省份又走回「全年共用一档」的老错。
    if (rule.retireYearInIndex === false && retireY != null && year === retireY) {
      const rr = getRate(year)
      const ppay = (rec.baseAvg || 0) * (rec.months || 0) * 0.08
      accountBalance = accountBalance * (1 + rr) + ppay
      monthsSum += (rec.months || 0)
      yearsDetail.push({
        year, months: rec.months, baseAvg: rec.baseAvg,
        socialAvg, index: round4(yearIndex),
        excludedFromIndex: true,
        indexWeight: 0,
        segments: segDetail.length > 1 ? segDetail : undefined,
        accountContribution: ppay, balanceAfterYear: accountBalance,
        note: '退休当年不计入平均缴费指数（省级明文），但缴费月数计入缴费年限'
      })
      continue
    }

    const flag = outOfRangeFlag(yearIndex)
    if (flag) {
      warnings.push({
        year,
        type: flag === 'low' ? 'below_0_6' : 'above_3_0',
        index: round4(yearIndex),
        indexRaw: round4(yearIndexRaw),
        baseAvg: rec.baseAvg,
        socialAvg,
        msg: `${year} 年指数 ${round4(yearIndex).toFixed(4)}（实际比值 ${round4(yearIndexRaw).toFixed(4)}）` +
             (flag === 'low' ? ' 低于 0.6' : ' 高于 3.0') +
             '，属常规区间之外。跨省流动人员按退休地社平计算属正常结果；' +
             '若一直在本地参保，请核对缴费基数是否与参保地匹配。'
      })
    }

    // 加权累加（权重单位由省规决定：月数 / 整年 1 / 福建尾数 0.5·1）
    const w = indexWeightUnits(rule, rec, firstContribYear)
    totalIndexSum += yearIndex * w
    weightSum += w
    monthsSum += (rec.months || 0)

    // ── 黑龙江：年内欠缴月份按 0.6 补记（「含缴费年度中欠缴的月份」）──>
    //    仅在能确定该年应缴月数时才补（payableMonthsOf 返回 null 时不动），
    //    否则年中参保 6 个月会被误判成欠缴 6 个月。
    let unpaidMonths = 0
    if (rule.unpaidMonthsFill && rule.unpaidIndex != null) {
      const payable = payableMonthsOf(rec, ctx)
      if (payable != null) {
        unpaidMonths = Math.max(0, payable - Math.max(0, rec.months || 0))
        if (unpaidMonths > 0) {
          const uw = indexWeightUnits(rule, { year, months: unpaidMonths }, firstContribYear)
          totalIndexSum += rule.unpaidIndex * uw
          weightSum += uw
          unpaidMonthsTotal += unpaidMonths
        }
      }
    }

    // ── 计算个人账户本年计入金额（用实际基数，不受指数修正影响）──>
    const annualAccountPay = rec.baseAvg * rec.months * 0.08
    const rate = getRate(year)
    accountBalance = accountBalance * (1 + rate) + annualAccountPay

    yearsDetail.push({
      year,
      months: rec.months,
      baseAvg: rec.baseAvg,
      indexWeight: w,
      unpaidMonths: unpaidMonths || 0,
      socialAvg,
      index: yearIndex,
      indexRaw: round4(yearIndexRaw),
      outOfRange: flag,
      weightedIndex: yearIndex * w,
      rate,
      segments: segDetail.length > 1 ? segDetail : undefined,
      accountContribution: annualAccountPay,
      balanceAfterYear: accountBalance
    })
  }

  // ── D2 平均指数：视同年逐省开关 ──>
  let avgIndex
  if (rule.deemedInDenom && deemedYears > 0) {
    const { sum: deemedSum, weight: deemedWeight } = getDeemedSum(rule, deemedYears, deemedStartYear, opts)
    avgIndex = (totalIndexSum + deemedSum) / (weightSum + deemedWeight)
  } else {
    avgIndex = weightSum > 0 ? totalIndexSum / weightSum : 0
  }

  // ── D3 过渡指数 transIndex（双指数/双基数省另算，供主程序过渡性公式）──
  let transIndex = null
  if (rule.dualIndex === 'trans' || rule.dualIndex === 'dualBase') {
    // 基础 avgIndex 已含视同(进省)或仅实缴(不进省)；过渡性指数按省规独立，
    // 此处以 avgIndex 作为可用近似（吉/辽双基数加权需市州基数，计算器按全省近似）。
    transIndex = avgIndex
  }

  // 总年限（实际缴费月数÷12，与指数分母 N 的单位解耦）
  const totalMonths = monthsSum
  const totalYears = totalMonths / 12

  return {
    avgIndex: round4(avgIndex),
    transIndex: transIndex != null ? round4(transIndex) : null,
    accountBalance: Math.round(accountBalance * 100) / 100,
    totalMonths,
    totalYears: round2(totalYears),
    yearsDetail,
    warnings,
    _meta: {
      granularity,
      province: provinceConfig.name || provinceCode || 'unknown',
      provinceCode: provinceCode || null,
      city: city || null,
      // 2026-10-29 新增：权重算子相关元信息，前端/日志可直接读
      indexWeight: rule.indexWeight,
      numeratorType: rule.numeratorType,
      retireYearInIndex: rule.retireYearInIndex,
      retireYear: retireY,
      retireYearInferred,
      retireMonth: retireM,
      contributionStartMonth: firstStartMonth,
      indexDenominatorN: round4(weightSum),
      firstYearFull: rule.firstYearFull,
      autoFillGapYears: rule.autoFillGapYears,
      // ② 社保年度分段取社平
      socialYearSplit: salSplit ? salSplit.startMonth : null,
      socialYearSplitApplied: salSplit ? yearsDetail.some(y => y.segments) : false,
      // ③ X/C 配对分界（陕西 ≤2019 同年比同年）
      denomByYear: rule.denomByYear || null,
      // ⑤ 黑龙江年内欠缴补记
      unpaidMonthsTotal: rule.unpaidMonthsFill ? unpaidMonthsTotal : 0,
      rule,
      rateSource: '剪刀财经 UNIFIED_RATES 1996-2025',
      gapZero,
      gapFloor: gapFloor,
      gapYears: yearsDetail.filter(y => y.gap && !y.skipped).length,
      deemedYears: deemedYears || 0,
      deemedStartYear: deemedStartYear || null,
      deemedInDenom: rule.deemedInDenom
    }
  }
}

/**
 * 反向推算：已知账户余额 + 缴费信息 → 推算平均指数
 * （反推仅覆盖实际缴费段，视同年不计入；deemedYears 默认 0）
 */
function inferIndexFromBalance({ provinceConfig, provinceCode, contribution, granularity, knownBalance, options = {} }) {
  const TOLERANCE = options.tolerance || 10
  const MAX_ITER = options.maxIter || 100

  const template = buildInferTemplate(contribution, granularity, provinceConfig.avg_salary_history)
  if (template.length === 0) {
    return { error: '无法构建反推模板（缺少社平数据或缴费信息）' }
  }

  let low = 0.3
  let high = 5.0
  let bestIndex = 1.0
  let bestDiff = Infinity

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const mid = (low + high) / 2
    const synth = template.map(t => ({
      year: t.year,
      months: t.months,
      baseAvg: mid * t.socialAvg
    }))
    const result = calculateIndex({ provinceConfig, provinceCode, contribution: synth, granularity: 'A' })
    if (result.error) return { error: result.error }

    const diff = Math.abs(result.accountBalance - knownBalance)
    if (diff < bestDiff) { bestDiff = diff; bestIndex = mid }

    if (diff <= TOLERANCE) {
      return {
        inferredIndex: round4(mid),
        calculatedBalance: result.accountBalance,
        iterations: iter + 1,
        converged: true,
        method: 'bisection',
        yearsDetail: result.yearsDetail
      }
    }
    if (result.accountBalance < knownBalance) low = mid
    else high = mid
    if (high - low < 0.0001) break
  }

  return {
    inferredIndex: round4(bestIndex),
    calculatedBalance: null,
    iterations: MAX_ITER,
    converged: bestDiff <= TOLERANCE * 10,
    method: 'bisection_approx',
    residual: bestDiff,
    note: bestDiff > TOLERANCE ? `误差¥${bestDiff.toFixed(0)}较大，建议核对输入` : null
  }
}

/**
 * 构建反推模板：逐年 + 该年分母社平
 */
function buildInferTemplate(contribution, granularity, salaryHist) {
  let yearly = []
  if (granularity === 'A') yearly = normalizeGranularityA(contribution)
  else if (granularity === 'B') yearly = normalizeGranularityB(contribution)
  else if (granularity === 'C') yearly = spreadMonthsToYears(contribution)
  const resolved = resolveSalaryHist(salaryHist, null)
  // 反推模板用"分母社平"：默认上年（与正向一致，陕/藏会取当年）
  return yearly
    .map(y => {
      const rule = mergedRule(y._provinceCode)
      return { year: y.year, months: y.months, socialAvg: resolveDenom(rule, resolved, y.year) }
    })
    .filter(y => y.socialAvg && y.socialAvg > 0)
}

// ════════════════════════════════════════════════════════
//  内部辅助函数（归一化）
// ════════════════════════════════════════════════════════

function normalizeToYearly(contribution, granularity) {
  if (granularity === 'A') return normalizeGranularityA(contribution)
  if (granularity === 'B') return normalizeGranularityB(contribution)
  if (granularity === 'C') return normalizeGranularityC(contribution)
  return []
}

function normalizeGranularityA(data) {
  let records = []
  if (Array.isArray(data)) records = data
  else if (data && data.records) records = data.records
  else return []

  if (records.length > 0 && records[0].months !== undefined && records[0].baseAvg !== undefined) {
    // 同年多条记录 ⇒ 合并为一年，但保留 `_parts` 分段明细。
    //   7-6 式省份（粤/沪/鄂/吉）上下半年的缴费基数本就不同 —— 不保留就会被压成一个
    //   「全年月均」而丢失真实分布；保留后各段可用自己的真实基数。
    //   单条记录 ⇒ 无 _parts，与旧行为逐位等价。
    const byYear = {}
    for (const r of records) {
      const y = r.year
      if (!byYear[y]) byYear[y] = { year: y, months: 0, startMonth: r.startMonth, parts: [] }
      const m = Math.max(0, r.months || 0)
      byYear[y].months += m
      byYear[y].parts.push({ months: m, baseAvg: r.baseAvg || 0, startMonth: r.startMonth })
      if (r.startMonth && !byYear[y].startMonth) byYear[y].startMonth = r.startMonth
    }
    return Object.values(byYear).map(e => {
      const parts = e.parts.filter(p => p.months > 0)
      if (parts.length <= 1) {
        return { year: e.year, months: e.months, baseAvg: parts[0] ? parts[0].baseAvg : 0, startMonth: e.startMonth }
      }
      // ⚠️ baseAvg 必须取「按段月数加权」的平均，**不能写 0** ——否则主循环会当成断缴年跳过
      const wSum = parts.reduce((s, p) => s + p.months, 0)
      const wBase = wSum > 0
        ? parts.reduce((s, p) => s + p.baseAvg * p.months, 0) / wSum
        : 0
      return { year: e.year, months: e.months, baseAvg: wBase, startMonth: e.startMonth, _parts: parts }
    })
  }

  const yearMap = {}
  for (const r of records) {
    const y = r.year
    if (!yearMap[y]) yearMap[y] = { year: y, months: 0, baseSum: 0 }
    const base = r.base || r.baseSalary || r.paymentBase || 0
    yearMap[y].months++
    yearMap[y].baseSum += base
  }
  return Object.values(yearMap).map(y => ({
    year: y.year, months: y.months, baseAvg: y.months > 0 ? y.baseSum / y.months : 0
  }))
}

function normalizeGranularityB(data) {
  if (!data || !data.yearlyData) return []
  const yearlyData = data.yearlyData
  if (!Array.isArray(yearlyData) || yearlyData.length === 0) return []
  const validYears = yearlyData.filter(y => y.baseAvg && y.baseAvg > 0)
  const globalBaseAvg = validYears.length > 0
    ? validYears.reduce((s, y) => s + y.baseAvg, 0) / validYears.length : 0
  const result = []
  for (const y of yearlyData) {
    result.push({ year: y.year, months: y.months || 12, baseAvg: y.baseAvg || globalBaseAvg })
  }
  return result
}

function normalizeGranularityC(data) {
  if (!data || !data.totalMonths) return []
  return [{
    _granularityC: true,
    totalMonths: data.totalMonths,
    startYear: data.startYear,
    startMonth: data.startMonth,
    currentBalance: data.currentBalance
  }]
}

function spreadMonthsToYears(contribution) {
  if (!contribution || !contribution.totalMonths) return []
  const startYear = contribution.startYear || 2000
  const startMonth = contribution.startMonth || 1
  let remaining = contribution.totalMonths
  let y = startYear
  let m = startMonth
  const result = []
  while (remaining > 0) {
    const monthsThisYear = (13 - m)
    const mm = Math.min(remaining, monthsThisYear > 0 ? monthsThisYear : 12)
    result.push({ year: y, months: mm })
    remaining -= mm
    y += 1
    m = 1
  }
  return result
}

// ════════════════════════════════════════════════════════
//  工具函数
// ════════════════════════════════════════════════════════

function round4(n) { return Math.round(n * 10000) / 10000 }
function round2(n) { return Math.round(n * 100) / 100 }

// ════════════════════════════════════════════════════════

/**
 * 反推模式②：已知当前月缴费基数 -> 反推历年基数 + 平均指数 + 账户余额
 */
/**
 * 反推用：按目标（或换算出的）指数合成历年缴费基数序列。
 *
 * ⚠️ 2026-10-29 修正两件事：
 *   1) hist 必须 resolveSalaryHist —— 广东等省是 {prov, 市} 嵌套，直接取会全部落空，
 *      旧版因此抛「无有效社平数据」（既有 bug）。
 *   2) 7-6 式省份（粤/沪/鄂/吉）合成时**直接生成上下半年两条**，而不是塞一个平均值。
 *      否则正向重算会有 g²/4 的二阶偏差（实测 0.3%~0.5%）。
 */
function synthRowsByIndex(provinceCode, salaryHist, span, indexValue) {
  const split = SOCIAL_YEAR_SPLIT[provinceCode] || null
  const rule = mergedRule(provinceCode)
  const out = []
  for (const s of span) {
    if (split && s.months >= 12) {
      const d1 = resolveDenom(rule, salaryHist, s.year - 1)
      const d2 = resolveDenom(rule, salaryHist, s.year)
      if (d1 && d1 > 0 && d2 && d2 > 0) {
        out.push({ year: s.year, months: 6, baseAvg: d1 * indexValue, startMonth: 1 })
        out.push({ year: s.year, months: 6, baseAvg: d2 * indexValue, startMonth: 7 })
        continue
      }
    }
    const d = blendedSocialAvg(provinceCode, salaryHist, s.year)
    if (d && d > 0) out.push({ year: s.year, months: s.months, baseAvg: d * indexValue })
  }
  return out
}

function inferYearlyFromCurrentBase({ provinceConfig, provinceCode, startYear, startMonth, totalMonths, currentBase, gapYearCountsInAvg = null }) {
  const salaryHist = resolveSalaryHist(provinceConfig.avg_salary_history, null)
  const span = spreadMonthsToYears({ startYear, startMonth, totalMonths })
  if (!span || span.length === 0) return { error: '无法构建缴费年度序列，请检查首缴年月与缴费月数。' }
  const endYear = span[span.length - 1].year
  const endSocialDenom = blendedSocialAvg(provinceCode, salaryHist, endYear)
  if (!endSocialDenom || endSocialDenom <= 0) return { error: '缺少缴费期末年（' + endYear + '年）的社平数据，无法用当前基数换算。' }
  if (!(currentBase > 0)) return { error: '当前月缴费基数必须大于 0。' }
  const currentIndex = currentBase / endSocialDenom
  const synth = synthRowsByIndex(provinceCode, salaryHist, span, currentIndex)
  if (synth.length === 0) return { error: '无有效社平数据，无法反推历年基数。' }
  const fwd = calculateIndex({ provinceConfig, provinceCode, contribution: synth, granularity: 'A', gapYearCountsInAvg })
  if (fwd.error) return { error: fwd.error }
  fwd._meta = Object.assign({}, fwd._meta, { reverseMode: 'currentBase', currentIndex: round4(currentIndex), currentBase: round4(currentBase), currentYear: endYear })
  return fwd
}

/**
 * 反推模式③：已知目标平均指数 -> 反推历年应缴基数
 */
function inferYearlyFromTargetIndex({ provinceConfig, provinceCode, startYear, startMonth, totalMonths, targetIndex, gapYearCountsInAvg = null }) {
  const salaryHist = resolveSalaryHist(provinceConfig.avg_salary_history, null)
  const span = spreadMonthsToYears({ startYear, startMonth, totalMonths })
  if (!span || span.length === 0) return { error: '无法构建缴费年度序列，请检查首缴年月与缴费月数。' }
  if (!(targetIndex > 0)) return { error: '目标平均指数必须大于 0。' }
  const synth = synthRowsByIndex(provinceCode, salaryHist, span, targetIndex)
  if (synth.length === 0) return { error: '无有效社平数据，无法反推历年基数。' }
  const fwd = calculateIndex({ provinceConfig, provinceCode, contribution: synth, granularity: 'A', gapYearCountsInAvg })
  if (fwd.error) return { error: fwd.error }
  fwd._meta = Object.assign({}, fwd._meta, { reverseMode: 'targetIndex', targetIndex: round4(targetIndex), appliedIndex: round4(targetIndex) })
  return fwd
}

// ════════════════════════════════════════════════════════
//  导出
// ════════════════════════════════════════════════════════

module.exports = {
  // 核心 API
  calculateIndex,
  inferIndexFromBalance,
  inferYearlyFromCurrentBase,
  inferYearlyFromTargetIndex,
  spreadMonthsToYears,

  // 辅助
  getRate,
  getSocialAvg,
  getDenominator,
  resolveDenom,
  blendedSocialAvg,
  mergedRule,
  applyCap,
  indexWeightUnits,
  INDEX_WEIGHT_RULES,
  SOCIAL_YEAR_SPLIT,
  buildYearSegments,
  splitBySocialYear,
  payableMonthsOf,
  outOfRangeFlag,
  shanghaiFloor,
  resolveSalaryHist,
  normalizeToYearly,

  // 规则表
  PROVINCE_RULES,
  GUANGDONG_SIGHT_INDEX_MAP,

  // 数据
  UNIFIED_RATES,

  // 元信息
  version: '2.1.1',
  date: '2026-08-15',
  source: '剪刀财经《缴费基数&记账利率 1996-2025年》+ 31省官网缴费指数规则(四方印证) + 粤府函〔2021〕294号 D值表'
}
