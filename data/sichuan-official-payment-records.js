/**
 * 四川省历年缴费基数明细表（官方数据）
 * 
 * 数据来源：社保局打印的个人缴费明细单
 * 用途：作为四川省养老金计算的权威参考数据
 * 
 * 数据说明：
 * - 月平均工资 = 对应年度的社平工资（用于计算缴费工资指数的分母）
 * - 月缴费基数 = 本人实际缴费基数
 * - 缴费工资指数 = 月缴费基数 ÷ 月平均工资
 * - 平均缴费工资指数 = 缴费指数合计 ÷ 缴费年数
 */

const SICHUAN_OFFICIAL_PAYMENT_RECORDS = {
  // 案例数据（1994-2025年）
  // 注：1994-1996年仅有社平工资数据，1997年起有完整缴费记录
  avgSalaryHistory: {
    // 1994-1996年社平工资（用于计算缴费工资指数）
    1993: { avgSalary: 246.75, note: '社平工资（无缴费记录）' },
    1994: { avgSalary: 335.67, note: '社平工资（无缴费记录）' },
    1995: { avgSalary: 387.08, note: '社平工资（无缴费记录）' },
    1996: { avgSalary: 429.67, note: '社平工资（无缴费记录）' },
    
    // 1997-2025年完整缴费记录
    1997: { avgSalary: 468.83 },
    1998: { avgSalary: 494.92 },
    1999: { avgSalary: 539.58 },
    2000: { avgSalary: 620.42 },
    2001: { avgSalary: 747.33 },
    2002: { avgSalary: 855.67 },
    2003: { avgSalary: 966.25 },
    2004: { avgSalary: 1171.92 },
    2005: { avgSalary: 1318.83 },
    2006: { avgSalary: 1318.83 },
    2007: { avgSalary: 1487.67 },
    2008: { avgSalary: 1776.00 },
    2009: { avgSalary: 2086.50 },
    2010: { avgSalary: 2380.25 },
    2011: { avgSalary: 2759.33 },
    2012: { avgSalary: 3160.33 },
    2013: { avgSalary: 3592.50 },
    2014: { avgSalary: 4084.83 },
    2015: { avgSalary: 4476.83 },
    2016: { avgSalary: 5043.33 },
    2017: { avgSalary: 5481.75 },
    2018: { avgSalary: 5969.25 },
    2019: { avgSalary: 6705.33 },
    2020: { avgSalary: 5772.25 },
    2021: { avgSalary: 6210.00 },
    2022: { avgSalary: 6785.00 },
    2023: { avgSalary: 7076.00 },
    2024: { avgSalary: 7518.33 },
    2025: { avgSalary: 7646.00 },
  },

  sample_record: {
    yearRange: '1997-2025',
    records: [
      { year: 1997, months: 10, basePaid: 200.70, avgSalary: 468.83, index: 0.428 },
      { year: 1998, months: 12, basePaid: 196.08, avgSalary: 494.92, index: 0.396 },
      { year: 1999, months: 12, basePaid: 324.58, avgSalary: 539.58, index: 0.602 },
      { year: 2000, months: 12, basePaid: 323.75, avgSalary: 620.42, index: 0.522 },
      { year: 2001, months: 12, basePaid: 448.42, avgSalary: 747.33, index: 0.600 },
      { year: 2002, months: 12, basePaid: 447.00, avgSalary: 855.67, index: 0.522 },
      { year: 2003, months: 12, basePaid: 579.75, avgSalary: 966.25, index: 0.600 },
      { year: 2004, months: 12, basePaid: 1171.92, avgSalary: 1171.92, index: 1.000 },
      { year: 2005, months: 12, basePaid: 1318.83, avgSalary: 1318.83, index: 1.000 },
      { year: 2006, months: 12, basePaid: 1318.83, avgSalary: 1318.83, index: 1.000 },
      { year: 2007, months: 12, basePaid: 1487.67, avgSalary: 1487.67, index: 1.000 },
      { year: 2008, months: 12, basePaid: 1776.00, avgSalary: 1776.00, index: 1.000 },
      { year: 2009, months: 12, basePaid: 2086.50, avgSalary: 2086.50, index: 1.000 },
      { year: 2010, months: 12, basePaid: 2380.25, avgSalary: 2380.25, index: 1.000 },
      { year: 2011, months: 12, basePaid: 2759.33, avgSalary: 2759.33, index: 1.000 },
      { year: 2012, months: 12, basePaid: 3160.00, avgSalary: 3160.33, index: 1.000 },
      { year: 2013, months: 12, basePaid: 3593.00, avgSalary: 3592.50, index: 1.000 },
      { year: 2014, months: 12, basePaid: 2451.00, avgSalary: 4084.83, index: 0.600 },
      { year: 2015, months: 12, basePaid: 3582.00, avgSalary: 4476.83, index: 0.800 },
      { year: 2016, months: 12, basePaid: 4035.00, avgSalary: 5043.33, index: 0.800 },
      { year: 2017, months: 12, basePaid: 3290.00, avgSalary: 5481.75, index: 0.600 },
      { year: 2018, months: 12, basePaid: 3582.00, avgSalary: 5969.25, index: 0.600 },
      { year: 2019, months: 12, basePaid: 3498.33, avgSalary: 6705.33, index: 0.522 },
      { year: 2020, months: 12, basePaid: 5000.00, avgSalary: 5772.25, index: 0.866 },
      { year: 2021, months: 12, basePaid: 3625.00, avgSalary: 6210.00, index: 0.584 },
      { year: 2022, months: 12, basePaid: 6166.33, avgSalary: 6785.00, index: 0.909 },
      { year: 2023, months: 12, basePaid: 6198.75, avgSalary: 7076.00, index: 0.876 },
      { year: 2024, months: 12, basePaid: 4511.00, avgSalary: 7518.33, index: 0.600 },
      { year: 2025, months: 9, basePaid: 4511.00, avgSalary: 7646.00, index: 0.590 },
    ],
    summary: {
      totalIndex: 22.017,
      avgIndex: 0.759,
      note: '平均缴费工资指数 = 0.759（29年缴费）'
    }
  },

  // 数据验证说明
  notes: [
    '数据来源：社保局打印的个人缴费明细单（官方权威数据）',
    '月平均工资 = 对应年度的社平工资（用于计算缴费工资指数）',
    '缴费工资指数 = 月缴费基数 ÷ 月平均工资',
    '平均缴费工资指数 = 各年度指数之和 ÷ 缴费年数',
    '此数据可用于验证四川省养老金计算引擎的准确性',
  ]
}

module.exports = { SICHUAN_OFFICIAL_PAYMENT_RECORDS }
