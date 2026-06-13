const fs = require('fs');
const path = require('path');

const OTHER_DIR = path.join(__dirname, 'cases', 'other');
const CASES_DIR = path.join(__dirname, 'cases');

  // 省份中文名到目录名的映射
const PROVINCE_MAP = {
  // 中文 → 英文目录名
  '吉林省': 'jilin',
  '黑龙江省': 'heilongjiang',
  '甘肃省': 'gansu',
  '云南省': 'yunnan',
  '上海市': 'shanghai',
  '北京市': 'beijing',
  '广东省': 'guangdong',
  '西藏自治区': 'xizang',
  '山西省': 'shanxi',
  '河北省': 'hebei',
  '河南省': 'henan',
  '湖北省': 'hubei',
  '湖南省': 'hunan',
  '江苏省': 'jiangsu',
  '江西省': 'jiangxi',
  '浙江省': 'zhejiang',
  '安徽省': 'anhui',
  '福建省': 'fujian',
  '山东省': 'shandong',
  '四川省': 'sichuan',
  '陕西省': 'shaanxi',
  '青海省': 'qinghai',
  '天津市': 'tianjin',
  '宁夏回族自治区': 'ningxia',
  '贵州省': 'guizhou',
  '辽宁省': 'liaoning',
  '海南省': 'hainan',
  '内蒙古自治区': 'neimenggu',
  '广西壮族自治区': 'guangxi',
  '新疆维吾尔自治区': 'xinjiang',
  '重庆市': 'chongqing',
  // 短中文名
  '吉林': 'jilin',
  '黑龙江': 'heilongjiang',
  '甘肃': 'gansu',
  '云南': 'yunnan',
  '上海': 'shanghai',
  '北京': 'beijing',
  '广东': 'guangdong',
  '西藏': 'xizang',
  '山西': 'shanxi',
  '河北': 'hebei',
  '河南': 'henan',
  '湖北': 'hubei',
  '湖南': 'hunan',
  '江苏': 'jiangsu',
  '江西': 'jiangxi',
  '浙江': 'zhejiang',
  '安徽': 'anhui',
  '福建': 'fujian',
  '山东': 'shandong',
  '四川': 'sichuan',
  '陕西': 'shaanxi',
  '青海': 'qinghai',
  '天津': 'tianjin',
  '宁夏': 'ningxia',
  '贵州': 'guizhou',
  '辽宁': 'liaoning',
  // 英文（已经是正确的目录名）
  'jilin': 'jilin',
  'heilongjiang': 'heilongjiang',
  'gansu': 'gansu',
  'yunnan': 'yunnan',
  'shanghai': 'shanghai',
  'beijing': 'beijing',
  'guangdong': 'guangdong',
  'xizang': 'xizang',
  'shanxi': 'shanxi',
  'hebei': 'hebei',
  'henan': 'henan',
  'hubei': 'hubei',
  'hunan': 'hunan',
  'jiangsu': 'jiangsu',
  'jiangxi': 'jiangxi',
  'zhejiang': 'zhejiang',
  'anhui': 'anhui',
  'fujian': 'fujian',
  'shandong': 'shandong',
  'sichuan': 'sichuan',
  'shaanxi': 'shaanxi',
  'qinghai': 'qinghai',
  'tianjin': 'tianjin',
  'ningxia': 'ningxia',
  'guizhou': 'guizhou',
  'liaoning': 'liaoning'
};

// 解析中文日期字符串 "1970年11月" → {year: 1970, month: 11}
function parseChineseDate(str) {
  if (!str || str === '未明示' || str === '未知') return null;
  const match = str.match(/(\d{4})年(\d{1,2})月/);
  if (match) {
    return { year: parseInt(match[1]), month: parseInt(match[2]) };
  }
  return null;
}

// 解析 ISO 日期 "1965-05" → {year: 1965, month: 5}
function parseISODate(str) {
  if (!str) return null;
  const match = str.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    return { year: parseInt(match[1]), month: parseInt(match[2]) };
  }
  return null;
}

// 主转换函数
function convertFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let data;
  try {
    data = JSON.parse(content);
  } catch (e) {
    console.error(`  ✗ JSON解析失败: ${path.basename(filePath)} - ${e.message}`);
    return null;
  }

  // 确定省份目录
  const provinceCN = data.province || data.region || '';
  const provinceDir = PROVINCE_MAP[provinceCN];
  if (!provinceDir) {
    console.error(`  ✗ 未知省份: ${provinceCN} (${path.basename(filePath)})`);
    return null;
  }

  // 提取 case_id（支持多种格式）
  let caseId = data.case_id || data.caseId || '';
  if (!caseId && data.name) {
    // 从 name 字段提取，如 "甘肃案例2（...）" → "68" (需要手动映射，这里先生成一个)
    const nameMatch = data.name.match(/案例(\d+)/);
    if (nameMatch) caseId = nameMatch[1];
  }
  if (!caseId) {
    console.error(`  ✗ 无 case_id: ${path.basename(filePath)}`);
    return null;
  }
  caseId = String(caseId);

  // 初始化标准格式
  const standard = {
    case_id: caseId,
    province: provinceDir,
    city: data.city || '全省',
    gender: data.gender || '',
    birth_year: null,
    birth_month: null,
    work_year: null,
    work_month: null,
    retire_year: null,
    retire_month: null,
    retire_type: data.retirement_type || data.retire_type || 'normal',
    sight_years: 0,
    actual_years: null,
    total_years: 0,
    avg_index: 0,
    base_number: 0,
    personal_account: 0,
    months: 0,
    expected: {
      basic_pension: 0,
      personal_pension: 0,
      transition_pension: 0,
      extra_pension: 0,
      total: 0
    },
    verified: data.verified || false,
    notes: data.notes || data.note || ''
  };

  // ---- 处理日期字段 ----
  
  // 格式1: 扁平中文日期 (birth: "1970年11月")
  if (data.birth) {
    const d = parseChineseDate(data.birth);
    if (d) { standard.birth_year = d.year; standard.birth_month = d.month; }
  }
  if (data.work_start) {
    const d = parseChineseDate(data.work_start);
    if (d) { standard.work_year = d.year; standard.work_month = d.month; }
  }
  if (data.retirement_date) {
    const d = parseChineseDate(data.retirement_date);
    if (d) { standard.retire_year = d.year; standard.retire_month = d.month; }
  }

  // 格式2: 嵌套 ISO 日期 (basic_info.birth_date: "1965-05")
  if (data.basic_info) {
    if (data.basic_info.birth_date) {
      const d = parseISODate(data.basic_info.birth_date);
      if (d) { standard.birth_year = d.year; standard.birth_month = d.month; }
    }
    if (data.basic_info.employment_start_date) {
      const d = parseISODate(data.basic_info.employment_start_date);
      if (d) { standard.work_year = d.year; standard.work_month = d.month; }
    }
    if (data.basic_info.retirement_date) {
      const d = parseISODate(data.basic_info.retirement_date);
      if (d) { standard.retire_year = d.year; standard.retire_month = d.month; }
    }
    standard.gender = data.basic_info.gender || standard.gender;
  }

  // 格式3: 驼峰扁平格式 (birthYear: 1965, workYear: 1988)
  if (data.birthYear !== undefined) {
    standard.birth_year = parseInt(data.birthYear) || null;
    standard.birth_month = parseInt(data.birthMonth) || null;
  }
  if (data.workYear !== undefined) {
    standard.work_year = parseInt(data.workYear) || null;
    standard.work_month = parseInt(data.workMonth) || null;
  }
  if (data.retireYear !== undefined) {
    standard.retire_year = parseInt(data.retireYear) || null;
    standard.retire_month = parseInt(data.retireMonth) || null;
  }

  // ---- 处理工龄字段 ----
  
  // 视同缴费年限
  if (data.deemed_years !== undefined) {
    standard.sight_years = parseFloat(data.deemed_years) || 0;
  }
  if (data.sight_years !== undefined) {
    standard.sight_years = parseFloat(data.sight_years) || 0;
  }
  if (data.work_history && data.work_history.sight_years !== undefined) {
    standard.sight_years = parseFloat(data.work_history.sight_years) || 0;
  }
  // 对于上海，视同缴费用 pre92_continuous_years
  if (data.pre92_continuous_years !== undefined) {
    standard.sight_years = parseFloat(data.pre92_continuous_years) || 0;
  }
  // 格式3: 驼峰 (sightYears)
  if (data.sightYears !== undefined) {
    standard.sight_years = parseFloat(data.sightYears) || 0;
  }

  // 实际缴费年限
  if (data.actual_years !== undefined) standard.actual_years = parseFloat(data.actual_years) || 0;
  if (data.work_history && data.work_history.actual_years !== undefined) {
    standard.actual_years = parseFloat(data.work_history.actual_years) || 0;
  }
  if (data.actualYears !== undefined) standard.actual_years = parseFloat(data.actualYears) || 0;

  // 累计缴费年限
  if (data.total_years !== undefined) standard.total_years = parseFloat(data.total_years) || 0;
  if (data.work_history && data.work_history.total_years !== undefined) {
    standard.total_years = parseFloat(data.work_history.total_years) || 0;
  }
  if (data.totalYears !== undefined) standard.total_years = parseFloat(data.totalYears) || 0;

  // ---- 处理缴费数据 ----
  
  if (data.avg_index !== undefined) standard.avg_index = parseFloat(data.avg_index) || 0;
  if (data.basic_index !== undefined) standard.avg_index = parseFloat(data.basic_index) || 0;  // 26.json 用 basic_index
  if (data.insurance_data && data.insurance_data.avg_index !== undefined) {
    standard.avg_index = parseFloat(data.insurance_data.avg_index) || 0;
  }
  if (data.avgIndex !== undefined) standard.avg_index = parseFloat(data.avgIndex) || 0;

  if (data.base_number !== undefined) standard.base_number = parseFloat(data.base_number) || 0;
  if (data.insurance_data) {
    if (data.insurance_data.base_retire !== undefined) {
      standard.base_number = parseFloat(data.insurance_data.base_retire) || 0;
    }
  }
  if (data.baseRetire !== undefined) standard.base_number = parseFloat(data.baseRetire) || 0;

  if (data.personal_account !== undefined && data.personal_account !== '未明示') {
    standard.personal_account = parseFloat(data.personal_account) || 0;
  }
  if (data.insurance_data && data.insurance_data.personal_account_balance !== undefined) {
    standard.personal_account = parseFloat(data.insurance_data.personal_account_balance) || 0;
  }
  if (data.personalAcc !== undefined) standard.personal_account = parseFloat(data.personalAcc) || 0;

  if (data.months !== undefined && data.months !== '未明示') {
    standard.months = parseInt(data.months) || 0;
  }
  if (data.months !== undefined) standard.months = parseInt(data.months) || 0;

  // 从 input_for_engine 读取（68.json 的格式）
  if (data.input_for_engine) {
    if (data.input_for_engine.birthYear !== undefined) {
      standard.birth_year = parseInt(data.input_for_engine.birthYear) || standard.birth_year;
      standard.birth_month = parseInt(data.input_for_engine.birthMonth) || standard.birth_month;
    }
    if (data.input_for_engine.workYear !== undefined) {
      standard.work_year = parseInt(data.input_for_engine.workYear) || standard.work_year;
      standard.work_month = parseInt(data.input_for_engine.workMonth) || standard.work_month;
    }
    if (data.input_for_engine.retireYear !== undefined) {
      standard.retire_year = parseInt(data.input_for_engine.retireYear) || standard.retire_year;
      standard.retire_month = parseInt(data.input_for_engine.retireMonth) || standard.retire_month;
    }
    if (data.input_for_engine.sightYears !== undefined) standard.sight_years = parseFloat(data.input_for_engine.sightYears) || standard.sight_years;
    if (data.input_for_engine.totalYears !== undefined) standard.total_years = parseFloat(data.input_for_engine.totalYears) || standard.total_years;
    if (data.input_for_engine.personalAccInput !== undefined) standard.personal_account = parseFloat(data.input_for_engine.personalAccInput) || standard.personal_account;
    if (data.input_for_engine.avgIndex !== undefined) standard.avg_index = parseFloat(data.input_for_engine.avgIndex) || standard.avg_index;
    if (data.input_for_engine.baseRetireInput !== undefined) standard.base_number = parseFloat(data.input_for_engine.baseRetireInput) || standard.base_number;
    if (data.input_for_engine.months !== undefined) standard.months = parseFloat(data.input_for_engine.months) || standard.months;
  }

  // ---- 处理预期养老金 ----
  
  if (data.basic_pension !== undefined) standard.expected.basic_pension = parseFloat(data.basic_pension) || 0;
  if (data.personal_pension !== undefined) standard.expected.personal_pension = parseFloat(data.personal_pension) || 0;
  if (data.transition_pension !== undefined) standard.expected.transition_pension = parseFloat(data.transition_pension) || 0;
  if (data.extra_pension !== undefined) standard.expected.extra_pension = parseFloat(data.extra_pension) || 0;
  if (data.total !== undefined) standard.expected.total = parseFloat(data.total) || 0;

  // 嵌套格式
  if (data.pension_breakdown) {
    if (data.pension_breakdown.base_pension !== undefined) {
      standard.expected.basic_pension = parseFloat(data.pension_breakdown.base_pension) || 0;
    }
    if (data.pension_breakdown.personal_pension !== undefined) {
      standard.expected.personal_pension = parseFloat(data.pension_breakdown.personal_pension) || 0;
    }
    if (data.pension_breakdown.transitional_pension !== undefined) {
      standard.expected.transition_pension = parseFloat(data.pension_breakdown.transitional_pension) || 0;
    }
    if (data.pension_breakdown.total_pension !== undefined) {
      standard.expected.total = parseFloat(data.pension_breakdown.total_pension) || 0;
    }
  }

  // 格式3: engineResults 或 officialResults
  if (data.engineResults && data.engineResults.totalPension !== undefined) {
    standard.expected.basic_pension = parseFloat(data.engineResults.basePension) || 0;
    standard.expected.personal_pension = parseFloat(data.engineResults.personalPension) || 0;
    standard.expected.transition_pension = parseFloat(data.engineResults.transitionalPension) || parseFloat(data.engineResults.transitionPension) || 0;
    standard.expected.total = parseFloat(data.engineResults.totalPension) || 0;
  }
  if (data.officialResults && data.officialResults.totalPension !== undefined) {
    standard.expected.basic_pension = parseFloat(data.officialResults.basePension) || 0;
    standard.expected.personal_pension = parseFloat(data.officialResults.personalPension) || 0;
    standard.expected.transition_pension = parseFloat(data.officialResults.transitionalPension) || parseFloat(data.officialResults.transitionPension) || 0;
    standard.expected.total = parseFloat(data.officialResults.totalPension) || 0;
  }

  // 验证是否有足够数据
  const hasInputData = standard.birth_year !== null && standard.work_year !== null;
  const hasExpectedData = standard.expected.total > 0;
  
  if (!hasInputData && !hasExpectedData) {
    console.error(`  ✗ 无有效数据: ${path.basename(filePath)}`);
    return null;
  }

  return { provinceDir, caseId, data: standard };
}

// 主程序
function main() {
  console.log('开始转换 cases/other/ 下的文件...\n');

  const files = fs.readdirSync(OTHER_DIR)
    .filter(f => f.endsWith('.json'))
    .filter(f => !f.startsWith('#'));

  let successCount = 0;
  let failCount = 0;
  const summary = {};

  for (const file of files) {
    const filePath = path.join(OTHER_DIR, file);
    console.log(`处理: ${file}`);

    const result = convertFile(filePath);
    if (!result) {
      failCount++;
      continue;
    }

    const { provinceDir, caseId, data } = result;

    // 确保目标目录存在
    const targetDir = path.join(CASES_DIR, provinceDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 写入文件
    const targetPath = path.join(targetDir, `${caseId}.json`);
    fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf8');

    // 统计
    if (!summary[provinceDir]) summary[provinceDir] = [];
    summary[provinceDir].push(caseId);
    successCount++;

    console.log(`  ✓ 已写入: cases/${provinceDir}/${caseId}.json`);
    console.log(`    出生: ${data.birth_year}-${data.birth_month}, 参工: ${data.work_year}-${data.work_month}, 退休: ${data.retire_year}-${data.retire_month}`);
    console.log(`    累计年限: ${data.total_years}, 指数: ${data.avg_index}, 基数: ${data.base_number}`);
    console.log(`    预期总额: ${data.expected.total}\n`);
  }

  console.log('========================================');
  console.log(`转换完成: ${successCount} 成功, ${failCount} 失败\n`);
  console.log('分省统计:');
  for (const [prov, ids] of Object.entries(summary).sort()) {
    console.log(`  ${prov}: ${ids.length} 个 (${ids.join(', ')})`);
  }
}

main();
