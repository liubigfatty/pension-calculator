/**
 * 最终版：生成所有省份的完整MD文件 + 提取特殊规则
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

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// 从 JS 文件提取特殊规则
function extractSpecialRules(provCode) {
  const jsPath = path.join(PROVINCES_DIR, `${provCode}.js`);
  if (!fs.existsSync(jsPath)) return [];
  
  const content = fs.readFileSync(jsPath, 'utf8');
  const rules = [];
  
  // 1. 特殊附加补贴
  if (content.includes('special_addition') && content.includes('enabled: true')) {
    if (provCode === 'xizang') {
      rules.push({
        type: '特殊附加补贴',
        name: '高原补贴',
        desc: '高原补贴 = 本人指数化月平均缴费工资 × 比例（满10年5%/满15年10%/满20年15%）\n固定补贴：交通费30元+取暖防寒费39.88元+过渡期福利金260元=329.88元/月'
      });
    }
  }
  
  // 2. 深圳额外养老金
  if (provCode === 'guangdong' && content.includes('shenzhen') || content.includes('SHENZHEN')) {
    rules.push({
      type: '额外养老金',
      name: '深圳100元保障',
      desc: '深圳市企业职工基本养老金加发100元/月（粤劳电[2009]32号）'
    });
  }
  
  // 3. 浙江/北京 G同/G实分离
  if (provCode === 'zhejiang' || provCode === 'beijing') {
    rules.push({
      type: '计算规则',
      name: '过渡性养老金G同/G实分离',
      desc: 'transitional_pension.amount = G同（不含G实）\nG实通过 _gShiAmount 字段返回并加入 total'
    });
  }
  
  // 4. 双指数省份
  if (provCode === 'zhejiang' || provCode === 'guangdong' || provCode === 'shaanxi') {
    rules.push({
      type: '计算规则',
      name: '双指数',
      desc: '过渡性养老金用 transIndex + preAccountYears，不用 sightYears'
    });
  }
  
  // 5. 提取 notes
  const notesMatches = content.match(/notes:\s*'([^']*)'/g);
  if (notesMatches) {
    for (const m of notesMatches) {
      const noteMatch = m.match(/notes:\s*'([^']*)'/);
      if (noteMatch) {
        rules.push({
          type: '备注',
          name: '说明',
          desc: noteMatch[1]
        });
      }
    }
  }
  
  return rules;
}

// 生成省份 MD 文件
function generateProvinceFiles(provCode, provName) {
  const jsonPath = path.join(PROVINCES_DIR, `${provCode}.json`);
  if (!fs.existsSync(jsonPath)) return;
  
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const avgSalary = data.avg_salary_history;
  const provBase = data.base_rates?.prov;
  const accountStart = data.account_start;
  const cutoffDate = data.cutoff_date;
  const transCoef = data.trans_coef;
  
  // 1. 社平工资文件
  let salaryMd = `# ${provName}社平工资历史数据\n\n`;
  salaryMd += `> 数据来源：养老金计算平台小程序\n`;
  salaryMd += `> 提取时间：${new Date().toISOString().split('T')[0]}\n`;
  salaryMd += `> 数据格式：**元/月**\n\n`;
  
  if (avgSalary) {
    salaryMd += `## avg_salary_history（用于个人账户计算）\n\n`;
    salaryMd += `（单位：元/月）\n\n`;
    salaryMd += `| 年份 | 社平工资（元/月） |\n`;
    salaryMd += `|------|-------------------|\n`;
    const entries = Object.entries(avgSalary).filter(([k, v]) => k !== '_source').sort((a, b) => a[0] - b[0]);
    for (const [year, value] of entries) {
      if (typeof value === 'number') {
        salaryMd += `| ${year} | ${value} |\n`;
      } else if (value === null) {
        salaryMd += `| ${year} | （数据缺失） |\n`;
      } else {
        salaryMd += `| ${year} | ${value} |\n`;
      }
    }
    salaryMd += `\n`;
  }
  
  if (provBase) {
    salaryMd += `## 计发基数（PROV_BASE）\n\n`;
    salaryMd += `> 计发基数用于养老金计算，与社平工资可能不同\n\n`;
    salaryMd += `（单位：元/月）\n\n`;
    salaryMd += `| 年份 | 计发基数（元/月） |\n`;
    salaryMd += `|------|-------------------|\n`;
    const entries = Object.entries(provBase).sort((a, b) => a[0] - b[0]);
    for (const [year, value] of entries) {
      salaryMd += `| ${year} | ${value} |\n`;
    }
    salaryMd += `\n`;
  }
  
  // 2. 计算规则文件
  let rulesMd = `# ${provName}养老保险计算规则\n\n`;
  rulesMd += `> 数据来源：养老金计算平台小程序\n`;
  rulesMd += `> 提取时间：${new Date().toISOString().split('T')[0]}\n\n`;
  
  rulesMd += `## 一、基本参数\n\n`;
  rulesMd += `### 1.1 个人账户建账时间\n\n`;
  if (accountStart) {
    rulesMd += `**${accountStart.year}年${accountStart.month}月**\n\n`;
  } else {
    rulesMd += `（无数据）\n\n`;
  }
  
  rulesMd += `### 1.2 视同缴费截止时间\n\n`;
  if (cutoffDate) {
    rulesMd += `**${cutoffDate.year}年${cutoffDate.month}月**\n\n`;
  } else {
    rulesMd += `（无数据）\n\n`;
  }
  
  rulesMd += `### 1.3 过渡系数\n\n`;
  if (typeof transCoef === 'number') {
    rulesMd += `**${(transCoef * 100).toFixed(2)}%**\n\n`;
  } else if (typeof transCoef === 'object') {
    rulesMd += `- 缴费满20年：**${(transCoef.base * 100).toFixed(2)}%**\n`;
    rulesMd += `- 缴费不满20年：**${(transCoef.alt * 100).toFixed(2)}%**\n\n`;
  } else {
    rulesMd += `（无数据）\n\n`;
  }
  
  // 特殊规则
  const specialRules = extractSpecialRules(provCode);
  if (specialRules.length > 0) {
    rulesMd += `## 二、特殊规则\n\n`;
    for (const rule of specialRules) {
      rulesMd += `### ${rule.type} - ${rule.name}\n\n`;
      rulesMd += `${rule.desc}\n\n`;
    }
  }
  
  // 通用公式
  rulesMd += `## ${specialRules.length > 0 ? '三' : '二'}、计算公式\n\n`;
  rulesMd += `### ${specialRules.length > 0 ? '三' : '二'}.1 基础养老金\n\n`;
  rulesMd += `公式：(退休时上年度计发基数 + 指数化月平均缴费工资) ÷ 2 × 累计缴费年限 × 1%\n\n`;
  rulesMd += `### ${specialRules.length > 0 ? '三' : '二'}.2 个人账户养老金\n\n`;
  rulesMd += `公式：个人账户累计储存额 ÷ 计发月数\n\n`;
  rulesMd += `### ${specialRules.length > 0 ? '三' : '二'}.3 过渡性养老金\n\n`;
  rulesMd += `公式：退休时上年度计发基数 × 视同缴费指数 × 视同缴费年限 × 过渡系数\n\n`;
  
  // 写入文件
  const provDir = path.join(OUTPUT_BASE, provName);
  ensureDir(provDir);
  fs.writeFileSync(path.join(provDir, '社平工资历史数据.md'), salaryMd, 'utf8');
  fs.writeFileSync(path.join(provDir, '养老保险计算规则.md'), rulesMd, 'utf8');
}

// 生成全国通用文件
function generateNationalFiles() {
  const nationalDir = path.join(OUTPUT_BASE, '全国通用');
  ensureDir(nationalDir);
  
  // 1. 记账利率表
  const enginePath = path.join(__dirname, '../engine/pension-engine.js');
  if (!fs.existsSync(enginePath)) {
    console.log('警告：pension-engine.js 不存在');
    return;
  }
  
  const engineContent = fs.readFileSync(enginePath, 'utf8');
  
  // 提取记账利率
  const nationalRates = {};
  const pre2016Rates = {};
  
  const nirMatch = engineContent.match(/const NATIONAL_INTEREST_RATES\s*=\s*\{([\s\S]*?)\n\};/);
  if (nirMatch) {
    const items = nirMatch[1].match(/(\d+):\s*([0-9.]+)/g);
    if (items) {
      for (const item of items) {
        const [year, rate] = item.split(':').map(s => s.trim());
        nationalRates[year] = parseFloat(rate);
      }
    }
  }
  
  const preMatch = engineContent.match(/const NATIONAL_PRE2016_INTEREST_RATES\s*=\s*\{([\s\S]*?)\n\};/);
  if (preMatch) {
    const items = preMatch[1].match(/(\d+):\s*([0-9.]+)/g);
    if (items) {
      for (const item of items) {
        const [year, rate] = item.split(':').map(s => s.trim());
        pre2016Rates[year] = parseFloat(rate);
      }
    }
  }
  
  let md = '# 养老保险个人账户记账利率表\n\n';
  md += `> 数据来源：人社部、财政部官方文件\n`;
  md += `> 2016年起全国统一执行\n\n`;
  md += `## 2016年及以后（全国统一）\n\n`;
  md += `| 年份 | 记账利率 | 备注 |\n`;
  md += `|------|---------|------|\n`;
  for (const [year, rate] of Object.entries(nationalRates).sort((a, b) => a[0] - b[0])) {
    md += `| ${year} | ${(rate * 100).toFixed(2)}% | 全国统一 |\n`;
  }
  
  md += `\n## 2016年之前（全国参考值）\n\n`;
  md += `> 2016年之前各省自行制定，此处为全国参考值\n\n`;
  md += `| 年份 | 记账利率 | 备注 |\n`;
  md += `|------|---------|------|\n`;
  for (const [year, rate] of Object.entries(pre2016Rates).sort((a, b) => a[0] - b[0])) {
    md += `| ${year} | ${(rate * 100).toFixed(2)}% | 全国参考值 |\n`;
  }
  
  fs.writeFileSync(path.join(nationalDir, '记账利率表.md'), md, 'utf8');
  console.log('  已生成：记账利率表.md');
  
  // 2. 计发月数表
  md = '# 养老金计发月数表（国发〔2005〕38号）\n\n';
  md += `> 根据国家规定，退休年龄对应的计发月数如下\n\n`;
  md += `| 退休年龄 | 计发月数 |\n`;
  md += `|---------|---------|\n`;
  const paymentMonths = {
    '40': 233, '41': 230, '42': 226, '43': 223, '44': 220,
    '45': 216, '46': 212, '47': 208, '48': 204, '49': 199,
    '50': 195, '51': 190, '52': 185, '53': 180, '54': 175,
    '55': 170, '56': 164, '57': 158, '58': 152, '59': 145,
    '60': 139, '61': 132, '62': 125, '63': 117, '64': 109,
    '65': 101, '66': 93, '67': 84, '68': 75, '69': 65, '70': 56
  };
  for (const [age, months] of Object.entries(paymentMonths).sort((a, b) => a[0] - b[0])) {
    md += `| ${age}岁 | ${months} |\n`;
  }
  fs.writeFileSync(path.join(nationalDir, '计发月数表.md'), md, 'utf8');
  console.log('  已生成：计发月数表.md');
  
  // 3. 退休年龄对照表
  md = '# 法定退休年龄对照表\n\n';
  md += `> 根据国发〔1978〕104号、国发〔2005〕38号等文件\n\n`;
  md += `## 一、企业职工\n\n`;
  md += `| 人员类别 | 性别 | 退休年龄 |\n`;
  md += `|---------|------|---------|\n`;
  md += `| 普通职工 | 男 | 60岁 |\n`;
  md += `| 普通职工 | 女 | 50岁 |\n`;
  md += `| 女干部 | 女 | 55岁 |\n\n`;
  
  md += `## 二、灵活就业人员\n\n`;
  md += `| 性别 | 退休年龄 |\n`;
  md += `|------|---------|\n`;
  md += `| 男 | 60岁 |\n`;
  md += `| 女 | 55岁（部分地区50岁） |\n\n`;
  
  md += `## 三、计发月数对应表\n\n`;
  md += `| 退休年龄 | 计发月数 |\n`;
  md += `|---------|---------|\n`;
  for (const [age, months] of Object.entries(paymentMonths).sort((a, b) => a[0] - b[0])) {
    if (parseInt(age) >= 40 && parseInt(age) <= 70) {
      md += `| ${age}岁 | ${months} |\n`;
    }
  }
  fs.writeFileSync(path.join(nationalDir, '退休年龄对照表.md'), md, 'utf8');
  console.log('  已生成：退休年龄对照表.md');
}

async function main() {
  ensureDir(OUTPUT_BASE);
  
  console.log('开始生成各省MD文件...\n');
  
  for (const [provCode, provName] of Object.entries(PROV_NAME_MAP)) {
    console.log(`  生成 ${provName}...`);
    generateProvinceFiles(provCode, provName);
  }
  
  console.log('\n生成全国通用文件...');
  generateNationalFiles();
  
  // 生成特殊规则汇总
  console.log('\n生成特殊规则汇总...');
  let rulesMd = '# 各省养老保险特殊规则汇总\n\n';
  rulesMd += `> 提取时间：${new Date().toISOString().split('T')[0]}\n\n`;
  
  const allRules = [];
  for (const [provCode, provName] of Object.entries(PROV_NAME_MAP)) {
    const rules = extractSpecialRules(provCode);
    if (rules.length > 0) {
      allRules.push({ provCode, provName, rules });
    }
  }
  
  for (const { provName, rules } of allRules) {
    rulesMd += `## ${provName}\n\n`;
    for (const rule of rules) {
      rulesMd += `### ${rule.type} - ${rule.name}\n\n`;
      rulesMd += `${rule.desc}\n\n`;
    }
  }
  
  if (allRules.length === 0) {
    rulesMd += `无特殊规则\n`;
  }
  
  const rulesPath = path.join(OUTPUT_BASE, '全国通用', '各省特殊规则汇总.md');
  fs.writeFileSync(rulesPath, rulesMd, 'utf8');
  console.log('  已生成：各省特殊规则汇总.md');
  
  console.log('\n===== 完成 =====');
  console.log(`输出目录：${OUTPUT_BASE}`);
}

main().catch(console.error);
