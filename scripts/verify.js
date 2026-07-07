/**
const { mapCaseToInput } = require('./run-cases.js');
 * 养老金引擎正式验证脚本
 * 用法：
 *   node scripts/verify.js                  # 验证所有已配置省份
 *   node scripts/verify.js --province gansu  # 只验证甘肃省
 *   node scripts/verify.js --province gansu --case 67  # 只验证案例67
 *   node scripts/verify.js --tolerance 0.5   # 容忍度0.5元
 *   node scripts/verify.js --report markdown    # 只生成markdown报告
 *
 * 输出：
 *   reports/verify-report-YYYYMMDD-HHMMSS.json
 *   reports/verify-report-YYYYMMDD-HHMMSS.md
 */

const fs   = require('fs')
const path = require('path')

const ROOT       = path.resolve(__dirname, '..')
const ENGINE_PATH = path.join(ROOT, 'engine/pension-engine.js')
const CASES_DIR   = path.join(ROOT, 'cases')
const CONFIGS_DIR = path.join(ROOT, 'provinces')
const JS_PROV_DIR = path.join(ROOT, 'cloudfunctions/calculate/provinces')
const REPORTS_DIR = path.join(ROOT, 'reports')

// ═══════════════════════════════════════════════════════
//  已配置省份（引擎支持的计算逻辑）
// ═══════════════════════════════════════════════════════
const CONFIGURED_PROVINCES = [
  'jilin', 'heilongjiang', 'yunnan', 'gansu',
  'shanghai', 'beijing', 'jiangsu', 'sichuan',
  'hunan', 'tianjin', 'liaoning', 'shandong',
  'henan', 'hebei', 'zhejiang', 'guangdong', 'hubei', 'fujian', 'jiangxi', 'anhui', 'shanxi', 'shaanxi', 'guangxi', 'chongqing', 'hainan', 'ningxia', 'qinghai', 'neimenggu', 'guizhou', 'xinjiang', 'xizang'
]

// 省份中文名/别名 → 配置文件名 的映射
const PROVINCE_NAME_MAP = {
  '吉林省': 'jilin', '吉林': 'jilin',
  '黑龙江省': 'heilongjiang', '黑龙江': 'heilongjiang',
  '云南省': 'yunnan', '云南': 'yunnan',
  '甘肃省': 'gansu', '甘肃': 'gansu',
  '上海市': 'shanghai', '上海': 'shanghai',
  '北京市': 'beijing', '北京': 'beijing',
  '江苏省': 'jiangsu', '江苏': 'jiangsu',
  '四川省': 'sichuan', '四川': 'sichuan',
  '广东省': 'guangdong', '广东': 'guangdong',
  '浙江省': 'zhejiang', '浙江': 'zhejiang',
  '山东省': 'shandong', '山东': 'shandong',
  '福建省': 'fujian', '福建': 'fujian',
  '湖南省': 'hunan', '湖南': 'hunan',
  '湖北省': 'hubei', '湖北': 'hubei',
  '河北省': 'hebei', '河北': 'hebei',
  '河南省': 'henan', '河南': 'henan',
  '安徽省': 'anhui', '安徽': 'anhui',
  '江西省': 'jiangxi', '江西': 'jiangxi',
  '山西省': 'shanxi', '山西': 'shanxi',
  '陕西省': 'shaanxi', '陕西': 'shaanxi',
  '天津市': 'tianjin', '天津': 'tianjin',
  '贵州省': 'guizhou', '贵州': 'guizhou',
  '青海省': 'qinghai', '青海': 'qinghai',
  '宁夏回族自治区': 'ningxia', '宁夏': 'ningxia',
  '辽宁省': 'liaoning', '辽宁': 'liaoning',
  '西藏自治区': 'xizang', '西藏': 'xizang',
  '海南省': 'hainan', '海南': 'hainan',
  '内蒙古自治区': 'neimenggu', '内蒙古': 'neimenggu',
  '广西壮族自治区': 'guangxi', '广西': 'guangxi',
  '新疆维吾尔自治区': 'xinjiang', '新疆': 'xinjiang',
  '重庆市': 'chongqing', '重庆': 'chongqing',
}

function mapProvinceKey(name) {
  if (!name) return null
  // 已经是配置文件名
  if (CONFIGURED_PROVINCES.includes(name)) return name
  if (fs.existsSync(path.join(CONFIGS_DIR, `${name}.json`))) return name
  // 查映射表
  const mapped = PROVINCE_NAME_MAP[name.trim()]
  if (mapped) return mapped
  return null
}

// ═══════════════════════════════════════════════════════
//  解析命令行参数
// ═══════════════════════════════════════════════════════
function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    provinces: [],   // --province 可多次
    caseId:   null,   // --case
    tolerance: 1.0,    // --tolerance
    report:   'all',  // --report: console/json/markdown/all
    engine:   ENGINE_PATH
  }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if ((a === '--province' || a === '-p') && args[i + 1]) {
      opts.provinces.push(args[++i])
    } else if ((a === '--case' || a === '-c') && args[i + 1]) {
      opts.caseId = args[++i]
    } else if ((a === '--tolerance' || a === '-t') && args[i + 1]) {
      opts.tolerance = parseFloat(args[++i]) || 1.0
    } else if ((a === '--report' || a === '-r') && args[i + 1]) {
      opts.report = args[++i]
    } else if (a === '--help' || a === '-h') {
      console.log('用法: node scripts/verify.js [options]')
      console.log('  --province <name>   指定省份（可多次）')
      console.log('  --case <id>         指定案例ID')
      console.log('  --tolerance <n>     误差容忍度，默认1.0元')
      console.log('  --report <fmt>      报告格式: console/json/markdown/all')
      process.exit(0)
    }
  }
  return opts
}

// ═══════════════════════════════════════════════════════
//  工具函数
// ═══════════════════════════════════════════════════════

/** 安全 parseFloat，支持多字段名 */
function num(...vals) {
  for (const v of vals) {
    if (v == null) continue
    if (typeof v === 'number') return v
    const n = parseFloat(String(v).replace(/[,，元\s￥%]/g, ''))
    if (!isNaN(n)) return n
  }
  return null
}

/** 性别映射：中文 → 引擎格式 */
function mapGender(gender) {
  if (!gender) return 'male'
  const g = String(gender).toLowerCase()
  if (g === '男' || g === 'male') return 'male'
  if (g === '女' || g === 'female') return 'female'
  return 'male'
}

/** 性别类型映射：用于确定女职工退休年龄 */
function mapGenderType(gender, birthYear, birthMonth, workYear, workMonth) {
  const g = mapGender(gender)
  if (g === 'male') return 'male'
  // 女：需判断是干部（55岁）还是工人（50岁）
  // 默认 fw（50岁），如有额外信息可调整为 fc（55岁）
  // TODO：从 case 里读取 retire_age 来判断
  return 'fw'
}

/** city → cityType */
function mapCityType(city, province) {
  if (!city) return 'prov'
  const s = String(city).toLowerCase()
  // 城市代码直接匹配
  if (s === 'cc' || s === 'changchun') return 'cc'
  if (s === 'sz' || s === 'shenzhen') return 'sz'
  if (s === 'zz' || s === 'zhengzhou') return 'zz'
  if (s === 'xining') return 'xining'
  if (s === 'dl' || s === 'dalian') return 'dl'
  if (s === 'sy' || s === 'shenyang') return 'sy'
  // 中文名称匹配
  if (/长春/.test(s)) return 'cc'
  if (/大连/.test(s)) return 'dl'   // 辽宁
  if (/沈阳/.test(s)) return 'sy'   // 辽宁
  if (/深圳/.test(s)) return 'sz'   // 广东
  if (/西宁/.test(s)) return 'xining' // 青海
  if (/郑州/.test(s)) return 'zz'    // 河南
  return 'prov'
}

/** 退休类型映射 */
function mapRetireType(rt) {
  if (!rt) return 'standard'
  const s = String(rt)
  if (/提前|elastic|弹性/.test(s)) return 'early'
  return 'standard'
}

// ═══════════════════════════════════════════════════════
//  省份配置加载（带缓存）
// ═══════════════════════════════════════════════════════
const configCache = {}
function loadConfig(provinceKey) {
  const pk = mapProvinceKey(provinceKey)
  if (!pk) return null
  if (configCache[pk]) return configCache[pk]
  const file = path.join(CONFIGS_DIR, `${pk}.json`)
  if (!fs.existsSync(file)) return null
  try {
    const cfg = JSON.parse(fs.readFileSync(file, 'utf8'))
    configCache[pk] = cfg
    return cfg
  } catch (e) {
    return null
  }
}

// ═══════════════════════════════════════════════════════
//  案例文件收集
// ═══════════════════════════════════════════════════════
// ═════════════════════════════════════════════════════
//  A6：加载生产副本（cloudfunctions/calculate/provinces/*.js）
//  校验其 getEngineConfig() 的 base_rates / avg_salary_history
//  格式与单位（元/月），并与对应 json 比对一致性。
//  分叉仅输出 [WARN]，不阻塞现有案例验证。
// ═════════════════════════════════════════════════════
function loadJsConfig(provinceKey) {
  const pk = mapProvinceKey(provinceKey)
  if (!pk) return null
  const p = path.join(JS_PROV_DIR, `${pk}.js`)
  if (!fs.existsSync(p)) return null
  try {
    delete require.cache[require.resolve(p)]
    const m = require(p)
    if (m && m.getEngineConfig) return m.getEngineConfig()
    if (m && m.default && m.default.getEngineConfig) return m.default.getEngineConfig()
    return null
  } catch (e) {
    return { __error: e.message }
  }
}

function auditJsCopies() {
  console.log('\n' + '─'.repeat(72))
  console.log('【A6】生产副本(js)校验 + 与 json 双份一致性比对')
  let warnCount = 0, errCount = 0, checked = 0
  const tol = 0.5 // 元/月 容差
  for (const prov of CONFIGURED_PROVINCES) {
    const js = loadJsConfig(prov)
    const jp = path.join(CONFIGS_DIR, `${prov}.json`)
    if (!js) { console.log(`  [WARN] ${prov}: 生产副本 js 缺失或加载失败`); warnCount++; continue }
    if (js.__error) { console.log(`  [WARN] ${prov}: js 加载异常 ${js.__error}`); errCount++; continue }
    if (!fs.existsSync(jp)) continue
    const j = JSON.parse(fs.readFileSync(jp, 'utf8'))
    checked++

    // 1) 单位/格式校验：avg_salary_history 与 base_rates.prov 应为元/月（典型 100~40000）
    const checkUnit = (obj, label) => {
      if (!obj) return
      for (const k of Object.keys(obj)) {
        const v = obj[k]
        if (typeof v !== 'number' || v <= 0 || v > 40000) {
          console.log(`  [WARN] ${prov}.${label}[${k}]=${v} 单位/格式疑似非元/月`)
          warnCount++
        }
      }
    }
    checkUnit(js.avg_salary_history, 'avg_salary_history')
    checkUnit(js.base_rates && js.base_rates.prov, 'base_rates.prov')

    // 2) 与 json 比对一致性（共享年份，单位已统一为元/月）
    const cmp = (jobj, jsn, label) => {
      if (!jobj || !jsn) return
      for (const k of Object.keys(jobj)) {
        const a = jobj[k], b = jsn[k]
        if (typeof a !== 'number' || typeof b !== 'number') continue
        if (Math.abs(a - b) > tol) {
          console.log(`  [WARN] ${prov}.${label}[${k}]: json=${a} js=${b} 差=${Math.abs(a - b).toFixed(2)}`)
          warnCount++
        }
      }
    }
    cmp(j.avg_salary_history, js.avg_salary_history, 'avg_salary_history')
    cmp(j.base_rates && j.base_rates.prov, js.base_rates && js.base_rates.prov, 'base_rates.prov')
  }
  console.log(`  已校验 ${checked} 省；[WARN] ${warnCount} 条；[ERROR] ${errCount} 条（以上不阻塞案例验证）`)
  console.log('─'.repeat(72))
}

function collectCaseFiles(targetProvinces) {
  const results = []
  const dirs = targetProvinces.length > 0
    ? targetProvinces
    : CONFIGURED_PROVINCES

  for (const prov of dirs) {
    const dir = path.join(CASES_DIR, prov)
    if (!fs.existsSync(dir)) continue
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()
    for (const f of files) {
      results.push({
        province: prov,
        file: f,
        fullPath: path.join(dir, f)
      })
    }
  }
  return results
}

// ═══════════════════════════════════════════════════════
//  案例 → 引擎输入（标准格式映射）

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
    const m = s.match(/(\d{4})年(\d{1,2})月/);
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
    const m = s.match(/^(\d{4})-(\d{2})/);
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


  // ── 方式4：用退休年月 + 退休年龄 反推出生年月 ──
  // 适用：birth 未知，但 retire_year/month 和 gender 已知
  const ry = num(c.retire_year, c.retireYear);
  const rm = num(c.retire_month, c.retireMonth);
  const gender = c.gender || '';
  const retireType = (c.retire_type || c.retireType || '').toString();

  if (ry && rm && gender) {
    // 估算退休年龄
    let retireAge = 60; // 默认男性60岁
    const g = gender.toString().toLowerCase();
    if (g === '女' || g === 'female') {
      // 女性：判断是工人(50)还是干部(55)
      // 如果有 total_years，且 retire_year - total_years ≈ 18岁开始工作，则...
      // 简化：默认按工人50岁，如果有 retire_age 字段则用它
      retireAge = 50;
    }
    // 如果显式提供了退休年龄（如弹性提前退休）
    const explicitAge = num(c.retire_age, c.retirement_age, c.retireAge);
    if (explicitAge && explicitAge > 0) {
      retireAge = explicitAge;
    } else if (/弹性|提前|early|elastic/i.test(retireType)) {
      // 弹性提前退休：用 total_years 反推
      // retirement_age ≈ total_years + 18（18岁开始工作）
      const ty = num(c.total_years, c.totalYears);
      if (ty && ty > 0) {
        retireAge = Math.round(ty + 18);
      }
    }

    const byCalc = ry - retireAge;
    // month 不变（简化处理，实际可能有跨年问题）
    let bmCalc = rm;
    let byCalc2 = byCalc;
    if (rm < 1 || rm > 12) { bmCalc = 1; }

    // work_year 也反推：假设 18 岁开始工作
    const wyCalc = byCalc - 0; // 实际上 work_year ≈ birth_year + 18
    // 更准确的：work_year = retire_year - total_years
    const ty2 = num(c.total_years, c.totalYears);
    let wyCalc2 = wyCalc, wmCalc2 = bmCalc;
    if (ty2 && ty2 > 0) {
      wyCalc2 = ry - Math.floor(ty2);
      wmCalc2 = rm;
    }

    return {
      birth: { year: byCalc2, month: bmCalc },
      work: { year: wyCalc2, month: wmCalc2 }
    };
  }
  return null;
}

// ══════════════════════════════════════════════════════
//  案例 → 引擎输入（标准格式映射）
// ══════════════════════════════════════════════════════
function mapCaseToInput(c, provConfig) {
  // 性别
  const isFemale = (c.gender === '女' || c.gender === 'female');
  const gender = isFemale ? 'female' : 'male';

  // genderType：优先用案例里的，否则根据 months 判断
  let genderType = c.genderType || '';
  if (!genderType && isFemale) {
    const m = c.months || 195;
    if (m === 170) {
      // 170个月=55岁：看 notes 是否含"女干部"
      genderType = (c.notes && c.notes.includes('女干部')) ? 'fc' : 'fw55';
    } else {
      genderType = 'fw50';
    }
  }
  if (!genderType) genderType = 'male';

  // 退休年月
  const retireYear  = c.retire_year  || (c.retireDate ? parseInt(c.retireDate) : null);
  const retireMonth = c.retire_month || (c.retireDate ? parseInt(c.retireDate.split('-')[1]) : null);

  return {
    name:           c.case_id || '测试',
    province:       c.province || provConfig.provinceKey || 'beijing',
    gender,
    genderType,
    birthYear:      c.birth_year,
    birthMonth:     c.birth_month,
    workYear:       c.work_year,
    workMonth:      c.work_month,
    retireYear,
    retireMonth,
    avgIndex:       c.avg_index ?? 1.0,
    personalAcc:    c.personal_account ?? 0,
    sightYears:      c.sight_years   ?? null,
    totalYears:      c.total_years    ?? null,
    preAccountYears: c.pre_account_years ?? null,
    actualYears:     c.actual_years     ?? null,
    months:         c.months         ?? null,
    retireType:      c.retire_type    || 'standard',
    cityType:        c.city_type      || 'prov',
    transIndex:      c.trans_index     ?? null,
  };
}

// ═══════════════════════════════════════════════════════
//  提取期望值（支持多种嵌套格式）
// ═══════════════════════════════════════════════════════
function getExpected(c) {
  // 方式1：标准格式（expected 嵌套对象）
  if (c.expected) {
    return {
      basic:         num(c.expected.basic_pension, c.expected.basicPension),
      extra:         num(c.expected.extra_pension, c.expected.extraPension),
      personal:      num(c.expected.personal_pension, c.expected.personalPension),
      transitional:  num(c.expected.transition_pension, c.expected.transitionPension, c.expected.transitionalPension),
      total:         num(c.expected.total, c.expected.totalPension),
    }
  }

  // 方式2：平铺字段（部分旧格式）
  if (c.basic_pension != null || c.total != null) {
    return {
      basic:         num(c.basic_pension, c.basicPension),
      extra:         num(c.extra_pension, c.extraPension, c.total_years_bonus),
      personal:      num(c.personal_pension, c.personalPension),
      transitional:  num(c.transition_pension, c.transitionalPension, c.transitionPension),
      total:         num(c.total, c.totalPension, c.monthly_basic_pension_total),
    }
  }

  // 方式3：pension_breakdown 嵌套
  const pb = c.pension_breakdown || c.pensionBreakdown || {}
  if (pb.basic_pension != null || pb.total != null) {
    return {
      basic:         num(pb.basic_pension, pb.basicPension),
      extra:         num(pb.extra_pension, pb.extraPension, pb.basic_pension_increase_by_tenure?.total),
      personal:      num(pb.personal_pension, pb.personalPension, pb.personal_account_pension),
      transitional:  num(pb.transitional_pension, pb.transitionalPension, pb.transition_pension),
      total:         num(pb.total, pb.totalPension, pb.monthly_basic_pension_total),
    }
  }

  return null
}

// ═══════════════════════════════════════════════════════
//  单案例验证
// ═══════════════════════════════════════════════════════
function verifySingleCase(c, config, tolerance) {
  const input     = mapCaseToInput(c, config)  // 复用 run-cases.js 的字段映射
  const expected  = getExpected(c)

  if (!input)    return { status: 'skip', reason: '无法解析输入日期' }
  if (!expected) return { status: 'skip', reason: '无法提取期望值' }
  if (!expected.total) return { status: 'skip', reason: '期望值缺少 total 字段' }

  // 调引擎
  let result
  try {
    const engine = require(ENGINE_PATH)
    result = engine.calculate(config, input)
  } catch (e) {
    return { status: 'error', reason: e.message }
  }

  const legal = result.legal

  // 逐项比对
  const items = [
    { label: '基础养老金',      exp: expected.basic,        act: legal.basicPension?.amount },
    { label: '增发养老金',      exp: expected.extra,        act: (legal.extraPension?.amount || 0) + (legal.specialAddition?.amount || 0) },
    { label: '个人账户养老金',  exp: expected.personal,    act: legal.personalAccount?.amount },
    { label: '过渡性养老金',    exp: expected.transitional, act: legal.transitionalPension?.amount },
    { label: '月养老金合计',    exp: expected.total,        act: legal.total },
  ]

  const diffs  = []
  let   maxDiff = 0
  for (const item of items) {
    if (item.exp == null || item.act == null) continue
    const d = Math.abs(item.exp - item.act)
    maxDiff = Math.max(maxDiff, d)
    if (d > tolerance) {
      diffs.push({
        label:   item.label,
        expect:  item.exp,
        actual:  item.act,
        diff:     d
      })
    }
  }

  if (diffs.length === 0) {
    return { status: 'pass', maxDiff, actual: { total: legal.total } }
  } else {
    return { status: 'fail', diffs, maxDiff, actual: { total: legal.total } }
  }
}

// ═══════════════════════════════════════════════════════
//  主流程
// ═══════════════════════════════════════════════════════
function main() {
  const opts = parseArgs()

  // 确定要验证的省份
  const targetProvinces = opts.provinces.length > 0
    ? opts.provinces
    : CONFIGURED_PROVINCES

  // 收集案例文件
  let allFiles = collectCaseFiles(targetProvinces)

  // --case 过滤
  if (opts.caseId) {
    allFiles = allFiles.filter(f =>
      String(f.file).includes(opts.caseId) ||
      String(opts.caseId).includes(String(f.file).replace('.json', ''))
    )
  }

  if (allFiles.length === 0) {
    console.log('未找到匹配的案例文件。')
    return
  }

  console.log(`\n════════════════════════════════════════════`)
  console.log(`  养老金引擎验证  ${new Date().toLocaleString('zh-CN')}`)
  console.log(`  案例总数：${allFiles.length}`)
  console.log(`  容忍度：±${opts.tolerance}元`)
  console.log(`════════════════════════════════════════════\n`)

  // 按省份分组验证
  const results = []  // { province, file, caseId, status, diffs, actual, expected }

  for (const item of allFiles) {
    let c
    try {
      c = JSON.parse(fs.readFileSync(item.fullPath, 'utf8'))
    } catch (e) {
      results.push({ ...item, status: 'error', reason: 'JSON解析失败' })
      continue
    }

    // 加载省份配置
    const pk = c.province || item.province
    const config = loadConfig(pk)
    if (!config) {
      results.push({ ...item, status: 'skip', reason: `省份配置缺失: ${pk}` })
      continue
    }

    const r = verifySingleCase(c, config, opts.tolerance)

    results.push({
      ...item,
      caseId:   String(c.case_id || c.caseId || '?'),
      status:   r.status,
      reason:   r.reason || null,
      diffs:    r.diffs || null,
      maxDiff:  r.maxDiff || 0,
      actual:   r.actual || null,
      expected: getExpected(c),
    })
  }

  // A6：生产副本一致性校验（不阻塞案例验证）
  auditJsCopies()

  // ═══════ 汇总统计 ═══════
  const stats = { pass: 0, fail: 0, skip: 0, error: 0 }
  for (const r of results) stats[r.status] = (stats[r.status] || 0) + 1

  // ═══════ 控制台输出 ═══════
  if (opts.report === 'all' || opts.report === 'console') {
    console.log('─'.repeat(72))
    for (const r of results) {
      const tag = `[${r.province}/${r.caseId}]`
      if (r.status === 'pass') {
        console.log(`  ✅ PASS  ${tag}`)
      } else if (r.status === 'fail') {
        console.log(`  ❌ FAIL  ${tag}`)
        for (const d of r.diffs) {
          console.log(`       ${d.label}：期望 ¥${d.expect.toFixed(2)} vs 实际 ¥${d.actual.toFixed(2)}（差 ¥${d.diff.toFixed(2)}）`)
        }
      } else if (r.status === 'skip') {
        console.log(`  ⚠️  SKIP  ${tag}：${r.reason}`)
      } else {
        console.log(`  💥 ERROR ${tag}：${r.reason}`)
      }
    }
    console.log('─'.repeat(72))
    console.log(`\n  汇总：✅ 通过 ${stats.pass}  ❌ 失败 ${stats.fail}  ⚠️  跳过 ${stats.skip}  💥 错误 ${stats.error}  （共 ${results.length}）\n`)
  }

  // ═══════ 生成 JSON 报告 ═══════
  if (opts.report === 'all' || opts.report === 'json') {
    const jsonReport = {
      timestamp:  new Date().toISOString(),
      tolerance:  opts.tolerance,
      summary:    stats,
      total:      results.length,
      results:    results.map(r => ({
        province: r.province,
        caseId:   r.caseId,
        file:     r.file,
        status:   r.status,
        reason:   r.reason,
        maxDiff:  r.maxDiff,
        diffs:    r.diffs,
        actual:   r.actual,
        expected: r.expected,
      }))
    }
    const jsonFile = path.join(REPORTS_DIR, `verify-report-${new Date().toISOString().replace(/[-:]/g,'').slice(0,15)}.json`)
    fs.writeFileSync(jsonFile, JSON.stringify(jsonReport, null, 2), 'utf8')
    console.log(`📄 JSON 报告已保存：${jsonFile}`)
  }

  // ═══════ 生成 Markdown 报告 ═══════
  if (opts.report === 'all' || opts.report === 'markdown') {
    const lines = []
    lines.push(`# 养老金引擎验证报告`)
    lines.push(``)
    lines.push(`- **时间**：${new Date().toLocaleString('zh-CN')}`)
    lines.push(`- **容忍度**：±${opts.tolerance} 元`)
    lines.push(`- **案例总数**：${results.length}`)
    lines.push(`- **通过**：${stats.pass}  **失败**：${stats.fail}  **跳过**：${stats.skip}  **错误**：${stats.error}`)
    lines.push(``)
    lines.push(`---`)
    lines.push(``)

    // 按省份分组
    const byProvince = {}
    for (const r of results) {
      if (!byProvince[r.province]) byProvince[r.province] = []
      byProvince[r.province].push(r)
    }

    for (const [prov, items] of Object.entries(byProvince)) {
      const passCount = items.filter(i => i.status === 'pass').length
      const failCount = items.filter(i => i.status === 'fail').length
      lines.push(`## ${prov}（${passCount} 通过 / ${failCount} 失败）`)
      lines.push(``)
      lines.push(`| 案例 | 状态 | 期望总额 | 实际总额 | 最大误差 |`)
      lines.push(`|------|------|----------|----------|----------|`)
      for (const r of items) {
        const statusIcon = r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : r.status === 'skip' ? '⚠️' : '💥'
        const expTotal = r.expected?.total ? r.expected.total.toFixed(2) : '-'
        const actTotal = r.actual?.total ? r.actual.total.toFixed(2) : '-'
        const maxD = r.maxDiff > 0 ? `¥${r.maxDiff.toFixed(2)}` : '-'
        lines.push(`| ${r.caseId} | ${statusIcon} ${r.status} | ¥${expTotal} | ¥${actTotal} | ${maxD} |`)
      }
      lines.push(``)

      // 失败案例详情
      const fails = items.filter(i => i.status === 'fail')
      if (fails.length > 0) {
        lines.push(`### 失败详情`)
        lines.push(``)
        for (const r of fails) {
          lines.push(`#### ${r.province}/${r.caseId}`)
          lines.push(``)
          lines.push(`| 项目 | 期望值 | 实际值 | 误差 |`)
          lines.push(`|------|--------|--------|------|`)
          for (const d of r.diffs) {
            lines.push(`| ${d.label} | ¥${d.expect.toFixed(2)} | ¥${d.actual.toFixed(2)} | ¥${d.diff.toFixed(2)} |`)
          }
          lines.push(``)
        }
      }
    }

    const mdFile = path.join(REPORTS_DIR, `verify-report-${new Date().toISOString().replace(/[-:]/g,'').slice(0,15)}.md`)
    fs.writeFileSync(mdFile, lines.join('\n'), 'utf8')
    console.log(`📄 Markdown 报告已保存：${mdFile}`)
  }
}

main()
