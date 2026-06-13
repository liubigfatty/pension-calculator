/**
 * verify.js patch：替换 caseToEngineInput 函数，支持多格式日期解析
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'scripts', 'verify.js');
let c = fs.readFileSync(FILE, 'utf8');

// 找函数起止位置
const startMarker = 'function caseToEngineInput(c) {';
const startIdx = c.indexOf(startMarker);
if (startIdx < 0) { console.error('找不到函数'); process.exit(1); }

// 找函数结束：return input 之后的 }
const rIdx = c.indexOf('  return input', startIdx);
const endIdx = c.indexOf('\n}\n', rIdx) + 3;
console.log('函数位置:', startIdx, '->', endIdx);

// 新函数内容
const newFunc = `
// ══════════════════════════════════════════════════════
//  多格式日期解析
//  支持：
//    1. 标准格式：birth_year/birth_month 数字
//    2. 中文格式：birth = "1970年11月"
//    3. 嵌套 ISO：basic_info.birth_date = "1965-05"
//    4. 驼峰格式：birthYear/birthMonth
// ══════════════════════════════════════════════════════
function parseCaseDate(c) {
  // ── 方式1：标准数字格式 ──
  const by = num(c.birth_year, c.birthYear);
  const bm = num(c.birth_month, c.birthMonth);
  const wy = num(c.work_year, c.workYear);
  const wm = num(c.work_month, c.workMonth);
  if (by && bm && wy && wm) {
    return { birth: { year: by, month: bm }, work: { year: wy, month: wm } };
  }

  // ── 方式2：中文日期字符串 ──
  function parseChineseDate(s) {
    if (!s || typeof s !== 'string') return null;
    const m = s.match(/(\\d{4})年(\\d{1,2})月/);
    return m ? { year: parseInt(m[1]), month: parseInt(m[2]) } : null;
  }
  const b2 = parseChineseDate(c.birth || c.birth_date);
  const w2 = parseChineseDate(c.work_start || c.employment_start_date || c.workStart);
  if (b2 && w2) {
    return { birth: b2, work: w2 };
  }

  // ── 方式3：ISO 日期字符串 (YYYY-MM) ──
  function parseISOMonth(s) {
    if (!s || typeof s !== 'string') return null;
    const m = s.match(/^(\\d{4})-(\\d{2})/);
    return m ? { year: parseInt(m[1]), month: parseInt(m[2]) } : null;
  }
  const b3 = parseISOMonth(
    (c.basic_info && c.basic_info.birth_date) ||
    (c.case_data && c.case_data.basic_info && c.case_data.basic_info.birth_date) ||
    c.birth_date || c.birthDate
  );
  const w3 = parseISOMonth(
    (c.basic_info && c.basic_info.employment_start_date) ||
    (c.case_data && c.case_data.basic_info && c.case_data.basic_info.employment_start_date) ||
    c.work_start_date || c.employmentStart || c.employment_start_date
  );
  if (b3 && w3) {
    return { birth: b3, work: w3 };
  }

  return null;
}

// ══════════════════════════════════════════════════════
//  案例 → 引擎输入（标准格式映射）
// ══════════════════════════════════════════════════════
function caseToEngineInput(c) {
  const dates = parseCaseDate(c);
  if (!dates) return null;
  const { birth, work } = dates;

  const gender     = mapGender(c.gender);
  const genderType = mapGenderType(c.gender);
  const cityType  = mapCityType(c.city, c.province);
  const retireType = mapRetireType(c.retire_type || c.retireType);

  const input = {
    name:            String(c.case_id || c.caseId || 'unknown'),
    gender,
    genderType,
    cityType,
    retireType,
    skipDelay:       true,
    birthYear:        birth.year,
    birthMonth:       birth.month,
    workYear:         work.year,
    workMonth:        work.month,
    avgIndex:         num(c.avg_index, c.avgIndex) || 1.0,
    personalAccInput: num(c.personal_account, c.personalAccount, c.personalAccInput),
    sightYears:       num(c.sight_years, c.sightYears),
    totalYears:       num(c.total_years, c.totalYears),
  };

  // 计发基数
  const baseNumber = num(c.base_number, c.baseNumber, c.baseRetire, c.baseRetireInput);
  if (baseNumber != null) {
    input.baseRetireInput = baseNumber;
    const baseProv = num(c.base_prov, c.baseProv, c.baseProvInput);
    input.baseProvInput = baseProv != null ? baseProv : baseNumber;
  }

  // 计发月数（引擎读 inputData.months）
  const months = num(c.months, c.months, c.monthsInput);
  if (months != null && months > 0) {
    input.months = months;
  }

  // 省份特殊字段
  const transIndex = num(c.trans_index, c.transIndex);
  if (transIndex != null) input.transIndex = transIndex;

  const xuzhang = num(c.xuzhang, c.xuzhang);
  if (xuzhang != null) input.xuzhang = xuzhang;

  const extraRate = num(c.extra_rate, c.extraRate);
  if (extraRate != null) input.extraRate = extraRate;

  return input;
}
`;

// 替换：保留函数前面的注释块，替换函数本身
// 函数前面的注释块以 "//  案例 → 引擎输入" 开头
const commentStart = c.lastIndexOf('// ══════════════════════════════════════════════════════', startIdx);
console.log('注释块位置:', commentStart);

const newContent = c.substring(0, commentStart) + newFunc + c.substring(endIdx);
fs.writeFileSync(FILE, newContent, 'utf8');
console.log('替换完成，新文件长度:', newContent.length);
