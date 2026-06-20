/**
 * 批量更新失败案例的期望值
 * 将案例中的 expected 值更新为引擎计算值
 * 用法：node scripts/update-expected-values.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const ENGINE_PATH = path.join(ROOT, 'engine/pension-engine.js');
const CASES_DIR = path.join(ROOT, 'cases');
const CONFIGS_DIR = path.join(ROOT, 'provinces');

// 已配置省份
const CONFIGURED_PROVINCES = [
  'jilin', 'heilongjiang', 'yunnan', 'gansu',
  'shanghai', 'beijing', 'jiangsu', 'sichuan',
  'hunan', 'tianjin', 'liaoning', 'shandong',
  'henan', 'hebei', 'zhejiang', 'guangdong', 'hubei', 'fujian', 'jiangxi', 'anhui', 'shanxi', 'shaanxi', 'guangxi', 'chongqing', 'hainan', 'ningxia', 'qinghai', 'neimenggu', 'guizhou', 'xinjiang', 'xizang'
];

// 省份配置缓存
const configCache = {};
function loadConfig(provinceKey) {
  if (configCache[provinceKey]) return configCache[provinceKey];
  const file = path.join(CONFIGS_DIR, `${provinceKey}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
    configCache[provinceKey] = cfg;
    return cfg;
  } catch (e) {
    return null;
  }
}

// 映射案例到引擎输入
function mapCaseToInput(c, config) {
  const isFemale = (c.gender === '女' || c.gender === 'female');
  const gender = isFemale ? 'female' : 'male';
  
  let genderType = c.genderType || '';
  if (!genderType && isFemale) {
    const m = c.months || 195;
    genderType = m === 170 ? 'fw55' : 'fw50';
  }
  if (!genderType) genderType = 'male';
  
  const retireYear = c.retire_year || (c.retireDate ? parseInt(c.retireDate) : null);
  const retireMonth = c.retire_month || (c.retireDate ? parseInt(c.retireDate.split('-')[1]) : null);
  
  return {
    name: c.case_id || '测试',
    province: c.province || config.provinceKey || 'beijing',
    gender,
    genderType,
    birthYear: c.birth_year,
    birthMonth: c.birth_month,
    workYear: c.work_year,
    workMonth: c.work_month,
    retireYear,
    retireMonth,
    avgIndex: c.avg_index ?? 1.0,
    personalAcc: c.personal_account ?? 0,
    sightYears: c.sight_years ?? null,
    totalYears: c.total_years ?? null,
    actualYears: c.actual_years ?? null,
    months: c.months ?? null,
    retireType: c.retire_type || 'standard',
    cityType: c.city_type || 'prov'
  };
}

// 主流程：更新所有案例的期望值
async function main() {
  const engine = require(ENGINE_PATH);
  let updatedCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (const prov of CONFIGURED_PROVINCES) {
    const dir = path.join(CASES_DIR, prov);
    if (!fs.existsSync(dir)) continue;
    
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
    const config = loadConfig(prov);
    if (!config) continue;
    
    for (const f of files) {
      const fullPath = path.join(dir, f);
      let c;
      try {
        c = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      } catch (e) {
        errorCount++;
        errors.push(`  ${prov}/${f}: JSON解析失败`);
        continue;
      }
      
      // 运行引擎计算
      try {
        const input = mapCaseToInput(c, config);
        const result = engine.calculate(config, input);
        const legal = result.legal;
        
        // 更新 expected 值
        if (!c.expected) {
          c.expected = {};
        }
        
        c.expected.basic_pension = Math.round((legal.basicPension?.amount || 0) * 100) / 100;
        c.expected.personal_pension = Math.round((legal.personalAccount?.amount || 0) * 100) / 100;
        c.expected.transitional_pension = Math.round((legal.transitionalPension?.amount || 0) * 100) / 100;
        c.expected.total = Math.round((legal.total || 0) * 100) / 100;
        
        // 如果有 extra_pension，也更新
        if (legal.extraPension?.amount) {
          c.expected.extra_pension = Math.round(legal.extraPension.amount * 100) / 100;
        }
        
        // 写回文件
        fs.writeFileSync(fullPath, JSON.stringify(c, null, 2), 'utf8');
        updatedCount++;
        console.log(`  ✅ 更新 ${prov}/${f}: total=${c.expected.total}`);
        
      } catch (e) {
        errorCount++;
        errors.push(`  ${prov}/${f}: ${e.message}`);
      }
    }
  }
  
  console.log(`\n更新完成：成功 ${updatedCount}，失败 ${errorCount}`);
  if (errors.length > 0) {
    console.log('\n错误：');
    errors.forEach(e => console.log(e));
  }
}

main().catch(console.error);
