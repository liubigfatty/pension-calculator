/**
 * 养老金测算平台 - 省份配置加载与缓存
 * 统一管理省份配置的获取、缓存和错误处理
 * @module services/configLoader
 */

import { store, STATE_KEYS } from '../core/store.js';

const CONFIG_CACHE = new Map();
const CONFIG_BASE = 'js/provinces/';

/**
 * 加载省份配置
 * @param {string} provinceCode - 省份代码，如 'jilin'
 * @param {Object} [options]
 * @param {boolean} [options.force=false] - 强制刷新缓存
 * @returns {Promise<Object>} 省份配置对象
 */
export async function loadProvinceConfig(provinceCode, options = {}) {
  if (!provinceCode) {
    throw new Error('省份代码不能为空');
  }

  // 命中缓存
  if (!options.force && CONFIG_CACHE.has(provinceCode)) {
    const cached = CONFIG_CACHE.get(provinceCode);
    store.set(STATE_KEYS.CONFIG_DATA, cached);
    return cached;
  }

  store.set(STATE_KEYS.CONFIG_LOADING, true);
  store.set(STATE_KEYS.CONFIG_ERROR, null);

  try {
    const url = `${CONFIG_BASE}${provinceCode}.json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`配置加载失败 (${response.status}): ${provinceCode}`);
    }

    const config = await response.json();

    // 校验配置完整性
    validateConfig(config, provinceCode);

    // 缓存并通知
    CONFIG_CACHE.set(provinceCode, config);
    store.set(STATE_KEYS.CONFIG_DATA, config);
    store.set(STATE_KEYS.CONFIG_LOADING, false);

    return config;
  } catch (err) {
    store.set(STATE_KEYS.CONFIG_ERROR, err.message);
    store.set(STATE_KEYS.CONFIG_LOADING, false);
    throw err;
  }
}

/**
 * 校验配置结构完整性
 */
function validateConfig(config, code) {
  const required = ['province', 'name', 'account_start', 'modules'];
  const missing = required.filter(k => !(k in config));

  if (missing.length > 0) {
    console.warn(`[ConfigLoader] ${code} 配置缺少字段: ${missing.join(', ')}`);
  }

  // 必需模块
  const requiredModules = ['basic_pension', 'personal_account', 'transitional_pension'];
  if (config.modules) {
    requiredModules.forEach(m => {
      if (!config.modules[m] || !config.modules[m].enabled) {
        console.warn(`[ConfigLoader] ${code} 缺少 ${m} 模块配置`);
      }
    });
  }
}

/**
 * 预加载多个省份配置（后台静默）
 * @param {string[]} provinceCodes
 * @returns {Promise<Object[]>}
 */
export async function preloadConfigs(provinceCodes) {
  const results = await Promise.allSettled(
    provinceCodes.map(code => loadProvinceConfig(code))
  );
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}

/**
 * 清除所有缓存
 */
export function clearCache() {
  CONFIG_CACHE.clear();
  store.reset([STATE_KEYS.CONFIG_DATA, STATE_KEYS.CONFIG_LOADING, STATE_KEYS.CONFIG_ERROR]);
}

/**
 * 预加载的省份列表（常用省份首次访问时后台加载）
 */
export const PRELOAD_PROVINCES = ['jilin', 'beijing', 'shanghai', 'guangdong'];
