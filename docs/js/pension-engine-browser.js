/**
 * 养老金测算统一引擎
 * 参数化驱动架构 — 所有参保地区差异通过配置文件实现，计算逻辑完全独立
 *
 * 设计原则：
 * 1. 同一组输入数据，无论在小程序端还是网页端，测算结果必须完全一致
 * 2. 新增省份仅需添加配置文件，无需修改任何计算逻辑
 * 3. 计算逻辑与数据完全分离，便于单元测试和验证
 *
 * 使用方式：
 *   const engine = require('./pension-engine')
 *   const config = require('../data/provinces/jilin.json')
 *   const result = engine.calculate(config, inputData)
 */

// ==================== 全国统一个人账户记账利率表（2016年起） ====================

/**
 * 全国统一的养老保险个人账户记账利率（2016年起由人社部、财政部统一公布）
 * 数据来源：人社部、财政部官方文件
 * 采用复利计算
 *
 * 2016年之前由各省自行制定，数据在省份配置文件的 interest_rates 字段中
 */
const NATIONAL_INTEREST_RATES = {
  2016: 0.0831,
  2017: 0.0712,
  2018: 0.0829,
  2019: 0.0761,
  2020: 0.0604,
  2021: 0.0669,
  2022: 0.0612,
  2023: 0.0397,
  2024: 0.0262,
  2025: 0.0150
}

// ==================== 核心计算函数 ====================

/**
 * 计算基础养老金
 * 公式：(退休地计发基数 + 全省计发基数 × 指数) / 2 × 累计缴费年限 × 1%
 * 
 * @param {Object} params - 计算参数
 * @param {number} params.retireBase - 退休地计发基数（元/月）
 * @param {number} params.provBase - 全省计发基数（元/月）
 * @param {number} params.avgIndex - 平均缴费工资指数
 * @param {number} params.totalYears - 累计缴费年限（含视同缴费）
 * @param {Object} params.mod - 模块配置
 * @returns {Object} 计算结果 { amount, description }
 */
function calcBasicPension(params) {
  const { retireBase, provBase, avgIndex, totalYears, mod } = params
  if (!mod || !mod.enabled) return { amount: 0, description: '未启用' }

  const rate = mod.rate_per_year || 0.01
  let amount
  let description

  if (mod.formula_type === 'henan') {
    // 河南特殊：指数化工资 = 退休地计发基数 × 平均缴费指数
    // 公式：(退休地计发基数 + 退休地计发基数 × 指数) / 2 × 累计缴费年限 × 1%
    const indexSalary = retireBase * avgIndex
    amount = Math.round((retireBase + indexSalary) / 2 * totalYears * rate * 100) / 100
    description = `(${retireBase.toLocaleString()} + ${retireBase.toLocaleString()} × ${avgIndex.toFixed(2)}) / 2 × ${totalYears.toFixed(2)}年 × ${(rate * 100).toFixed(2)}% = ${amount.toFixed(2)}元`
  } else if (mod.formula_type === 'chongqing') {
    // 重庆特殊（渝办发〔2006〕205号）：基础 = (社平 + 社平×Q) / 2 × 年限 × 1%
    // A = 上年度全市在岗职工月平均工资，非计发基数；由 params.socialAvgBase 传入
    const socialAvg = params.socialAvgBase || retireBase
    amount = Math.round((socialAvg + socialAvg * avgIndex) / 2 * totalYears * rate * 100) / 100
    description = `(¥${socialAvg.toLocaleString()} + ¥${socialAvg.toLocaleString()} × ${avgIndex.toFixed(2)}) / 2 × ${totalYears.toFixed(2)}年 × ${(rate * 100).toFixed(2)}% = ${amount.toFixed(2)}元`
  } else {
    // 默认公式：(退休地计发基数 + 全省计发基数 × 指数) / 2 × 累计缴费年限 × 1%
    amount = Math.round((retireBase + provBase * avgIndex) / 2 * totalYears * rate * 100) / 100
    description = `(${retireBase.toLocaleString()} + ${provBase.toLocaleString()} × ${avgIndex.toFixed(2)}) / 2 × ${totalYears.toFixed(2)}年 × ${(rate * 100).toFixed(2)}% = ${amount.toFixed(2)}元`
  }

  return { amount, description }
}

/**
 * 计算增发基础养老金
 * 触发条件：实际缴费年限 > 阈值
 * 分段计算：累计缴费年限（含视同缴费）分段
 * 
 * @param {Object} params - 计算参数
 * @param {number} params.avgBase - 计发基数平均值
 * @param {number} params.actualYears - 实际缴费年限（用于触发判断）
 * @param {number} params.totalYears - 累计缴费年限（用于分段计算）
 * @param {Object} params.mod - 模块配置（含brackets分段规则）
 * @returns {Object} 计算结果 { amount, description, bracketDetails }
 */
function calcExtraPension(params) {
  const { avgBase, actualYears, totalYears, mod, retireBase, avgIndex } = params
  if (!mod || !mod.enabled) return { amount: 0, description: '未启用', bracketDetails: [] }

  // 四川增发养老金（川劳社发〔2006〕17号）：
  // 月增发养老金 = 指数化月平均缴费工资 × 增发比例 × 累计缴费年限
  // 增发比例因人而异：独生子女0.1%、2005年底前工作0.1%、艰苦边远地区0.1%等，合计0.1%~0.4%+
  if (mod.formula_type === "sichuan") {
    const rBase = retireBase || 0
    const idx = avgIndex || 0
    const indexSalary = rBase * idx
    const calcYears = totalYears || actualYears
    // 支持通过 params.extraRate 传入自定义比例（如0.004），否则用配置默认值
    const rate = params?.extraRate != null ? params.extraRate : (mod.rate || 0.001)
    const amount = Math.round(indexSalary * rate * calcYears * 100) / 100

    const desc = '四川增发养老金: ' + indexSalary.toFixed(2) + ' × ' + (rate * 100).toFixed(1)
               + '% × ' + calcYears.toFixed(2) + '年 = ' + amount.toFixed(2) + '元'
    return { amount, description: desc, bracketDetails: [] }
  }

  // 检查触发条件（看实际缴费年限）
  let triggerType = mod.trigger?.type || 'actual_years'
  let threshold = mod.trigger?.threshold || 20

  let exceeds = false

  if (triggerType === 'actual_years') {
    exceeds = actualYears > threshold
  } else if (triggerType === 'total_years') {
    exceeds = (totalYears || actualYears) > threshold
  }

  if (!exceeds) {
    return {
      amount: 0,
      description: `未触发（实际缴费${actualYears.toFixed(2)}年 ≤ 阈值${threshold}年）`,
      bracketDetails: []
    }
  }

  // 分段计算使用累计缴费年限（含视同缴费）
  const calcYears = totalYears || actualYears
  const brackets = mod.brackets || []
  let totalAmount = 0
  let bracketDetails = []
  let totalCoefficient = 0

  for (const bracket of brackets) {
    let segmentYears = 0
    if (calcYears >= bracket.from) {
      // 优先使用bracket.years（如果已显式指定，如吉林的{ from:21, years:5 })
      // 否则用原来的计算方式
      if (bracket.years !== null && bracket.years !== undefined) {
        // years字段已指定：直接使用
        // 有上限段：段宽 = years，但不能超过实际覆盖的年数
        // 无上限段：段宽 = calcYears - from + 1（含from这一年）
        if (bracket.to === null) {
          // 无上限段：直接用 calcYears - from + 1
          segmentYears = Math.max(calcYears - bracket.from + 1, 0)
        } else {
          // 有上限段：取 years 和（实际覆盖年数）的较小值
          const actual = Math.max(calcYears - bracket.from + 1, 0)
          segmentYears = Math.min(actual, bracket.years)
        }
        if (segmentYears < 0) segmentYears = 0
      } else {
        // 未指定years（如无上限段）：用累计缴费年限动态计算，含from这一年
        if (bracket.to !== null) {
          // 有上限段：段宽 = to - from + 1（含from这一年）
          segmentYears = Math.min(calcYears, bracket.to) - bracket.from + 1
        } else {
          // 无上限段：超过from年的部分，含from这一年
          segmentYears = Math.max(calcYears - bracket.from + 1, 0)
        }
      }

      if (segmentYears > 0) {
        const contribution = segmentYears * bracket.rate
        totalAmount += avgBase * contribution
        totalCoefficient += contribution
        bracketDetails.push({
          range: `${bracket.from}-${bracket.to === null ? '以上' : bracket.to}`,
          years: segmentYears,
          rate: bracket.rate,
          contribution: contribution,
          amount: Math.round(avgBase * contribution * 100) / 100
        })
      }
    }
  }

  totalAmount = Math.round(totalAmount * 100) / 100

  return {
    amount: totalAmount,
    description: `实际缴费${actualYears.toFixed(2)}年>阈值${threshold}年，累计${calcYears.toFixed(2)}年分段系数${totalCoefficient.toFixed(4)}`,
    bracketDetails
  }
}

/**
 * 计算个人账户养老金
 * 公式：个人账户累计储存额 ÷ 计发月数
 * 
 * 累计储存额计算逻辑：
 * 1. 从个人账号建立时间开始计算
 * 2. 每年存入：当年缴费基数 × 个人缴费比例（8%）× 12
 * 3. 每年结转：上年末累计 × (1 + 当年记账利率) + 本年存入
 * 4. 最后一年的部分月份按月计提并单利计息
 * 
 * @param {Object} params - 计算参数
 * @param {string} params.city - 参保城市标识（'cc'=长春, 'prov'=全省其他）
 * @param {number} params.avgIndex - 平均缴费工资指数
 * @param {Object} params.retireDate - 退休日期 { year, month }
 * @param {Object} params.startInfo - 起始信息 { accountStart, actualStart, sightYears }
 * @param {Object} params.config - 省份配置
 * @param {number} params.months - 计发月数
 * @param {number} [params.personalAccInput] - 用户直接输入的个人账户余额（可选）
 * @returns {Object} 计算结果 { amount, balance, description }
 */
function calcPersonalAccountPension(city, avgIndex, retireDate, startInfo, config, months, personalAccInput) {

  if (personalAccInput != null && personalAccInput > 0) {
    const amount = Math.round(personalAccInput / months * 100) / 100
    return {
      amount,
      balance: personalAccInput,
      description: `用户输入余额 ${personalAccInput.toLocaleString()} 元 ÷ ${months} = ${amount.toFixed(2)}元`
    }
  }

  const { accountStart, actualStart } = startInfo
  if (!actualStart || !retireDate) {
    return { amount: 0, balance: 0, description: '无缴费起始信息' }
  }

  // 确定个人账户实际开始时间
  let accStart = { ...accountStart }
  if (actualStart.year < accStart.year ||
      (actualStart.year === accStart.year && actualStart.month < accStart.month)) {
    accStart = { ...actualStart }
  }

  // 如果退休时间在账户开始时间之前
  if (retireDate.year < accStart.year ||
      (retireDate.year === accStart.year && retireDate.month <= accStart.month)) {
    return { amount: 0, balance: 0, description: '退休时个人账户尚未建立' }
  }

  // 累计储存额计算
  let totalAcc = 0
  let fYear = accStart.year
  let fMonth = accStart.month

  // 第一年（可能只有部分月份）
  let firstMonths = 12 - fMonth + 1
  if (firstMonths > 0 && firstMonths < 12) {
    const baseY = getBase(city, fYear, config)
    const monthPayY = baseY * avgIndex * 0.08
    const accRateY = getAccRate(fYear, config)
    totalAcc = (totalAcc + monthPayY * firstMonths) * (1 + accRateY)
  }

  // 中间年份（完整年度，复利计息）
  for (let y = fYear + 1; y < retireDate.year; y++) {
    const baseYear = getBase(city, y, config)
    const annualPay = baseYear * avgIndex * 0.08 * 12
    const accRate = getAccRate(y, config)
    totalAcc = (totalAcc + annualPay) * (1 + accRate)
  }

  // 最后一年（从退休月初到退休月，按月计提并单利计息）
  const lastMonths = retireDate.month - 1
  if (lastMonths > 0) {
    const baseRetire = getBase(city, retireDate.year, config)
    const monthPay = baseRetire * avgIndex * 0.08
    const rate = getAccRate(retireDate.year, config)
    totalAcc = (totalAcc + monthPay * lastMonths) * Math.pow(1 + rate, lastMonths / 12)
  }

  totalAcc = Math.round(totalAcc * 100) / 100
  const amount = Math.round(totalAcc / months * 100) / 100

  return {
    amount,
    balance: totalAcc,
    description: `${fYear}.${fMonth}-${retireDate.year}.${retireDate.month} 按记账利率复利估算，余额 ${totalAcc.toLocaleString(undefined, {maximumFractionDigits: 0})} 元 ÷ ${months} 月 = ${amount.toFixed(2)}元`
  }
}

/**
 * 计算过渡性养老金
 * 公式：全省计发基数 × 视同缴费年限 × 指数 × 系数
 * 
 * 系数选择逻辑：
 * - 实际缴费年限 > 20年：使用较高系数
 * - 实际缴费年限 ≤ 20年：使用较低系数
 * 
 * @param {Object} params - 计算参数
 * @param {number} params.provBase - 全省计发基数
 * @param {number} params.sightYears - 视同缴费年限
 * @param {number} params.avgIndex - 平均缴费工资指数
 * @param {number} params.actualYears - 实际缴费年限
 * @param {Object} params.mod - 模块配置（含过渡性系数）
 * @returns {Object} 计算结果 { amount, description }
 */
function calcTransitionalPension(params) {
  const { provBase, sightYears, avgIndex, actualYears, totalYears, mod, preAccountYears, transIndex } = params
  // 天津/江苏等双指数省份：过渡性养老金使用 transIndex（如天津的"全部平均工资指数"）
  const transIdx = (transIndex != null && transIndex > 0) ? transIndex : avgIndex
  if (!mod || !mod.enabled) return { amount: 0, description: '未启用' }
  // 云南特色：用建账前缴费年限替代视同缴费年限
  const effectiveYears = (preAccountYears != null && preAccountYears > 0) ? preAccountYears : sightYears
  if (!effectiveYears || effectiveYears <= 0) return { amount: 0, description: '无视同缴费年限' }

  // 北京特殊公式：过渡性养老金 = G同 + G实（京劳社养发〔1998〕21号）
  // G同：1992年10月前的视同缴费年限 → 用 sightYears
  // G实：1992年10月~1998年6月（cutoff）的实际缴费年限 → 用 preAccountYears（建账前实际缴费年限）
  if (mod.formula_type === "beijing") {
    const coef = mod.coefficient || 0.01
    // G同 = 全省基数 × 建账前视同年限 × 1.0 × 系数（1992.10前工龄）
    const G_tong = provBase * (sightYears || 0) * 1.0 * coef
    // G实 = 全省基数 × 建账前实际缴费年限（建账后~cutoff） × Z实指数 × 系数
    const preAcct = (preAccountYears != null && preAccountYears > 0) ? preAccountYears : 0
    // G实用 Z实指数（transIndex），可能与基础养老金指数不同
    const zshiIdx = (transIndex != null && transIndex > 0) ? transIndex : avgIndex
    const G_shi  = provBase * preAcct * zshiIdx * coef
    const amount  = Math.round((G_tong + G_shi) * 100) / 100
    const desc   = 'G同' + (sightYears || 0).toFixed(2) + '年×1.0=' + G_tong.toFixed(2)
                    + ' + G实' + preAcct.toFixed(2) + '年×指数' + avgIndex.toFixed(4) + '=' + G_shi.toFixed(2)
                    + '，系数' + (coef * 100).toFixed(1) + '%'
    return { amount, description: desc }
  }

  // 上海特殊公式（沪人社规〔2021〕32号）：
  // 过渡性养老金 = 上年度全市月平均工资 × 1.0 × 1992年底前视同缴费年限 × 1.2% + 虚账实记总额 ÷ 120
  if (mod.formula_type === "shanghai") {
    const retireBase = params?.retireBase || provBase
    const sight = params?.sightYears || effectiveYears
    const coefSH = mod.coefficient || 0.012
    const xuzhang = params?.xuzhang || 0

    const basePart = retireBase * sight * 1.0 * coefSH
    const xuzhangPart = xuzhang > 0 ? xuzhang / 120 : 0
    const amount = Math.round((basePart + xuzhangPart) * 100) / 100

    let desc = '上海过渡性养老金: ' + retireBase.toFixed(2) + ' × 1.0 × ' + sight.toFixed(2) + '年 × 1.2%'
    if (xuzhang > 0) {
      desc += ' + ' + xuzhang.toFixed(2) + ' ÷ 120'
    }
    desc += ' = ' + amount.toFixed(2) + '元'
    return { amount, description: desc }
  }

  // 江苏特殊公式（苏政发〔2023〕?号）：
  // 过渡性养老金 = 退休时上年度全省在岗职工月平均工资 × 1996年底前平均缴费工资指数 × 1996年底前缴费年限 × 1.2%
  // 过渡期政策（2024-2026年）：新老办法差额按比例逐年发放
  if (mod.formula_type === "jiangsu") {
    const retireBase = params?.retireBase || provBase
    const transIdx = params?.transIndex || avgIndex
    const pre96 = params?.pre1996Years || 0
    const coefJS = mod.coefficient || 0.012
    const retireYear = params?.retireYear || new Date().getFullYear()

    if (pre96 <= 0) return { amount: 0, description: '1996年底前无缴费年限' }

    const amountNew = Math.round(retireBase * transIdx * pre96 * coefJS * 100) / 100

    // 新老办法并存，过渡期政策
    const oldMethod = params?.transPensionOld || 0
    let finalAmount

    if (amountNew > oldMethod) {
      // 新办法高于原办法，按过渡期比例发放差额
      let ratio
      if (retireYear === 2024) {
        ratio = 0.40  // 2024年：40%
      } else if (retireYear === 2025) {
        ratio = 0.70  // 2025年：70%
      } else {
        ratio = 1.00  // 2026年及以后：100%
      }
      const diff = amountNew - oldMethod
      finalAmount = Math.round((oldMethod + diff * ratio) * 100) / 100

      let desc = '江苏过渡性养老金: 新办法=' + amountNew.toFixed(2) + '元，原办法=' + oldMethod.toFixed(2) + '元'
      desc += '，差额=' + diff.toFixed(2) + '元，' + retireYear + '年发放比例' + (ratio * 100).toFixed(0) + '%'
      desc += '，实际=' + finalAmount.toFixed(2) + '元'
      return { amount: finalAmount, description: desc }
    } else {
      // 原办法高于或等于新办法，按原办法发放
      finalAmount = oldMethod
      return {
        amount: finalAmount,
        description: '江苏过渡性养老金: 新办法=' + amountNew.toFixed(2) + '元，原办法=' + oldMethod.toFixed(2) + '元，取原办法=' + finalAmount.toFixed(2) + '元'
      }
    }
  }

  // 四川特殊公式（川劳社发〔2006〕17号）：
  // 过渡性养老金 = (月计发基数 + 指数化月平均缴费工资) ÷ 2 × 1995年底前未建账缴费年限 × 1.3%
  if (mod.formula_type === "sichuan") {
    const retireBase = params?.retireBase || provBase
    const indexSalary = retireBase * avgIndex
    const pre95Years = (params?.preAccountYears != null && params.preAccountYears > 0) ? params.preAccountYears : 0
    const coefSC = mod.coefficient || 0.013

    if (pre95Years <= 0) return { amount: 0, description: '1995年底前无未建账缴费年限' }

    const avgBase = (retireBase + indexSalary) / 2
    const amount = Math.round(avgBase * pre95Years * coefSC * 100) / 100

    const desc = '四川过渡性养老金: (' + retireBase.toFixed(2) + ' + ' + indexSalary.toFixed(2) + ') ÷ 2 × '
               + pre95Years.toFixed(2) + '年 × ' + (coefSC * 100).toFixed(1) + '% = ' + amount.toFixed(2) + '元'
    return { amount, description: desc }
  }

  // 河南特殊公式：指数化工资 = 退休地计发基数 × 过渡性指数（非全省基数）
  // 公式：退休地计发基数 × 过渡性指数 × 视同缴费年限 × 系数
  if (mod.formula_type === "henan") {
    const retireBase = params?.retireBase || provBase
    const indexSalary = retireBase * transIdx
    const amount = Math.round(indexSalary * effectiveYears * mod.coefficient * 100) / 100
    const desc = `指数化工资${indexSalary.toFixed(2)} × 视同${effectiveYears.toFixed(2)}年 × ${(mod.coefficient * 100).toFixed(1)}% = ${amount.toFixed(2)}元`
    return { amount, description: desc }
  }

  // 重庆特殊公式（渝办发〔2006〕205号）：
  // 过渡性养老金 = (A + A×Q) / 2 × M1 × 1.4%
  // 其中 A = 计发基数（退休地基数），Q = 平均缴费指数，M1 = 建账前缴费年限
  if (mod.formula_type === "chongqing") {
    const retireBase = params?.retireBase || provBase
    const avgBase = (retireBase + retireBase * transIdx) / 2
    const amount = Math.round(avgBase * effectiveYears * mod.coefficient * 100) / 100
    const desc = `过渡: (${retireBase.toLocaleString()} + ${retireBase.toLocaleString()}×${transIdx.toFixed(4)})÷2 × ${effectiveYears.toFixed(2)}年 × ${(mod.coefficient * 100).toFixed(1)}% = ${amount.toFixed(2)}元`
    return { amount, description: desc }
  }

  // 通用公式：全省计发基数 × 缴费年限 × 指数 × 系数
  // 兼容三种格式：
  // 1. 新格式（固定系数）：mod.coefficient
  // 2. 新格式（JS模块）：mod.get（函数），或 mod.base, mod.alt
  // 3. 旧格式（JSON）：mod.coefficient_over_20, mod.coefficient_under_20
  let coef;
  if (mod.coefficient !== undefined) {
    // 固定系数；宁夏知识分子加0.13%
    coef = (params?.intellectual && mod.coefficient_intellectual)
      ? mod.coefficient_intellectual : mod.coefficient;
  } else if (typeof mod.get === 'function') {
    // 新格式：调用 get() 方法
    coef = mod.get(actualYears);
  } else if (mod.base !== undefined && mod.alt !== undefined) {
    // 新格式：使用 base/alt 属性
    coef = actualYears > 20 ? mod.base : mod.alt;
  } else {
    // 旧格式：使用 coefficient_over_20 / coefficient_under_20
    coef = actualYears > 20 ? mod.coefficient_over_20 : mod.coefficient_under_20;
  }
  const amount = Math.round(provBase * effectiveYears * transIdx * coef * 100) / 100;

  const yearsLabel = (preAccountYears != null && preAccountYears > 0) ? '建账前' : '视同'
  const yearsValue = (preAccountYears != null && preAccountYears > 0) ? preAccountYears : sightYears

  return {
    amount,
    description: `${yearsLabel}${yearsValue.toFixed(2)}年 × 全省基数${provBase.toLocaleString()} × 指数${transIdx.toFixed(2)} × 系数${(coef * 100).toFixed(1)}% = ${amount.toFixed(2)}元`
  }
}

/**
 * 计算特殊增发（如高龄增发、艰苦边远地区增发等）
 * @param {Object} params - 计算参数
 * @param {Object} params.mod - 模块配置
 * @param {Object} params.context - 其他上下文信息
 * @returns {Object} 计算结果 { amount, description }
 */
function calcSpecialAddition(params) {
  const mod = params?.mod
  if (!mod || !mod.enabled) return { amount: 0, description: '未启用' }

  // 特殊增发模块支持多种类型
  if (mod.type === 'age') {
    // 高龄增发
    const age = params?.context?.retireAge || 0
    const bracket = mod.brackets?.find(b => age >= b.from && age < (b.to || 120))
    if (bracket) {
      return {
        amount: bracket.amount || 0,
        description: `高龄增发：${age}岁，月增 ${bracket.amount || 0} 元`
      }
    }
  } else if (mod.type === 'hardship') {
    // 艰苦边远地区增发
    const location = params?.context?.location || ''
    const addition = mod.amounts?.[location] || 0
    return {
      amount: addition,
      description: `艰苦边远地区增发：月增 ${addition} 元`
    }
  } else if (mod.type === 'fixed') {
    // 固定金额补贴（如黑龙江御寒津贴）
    const amount = mod.amount || 0
    const label = mod.label || '固定补贴'
    return {
      amount: amount,
      description: `${label}：月增 ${amount} 元`
    }
  } else if (mod.type === 'manual') {
    // 手动选择增发项目（如黑龙江御寒津贴、吉林劳模/职称、各省独生子女等）
    const selectedItems = params?.context?.items || []
    let totalAmount = 0
    const descParts = []
    selectedItems.forEach(sel => {
      const found = mod.items?.find(i => i.id === sel.id)
      if (found) {
        const amt = sel.amount != null ? sel.amount : found.defaultAmount || 0
        totalAmount += amt
        descParts.push(`${found.name}：${amt}元`)
      }
    })
    return {
      amount: totalAmount,
      description: descParts.length > 0 ? `特殊增发：${descParts.join('，')}` : '未选择增发项目'
    }
  } else if (mod.type === 'one_child') {
    // 独生子女补贴：全省退休人员人均养老金 × 比例
    // 云南：云人社发〔2023〕41号，比例 5%
    const retireYear = params?.context?.retireYear || 2025;
    const avgPensionData = mod.avgPensionData || {};
    const avgPension = avgPensionData[retireYear] || avgPensionData[2023] || 0;
    const rate = mod.rate || 0.05;
    const amount = Math.round(avgPension * rate * 100) / 100;
    return {
      amount,
      description: `独生子女补贴：全省人均养老金${avgPension}元(${retireYear}年) × ${(rate * 100)}% = ${amount.toFixed(2)}元`
    }
  }

  return { amount: 0, description: '未满足增发条件' }
}

/**
 * 计算调节金（如甘肃省：建账前视同缴费年限≥15年，+15元/月）
 * @param {Object} params - { mod, sightYears }
 * @returns {Object} { amount, description }
 */
function calcAdjustmentFund(params) {
  const mod = params?.mod
  if (!mod || !mod.enabled) return { amount: 0, description: '未启用' }

  const sightYears = params?.sightYears || 0
  const threshold = mod.threshold_years || 15
  const amount = mod.amount || 15

  if (sightYears >= threshold) {
    return {
      amount: amount,
      description: `调节金：建账前视同缴费年限${sightYears.toFixed(2)}年≥${threshold}年，月增${amount}元`
    }
  }
  return { amount: 0, description: `调节金：建账前视同缴费年限${sightYears.toFixed(2)}年<${threshold}年，不增发` }
}

// ==================== 退休时间计算 ====================

/**
 * 获取计发月数（精确到月份，直接查表）
 * @param {number} ageExact - 退休年龄（精确到小数点，如50.0833）
 * @param {Object} config - 省份配置
 * @returns {number} 计发月数
 */
function getRetireMonths(ageExact, config) {
  const table = config.monthly_payment_months || {}

  // 将精确年龄四舍五入到小数点后1位（月份），用于直接查表
  // 注意：表键格式为 "50.0"、"51.1" 等（有小数点），需确保格式一致
  const keyAge = Math.round(ageExact * 10) / 10
  // 整数部分直接写 .0，例如 50 → "50.0"，50.1 → "50.1"
  const keyStr = keyAge % 1 === 0 ? keyAge + '.0' : String(keyAge)

  if (table[keyStr] !== undefined) return table[keyStr]

  // 回退默认值
  return 139
}

/**
 * 获取延迟退休月数（依据：国办发〔2025〕5号）
 * @param {number} birthYear - 出生年份
 * @param {number} birthMonth - 出生月份
 * @param {string} type - 人员类型 'male'(男)/'fc'(女干部)/'fw50'(女工人50岁)/'fw55'(灵活就业女55岁)
 * @param {Object} config - 省份配置（含delay_retirement.effective_date）
 * @returns {number} 延迟月数
 */
function getDelayMonths(birthYear, birthMonth, type, config) {
  // 防御：config 可能未传入
  config = config || {};
  // 女性工人（50岁退休）不受延迟退休政策影响
  if (type === 'fw50' || type === 'fw') return 0;
  // 检查延迟退休政策是否生效（以退休日期为准）
  // effective_date格式：YYYY-MM-DD
  const delayConfig = config.delay_retirement || {}
  if (delayConfig.effective_date) {
    let baseAge
    switch (type) {
      case 'male': baseAge = 60; break
      case 'fc': baseAge = 55; break
      case 'fw55': baseAge = 55; break
      case 'fw': baseAge = 50; break
      default: baseAge = 50
    }
    const [effY, effM] = delayConfig.effective_date.split('-').map(Number)
    // 精确计算法定退休日期（不含延迟）
    const baseAgeY = Math.floor(baseAge)
    const baseAgeM = baseAge - baseAgeY
    let retireMonth = birthMonth + baseAgeM * 12
    const retireYear = birthYear + baseAgeY + Math.floor(retireMonth / 12)
    retireMonth = retireMonth % 12 || 12

    // 判断：法定退休日期 < 政策生效日期 → 不延迟
    if (retireYear < effY) return 0
    if (retireYear === effY && retireMonth < effM) return 0
    // 退休日期 >= 生效日期（含生效当月及之后）→ 适用延迟退休
  }

  let baseYear, step, cap

  // 引擎类型标识 → 配置文件键名映射
  const delayKeyMap = { 'male': 'male', 'fc': 'female_cadre', 'fw': 'female_worker', 'fw55': 'female_worker' }
  const delayConfigKey = delayKeyMap[type] || type

  // 优先使用配置文件的参数
  const typeConfig = delayConfig[delayConfigKey] || {}
  if (typeConfig.base_year !== undefined) {
    baseYear = typeConfig.base_year
    step = typeConfig.step
    cap = typeConfig.cap_months
  } else {
    // 默认参数
    switch (type) {
      case 'male':
        baseYear = 1965; step = 4; cap = 36  // 男职工延迟36个月
        break
      case 'fc':
        baseYear = 1970; step = 4; cap = 36  // 女干部延迟36个月
        break
      case 'fw55':
        baseYear = 1975; step = 2; cap = 60  // 灵活就业女55岁退休
        break
      case 'fw':
        baseYear = 1975; step = 2; cap = 60  // 女工人50岁退休
        break
      default:
        return 0
    }
  }

  if (birthYear < baseYear) return 0

  // 计算出生年月与基准年份的差值（月）
  const diff = (birthYear - baseYear) * 12 + (birthMonth - 1)
  if (diff <= 0) return 0

  // 阶梯计算延迟月数
  const delay = Math.floor((diff - 1) / step) + 1
  return Math.min(delay, cap)
}

/**
 * 计算法定退休总月数
 * @param {number} birthYear - 出生年份
 * @param {number} birthMonth - 出生月份
 * @param {string} type - 人员类型
 * @returns {number} 退休总月数
 */
function getRetireTotalMonths(birthYear, birthMonth, type, config, skipDelay) {
  let baseAge

  switch (type) {
    case 'male':
      baseAge = 60
      break
    case 'fc':
      baseAge = 55
      break
    case 'fw':           // 女性工人，50岁退休（默认女性类型，来自parseInput）
    case 'fw50':         // 女性工人，50岁退休
      baseAge = 50
      break
    case 'fw55':         // 灵活就业女性，55岁退休
      baseAge = 55
      break
    default:
      baseAge = 60
  }

  if (skipDelay) return baseAge * 12
  const delay = getDelayMonths(birthYear, birthMonth, type, config)
  return baseAge * 12 + delay
}

// 内部辅助函数：计算延迟后退休（不截断到原法定年龄）
function getRetireTotalMonthsFlex(birthYear, birthMonth, type, maxDelay, config) {
  let baseAge

  switch (type) {
    case 'male':
      baseAge = 60
      break
    case 'fc':
      baseAge = 55
      break
    case 'fw55':       // 灵活就业女性，55岁退休
      baseAge = 55
      break
    case 'fw50':       // 女工人，50岁退休
      baseAge = 50
      break
    default:
      baseAge = 60
  }

  const delay = getDelayMonths(birthYear, birthMonth, type, config)
  // 弹性提前退休：最多比法定延迟少36个月
  return Math.max(baseAge * 12, baseAge * 12 + delay - maxDelay)
}

/**
 * 计算退休日期
 * @param {number} birthYear - 出生年份
 * @param {number} birthMonth - 出生月份
 * @param {number} totalMonths - 退休年龄总月数
 * @returns {Object} 退休日期 { year, month }
 */
function getRetireDate(birthYear, birthMonth, totalMonths) {
  const year = birthYear + Math.floor(totalMonths / 12)
  const month = birthMonth + (totalMonths % 12)

  return {
    year,
    month: month > 12 ? month - 12 : month
  }
}

/**
 * 获取退休年龄文字描述
 * @param {number} totalMonths - 退休总月数
 * @returns {string} 年龄文字
 */
function getAgeStr(totalMonths) {
  const years = Math.floor(totalMonths / 12)
  const remain = totalMonths % 12
  if (remain > 0) return `${years}岁${remain}个月`
  return `${years}岁`
}

/**
 * 获取退休日期文字描述
 * @param {Object} date - 日期对象
 * @returns {string} 日期文字
 */
function getDateStr(date) {
  return `${date.year}.${date.month < 10 ? '0' : ''}${date.month}`
}

/**
 * 获取最小缴费年限
 * @param {number} retireYear - 退休年份
 * @param {Object} config - 省份配置
 * @returns {number} 最小缴费年限
 */
function getMinYears(retireYear, config) {
  const minYearsTable = config.min_years || {}
  if (minYearsTable[retireYear] !== undefined) return minYearsTable[retireYear]

  // 默认逻辑
  if (retireYear < 2025) return 15
  return 20
}

// ==================== 基础数据查询 ====================

/**
 * 获取指定年份的计发基数
 * @param {string} city - 城市标识
 * @param {number} year - 年份
 * @param {Object} config - 省份配置
 * @returns {number} 计发基数
 */
function getBase(city, year, config, sourceField = 'base_rates') {
  // 兼容两种配置格式：
  // 1. 旧格式（JSON）：config.base_rates = { prov: {...}, cc: {...} } 或 config.avg_salary_history = { year: value }
  // 2. 新格式（JS模块）：config.PROV_BASE, config.CC_BASE
  let allRates = config[sourceField] || {};
  
  // 如果是新格式，构建base_rates对象
  if (config.PROV_BASE || config.CC_BASE) {
    allRates = {
      prov: config.PROV_BASE || {},
    };
    // 如果有城市计发基数（如吉林省的CC_BASE），也加入
    if (config.CC_BASE) {
      allRates.cc = config.CC_BASE;
    }
    // 其他城市基数（如有）
    if (config.CITY_BASE) {
      Object.assign(allRates, config.CITY_BASE);
    }
  }
  
  const provRates = allRates['prov'] || (sourceField === 'avg_salary_history' ? allRates : {});
  const cityRates = allRates[city];

  // 1. 精确年份匹配
  if (cityRates && cityRates[year] !== undefined) return cityRates[year]
  if (provRates[year] !== undefined) return provRates[year]

  // 2. 向前回退到最近年份（城市表优先，再查全省）
  const cityKeys = cityRates ? Object.keys(cityRates).map(Number).sort((a, b) => a - b) : []
  const provKeys = Object.keys(provRates).map(Number).sort((a, b) => a - b)

  // 从城市表向前找
  for (let i = cityKeys.length - 1; i >= 0; i--) {
    if (cityKeys[i] <= year) return cityRates[cityKeys[i]]
  }
  // 从全省向前找
  for (let i = provKeys.length - 1; i >= 0; i--) {
    if (provKeys[i] <= year) return provRates[provKeys[i]]
  }

  // 3. 所有年份都大于查询年份 → 回退到最后已知年份
  const lastCityYear = cityKeys[cityKeys.length - 1]
  const lastProvYear = provKeys[provKeys.length - 1]
  if (lastCityYear > lastProvYear) {
    return cityRates[lastCityYear] || provRates[lastProvYear] || 0
  }
  return provRates[lastProvYear] || 0
}

/**
 * 获取指定年份的个人账户记账利率
 * @param {number} year - 年份
 * @param {Object} config - 省份配置
 * @returns {number} 记账利率
 */
function getAccRate(year, config) {
  // 2016年起使用全国统一利率（人社部、财政部公布）
  if (year >= 2016 && NATIONAL_INTEREST_RATES[year] !== undefined) {
    return NATIONAL_INTEREST_RATES[year]
  }
  if (year > 2025) {
    // 2026年及以后：使用最近已知利率（2025年 = 1.50%）
    const keys = Object.keys(NATIONAL_INTEREST_RATES).map(Number).sort((a, b) => a - b)
    const lastYear = keys[keys.length - 1]
    return NATIONAL_INTEREST_RATES[lastYear]
  }

  // 2016年之前：使用省份配置（由各省自行制定）
  const table = config.interest_rates || {}
  if (table[year] !== undefined) return table[year]

  // 后向查找
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b)
  for (let i = keys.length - 1; i >= 0; i--) {
    if (keys[i] <= year) return table[keys[i]]
  }

  // 默认回退值
  return 0.025
}

// ==================== 数据辅助 ====================

/**
 * 计算两个日期之间的年份差
 * @param {Object} start - { year, month }
 * @param {Object} end - { year, month }
 * @returns {number} 年数（含小数）
 */
function calcYears(start, end) {
  if (!start || !end) return 0
  const totalMonths = (end.year - start.year) * 12 + (end.month - start.month)
  return Math.max(0, totalMonths / 12)
}

/**
 * 解析参保人员信息
 * @param {Object} inputData - 用户输入数据
 * @returns {Object} 解析后的内部数据结构
 */
function parseInput(inputData) {
  const name = inputData.name || '参保人员'
  const gender = inputData.gender || 'male' // male/female
  const birthYear = parseInt(inputData.birthYear)
  const birthMonth = parseInt(inputData.birthMonth)
  const workYear = parseInt(inputData.workYear)
  const workMonth = parseInt(inputData.workMonth)
  const avgIndex = parseFloat(inputData.avgIndex) || 1.0
  // personalAccInput 允许 0 值（用户输入0表示无个人账户余额）
  // 兼容字段名：personalAcc / personalAccInput
  const personalAccInput = (inputData.personalAcc != null ? parseFloat(inputData.personalAcc) : null)
    || (inputData.personalAccInput != null ? parseFloat(inputData.personalAccInput) : null)

  // sightYears: 用户可显式指定视同缴费年限（覆盖自动计算结果）
  // 用于处理中断缴费、特殊工龄认定等官方核定表中的精确数值
  const sightYearsInput = inputData.sightYears != null ? parseFloat(inputData.sightYears) : null

  // accountStartInput: 用户可指定个人账户实际开始缴费年月（覆盖配置文件中的account_start）
  // 某些参保人实际参保时间晚于全省统一建账时间（如1998年建账前的灵活就业人员）
  // 格式：{ year: 1998, month: 12 }
  const accountStartInput = inputData.accountStart || null

  // totalYearsInput: 用户可显式指定累计缴费年限（精确值，覆盖自动计算结果）
  // 用于处理档案认定导致的不规则年限（如特殊工龄、中断认定等）
  const totalYearsInput = inputData.totalYears != null ? parseFloat(inputData.totalYears) : null

  // baseRetire / baseProv: 用户可显式指定计发基数（覆盖自动查询）
  // 支持两种参数名（带Input后缀和不带）
  // 用于官方核定表验证等需要精确匹配的场景
  const baseRetireInput = inputData.baseRetireInput != null ? parseFloat(inputData.baseRetireInput)
    : inputData.baseRetire != null ? parseFloat(inputData.baseRetire) : null
  const baseProvInput = inputData.baseProvInput != null ? parseFloat(inputData.baseProvInput)
    : inputData.baseProv != null ? parseFloat(inputData.baseProv) : null

  // 确定退休类型
  let retireType = inputData.retireType || 'standard' // standard/economic/early

  // 确定城市类型
  let cityType = inputData.cityType || 'prov' // 'cc'(长春市)/'prov'(全省其他)

  // skipDelay: 跳过延迟退休，直接用原法定年龄（用于官方核定表验证场景）
  const skipDelay = inputData.skipDelay === true

  // monthsInput: 用户可显式指定计发月数（覆盖自动计算，用于提前退休验证场景）
  const monthsInput = inputData.months != null ? parseFloat(inputData.months) : null

  // 江苏特殊参数：过渡性养老金平均缴费指数（与基础养老金指数可能不同）
  const transIndex = parseFloat(inputData.transIndex) || null

  // 江苏特殊参数：1996年底前的缴费年限（用于过渡性养老金计算）
  const pre1996Years = parseFloat(inputData.pre1996Years) || null

  // 江苏特殊参数：原办法过渡性养老金（新老办法并存，取高值）
  const transPensionOld = parseFloat(inputData.transPensionOld) || null

  // 四川特殊参数：增发养老金合计比例（因人而异，0.001~0.004+）
  // 如：独生子女0.1%、2005年底前工作0.1%、艰苦边远地区0.1%等，合计0.1%~0.4%+
  const extraRate = inputData.extraRate != null ? parseFloat(inputData.extraRate) : null

  // preAccountYearsInput: 用户显式指定建账前缴费年限（覆盖自动计算）
  // 用于四川等省份验证官方核定表中的精确数值
  const preAccountYearsInput = inputData.preAccountYears != null ? parseFloat(inputData.preAccountYears)
    : inputData.preAccountYearsInput != null ? parseFloat(inputData.preAccountYearsInput) : null

  // 上海特殊参数：虚账实记总额（用于过渡性养老金计算）
  const xuzhang = parseFloat(inputData.xuzhang) || null

  return {
    name,
    gender,
    birth: { year: birthYear, month: birthMonth },
    work: { year: workYear, month: workMonth },
    avgIndex,
    personalAccInput,
    sightYearsInput,  // 用户显式指定的视同缴费年限（可为null）
    accountStartInput,  // 用户显式指定的个人账户开始缴费年月（可为null）
    totalYearsInput,  // 用户显式指定的累计缴费年限（可为null）
    baseRetireInput,  // 用户显式指定的退休地计发基数（可为null）
    baseProvInput,    // 用户显式指定的全省计发基数（可为null）
    retireType,
    cityType,
    skipDelay,
    monthsInput,     // 用户显式指定的计发月数（可为null，覆盖自动计算）
    transIndex,       // 过渡性养老金平均缴费指数（可为null）
    pre1996Years,    // 1996年底前的缴费年限（可为null）
    transPensionOld, // 原办法过渡性养老金（可为null）
    extraRate,       // 四川增发养老金合计比例（可为null，默认0.1%）
    preAccountYearsInput, // 建账前缴费年限用户指定值（可为null）
    xuzhang,               // 虚账实记总额（可为null，上海特殊）
    socialAvgBaseInput: inputData.socialAvgBaseInput != null ? parseFloat(inputData.socialAvgBaseInput) : null, // 重庆社平覆盖（可为null）
    oneChild: inputData.oneChild === true, // 重庆独生子女标记
    intellectual: inputData.intellectual === true, // 宁夏知识分子标记

    // 性别映射到人员类型（支持外部传入，支持中英文）
    // 外部可传：male/fc/fw/fw55；未传入时按gender推断（female→fw）
    genderType: inputData.genderType
      || ((gender === 'female' || gender === '女') ? 'fw' : 'male')
  }
}

// ==================== 主计算入口 ====================

/**
 * 养老金统一测算引擎 — 主入口
 * 
 * @param {Object} config - 省份配置（含base_rates, interest_rates, monthly_payment_months等）
 * @param {Object} inputData - 参保人员信息
 * @returns {Object} 完整测算结果
 * 
 * 返回结构：
 * {
 *   legal: { ... },      // 法定退休测算
 *   flex: { ... },       // 弹性提前退休测算
 *   legalDate: { ... },  // 法定退休日期
 *   flexDate: { ... },   // 弹性提前退休日期
 *   ...
 * }
 */
function calculate(config, inputData) {
  // 解析输入
  const data = parseInput(inputData)

  // ============ 兼容 MODULES 数组格式（JS模块使用）============
  if (!config.modules && config.MODULES) {
    config.modules = {};
    
    // 基础养老金（总是启用）
    if (config.MODULES.includes('base')) {
      config.modules.basic_pension = { enabled: true, rate_per_year: 0.01 };
    }
    
    // 增发养老金
    if (config.MODULES.includes('extra')) {
      config.modules.extra_pension = { enabled: true };
      // 使用省份配置的增发参数（如有）
      if (config.EXTRA_PARAMS) {
        Object.assign(config.modules.extra_pension, config.EXTRA_PARAMS);
      }
    }
    
    // 个人账户养老金（总是启用）
    if (config.MODULES.includes('personal')) {
      config.modules.personal_account = { enabled: true };
    }
    
    // 过渡性养老金
    if (config.MODULES.includes('transition')) {
      config.modules.transitional_pension = { enabled: true };
      // 使用省份配置的过渡系数（如有）
      if (config.TRANS_COEF) {
        // 兼容 TRABS_COEF 的三种格式
        if (typeof config.TRANS_COEF === 'number') {
          // 新格式：TRANS_COEF是数字（固定系数）
          config.modules.transitional_pension.coefficient = config.TRANS_COEF;
        } else if (typeof config.TRANS_COEF.get === 'function') {
          // 新格式：有get()方法
          config.modules.transitional_pension.get = config.TRANS_COEF.get;
        } else if (config.TRANS_COEF.base !== undefined) {
          // 新格式：有base/alt属性
          config.modules.transitional_pension.base = config.TRANS_COEF.base;
          config.modules.transitional_pension.alt = config.TRANS_COEF.alt;
        }
        // 也复制 formula_type（如有）
        if (config.TRANS_COEF.formula_type) {
          config.modules.transitional_pension.formula_type = config.TRANS_COEF.formula_type;
        }
      }
    }
    
    // 特殊加发
    if (config.MODULES.includes('other')) {
      config.modules.special_addition = { enabled: true };
    }
  }
  // ============ 兼容结束 ============

  // ===== 法定退休年龄 =====
  const legalTotalMonths = getRetireTotalMonths(data.birth.year, data.birth.month, data.genderType, config, data.skipDelay)
  const legalDate = getRetireDate(data.birth.year, data.birth.month, legalTotalMonths)

  // ===== 弹性提前退休年龄 =====
  let originalAge
  switch (data.genderType) {
    case 'male': originalAge = 60; break
    case 'fc':   originalAge = 55; break
    case 'fw':   originalAge = 50; break
    default:     originalAge = 60
  }
  const flexTotalMonths = Math.max(originalAge * 12, legalTotalMonths - 36)
  const flexDate = getRetireDate(data.birth.year, data.birth.month, flexTotalMonths)

  // ===== 确定城市 =====
  const city = data.cityType === 'cc' ? 'cc' : 'prov'

  // ===== 视同缴费判定 =====
  const hasSight = data.work.year < config.account_start?.year ||
    (data.work.year === config.account_start?.year && data.work.month < config.account_start?.month)

  // 实际缴费起始时间：优先用用户指定的，否则用配置文件
  const accountStartConfigured = data.accountStartInput || config.account_start || { year: 1995, month: 7 }
  // 有视同缴费时，实际缴费从建账时间开始；无视同时从参保时间开始
  const actualStart = hasSight ? accountStartConfigured : data.work
  const accountStart = accountStartConfigured

  // 年限计算
  // 优先使用用户显式指定的累计缴费年限（来自官方核定表），否则自动计算
  // 优先使用用户显式指定的视同缴费年限（来自官方核定表），否则自动计算
  const autoSightYears = hasSight ? calcYears(data.work, accountStartConfigured) : 0
  const sightYears = data.sightYearsInput != null ? data.sightYearsInput : autoSightYears
  const autoTotalYears = calcYears(actualStart, legalDate) + sightYears
  const totalYears = data.totalYearsInput != null ? data.totalYearsInput : autoTotalYears
  // 累计年限确定后，重新推算actualYears（用于增发分段计算）
  const actualYears = totalYears - sightYears

  // 云南特色：建账前缴费年限（用于过渡性养老金）
  // 如果配置中启用了 usePreAccountYears，则计算建账前缴费年限
  let preAccountYears = null
  if (config.usePreAccountYears === true) {
    preAccountYears = calcYears(data.work, accountStartConfigured)
  }
  // 也支持用户显式指定（用于官方核定表验证场景）
  if (data.preAccountYearsInput != null) {
    preAccountYears = parseFloat(data.preAccountYearsInput)
  }

  // ===== 计算各模块 =====
  // 计发基数查询逻辑：
  // 1. 优先使用用户显式传入的基数（官方核定表验证场景）
  // 2. 否则查退休当年的基数：如果配置文件中该年已公布就用当年，否则回退上一年
  //    （吉林省实践：当年基数公布后，当年退休人员即用新基数）
  let retBase, provBase

  if (data.baseRetireInput != null && data.baseProvInput != null) {
    retBase = data.baseRetireInput
    provBase = data.baseProvInput
  } else {
    const allRates = config.base_rates || {}
    const provRates = allRates['prov']
    const cityRates = allRates[city]

    // 判断退休当年基数是否已正式公布（配置文件中有该年精确数据）
    const hasCurrentYearProv = provRates && provRates[legalDate.year] !== undefined
    const hasCurrentYearCity = cityRates && cityRates[legalDate.year] !== undefined

    // 全省基数：当年有数据用当年，否则回退上一年
    provBase = hasCurrentYearProv
      ? getBase('prov', legalDate.year, config)
      : getBase('prov', legalDate.year - 1, config)

    // 退休地基数：当年有数据用当年，否则回退上一年
    retBase = hasCurrentYearCity
      ? getBase(city, legalDate.year, config)
      : getBase(city, legalDate.year - 1, config)
  }

  const retireAgeExact = legalTotalMonths / 12
  const months = data.monthsInput || getRetireMonths(retireAgeExact, config)

  // 重庆特殊：基础养老金用上年度社平工资（非计发基数）
  // config.base_rates.social_avg_{上年度} 存储人社公布的养老金计发用社平
  // 也支持用户通过 socialAvgBaseInput 显式传入（如预核表使用计发基数代替社平）
  const socialAvgBaseKey = 'social_avg_' + (legalDate.year - 1)
  const socialAvgBase = (config.modules?.basic_pension?.formula_type === 'chongqing')
    ? (data.socialAvgBaseInput != null ? data.socialAvgBaseInput
       : config.base_rates?.[socialAvgBaseKey]
       || getBase('prov', legalDate.year - 1, config, 'avg_salary_history'))
    : null

  // 基础养老金
  const basicPension = calcBasicPension({
    retireBase: retBase,
    provBase: provBase,
    socialAvgBase,
    avgIndex: data.avgIndex,
    totalYears,
    mod: config.modules?.basic_pension || { enabled: true, rate_per_year: 0.01 }
  })

  // 增发基础养老金
  const extraPension = calcExtraPension({
    avgBase: Math.round((retBase + provBase * data.avgIndex) / 2 * 100) / 100,
    actualYears,
    totalYears,
    mod: config.modules?.extra_pension || { enabled: false },
    retireBase: retBase,
    avgIndex: data.avgIndex,
    extraRate: data.extraRate
  })

  // 个人账户养老金
  const personalAccount = calcPersonalAccountPension(
    city, data.avgIndex, legalDate,
    { accountStart, actualStart, sightYears }, config, months,
    data.personalAccInput
  )

  // 过渡性养老金
  const transPension = calcTransitionalPension({
    provBase: provBase,
    retireBase: retBase,
    sightYears,
    avgIndex: data.avgIndex,
    actualYears,
    totalYears,
    mod: config.modules?.transitional_pension || { enabled: false, coefficient_over_20: 0.014, coefficient_under_20: 0.012 },
    preAccountYears,
    transIndex: data.transIndex,
    pre1996Years: data.pre1996Years,
    transPensionOld: data.transPensionOld,
    retireYear: legalDate.year,
    xuzhang: data.xuzhang,
    intellectual: data.intellectual
  })

  // 特殊增发
  let specialAddition = calcSpecialAddition({
    mod: config.modules?.special_addition || { enabled: false },
    context: { retireAge: retireAgeExact, location: data.cityType, retireYear: legalDate.year }
  })

  // 重庆独生子女增发：3% × (基础+个人+过渡)
  // 由 case 的 oneChild 字段控制，而非 province 全局开关
  if (config.province === 'chongqing' && data.oneChild) {
    const oneChildBase = basicPension.amount + personalAccount.amount + transPension.amount
    const oneChildAmount = Math.round(oneChildBase * 0.03 * 100) / 100
    specialAddition = {
      amount: oneChildAmount,
      description: `独生子女增发: (${basicPension.amount.toFixed(2)}+${personalAccount.amount.toFixed(2)}+${transPension.amount.toFixed(2)}) × 3% = ${oneChildAmount.toFixed(2)}元`
    }
  }

  // 调节金（如甘肃省：建账前视同缴费年限≥15年，+15元/月）
  const adjustmentFund = calcAdjustmentFund({
    mod: config.modules?.adjustment_fund || { enabled: false },
    sightYears
  })

  // ===== 合计 =====
  const total = Math.round((basicPension.amount + extraPension.amount + personalAccount.amount + transPension.amount + specialAddition.amount + adjustmentFund.amount) * 100) / 100

  // ===== 弹性提前退休测算 =====
  const flexAge = flexTotalMonths / 12
  const flexMonths = getRetireMonths(flexAge, config)

  // 弹性退休基数查询：同样用当年优先逻辑
  const allRates = config.base_rates || {}
  const provRates = allRates['prov']
  const cityRates = allRates[city]
  const hasFlexCurrentProv = provRates && provRates[flexDate.year] !== undefined
  const hasFlexCurrentCity = cityRates && cityRates[flexDate.year] !== undefined
  const flexProvBase = hasFlexCurrentProv
    ? getBase('prov', flexDate.year, config)
    : getBase('prov', flexDate.year - 1, config)
  const flexRetBase = hasFlexCurrentCity
    ? getBase(city, flexDate.year, config)
    : getBase(city, flexDate.year - 1, config)

  const flexBasic = calcBasicPension({
    retireBase: flexRetBase, provBase: flexProvBase,
    avgIndex: data.avgIndex, totalYears,
    mod: config.modules?.basic_pension || { enabled: true, rate_per_year: 0.01 }
  })
  const flexExtra = calcExtraPension({
    avgBase: Math.round((flexRetBase + flexProvBase * data.avgIndex) / 2 * 100) / 100,
    actualYears,
    totalYears,
    mod: config.modules?.extra_pension || { enabled: false },
    retireBase: flexRetBase,
    avgIndex: data.avgIndex,
    extraRate: data.extraRate
  })
  const flexPersonal = calcPersonalAccountPension(
    city, data.avgIndex, flexDate,
    { accountStart, actualStart, sightYears }, config, flexMonths,
    data.personalAccInput
  )
  const flexTrans = calcTransitionalPension({
    provBase: flexProvBase,
    retireBase: flexRetBase,
    sightYears, avgIndex: data.avgIndex,
    actualYears,
    totalYears,
    mod: config.modules?.transitional_pension || { enabled: false, coefficient_over_20: 0.014, coefficient_under_20: 0.012 },
    preAccountYears,
    transIndex: data.transIndex,
    pre1996Years: data.pre1996Years,
    transPensionOld: data.transPensionOld,
    retireYear: flexDate.year,
    xuzhang: data.xuzhang
  })

  const flexTotal = Math.round((flexBasic.amount + flexExtra.amount + flexPersonal.amount + flexTrans.amount + specialAddition.amount + adjustmentFund.amount) * 100) / 100

  // ===== 构建返回结果 =====
  const canFlex = flexTotalMonths < legalTotalMonths
  const flexAdvance = legalTotalMonths - flexTotalMonths

  return {
    // 法定退休
    legal: {
      date: legalDate,
      age: retireAgeExact,
      ageStr: getAgeStr(legalTotalMonths),
      months: months,
      basicPension: basicPension,
      extraPension: extraPension,
      personalAccount: personalAccount,
      transitionalPension: transPension,
      specialAddition: specialAddition,
      adjustmentFund: adjustmentFund,
      total: total,
      totalYears,
      actualYears,
      sightYears,
      minYears: getMinYears(legalDate.year, config),
      meetMin: totalYears >= getMinYears(legalDate.year, config),
      rate: total / provBase * 100,
      baseRetire: retBase,
      baseProv: provBase
    },

    // 弹性提前退休
    flex: {
      date: flexDate,
      age: flexAge,
      ageStr: getAgeStr(flexTotalMonths),
      months: flexMonths,
      basicPension: flexBasic,
      extraPension: flexExtra,
      personalAccount: flexPersonal,
      transitionalPension: flexTrans,
      specialAddition: specialAddition,
      adjustmentFund: adjustmentFund,
      total: flexTotal,
      totalYears,
      actualYears,
      sightYears,
      baseRetire: flexRetBase,
      baseProv: flexProvBase
    },

    // 对比信息
    comparison: {
      legalDate: legalDate,
      flexDate: flexDate,
      legalTotalMonths,
      flexTotalMonths,
      canFlex,
      flexAdvance: canFlex ? flexAdvance : 0,
      amountDiff: Math.round((flexTotal - total) * 100) / 100,
      diffPercent: Math.round((flexTotal / total - 1) * 10000) / 100
    },

    // 元数据
    metaData: {
      name: data.name,
      city: data.cityType,
      avgIndex: data.avgIndex,
      totalYears,
      actualYears,
      sightYears,
      months,
      flexMonths,
      // 个人账户余额（用于前端展示）
      personalAccBalance: personalAccount.balance || data.personalAccInput || 0
    },

    // 工具函数
    getAgeStr: getAgeStr,
    getDateStr: getDateStr
  }
}

// ==================== 辅助导出 ====================

/**
 * 金额格式化
 */
function formatMoney(n) {
  if (n >= 100000) return (n / 10000).toFixed(2) + '万'
  return Math.round(n).toLocaleString()
}

/**
 * 获取模块名称映射
 */
function getModuleName(key) {
  if (!key) return key || ''
  const names = {
    basicPension: '基础养老金',
    extraPension: '增发基础养老金',
    personalAccount: '个人账户养老金',
    transitionalPension: '过渡性养老金',
    specialAddition: '特殊增发'
  }
  return names[key] || key
}

/**
 * 格式化完整结果（用于展示）
 */
function formatResult(result) {
  return {
    基本养老金总额: result.legal.total,
    基础养老金: result.legal.basicPension.amount,
    增发基础养老金: result.legal.extraPension.amount,
    个人账户养老金: result.legal.personalAccount.amount,
    过渡性养老金: result.legal.transitionalPension.amount,
    特殊增发: result.legal.specialAddition.amount,
    基础养老金说明: result.legal.basicPension.description,
    增发基础养老金说明: result.legal.extraPension.description,
    个人账户养老金说明: result.legal.personalAccount.description,
    过渡性养老金说明: result.legal.transitionalPension.description,
    实际缴费年限: result.legal.actualYears,
    视同缴费年限: result.legal.sightYears,
    累计缴费年限: result.legal.totalYears,
    法定退休年龄: result.legal.ageStr,
    法定退休日期: result.getDateStr(result.legal.date),
    计发月数: result.legal.months,
    退休地计发基数: result.legal.baseRetire,
    全省计发基数: result.legal.baseProv,
    替代率: result.legal.rate,
    弹性提前退休: result.comparison.canFlex ? {
      退休时间: result.getDateStr(result.flex.date),
      退休年龄: result.flex.ageStr,
      月基本养老金: result.flex.total,
      比法定退休少领: result.comparison.flexAdvance + '个月',
      月养老金差额: result.comparison.amountDiff
    } : null
  }
}


// Browser global
if(typeof window!=="undefined"){
window.PensionEngine = {
  calculate,
  calcBasicPension,
  calcExtraPension,
  calcPersonalAccountPension,
  calcTransitionalPension,
  calcSpecialAddition,
  calcAdjustmentFund,
  getRetireMonths,
  getDelayMonths,
  getRetireTotalMonths,
  getRetireDate,
  getAgeStr,
  getDateStr,
  getMinYears,
  getBase,
  getAccRate,
  calcYears,
  parseInput,
  formatMoney,
  getModuleName,
  formatResult,
};
}
