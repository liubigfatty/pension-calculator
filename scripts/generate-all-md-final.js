/**
 * 最终版：生成所有省份的完整MD文件（使用Write工具）
 */

const fs = require('fs');
const path = require('path');

const PROVINCES_DIR = 'C:/Users/14041/AppData/Roaming/winclaw/.openclaw/workspace/养老金计算平台/cloudfunctions/calculate/provinces';
const OUTPUT_BASE = 'C:/Users/14041/养老金数据整理';

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

function generateSalaryMd(provCode, provName, data) {
  let md = `# ${provName}社平工资历史数据\n\n`;
  md += `> 数据来源：养老金计算平台小程序\n`;
  md += `> 提取时间：2026-07-06\n`;
  md += `> 数据格式：**元/月**\n\n`;
  
  if (data.avg_salary_history) {
    md += `## avg_salary_history（用于个人账户计算）\n\n`;
    md += `（单位：元/月）\n\n`;
    md += `| 年份 | 社平工资（元/月） |\n`;
    md += `|------|-------------------|\n`;
    const entries = Object.entries(data.avg_salary_history).filter(([k, v]) => k !== '_source').sort((a, b) => a[0] - b[0]);
    for (const [year, value] of entries) {
      if (typeof value === 'number') {
        md += `| ${year} | ${value} |\n`;
      } else if (value === null) {
        md += `| ${year} | （数据缺失） |\n`;
      } else {
        md += `| ${year} | ${value} |\n`;
      }
    }
    md += `\n`;
  }
  
  if (data.base_rates && data.base_rates.prov) {
    md += `## 计发基数（PROV_BASE）\n\n`;
    md += `> 计发基数用于养老金计算，与社平工资可能不同\n\n`;
    md += `（单位：元/月）\n\n`;
    md += `| 年份 | 计发基数（元/月） |\n`;
    md += `|------|-------------------|\n`;
    const entries = Object.entries(data.base_rates.prov).sort((a, b) => a[0] - b[0]);
    for (const [year, value] of entries) {
      md += `| ${year} | ${value} |\n`;
    }
    md += `\n`;
  }
  
  return md;
}

function generateRulesMd(provCode, provName, data) {
  let md = `# ${provName}养老保险计算规则\n\n`;
  md += `> 数据来源：养老金计算平台小程序\n`;
  md += `> 提取时间：2026-07-06\n\n`;
  
  md += `## 一、基本参数\n\n`;
  md += `### 1.1 个人账户建账时间\n\n`;
  if (data.account_start) {
    md += `**${data.account_start.year}年${data.account_start.month}月**\n\n`;
  } else {
    md += `（无数据）\n\n`;
  }
  
  md += `### 1.2 视同缴费截止时间\n\n`;
  if (data.cutoff_date) {
    md += `**${data.cutoff_date.year}年${data.cutoff_date.month}月**\n\n`;
  } else {
    md += `（无数据）\n\n`;
  }
  
  md += `### 1.3 过渡系数\n\n`;
  if (typeof data.trans_coef === 'number') {
    md += `**${(data.trans_coef * 100).toFixed(2)}%**\n\n`;
  } else if (typeof data.trans_coef === 'object') {
    md += `- 缴费满20年：**${(data.trans_coef.base * 100).toFixed(2)}%**\n`;
    md += `- 缴费不满20年：**${(data.trans_coef.alt * 100).toFixed(2)}%**\n\n`;
  } else {
    md += `（无数据）\n\n`;
  }
  
  // 特殊规则
  const specialRules = extractSpecialRules(provCode);
  if (specialRules.length > 0) {
    md += `## 二、特殊规则\n\n`;
    for (const rule of specialRules) {
      md += `### ${rule.type} - ${rule.name}\n\n`;
      md += `${rule.desc}\n\n`;
    }
  }
  
  // 通用公式
  md += `## ${specialRules.length > 0 ? '三' : '二'}、计算公式\n\n`;
  md += `### ${specialRules.length > 0 ? '三' : '二'}.1 基础养老金\n\n`;
  md += `公式：(退休时上年度计发基数 + 指数化月平均缴费工资) ÷ 2 × 累计缴费年限 × 1%\n\n`;
  md += `### ${specialRules.length > 0 ? '三' : '二'}.2 个人账户养老金\n\n`;
  md += `公式：个人账户累计储存额 ÷ 计发月数\n\n`;
  md += `### ${specialRules.length > 0 ? '三' : '二'}.3 过渡性养老金\n\n`;
  md += `公式：退休时上年度计发基数 × 视同缴费指数 × 视同缴费年限 × 过渡系数\n\n`;
  
  return md;
}

function extractSpecialRules(provCode) {
  const jsPath = path.join(PROVINCES_DIR, `${provCode}.js`);
  if (!fs.existsSync(jsPath)) return [];
  
  const content = fs.readFileSync(jsPath, 'utf8');
  const rules = [];
  
  if (provCode === 'xizang') {
    rules.push({
      type: '特殊附加补贴',
      name: '高原补贴',
      desc: '高原补贴 = 本人指数化月平均缴费工资 × 比例（满10年5%/满15年10%/满20年15%）\n固定补贴：交通费30元+取暖防寒费39.88元+过渡期福利金260元=329.88元/月'
    });
  }
  
  if (provCode === 'guangdong' && content.includes('shenzhen')) {
    rules.push({
      type: '额外养老金',
      name: '深圳100元保障',
      desc: '深圳市企业职工基本养老金加发100元/月'
    });
  }
  
  if (provCode === 'zhejiang' || provCode === 'beijing') {
    rules.push({
      type: '计算规则',
      name: 'G同/G实分离',
      desc: 'transitional_pension.amount = G同（不含G实）\nG实通过 _gShiAmount 字段返回'
    });
  }
  
  return rules;
}

// 主函数：生成所有文件
async function main() {
  console.log('开始生成所有省份的MD文件...\n');
  
  const results = [];
  
  for (const [provCode, provName] of Object.entries(PROV_NAME_MAP)) {
    try {
      const jsonPath = path.join(PROVINCES_DIR, `${provCode}.json`);
      if (!fs.existsSync(jsonPath)) {
        console.log(`  跳过 ${provName}（无JSON文件）`);
        continue;
      }
      
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      
      const salaryMd = generateSalaryMd(provCode, provName, data);
      const rulesMd = generateRulesMd(provCode, provName, data);
      
      results.push({
        provCode,
        provName,
        salaryMd,
        rulesMd
      });
      
      console.log(`  ${provName}：内容已生成`);
      
    } catch (e) {
      console.log(`  ${provName}：错误 - ${e.message}`);
    }
  }
  
  // 写入文件
  console.log('\n写入文件...');
  for (const r of results) {
    const provDir = path.join(OUTPUT_BASE, r.provName);
    if (!fs.existsSync(provDir)) {
      fs.mkdirSync(provDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(provDir, '社平工资历史数据.md'), r.salaryMd, 'utf8');
    fs.writeFileSync(path.join(provDir, '养老保险计算规则.md'), r.rulesMd, 'utf8');
  }
  
  console.log(`\n完成！共生成 ${results.length} 个省份的文件`);
  console.log(`输出目录：${OUTPUT_BASE}`);
}

main().catch(console.error);
