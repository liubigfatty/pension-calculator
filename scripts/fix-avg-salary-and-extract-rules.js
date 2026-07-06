/**
 * 修复所有省份的 avg_salary_history 数据格式
 * 将元/年数据÷12转换为元/月
 * 同时提取各省特殊规则
 */

const fs = require('fs');
const path = require('path');

const PROVINCES_DIR = path.join(__dirname, '../cloudfunctions/calculate/provinces');

// 省份中文名映射
const PROV_NAME_MAP = {
  beijing: '北京', tianjin: '天津', shanghai: '上海', chongqing: '重庆',
  hebei: '河北', shanxi: '山西', liaoning: '辽宁', jilin: '吉林',
  heilongjiang: '黑龙江', jiangsu: '江苏', zhejiang: '浙江', anhui: '安徽',
  fujian: '福建', jiangxi: '江西', shandong: '山东', henan: '河南',
  hubei: '湖北', hunan: '湖南', guangdong: '广东', hainan: '海南',
  sichuan: '四川', guizhou: '贵州', yunnan: '云南', shaanxi: '陕西',
  gansu: '甘肃', qinghai: '青海', taiwan: '台湾',
  neimenggu: '内蒙古', guangxi: '广西', xizang: '西藏', ningxia: '宁夏',
  xinjiang: '新疆'
};

// 修复 avg_salary_history 数据格式
function fixAvgSalaryHistory(data) {
  if (!data.avg_salary_history) return { fixed: 0, total: 0, details: [] };
  
  const details = [];
  let fixed = 0;
  const entries = Object.entries(data.avg_salary_history).filter(([k, v]) => k !== '_source');
  const total = entries.length;
  
  for (const [year, value] of entries) {
    if (typeof value !== 'number' || isNaN(value)) continue;
    
    // 如果值 > 50000，认为是元/年，需要÷12
    if (value > 50000) {
      const oldValue = value;
      data.avg_salary_history[year] = Math.round(value / 12 * 100) / 100;
      fixed++;
      details.push({ year, oldValue, newValue: data.avg_salary_history[year] });
    }
  }
  
  return { fixed, total, details };
}

// 从 JS 文件中提取特殊规则
function extractSpecialRules(provCode) {
  const jsPath = path.join(PROVINCES_DIR, `${provCode}.js`);
  if (!fs.existsSync(jsPath)) return null;
  
  const content = fs.readFileSync(jsPath, 'utf8');
  const rules = {
    provCode,
    specialAdditions: [], // 特殊附加（如西藏高原补贴）
    extraModules: [],     // 额外模块
    specialFormulas: [],  // 特殊公式
    notes: []
  };
  
  // 1. 提取 special_addition 配置
  const specialAddMatch = content.match(/special_addition:\s*\{[^}]+\}/s);
  if (specialAddMatch) {
    try {
      const fn = new Function(`return ${specialAddMatch[0]}`);
      const specialAdd = fn();
      if (specialAdd.enabled) {
        rules.specialAdditions.push({
          type: specialAdd.type || '未知',
          description: getSpecialAdditionDescription(specialAdd)
        });
      }
    } catch (e) {
      // 手动解析
      if (content.includes('plateau')) {
        rules.specialAdditions.push({ type: 'plateau', description: '高原补贴' });
      }
    }
  }
  
  // 2. 检查是否有高原补贴（西藏）
  if (provCode === 'xizang') {
    rules.specialAdditions.push({
      type: 'plateau',
      description: '高原补贴 + 固定补贴（交通费30元+取暖防寒费39.88元+过渡期福利金260元=329.88元）'
    });
  }
  
  // 3. 检查是否有深圳100元保障
  if (provCode === 'guangdong' && content.includes('SHENZHEN_SUBSIDY')) {
    rules.extraModules.push({
      name: '深圳100元保障',
      description: '深圳市额外养老金100元/月'
    });
  }
  
  // 4. 检查过渡系数是否有特殊规则
  const transCoefMatch = content.match(/const TRANS_COEF\s*=\s*([^;]+)/);
  if (transCoefMatch) {
    const val = transCoefMatch[1].trim();
    if (val.includes('{')) {
      rules.specialFormulas.push({
        name: '过渡系数',
        description: '过渡系数分档（缴费满20年/不满20年不同）'
      });
    }
  }
  
  // 5. 检查是否有特殊的计算公式（如浙江的 G同/G实分离）
  if (provCode === 'zhejiang') {
    rules.specialFormulas.push({
      name: '过渡性养老金',
      description: 'G同/G实分离：transitional_pension.amount = G同（不含G实），G实通过 _gShiAmount 字段返回'
    });
  }
  
  // 6. 检查是否有特殊的 index 计算方式
  if (content.includes('doubleIndex') || content.includes('双指数')) {
    rules.specialFormulas.push({
      name: '缴费指数',
      description: '双指数省份（transIndex + preAccountYears）'
    });
  }
  
  // 7. 提取 notes
  const notesMatch = content.match(/notes:\s*'([^']*)'/);
  if (notesMatch) {
    rules.notes.push(notesMatch[1]);
  }
  
  return rules;
}

function getSpecialAdditionDescription(specialAdd) {
  if (specialAdd.type === 'plateau') {
    return '高原补贴（满10年5%/满15年10%/满20年15%）';
  }
  return specialAdd.type;
}

// 主函数：修复所有省份的 avg_salary_history
async function fixAllProvinces() {
  console.log('开始修复 avg_salary_history 数据格式...\n');
  
  const results = [];
  
  for (const [provCode, provName] of Object.entries(PROV_NAME_MAP)) {
    const jsonPath = path.join(PROVINCES_DIR, `${provCode}.json`);
    
    if (!fs.existsSync(jsonPath)) {
      console.log(`  跳过 ${provName}（无.json文件）`);
      continue;
    }
    
    try {
      const content = fs.readFileSync(jsonPath, 'utf8');
      const data = JSON.parse(content);
      
      if (!data.avg_salary_history) {
        console.log(`  ${provName}：无 avg_salary_history 数据`);
        results.push({ provCode, provName, fixed: 0, total: 0, details: [] });
        continue;
      }
      
      const { fixed, total, details } = fixAvgSalaryHistory(data);
      
      if (fixed > 0) {
        // 写回文件
        fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`  ✅ ${provName}：修复 ${fixed}/${total} 条数据`);
        for (const d of details) {
          console.log(`     ${d.year}年：${d.oldValue} → ${d.newValue}`);
        }
      } else {
        console.log(`  ${provName}：无需修复`);
      }
      
      results.push({ provCode, provName, fixed, total, details });
      
    } catch (e) {
      console.log(`  ❌ ${provName}：错误 - ${e.message}`);
      results.push({ provCode, provName, error: e.message });
    }
  }
  
  // 汇总
  console.log('\n===== 修复完成 =====');
  const totalFixed = results.reduce((sum, r) => sum + (r.fixed || 0), 0);
  const totalProvs = results.filter(r => r.fixed !== undefined).length;
  console.log(`共处理 ${totalProvs} 个省份，修复 ${totalFixed} 条数据`);
  
  // 写入修复报告
  let report = '# avg_salary_history 数据格式修复报告\n\n';
  report += `修复时间：${new Date().toISOString().split('T')[0]}\n\n`;
  report += `## 修复规则\n\n`;
  report += `- 如果值 > 50000，认为是元/年格式，÷12 转换为元/月\n`;
  report += `- 如果值 ≤ 50000，认为是元/月格式，保持不变\n\n`;
  
  report += `## 修复详情\n\n`;
  report += `| 省份 | 修复条数 | 总条数 | 状态 |\n`;
  report += `|------|---------|--------|------|\n`;
  for (const r of results) {
    if (r.error) {
      report += `| ${r.provName} | - | - | ❌ ${r.error} |\n`;
    } else {
      const status = r.fixed > 0 ? '✅ 已修复' : '✅ 无需修复';
      report += `| ${r.provName} | ${r.fixed} | ${r.total} | ${status} |\n`;
    }
  }
  
  const reportPath = path.join(__dirname, '../../../养老金数据整理/修复报告.md');
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`\n修复报告已写入：${reportPath}`);
}

// 主函数：提取各省特殊规则
async function extractAllSpecialRules() {
  console.log('\n开始提取各省特殊规则...\n');
  
  const results = [];
  
  for (const [provCode, provName] of Object.entries(PROV_NAME_MAP)) {
    const jsPath = path.join(PROVINCES_DIR, `${provCode}.js`);
    
    if (!fs.existsSync(jsPath)) {
      continue;
    }
    
    console.log(`  处理 ${provName}...`);
    const rules = extractSpecialRules(provCode);
    
    if (rules) {
      results.push(rules);
    }
  }
  
  // 生成特殊规则汇总
  let md = '# 各省养老保险特殊规则汇总\n\n';
  md += `> 提取时间：${new Date().toISOString().split('T')[0]}\n\n`;
  
  md += `## 一、特殊附加补贴\n\n`;
  md += `| 省份 | 补贴类型 | 说明 |\n`;
  md += `|------|---------|------|\n`;
  for (const r of results) {
    if (r.specialAdditions.length > 0) {
      for (const add of r.specialAdditions) {
        md += `| ${PROV_NAME_MAP[r.provCode] || r.provCode} | ${add.type} | ${add.description} |\n`;
      }
    }
  }
  
  md += `\n## 二、额外计算模块\n\n`;
  md += `| 省份 | 模块名称 | 说明 |\n`;
  md += `|------|---------|------|\n`;
  for (const r of results) {
    if (r.extraModules.length > 0) {
      for (const mod of r.extraModules) {
        md += `| ${PROV_NAME_MAP[r.provCode] || r.provCode} | ${mod.name} | ${mod.description} |\n`;
      }
    }
  }
  
  md += `\n## 三、特殊计算公式\n\n`;
  md += `| 省份 | 公式名称 | 说明 |\n`;
  md += `|------|---------|------|\n`;
  for (const r of results) {
    if (r.specialFormulas.length > 0) {
      for (const f of r.specialFormulas) {
        md += `| ${PROV_NAME_MAP[r.provCode] || r.provCode} | ${f.name} | ${f.description} |\n`;
      }
    }
  }
  
  md += `\n## 四、各省详细规则\n\n`;
  for (const r of results) {
    const provName = PROV_NAME_MAP[r.provCode] || r.provCode;
    md += `### ${provName}\n\n`;
    
    if (r.specialAdditions.length > 0) {
      md += `**特殊附加补贴：**\n\n`;
      for (const add of r.specialAdditions) {
        md += `- ${add.type}：${add.description}\n`;
      }
      md += `\n`;
    }
    
    if (r.extraModules.length > 0) {
      md += `**额外计算模块：**\n\n`;
      for (const mod of r.extraModules) {
        md += `- ${mod.name}：${mod.description}\n`;
      }
      md += `\n`;
    }
    
    if (r.specialFormulas.length > 0) {
      md += `**特殊计算公式：**\n\n`;
      for (const f of r.specialFormulas) {
        md += `- ${f.name}：${f.description}\n`;
      }
      md += `\n`;
    }
    
    if (r.notes.length > 0) {
      md += `**备注：**\n\n`;
      for (const note of r.notes) {
        md += `- ${note}\n`;
      }
      md += `\n`;
    }
    
    if (r.specialAdditions.length === 0 && r.extraModules.length === 0 && r.specialFormulas.length === 0 && r.notes.length === 0) {
      md += `无特殊规则\n\n`;
    }
  }
  
  const mdPath = path.join(__dirname, '../../../养老金数据整理/全国通用/各省特殊规则汇总.md');
  fs.writeFileSync(mdPath, md, 'utf8');
  console.log(`\n特殊规则汇总已写入：${mdPath}`);
}

// 运行
(async () => {
  await fixAllProvinces();
  await extractAllSpecialRules();
})().catch(console.error);
