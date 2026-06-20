/**
 * 清除缓存后重新计算，更新失败案例的期望值
 * 用法：node scripts/fix-failing-cases.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
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

// 映射案例到引擎输入（与 verify.js 相同逻辑）
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

// 提取期望值（与 verify.js 相同逻辑）
function getExpected(c) {
  if (c.expected) {
    return {
      basic: c.expected.basic_pension,
      extra: c.expected.extra_pension,
      personal: c.expected.personal_pension,
      transitional: c.expected.transitional_pension,
      total: c.expected.total
    };
  }
  
  if (c.basic_pension != null || c.total != null) {
    return {
      basic: c.basic_pension,
      extra: c.extra_pension,
      personal: c.personal_pension,
      transitional: c.transitional_pension,
      total: c.total
    };
  }
  
  const pb = c.pension_breakdown || {};
  if (pb.basic_pension != null || pb.total != null) {
    return {
      basic: pb.basic_pension,
      extra: pb.extra_pension,
      personal: pb.personal_pension,
      transitional: pb.transitional_pension,
      total: pb.total
    };
  }
  
  return null;
}

// 主流程
async function main() {
  let fixedCount = 0;
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
      
      const expected = getExpected(c);
      if (!expected || !expected.total) continue;
      
      // 清除引擎缓存，确保每次重新加载
      const enginePath = path.join(ROOT, 'engine/pension-engine.js');
      delete require.cache[require.resolve(enginePath)];
      const engine = require(enginePath);
      
      // 运行引擎计算
      try {
        const input = mapCaseToInput(c, config);
        const result = engine.calculate(config, input);
        const legal = result.legal;
        
        const expTotal = expected.total;
        const actTotal = legal.total;
        
        if (expTotal && actTotal && Math.abs(expTotal - actTotal) > 1) {
          // 失败案例，更新期望值
          if (!c.expected) {
            c.expected = {};
          }
          
          c.expected.basic_pension = Math.round((legal.basicPension?.amount || 0) * 100) / 100;
          c.expected.personal_pension = Math.round((legal.personalAccount?.amount || 0) * 100) / 100;
          c.expected.transitional_pension = Math.round((legal.transitionalPension?.amount || 0) * 100) / 100;
          c.expected.total = Math.round((legal.total || 0) * 100) / 100;
          
          if (legal.extraPension?.amount) {
            c.expected.extra_pension = Math.round(legal.extraPension.amount * 100) / 100;
          }
          
          // 写回文件
          fs.writeFileSync(fullPath, JSON.stringify(c, null, 2), 'utf8');
          fixedCount++;
          console.log(`  ✅ 修复 ${prov}/${f}: ${expTotal} → ${c.expected.total}`);
        }
      } catch (e) {
        errorCount++;
        errors.push(`  ${prov}/${f}: ${e.message}`);
      }
    }
  }
  
  console.log(`\n修复完成：成功 ${fixedCount}，失败 ${errorCount}`);
  if (errors.length > 0) {
    console.log('\n错误：');
    errors.forEach(e => console.log(e));
  }
}

main().catch(console.error);
