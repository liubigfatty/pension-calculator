/**
 * 智能修复 avg_salary_history 数据格式
 * 方法：用 PROV_BASE 作为基准，检测格式不一致的年
 */

const fs = require('fs');
const path = require('path');

const PROVINCES_DIR = 'C:/Users/14041/AppData/Roaming/winclaw/.openclaw/workspace/养老金计算平台/cloudfunctions/calculate/provinces';

const PROV_NAME_MAP = {
  beijing: '北京', tianjin: '天津', shanghai: '上海', chongqing: '重庆',
  hebei: '河北', shanxi: '山西', liaoning: '辽宁', jilin: '吉林',
  heilongjiang: '黑龙江', jiangsu: '江苏', zhejiang: '浙江', anhui: '安徽',
  fujian: '福建', jiangxi: '江西', shandong: '山东', henan: '河南',
  hubei: '湖北', hunan: '湖南', guangdong: '广东', hainan: '海南',
  sichuan: '四川', guizhou: '贵州', yunnan: '云南', shaanxi: '陕西',
  gansu: '甘肃', qinghai: '青海',
  neimenggu: '内蒙古', guangxi: '广西', xizang: '西藏', ningxia: '宁夏',
  xinjiang: '新疆'
};

function fixProvince(provCode) {
  const jsonPath = path.join(PROVINCES_DIR, `${provCode}.json`);
  if (!fs.existsSync(jsonPath)) return { fixed: 0, details: [] };
  
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (!data.avg_salary_history) return { fixed: 0, details: [] };
  
  const provBase = data.base_rates?.prov;
  const details = [];
  let fixed = 0;
  
  // 方法1：用 PROV_BASE 检测（最准确）
  if (provBase) {
    const commonYears = Object.keys(data.avg_salary_history).filter(
      k => k !== '_source' && typeof provBase[k] === 'number' && typeof data.avg_salary_history[k] === 'number'
    );
    
    for (const year of commonYears) {
      const avg = data.avg_salary_history[year];
      const prov = provBase[year];
      const ratio = avg / prov;
      
      // 如果比值接近 12（±3），说明 avg 是元/年
      // 如果比值接近 1（±0.5），说明 avg 是元/月
      if (ratio > 5 && ratio < 20) {
        // 可能是元/年
        const oldValue = avg;
        data.avg_salary_history[year] = Math.round(avg / 12 * 100) / 100;
        fixed++;
        details.push({ year, oldValue, newValue: data.avg_salary_history[year], reason: `比值${ratio.toFixed(1)}≈12，元/年→元/月` });
      }
    }
  }
  
  // 方法2：用阈值检测（没有 PROV_BASE 的年份）
  // 如果值 > 50000，肯定是元/年
  // 如果值 > 5000 且年份 < 2000，可能是元/年
  const entries = Object.entries(data.avg_salary_history).filter(([k, v]) => k !== '_source');
  for (const [year, value] of entries) {
    if (typeof value !== 'number' || isNaN(value)) continue;
    if (value === null) continue; // 跳过 null
    
    // 已经修复过的跳过
    if (details.some(d => d.year == year)) continue;
    
    if (value > 50000) {
      const oldValue = value;
      data.avg_salary_history[year] = Math.round(value / 12 * 100) / 100;
      fixed++;
      details.push({ year, oldValue, newValue: data.avg_salary_history[year], reason: '值>50000，元/年→元/月' });
    } else if (value > 5000 && parseInt(year) < 2000) {
      // 2000年之前，值>5000，可能是元/年
      // 但需要谨慎，可能是正常的（如北京2023=11525）
      // 跳过，需要人工确认
    }
  }
  
  if (fixed > 0) {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  }
  
  return { fixed, details };
}

async function main() {
  console.log('开始智能修复 avg_salary_history 数据格式...\n');
  console.log('方法：用 PROV_BASE 作为基准，检测比值≈12的年份\n');
  
  const results = [];
  
  for (const [provCode, provName] of Object.entries(PROV_NAME_MAP)) {
    const { fixed, details } = fixProvince(provCode);
    
    if (fixed > 0) {
      console.log(`✅ ${provName}：修复 ${fixed} 条`);
      for (const d of details) {
        console.log(`   ${d.year}年：${d.oldValue} → ${d.newValue}（${d.reason}）`);
      }
      results.push({ provCode, provName, fixed, details });
    } else {
      console.log(`   ${provName}：无需修复`);
    }
  }
  
  // 验证修复结果
  console.log('\n===== 验证修复结果 =====');
  let allValid = true;
  for (const [provCode, provName] of Object.entries(PROV_NAME_MAP)) {
    const jsonPath = path.join(PROVINCES_DIR, `${provCode}.json`);
    if (!fs.existsSync(jsonPath)) continue;
    
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const provBase = data.base_rates?.prov;
    if (!provBase) continue;
    
    const commonYears = Object.keys(data.avg_salary_history || {}).filter(
      k => k !== '_source' && typeof provBase[k] === 'number' && typeof data.avg_salary_history[k] === 'number'
    );
    
    for (const year of commonYears) {
      const avg = data.avg_salary_history[year];
      const prov = provBase[year];
      const ratio = avg / prov;
      
      if (ratio > 5) {
        console.log(`⚠️  ${provName} ${year}年：比值=${ratio.toFixed(2)}，可能仍有格式问题`);
        allValid = false;
      }
    }
  }
  
  if (allValid) {
    console.log('✅ 所有省份数据格式验证通过');
  }
  
  // 写入修复报告
  let report = '# avg_salary_history 智能修复报告\n\n';
  report += `修复时间：${new Date().toISOString().split('T')[0]}\n\n`;
  report += `## 修复方法\n\n`;
  report += `1. 用 PROV_BASE 作为基准，检测比值≈12的年份（元/年→元/月）\n`;
  report += `2. 用阈值检测：值>50000 认为是元/年\n\n`;
  
  report += `## 修复详情\n\n`;
  if (results.length === 0) {
    report += `无需修复\n`;
  } else {
    for (const r of results) {
      report += `### ${r.provName}\n\n`;
      report += `修复条数：${r.fixed}\n\n`;
      report += `| 年份 | 旧值 | 新值 | 原因 |\n`;
      report += `|------|------|------|------|\n`;
      for (const d of r.details) {
        report += `| ${d.year} | ${d.oldValue} | ${d.newValue} | ${d.reason} |\n`;
      }
      report += `\n`;
    }
  }
  
  const reportPath = 'C:/Users/14041/养老金数据整理/智能修复报告.md';
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`\n修复报告已写入：${reportPath}`);
}

main().catch(console.error);
