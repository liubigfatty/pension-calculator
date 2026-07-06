/**
 * 批量修复 avg_salary_history 格式突变问题
 * 检测比值≈12或≈0.09的年份，自动修复
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

function detectFormatChange(provCode) {
  const jsonPath = path.join(PROVINCES_DIR, `${provCode}.json`);
  if (!fs.existsSync(jsonPath)) return null;
  
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (!data.avg_salary_history) return null;
  
  const years = Object.keys(data.avg_salary_history)
    .filter(k => k !== '_source' && typeof data.avg_salary_history[k] === 'number')
    .map(Number)
    .sort((a, b) => a - b);
  
  // 检测格式突变
  for (let i = 1; i < years.length; i++) {
    const prev = data.avg_salary_history[years[i - 1]];
    const curr = data.avg_salary_history[years[i]];
    if (typeof prev !== 'number' || typeof curr !== 'number') continue;
    
    const ratio = curr / prev;
    
    // 如果比值≈12，说明前一年是元/月，后一年是元/年（或反之）
    // 如果比值≈0.09，说明前一年是元/年，后一年是元/月
    if (ratio > 5) {
      // curr 是 prev 的 5+ 倍，说明 curr 可能是元/年
      return { year: years[i], type: 'current_is_annual', ratio };
    } else if (ratio < 0.2) {
      // curr 是 prev 的 0.2x 倍，说明 prev 可能是元/年
      return { year: years[i - 1], type: 'previous_is_annual', ratio };
    }
  }
  
  return null;
}

function fixProvince(provCode) {
  const jsonPath = path.join(PROVINCES_DIR, `${provCode}.json`);
  if (!fs.existsSync(jsonPath)) return { fixed: 0, details: [] };
  
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (!data.avg_salary_history) return { fixed: 0, details: [] };
  
  const change = detectFormatChange(provCode);
  if (!change) return { fixed: 0, details: [] };
  
  const details = [];
  let fixed = 0;
  
  const years = Object.keys(data.avg_salary_history)
    .filter(k => k !== '_source' && typeof data.avg_salary_history[k] === 'number')
    .map(Number)
    .sort((a, b) => a - b);
  
  if (change.type === 'previous_is_annual') {
    // change.year 之前的数据是元/年，需要÷12
    for (const y of years) {
      if (y <= change.year) {
        const oldValue = data.avg_salary_history[y];
        data.avg_salary_history[y] = Math.round(oldValue / 12 * 100) / 100;
        fixed++;
        details.push({ year: y, oldValue, newValue: data.avg_salary_history[y] });
      }
    }
  } else if (change.type === 'current_is_annual') {
    // change.year 及之后的数据是元/年，需要÷12
    for (const y of years) {
      if (y >= change.year) {
        const oldValue = data.avg_salary_history[y];
        data.avg_salary_history[y] = Math.round(oldValue / 12 * 100) / 100;
        fixed++;
        details.push({ year: y, oldValue, newValue: data.avg_salary_history[y] });
      }
    }
  }
  
  if (fixed > 0) {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  }
  
  return { fixed, details, change };
}

async function main() {
  console.log('开始批量修复 avg_salary_history 格式突变问题...\n');
  
  const results = [];
  
  for (const [provCode, provName] of Object.entries(PROV_NAME_MAP)) {
    const { fixed, details, change } = fixProvince(provCode);
    
    if (fixed > 0) {
      console.log(`✅ ${provName}：修复 ${fixed} 条`);
      console.log(`   格式突变点：${change.year}年（${change.type}）`);
      for (const d of details.slice(0, 5)) {
        console.log(`   ${d.year}年：${d.oldValue} → ${d.newValue}`);
      }
      if (details.length > 5) console.log(`   ...（共${details.length}条）`);
      results.push({ provCode, provName, fixed, details });
    } else {
      // 检查是否有格式突变
      const change = detectFormatChange(provCode);
      if (change) {
        console.log(`⚠️  ${provName}：检测到格式突变但未修复（需要人工确认）`);
      } else {
        console.log(`   ${provName}：格式正常`);
      }
    }
  }
  
  // 验证修复结果
  console.log('\n===== 验证修复结果 =====');
  let issues = 0;
  for (const [provCode, provName] of Object.entries(PROV_NAME_MAP)) {
    const change = detectFormatChange(provCode);
    if (change) {
      console.log(`⚠️  ${provName}：仍有格式突变`);
      issues++;
    }
  }
  
  if (issues === 0) {
    console.log('✅ 所有省份格式突变已修复');
  }
  
  // 写入修复报告
  let report = '# avg_salary_history 格式突变修复报告\n\n';
  report += `修复时间：${new Date().toISOString().split('T')[0]}\n\n`;
  report += `## 修复方法\n\n`;
  report += `检测比值≈12或≈0.09的年份，自动修复格式突变问题\n\n`;
  
  report += `## 修复详情\n\n`;
  if (results.length === 0) {
    report += `无需修复\n`;
  } else {
    for (const r of results) {
      report += `### ${r.provName}\n\n`;
      report += `修复条数：${r.fixed}\n\n`;
      report += `| 年份 | 旧值 | 新值 |\n`;
      report += `|------|------|------|\n`;
      for (const d of r.details) {
        report += `| ${d.year} | ${d.oldValue} | ${d.newValue} |\n`;
      }
      report += `\n`;
    }
  }
  
  const reportPath = 'C:/Users/14041/养老金数据整理/格式突变修复报告.md';
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`\n修复报告已写入：${reportPath}`);
}

main().catch(console.error);
