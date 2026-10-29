'use strict'

// 省份 / 城市别名归一：AI 传中文（"吉林"、"长春"），引擎只认拼音 key（jilin / cc 或中文 key）
// 优先从 provinces-data.js 动态反建；但 31 个省里有 16 个的 cfg 没有 name 字段
// （province 字段存的还是拼音），纯动态反建会漏掉一半省份，故必须有中文兜底表。

const PROVINCES = require('../cloudfunctions/calculate/provinces-data.js')

const KEYS = PROVINCES.listProvinces()
const STRIP = ['特别行政区', '维吾尔自治区', '壮族自治区', '回族自治区', '自治区', '省', '市']

// 拼音 key → 中文全称（行政区划固定值，可安全写死）。
// 只对 cfg.name 缺失的省份兜底；cfg 有 name 的以 cfg 为准（下方仍会覆盖写入）。
const PINYIN_CN = {
  anhui: '安徽省', beijing: '北京市', chongqing: '重庆市', fujian: '福建省',
  gansu: '甘肃省', guangdong: '广东省', guangxi: '广西壮族自治区', guizhou: '贵州省',
  hainan: '海南省', hebei: '河北省', heilongjiang: '黑龙江省', henan: '河南省',
  hubei: '湖北省', hunan: '湖南省', jiangsu: '江苏省', jiangxi: '江西省',
  jilin: '吉林省', liaoning: '辽宁省', neimenggu: '内蒙古自治区', ningxia: '宁夏回族自治区',
  qinghai: '青海省', shaanxi: '陕西省', shandong: '山东省', shanghai: '上海市',
  shanxi: '山西省', sichuan: '四川省', tianjin: '天津市', xinjiang: '新疆维吾尔自治区',
  xizang: '西藏自治区', yunnan: '云南省', zhejiang: '浙江省'
}

// 中文名 → 拼音 key，供 resolveProvince 反查（含简称与常见口语写法）
const CN_TO_KEY = {}
Object.keys(PINYIN_CN).forEach((k) => { CN_TO_KEY[PINYIN_CN[k]] = k })

// 常见口语 / 易混写法。⚠️ 陕西(shaanxi) 与 山西(shanxi) 拼音只差一个 a，
// 必须显式列出，否则包含匹配可能串省。
const EXTRA_CN = {
  '安徽': 'anhui', '北京': 'beijing', '重庆': 'chongqing', '福建': 'fujian',
  '甘肃': 'gansu', '广东': 'guangdong', '广西': 'guangxi', '广西省': 'guangxi',
  '贵州': 'guizhou', '海南': 'hainan', '河北': 'hebei', '黑龙江': 'heilongjiang',
  '河南': 'henan', '湖北': 'hubei', '湖南': 'hunan', '江苏': 'jiangsu',
  '江西': 'jiangxi', '吉林': 'jilin', '辽宁': 'liaoning', '内蒙古': 'neimenggu',
  '内蒙': 'neimenggu', '宁夏': 'ningxia', '青海': 'qinghai',
  '陕西': 'shaanxi', '陕西西安': 'shaanxi', '山东': 'shandong', '上海': 'shanghai',
  '山西': 'shanxi', '四川': 'sichuan', '天津': 'tianjin', '新疆': 'xinjiang',
  '西藏': 'xizang', '云南': 'yunnan', '浙江': 'zhejiang',
  '陕': 'shaanxi', '晋': 'shanxi', '鲁': 'shandong', '粤': 'guangdong',
  '苏': 'jiangsu', '浙': 'zhejiang', '吉': 'jilin', '辽': 'liaoning', '豫': 'henan'
}

function norm (s) {
  return String(s == null ? '' : s).trim().toLowerCase().replace(/[\s·・]/g, '')
}

const PROV_MAP = new Map()

KEYS.forEach((key) => {
  PROV_MAP.set(key, key)
  const cfg = PROVINCES.getConfig(key) || {}
  // cfg.name 优先；缺失时用兜底中文名（16 个省没有 name 字段）
  const full = norm(cfg.name || PINYIN_CN[key] || cfg.province || key)
  if (!full) return
  PROV_MAP.set(full, key)
  // 再存一份去后缀的简称：吉林省 → 吉林，内蒙古自治区 → 内蒙古
  for (const suf of STRIP) {
    if (full.length > suf.length && full.endsWith(suf)) {
      PROV_MAP.set(full.slice(0, -suf.length), key)
      break
    }
  }
})

// 补中文名 → key 的完整映射（覆盖 cfg.name 缺失的省）
Object.keys(CN_TO_KEY).forEach((cn) => {
  const key = CN_TO_KEY[cn]
  if (PROVINCES.getConfig(key)) PROV_MAP.set(norm(cn), key)
})

// 常见口语写法 → 拼音 key
Object.keys(EXTRA_CN).forEach((cn) => {
  const key = EXTRA_CN[cn]
  if (PROVINCES.getConfig(key)) PROV_MAP.set(norm(cn), key)
})

function resolveProvince (input) {
  const q = norm(input)
  if (!q) return null
  if (PROV_MAP.has(q)) return PROV_MAP.get(q)
  // 包含匹配：用户说"吉林长春"、"我在吉林省" 也能命中
  for (const [alias, key] of PROV_MAP) {
    if (alias.length >= 2 && q.includes(alias)) return key
  }
  return null
}

// 城市：base_rates 里除 'prov' 外的键就是该省支持的城市口径（可能同时有拼音与中文两种写法）
function listCities (provinceKey) {
  const cfg = PROVINCES.getConfig(provinceKey)
  if (!cfg || !cfg.base_rates) return []
  return Object.keys(cfg.base_rates).filter((k) => k !== 'prov')
}

function resolveCity (provinceKey, input) {
  if (!input) return 'prov'
  const q = norm(input)
  const cities = listCities(provinceKey)
  if (!cities.length || !q) return 'prov'
  const hit = cities.find((c) => norm(c) === q)
  if (hit) return hit
  const partial = cities.find((c) => norm(c).includes(q) || q.includes(norm(c)))
  return partial || 'prov'
}

const GENDER_MAP = {
  '男': 'male', '男性': 'male', '男职工': 'male', 'male': 'male', 'm': 'male',
  '女干部': 'fc', '女管理': 'fc', '女技术人员': 'fc', '干部': 'fc', 'fc': 'fc', 'fw55': 'fw55', '女55': 'fw55',
  '女工人': 'fw50', '女职工': 'fw50', '女': 'fw50', '女性': 'fw50', '工人': 'fw50', 'fw': 'fw50', 'fw50': 'fw50', 'ef50': 'fw50'
}

function resolveGenderType (input) {
  const q = norm(input)
  if (!q) return null
  if (GENDER_MAP[q]) return GENDER_MAP[q]
  // 兜底：含"女"按女工人（50 档），含"男"按男
  if (q.includes('女')) {
    if (q.includes('干部') || q.includes('管理') || q.includes('技术')) return 'fc'
    return 'fw50'
  }
  if (q.includes('男')) return 'male'
  return null
}

// 引擎 calculate() 还需要 gender 字段（'male' / 'female'）
function genderOf (genderType) {
  return genderType === 'male' ? 'male' : 'female'
}

// 解析 "1976-02" / "1976年2月" / "197602" / "1976/2" → { year, month }
// ⚠️ 年份范围必须按用途区分：
//   出生 / 参加工作 → 过去时（1930～2015）
//   退休时间       → 未来时（可到 2100）
// 初版只有一个 1930–2015 的硬编码范围，导致「2026-06 退休」被判为非法格式 —— 退休年月必须放宽。
const RANGE = {
  birth: { min: 1930, max: 2015 },
  work: { min: 1945, max: 2030 },
  retire: { min: 1990, max: 2100 }
}

function parseMonth (input, kind) {
  if (input == null) return null
  const s = String(input).trim()
  const r = RANGE[kind] || RANGE.birth
  if (/^\d{6}$/.test(s)) {
    const year = +s.slice(0, 4)
    const month = +s.slice(4, 6)
    if (year < r.min || year > r.max || month < 1 || month > 12) return null
    return { year, month }
  }
  const m = s.match(/(\d{4})\D{1,2}(\d{1,2})/)
  if (!m) return null
  const year = +m[1]
  const month = +m[2]
  if (year < r.min || year > r.max) return null
  if (month < 1 || month > 12) return null
  return { year, month }
}

module.exports = {
  KEYS,
  resolveProvince,
  resolveCity,
  listCities,
  resolveGenderType,
  genderOf,
  parseMonth,
  getConfig: (k) => PROVINCES.getConfig(k)
}
