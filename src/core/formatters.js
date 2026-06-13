/**
 * 养老金测算平台 - 数据格式化器
 * 统一金额、日期、百分比等格式化逻辑
 * @module core/formatters
 */

/**
 * 格式化金额（元）
 * @param {number} value
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function formatMoney(value, decimals = 2) {
  if (value == null || isNaN(value)) return '-';
  return Number(value).toFixed(decimals);
}

/**
 * 格式化金额（含千分位）
 * @param {number} value
 * @returns {string}
 */
export function formatMoneyLocale(value) {
  if (value == null || isNaN(value)) return '-';
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * 格式化百分比
 * @param {number} value - 0.05 表示 5%
 * @param {number} [decimals=1]
 * @returns {string}
 */
export function formatPercent(value, decimals = 1) {
  if (value == null || isNaN(value)) return '-';
  return (value * 100).toFixed(decimals) + '%';
}

/**
 * 格式化年份+月份
 * @param {number} year
 * @param {number} month
 * @returns {string} '2025年6月'
 */
export function formatYearMonth(year, month) {
  if (!year || !month) return '-';
  return `${year}年${month}月`;
}

/**
 * 格式化缴费年限
 * @param {number} years
 * @returns {string} '25.50年'
 */
export function formatYears(years) {
  if (years == null || isNaN(years)) return '-';
  return years.toFixed(2) + '年';
}

/**
 * 格式化退休年龄
 * @param {number} ageYears - 年龄（可能含小数）
 * @returns {string} '55岁6个月'
 */
export function formatAge(ageYears) {
  if (ageYears == null || isNaN(ageYears)) return '-';
  const years = Math.floor(ageYears);
  const months = Math.round((ageYears - years) * 12);
  if (months === 0) return `${years}岁`;
  return `${years}岁${months}个月`;
}

/**
 * 格式化日期（ISO字符串转中文）
 * @param {string} isoStr - 'YYYY-MM-DD'
 * @returns {string} '2025年6月13日'
 */
export function formatDate(isoStr) {
  if (!isoStr) return '-';
  const [y, m, d] = isoStr.split('-');
  return `${y}年${Number(m)}月${Number(d)}日`;
}

/**
 * 获取YYYY-MM格式的当月字符串
 * @returns {string}
 */
export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 格式化输入值为显示值
 * @param {string|number} value
 * @param {'money'|'percent'|'years'|'age'|'date'|'ym'} type
 * @returns {string}
 */
export function format(value, type) {
  const formatters = {
    money:   v => formatMoneyLocale(parseFloat(v)),
    percent: v => formatPercent(parseFloat(v)),
    years:   v => formatYears(parseFloat(v)),
    age:     v => formatAge(parseFloat(v)),
    date:    v => formatDate(v),
    ym:      v => {
      const [y, m] = String(v).split('-');
      return formatYearMonth(Number(y), Number(m));
    },
  };
  return (formatters[type] || (v => String(v)))(value);
}
