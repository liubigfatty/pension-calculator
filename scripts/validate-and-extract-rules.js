/**
 * 验证 avg_salary_history 数据格式 + 提取各省特殊规则 + 更新MD文件
 */

const fs = require('fs');
const path = require('path');

const PROVINCES_DIR = path.join(__dirname, '../cloudfunctions/calculate/provinces');
const OUTPUT_BASE = 'C:\\Users\\14041\\养老金数据整理';

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

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 验证 avg_salary_history 数据格式
function validateAvgSalaryHistory(provCode) {
  const jsonPath = path.join(PROVINCES_DIR, `${provCode}.json`);
  if (!fs.existsSync(jsonPath)) return { valid: true, issues: [] };
  
  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (!data.avg_salary_history) return { valid: true, issues: ['无数据'] };
    
    const issues = [];
    const entries = Object.entries(data.avg_salary_history).filter(([k, v]) => k !== '_source');
    
    for (const [year, value] of entries) {
      if (typeof value !== 'number' || isNaN(value)) {
        issues.push({ year, value, issue: '非数字' });
        continue;
      }
      
      // 如果值 > 50000，可能是元/年格式
      if (value > 50000) {
        issues.push({ year, value, issue: '可能为元/年格式（需÷12）' });
      }
      
      // 如果值 < 500，可能太小
      if (value < 500 && year < 2020) {
        issues.push({ year, value, issue: '数值异常（过小）' });
      }
    }
    
    return { valid: issues.length === 0, issues };
    
  } catch (e) {
    return { valid: false, issues: [{ year: '?', value: '?', issue: e.message }] };
  }
}

// 从 JS 文件中提取特殊规则（增强版）
function extractSpecialRulesEnhanced(provCode) {
  const jsPath = path.join(PROVINCES_DIR, `${provCode}.js`);
  if (!fs.existsSync(jsPath)) return null;
  
  const content = fs.readFileSync(jsPath, 'utf8');
  const rules = {
    provCode,
    provName: PROV_NAME_MAP[provCode] || provCode,
    specialAdditions: [],
    extraModules: [],
    specialFormulas: [],
    specialConditions: [],
    notes: []
  };
  
  // 1. 提取 special_addition 配置
  const specialAddMatch = content.match(/special_addition:\s*\{[^}]+\}/s);
  if (specialAddMatch) {
    try {
      const fn = new Function(`return ${specialAddMatch[0]}`);
      const specialAdd = fn();
      if (specialAdd.enabled) {
        let desc = '';
        if (specialAdd.type === 'plateau') {
          desc = '高原补贴（满10年5%/满15年10%/满20年15%）+ 固定补贴329.88元/月';
        } else {
          desc = specialAdd.type;
        }
        rules.specialAdditions.push({ type: specialAdd.type, description: desc });
      }
    } catch (e) {
      // 忽略解析错误
    }
  }
  
  // 2. 检查西藏特殊规则
  if (provCode === 'xizang') {
    rules.specialAdditions.push({
      type: 'plateau',
      description: '高原补贴：本人指数化月平均缴费工资 × 比例（满10年5%/满15年10%/满20年15%）+ 固定补贴：交通费30元+取暖防寒费39.88元+过渡期福利金260元=329.88元'
    });
  }
  
  // 3. 检查广东/深圳特殊规则
  if (provCode === 'guangdong') {
    if (content.includes('SHENZHEN') || content.includes('shenzhen')) {
      rules.extraModules.push({
        name: '深圳额外养老金',
        description: '深圳市企业职工基本养老金加发100元/月'
      });
    }
  }
  
  // 4. 检查浙江特殊规则（G同/G实分离）
  if (provCode === 'zhejiang') {
    rules.specialFormulas.push({
      name: '过渡性养老金计算',
      description: 'G同/G实分离：transitional_pension.amount = G同（不含G实），G实通过 _gShiAmount 字段返回并加入 total'
    });
  }
  
  // 5. 检查双指数省份（浙江/广东/陕西）
  if (content.includes('doubleIndex') || content.includes('双指数') || provCode === 'zhejiang' || provCode === 'guangdong' || provCode === 'shaanxi') {
    if (provCode === 'zhejiang' || provCode === 'guangdong' || provCode === 'shaanxi') {
      rules.specialFormulas.push({
        name: '缴费指数计算',
        description: '双指数省份：过渡性养老金用 transIndex + preAccountYears，不用 sightYears'
      });
    }
  }
  
  // 6. 检查过渡系数是否有分档
  const transCoefMatch = content.match(/const TRANS_COEF\s*=\s*([^;]+)/);
  if (transCoefMatch) {
    const val = transCoefMatch[1].trim();
    if (val.includes('{') && val.includes(':')) {
      rules.specialFormulas.push({
        name: '过渡系数',
        description: '过渡系数分档（如缴费满20年/不满20年不同系数）'
      });
    }
  }
  
  // 7. 检查是否有特殊的退休年龄规则
  if (content.includes('ef50') || content.includes('女50岁') || content.includes('女职工')) {
    rules.specialConditions.push({
      name: '退休年龄',
      description: '企业女职工50岁退休'
    });
  }
  
  // 8. 提取 notes
  const notesMatches = content.match(/notes:\s*'([^']*)'/g);
  if (notesMatches) {
    for (const m of notesMatches) {
      const noteMatch = m.match(/notes:\s*'([^']*)'/);
      if (noteMatch) rules.notes.push(noteMatch[1]);
    }
  }
  
  // 9. 检查北京 G同/G实
  if (provCode === 'beijing') {
    rules.specialFormulas.push({
      name: '过渡性养老金',
      description: 'G同/G实分离：transitional_pension.amount = G同（不含G实），G实通过 _gShiAmount 字段返回'
    });
  }
  
  return rules;
}

// 生成省份的完整 MD 文件（包含特殊规则）
function generateProvinceMarkdownWithRules(provCode, provName, validation, rules) {
  // 读取原始数据
  const jsonPath = path.join(PROVINCES_DIR, `${provCode}.json`);
  let avgSalaryHistory = null;
  let provBase = null;
  let accountStart = null;
  let cutoffDate = null;
  let transCoef = null;
  
  if (fs.existsSync(jsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      avgSalaryHistory = data.avg_salary_history;
      provBase = data.base_rates?.prov;
      accountStart = data.account_start;
      cutoffDate = data.cutoff_date;
      transCoef = data.trans_coef;
    } catch (e) {}
  }
  
  // 生成社平工资文件
  let salaryMd = `# ${provName}社平工资历史数据\n\n`;
  salaryMd += `> 数据来源：养老金计算平台小程序\n`;
  salaryMd += `> 提取时间：${new Date().toISOString().split('T')[0]}\n`;
  salaryMd += `> 数据格式：元/月（已验证）\n\n`;
  
  if (!validation.valid) {
    salaryMd += `> ⚠️ 数据格式警告：\n`;
    for (const issue of validation.issues) {
      salaryMd += `> - ${issue.year}年：${issue.value}（${issue.issue}）\n`;
    }
    salaryMd += `\n`;
  }
  
  if (avgSalaryHistory) {
    salaryMd += `## avg_salary_history（用于个人账户计算）\n\n`;
    salaryMd += `（单位：元/月）\n\n`;
    salaryMd += `| 年份 | 社平工资（元/月） |\n`;
    salaryMd += `|------|-------------------|\n`;
    const entries = Object.entries(avgSalaryHistory).filter(([k, v]) => k !== '_source').sort((a, b) => a[0] - b[0]);
    for (const [year, value] of entries) {
      salaryMd += `| ${year} | ${value} |\n`;
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
  
  // 生成计算规则文件（包含特殊规则）
  let rulesMd = `# ${provName}养老保险计算规则\n\n`;
  rulesMd += `> 数据来源：养老金计算平台小程序\n`;
  rulesMd += `> 提取时间：${new Date().toISOString().split('T')[0]}\n\n`;
  
  // 基本信息
  rulesMd += `## 一、基本规则\n\n`;
  rulesMd += `### 1.1 建账时间\n\n`;
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
  if (transCoef !== null) {
    if (typeof transCoef === 'number') {
      rulesMd += `**${(transCoef * 100).toFixed(2)}%**\n\n`;
    } else if (typeof transCoef === 'object') {
      rulesMd += `- 缴费满20年：**${(transCoef.base * 100).toFixed(2)}%**\n`;
      rulesMd += `- 缴费不满20年：**${(transCoef.alt * 100).toFixed(2)}%**\n\n`;
    }
  } else {
    rulesMd += `（无数据）\n\n`;
  }
  
  // 特殊规则
  if (rules) {
    if (rules.specialAdditions.length > 0) {
      rulesMd += `## 二、特殊附加补贴\n\n`;
      for (const add of rules.specialAdditions) {
        rulesMd += `### ${add.type}\n\n`;
        rulesMd += `${add.description}\n\n`;
      }
    }
    
    if (rules.extraModules.length > 0) {
      rulesMd += `## 三、额外计算模块\n\n`;
      for (const mod of rules.extraModules) {
        rulesMd += `### ${mod.name}\n\n`;
        rulesMd += `${mod.description}\n\n`;
      }
    }
    
    if (rules.specialFormulas.length > 0) {
      rulesMd += `## 四、特殊计算公式\n\n`;
      for (const f of rules.specialFormulas) {
        rulesMd += `### ${f.name}\n\n`;
        rulesMd += `${f.description}\n\n`;
      }
    }
    
    if (rules.specialConditions.length > 0) {
      rulesMd += `## 五、特殊条件\n\n`;
      for (const c of rules.specialConditions) {
        rulesMd += `### ${c.name}\n\n`;
        rulesMd += `${c.description}\n\n`;
      }
    }
    
    if (rules.notes.length > 0) {
      rulesMd += `## 六、备注说明\n\n`;
      for (const note of rules.notes) {
        rulesMd += `- ${note}\n`;
      }
      rulesMd += `\n`;
    }
  }
  
  // 通用计算公式
  rulesMd += `## 七、通用计算公式\n\n`;
  rulesMd += `### 7.1 基础养老金\n\n`;
  rulesMd += `公式：(退休时上年度计发基数 + 指数化月平均缴费工资) ÷ 2 × 累计缴费年限 × 1%\n\n`;
  rulesMd += `### 7.2 个人账户养老金\n\n`;
  rulesMd += `公式：个人账户累计储存额 ÷ 计发月数\n\n`;
  rulesMd += `### 7.3 过渡性养老金\n\n`;
  rulesMd += `公式：退休时上年度计发基数 × 视同缴费指数 × 视同缴费年限 × 过渡系数\n\n`;
  
  return { salaryMd, rulesMd };
}

// 主函数
async function main() {
  ensureDir(OUTPUT_BASE);
  
  console.log('开始验证数据格式并提取特殊规则...\n');
  
  const allRules = [];
  const validationResults = [];
  
  for (const [provCode, provName] of Object.entries(PROV_NAME_MAP)) {
    if (provCode === 'taiwan') continue;
    
    console.log(`  处理 ${provName}...`);
    
    // 验证数据格式
    const validation = validateAvgSalaryHistory(provCode);
    validationResults.push({ provCode, provName, validation });
    
    // 提取特殊规则
    const rules = extractSpecialRulesEnhanced(provCode);
    if (rules) allRules.push(rules);
    
    // 生成 MD 文件
    const { salaryMd, rulesMd } = generateProvinceMarkdownWithRules(provCode, provName, validation, rules);
    
    const provDir = path.join(OUTPUT_BASE, provName);
    ensureDir(provDir);
    
    fs.writeFileSync(path.join(provDir, '社平工资历史数据.md'), salaryMd, 'utf8');
    fs.writeFileSync(path.join(provDir, '养老保险计算规则.md'), rulesMd, 'utf8');
  }
  
  // 生成验证报告
  let validationReport = '# avg_salary_history 数据格式验证报告\n\n';
  validationReport += `验证时间：${new Date().toISOString().split('T')[0]}\n\n`;
  validationReport += `| 省份 | 数据格式 | 问题详情 |\n`;
  validationReport += `|------|---------|----------|\n`;
  for (const r of validationResults) {
    if (r.validation.valid) {
      validationReport += `| ${r.provName} | ✅ 正确 | 无 |\n`;
    } else {
      const issues = r.validation.issues.map(i => `${i.year}年：${i.issue}`).join('；');
      validationReport += `| ${r.provName} | ⚠️ 有问题 | ${issues} |\n`;
    }
  }
  fs.writeFileSync(path.join(OUTPUT_BASE, '数据格式验证报告.md'), validationReport, 'utf8');
  console.log('\n已生成：数据格式验证报告.md');
  
  // 生成特殊规则汇总
  let rulesMd = '# 各省养老保险特殊规则汇总\n\n';
  rulesMd += `> 提取时间：${new Date().toISOString().split('T')[0]}\n\n`;
  
  // 按类型分组
  const additionsMap = {};
  const modulesMap = {};
  const formulasMap = {};
  
  for (const r of allRules) {
    for (const add of r.specialAdditions) {
      if (!additionsMap[add.type]) additionsMap[add.type] = [];
      additionsMap[add.type].push({ prov: r.provName, desc: add.description });
    }
    for (const mod of r.extraModules) {
      if (!modulesMap[mod.name]) modulesMap[mod.name] = [];
      modulesMap[mod.name].push({ prov: r.provName, desc: mod.description });
    }
    for (const f of r.specialFormulas) {
      if (!formulasMap[f.name]) formulasMap[f.name] = [];
      formulasMap[f.name].push({ prov: r.provName, desc: f.description });
    }
  }
  
  rulesMd += `## 一、特殊附加补贴\n\n`;
  for (const [type, items] of Object.entries(additionsMap)) {
    rulesMd += `### ${type}\n\n`;
    for (const item of items) {
      rulesMd += `- **${item.prov}**：${item.desc}\n`;
    }
    rulesMd += `\n`;
  }
  
  rulesMd += `## 二、额外计算模块\n\n`;
  for (const [name, items] of Object.entries(modulesMap)) {
    rulesMd += `### ${name}\n\n`;
    for (const item of items) {
      rulesMd += `- **${item.prov}**：${item.desc}\n`;
    }
    rulesMd += `\n`;
  }
  
  rulesMd += `## 三、特殊计算公式\n\n`;
  for (const [name, items] of Object.entries(formulasMap)) {
    rulesMd += `### ${name}\n\n`;
    for (const item of items) {
      rulesMd += `- **${item.prov}**：${item.desc}\n`;
    }
    rulesMd += `\n`;
  }
  
  // 各省详细规则
  rulesMd += `## 四、各省详细规则\n\n`;
  for (const r of allRules) {
    rulesMd += `### ${r.provName}\n\n`;
    
    const hasSpecial = r.specialAdditions.length > 0 || r.extraModules.length > 0 || r.specialFormulas.length > 0;
    
    if (!hasSpecial && r.notes.length === 0) {
      rulesMd += `无特殊规则\n\n`;
      continue;
    }
    
    if (r.specialAdditions.length > 0) {
      rulesMd += `**特殊附加补贴：**\n\n`;
      for (const add of r.specialAdditions) {
        rulesMd += `- ${add.type}：${add.description}\n`;
      }
      rulesMd += `\n`;
    }
    
    if (r.extraModules.length > 0) {
      rulesMd += `**额外计算模块：**\n\n`;
      for (const mod of r.extraModules) {
        rulesMd += `- ${mod.name}：${mod.description}\n`;
      }
      rulesMd += `\n`;
    }
    
    if (r.specialFormulas.length > 0) {
      rulesMd += `**特殊计算公式：**\n\n`;
      for (const f of r.specialFormulas) {
        rulesMd += `- ${f.name}：${f.description}\n`;
      }
      rulesMd += `\n`;
    }
    
    if (r.notes.length > 0) {
      rulesMd += `**备注：**\n\n`;
      for (const note of r.notes) {
        rulesMd += `- ${note}\n`;
      }
      rulesMd += `\n`;
    }
  }
  
  const rulesPath = path.join(OUTPUT_BASE, '全国通用', '各省特殊规则汇总.md');
  ensureDir(path.dirname(rulesPath));
  fs.writeFileSync(rulesPath, rulesMd, 'utf8');
  console.log('已生成：各省特殊规则汇总.md');
  
  // 汇总
  console.log('\n===== 完成 =====');
  const invalidCount = validationResults.filter(r => !r.validation.valid).length;
  console.log(`数据格式验证：${validationResults.length - invalidCount}/${validationResults.length} 正确`);
  console.log(`特殊规则提取：${allRules.length} 个省份`);
}

main().catch(console.error);
