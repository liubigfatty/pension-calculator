/**
 * 养老金测算平台 - 表单校验器
 * 所有校验规则集中管理，输入即校验
 * @module core/validators
 */

/**
 * 校验出生年月
 * @param {string} value - 'YYYY-MM' 格式
 * @returns {string|null} 错误消息，null表示通过
 */
export function validateBirthDate(value) {
  if (!value) return '请选择出生年月';
  const [y, m] = value.split('-').map(Number);
  if (isNaN(y) || isNaN(m)) return '出生年月格式不正确';
  const now = new Date();
  if (y < 1940) return '出生年份不能早于1940年';
  if (y > now.getFullYear() - 16) return '年龄需满16周岁';
  if (m < 1 || m > 12) return '月份不正确';
  return null;
}

/**
 * 校验参保时间（需与出生年月联动）
 * @param {string} value - 'YYYY-MM' 格式
 * @param {string} birthDate - 出生年月 'YYYY-MM'
 * @returns {string|null}
 */
export function validateWorkDate(value, birthDate) {
  if (!value) return '请选择参保时间';
  const [wy, wm] = value.split('-').map(Number);
  if (isNaN(wy) || isNaN(wm)) return '参保时间格式不正确';
  if (wm < 1 || wm > 12) return '月份不正确';

  if (birthDate) {
    const [by] = birthDate.split('-').map(Number);
    if (wy < by + 16) return '参保时间不能早于16岁';
    if (wy > new Date().getFullYear()) return '参保时间不能晚于当前年份';
  }
  return null;
}

/**
 * 校验平均缴费指数
 * @param {string} value
 * @returns {string|null}
 */
export function validateAvgIndex(value) {
  if (!value || value === '') return null; // 可为空，从月收入推算
  const num = parseFloat(value);
  if (isNaN(num)) return '请输入有效数字';
  if (num < 0.3) return '缴费指数一般不低于0.3';
  if (num > 3.0) return '缴费指数最高为3.0';
  return null;
}

/**
 * 校验月收入
 * @param {string} value
 * @returns {string|null}
 */
export function validateMonthlyIncome(value) {
  if (!value || value === '') return null; // 可为空
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) return '请输入有效月收入';
  if (num > 100000) return '月收入一般不超过10万元';
  return null;
}

/**
 * 校验个人账户余额
 * @param {string} value
 * @returns {string|null}
 */
export function validatePersonalAcc(value) {
  if (!value || value === '') return null; // 可为空，引擎自动估算
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) return '个人账户余额不能为负数';
  if (num > 500000) return '个人账户余额一般不超过50万元';
  return null;
}

/**
 * 校验参保地区
 * @param {string} value
 * @returns {string|null}
 */
export function validateProvince(value) {
  if (!value) return '请选择参保地区';
  return null;
}

/**
 * 校验人员类型
 * @param {string} value
 * @returns {string|null}
 */
export function validatePersonType(value) {
  if (!value) return '请选择人员类型';
  return null;
}

/**
 * 批量校验表单，返回所有错误
 * @param {Object} fields - {fieldName: value}
 * @returns {{valid:boolean, errors:Object<string,string>}}
 */
export function validateForm(fields) {
  const errors = {};

  const provinceErr = validateProvince(fields.province);
  if (provinceErr) errors.province = provinceErr;

  const personErr = validatePersonType(fields.personType);
  if (personErr) errors.personType = personErr;

  const birthErr = validateBirthDate(fields.birthDate);
  if (birthErr) errors.birthDate = birthErr;

  const workErr = validateWorkDate(fields.workDate, fields.birthDate);
  if (workErr) errors.workDate = workErr;

  const indexErr = validateAvgIndex(fields.avgIndex);
  if (indexErr) errors.avgIndex = indexErr;

  const incomeErr = validateMonthlyIncome(fields.monthlyIncome);
  if (incomeErr) errors.monthlyIncome = incomeErr;

  const accErr = validatePersonalAcc(fields.personalAcc);
  if (accErr) errors.personalAcc = accErr;

  // 缴费指数或月收入至少填一个
  if (!fields.avgIndex && !fields.monthlyIncome) {
    errors.avgIndex = '请填写平均缴费指数或月收入';
    errors.monthlyIncome = '请填写平均缴费指数或月收入';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}
