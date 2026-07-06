/**
 * 导出所有省份养老金数据
 * 输出到 C:\Users\14041\养老金数据整理\
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
  gansu: '甘肃', qinghai: '青海', taiwan: '台湾', // 台湾不使用
  neimenggu: '内蒙古', guangxi: '广西', xizang: '西藏', ningxia: '宁夏',
  xinjiang: '新疆'
};

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('创建目录:', dir);
  }
}

// 从JS文件中提取常量值（简单正则解析）
function extractConstValue(content, constName) {
  // 匹配 const XXX = { ... } 或 const XXX = 数字
  const regex = new RegExp(`const ${constName}\\s*=\\s*({[^}]+}|[0-9.]+|'[^']*'|"[^"]*")`, 's');
  const match = content.match(regex);
  if (match) {
    try {
      // 尝试解析对象
      if (match[1].trim().startsWith('{')) {
        // 用 Function 来安全求值（仅用于数据对象）
        const fn = new Function(`return ${match[1]}`);
        return fn();
      }
      return match[1];
    } catch (e) {
      return null;
    }
  }
  return null;
}

// 提取 AVG_SALARY_HISTORY（多行对象）
function extractAvgSalaryHistory(content) {
  const regex = /const AVG_SALARY_HISTORY\s*=\s*\{([\s\S]*?)\n\};/;
  const match = content.match(regex);
  if (match) {
    try {
      const fn = new Function(`return {${match[1]}\n}`);
      return fn();
    } catch (e) {
      // 尝试另一种方式
      try {
        const objStr = match[0].replace(/const AVG_SALARY_HISTORY\s*=\s*/, '');
        const fn = new Function(`return ${objStr}`);
        return fn();
      } catch (e2) {
        return null;
      }
    }
  }
  return null;
}

// 提取 PROV_BASE
function extractProvBase(content) {
  const regex = /const PROV_BASE\s*=\s*\{([\s\S]*?)\n\};/;
  const match = content.match(regex);
  if (match) {
    try {
      const fn = new Function(`return {${match[1]}\n}`);
      return fn();
    } catch (e) {
      return null;
    }
  }
  return null;
}

// 提取简单常量（如 ACCOUNT_START, CUTOFF_DATE, TRANS_COEF）
function extractSimpleConst(content, constName) {
  // 尝试提取对象 { year: X, month: Y }
  const objRegex = new RegExp(`const ${constName}\\s*=\\s*\\{[^}]+\\}`, 's');
  const objMatch = content.match(objRegex);
  if (objMatch) {
    try {
      const fn = new Function(`return ${objMatch[0].replace(new RegExp(`const ${constName}\\s*=\\s*`), '')}`);
      return fn();
    } catch (e) {}
  }

  // 尝试提取数字
  const numRegex = new RegExp(`const ${constName}\\s*=\\s*([0-9.]+)`);
  const numMatch = content.match(numRegex);
  if (numMatch) {
    return parseFloat(numMatch[1]);
  }

  return null;
}

// 提取 MODULES 数组
function extractModules(content) {
  const regex = /const MODULES\s*=\s*\[([^\]]*)\]/;
  const match = content.match(regex);
  if (match) {
    try {
      const fn = new Function(`return [${match[1]}]`);
      return fn();
    } catch (e) {
      // 手动解析
      const items = match[1].match(/'([^']+)'/g);
      if (items) return items.map(s => s.replace(/'/g, ''));
      return [];
    }
  }
  return [];
}

// 提取 TRANS_COEF（可能是数字或对象）
function extractTransCoef(content) {
  // 数字
  const numMatch = content.match(/const TRANS_COEF\s*=\s*([0-9.]+)/);
  if (numMatch) return parseFloat(numMatch[1]);

  // 对象 { base: X, alt: Y }
  const objMatch = content.match(/const TRANS_COEF\s*=\s*\{[^}]+\}/s);
  if (objMatch) {
    try {
      const fn = new Function(`return ${objMatch[0].replace(/const TRANS_COEF\s*=\s*/, '')}`);
      return fn();
    } catch (e) {}
  }

  return null;
}

// 读取 .json 文件中的 avg_salary_history
function extractFromJson(jsonPath) {
  try {
    const content = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(content);
    return data.avg_salary_history || null;
  } catch (e) {
    return null;
  }
}

// 格式化对象为 Markdown 表格
function formatObjectToTable(obj, keyName, valueName) {
  if (!obj) return '（无数据）';
  const entries = Object.entries(obj).sort((a, b) => a[0] - b[0]);
  let md = `| ${keyName} | ${valueName} |\n|---------|----------|\n`;
  for (const [key, value] of entries) {
    md += `| ${key} | ${value} |\n`;
  }
  return md;
}

// 生成省份的 Markdown 文件
function generateProvinceMarkdown(provCode, provName, data) {
  let md = `# ${provName}（${provCode}）养老保险数据\n\n`;
  md += `> 数据来源：养老金计算平台小程序\n`;
  md += `> 提取时间：${new Date().toISOString().split('T')[0]}\n\n`;

  // 一、社平工资历史数据
  md += `## 一、社平工资历史数据\n\n`;
  if (data.avgSalaryHistory) {
    md += `（单位：元/月）\n\n`;
    md += formatObjectToTable(data.avgSalaryHistory, '年份', '社平工资（元/月）');
  } else if (data.provBase) {
    md += `> ⚠️ 该省份未配置 avg_salary_history，以下为计发基数（PROV_BASE），非社平工资\n\n`;
    md += `（单位：元/月）\n\n`;
    md += formatObjectToTable(data.provBase, '年份', '计发基数（元/月）');
  } else {
    md += `（无数据）\n`;
  }

  // 二、计发基数历史数据
  md += `\n## 二、计发基数历史数据（PROV_BASE）\n\n`;
  md += `> 计发基数用于养老金计算，与社平工资可能不同\n\n`;
  if (data.provBase) {
    md += `（单位：元/月）\n\n`;
    md += formatObjectToTable(data.provBase, '年份', '计发基数（元/月）');
  } else {
    md += `（无数据）\n`;
  }

  // 三、养老保险计算规则
  md += `\n## 三、养老保险计算规则\n\n`;

  md += `### 3.1 建账时间\n\n`;
  if (data.accountStart) {
    md += `**${data.accountStart.year}年${data.accountStart.month}月**\n\n`;
  } else {
    md += `（无数据）\n\n`;
  }

  md += `### 3.2 视同缴费截止时间\n\n`;
  if (data.cutoffDate) {
    md += `**${data.cutoffDate.year}年${data.cutoffDate.month}月**\n\n`;
  } else {
    md += `（无数据）\n\n`;
  }

  md += `### 3.3 过渡系数\n\n`;
  if (data.transCoef !== null) {
    if (typeof data.transCoef === 'number') {
      md += `**${(data.transCoef * 100).toFixed(2)}%**\n\n`;
    } else if (typeof data.transCoef === 'object') {
      md += `**${data.transCoef.base !== undefined ? (data.transCoef.base * 100).toFixed(2) : '?'}%**（缴费满20年）\n`;
      md += `**${data.transCoef.alt !== undefined ? (data.transCoef.alt * 100).toFixed(2) : '?'}%**（缴费不满20年）\n\n`;
    }
  } else {
    md += `（无数据）\n\n`;
  }

  md += `### 3.4 计算模块\n\n`;
  if (data.modules && data.modules.length > 0) {
    const moduleNames = {
      base: '基础养老金',
      personal: '个人账户养老金',
      transition: '过渡性养老金',
      extra: '额外养老金',
      other: '特殊附加'
    };
    md += `启用模块：\n\n`;
    for (const m of data.modules) {
      md += `- ${moduleNames[m] || m}\n`;
    }
    md += `\n`;
  } else {
    md += `（无数据）\n\n`;
  }

  // 备注
  if (data.notes) {
    md += `### 3.5 备注说明\n\n`;
    md += `${data.notes}\n\n`;
  }

  return md;
}

// 主函数
async function main() {
  // 确保输出目录存在
  const outputBase = OUTPUT_BASE;
  ensureDir(outputBase);

  const nationalDir = path.join(outputBase, '全国通用');
  ensureDir(nationalDir);

  console.log('开始提取省份数据...');
  console.log('输出目录:', outputBase);

  const results = [];

  // 遍历所有省份
  for (const [provCode, provName] of Object.entries(PROV_NAME_MAP)) {
    const jsPath = path.join(PROVINCES_DIR, `${provCode}.js`);
    const jsonPath = path.join(PROVINCES_DIR, `${provCode}.json`);

    if (!fs.existsSync(jsPath)) {
      console.log(`  跳过 ${provCode}（无.js文件）`);
      continue;
    }

    console.log(`  处理 ${provName}（${provCode}）...`);

    const content = fs.readFileSync(jsPath, 'utf8');

    const data = {
      provCode,
      provName,
      avgSalaryHistory: extractAvgSalaryHistory(content),
      provBase: extractProvBase(content),
      accountStart: extractSimpleConst(content, 'ACCOUNT_START'),
      cutoffDate: extractSimpleConst(content, 'CUTOFF_DATE'),
      transCoef: extractTransCoef(content),
      modules: extractModules(content),
      notes: null
    };

    // 尝试从 .json 文件获取 avg_salary_history
    if (!data.avgSalaryHistory && fs.existsSync(jsonPath)) {
      data.avgSalaryHistory = extractFromJson(jsonPath);
    }

    // 提取 notes
    const notesMatch = content.match(/notes:\s*'([^']*)'/);
    if (notesMatch) data.notes = notesMatch[1];

    // 创建省份文件夹
    const provDir = path.join(outputBase, provName);
    ensureDir(provDir);

    // 生成社平工资文件
    const salaryMd = generateSalaryMarkdown(provName, provCode, data);
    fs.writeFileSync(path.join(provDir, '社平工资历史数据.md'), salaryMd, 'utf8');

    // 生成计算规则文件
    const rulesMd = generateRulesMarkdown(provName, provCode, data);
    fs.writeFileSync(path.join(provDir, '养老保险计算规则.md'), rulesMd, 'utf8');

    results.push({
      provCode,
      provName,
      hasAvgSalary: !!data.avgSalaryHistory,
      hasProvBase: !!data.provBase,
      accountStart: data.accountStart,
      cutoffDate: data.cutoffDate
    });
  }

  // 生成全国通用文件
  console.log('\n生成全国通用数据...');
  generateNationalFiles(nationalDir);

  // 输出汇总
  console.log('\n===== 提取完成 =====');
  console.log(`共处理 ${results.length} 个省份`);
  console.log(`有 avg_salary_history 的省份：${results.filter(r => r.hasAvgSalary).length} 个`);
  console.log(`输出目录：${outputBase}`);

  // 写入汇总报告
  let summary = '# 省份数据提取汇总\n\n';
  summary += `提取时间：${new Date().toISOString().split('T')[0]}\n\n`;
  summary += `| 省份 | 有社平工资数据 | 有计发基数 | 建账时间 | 视同截止 |\n`;
  summary += `|------|--------------|-----------|---------|----------|\n`;
  for (const r of results) {
    const avg = r.hasAvgSalary ? '✅' : '❌';
    const base = r.hasProvBase ? '✅' : '❌';
    const start = r.accountStart ? `${r.accountStart.year}-${r.accountStart.month}` : '?';
    const cutoff = r.cutoffDate ? `${r.cutoffDate.year}-${r.cutoffDate.month}` : '?';
    summary += `| ${r.provName} | ${avg} | ${base} | ${start} | ${cutoff} |\n`;
  }
  fs.writeFileSync(path.join(outputBase, '提取汇总.md'), summary, 'utf8');

  console.log('\n汇总报告已写入：', path.join(outputBase, '提取汇总.md'));
}

// 生成社平工资 Markdown（单独文件）
function generateSalaryMarkdown(provName, provCode, data) {
  let md = `# ${provName}社平工资历史数据\n\n`;
  md += `> 数据来源：养老金计算平台小程序\n`;
  md += `> 提取时间：${new Date().toISOString().split('T')[0]}\n\n`;

  if (data.avgSalaryHistory) {
    md += `## avg_salary_history（用于个人账户计算）\n\n`;
    md += `> ⚠️ 注意：此数据用于个人账户养老金计算，格式为元/月\n\n`;
    md += `（单位：元/月）\n\n`;
    md += formatObjectToTable(data.avgSalaryHistory, '年份', '社平工资（元/月）');
    md += `\n`;
  } else {
    md += `> ⚠️ 该省份未配置 avg_salary_history 数据\n\n`;
  }

  if (data.provBase) {
    md += `## PROV_BASE（计发基数）\n\n`;
    md += `> 计发基数用于养老金计算，与社平工资可能不同\n\n`;
    md += `（单位：元/月）\n\n`;
    md += formatObjectToTable(data.provBase, '年份', '计发基数（元/月）');
    md += `\n`;
  }

  return md;
}

// 生成计算规则 Markdown（单独文件）
function generateRulesMarkdown(provName, provCode, data) {
  let md = `# ${provName}养老保险计算规则\n\n`;
  md += `> 数据来源：养老金计算平台小程序\n`;
  md += `> 提取时间：${new Date().toISOString().split('T')[0]}\n\n`;

  md += `## 1. 建账时间\n\n`;
  if (data.accountStart) {
    md += `**${data.accountStart.year}年${data.accountStart.month}月**\n\n`;
    md += `- 个人账户建账起始时间\n`;
    md += `- 此前的工作年限按视同缴费处理\n\n`;
  } else {
    md += `（无数据）\n\n`;
  }

  md += `## 2. 视同缴费截止时间\n\n`;
  if (data.cutoffDate) {
    md += `**${data.cutoffDate.year}年${data.cutoffDate.month}月**\n\n`;
    md += `- 此前的工作年限按视同缴费处理\n`;
    md += `- 此后的工作年限按实际缴费处理\n\n`;
  } else {
    md += `（无数据）\n\n`;
  }

  md += `## 3. 过渡系数\n\n`;
  if (data.transCoef !== null) {
    if (typeof data.transCoef === 'number') {
      md += `**${(data.transCoef * 100).toFixed(2)}%**\n\n`;
      md += `- 过渡性养老金计算系数\n`;
      md += `- 过渡性养老金 = 计发基数 × 视同缴费年限 × 过渡系数\n\n`;
    } else if (typeof data.transCoef === 'object') {
      md += `- 缴费满20年：**${(data.transCoef.base * 100).toFixed(2)}%**\n`;
      md += `- 缴费不满20年：**${(data.transCoef.alt * 100).toFixed(2)}%**\n\n`;
    }
  } else {
    md += `（无数据）\n\n`;
  }

  md += `## 4. 计算模块\n\n`;
  if (data.modules && data.modules.length > 0) {
    const moduleNames = {
      base: '基础养老金',
      personal: '个人账户养老金',
      transition: '过渡性养老金',
      extra: '额外养老金（如深圳100元保障）',
      other: '特殊附加（如西藏高原补贴）'
    };
    for (const m of data.modules) {
      md += `- **${moduleNames[m] || m}**\n`;
    }
    md += `\n`;
  }

  md += `## 5. 计算公式\n\n`;
  md += `### 5.1 基础养老金\n\n`;
  md += `公式：(退休时上年度计发基数 + 指数化月平均缴费工资) ÷ 2 × 累计缴费年限 × 1%\n\n`;
  md += `### 5.2 个人账户养老金\n\n`;
  md += `公式：个人账户累计储存额 ÷ 计发月数\n\n`;
  md += `### 5.3 过渡性养老金\n\n`;
  md += `公式：退休时上年度计发基数 × 视同缴费指数 × 视同缴费年限 × 过渡系数\n\n`;

  if (data.notes) {
    md += `## 6. 备注说明\n\n`;
    md += `${data.notes}\n\n`;
  }

  return md;
}

// 生成全国通用文件
function generateNationalFiles(nationalDir) {
  // 1. 记账利率表
  const enginePath = path.join(__dirname, '../engine/pension-engine.js');
  if (!fs.existsSync(enginePath)) {
    console.log('  警告：pension-engine.js 不存在，跳过全国通用数据');
    return;
  }

  const engineContent = fs.readFileSync(enginePath, 'utf8');

  // 提取 NATIONAL_INTEREST_RATES
  const nationalRates = extractNationalRates(engineContent);
  let md = '# 养老保险个人账户记账利率表\n\n';
  md += `> 数据来源：人社部、财政部官方文件 / 剪刀财经整理\n`;
  md += `> 2016年起全国统一执行\n\n`;
  md += `| 年份 | 记账利率 | 备注 |\n`;
  md += `|------|---------|------|\n`;
  for (const [year, rate] of Object.entries(nationalRates).sort((a, b) => a[0] - b[0])) {
    const pct = (rate * 100).toFixed(2) + '%';
    const note = year >= 2016 ? '全国统一' : '全国参考值';
    md += `| ${year} | ${pct} | ${note} |\n`;
  }
  fs.writeFileSync(path.join(nationalDir, '记账利率表.md'), md, 'utf8');
  console.log('  已生成：记账利率表.md');

  // 2. 计发月数表
  const paymentMonths = extractPaymentMonths(engineContent);
  md = '# 养老金计发月数表（国发〔2005〕38号）\n\n';
  md += `> 根据国家规定，退休年龄对应的计发月数如下\n\n`;
  md += `| 退休年龄 | 计发月数 |\n`;
  md += `|---------|---------|\n`;
  for (const [age, months] of Object.entries(paymentMonths).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))) {
    md += `| ${age} | ${months} |\n`;
  }
  md += `\n## 说明\n\n`;
  md += `- 计发月数用于计算个人账户养老金\n`;
  md += `- 公式：个人账户养老金 = 个人账户累计储存额 ÷ 计发月数\n`;
  md += `- 计发月数越大，每月领取的个人账户养老金越少\n`;
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

  md += `## 三、特殊工种提前退休\n\n`;
  md += `| 人员类别 | 性别 | 退休年龄 |\n`;
  md += `|---------|------|---------|\n`;
  md += `| 特殊工种 | 男 | 55岁 |\n`;
  md += `| 特殊工种 | 女 | 45岁 |\n\n`;

  md += `## 四、病退\n\n`;
  md += `| 性别 | 退休年龄 |\n`;
  md += `|------|---------|\n`;
  md += `| 男 | 50岁 |\n`;
  md += `| 女 | 45岁 |\n\n`;

  md += `## 五、机关事业单位\n\n`;
  md += `| 人员类别 | 性别 | 退休年龄 |\n`;
  md += `|---------|------|---------|\n`;
  md += `| 公务员 | 男 | 60岁 |\n`;
  md += `| 公务员 | 女 | 55岁 |\n`;
  md += `| 事业单位 | 男 | 60岁 |\n`;
  md += `| 事业单位 | 女 | 55岁 |\n\n`;

  md += `## 六、计发月数对应表\n\n`;
  md += `> 精确到月（国发〔2005〕38号）\n\n`;
  md += `| 退休年龄 | 计发月数 |\n`;
  md += `|---------|---------|\n`;
  for (const [age, months] of Object.entries(paymentMonths).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))) {
    if (parseFloat(age) >= 40 && parseFloat(age) <= 70) {
      md += `| ${age} | ${months} |\n`;
    }
  }
  fs.writeFileSync(path.join(nationalDir, '退休年龄对照表.md'), md, 'utf8');
  console.log('  已生成：退休年龄对照表.md');
}

function extractNationalRates(content) {
  const rates = {};

  // NATIONAL_INTEREST_RATES
  const regex1 = /const NATIONAL_INTEREST_RATES\s*=\s*\{([\s\S]*?)\n\};/;
  const match1 = content.match(regex1);
  if (match1) {
    try {
      const fn = new Function(`return {${match1[1]}\n}`);
      Object.assign(rates, fn());
    } catch (e) {}
  }

  // NATIONAL_PRE2016_INTEREST_RATES
  const regex2 = /const NATIONAL_PRE2016_INTEREST_RATES\s*=\s*\{([\s\S]*?)\n\};/;
  const match2 = content.match(regex2);
  if (match2) {
    try {
      const fn = new Function(`return {${match2[1]}\n}`);
      Object.assign(rates, fn());
    } catch (e) {}
  }

  return rates;
}

function extractPaymentMonths(content) {
  const regex = /const DEFAULT_MONTHLY_PAYMENT_MONTHS\s*=\s*\{([\s\S]*?)\n\};/;
  const match = content.match(regex);
  if (match) {
    try {
      const fn = new Function(`return {${match[1]}\n}`);
      return fn();
    } catch (e) {
      return {};
    }
  }
  return {};
}

// 运行
main().catch(console.error);
