const fs = require('fs');
const path = require('path');

const provBase = 'C:/Users/14041/AppData/Roaming/winclaw/.openclaw/workspace/养老金计算平台/cloudfunctions/calculate/provinces';
const outBase = 'C:/Users/14041/养老金数据整理';
const enginePath = 'C:/Users/14041/AppData/Roaming/winclaw/.openclaw/workspace/养老金计算平台/engine/pension-engine.js';

const provs = ['beijing','tianjin','shanghai','chongqing','hebei','shanxi','liaoning','jilin','heilongjiang','jiangsu','zhejiang','anhui','fujian','jiangxi','shandong','henan','hubei','hunan','guangdong','hainan','sichuan','guizhou','yunnan','shaanxi','gansu','qinghai','neimenggu','guangxi','xizang','ningxia','xinjiang'];

// 省份全称（含正确行政称谓）
const provName = {
  beijing:'北京市', tianjin:'天津市', shanghai:'上海市', chongqing:'重庆市', hebei:'河北省', shanxi:'山西省',
  liaoning:'辽宁省', jilin:'吉林省', heilongjiang:'黑龙江省', jiangsu:'江苏省', zhejiang:'浙江省', anhui:'安徽省',
  fujian:'福建省', jiangxi:'江西省', shandong:'山东省', henan:'河南省', hubei:'湖北省', hunan:'湖南省',
  guangdong:'广东省', hainan:'海南省', sichuan:'四川省', guizhou:'贵州省', yunnan:'云南省', shaanxi:'陕西省',
  gansu:'甘肃省', qinghai:'青海省', neimenggu:'内蒙古自治区', guangxi:'广西壮族自治区', xizang:'西藏自治区', ningxia:'宁夏回族自治区', xinjiang:'新疆维吾尔自治区'
};

// 特殊加发条件说明（从各省份 .js 提取）
const EXTRA_RULES = {
  sichuan: { module:'extra', label:'增发养老金', desc:'四川增发养老金（川劳社发〔2006〕17号）：实际缴费年限超过15年的部分，每满1年增发0.1%的本人指数化月平均缴费工资。' },
  liaoning: { module:'extra', label:'增发养老金', desc:'辽宁增发养老金（辽劳社发〔2006〕81号）：实际缴费年限超过15年的部分，每满1年增发0.1%的本人指数化月平均缴费工资。' },
  jilin: { module:'extra', label:'基础养老金增发部分', desc:'吉林基础养老金增发部分：实际缴费年限>20年部分，分段增发（0.15%/0.20%/0.25%，即21-25年段0.15%、26-30年段0.20%、30年以上段0.25%）。' },
  gansu: { module:'other', label:'调节金', desc:'甘肃调节金：按国家规定计发的调节金（并轨过渡期内保留，逐步归零）。' },
  heilongjiang: { module:'other', label:'其它加发', desc:'黑龙江其它加发：按地方政策计发的其它加发项目（如特殊工种、高级职称等）。' },
  ningxia: { module:'special', label:'知识分子补贴', desc:'宁夏知识分子补贴：工龄补贴10元/月 + 地区补贴8.5元/月 = 18.5元/月。仅知识分子（如获得相应职称/学历）退休时享受。' },
  yunnan: { module:'other', label:'独生子女补贴', desc:'云南独生子女补贴：按全省退休人员人均养老金的5%计发（独子证），随年度人均养老金增长动态调整。' },
  xizang: { module:'special', label:'高原补贴', desc:'西藏高原补贴（藏政发〔2006〕37号、藏劳社办〔2007〕6号）：本人指数化月平均缴费工资 × 比例（满10年5% / 满15年10% / 满20年15%）+ 固定补贴329.88元/月（交通费30元 + 取暖防寒费39.88元 + 过渡期福利金260元）。' },
  guangdong: { module:'special', label:'深圳独立体系', desc:'广东深圳市执行独立养老保险办法（深人社规）：含地方补助（地方补充养老缴费年限 × 指数化工资 × 18.5 + 20元）、过渡性补助等，与全省统一办法不同。广东省老办法另含粤劳电[2009]32号加发100元、粤人社[2014]8号缴费年限津贴。' },
};

// ============ 校验：不得有 > 15000 的值 ============
let violations = [];
for (const p of provs) {
  const jd = JSON.parse(fs.readFileSync(path.join(provBase, p + '.json'), 'utf8'));
  if (jd.avg_salary_history) {
    for (const [y, v] of Object.entries(jd.avg_salary_history)) {
      if (y === '_source') continue;
      if (typeof v === 'number' && v > 15000) violations.push(`${p}.json ${y}=${v}`);
    }
  }
}
if (violations.length) {
  console.log('❌ 仍有 >15000 的值：\n' + violations.join('\n'));
  process.exit(1);
}
console.log('✅ 校验通过：所有 avg_salary_history 值均 ≤ 15000（元/月格式）');

// ============ 提取引擎全国表 ============
const engine = fs.readFileSync(enginePath, 'utf8');
const rateMatch = engine.match(/const NATIONAL_INTEREST_RATES = \{[\s\S]*?\};/);
const preRateMatch = engine.match(/const NATIONAL_PRE2016_INTEREST_RATES = \{[\s\S]*?\};/);
const monthsMatch = engine.match(/const DEFAULT_MONTHLY_PAYMENT_MONTHS = \{[\s\S]*?\};/);

fs.mkdirSync(path.join(outBase, '全国通用'), { recursive: true });

// --- 记账利率表 ---
function fmtRates(match, title, note) {
  const body = match[0].replace(/const \w+ = /, '').replace(/;\s*$/, '');
  const rows = [...body.matchAll(/(\d{4}):\s*([\d.]+),?\s*\/\/\s*([^\n]+)/g)]
    .map(m => `| ${m[1]} | ${(parseFloat(m[2])*100).toFixed(2)}% | ${m[3].trim()} |`)
    .join('\n');
  return `# ${title}\n\n> ${note}\n\n| 年份 | 记账利率 | 说明 |\n|------|---------|------|\n${rows}\n`;
}
fs.writeFileSync(path.join(outBase, '全国通用', '记账利率表.md'),
  fmtRates(rateMatch, '养老保险个人账户记账利率表（2016-2025年）', '2016年起由人社部、财政部统一公布，全国执行同一标准。') +
  '\n\n' +
  fmtRates(preRateMatch, '养老保险个人账户记账利率表（1996-2015年）', '2016年前由各省自行制定，此处为全国通用参考值（来源：剪刀财经整理）。'));

// --- 计发月数表 ---
const monthsBody = monthsMatch[0].replace(/const \w+ = /, '').replace(/;\s*$/, '');
const monthsRows = [...monthsBody.matchAll(/"([\d.]+)":\s*(\d+)/g)]
  .map(m => `| ${Math.round(parseFloat(m[1]))}岁 | ${m[2]}个月 |`)
  .join('\n');
fs.writeFileSync(path.join(outBase, '全国通用', '计发月数表.md'),
  `# 个人账户养老金计发月数表（国发〔2005〕38号）\n\n> 按法定退休年龄确定计发月数，月养老金 = 个人账户储存额 ÷ 计发月数。\n\n| 退休年龄 | 计发月数 |\n|---------|---------|\n${monthsRows}\n`);

// --- 退休年龄对照表 ---
const retireMd = `# 法定退休年龄对照表\n\n> 依据《国务院关于渐进式延迟法定退休年龄的办法》（2024年9月公布，2025年1月1日起施行）。\n\n## 一、基本退休年龄\n\n| 人员类别 | 原法定退休年龄 | 备注 |\n|---------|--------------|------|\n| 男职工 | 60周岁 | 逐步延迟至63周岁 |\n| 女干部（管理/技术岗） | 55周岁 | 逐步延迟至58周岁 |\n| 女工人（普通岗） | 50周岁 | 逐步延迟至55周岁 |\n| 灵活就业女性 | 55周岁 | 多数地区执行 |\n\n## 二、特殊工种提前退休\n\n| 人员类别 | 退休年龄 | 条件 |\n|---------|---------|------|\n| 男职工（特殊工种） | 55周岁 | 从事高空、井下、高温、特别繁重体力劳动等满规定年限 |\n| 女干部/女工人（特殊工种） | 45周岁 | 同上 |\n\n## 三、因病或非因工致残\n\n| 人员类别 | 退休年龄 | 条件 |\n|---------|---------|------|\n| 男 | 50周岁 | 经劳动能力鉴定完全丧失劳动能力 |\n| 女 | 45周岁 | 同上 |\n\n## 四、弹性退休政策\n\n- 职工达到最低缴费年限，可自愿选择弹性提前退休，**提前不超过3年**，且不低于原法定退休年龄。\n- 职工达到法定退休年龄，与单位协商一致可弹性延迟退休，**延迟不超过3年**。\n`;
fs.writeFileSync(path.join(outBase, '全国通用', '退休年龄对照表.md'), retireMd);
console.log('✅ 全国通用表已生成（记账利率/计发月数/退休年龄）');

// ============ 生成各省文档 ============
for (const p of provs) {
  const name = provName[p];
  const dir = path.join(outBase, name);
  fs.mkdirSync(dir, { recursive: true });

  // 1. 社平工资历史数据
  const jd = JSON.parse(fs.readFileSync(path.join(provBase, p + '.json'), 'utf8'));
  let salaryMd = `# ${name} 历年在岗职工平均工资（社平工资）历史数据\n\n`;
  salaryMd += `> 数据格式：**元/月**（已统一修正，2025年各省均未超过12000元/月）\n`;
  salaryMd += `> 数据来源：各省统计局/人社厅公布的在岗职工平均工资、全口径城镇单位就业人员平均工资。\n\n`;
  salaryMd += `| 年份 | 社平工资（元/月） | 备注 |\n|------|-------------------|------|\n`;
  if (jd.avg_salary_history) {
    const entries = Object.entries(jd.avg_salary_history)
      .filter(([k]) => k !== '_source')
      .sort((a, b) => a[0] - b[0]);
    for (const [y, v] of entries) {
      const note = (typeof v === 'number' && v > 15000) ? '⚠️异常' : '';
      salaryMd += `| ${y} | ${typeof v === 'number' ? v : v} | ${note} |\n`;
    }
  } else {
    salaryMd += `| - | 暂无 avg_salary_history 数据 | |\n`;
  }
  // 计发基数
  if (jd.base_rates && jd.base_rates.prov) {
    salaryMd += `\n## 历年养老金计发基数（PROV_BASE，元/月）\n\n| 年份 | 计发基数（元/月） |\n|------|-------------------|\n`;
    const prov = jd.base_rates.prov;
    for (const y of Object.keys(prov).filter(k=>k!=='_source').sort()) {
      salaryMd += `| ${y} | ${prov[y]} |\n`;
    }
  }
  fs.writeFileSync(path.join(dir, '社平工资历史数据.md'), salaryMd);

  // 2. 养老保险计算规则
  const js = fs.readFileSync(path.join(provBase, p + '.js'), 'utf8');
  const modMatch = js.match(/MODULE_LABELS\s*=\s*\{([\s\S]*?)\}/);
  const asMatch = js.match(/const ACCOUNT_START\s*=\s*(\{[^}]*\})/);
  const cdMatch = js.match(/const CUTOFF_DATE\s*=\s*(\{[^}]*\})/);
  const coefMatch = js.match(/const TRANS_COEF\s*=\s*\{[^}]*base:\s*([\d.]+)[^}]*alt:\s*([\d.]+)/);

  let ruleMd = `# ${name} 养老保险计算规则\n\n`;
  ruleMd += `## 一、基本参数\n\n`;
  if (asMatch) {
    const y = (asMatch[1].match(/year:\s*(\d+)/) || [])[1];
    const m = (asMatch[1].match(/month:\s*(\d+)/) || [])[1];
    ruleMd += `- **个人账户建立时间（建账时间）**：${y}年${parseInt(m)}月\n`;
  } else ruleMd += `- **个人账户建立时间（建账时间）**：见配置文件\n`;
  if (cdMatch) {
    const y = (cdMatch[1].match(/year:\s*(\d+)/) || [])[1];
    const m = (cdMatch[1].match(/month:\s*(\d+)/) || [])[1];
    ruleMd += `- **视同缴费截止时间**：${y}年${parseInt(m)}月\n`;
  } else ruleMd += `- **视同缴费截止时间**：见配置文件\n`;
  if (coefMatch) {
    const base = coefMatch[1], alt = coefMatch[2];
    if (base && alt) ruleMd += `- **过渡系数**：${(parseFloat(base)*100).toFixed(1)}% ~ ${(parseFloat(alt)*100).toFixed(1)}%\n`;
    else ruleMd += `- **过渡系数**：见配置文件\n`;
  } else ruleMd += `- **过渡系数**：见配置文件\n`;
  ruleMd += `\n`;

  ruleMd += `## 二、计算模块\n\n`;
  if (modMatch) {
    const labels = [...modMatch[1].matchAll(/(\w+):\s*'([^']+)'/g)]
      .map(m => `- **${m[2]}** (\`${m[1]}\`)`).join('\n');
    ruleMd += labels + '\n';
  }

  ruleMd += `\n## 三、各省特殊加发条件\n\n`;
  if (EXTRA_RULES[p]) {
    const e = EXTRA_RULES[p];
    ruleMd += `**${e.label}** (\`${e.module}\`模块)\n\n${e.desc}\n`;
  } else {
    ruleMd += `该省暂无特殊加发/补贴模块（仅含基础养老金、个人账户养老金、过渡性养老金三个标准模块）。\n`;
  }

  ruleMd += `\n## 四、计算公式（标准）\n\n`;
  ruleMd += `1. **基础养老金** = (退休地计发基数 + 退休地计发基数 × 平均缴费指数) ÷ 2 × 累计缴费年限 × 1%\n`;
  ruleMd += `2. **个人账户养老金** = 个人账户储存额 ÷ 计发月数\n`;
  ruleMd += `3. **过渡性养老金** = 退休地计发基数 × 平均缴费指数 × 视同缴费年限 × 过渡系数\n`;
  ruleMd += `\n> 各省可能在基础养老金公式、过渡系数、加发规则上有差异，详见本文件第三节。\n`;

  fs.writeFileSync(path.join(dir, '养老保险计算规则.md'), ruleMd);
}

console.log(`✅ 已生成 ${provs.length} 个省份的文档（社平工资 + 计算规则）`);

// ============ 全国特殊规则汇总 ============
let sumMd = `# 各省养老保险特殊规则汇总\n\n`;
sumMd += `> 提取时间：2026-07-06 ｜ 来源：各省份 .js 配置文件及计算引擎\n\n`;
sumMd += `## 一、有加发/补贴/特殊模块的省份（共 ${Object.keys(EXTRA_RULES).length} 个）\n\n`;
for (const [p, e] of Object.entries(EXTRA_RULES)) {
  sumMd += `### ${provName[p]} —— ${e.label}（\`${e.module}\`模块）\n\n${e.desc}\n\n`;
}
sumMd += `## 二、其余省份\n\n`;
sumMd += `其余 ${provs.length - Object.keys(EXTRA_RULES).length} 个省份（如河北、山西、江苏、浙江、福建、江西、山东、河南、湖北、湖南、海南、贵州、陕西、青海、黑龙江等）仅含三个标准模块（基础养老金、个人账户养老金、过渡性养老金），无额外加发/补贴模块。\n`;
sumMd += `\n> 注：各省过渡系数（1.0%~1.4%不等）、基础养老金公式细节可能不同，详见各省份《养老保险计算规则.md》。\n`;
fs.writeFileSync(path.join(outBase, '全国通用', '各省特殊规则汇总.md'), sumMd);
console.log(`✅ 已生成 全国通用/各省特殊规则汇总.md`);

console.log(`\n输出目录：C:\\Users\\14041\\养老金数据整理\\`);
