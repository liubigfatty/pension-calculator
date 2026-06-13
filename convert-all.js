const fs = require('fs');
const path = require('path');

const otherDir = path.join(__dirname, 'cases/other');
const casesDir = path.join(__dirname, 'cases');

// 读取所有文件
const files = fs.readdirSync(otherDir).filter(f => f.endsWith('.json'));
console.log(`找到 ${files.length} 个文件`);

let converted = 0;
let skipped = 0;

for (const file of files) {
  try {
    const filePath = path.join(otherDir, file);
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // 判断省份
    const province = raw.province || raw.region || raw.地区 || raw.case_data?.basic_info?.region || '';
    let provDir = '';
    
    // 省份映射（中文+英文）
    const map = {
      '上海市': 'shanghai', '上海': 'shanghai', 'shanghai': 'shanghai',
      '云南省': 'yunnan', '云南': 'yunnan', 'yunnan': 'yunnan',
      '甘肃省': 'gansu', '甘肃': 'gansu', 'gansu': 'gansu',
      '北京市': 'beijing', '北京': 'beijing', 'beijing': 'beijing',
      '江苏省': 'jiangsu', '江苏': 'jiangsu', 'jiangsu': 'jiangsu',
      '四川省': 'sichuan', '四川': 'sichuan', 'sichuan': 'sichuan',
      '吉林省': 'jilin', '吉林': 'jilin', 'jilin': 'jilin',
      '黑龙江省': 'heilongjiang', '黑龙江': 'heilongjiang', 'heilongjiang': 'heilongjiang',
      '安徽省': 'anhui', '安徽': 'anhui', 'anhui': 'anhui',
      '福建省': 'fujian', '福建': 'fujian', 'fujian': 'fujian',
      '广东省': 'guangdong', '广东': 'guangdong', 'guangdong': 'guangdong',
      '贵州省': 'guizhou', '贵州': 'guizhou', 'guizhou': 'guizhou',
      '河北省': 'hebei', '河北': 'hebei', 'hebei': 'hebei',
      '河南省': 'henan', '河南': 'henan', 'henan': 'henan',
      '湖北省': 'hubei', '湖北': 'hubei', 'hubei': 'hubei',
      '湖南省': 'hunan', '湖南': 'hunan', 'hunan': 'hunan',
      '江西省': 'jiangxi', '江西': 'jiangxi', 'jiangxi': 'jiangxi',
      '辽宁省': 'liaoning', '辽宁': 'liaoning', 'liaoning': 'liaoning',
      '宁夏': 'ningxia', 'ningxia': 'ningxia',
      '青海省': 'qinghai', '青海': 'qinghai', 'qinghai': 'qinghai',
      '陕西省': 'shaanxi', '陕西': 'shaanxi', 'shaanxi': 'shaanxi',
      '山东省': 'shandong', '山东': 'shandong', 'shandong': 'shandong',
      '山西省': 'shanxi', '山西': 'shanxi', 'shanxi': 'shanxi',
      '天津市': 'tianjin', '天津': 'tianjin', 'tianjin': 'tianjin',
      '西藏自治区': 'xizang', '西藏': 'xizang', 'xizang': 'xizang',
      '浙江省': 'zhejiang', '浙江': 'zhejiang', 'zhejiang': 'zhejiang'
    };
    
    for (const [k, v] of Object.entries(map)) {
      if (province.includes(k)) { provDir = v; break; }
    }
    
    if (!provDir) {
      console.log(`⚠️ 无法确定省份: ${file} (province=${province})`);
      skipped++;
      continue;
    }
    
    // 提取数据（兼容多种格式）
    const result = convertToStandard(raw, file);
    if (!result) {
      console.log(`⚠️ 转换失败: ${file}`);
      skipped++;
      continue;
    }
    
    // 写入文件
    const targetDir = path.join(casesDir, provDir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    
    const targetFile = path.join(targetDir, file);
    fs.writeFileSync(targetFile, JSON.stringify(result, null, 2), 'utf8');
    console.log(`✅ ${file} → ${provDir}/${file}`);
    converted++;
    
  } catch (e) {
    console.log(`❌ 错误: ${file} (${e.message})`);
    skipped++;
  }
}

console.log(`\n完成: 转换${converted}个，跳过${skipped}个`);

// 转换函数
function convertToStandard(raw, fileName) {
  // 已经有 input_for_engine 字段的，直接用
  if (raw.input_for_engine) {
    const e = raw.input_for_engine;
    return {
      case_id: raw.case_id || path.basename(fileName, '.json'),
      province: raw.province || raw.region || '',
      city: raw.city || raw.basic_info?.city || '',
      gender: raw.gender || raw.basic_info?.gender || '',
      birth_year: e.birthYear || null,
      birth_month: e.birthMonth || null,
      work_year: e.workYear || null,
      work_month: e.workMonth || null,
      retire_year: e.retireYear || null,
      retire_month: e.retireMonth || null,
      retire_type: e.accountStart ? 'normal' : 'normal',
      sight_years: e.sightYears || 0,
      total_years: e.totalYears || 0,
      avg_index: e.avgIndex || 0,
      base_number: e.baseRetire || e.baseRetireInput || 0,
      personal_account: e.personalAcc || e.personalAccInput || 0,
      months: e.months || 0,
      expected: raw.expected || {
        basic_pension: raw.pension_breakdown?.base_pension || raw.engineResults?.basePension || 0,
        personal_pension: raw.pension_breakdown?.personal_account_pension || raw.engineResults?.personalPension || 0,
        transition_pension: raw.pension_breakdown?.transition_pension || raw.engineResults?.transitionalPension || 0,
        extra_pension: 0,
        total: raw.pension_breakdown?.total_pension || raw.engineResults?.totalPension || 0
      },
      verified: raw.verified || raw.status === 'verified' || false,
      notes: raw.note || raw.notes?.join('; ') || ''
    };
  }
  
  // 平面格式（case_id, province, gender, birth, work_start, retirement_date...）
  if (raw.case_id !== undefined) {
    const birth = parseDate(raw.birth || raw.birth_date);
    const work = parseDate(raw.work_start || raw.work_start_date || raw.employment_start_date);
    const retire = parseDate(raw.retirement_date || raw.retire_date);
    
    return {
      case_id: String(raw.case_id),
      province: raw.province || '',
      city: raw.city || '',
      gender: raw.gender || '',
      birth_year: birth?.year || null,
      birth_month: birth?.month || null,
      work_year: work?.year || null,
      work_month: work?.month || null,
      retire_year: retire?.year || null,
      retire_month: retire?.month || null,
      retire_type: mapRetireType(raw.retire_type),
      sight_years: raw.deemed_years || raw.sight_years || 0,
      total_years: raw.total_years || raw.total_years || 0,
      avg_index: raw.avg_index || raw.average_wage_index || 0,
      base_number: raw.base_number || raw.pension_base || 0,
      personal_account: raw.personal_account || raw.personal_account_balance || 0,
      months: raw.months || raw.payment_months || 0,
      expected: {
        basic_pension: raw.basic_pension || raw.pension_breakdown?.base_pension || 0,
        personal_pension: raw.personal_pension || raw.pension_breakdown?.personal_account_pension || 0,
        transition_pension: raw.transition_pension || raw.pension_breakdown?.transition_pension || 0,
        extra_pension: raw.extra_pension || raw.pension_breakdown?.adjustment_gold || 0,
        total: raw.total || raw.pension_total || raw.pension_breakdown?.total_pension || 0
      },
      verified: raw.verified || false,
      notes: raw.notes || ''
    };
  }
  
  // 嵌套格式（basic_info, work_history, insurance_data, pension_breakdown）
  if (raw.basic_info) {
    const bi = raw.basic_info;
    const wh = raw.work_history || {};
    const id = raw.insurance_data || {};
    const pb = raw.pension_breakdown || {};
    
    const birth = parseDate(bi.birth_date);
    const work = parseDate(bi.employment_start_date);
    const retire = parseDate(bi.retirement_date);
    
    return {
      case_id: raw.case_id || path.basename(fileName, '.json'),
      province: raw.province || '',
      city: bi.city || '',
      gender: bi.gender || '',
      birth_year: birth?.year || null,
      birth_month: birth?.month || null,
      work_year: work?.year || null,
      work_month: work?.month || null,
      retire_year: retire?.year || null,
      retire_month: retire?.month || null,
      retire_type: mapRetireType(bi.retirement_type),
      sight_years: wh.sight_years || 0,
      total_years: wh.total_years || 0,
      avg_index: id.avg_index || 0,
      base_number: id.base_retire || id.pension_base || 0,
      personal_account: id.personal_account_balance || 0,
      months: bi.payment_months || 0,
      expected: {
        basic_pension: pb.base_pension || pb.basic_pension || 0,
        personal_pension: pb.personal_pension || pb.personal_account_pension || 0,
        transition_pension: pb.transition_pension || pb.transitional_pension || 0,
        extra_pension: pb.extra_pension || 0,
        total: pb.total_pension || pb.grand_total || 0
      },
      verified: raw.verified || false,
      notes: raw.note || ''
    };
  }
  
  return null;
}

function parseDate(s) {
  if (!s || s === 'null') return null;
  // 1970年11月
  let m = String(s).match(/(\d{4})年(\d{1,2})月/);
  if (m) return { year: parseInt(m[1]), month: parseInt(m[2]) };
  // 197005
  m = String(s).match(/^(\d{4})(\d{2})$/);
  if (m) return { year: parseInt(m[1]), month: parseInt(m[2]) };
  // 1970-11-01
  m = String(s).match(/^(\d{4})-(\d{2})/);
  if (m) return { year: parseInt(m[1]), month: parseInt(m[2]) };
  return null;
}

function mapRetireType(s) {
  if (!s) return 'normal';
  if (s.includes('提前') || s.includes('early')) return 'early';
  if (s.includes('弹性')) return 'flex_early';
  if (s.includes('特殊') || s.includes('special')) return 'special_early';
  return 'normal';
}
