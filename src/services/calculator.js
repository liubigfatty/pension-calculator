/**
 * 养老金测算平台 - 计算服务
 * 封装引擎调用，统一输入输出格式
 * @module services/calculator
 */

import { store, STATE_KEYS } from '../core/store.js';
import { loadProvinceConfig } from './configLoader.js';

/**
 * 执行养老金测算
 * @param {Object} input - 用户输入
 * @param {string} input.province - 省份代码
 * @param {string} input.personType - 人员类型
 * @param {string} input.birthDate - 出生年月 'YYYY-MM'
 * @param {string} input.workDate - 参保时间 'YYYY-MM'
 * @param {string} [input.avgIndex] - 平均缴费指数
 * @param {string} [input.monthlyIncome] - 月收入
 * @param {string} [input.personalAcc] - 个人账户余额
 * @param {string} [input.cityType='prov'] - 退休地类型
 * @returns {Promise<Object>} 测算结果
 */
export async function calculatePension(input) {
  store.set(STATE_KEYS.CALC_LOADING, true);
  store.set(STATE_KEYS.CALC_ERROR, null);

  try {
    // 1. 加载省份配置
    const config = await loadProvinceConfig(input.province);

    // 2. 解析输入参数
    const [birthY, birthM] = input.birthDate.split('-').map(Number);
    const [workY, workM] = input.workDate.split('-').map(Number);

    // 3. 缴费指数：优先手动填写，否则从月收入推算
    let avgIndex = input.avgIndex ? parseFloat(input.avgIndex) : NaN;
    if (isNaN(avgIndex) && input.monthlyIncome) {
      const avgWage = config.base_salary_2025 || 8000;
      const minBase = avgWage * 0.6;
      const maxBase = avgWage * 3.0;
      const contribBase = Math.min(Math.max(parseFloat(input.monthlyIncome), minBase), maxBase);
      avgIndex = contribBase / avgWage;
    }
    if (isNaN(avgIndex)) avgIndex = 1.0;

    // 4. 人员类型映射
    const PERSON_TYPE_MAP = {
      'male':       { gender: 'male',   type: 'standard', genderType: 'male' },
      'fw':         { gender: 'female', type: 'standard', genderType: 'fw' },
      'fc':         { gender: 'female', type: 'standard', genderType: 'fc' },
      'eco_male':   { gender: 'male',   type: 'flexible', genderType: 'male' },
      'eco_female': { gender: 'female', type: 'flexible', genderType: 'fw55' },
    };
    const typeMap = PERSON_TYPE_MAP[input.personType] || PERSON_TYPE_MAP['male'];

    // 5. 视同缴费年限（灵活就业=0）
    let sightYears = 0;
    if (typeMap.type !== 'flexible') {
      const accStart = config.account_start;
      const monthsDiff = (accStart.year - workY) * 12 + (accStart.month - workM);
      sightYears = Math.max(0, monthsDiff / 12);
    }

    // 6. 组装引擎输入
    const engineInput = {
      gender: typeMap.gender,
      genderType: typeMap.genderType,
      birthYear: birthY,
      birthMonth: birthM,
      workYear: workY,
      workMonth: workM,
      cityType: input.cityType || 'prov',
      userType: typeMap.type,
      sightYears,
      avgIndex,
      personalAccInput: input.personalAcc ? parseFloat(input.personalAcc) : null,
    };

    // 7. 调用引擎
    const result = window.pensionEngine.calculate(config, engineInput);

    // 8. 存储结果
    store.set(STATE_KEYS.CALC_RESULT, result);
    store.set(STATE_KEYS.CALC_LOADING, false);

    return result;
  } catch (err) {
    const msg = err.message || '计算失败，请稍后重试';
    store.set(STATE_KEYS.CALC_ERROR, msg);
    store.set(STATE_KEYS.CALC_LOADING, false);
    throw err;
  }
}

/**
 * 查询退休年龄
 * @param {string} birthDate - 'YYYY-MM'
 * @param {string} gender - 'male'|'fw'|'fc'
 * @returns {Object} 退休年龄结果
 */
export function queryRetireAge(birthDate, gender) {
  const [birthY, birthM] = birthDate.split('-').map(Number);
  return window.pensionEngine.getDelayResult(birthY, birthM, gender);
}

/**
 * 计算缴费指数（首页快速入口）
 * @param {string} provinceCode
 * @param {number} monthlyIncome
 * @returns {Promise<{avgIndex:number, minBase:number, maxBase:number, contribBase:number}>}
 */
export async function calcContributionIndex(provinceCode, monthlyIncome) {
  const config = await loadProvinceConfig(provinceCode);
  const avgWage = config.base_salary_2025 || 8000;
  const minBase = avgWage * 0.6;
  const maxBase = avgWage * 3.0;
  const contribBase = Math.min(Math.max(monthlyIncome, minBase), maxBase);
  const avgIndex = contribBase / avgWage;

  return { avgIndex, minBase, maxBase, contribBase, avgWage };
}
