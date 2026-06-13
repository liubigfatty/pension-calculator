const fs = require('fs');
const path = require('path');

const OTHER_DIR = path.join(__dirname, 'cases', 'other');
const CASES_DIR = path.join(__dirname, 'cases');

// 省份映射（全）
const PROVINCE_MAP = {
  '吉林省': 'jilin', '黑龙江省': 'heilongjiang', '甘肃省': 'gansu', '云南省': 'yunnan',
  '上海市': 'shanghai', '北京市': 'beijing', '广东省': 'guangdong', '西藏自治区': 'xizang',
  '山西省': 'shanxi', '河北省': 'hebei', '河南省': 'henan', '湖北省': 'hubei',
  '湖南省': 'hunan', '江苏省': 'jiangsu', '江西省': 'jiangxi', '浙江省': 'zhejiang',
  '安徽省': 'anhui', '福建省': 'fujian', '山东省': 'shandong', '四川省': 'sichuan',
  '陕西省': 'shaanxi', '青海省': 'qinghai', '天津市': 'tianjin', '宁夏回族自治区': 'ningxia',
  '贵州省': 'guizhou', '辽宁省': 'liaoning', '海南省': 'hainan',
  '内蒙古自治区': 'neimenggu', '广西壮族自治区': 'guangxi', '新疆维吾尔自治区': 'xinjiang', '重庆市': 'chongqing',
  '吉林': 'jilin', '黑龙江': 'heilongjiang', '甘肃': 'gansu', '云南': 'yunnan',
  '上海': 'shanghai', '北京': 'beijing', '广东': 'guangdong', '西藏': 'xizang',
  '山西': 'shanxi', '河北': 'hebei', '河南': 'henan', '湖北': 'hubei',
  '湖南': 'hunan', '江苏': 'jiangsu', '江西': 'jiangxi', '浙江': 'zhejiang',
  '安徽': 'anhui', '福建': 'fujian', '山东': 'shandong', '四川': 'sichuan',
  '陕西': 'shaanxi', '青海': 'qinghai', '天津': 'tianjin', '宁夏': 'ningxia',
  '贵州': 'guizhou', '辽宁': 'liaoning',
  'jilin': 'jilin', 'heilongjiang': 'heilongjiang', 'gansu': 'gansu', 'yunnan': 'yunnan',
  'shanghai': 'shanghai', 'beijing': 'beijing', 'guangdong': 'guangdong', 'xizang': 'xizang',
  'shanxi': 'shanxi', 'hebei': 'hebei', 'henan': 'henan', 'hubei': 'hubei',
  'hunan': 'hunan', 'jiangsu': 'jiangsu', 'jiangxi': 'jiangxi', 'zhejiang': 'zhejiang',
  'anhui': 'anhui', 'fujian': 'fujian', 'shandong': 'shandong', 'sichuan': 'sichuan',
  'shaanxi': 'shaanxi', 'qinghai': 'qinghai', 'tianjin': 'tianjin', 'ningxia': 'ningxia',
  'guizhou': 'guizhou', 'liaoning': 'liaoning'
};

// 从市级前缀提取省份（如"湖北省黄石市" → "湖北省"）
function extractProvinceFromCity(provinceStr) {
  if (!provinceStr) return null;
  // 先尝试直接映射
  if (PROVINCE_MAP[provinceStr]) return PROVINCE_MAP[provinceStr];
  // 尝试匹配前缀（省/市/自治区/回族自治区/壮族自治区/维吾尔自治区）
  const match = provinceStr.match(/^(.+?(省|市|自治区|回族自治区|壮族自治区|维吾尔自治区))/);
  if (match) {
    return PROVINCE_MAP[match[1]] || null;
  }
  return null;
}

// 解析中文日期 "1970年11月" 或 "1970年11月19日"
function parseChineseDate(str) {
  if (!str || str === '未明示' || str === '未知' || str === null) return null;
  const match = str.match(/(\d{4})年(\d{1,2})月/);
  return match ? { year: parseInt(match[1]), month: parseInt(match[2]) } : null;
}

// 解析 ISO 日期 "1965-05" 或 "1994-01-01"
function parseISODate(str) {
  if (!str || str === null) return null;
  const match = str.match(/^(\d{4})-(\d{2})(?:-\d{2})?/);
  return match ? { year: parseInt(match[1]), month: parseInt(match[2]) } : null;
}

// 解析压缩日期 "19650324" 或 "196503"（6位或8位）
function parseCompressedDate(str) {
  if (!str || str === null) return null;
  // 尝试8位格式 YYYYMMDD
  let match = str.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (match) return { year: parseInt(match[1]), month: parseInt(match[2]) };
  // 尝试6位格式 YYYYMM
  match = str.match(/^(\d{4})(\d{2})$/);
  if (match) return { year: parseInt(match[1]), month: parseInt(match[2]) };
  return null;
}

// 解析年限字符串 "26.75年" 或 "41年9个月"
function parseYears(str) {
  if (!str || str === null) return null;
  const match1 = str.match(/^([\d.]+)年/);
  if (match1) return parseFloat(match1[1]);
  return null;
}

// 从 name 字段提取 case_id，如 "甘肃案例2（...）" → "2"
function extractCaseIdFromName(name) {
  if (!name || typeof name !== 'string') return null;
  const match = name.match(/案例(\d+)/);
  return match ? match[1] : null;
}

// 主转换函数
function convertFile(filePath) {
  const fileName = path.basename(filePath);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return { error: `JSON解析失败: ${e.message}` };
  }

  // ---- 1. 确定省份 ----
  const provinceCN = data.province || data.region || '';
  let provinceDir = PROVINCE_MAP[provinceCN] || extractProvinceFromCity(provinceCN) || '';
  
  // 如果 province 字段是中文全称但在 case_data 里
  if (!provinceDir && data.case_data && data.case_data.basic_info) {
    // 贵州.json、江西.json 格式：region 在顶层
    // 已经由 data.region 处理了
  }
  
  // 从文件路径推断（最后手段）
  if (!provinceDir) {
    return { error: `未知省份: ${provinceCN} (${fileName})` };
  }

  // ---- 2. 提取 case_id ----
  let caseId = data.case_id || data.caseId || '';
  if (!caseId) caseId = extractCaseIdFromName(data.name || data.case_name || '');
  if (!caseId) caseId = extractCaseIdFromName(data.notes || '');
  if (!caseId && data['案例编号']) caseId = String(data['案例编号']);
  if (!caseId && data.case_data && data.case_data.basic_info) {
    // 对于贵州.json 这种格式，生成一个 case_id
    caseId = provinceDir + '-' + Date.now().toString().slice(-6);
  }
  if (!caseId) {
    // 对于无 case_id 但有完整数据的文件，用文件名（不含扩展名）
    if (data.province && (data.pension_total || data.expected_total || data.total)) {
      caseId = fileName.replace('.json', '');
    } else {
      return { error: `无 case_id: ${fileName}` };
    }
  }
  caseId = String(caseId);

  // ---- 3. 初始化标准格式 ----
  const std = {
    case_id: caseId,
    province: provinceDir,
    city: data.city || (data.case_data && data.case_data.basic_info ? data.case_data.basic_info.city || '全省' : '全省'),
    gender: data.gender || '',
    birth_year: null, birth_month: null,
    work_year: null, work_month: null,
    retire_year: null, retire_month: null,
    retire_type: data.retire_type || data.retirement_type || 'normal',
    sight_years: 0, actual_years: null, total_years: 0,
    avg_index: 0, base_number: 0, personal_account: 0, months: 0,
    expected: { basic_pension: 0, personal_pension: 0, transition_pension: 0, extra_pension: 0, total: 0 },
    verified: data.verified || data.data_quality === 'official_verified' || false,
    notes: String(data.notes || data.note || (data.key_findings || []).join('; ') || '')
  };

  // ---- 4. 提取日期 ----
  
  // 格式A: 中文日期字符串
  let d;
  if (data.birth) { d = parseChineseDate(data.birth); if (d) { std.birth_year = d.year; std.birth_month = d.month; } }
  if (data.work_start) { d = parseChineseDate(data.work_start); if (d) { std.work_year = d.year; std.work_month = d.month; } }
  if (data.retirement_date) { d = parseChineseDate(data.retirement_date); if (d) { std.retire_year = d.year; std.retire_month = d.month; } }
  
  // 格式B: ISO 日期 (basic_info.birth_date)
  if (data.basic_info) {
    if (data.basic_info.birth_date) { d = parseISODate(data.basic_info.birth_date); if (d) { std.birth_year = d.year; std.birth_month = d.month; } }
    if (data.basic_info.employment_start_date) { d = parseISODate(data.basic_info.employment_start_date); if (d) { std.work_year = d.year; std.work_month = d.month; } }
    if (data.basic_info.retirement_date) { d = parseISODate(data.basic_info.retirement_date); if (d) { std.retire_year = d.year; std.retire_month = d.month; } }
    std.gender = data.basic_info.gender || std.gender;
    std.retire_type = data.basic_info.retirement_type || data.basic_info.retire_type || std.retire_type;
  }
  
  // 格式C: 驼峰 (birthYear)
  if (data.birthYear !== undefined) {
    std.birth_year = parseInt(data.birthYear) || null;
    std.birth_month = parseInt(data.birthMonth) || null;
  }
  if (data.workYear !== undefined) {
    std.work_year = parseInt(data.workYear) || null;
    std.work_month = parseInt(data.workMonth) || null;
  }
  if (data.retireYear !== undefined) {
    std.retire_year = parseInt(data.retireYear) || null;
    std.retire_month = parseInt(data.retireMonth) || null;
  }
  
  // 格式D: birth_date 压缩格式 "19650324" 或 ISO "1965-04-25"
  if (data.birth_date) {
    d = parseCompressedDate(data.birth_date) || parseISODate(data.birth_date);
    if (d) { std.birth_year = d.year; std.birth_month = d.month; }
  }
  if (data.work_start_date) {
    d = parseCompressedDate(data.work_start_date) || parseISODate(data.work_start_date);
    if (d) { std.work_year = d.year; std.work_month = d.month; }
  }
  if (data.start_work_date) {
    d = parseCompressedDate(data.start_work_date) || parseISODate(data.start_work_date);
    if (d) { std.work_year = d.year; std.work_month = d.month; }
  }
  if (data.retire_date) {
    d = parseCompressedDate(data.retire_date) || parseISODate(data.retire_date);
    if (d) { std.retire_year = d.year; std.retire_month = d.month; }
  }
  if (data.retirement_date && !std.retire_year) {
    d = parseCompressedDate(data.retirement_date) || parseISODate(data.retirement_date);
    if (d) { std.retire_year = d.year; std.retire_month = d.month; }
  }
  
  // 格式E: 中文Key (案例编号, 出生时间)
  if (data['案例编号']) {
    caseId = String(data['案例编号']);
    std.case_id = caseId;
  }
  if (data['出生时间']) { d = parseChineseDate(data['出生时间']); if (d) { std.birth_year = d.year; std.birth_month = d.month; } }
  if (data['参加工作时间']) { d = parseChineseDate(data['参加工作时间']); if (d) { std.work_year = d.year; std.work_month = d.month; } }
  if (data['退休时间']) { d = parseChineseDate(data['退休时间']); if (d) { std.retire_year = d.year; std.retire_month = d.month; } }
  if (data['性别']) std.gender = data['性别'];
  if (data['地区']) { const p = PROVINCE_MAP[data['地区']]; if (p) { provinceDir = p; std.province = p; } }

  // ---- 5. 提取工龄 ----
  
  // 视同
  if (data.deemed_years !== undefined) std.sight_years = parseFloat(data.deemed_years) || 0;
  if (data.sight_years !== undefined) std.sight_years = parseFloat(data.sight_years) || 0;
  if (data.sightYears !== undefined) std.sight_years = parseFloat(data.sightYears) || 0;
  if (data.work_history && data.work_history.sight_years !== undefined) std.sight_years = parseFloat(data.work_history.sight_years) || 0;
  if (data.years_info && data.years_info.deemed_years !== undefined) std.sight_years = parseFloat(data.years_info.deemed_years) || 0;
  if (data.contribution_years && data.contribution_years.deemed_years !== undefined) std.sight_years = parseFloat(data.contribution_years.deemed_years) || 0;
  if (data.contribution_years && data.contribution_years.deemed_before_1997_months !== undefined) {
    // 青海格式：deemed_before_1997_months 是字符串 "08年0个月"
  }
  if (data.pre92_continuous_years !== undefined) std.sight_years = parseFloat(data.pre92_continuous_years) || 0;
  
  // 实际
  if (data.actual_years !== undefined) std.actual_years = parseFloat(data.actual_years) || 0;
  if (data.actualYears !== undefined) std.actual_years = parseFloat(data.actualYears) || 0;
  if (data.work_history && data.work_history.actual_years !== undefined) std.actual_years = parseFloat(data.work_history.actual_years) || 0;
  if (data.years_info && data.years_info.actual_years !== undefined) std.actual_years = parseFloat(data.years_info.actual_years) || 0;
  
  // 累计
  if (data.total_years !== undefined) std.total_years = parseFloat(data.total_years) || 0;
  if (data.totalYears !== undefined) std.total_years = parseFloat(data.totalYears) || 0;
  if (data.work_history && data.work_history.total_years !== undefined) std.total_years = parseFloat(data.work_history.total_years) || 0;
  if (data.years_info && data.years_info.total_years !== undefined) std.total_years = parseFloat(data.years_info.total_years) || 0;
  if (data.contribution_years && data.contribution_years.total_contribution_years !== undefined) {
    const y = parseYears(data.contribution_years.total_contribution_years);
    if (y) std.total_years = y;
  }
  if (data.contribution_years && data.contribution_years.total_years !== undefined) {
    std.total_years = parseFloat(data.contribution_years.total_years) || 0;
  }
  if (data.case_data && data.case_data.contribution_years) {
    const cy = data.case_data.contribution_years;
    if (cy.total_contribution_months) std.total_years = cy.total_contribution_months / 12;
    if (cy.deemed_contribution_months) std.sight_years = cy.deemed_contribution_months / 12;
    if (cy.actual_contribution_months) std.actual_years = cy.actual_contribution_months / 12;
  }
  // 中文Key格式
  if (data['累计缴费年限']) {
    const y = parseYears(data['累计缴费年限']);
    if (y) std.total_years = y;
  }
  if (data['视同缴费年限']) {
    const y = parseYears(data['视同缴费年限']);
    if (y) std.sight_years = y;
  }

  // ---- 6. 提取缴费数据 ----
  
  // 优先使用 input_for_engine（如果存在）
  if (data.input_for_engine) {
    const ie = data.input_for_engine;
    std.birth_year = ie.birthYear || std.birth_year;
    std.birth_month = ie.birthMonth || std.birth_month;
    std.work_year = ie.workYear || std.work_year;
    std.work_month = ie.workMonth || std.work_month;
    std.retire_year = ie.retireYear || std.retire_year;
    std.retire_month = ie.retireMonth || std.retire_month;
    std.sight_years = ie.sightYears || std.sight_years;
    std.actual_years = ie.actualYears || std.actual_years;
    std.total_years = ie.totalYears || std.total_years;
    std.avg_index = ie.avgIndex || std.avg_index;
    std.base_number = ie.baseRetireInput || ie.baseProvInput || std.base_number;
    std.personal_account = ie.personalAccInput || ie.personalAcc || std.personal_account;
    std.months = ie.months || std.months;
    if (ie.cityType) std.city = ie.cityType === 'cc' ? '长春' : '全省';
    if (ie.accountStart) {
      std.account_start = ie.accountStart;
    }
  }
  
  if (data.avg_index != null) std.avg_index = parseFloat(data.avg_index) || 0;
  if (data.average_index != null) std.avg_index = parseFloat(data.average_index) || 0;
  if (data.basic_index != null) std.avg_index = parseFloat(data.basic_index) || 0;
  if (data.average_wage_index != null) std.avg_index = parseFloat(data.average_wage_index) || 0;
  if (data.avgIndex != null) std.avg_index = parseFloat(data.avgIndex) || 0;
  if (data.insurance_data && data.insurance_data.avg_index != null) std.avg_index = parseFloat(data.insurance_data.avg_index) || 0;
  if (data.case_data && data.case_data.calculation_params && data.case_data.calculation_params.average_index != null) {
    std.avg_index = parseFloat(data.case_data.calculation_params.average_index) || 0;
  }
  if (data['平均缴费指数'] != null) std.avg_index = parseFloat(data['平均缴费指数']) || 0;
  // 宁夏/贵州格式：case_data.basic_info.average_contribution_index
  if (data.case_data && data.case_data.basic_info && data.case_data.basic_info.average_contribution_index != null) {
    std.avg_index = parseFloat(data.case_data.basic_info.average_contribution_index) || 0;
  }
  
  if (data.base_number !== undefined) std.base_number = parseFloat(data.base_number) || 0;
  if (data.pension_base !== undefined && data.pension_base !== null) std.base_number = parseFloat(data.pension_base) || 0;
  if (data.previous_year_monthly_wage !== undefined) std.base_number = parseFloat(data.previous_year_monthly_wage) || 0;
  if (data.insurance_data && data.insurance_data.base_retire !== undefined) std.base_number = parseFloat(data.insurance_data.base_retire) || 0;
  if (data.baseRetire !== undefined) std.base_number = parseFloat(data.baseRetire) || 0;
  if (data.case_data && data.case_data.calculation_params && data.case_data.calculation_params.previous_year_average_wage !== undefined) {
    std.base_number = parseFloat(data.case_data.calculation_params.previous_year_average_wage) || 0;
  }
  if (data['退休时上年社平工资'] !== undefined) std.base_number = parseFloat(data['退休时上年社平工资']) || 0;
  
  if (data.personal_account !== undefined && data.personal_account !== '未明示') std.personal_account = parseFloat(data.personal_account) || 0;
  if (data.personalAcc !== undefined) std.personal_account = parseFloat(data.personalAcc) || 0;
  if (data.personal_account_balance !== undefined && data.personal_account_balance !== null) std.personal_account = parseFloat(data.personal_account_balance) || 0;
  if (data.personal_account_total !== undefined && data.personal_account_total !== null) std.personal_account = parseFloat(data.personal_account_total) || 0;
  if (data.insurance_data && data.insurance_data.personal_account_balance !== undefined) std.personal_account = parseFloat(data.insurance_data.personal_account_balance) || 0;
  if (data.personal_account && data.personal_account.balance !== undefined) std.personal_account = parseFloat(data.personal_account.balance) || 0;
  if (data.calculation_parameters && data.calculation_parameters.personal_account_balance !== undefined) std.personal_account = parseFloat(data.calculation_parameters.personal_account_balance) || 0;
  if (data.case_data && data.case_data.basic_info && data.case_data.basic_info.personal_account_amount !== undefined) {
    std.personal_account = parseFloat(data.case_data.basic_info.personal_account_amount) || 0;
  }
  if (data['退休时个人账户累计总额'] !== undefined) std.personal_account = parseFloat(data['退休时个人账户累计总额']) || 0;
  
  if (data.months !== undefined && data.months !== '未明示') std.months = parseInt(data.months) || 0;
  if (data.payment_months !== undefined && data.payment_months !== null) std.months = parseFloat(data.payment_months) || 0;
  if (data.benefit_months !== undefined && data.benefit_months !== null) std.months = parseFloat(data.benefit_months) || 0;
  if (data.personal_account && data.personal_account.division_months !== undefined) std.months = parseFloat(data.personal_account.division_months) || 0;
  if (data.calculation_parameters && data.calculation_parameters.payment_months !== undefined) std.months = parseFloat(data.calculation_parameters.payment_months) || 0;

  // ---- 7. 提取预期养老金 ----
  
  // 扁平格式
  if (data.basic_pension !== undefined) std.expected.basic_pension = parseFloat(data.basic_pension) || 0;
  if (data.personal_pension !== undefined) std.expected.personal_pension = parseFloat(data.personal_pension) || 0;
  if (data.transition_pension !== undefined) std.expected.transition_pension = parseFloat(data.transition_pension) || 0;
  if (data.extra_pension !== undefined) std.expected.extra_pension = parseFloat(data.extra_pension) || 0;
  if (data.total !== undefined) std.expected.total = parseFloat(data.total) || 0;
  if (data.pension_total !== undefined) std.expected.total = parseFloat(data.pension_total) || 0;
  if (data.total_pension !== undefined) std.expected.total = parseFloat(data.total_pension) || 0;
  
  // 嵌套 pension_breakdown
  const pb = data.pension_breakdown || data.pension_breakdown || {};
  if (pb.base_pension !== undefined) std.expected.basic_pension = parseFloat(pb.base_pension) || 0;
  if (pb.basic_pension !== undefined) std.expected.basic_pension = parseFloat(pb.basic_pension) || 0;
  if (pb.personal_pension !== undefined) std.expected.personal_pension = parseFloat(pb.personal_pension) || 0;
  if (pb.account_pension !== undefined) std.expected.personal_pension = parseFloat(pb.account_pension) || 0;
  if (pb.personal_account_pension !== undefined) std.expected.personal_pension = parseFloat(pb.personal_account_pension) || 0;
  if (pb.transitional_pension !== undefined) std.expected.transition_pension = parseFloat(pb.transitional_pension) || 0;
  if (pb.transition_pension !== undefined) std.expected.transition_pension = parseFloat(pb.transition_pension) || 0;
  if (pb.total_pension !== undefined) std.expected.total = parseFloat(pb.total_pension) || 0;
  if (pb.total !== undefined) std.expected.total = parseFloat(pb.total) || 0;
  
  // 中文Key格式
  if (data['养老金分项']) {
    const ps = data['养老金分项'];
    if (ps['基础养老金']) std.expected.basic_pension = parseFloat(ps['基础养老金']) || 0;
    if (ps['个人账户养老金']) std.expected.personal_pension = parseFloat(ps['个人账户养老金']) || 0;
    if (ps['过渡性养老金']) std.expected.transition_pension = parseFloat(ps['过渡性养老金']) || 0;
    if (ps['待遇合计']) std.expected.total = parseFloat(ps['待遇合计']) || 0;
  }
  if (data.case_data && data.case_data.pension_breakdown) {
    const ps = data.case_data.pension_breakdown;
    if (ps.basic_pension) std.expected.basic_pension = parseFloat(ps.basic_pension) || 0;
    if (ps.personal_account_pension) std.expected.personal_pension = parseFloat(ps.personal_account_pension) || 0;
    if (ps.transitional_pension) std.expected.transition_pension = parseFloat(ps.transitional_pension) || 0;
    if (ps.total_pension) std.expected.total = parseFloat(ps.total_pension) || 0;
  }
  
  // engineResults / officialResults (驼峰格式)
  if (data.engineResults && data.engineResults.totalPension !== undefined) {
    std.expected.basic_pension = parseFloat(data.engineResults.basePension) || 0;
    std.expected.personal_pension = parseFloat(data.engineResults.personalPension) || 0;
    std.expected.transition_pension = parseFloat(data.engineResults.transitionalPension || data.engineResults.transitionPension) || 0;
    std.expected.total = parseFloat(data.engineResults.totalPension) || 0;
  }
  
  // 西藏格式：basic_total + other_total = grand_total
  if (pb.basic_total !== undefined) {
    std.expected.basic_pension = parseFloat(pb.basic_total) || 0;
    std.expected.extra_pension = parseFloat(pb.other_total) || 0;
    if (data.grand_total !== undefined) {
      std.expected.total = parseFloat(data.grand_total) || 0;
    } else {
      std.expected.total = (std.expected.basic_pension || 0) + (std.expected.extra_pension || 0);
    }
  }
  
  // extra_pension 特殊项
  if (data.only_child_bonus !== undefined) std.expected.extra_pension = parseFloat(data.only_child_bonus) || 0;
  if (pb.only_child_bonus !== undefined) std.expected.extra_pension = parseFloat(pb.only_child_bonus) || 0;
  if (pb.pension_subsidy !== undefined) std.expected.extra_pension = parseFloat(pb.pension_subsidy) || 0;
  if (pb.basic_pension_subsidy !== undefined) std.expected.extra_pension = parseFloat(pb.basic_pension_subsidy) || 0;

  // ---- 8. 验证 ----
  const hasInput = std.birth_year || std.work_year || std.retire_year;
  const hasExpected = std.expected.total > 0;
  
  if (!hasInput && !hasExpected) {
    return { error: `无有效数据: ${fileName}` };
  }

  return { provinceDir, caseId, data: std };
}

// 主程序
function main() {
  console.log('=== 开始转换 cases/other/ 下的文件 ===\n');
  
  // 先清理之前转换的文件（保留手动创建的）
  const KEEP_FILES = ['71.json', 'guizhou-1.json', '贵州.json', '63.json', '27.json', '28.json'];
  
  const files = fs.readdirSync(OTHER_DIR).filter(f => f.endsWith('.json') && !f.startsWith('#'));

  let success = 0, fail = 0;
  const summary = {};
  const errors = [];

  for (const file of files) {
    const filePath = path.join(OTHER_DIR, file);
    const result = convertFile(filePath);
    
    if (result.error) {
      errors.push(`  ✗ ${file}: ${result.error}`);
      fail++;
      continue;
    }

    const { provinceDir, caseId, data } = result;

    // 确保目标目录
    const targetDir = path.join(CASES_DIR, provinceDir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // 写入（覆盖已存在的）
    const targetPath = path.join(targetDir, `${caseId}.json`);
    fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf8');

    if (!summary[provinceDir]) summary[provinceDir] = [];
    summary[provinceDir].push(caseId);
    success++;

    console.log(`  ✓ ${file} → ${provinceDir}/${caseId}.json`);
  }

  console.log('\n========================================');
  console.log(`结果: ${success} 成功, ${fail} 失败\n`);
  
  if (errors.length > 0) {
    console.log('失败文件:');
    errors.forEach(e => console.log(e));
    console.log('');
  }
  
  console.log('分省统计:');
  for (const [prov, ids] of Object.entries(summary).sort()) {
    console.log(`  ${prov}: ${ids.join(', ')}`);
  }
}

main();
