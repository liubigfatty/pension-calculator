const fs = require('fs');
const filePath = 'engine/pension-engine.js';
let content = fs.readFileSync(filePath, 'utf8');

let modified = false;

// ==========================================
// 修复1：getBase() 兼容 PROV_BASE / CC_BASE
// ==========================================
const oldGetBase = `function getBase(city, year, config) {
  const allRates = config.base_rates || {}
  const provRates = allRates['prov'] || {}
  const cityRates = allRates[city]`;

const newGetBase = `function getBase(city, year, config) {
  // 兼容 JS 模块格式（PROV_BASE / CC_BASE）
  let allRates = config.base_rates || {}
  if (config.PROV_BASE) {
    allRates = { prov: config.PROV_BASE }
    if (config.CC_BASE) allRates.cc = config.CC_BASE
    if (config.CITY_BASE) Object.assign(allRates, config.CITY_BASE)
  }
  const provRates = allRates['prov'] || {}
  const cityRates = allRates[city]`;

if (content.includes(oldGetBase)) {
  content = content.replace(oldGetBase, newGetBase);
  console.log('✅ 修复1：getBase() 已兼容 PROV_BASE/CC_BASE');
  modified = true;
} else {
  console.log('⚠️ 修复1：未找到匹配字符串，跳过');
}

// ==========================================
// 修复2：calculate() 兼容 MODULES 数组格式
// ==========================================
const oldMODULES = `  // ===== 法定退休年龄 =====
  const legalTotalMonths = getRetireTotalMonths(data.birth.year, data.birth.month, data.genderType, config, data.skipDelay)`;

const newMODULES = `  // ===== 兼容 JS 模块的 MODULES 数组格式 =====
  if (!config.modules && config.MODULES) {
    config.modules = {}
    if (config.MODULES.includes('base')) config.modules.basic_pension = { enabled: true, rate_per_year: 0.01 }
    if (config.MODULES.includes('extra')) {
      config.modules.extra_pension = { enabled: true }
      if (config.EXTRA_PARAMS) {
        config.modules.extra_pension.brackets = config.EXTRA_PARAMS.brackets
        config.modules.extra_pension.trigger = config.EXTRA_PARAMS.trigger
      }
    }
    if (config.MODULES.includes('personal')) config.modules.personal_account = { enabled: true }
    if (config.MODULES.includes('transition')) {
      config.modules.transitional_pension = { enabled: true }
      if (config.TRANS_COEF) {
        if (typeof config.TRANS_COEF === 'number') {
          config.modules.transitional_pension.coefficient = config.TRANS_COEF
        } else if (typeof config.TRANS_COEF.get === 'function') {
          config.modules.transitional_pension.get = config.TRANS_COEF.get
        } else if (config.TRANS_COEF.base !== undefined) {
          config.modules.transitional_pension.coefficient_over_20 = config.TRANS_COEF.base
          config.modules.transitional_pension.coefficient_under_20 = config.TRANS_COEF.alt
        }
      }
    }
    if (config.MODULES.includes('other')) config.modules.special_addition = { enabled: true }
  }
  // ===== 法定退休年龄 =====
  const legalTotalMonths = getRetireTotalMonths(data.birth.year, data.birth.month, data.genderType, config, data.skipDelay)`;

if (content.includes(oldMODULES)) {
  content = content.replace(oldMODULES, newMODULES);
  console.log('✅ 修复2：calculate() 已兼容 MODULES 数组格式');
  modified = true;
} else {
  console.log('⚠️ 修复2：未找到匹配字符串，跳过');
  // 调试：看看实际内容
  const idx = content.indexOf('法定退休年龄');
  if (idx > 0) console.log('  附近内容:', JSON.stringify(content.substring(idx - 80, idx + 40)));
}

// ==========================================
// 修复3：calcTransitionalPension() 兼容三种格式
// ==========================================
const oldCoef = `  const coef = actualYears > 20 ? mod.coefficient_over_20 : mod.coefficient_under_20
  const amount = Math.round(provBase * effectiveYears * avgIndex * coef * 100) / 100`;

const newCoef = `  // 兼容三种格式
  let coef
  if (mod.coefficient !== undefined) {
    coef = mod.coefficient
  } else if (typeof mod.get === 'function') {
    coef = mod.get(actualYears)
  } else if (mod.base !== undefined && mod.alt !== undefined) {
    coef = actualYears > 20 ? mod.base : mod.alt
  } else {
    coef = actualYears > 20 ? mod.coefficient_over_20 : mod.coefficient_under_20
  }
  const amount = Math.round(provBase * effectiveYears * avgIndex * coef * 100) / 100`;

if (content.includes(oldCoef)) {
  content = content.replace(oldCoef, newCoef);
  console.log('✅ 修复3：calcTransitionalPension() 已兼容三种格式');
  modified = true;
} else {
  console.log('⚠️ 修复3：未找到匹配字符串，跳过');
  // 调试：搜索 coef = actualYears
  const idx2 = content.indexOf('coef = actualYears');
  if (idx2 > 0) console.log('  附近内容:', JSON.stringify(content.substring(idx2 - 100, idx2 + 120)));
}

// ==========================================
// 保存
// ==========================================
if (modified) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('\n✅ engine/pension-engine.js 已保存！');
} else {
  console.log('\n⚠️ 没有做任何修改，请检查匹配字符串');
}
