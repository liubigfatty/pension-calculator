// 延迟退休「人群口径」模块
// 依据：《关于实施渐进式延迟法定退休年龄的决定》附件对照表（国办发〔2025〕5号，2025-01-01 施行）
//
// 用途：给定一个目标退休年月，反推三类人群的真实出生年月。
//
// ⚠️ 为什么保留这份独立实现（而不是直接用引擎的 getDelayMonths）：
//    2026-09-12 之前，引擎内置算法有三处与政策原文不符，故本模块按政策原文独立实现：
//      1) 阶梯公式用 floor((off-1)/step)+1，出生月落在档位起始月时少算 1 个月
//      2) getRetireDate 在月份进位时不给年份 +1
//      3) fw55 默认参数误用了原 50 岁女工人的（1975/2/60）
//    以上三项已于 2026-09-12 修复完毕（见 docs/99-决策日志/引擎延迟退休缺陷修复记录（2026-09-12）.md），
//    现引擎与本模块结果一致 —— scripts/_verify_delay.js 已做 1296 组交叉校验。
//    本模块继续保留的两个理由：
//      ① 作为独立口径的交叉验证基准（两份实现互证，避免同源错误）
//      ② 提供「按目标退休年月反推出生年月」这一引擎没有的能力（solveBirth）
//
//    仍未修：fw50 / fw 被写死 return 0（原法定 50 岁女职工不延迟），政策上应延至 55 岁。
//    故 `fw` 类型在本模块中按政策原文实现，与引擎当前行为不同 —— 待 P3 修复后即自然对齐。

const DELAY_TABLE = {
  male: { baseAge: 60, baseYear: 1965, step: 4, cap: 36, label: '男职工' },
  fc:   { baseAge: 55, baseYear: 1970, step: 4, cap: 36, label: '女干部' },
  fw:   { baseAge: 50, baseYear: 1975, step: 2, cap: 60, label: '女工人' },
}

/** 按政策原文计算延迟月数 */
function delayPolicy (type, birthYear, birthMonth) {
  const cfg = DELAY_TABLE[type]
  if (!cfg) return 0
  const off = (birthYear - cfg.baseYear) * 12 + (birthMonth - 1)   // 相对基准年 1 月的月偏移
  if (off < 0) return 0
  return Math.min(Math.floor(off / cfg.step) + 1, cfg.cap)
}

/** 年/月 加法：y-m 再过 n 个月 */
function addMonths (year, month, n) {
  const t = (year * 12 + (month - 1)) + n
  return { year: Math.floor(t / 12), month: (t % 12) + 1 }
}

/** 两个年月之间相差的月数（后者 − 前者） */
function diffMonths (from, to) {
  return (to.year - from.year) * 12 + (to.month - from.month)
}

/**
 * 反解：某类人群（原法定退休年龄对应身份）在哪年哪月出生，才会在 retireYear-retireMonth 退休
 * @returns {{birthYear, birthMonth, delay, baseAge, realAgeMonths, label}}
 */
function solveBirth (type, retireYear, retireMonth) {
  const cfg = DELAY_TABLE[type]
  if (!cfg) throw new Error('未知人群类型：' + type)
  for (let dy = 0; dy <= 2; dy++) {
    const by = retireYear - cfg.baseAge - dy
    for (let bm = 1; bm <= 12; bm++) {
      const delay = delayPolicy(type, by, bm)
      const r = addMonths(by, bm, cfg.baseAge * 12 + delay)
      if (r.year === retireYear && r.month === retireMonth) {
        return {
          type,
          label: cfg.label,
          baseAge: cfg.baseAge,
          birthYear: by,
          birthMonth: bm,
          delay,
          realAgeMonths: cfg.baseAge * 12 + delay,
        }
      }
    }
  }
  return null
}

/** 常用入口：建立三类人群的工作/退休口径表 */
function buildCohorts (retireYear, retireMonth, startAge, workMonth) {
  const out = {}
  for (const type of ['fw', 'fc', 'male']) {
    const b = solveBirth(type, retireYear, retireMonth)
    if (!b) continue
    const work = { year: b.birthYear + startAge, month: workMonth }
    const totalMonths = diffMonths(work, { year: retireYear, month: retireMonth })
    out[b.baseAge] = {
      ...b,
      work,
      years: totalMonths / 12,
      totalMonths,
      // 实际退休年龄的文字描述
      realAgeStr: `${Math.floor(b.realAgeMonths / 12)}岁${b.realAgeMonths % 12 ? (b.realAgeMonths % 12) + '个月' : '整'}`,
    }
  }
  return out
}

module.exports = { DELAY_TABLE, delayPolicy, addMonths, diffMonths, solveBirth, buildCohorts }
